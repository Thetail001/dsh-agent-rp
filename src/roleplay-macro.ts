/** Replay-safe SillyTavern macro expansion shared by Roleplay input adapters. */

import type { ImportedCharacterCard } from './import/types.ts'
import { substituteSillyTavernIdentityMacros } from './sillytavern-identity-macro.ts'

export interface RoleplayMacroMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

export interface RoleplayMacroContext {
  readonly card?: ImportedCharacterCard
  readonly characterName?: string
  readonly userName?: string
  readonly userPersona?: string
  readonly messages?: readonly RoleplayMacroMessage[]
  readonly pendingInput?: string
  /** Exact turn boundary used by values that may change on a later generation. */
  readonly entropy: string
  /** Experience identity used by values that stay stable throughout a Session. */
  readonly stableEntropy: string
}

const LAST_CHAT_MESSAGE_MACRO = '{{lastChatMessage}}'
const MAX_MACRO_DEPTH = 100

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

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function characterVersion(card: ImportedCharacterCard | undefined): string {
  if (card === undefined || typeof card.raw !== 'object' || card.raw === null || Array.isArray(card.raw)) return ''
  const root = card.raw as Record<string, unknown>
  const data = typeof root.data === 'object' && root.data !== null && !Array.isArray(root.data)
    ? root.data as Record<string, unknown> : root
  return typeof data.character_version === 'string' ? data.character_version : ''
}

function lastRoleMessage(messages: readonly RoleplayMacroMessage[], role?: RoleplayMacroMessage['role']): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message !== undefined && (role === undefined || message.role === role)) return message.content
  }
  return ''
}

/** Stateful expansion pass shared by every ordered module in one prepared resource. */
export class ReplayableRoleplayMacros {
  readonly #context: RoleplayMacroContext
  readonly #variables = new Map<string, string>()
  #randomOrdinal = 0
  #unsupported = 0

  constructor(context: RoleplayMacroContext) {
    this.#context = context
  }

  get unsupportedCount(): number {
    return this.#unsupported
  }

  expand(value: string): string {
    return this.#resolve(this.#identity(value), 0).trim()
  }

  #identity(value: string): string {
    const card = this.#context.card
    const characterName = card?.nickname?.trim() || card?.name || this.#context.characterName?.trim() || '角色'
    return substituteSillyTavernIdentityMacros(value, {
      characterName,
      userName: this.#context.userName?.trim() || '用户',
    })
  }

  #cardValue(value: string | undefined): string {
    return value === undefined ? '' : this.#identity(value)
  }

  #choice(choices: readonly string[], stable: boolean): string {
    const ordinal = this.#randomOrdinal
    this.#randomOrdinal += 1
    if (choices.length === 0) return ''
    const entropy = stable ? this.#context.stableEntropy : this.#context.entropy
    const hash = hashText(`${entropy}\u0000${ordinal}\u0000${choices.join('\u0000')}`)
    return choices[hash % choices.length] ?? ''
  }

  #roll(source: string): string {
    const ordinal = this.#randomOrdinal
    this.#randomOrdinal += 1
    const integer = /^\d+$/u.exec(source)
    const dice = /^(\d*)d(\d+)((?:[+-]\d+)*)$/iu.exec(source)
    const count = integer !== null ? 1 : dice?.[1] === '' ? 1 : Number(dice?.[1])
    const sides = Number(integer?.[0] ?? dice?.[2])
    if (!Number.isSafeInteger(count) || count < 1 || count > 1_000
      || !Number.isSafeInteger(sides) || sides < 1 || sides > 1_000_000) return ''
    let total = 0
    let seed = hashText(`${this.#context.entropy}\u0000${ordinal}\u0000roll\u0000${source}`)
    for (let index = 0; index < count; index += 1) {
      seed = hashText(`${seed}\u0000${index}`)
      total += seed % sides + 1
    }
    for (const modifier of dice?.[3]?.matchAll(/([+-])(\d+)/gu) ?? []) {
      const value = Number(modifier[2])
      if (!Number.isSafeInteger(value)) return ''
      total += modifier[1] === '+' ? value : -value
    }
    return String(total)
  }

  #evaluate(source: string, depth: number): string {
    const parts = macroParts(source)
    const name = parts.shift()?.trim().toLowerCase() ?? ''
    const card = this.#context.card
    const messages = this.#context.messages ?? []
    if (name.startsWith('//')) return ''
    if (name === 'setvar') {
      const variable = parts.shift()?.trim() ?? ''
      const value = this.#resolve(parts.join('::'), depth + 1).trim()
      if (variable !== '') this.#variables.set(variable, value)
      return ''
    }
    if (name === 'addvar') {
      const variable = parts.shift()?.trim() ?? ''
      const value = this.#resolve(parts.join('::'), depth + 1).trim()
      if (variable !== '') this.#variables.set(variable, addVariable(this.#variables.get(variable), value))
      return ''
    }
    if (name === 'getvar') return this.#variables.get(parts.join('::').trim()) ?? ''
    if (name === 'random' || name === 'pick') {
      const choices = parts.map(value => this.#resolve(value, depth + 1).trim())
      return this.#choice(choices, name === 'pick')
    }
    if (name === 'roll') return this.#roll(parts.join('::').trim())
    if (name === 'group') return card?.nickname?.trim() || card?.name || this.#context.characterName?.trim() || ''
    if (name === 'persona') return this.#context.userPersona ?? ''
    if (name === 'description' || name === 'chardescription') return this.#cardValue(card?.description)
    if (name === 'personality' || name === 'charpersonality') return this.#cardValue(card?.personality)
    if (name === 'scenario' || name === 'charscenario') return this.#cardValue(card?.scenario)
    if (name === 'mesexamples' || name === 'mesexamplesraw') return this.#cardValue(card?.messageExample)
    if (name === 'greeting' || name === 'charfirstmessage') {
      const index = Number(parts.join('::').trim() || '0')
      if (!Number.isSafeInteger(index) || index < 0) return ''
      return this.#cardValue(index === 0 ? card?.firstMessage : card?.alternateGreetings[index - 1])
    }
    if (name === 'version' || name === 'charversion' || name === 'char_version') return characterVersion(card)
    if (name === 'charprompt') return this.#cardValue(card?.systemPrompt)
    if (name === 'charinstruction') return this.#cardValue(card?.postHistoryInstructions)
    if (name === 'input') return this.#context.pendingInput ?? ''
    if (name === 'lastmessage') return lastRoleMessage(messages)
    if (name === 'lastusermessage') return lastRoleMessage(messages, 'user')
    if (name === 'lastcharmessage') return lastRoleMessage(messages, 'assistant')
    if (name === 'lastmessageid') return messages.length === 0 ? '' : String(messages.length - 1)
    if (name === 'lastchatmessage') return LAST_CHAT_MESSAGE_MACRO
    if (name === 'newline') {
      const count = Number(parts.join('::').trim() || '1')
      return '\n'.repeat(Number.isSafeInteger(count) && count > 0 ? Math.min(count, 100) : 1)
    }
    if (name === 'noop' || name === 'trim') return ''
    this.#unsupported += 1
    return `{{${this.#resolve(source, depth + 1)}}}`
  }

  #resolve(value: string, depth: number): string {
    if (depth > MAX_MACRO_DEPTH) return value
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
      result += this.#evaluate(value.slice(open + 2, close - 2), depth)
      cursor = close
    }
    return result
  }
}
