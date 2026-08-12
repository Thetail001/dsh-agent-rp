/** Minimal persistent MVU state for imported Character Cards. */

import { snapshotJsonValue, type JsonValue, type SessionEvent } from '@deepseek-ai/dsh-session'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { ImportedCharacterCard } from './import/types.ts'

interface JsonPatchOperation {
  readonly op: 'replace' | 'delta' | 'insert' | 'remove' | 'move'
  readonly path?: string
  readonly from?: string
  readonly to?: string
  readonly value?: JsonValue
}

function jsonRecord(value: JsonValue): Record<string, JsonValue> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function initializerContent(card: ImportedCharacterCard): string | undefined {
  return card.lorebook?.entries
    .map(entry => entry.content.match(/<initvar>\s*([\s\S]*?)\s*<\/initvar>/iu)?.[1])
    .find((value): value is string => value !== undefined)
}

/** Read the card-owned initial `stat_data` without activating its hidden initializer as lore. */
export function readInitialMvuState(card: ImportedCharacterCard): JsonValue | undefined {
  const content = initializerContent(card)
  if (content === undefined) return undefined
  const parsed: unknown = parseYaml(content, { maxAliasCount: 100 })
  const snapshot = snapshotJsonValue(parsed) as JsonValue | undefined
  if (snapshot === undefined || jsonRecord(snapshot) === undefined) {
    throw new Error('Character Card MVU initializer must contain one JSON-compatible object')
  }
  return snapshot
}

/** Fold the latest durable MVU snapshot, falling back to the card initializer. */
export function readCurrentMvuState(
  card: ImportedCharacterCard,
  events: readonly SessionEvent[],
): { readonly statData: JsonValue; readonly updateCount: number; readonly lastError?: string } | undefined {
  const initial = readInitialMvuState(card)
  if (initial === undefined) return undefined
  let statData = initial
  let updateCount = 0
  let lastError: string | undefined
  for (const event of events) {
    if (event.type !== 'assistant/message') continue
    const text = event.data.message.content
      .flatMap(block => block.type === 'text' ? [block.text] : [])
      .join('\n')
    if (!/<UpdateVariable(?:variable)?>/iu.test(text)) continue
    try {
      const update = applyMvuReply(statData, text)
      if (update === undefined) continue
      statData = update.statData
      updateCount += 1
      lastError = undefined
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  return { statData, updateCount, ...(lastError === undefined ? {} : { lastError }) }
}

function pointerSegments(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return []
  if (!pointer.startsWith('/')) throw new Error(`MVU path must be a JSON Pointer: ${pointer}`)
  const segments = pointer.slice(1).split('/').map(segment => segment.replace(/~1/gu, '/').replace(/~0/gu, '~'))
  return segments[0] === 'stat_data' ? segments.slice(1) : segments
}

function parentAt(root: JsonValue, pointer: string): { parent: Record<string, JsonValue> | JsonValue[]; key: string } {
  const segments = pointerSegments(pointer)
  const key = segments.pop()
  if (key === undefined) throw new Error('MVU operation cannot replace the stat_data root')
  let current: JsonValue = root
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) throw new Error(`MVU path does not exist: ${pointer}`)
      current = current[index]!
      continue
    }
    const record = jsonRecord(current)
    if (record === undefined || !(segment in record)) throw new Error(`MVU path does not exist: ${pointer}`)
    current = record[segment]!
  }
  const parent = Array.isArray(current) ? current : jsonRecord(current)
  if (parent === undefined) throw new Error(`MVU path parent is not a container: ${pointer}`)
  return { parent, key }
}

function arrayIndex(array: JsonValue[], key: string, append: boolean): number {
  if (append && key === '-') return array.length
  const index = Number(key)
  if (!Number.isSafeInteger(index) || index < 0 || index > array.length || (!append && index === array.length)) {
    throw new Error(`MVU array index is unavailable: ${key}`)
  }
  return index
}

