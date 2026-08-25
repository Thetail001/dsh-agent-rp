/** Standalone SillyTavern World Info projection preserving Character Card source fields. */

import type { JsonValue } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterCard, ImportedLorebookEntry } from './import/types.ts'

function record(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function secondaryLogic(value: ImportedLorebookEntry['secondaryLogic']): number {
  if (value === 'and-any') return 0
  if (value === 'not-all') return 1
  if (value === 'not-any') return 2
  return 3
}

function position(entry: ImportedLorebookEntry): number {
  return entry.position === 'before_char' ? 0 : entry.position === 'at_depth' ? 4 : 1
}

function role(entry: ImportedLorebookEntry): number | undefined {
  return entry.injectionRole === 'system' ? 0
    : entry.injectionRole === 'user' ? 1 : entry.injectionRole === 'assistant' ? 2 : undefined
}

function projectedEntry(raw: JsonValue | undefined, entry: ImportedLorebookEntry): Record<string, JsonValue> {
  const original = record(raw) ?? {}
  const extensions = record(original.extensions) ?? {}
  const injectionRole = role(entry)
  return {
    ...structuredClone(original),
    uid: original.uid ?? original.id ?? entry.sourceId,
    key: [...entry.keys],
    keysecondary: [...entry.secondaryKeys],
    ...(entry.name === undefined ? {} : { name: entry.name }),
    ...(entry.comment === undefined ? {} : { comment: entry.comment }),
    content: entry.content,
    disable: !entry.enabled,
    order: entry.insertionOrder,
    selective: entry.selective,
    constant: entry.constant,
    caseSensitive: entry.caseSensitive,
    matchWholeWords: entry.matchWholeWords,
    selectiveLogic: secondaryLogic(entry.secondaryLogic),
    position: position(entry),
    ...(entry.injectionDepth === undefined ? {} : { depth: entry.injectionDepth }),
    ...(injectionRole === undefined ? {} : { role: injectionRole }),
    ...(entry.priority === undefined ? {} : { priority: entry.priority }),
    ...(entry.scanDepth === undefined ? {} : { scanDepth: entry.scanDepth }),
    useRegex: entry.useRegex,
    extensions: {
      ...structuredClone(extensions),
      ...(entry.ignoreBudget ? { ignore_budget: true } : {}),
    },
  }
}

/** Convert a validated embedded book into deterministic standalone JSON bytes. */
export function embeddedWorldInfoAsset(card: ImportedCharacterCard): {
  readonly data: Uint8Array
  readonly filename: string
} | undefined {
  if (card.lorebook === undefined) return undefined
  const root = record(card.raw)
  const cardData = card.version === 1 ? root : record(root?.data)
  const original = record(cardData?.character_book) ?? {}
  const originalEntries = Array.isArray(original.entries) ? original.entries : []
  const worldInfo: Record<string, JsonValue> = {
    ...structuredClone(original),
    ...(card.lorebook.name === undefined ? {} : { name: card.lorebook.name }),
    ...(card.lorebook.scanDepth === undefined ? {} : { scan_depth: card.lorebook.scanDepth }),
    ...(card.lorebook.tokenBudget === undefined ? {} : { token_budget: card.lorebook.tokenBudget }),
    recursive_scanning: card.lorebook.recursiveScanning,
    entries: card.lorebook.entries.map((entry, index) => projectedEntry(originalEntries[index], entry)),
  }
  const name = (card.lorebook.name?.trim() || `${card.nickname?.trim() || card.name}的世界书`)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, '_')
    .slice(0, 200)
  return {
    data: new TextEncoder().encode(`${JSON.stringify(worldInfo, null, 2)}\n`),
    filename: `${name || '角色内置世界书'}.json`,
  }
}
