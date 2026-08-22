/** Prompt Manager assembly for imported SillyTavern Chat Completion presets. */

import { createMessage, type Message } from '@deepseek-ai/dsh-llm'
import type { Session, UserMessage } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterCard } from './import/types.ts'
import type {
  ImportedSillyTavernPreset,
  SillyTavernPresetContinuation,
  SillyTavernPresetPrompt,
} from './import/sillytavern-preset.ts'
import { substituteCardMacros } from './prompt.ts'
import { substituteSillyTavernIdentityMacros } from './sillytavern-identity-macro.ts'
import type { EjsTemplateResult } from './ejs-template.ts'

/** Runtime values substituted into marker prompts and macros. */
export interface PresetPromptInputs {
  readonly card?: ImportedCharacterCard
  /** Identity used by preset macros when a Session starts from World Info or chat history without a card. */
  readonly characterName?: string
  readonly userName?: string
  readonly userPersona?: string
  readonly worldInfoBefore: readonly string[]
  readonly worldInfoAfter: readonly string[]
  readonly session: Session
  readonly pendingMessages?: readonly UserMessage[]
  readonly mvuEnabled?: boolean
  readonly renderTemplate?: (template: string) => EjsTemplateResult
}

/** Provider-neutral role retained by one ordered prompt contribution. */
export type RoleplayPromptRole = 'system' | 'user' | 'assistant'

/** One ordered prompt module after adapter expansion. */
export interface RoleplayOrderedPrompt {
  readonly role: RoleplayPromptRole
  readonly content: string
}

/** Host-compatible prompt split around the conversation history. */
export interface RoleplayAssembledPrompt {
  readonly beforeHistory: readonly RoleplayOrderedPrompt[]
  readonly afterHistory: readonly RoleplayOrderedPrompt[]
  readonly inChat: readonly RoleplayInChatPrompt[]
  readonly includeHistory: boolean
  readonly continuation?: RoleplayContinuationPlan
  readonly enabledPromptCount: number
  readonly unsupportedMacroCount: number
  readonly templateFailureCount: number
}

/** Prompt fields required by the final LLM message assembly seam. */
export type RoleplayProviderPromptPlan = Pick<
  RoleplayAssembledPrompt,
  'beforeHistory' | 'afterHistory' | 'inChat' | 'includeHistory' | 'continuation'
>

/** Expanded continuation behavior retained until the final provider message seam. */
export interface RoleplayContinuationPlan {
  readonly prefill: boolean
  readonly postfix: '' | ' ' | '\n' | '\n\n'
  readonly nudgePrompt: string
}

/** One expanded prompt module placed relative to recent chat messages. */
export interface RoleplayInChatPrompt {
  readonly role: RoleplayPromptRole
  readonly content: string
  readonly depth: number
  readonly order: number
}

/** Compatibility names retained for existing adapter callers. */
export type SillyTavernOrderedPrompt = RoleplayOrderedPrompt
export type AssembledSillyTavernPreset = RoleplayAssembledPrompt
export type SillyTavernPromptPlan = RoleplayProviderPromptPlan
export type SillyTavernContinuationPlan = RoleplayContinuationPlan
export type SillyTavernInChatPrompt = RoleplayInChatPrompt

interface MacroState {
  readonly variables: Map<string, string>
  readonly userName: string
  readonly lastUserMessage: string
  unsupported: number
  templateFailures: number
}

const LAST_CHAT_MESSAGE_MACRO = '{{lastChatMessage}}'

function lastUserMessage(session: Session, pending: readonly UserMessage[]): string {
  const messages = [...session.deriveMessages(), ...pending]
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.source.kind !== 'user') continue
    return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  }
  return ''
}

function macroClose(value: string, open: number): number | undefined {
  let depth = 0
  for (let index = open; index < value.length - 1; index += 1) {
    const pair = value.slice(index, index + 2)
    if (pair === '{{') {
      depth += 1
      index += 1
      continue
    }
    if (pair !== '}}') continue
    depth -= 1
    index += 1
    if (depth === 0) return index + 1
  }
  return undefined
}

function macroParts(source: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < source.length - 1; index += 1) {
    const pair = source.slice(index, index + 2)
    if (pair === '{{') {
      depth += 1
      index += 1
      continue
    }
    if (pair === '}}') {
      depth = Math.max(0, depth - 1)
      index += 1
      continue
    }
    if (pair !== '::' || depth !== 0) continue
    parts.push(source.slice(start, index))
    start = index + 2
    index += 1
  }
  parts.push(source.slice(start))
  return parts
}