function readAt(root: JsonValue, pointer: string): JsonValue {
  const { parent, key } = parentAt(root, pointer)
  if (Array.isArray(parent)) return parent[arrayIndex(parent, key, false)]!
  if (!(key in parent)) throw new Error(`MVU path does not exist: ${pointer}`)
  return parent[key]!
}

function removeAt(root: JsonValue, pointer: string): JsonValue {
  const { parent, key } = parentAt(root, pointer)
  if (Array.isArray(parent)) return parent.splice(arrayIndex(parent, key, false), 1)[0]!
  if (!(key in parent)) throw new Error(`MVU path does not exist: ${pointer}`)
  const value = parent[key]!
  delete parent[key]
  return value
}

function insertAt(root: JsonValue, pointer: string, value: JsonValue): void {
  const { parent, key } = parentAt(root, pointer)
  if (Array.isArray(parent)) {
    parent.splice(arrayIndex(parent, key, true), 0, value)
    return
  }
  if (key in parent) throw new Error(`MVU insert path already exists: ${pointer}`)
  parent[key] = value
}

function replaceAt(root: JsonValue, pointer: string, value: JsonValue): void {
  const { parent, key } = parentAt(root, pointer)
  if (Array.isArray(parent)) parent[arrayIndex(parent, key, false)] = value
  else {
    if (!(key in parent)) throw new Error(`MVU replace path does not exist: ${pointer}`)
    parent[key] = value
  }
}

function operation(value: unknown): JsonPatchOperation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('MVU patch entries must be objects')
  const record = value as Record<string, unknown>
  if (record.op !== 'replace' && record.op !== 'delta' && record.op !== 'insert'
    && record.op !== 'remove' && record.op !== 'move') throw new Error(`Unsupported MVU operation: ${String(record.op)}`)
  if (record.path !== undefined && typeof record.path !== 'string') throw new Error('MVU operation path must be a string')
  if (record.from !== undefined && typeof record.from !== 'string') throw new Error('MVU move source must be a string')
  if (record.to !== undefined && typeof record.to !== 'string') throw new Error('MVU move destination must be a string')
  const snapshot = record.value === undefined ? undefined : snapshotJsonValue(record.value) as JsonValue | undefined
  if (record.value !== undefined && snapshot === undefined) throw new Error('MVU operation value must be JSON-compatible')
  return { op: record.op, ...(record.path === undefined ? {} : { path: record.path }), ...(record.from === undefined ? {} : { from: record.from }), ...(record.to === undefined ? {} : { to: record.to }), ...(snapshot === undefined ? {} : { value: snapshot }) }
}

function patchArrays(text: string): JsonPatchOperation[][] {
  const blocks = [...text.matchAll(/<UpdateVariable(?:variable)?>\s*([\s\S]*?)\s*<\/UpdateVariable(?:variable)?>/giu)]
  return blocks.map(match => {
    const body = match[1] ?? ''
    const encoded = body.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/iu)?.[1]
    if (encoded === undefined) throw new Error('UpdateVariable is missing JSONPatch')
    const parsed: unknown = JSON.parse(encoded)
    if (!Array.isArray(parsed)) throw new Error('MVU JSONPatch must be an array')
    return parsed.map(operation)
  })
}

