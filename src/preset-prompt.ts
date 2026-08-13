/** Prompt Manager assembly for imported SillyTavern Chat Completion presets. */

import type { Session, UserMessage } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterCard } from './import/types.ts'
import type {
  ImportedSillyTavernPreset,
  SillyTavernPresetPrompt,
  SillyTavernPresetRole,
} from './import/sillytavern-preset.ts'
import { substituteCardMacros } from './prompt.ts'

/** Runtime values substituted into marker prompts and macros. */
export interface PresetPromptInputs {
  readonly card: ImportedCharacterCard
  readonly userName?: string
  readonly userPersona?: string
  readonly worldInfoBefore: readonly string[]
  readonly worldInfoAfter: readonly string[]
  readonly session: Session
  readonly pendingMessages?: readonly UserMessage[]
  readonly mvuEnabled?: boolean
}

/** Host-compatible prompt split around SillyTavern's chatHistory marker. */
export interface AssembledSillyTavernPreset {
  readonly system: string
  readonly afterHistory: string
  readonly enabledPromptCount: number
  readonly degradedRoleCount: number
  readonly unsupportedMacroCount: number
}

interface MacroState {
  readonly variables: Map<string, string>
  readonly userName: string
  readonly lastUserMessage: string
  unsupported: number
}

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

function evaluateMacro(source: string, state: MacroState): string {
  const parts = macroParts(source)
  const name = parts.shift()?.trim().toLowerCase() ?? ''
  if (name === '//' || name.startsWith('// ')) return ''
  if (name === 'setvar') {
    const variable = parts.shift()?.trim() ?? ''
    const value = expandMacros(parts.join('::'), state)
    if (variable !== '') state.variables.set(variable, value)
    return ''
  }
  if (name === 'getvar') return state.variables.get(parts.join('::').trim()) ?? ''
  if (name === 'random') {
    const choices = parts.map(value => expandMacros(value, state).trim())
    return choices.length === 0 ? '' : choices[Math.floor(Math.random() * choices.length)] ?? ''
  }
  if (name === 'lastusermessage') return state.lastUserMessage
  if (name === 'user') return state.userName
  if (name === 'trim') return ''
  state.unsupported += 1
  return ''
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
    case 'charDescription': return substituteCardMacros(card.description, card, inputs.userName)
    case 'charPersonality':
      return applyFormat(preset.formats.personality, 'personality', substituteCardMacros(card.personality, card, inputs.userName), state)
    case 'scenario':
      return applyFormat(preset.formats.scenario, 'scenario', substituteCardMacros(card.scenario, card, inputs.userName), state)
    case 'personaDescription': return inputs.userPersona ?? ''
    case 'dialogueExamples': return substituteCardMacros(card.messageExample, card, inputs.userName)
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
  if (prompt.identifier === 'main' && card.systemPrompt.trim() !== '' && !prompt.forbidOverrides) {
    value = substituteCardMacros(card.systemPrompt, card, inputs.userName).replaceAll('{{original}}', marker)
  }
  if (prompt.identifier === 'jailbreak' && card.postHistoryInstructions.trim() !== '' && !prompt.forbidOverrides) {
    value = substituteCardMacros(card.postHistoryInstructions, card, inputs.userName).replaceAll('{{original}}', marker)
  }
  return expandMacros(substituteCardMacros(value, card, inputs.userName), state)
}

function roleBoundary(role: SillyTavernPresetRole, name: string, text: string): string {
  if (role === 'system') return text
  return `[SillyTavern ${role} prompt · ${name}]\n${text}`
}

/** Assemble every ordered module, splitting post-history instructions into a runtime context. */
export function assembleSillyTavernPreset(
  preset: ImportedSillyTavernPreset,
  inputs: PresetPromptInputs,
): AssembledSillyTavernPreset {
  const byId = new Map(preset.prompts.map(prompt => [prompt.identifier, prompt]))
  const state: MacroState = {
    variables: new Map(),
    userName: inputs.userName?.trim() || '用户',
    lastUserMessage: lastUserMessage(inputs.session, inputs.pendingMessages ?? []),
    unsupported: 0,
  }
  const before: string[] = []
  const after: string[] = []
  let pastHistory = false
  let enabledPromptCount = 0
  let degradedRoleCount = 0
  for (const entry of preset.order) {
    if (!entry.enabled) continue
    const prompt = byId.get(entry.identifier)
    if (prompt === undefined) continue
    enabledPromptCount += 1
    // The Host currently requires request messages to equal the durable Session
    // derivation, so it cannot represent SillyTavern's transient depth insertion.
    if (prompt.injectionPosition === 1) continue
    if (prompt.identifier === 'chatHistory' && prompt.marker) {
      pastHistory = true
      continue
    }
    const value = promptText(prompt, preset, inputs, state)
    if (value === undefined || value.trim() === '') continue
    if (prompt.role !== 'system') degradedRoleCount += 1
    ;(pastHistory ? after : before).push(roleBoundary(prompt.role, prompt.name, value))
  }
  if (inputs.mvuEnabled === true) {
    after.push('每次回复都必须在正文末尾完整输出一个 <UpdateVariable><Analysis>…</Analysis><JSONPatch>[…]</JSONPatch></UpdateVariable>；没有变量变化时 JSONPatch 也输出空数组。')
  }
  return {
    system: before.join('\n\n'),
    afterHistory: after.join('\n\n'),
    enabledPromptCount,
    degradedRoleCount,
    unsupportedMacroCount: state.unsupported,
  }
}