function addVariable(current: string | undefined, addition: string): string {
  const previous = current ?? '0'
  try {
    const parsed: unknown = JSON.parse(previous)
    if (Array.isArray(parsed)) return JSON.stringify([...parsed, addition])
  } catch {
    // SillyTavern falls through to numeric addition or string concatenation.
  }
  const increment = Number(addition)
  const numericPrevious = Number(previous)
  return Number.isNaN(increment) || Number.isNaN(numericPrevious)
    ? `${current ?? ''}${addition}`
    : String(numericPrevious + increment)
}

function evaluateMacro(source: string, state: MacroState): string {
  const parts = macroParts(source)
  const name = parts.shift()?.trim().toLowerCase() ?? ''
  if (name.startsWith('//')) return ''
  if (name === 'setvar') {
    const variable = parts.shift()?.trim() ?? ''
    const value = expandMacros(parts.join('::'), state)
    if (variable !== '') state.variables.set(variable, value)
    return ''
  }
  if (name === 'addvar') {
    const variable = parts.shift()?.trim() ?? ''
    const value = expandMacros(parts.join('::'), state)
    if (variable !== '') state.variables.set(variable, addVariable(state.variables.get(variable), value))
    return ''
  }
  if (name === 'getvar') return state.variables.get(parts.join('::').trim()) ?? ''
  if (name === 'random') {
    const choices = parts.map(value => expandMacros(value, state).trim())
    return choices.length === 0 ? '' : choices[Math.floor(Math.random() * choices.length)] ?? ''
  }
  if (name === 'lastusermessage') return state.lastUserMessage
  if (name === 'lastchatmessage') return LAST_CHAT_MESSAGE_MACRO
  if (name === 'user') return state.userName
  if (name === 'trim') return ''
  state.unsupported += 1
  // SillyTavern deliberately preserves unknown macros so extensions can own a
  // later generation phase. Resolve only nested built-ins before handing off.
  return `{{${expandMacros(source, state)}}}`
}

function expandMacros(value: string, state: MacroState): string {
  let result = ''
  let cursor = 0
  while (cursor < value.length) {
    const open = value.indexOf('{{', cursor)
    if (open < 0) {
      result += value.slice(cursor)
      break
    }
    result += value.slice(cursor, open)
    const close = macroClose(value, open)
    if (close === undefined) {
      result += value.slice(open)
      break
    }
    result += evaluateMacro(value.slice(open + 2, close - 2), state)
    cursor = close
  }
  return result.trim()
}

function applyFormat(format: string, variable: string, value: string, state: MacroState): string {
  if (value.trim() === '') return ''
  return expandMacros(format.replaceAll(`{{${variable}}}`, value).replaceAll('{0}', value), state)
}

function markerText(
  prompt: SillyTavernPresetPrompt,
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
  state: MacroState,
): string | undefined {
  const card = inputs.card
  switch (prompt.identifier) {
    case 'worldInfoBefore':
      return inputs.worldInfoBefore.map(value => applyFormat(preset.formats.worldInfo, 'worldInfo', value, state)).filter(Boolean).join('\n\n')
    case 'worldInfoAfter':
      return inputs.worldInfoAfter.map(value => applyFormat(preset.formats.worldInfo, 'worldInfo', value, state)).filter(Boolean).join('\n\n')
    case 'charDescription': return card === undefined ? '' : substituteCardMacros(card.description, card, inputs.userName)
    case 'charPersonality':
      return card === undefined ? '' : applyFormat(
        preset.formats.personality, 'personality', substituteCardMacros(card.personality, card, inputs.userName), state,
      )
    case 'scenario':
      return card === undefined ? '' : applyFormat(
        preset.formats.scenario, 'scenario', substituteCardMacros(card.scenario, card, inputs.userName), state,
      )
    case 'personaDescription': return inputs.userPersona ?? ''
    case 'dialogueExamples': return card === undefined ? '' : substituteCardMacros(card.messageExample, card, inputs.userName)
    case 'chatHistory': return undefined
    default: return prompt.content
  }
}

