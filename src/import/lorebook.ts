/** Deterministic activation of the safe Character Card lorebook subset. */

import type { ImportedLorebook, ImportedLorebookEntry } from './types.ts'

/** Runtime result of selecting lorebook entries for one prompt. */
export interface ActiveLorebook {
  readonly beforeCharacter: readonly string[]
  readonly afterCharacter: readonly string[]
}

/** Why one normalized lorebook entry did or did not enter the current prompt. */
export type LorebookActivationReason =
  | 'active-constant'
  | 'active-keyword'
  | 'disabled'
  | 'deleted'
  | 'empty-content'
  | 'decorator-unsupported'
  | 'template-unsupported'
  | 'regex-unsupported'
  | 'primary-unmatched'
  | 'secondary-unmatched'
  | 'budget-excluded'

/** Explainable activation result for one entry in source order. */
export interface LorebookEntryActivation {
  readonly index: number
  readonly active: boolean
  readonly reason: LorebookActivationReason
  readonly matchedKeys: readonly string[]
  readonly matchedSecondaryKeys: readonly string[]
  readonly approximateTokens: number
}

/** Prompt fragments and entry-level explanations produced by the same decision pass. */
export interface InspectedLorebook extends ActiveLorebook {
  readonly entries: readonly LorebookEntryActivation[]
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

function keywordMatches(
  keys: readonly string[],
  text: string,
  entry: ImportedLorebookEntry,
): string[] {
  return keys.filter(key => includesKey(text, key, entry.caseSensitive, entry.matchWholeWords))
}

function candidate(
  entry: ImportedLorebookEntry,
  messages: readonly string[],
  bookDepth: number | undefined,
): Omit<LorebookEntryActivation, 'index' | 'active' | 'approximateTokens'> & { readonly candidate: boolean } {
  if (!entry.enabled) return { candidate: false, reason: 'disabled', matchedKeys: [], matchedSecondaryKeys: [] }
  if (entry.content.trim().length === 0) return { candidate: false, reason: 'empty-content', matchedKeys: [], matchedSecondaryKeys: [] }
  if (entry.hasDecorators) return { candidate: false, reason: 'decorator-unsupported', matchedKeys: [], matchedSecondaryKeys: [] }
  if (hasExecutableTemplate(entry.content)) return { candidate: false, reason: 'template-unsupported', matchedKeys: [], matchedSecondaryKeys: [] }
  if (entry.constant) return { candidate: true, reason: 'active-constant', matchedKeys: [], matchedSecondaryKeys: [] }
  if (entry.useRegex) return { candidate: false, reason: 'regex-unsupported', matchedKeys: [], matchedSecondaryKeys: [] }
  const depth = entry.scanDepth ?? bookDepth ?? messages.length
  const text = depth === 0 ? '' : messages.slice(-Math.max(0, Math.trunc(depth))).join('\n')
  const matchedKeys = keywordMatches(entry.keys, text, entry)
  if (matchedKeys.length === 0) {
    return { candidate: false, reason: 'primary-unmatched', matchedKeys, matchedSecondaryKeys: [] }
  }
  const matchedSecondaryKeys = keywordMatches(entry.secondaryKeys, text, entry)
  if (!entry.selective || entry.secondaryKeys.length === 0) {
    return { candidate: true, reason: 'active-keyword', matchedKeys, matchedSecondaryKeys }
  }
  const matches = entry.secondaryKeys.map(key => matchedSecondaryKeys.includes(key))
  const secondaryMatches = entry.secondaryLogic === 'and-any' ? matches.some(Boolean)
    : entry.secondaryLogic === 'and-all' ? matches.every(Boolean)
      : entry.secondaryLogic === 'not-any' ? matches.every(match => !match)
        : matches.some(match => !match)
  return secondaryMatches
    ? { candidate: true, reason: 'active-keyword', matchedKeys, matchedSecondaryKeys }
    : { candidate: false, reason: 'secondary-unmatched', matchedKeys, matchedSecondaryKeys }
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

function budgeted(book: ImportedLorebook, entries: readonly { readonly index: number; readonly entry: ImportedLorebookEntry }[]): number[] {
  const budget = book.tokenBudget
  if (budget === undefined) return entries.map(value => value.index)
  const preferred = [...entries].sort((left, right) =>
    (right.entry.priority ?? right.entry.insertionOrder) - (left.entry.priority ?? left.entry.insertionOrder)
      || left.entry.insertionOrder - right.entry.insertionOrder)
  const kept: number[] = []
  let used = 0
  for (const { index, entry } of preferred) {
    const cost = approximateTokens(entry.content)
    if (entry.ignoreBudget) {
      kept.push(index)
      continue
    }
    if (used + cost > budget) continue
    used += cost
    kept.push(index)
  }
  return kept.sort((left, right) => left - right)
}

/**
 * Inspect prompt activation with entry-level reasons and matching evidence.
 * @param book - imported character lorebook.
 * @param messages - model-visible conversation text in chronological order.
 * @returns prompt fragments and explanations produced by one shared decision pass.
 */
export function inspectLorebook(book: ImportedLorebook, messages: readonly string[]): InspectedLorebook {
  const decisions = book.entries.map((entry, index) => ({
    index,
    entry,
    decision: candidate(entry, messages, book.scanDepth),
  }))
  const candidates = decisions.filter(value => value.decision.candidate)
  const included = new Set(budgeted(book, candidates.map(({ index, entry }) => ({ index, entry }))))
  const entries = decisions.map(({ index, entry, decision }): LorebookEntryActivation => ({
    index,
    active: decision.candidate && included.has(index),
    reason: decision.candidate && !included.has(index) ? 'budget-excluded' : decision.reason,
    matchedKeys: decision.matchedKeys,
    matchedSecondaryKeys: decision.matchedSecondaryKeys,
    approximateTokens: approximateTokens(entry.content),
  }))
  const active = entries.filter(value => value.active)
    .map(value => ({ index: value.index, entry: book.entries[value.index]! }))
    .sort((left, right) => left.entry.insertionOrder - right.entry.insertionOrder || left.index - right.index)
    .map(value => value.entry)
  return {
    beforeCharacter: active.filter(entry => entry.position === 'before_char').map(entry => entry.content),
    afterCharacter: active.filter(entry => entry.position === 'after_char').map(entry => entry.content),
    entries,
  }
}

/**
 * Activate non-regex, undecorated lorebook entries against recent dialogue.
 * @param book - imported character lorebook.
 * @param messages - model-visible conversation text in chronological order.
 * @returns position-separated content in insertion order and within budget.
 */
export function activateLorebook(book: ImportedLorebook, messages: readonly string[]): ActiveLorebook {
  const { beforeCharacter, afterCharacter } = inspectLorebook(book, messages)
  return { beforeCharacter, afterCharacter }
}
