/** Character Card V1/V2/V3 JSON parser with lossless raw preservation. */

import { snapshotJsonValue, type JsonValue } from '@deepseek-ai/dsh-session'
import type {
  CharacterCardVersion,
  CharacterImportDegradation,
  ImportedCharacterCard,
  ImportedLorebook,
  ImportedLorebookEntry,
} from './types.ts'

/** Maximum decoded JSON accepted from one card transport. */
export const MAX_CHARACTER_CARD_JSON_BYTES = 2 * 1024 * 1024

type JsonObject = { [key: string]: JsonValue }

function object(value: JsonValue | undefined, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value
}

function requiredString(value: JsonValue | undefined, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`)
  return value
}

function optionalString(value: JsonValue | undefined, path: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, path)
}

function optionalBoolean(value: JsonValue | undefined, path: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`)
  return value
}

function optionalFiniteNumber(value: JsonValue | undefined, path: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`)
  return value
}

function stringArray(value: JsonValue | undefined, path: string, fallback: readonly string[] = []): string[] {
  if (value === undefined) return [...fallback]
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${path} must be an array of strings`)
  }
  return [...value] as string[]
}

function hasDecorator(content: string): boolean {
  return /(?:^|\n)@@@?[a-z_]+(?:\s|$)/imu.test(content)
}

function parseLorebookEntry(value: JsonValue, index: number, version: CharacterCardVersion): ImportedLorebookEntry {
  const path = `data.character_book.entries[${index}]`
  const entry = object(value, path)
  object(entry.extensions, `${path}.extensions`)
  const insertionOrder = optionalFiniteNumber(entry.insertion_order, `${path}.insertion_order`)
  if (insertionOrder === undefined) throw new Error(`${path}.insertion_order must be a finite number`)
  const enabled = optionalBoolean(entry.enabled, `${path}.enabled`)
  if (enabled === undefined) throw new Error(`${path}.enabled must be a boolean`)
  const priority = optionalFiniteNumber(entry.priority, `${path}.priority`)
  const useRegex = optionalBoolean(entry.use_regex, `${path}.use_regex`) ?? false
  if (version === 3 && entry.use_regex === undefined) throw new Error(`${path}.use_regex must be a boolean`)
  const position = optionalString(entry.position, `${path}.position`) ?? 'after_char'
  if (position !== 'before_char' && position !== 'after_char') {
    throw new Error(`${path}.position must be before_char or after_char`)
  }
  const content = requiredString(entry.content, `${path}.content`)
  return {
    keys: stringArray(entry.keys, `${path}.keys`),
    secondaryKeys: stringArray(entry.secondary_keys, `${path}.secondary_keys`),
    content,
    enabled,
    insertionOrder,
    selective: optionalBoolean(entry.selective, `${path}.selective`) ?? false,
    constant: optionalBoolean(entry.constant, `${path}.constant`) ?? false,
    caseSensitive: optionalBoolean(entry.case_sensitive, `${path}.case_sensitive`) ?? false,
    position,
    ...(priority === undefined ? {} : { priority }),
    useRegex,
    hasDecorators: hasDecorator(content),
  }
}

function parseLorebook(value: JsonValue | undefined, version: CharacterCardVersion): ImportedLorebook | undefined {
  if (value === undefined) return undefined
  const book = object(value, 'data.character_book')
  object(book.extensions, 'data.character_book.extensions')
  if (!Array.isArray(book.entries)) throw new Error('data.character_book.entries must be an array')
  const scanDepth = optionalFiniteNumber(book.scan_depth, 'data.character_book.scan_depth')
  const tokenBudget = optionalFiniteNumber(book.token_budget, 'data.character_book.token_budget')
  if (scanDepth !== undefined && scanDepth < 0) throw new Error('data.character_book.scan_depth must not be negative')
  if (tokenBudget !== undefined && tokenBudget < 0) throw new Error('data.character_book.token_budget must not be negative')
  const name = optionalString(book.name, 'data.character_book.name')
  return {
    ...(name === undefined ? {} : { name }),
    ...(scanDepth === undefined ? {} : { scanDepth }),
    ...(tokenBudget === undefined ? {} : { tokenBudget }),
    recursiveScanning: optionalBoolean(book.recursive_scanning, 'data.character_book.recursive_scanning') ?? false,
    entries: book.entries.map((entry, index) => parseLorebookEntry(entry, index, version)),
  }
}

