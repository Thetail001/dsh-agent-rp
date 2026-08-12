/** Deterministic activation of the safe Character Card lorebook subset. */

import type { ImportedLorebook, ImportedLorebookEntry } from './types.ts'

/** Runtime result of selecting lorebook entries for one prompt. */
export interface ActiveLorebook {
  readonly beforeCharacter: readonly string[]
  readonly afterCharacter: readonly string[]
}

function includesKey(text: string, key: string, caseSensitive: boolean, matchWholeWords: boolean): boolean {
  if (key.length === 0) return false
  const haystack = caseSensitive ? text : text.toLocaleLowerCase()
  const needle = caseSensitive ? key : key.toLocaleLowerCase()
  if (!matchWholeWords) return haystack.includes(needle)
  if (/\s/u.test(needle)) return haystack.includes(needle)
  let offset = haystack.indexOf(needle)
  while (offset >= 0) {
    const before = offset === 0 ? '' : haystack[offset - 1]!
    const after = offset + needle.length >= haystack.length ? '' : haystack[offset + needle.length]!
    if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) return true
    offset = haystack.indexOf(needle, offset + 1)
  }
  return false
}

function hasExecutableTemplate(content: string): boolean {
  return /<%[=_-]?[\s\S]*?%>/imu.test(content)
}

function activates(entry: ImportedLorebookEntry, messages: readonly string[], bookDepth: number | undefined): boolean {
  if (!entry.enabled || entry.content.trim().length === 0 || entry.hasDecorators || hasExecutableTemplate(entry.content)) return false
  if (entry.constant) return true
  const depth = entry.scanDepth ?? bookDepth ?? messages.length
  const text = depth === 0 ? '' : messages.slice(-Math.max(0, Math.trunc(depth))).join('\n')
  if (!entry.keys.some(key => includesKey(text, key, entry.caseSensitive, entry.matchWholeWords))) return false
  if (!entry.selective || entry.secondaryKeys.length === 0) return true
  const matches = entry.secondaryKeys.map(key => includesKey(text, key, entry.caseSensitive, entry.matchWholeWords))
  if (entry.secondaryLogic === 'and-any') return matches.some(Boolean)
  if (entry.secondaryLogic === 'and-all') return matches.every(Boolean)
  if (entry.secondaryLogic === 'not-any') return matches.every(match => !match)
  return matches.some(match => !match)
}

function approximateTokens(text: string): number {
  let ascii = 0
  let nonAscii = 0
  for (const character of text) {
    if (character.codePointAt(0)! <= 0x7f) ascii += 1
    else nonAscii += 1
  }
  return Math.max(1, Math.ceil(ascii / 4) + nonAscii)
}

function budgeted(book: ImportedLorebook, entries: readonly ImportedLorebookEntry[]): ImportedLorebookEntry[] {
  const budget = book.tokenBudget
  if (budget === undefined) return [...entries]
  const preferred = [...entries].sort((left, right) =>
    (right.priority ?? right.insertionOrder) - (left.priority ?? left.insertionOrder)
      || left.insertionOrder - right.insertionOrder)
  const kept: ImportedLorebookEntry[] = []
  let used = 0
  for (const entry of preferred) {
    const cost = approximateTokens(entry.content)
    if (entry.ignoreBudget) {
      kept.push(entry)
      continue
    }
    if (used + cost > budget) continue
    used += cost
    kept.push(entry)
  }
  return kept.sort((left, right) => left.insertionOrder - right.insertionOrder)
}

/**
 * Activate non-regex, undecorated lorebook entries against recent dialogue.
 * @param book - imported character lorebook.
 * @param messages - model-visible conversation text in chronological order.
 * @returns position-separated content in insertion order and within budget.
 */
export function activateLorebook(book: ImportedLorebook, messages: readonly string[]): ActiveLorebook {
  const entries = budgeted(book, book.entries.filter(entry => activates(entry, messages, book.scanDepth)))
  return {
    beforeCharacter: entries.filter(entry => entry.position === 'before_char').map(entry => entry.content),
    afterCharacter: entries.filter(entry => entry.position === 'after_char').map(entry => entry.content),
  }
}