function promptText(
  prompt: SillyTavernPresetPrompt,
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
  state: MacroState,
): string | undefined {
  const marker = prompt.marker ? markerText(prompt, preset, inputs, state) : prompt.content
  if (marker === undefined) return undefined
  const card = inputs.card
  let value = marker
  if (prompt.identifier === 'main' && card !== undefined && card.systemPrompt.trim() !== '' && !prompt.forbidOverrides) {
    value = substituteCardMacros(card.systemPrompt, card, inputs.userName).replaceAll('{{original}}', marker)
  }
  if (prompt.identifier === 'jailbreak' && card !== undefined && card.postHistoryInstructions.trim() !== '' && !prompt.forbidOverrides) {
    value = substituteCardMacros(card.postHistoryInstructions, card, inputs.userName).replaceAll('{{original}}', marker)
  }
  const identity = promptIdentity(inputs)
  const expanded = expandMacros(card === undefined
    ? substituteSillyTavernIdentityMacros(value, identity)
    : substituteCardMacros(value, card, inputs.userName), state)
  if (!/<%[=_-]?[\s\S]*?%>/imu.test(expanded)) return expanded
  if (inputs.renderTemplate === undefined) {
    state.templateFailures += 1
    return undefined
  }
  const rendered = inputs.renderTemplate(expanded)
  if (!rendered.ok) {
    state.templateFailures += 1
    return undefined
  }
  return rendered.text
}

function promptIdentity(inputs: PresetPromptInputs): { readonly characterName: string; readonly userName?: string } {
  const card = inputs.card
  return {
    characterName: card?.nickname?.trim() || card?.name || inputs.characterName?.trim() || '角色',
    ...(inputs.userName === undefined ? {} : { userName: inputs.userName }),
  }
}

function continuationPlan(
  continuation: SillyTavernPresetContinuation | undefined,
  inputs: PresetPromptInputs,
  state: MacroState,
): RoleplayContinuationPlan | undefined {
  if (continuation === undefined) return undefined
  const card = inputs.card
  const source = card === undefined
    ? substituteSillyTavernIdentityMacros(continuation.nudgePrompt, promptIdentity(inputs))
    : substituteCardMacros(continuation.nudgePrompt, card, inputs.userName)
  return { ...continuation, nudgePrompt: expandMacros(source, state) }
}

/** Insert expanded in-chat modules using SillyTavern's depth, priority, and role ordering. */
export function injectSillyTavernInChatPrompts(
  messages: readonly Message[],
  prompts: readonly RoleplayInChatPrompt[],
): Message[] {
  if (prompts.length === 0) return [...messages]
  const result = [...messages]
  const baseLength = messages.length
  const depths = [...new Set(prompts.map(prompt => prompt.depth))].sort((left, right) => left - right)
  for (const depth of depths) {
    const atDepth = prompts.filter(prompt => prompt.depth === depth)
    const orders = [...new Set(atDepth.map(prompt => prompt.order))].sort((left, right) => right - left)
    const injected: Message[] = []
    for (const order of orders) {
      for (const role of ['system', 'user', 'assistant'] as const) {
        const content = atDepth
          .filter(prompt => prompt.order === order && prompt.role === role)
          .map(prompt => prompt.content.trim())
          .filter(Boolean)
          .join('\n')
        if (content === '') continue
        injected.push(createMessage({
          role,
          source: { kind: 'plugin', plugin: 'dsh-agent-rp-preset-in-chat' },
          content: [{ type: 'text', text: content }],
        }))
      }
    }
    result.splice(Math.max(0, baseLength - depth), 0, ...injected)
  }
  return result
}

function orderedMessage(prompt: RoleplayOrderedPrompt): Message {
  return createMessage({
    role: prompt.role,
    source: { kind: 'plugin', plugin: 'dsh-agent-rp-preset' },
    content: [{ type: 'text', text: prompt.content }],
  })
}

/**
 * Place ordinary Prompt Manager modules on their original side of chatHistory,
 * retaining user/assistant roles instead of flattening them into the system slot.
 */
export function injectSillyTavernPromptPlan(
  messages: readonly Message[],
  plan: RoleplayProviderPromptPlan,
): Message[] {
  const history = plan.includeHistory ? injectSillyTavernInChatPrompts(messages, plan.inChat) : []
  return [
    ...plan.beforeHistory.map(orderedMessage),
    ...history,
    ...plan.afterHistory.map(orderedMessage),
  ]
}

function isContinueInstruction(message: Message): boolean {
  const source = message.source as Message['source'] & { readonly operation?: unknown }
  return source.kind === 'plugin' && source.plugin === 'dsh-agent-rp-generation'
    && source.operation === 'continue'
}