/** Apply every complete `<UpdateVariable>` JSON Patch block atomically. */
export function applyMvuReply(
  current: JsonValue,
  text: string,
): { readonly statData: JsonValue; readonly appliedOperations: number } | undefined {
  if (!/<UpdateVariable(?:variable)?>/iu.test(text)) return undefined
  const batches = patchArrays(text)
  const cloned = snapshotJsonValue(current) as JsonValue | undefined
  if (cloned === undefined) throw new Error('Current MVU state is not JSON-compatible')
  let count = 0
  for (const batch of batches) {
    for (const item of batch) {
      const path = item.path
      if (item.op === 'move') {
        const from = item.from
        const to = item.to ?? path
        if (from === undefined || to === undefined) throw new Error('MVU move requires from and to')
        insertAt(cloned, to, removeAt(cloned, from))
      } else if (item.op === 'remove') {
        if (path === undefined) throw new Error('MVU remove requires path')
        removeAt(cloned, path)
      } else if (item.op === 'insert') {
        if (path === undefined || item.value === undefined) throw new Error('MVU insert requires path and value')
        insertAt(cloned, path, item.value)
      } else if (item.op === 'replace') {
        if (path === undefined || item.value === undefined) throw new Error('MVU replace requires path and value')
        replaceAt(cloned, path, item.value)
      } else {
        if (path === undefined || typeof item.value !== 'number') throw new Error('MVU delta requires path and numeric value')
        const before = readAt(cloned, path)
        if (typeof before !== 'number') throw new Error(`MVU delta path is not numeric: ${path}`)
        replaceAt(cloned, path, before + item.value)
      }
      count += 1
    }
  }
  return { statData: cloned, appliedOperations: count }
}

/** Collect the inert card-authored rules needed by a dedicated MVU update call. */
export function renderMvuUpdateInstructions(
  card: ImportedCharacterCard,
  statData: JsonValue,
): string | undefined {
  const entries = card.lorebook?.entries.filter(entry => entry.enabled
    && !entry.hasDecorators
    && !/<%[\s\S]*?%>/u.test(entry.content)
    && /(?:变量更新规则|变量输出格式|<UpdateVariable>)/iu.test(entry.content)) ?? []
  if (entries.length === 0) return undefined
  return entries
    .sort((left, right) => left.insertionOrder - right.insertionOrder)
    .map(entry => substituteMvuMacros(entry.content, statData))
    .join('\n\n')
}

/** Normalize a narrow model response to one complete, valid MVU block. */
export function normalizeMvuSupplement(current: JsonValue, raw: string): string | undefined {
  const fenced = raw.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const complete = fenced.match(/<UpdateVariable(?:variable)?>[\s\S]*?<\/UpdateVariable(?:variable)>/iu)?.[0]
  const jsonPatch = fenced.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/iu)?.[1]
  let candidate = complete
  if (candidate === undefined && jsonPatch !== undefined) {
    candidate = `<UpdateVariable>\n<Analysis>Dedicated MVU state update.</Analysis>\n<JSONPatch>\n${jsonPatch}\n</JSONPatch>\n</UpdateVariable>`
  }
  if (candidate === undefined) {
    try {
      const parsed: unknown = JSON.parse(fenced)
      if (Array.isArray(parsed)) {
        candidate = `<UpdateVariable>\n<Analysis>Dedicated MVU state update.</Analysis>\n<JSONPatch>\n${JSON.stringify(parsed)}\n</JSONPatch>\n</UpdateVariable>`
      } else if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>
        const patch = record.json_patch ?? record.JSONPatch
        if (Array.isArray(patch)) {
          const analysis = typeof record.analysis === 'string' ? record.analysis : 'Dedicated MVU state update.'
          candidate = `<UpdateVariable>\n<Analysis>${analysis}</Analysis>\n<JSONPatch>\n${JSON.stringify(patch)}\n</JSONPatch>\n</UpdateVariable>`
        }
      }
    } catch {
      return undefined
    }
  }
  if (candidate === undefined) return undefined
  try {
    return applyMvuReply(current, candidate) === undefined ? undefined : candidate
  } catch {
    return undefined
  }
}

/** Replace the two MVU state macros used by compatible lorebook entries. */
export function substituteMvuMacros(text: string, statData: JsonValue | undefined): string {
  if (statData === undefined) return text
  const yaml = stringifyYaml(statData, { lineWidth: 0 }).trimEnd()
  const json = JSON.stringify(statData)
  return text
    .replace(/\{\{format_message_variable::stat_data\}\}/giu, yaml)
    .replace(/\{\{get_message_variable::stat_data\}\}/giu, json)
}
