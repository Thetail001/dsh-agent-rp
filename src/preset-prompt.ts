/** Prompt Manager assembly for imported SillyTavern Chat Completion presets. */

import { createMessage, type Message } from '@deepseek-ai/dsh-llm'
import type { Session, UserMessage } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterCard } from './import/types.ts'
import type {
  ImportedSillyTavernPreset,
  SillyTavernPresetContinuation,
  SillyTavernPresetPrompt,
} from './import/sillytavern-preset.ts'
import type { EjsTemplateResult } from './ejs-template.ts'
import {
  ReplayableRoleplayMacros,
  type RoleplayMacroContext,
  type RoleplayMacroMessage,
} from './roleplay-macro.ts'

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
  /** Prepared turn context shared with native card and world adapters. */
  readonly macroContext?: RoleplayMacroContext
  readonly worldInfoMacrosResolved?: boolean
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
  readonly templateRenderCount: number
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

function macroMessageText(message: ReturnType<Session['deriveMessages']>[number] | UserMessage): string {
  return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function macroMessages(session: Session, pending: readonly UserMessage[]): readonly RoleplayMacroMessage[] {
  const history = session.deriveMessages()
  const historyIds = new Set(history.map(message => message.id))
  return [...history, ...pending.filter(message => !historyIds.has(message.id))].flatMap((message) => {
    if ((message.role !== 'user' && message.role !== 'assistant')
      || (message.source.kind !== 'user' && message.source.kind !== 'model')) return []
    return [{ role: message.role, content: macroMessageText(message) }]
  })
}

interface PromptAssemblyDiagnostics {
  templateRenders: number
  templateFailures: number
}

const RESOLVED_FORMAT_VALUE = '\u0000agent-rp-resolved-format-value\u0000'

function applyFormat(
  format: string,
  variable: string,
  value: string,
  macros: ReplayableRoleplayMacros,
  valueResolved = false,
): string {
  if (value.trim() === '') return ''
  const inserted = valueResolved ? RESOLVED_FORMAT_VALUE : value
  const expanded = macros.expand(format.replaceAll(`{{${variable}}}`, inserted).replaceAll('{0}', inserted))
  return valueResolved ? expanded.replaceAll(RESOLVED_FORMAT_VALUE, value) : expanded
}

function markerText(
  prompt: SillyTavernPresetPrompt,
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
  macros: ReplayableRoleplayMacros,
): string | undefined {
  const card = inputs.card
  switch (prompt.identifier) {
    case 'worldInfoBefore':
      return inputs.worldInfoBefore.map(value => applyFormat(
        preset.formats.worldInfo, 'worldInfo', value, macros, inputs.worldInfoMacrosResolved,
      )).filter(Boolean).join('\n\n')
    case 'worldInfoAfter':
      return inputs.worldInfoAfter.map(value => applyFormat(
        preset.formats.worldInfo, 'worldInfo', value, macros, inputs.worldInfoMacrosResolved,
      )).filter(Boolean).join('\n\n')
    case 'charDescription': return card?.description ?? ''
    case 'charPersonality':
      return card === undefined ? '' : applyFormat(
        preset.formats.personality, 'personality', card.personality, macros,
      )
    case 'scenario':
      return card === undefined ? '' : applyFormat(
        preset.formats.scenario, 'scenario', card.scenario, macros,
      )
    case 'personaDescription': return inputs.userPersona ?? ''
    case 'dialogueExamples': return card?.messageExample ?? ''
    case 'chatHistory': return undefined
    default: return prompt.content
  }
}

function promptText(
  prompt: SillyTavernPresetPrompt,
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
  macros: ReplayableRoleplayMacros,
  diagnostics: PromptAssemblyDiagnostics,
): string | undefined {
  const marker = prompt.marker ? markerText(prompt, preset, inputs, macros) : prompt.content
  if (marker === undefined) return undefined
  const card = inputs.card
  let value = marker
  if (prompt.identifier === 'main' && card !== undefined && card.systemPrompt.trim() !== '' && !prompt.forbidOverrides) {
    value = card.systemPrompt.replaceAll('{{original}}', marker)
  }
  if (prompt.identifier === 'jailbreak' && card !== undefined && card.postHistoryInstructions.trim() !== '' && !prompt.forbidOverrides) {
    value = card.postHistoryInstructions.replaceAll('{{original}}', marker)
  }
  const expanded = macros.expand(value)
  if (!/<%[=_-]?[\s\S]*?%>/imu.test(expanded)) return expanded
  if (inputs.renderTemplate === undefined) {
    diagnostics.templateFailures += 1
    return undefined
  }
  const rendered = inputs.renderTemplate(expanded)
  if (!rendered.ok) {
    diagnostics.templateFailures += 1
    return undefined
  }
  diagnostics.templateRenders += 1
  return rendered.text
}

function continuationPlan(
  continuation: SillyTavernPresetContinuation | undefined,
  macros: ReplayableRoleplayMacros,
): RoleplayContinuationPlan | undefined {
  if (continuation === undefined) return undefined
  return { ...continuation, nudgePrompt: macros.expand(continuation.nudgePrompt) }
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
  const messages = macroMessages(inputs.session, inputs.pendingMessages ?? [])
  const macros = new ReplayableRoleplayMacros(inputs.macroContext ?? {
    ...(inputs.card === undefined ? {} : { card: inputs.card }),
    ...(inputs.characterName === undefined ? {} : { characterName: inputs.characterName }),
    ...(inputs.userName === undefined ? {} : { userName: inputs.userName }),
    ...(inputs.userPersona === undefined ? {} : { userPersona: inputs.userPersona }),
    messages,
    pendingInput: (inputs.pendingMessages ?? []).map(macroMessageText).filter(Boolean).join('\n'),
    entropy: JSON.stringify([
      String(inputs.session.id),
      inputs.session.seq,
      ...(inputs.pendingMessages ?? []).map(message => String(message.id)),
    ]),
    stableEntropy: String(inputs.session.id),
  })
  const diagnostics: PromptAssemblyDiagnostics = { templateRenders: 0, templateFailures: 0 }
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
    const value = promptText(prompt, preset, inputs, macros, diagnostics)
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
  const continuation = continuationPlan(preset.continuation, macros)
  return {
    beforeHistory: before,
    afterHistory: after,
    inChat,
    includeHistory,
    ...(continuation === undefined ? {} : { continuation }),
    enabledPromptCount,
    unsupportedMacroCount: macros.unsupportedCount,
    templateRenderCount: diagnostics.templateRenders,
    templateFailureCount: diagnostics.templateFailures,
  }
}