function messageText(message: Message): string {
  return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function withContinuationPostfix(message: Message, postfix: SillyTavernPresetContinuation['postfix']): Message {
  if (postfix === '') return message
  const content = [...message.content]
  const textIndex = content.findLastIndex(block => block.type === 'text')
  const block = content[textIndex]
  if (block?.type !== 'text' || block.text.endsWith(' ')) return message
  content[textIndex] = { ...block, text: `${block.text}${postfix}` }
  return { ...message, content }
}

/** Apply SillyTavern continue-prefill or continue-nudge semantics after all prompt modules are placed. */
export function applySillyTavernContinuation(
  messages: readonly Message[],
  continuation: RoleplayContinuationPlan | undefined,
): Message[] {
  if (continuation === undefined) return [...messages]
  const instructionIndex = messages.findLastIndex(isContinueInstruction)
  if (instructionIndex < 0) return [...messages]
  const assistantIndex = messages.findLastIndex((message, index) => index < instructionIndex && message.role === 'assistant')
  if (assistantIndex < 0) return [...messages]
  const assistant = messages[assistantIndex]!
  if (continuation.prefill) {
    const retained = messages.filter((_message, index) => index !== assistantIndex && index !== instructionIndex)
    return [...retained, withContinuationPostfix(assistant, continuation.postfix)]
  }
  const nudge = continuation.nudgePrompt.replace(/\{\{lastchatmessage\}\}/giu, messageText(assistant).trim()).trim()
  if (nudge === '') return [...messages]
  return messages.map((message, index) => index === instructionIndex
    ? { ...message, role: 'system', content: [{ type: 'text', text: nudge }] }
    : message)
}

/** Produce the exact provider-facing order after prompt placement and continuation handling. */
export function prepareSillyTavernProviderMessages(
  messages: readonly Message[],
  plan: RoleplayProviderPromptPlan,
): Message[] {
  return applySillyTavernContinuation(injectSillyTavernPromptPlan(messages, plan), plan.continuation)
}

/** Assemble every ordered module, splitting post-history instructions into a runtime context. */
export function assembleSillyTavernPreset(
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
): RoleplayAssembledPrompt {
  const byId = new Map(preset.prompts.map(prompt => [prompt.identifier, prompt]))
  const state: MacroState = {
    variables: new Map(),
    userName: inputs.userName?.trim() || '用户',
    lastUserMessage: lastUserMessage(inputs.session, inputs.pendingMessages ?? []),
    unsupported: 0,
    templateFailures: 0,
  }
  const before: RoleplayOrderedPrompt[] = []
  const after: RoleplayOrderedPrompt[] = []
  const inChat: RoleplayInChatPrompt[] = []
  let pastHistory = false
  let includeHistory = false
  let enabledPromptCount = 0
  for (const entry of preset.order) {
    if (!entry.enabled) continue
    const prompt = byId.get(entry.identifier)
    if (prompt === undefined) continue
    enabledPromptCount += 1
    if (prompt.identifier === 'chatHistory') {
      includeHistory = true
      pastHistory = true
      continue
    }
    const value = promptText(prompt, preset, inputs, state)
    if (value === undefined || value.trim() === '') continue
    if (prompt.injectionPosition === 1) {
      inChat.push({
        role: prompt.role,
        content: value,
        depth: Number.isSafeInteger(prompt.injectionDepth) && (prompt.injectionDepth ?? -1) >= 0
          ? prompt.injectionDepth! : 4,
        order: typeof prompt.injectionOrder === 'number' && Number.isFinite(prompt.injectionOrder)
          ? prompt.injectionOrder : 100,
      })
      continue
    }
    ;(pastHistory ? after : before).push({ role: prompt.role, content: value })
  }
  if (inputs.mvuEnabled === true) {
    after.push({
      role: 'system',
      content: '每次回复都必须在正文末尾完整输出一个 <UpdateVariable><Analysis>…</Analysis><JSONPatch>[…]</JSONPatch></UpdateVariable>；没有变量变化时 JSONPatch 也输出空数组。',
    })
  }
  const continuation = continuationPlan(preset.continuation, inputs, state)
  return {
    beforeHistory: before,
    afterHistory: after,
    inChat,
    includeHistory,
    ...(continuation === undefined ? {} : { continuation }),
    enabledPromptCount,
    unsupportedMacroCount: state.unsupported,
    templateFailureCount: state.templateFailures,
  }
}