function cardVersion(root: JsonObject): { version: CharacterCardVersion; specVersion: string; data: JsonObject } {
  if (root.spec === 'chara_card_v3') {
    const specVersion = requiredString(root.spec_version, 'spec_version')
    const numeric = Number.parseFloat(specVersion)
    if (!Number.isFinite(numeric) || numeric < 3) throw new Error('spec_version must identify Character Card V3')
    return { version: 3, specVersion, data: object(root.data, 'data') }
  }
  if (root.spec === 'chara_card_v2') {
    const specVersion = requiredString(root.spec_version, 'spec_version')
    if (specVersion !== '2.0') throw new Error('spec_version must be 2.0 for Character Card V2')
    return { version: 2, specVersion, data: object(root.data, 'data') }
  }
  if (root.spec !== undefined) throw new Error(`unsupported character card spec ${JSON.stringify(root.spec)}`)
  return { version: 1, specVersion: '1.0', data: root }
}

function validateVersionFields(data: JsonObject, version: CharacterCardVersion): void {
  if (version === 1) return
  for (const field of ['creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version'] as const) {
    requiredString(data[field], `data.${field}`)
  }
  stringArray(data.alternate_greetings, 'data.alternate_greetings')
  stringArray(data.tags, 'data.tags')
  object(data.extensions, 'data.extensions')
  if (version === 3) stringArray(data.group_only_greetings, 'data.group_only_greetings')
}

function degradationSet(
  data: JsonObject,
  version: CharacterCardVersion,
  specVersion: string,
  lorebook: ImportedLorebook | undefined,
): CharacterImportDegradation[] {
  const result = new Set<CharacterImportDegradation>()
  if (version === 3 && Number.parseFloat(specVersion) > 3) result.add('future-card-version')
  const assets = data.assets
  if (Array.isArray(assets) && assets.length > 0) {
    result.add('character-assets')
    if (assets.some(asset => typeof asset === 'object' && asset !== null && !Array.isArray(asset)
      && typeof asset.uri === 'string' && /^(?:https?:|data:)/iu.test(asset.uri))) {
      result.add('remote-assets')
    }
  }
  if ((stringArray(data.group_only_greetings, 'data.group_only_greetings')).length > 0) result.add('group-greetings')
  if (lorebook?.recursiveScanning === true) result.add('lorebook-recursion')
  if (lorebook?.entries.some(entry => entry.useRegex) === true) result.add('lorebook-regex')
  if (lorebook?.entries.some(entry => entry.hasDecorators) === true) result.add('lorebook-decorators')
  return [...result].sort()
}

/**
 * Parse one decoded Character Card JSON document.
 * @param json - UTF-8 JSON text from a JSON file or PNG metadata.
 * @returns a normalized runtime card plus its exact parsed JSON value.
 */
export function parseCharacterCardJson(json: string): ImportedCharacterCard {
  if (Buffer.byteLength(json, 'utf8') > MAX_CHARACTER_CARD_JSON_BYTES) {
    throw new Error(`character card JSON exceeds ${MAX_CHARACTER_CARD_JSON_BYTES} bytes`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    throw new Error('character card is not valid JSON', { cause: error })
  }
  const raw = snapshotJsonValue(parsed) as JsonValue | undefined
  if (raw === undefined) throw new Error('character card must contain lossless JSON')
  const root = object(raw, 'character card')
  const { version, specVersion, data } = cardVersion(root)
  validateVersionFields(data, version)
  const lorebook = parseLorebook(data.character_book, version)
  const nickname = optionalString(data.nickname, 'data.nickname')
  const alternateGreetings = stringArray(data.alternate_greetings, 'data.alternate_greetings')
  const systemPrompt = optionalString(data.system_prompt, 'data.system_prompt') ?? ''
  const postHistoryInstructions = optionalString(data.post_history_instructions, 'data.post_history_instructions') ?? ''
  return {
    format: 0,
    version,
    specVersion,
    name: requiredString(data.name, 'data.name'),
    ...(nickname === undefined ? {} : { nickname }),
    description: requiredString(data.description, 'data.description'),
    personality: requiredString(data.personality, 'data.personality'),
    scenario: requiredString(data.scenario, 'data.scenario'),
    firstMessage: requiredString(data.first_mes, 'data.first_mes'),
    messageExample: requiredString(data.mes_example, 'data.mes_example'),
    alternateGreetings,
    systemPrompt,
    postHistoryInstructions,
    ...(lorebook === undefined ? {} : { lorebook }),
    degradations: degradationSet(data, version, specVersion, lorebook),
    raw,
  }
}
