/** Session-owned Tavern Helper variable compatibility. */

import { snapshotJsonValue, type JsonValue, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterFrontend, ImportedTavernHelperScript } from './import/types.ts'

/** Tavern Helper variable namespaces supported by the isolated runtime. */
export type TavernVariableScope = 'global' | 'preset' | 'character' | 'chat' | 'message' | 'script'

type JsonRecord = Readonly<Record<string, JsonValue>>

/** JSON-safe Tavern Helper worldbook entry retained in one roleplay Session. */
export interface TavernWorldbookEntry {
  readonly uid: number
  readonly name: string
  readonly enabled: boolean
  readonly strategy: {
    readonly type: 'constant' | 'selective' | 'vectorized'
    readonly keys: readonly string[]
    readonly keys_secondary: {
      readonly logic: 'and_any' | 'and_all' | 'not_all' | 'not_any'
      readonly keys: readonly string[]
    }
    readonly scan_depth: 'same_as_global' | number
  }
  readonly position: {
    readonly type: 'before_character_definition' | 'after_character_definition' | 'before_example_messages'
      | 'after_example_messages' | 'before_author_note' | 'after_author_note' | 'at_depth' | 'outlet'
    readonly role: 'system' | 'assistant' | 'user'
    readonly depth: number
    readonly order: number
  }
  readonly content: string
  readonly probability: number
  readonly recursion: {
    readonly prevent_incoming: boolean
    readonly prevent_outgoing: boolean
    readonly delay_until: number | null
  }
  readonly effect: {
    readonly sticky: number | null
    readonly cooldown: number | null
    readonly delay: number | null
  }
  readonly extra?: JsonRecord
  readonly ignoreBudget?: boolean
}

/** Explicit Tavern Helper worldbook selections; omitted fields retain imported defaults. */
export interface TavernWorldbookBindings {
  readonly global?: readonly string[]
  readonly character?: { readonly primary: string | null; readonly additional: readonly string[] }
  readonly chat?: string | null
}

/** Complete durable state written by one Tavern Helper variable mutation. */
export interface TavernHelperState {
  readonly format: 0
  readonly characterSourceId: string
  readonly presetSourceId?: string
  readonly presetScriptIds?: readonly string[]
  readonly revision: number
  readonly scopes: {
    readonly global: JsonRecord
    readonly preset: JsonRecord
    readonly character: JsonRecord
    readonly chat: JsonRecord
    readonly message: JsonRecord
  }
  readonly scripts: Readonly<Record<string, JsonRecord>>
  /** Script-authored books and full replacements of imported books, keyed by visible name. */
  readonly worldbooks?: Readonly<Record<string, readonly TavernWorldbookEntry[]>>
  /** Names deleted by scripts, including immutable imported books hidden by a tombstone. */
  readonly deletedWorldbookNames?: readonly string[]
  readonly worldbookBindings?: TavernWorldbookBindings
  readonly lastMutation?: {
    readonly scope: TavernVariableScope | 'worldbook'
    readonly scriptId?: string
  }
}

/** Browser request replacing one Tavern Helper variable namespace. */
export interface TavernHelperVariableMutationRequest {
  readonly format: 0
  readonly scope: TavernVariableScope
  readonly scriptId?: string
  readonly variables: JsonRecord
}

/** Browser request changing one script-visible worldbook or its current bindings. */
export type TavernWorldbookMutationRequest =
  | { readonly format: 0; readonly operation: 'replace-worldbook'; readonly name: string; readonly entries: readonly TavernWorldbookEntry[] }
  | { readonly format: 0; readonly operation: 'delete-worldbook'; readonly name: string }
  | { readonly format: 0; readonly operation: 'bind-global-worldbooks'; readonly names: readonly string[] }
  | { readonly format: 0; readonly operation: 'bind-character-worldbooks'; readonly primary: string | null; readonly additional: readonly string[] }
  | { readonly format: 0; readonly operation: 'bind-chat-worldbook'; readonly name: string | null }

/** One validated mutation sent by an isolated Tavern Helper script. */
export type TavernHelperMutationRequest = TavernHelperVariableMutationRequest | TavernWorldbookMutationRequest

const STATE_PREFIX = 'agent-rp-tavern-helper-v0:'
const MAX_MUTATION_BYTES = 2 * 1024 * 1024
const MAX_WORLDBOOK_ENTRIES = 10_000

function record(value: unknown, name: string): JsonRecord {
  const snapshot = snapshotJsonValue(value) as JsonValue | undefined
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) {
    throw new Error(`${name} must be a JSON object`)
  }
  return snapshot
}

function text(value: unknown, label: string, fallback = ''): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value
}

function finite(value: unknown, label: string, fallback: number): number {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`)
  return value
}

function nullablePositive(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null
  const number = finite(value, label, 0)
  return number > 0 ? number : null
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} must be a string array`)
  return [...new Set(value)] as string[]
}

function worldbookName(value: unknown): string {
  const name = text(value, 'Tavern Helper worldbook name').trim()
  if (name === '' || name.length > 512) throw new Error('Tavern Helper worldbook name is invalid')
  return name
}

function nested(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function worldbookEntry(value: unknown, index: number, used: Set<number>): TavernWorldbookEntry {
  const entry = nested(value)
  let uid = entry.uid === undefined ? index : finite(entry.uid, `worldbook[${index}].uid`, index)
  if (!Number.isSafeInteger(uid) || uid < 0 || uid >= 1_000_000) uid = index % 1_000_000
  while (used.has(uid)) uid = (uid + 1) % 1_000_000
  used.add(uid)
  const strategy = nested(entry.strategy)
  const secondary = nested(strategy.keys_secondary)
  const strategyType = strategy.type === 'selective' || strategy.type === 'vectorized' ? strategy.type : 'constant'
  const secondaryLogic = secondary.logic === 'and_all' || secondary.logic === 'not_all' || secondary.logic === 'not_any'
    ? secondary.logic : 'and_any'
  const scanDepth = strategy.scan_depth === 'same_as_global' || strategy.scan_depth === undefined
    ? 'same_as_global' as const : Math.max(0, finite(strategy.scan_depth, `worldbook[${index}].strategy.scan_depth`, 0))
  const position = nested(entry.position)
  const positionTypes = new Set([
    'before_character_definition', 'after_character_definition', 'before_example_messages', 'after_example_messages',
    'before_author_note', 'after_author_note', 'at_depth', 'outlet',
  ])
  const positionType = typeof position.type === 'string' && positionTypes.has(position.type)
    ? position.type as TavernWorldbookEntry['position']['type'] : 'at_depth'
  const role = position.role === 'assistant' || position.role === 'user' ? position.role : 'system'
  const recursion = nested(entry.recursion)
  const effect = nested(entry.effect)
  const extra = entry.extra === undefined ? undefined : record(entry.extra, `worldbook[${index}].extra`)
  return {
    uid,
    name: text(entry.name, `worldbook[${index}].name`),
    enabled: entry.enabled !== false,
    strategy: {
      type: strategyType,
      keys: stringArray(strategy.keys ?? [], `worldbook[${index}].strategy.keys`),
      keys_secondary: {
        logic: secondaryLogic,
        keys: stringArray(secondary.keys ?? [], `worldbook[${index}].strategy.keys_secondary.keys`),
      },
      scan_depth: scanDepth,
    },
    position: {
      type: positionType,
      role,
      depth: finite(position.depth, `worldbook[${index}].position.depth`, 4),
      order: finite(position.order, `worldbook[${index}].position.order`, 100),
    },
    content: text(entry.content, `worldbook[${index}].content`),
    probability: Math.min(100, Math.max(0, finite(entry.probability, `worldbook[${index}].probability`, 100))),
    recursion: {
      prevent_incoming: recursion.prevent_incoming === true,
      prevent_outgoing: recursion.prevent_outgoing === true,
      delay_until: nullablePositive(recursion.delay_until, `worldbook[${index}].recursion.delay_until`),
    },
    effect: {
      sticky: nullablePositive(effect.sticky, `worldbook[${index}].effect.sticky`),
      cooldown: nullablePositive(effect.cooldown, `worldbook[${index}].effect.cooldown`),
      delay: nullablePositive(effect.delay, `worldbook[${index}].effect.delay`),
    },
    ...(extra === undefined ? {} : { extra }),
    ...(entry.ignoreBudget === true ? { ignoreBudget: true } : {}),
  }
}

function worldbookEntries(value: unknown): readonly TavernWorldbookEntry[] {
  if (!Array.isArray(value) || value.length > MAX_WORLDBOOK_ENTRIES) throw new Error('Tavern Helper worldbook entries are invalid')
  const used = new Set<number>()
  return value.map((entry, index) => worldbookEntry(entry, index, used))
}

/** Create the script state for one active card while retaining Session-wide namespaces. */
export function initializeTavernHelperState(
  frontend: ImportedCharacterFrontend,
  characterSourceId: string,
  previous?: TavernHelperState,
): TavernHelperState {
  const sameCharacter = previous?.characterSourceId === characterSourceId
  const presetScripts = Object.fromEntries((previous?.presetScriptIds ?? []).flatMap(id => {
    const value = previous?.scripts[id]
    return value === undefined ? [] : [[id, value]]
  }))
  return {
    format: 0,
    characterSourceId,
    ...(previous?.presetSourceId === undefined ? {} : { presetSourceId: previous.presetSourceId }),
    ...(previous?.presetScriptIds === undefined ? {} : { presetScriptIds: previous.presetScriptIds }),
    revision: sameCharacter ? previous.revision : 0,
    scopes: {
      global: previous?.scopes.global ?? {},
      preset: previous?.scopes.preset ?? {},
      character: sameCharacter ? previous.scopes.character : frontend.tavernHelperVariables,
      chat: previous?.scopes.chat ?? {},
      message: sameCharacter ? previous.scopes.message : {},
    },
    scripts: {
      ...presetScripts,
      ...Object.fromEntries(frontend.tavernHelperScripts.map(script => [
        script.id,
        sameCharacter ? previous?.scripts[script.id] ?? script.data : script.data,
      ])),
    },
    ...(previous?.worldbooks === undefined ? {} : { worldbooks: previous.worldbooks }),
    ...(previous?.deletedWorldbookNames === undefined ? {} : { deletedWorldbookNames: previous.deletedWorldbookNames }),
    ...(previous?.worldbookBindings === undefined ? {} : { worldbookBindings: previous.worldbookBindings }),
  }
}

/** Activate one preset's variables and scripts without resetting character or chat state. */
export function initializeTavernHelperPresetState(
  state: TavernHelperState,
  scripts: readonly ImportedTavernHelperScript[],
  variables: JsonRecord,
  presetSourceId: string,
): TavernHelperState {
  const samePreset = state.presetSourceId === presetSourceId
  const previousPresetIds = new Set(state.presetScriptIds ?? [])
  const characterScripts = Object.fromEntries(Object.entries(state.scripts)
    .filter(([id]) => !previousPresetIds.has(id)))
  return {
    ...state,
    presetSourceId,
    presetScriptIds: scripts.map(script => script.id),
    scopes: { ...state.scopes, preset: samePreset ? state.scopes.preset : variables },
    scripts: {
      ...characterScripts,
      ...Object.fromEntries(scripts.map(script => [
        script.id,
        samePreset ? state.scripts[script.id] ?? script.data : script.data,
      ])),
    },
  }
}

/** Parse one browser-authored variable replacement. */
export function parseTavernHelperMutationRequest(raw: string): TavernHelperMutationRequest {
  if (new TextEncoder().encode(raw).byteLength > MAX_MUTATION_BYTES) throw new Error('Tavern Helper update is too large')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error('Tavern Helper variable update is not valid JSON', { cause: error })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Tavern Helper variable update must be an object')
  }
  const value = parsed as Record<string, unknown>
  if (value.format === 0 && value.operation === 'replace-worldbook') {
    return { format: 0, operation: value.operation, name: worldbookName(value.name), entries: worldbookEntries(value.entries) }
  }
  if (value.format === 0 && value.operation === 'delete-worldbook') {
    return { format: 0, operation: value.operation, name: worldbookName(value.name) }
  }
  if (value.format === 0 && value.operation === 'bind-global-worldbooks') {
    return { format: 0, operation: value.operation, names: stringArray(value.names, 'global worldbook names').map(worldbookName) }
  }
  if (value.format === 0 && value.operation === 'bind-character-worldbooks') {
    const primary = value.primary === null ? null : worldbookName(value.primary)
    return {
      format: 0,
      operation: value.operation,
      primary,
      additional: stringArray(value.additional, 'additional character worldbook names').map(worldbookName),
    }
  }
  if (value.format === 0 && value.operation === 'bind-chat-worldbook') {
    return { format: 0, operation: value.operation, name: value.name === null ? null : worldbookName(value.name) }
  }
  if (value.format !== 0 || (value.scope !== 'global' && value.scope !== 'preset'
    && value.scope !== 'character' && value.scope !== 'chat' && value.scope !== 'message'
    && value.scope !== 'script')) {
    throw new Error('Tavern Helper variable update has an unsupported scope')
  }
  if (value.scriptId !== undefined && typeof value.scriptId !== 'string') {
    throw new Error('Tavern Helper scriptId must be a string')
  }
  return {
    format: 0,
    scope: value.scope,
    ...(value.scriptId === undefined ? {} : { scriptId: value.scriptId }),
    variables: record(value.variables, 'Tavern Helper variables'),
  }
}

/** Apply one validated namespace replacement. */
export function applyTavernHelperMutation(
  state: TavernHelperState,
  request: TavernHelperMutationRequest,
): TavernHelperState {
  if ('operation' in request) {
    if (request.operation === 'replace-worldbook') {
      const deleted = new Set(state.deletedWorldbookNames ?? [])
      deleted.delete(request.name)
      return {
        ...state,
        revision: state.revision + 1,
        worldbooks: { ...state.worldbooks, [request.name]: request.entries },
        deletedWorldbookNames: [...deleted],
        lastMutation: { scope: 'worldbook' },
      }
    }
    if (request.operation === 'delete-worldbook') {
      const worldbooks = Object.fromEntries(Object.entries(state.worldbooks ?? {}).filter(([name]) => name !== request.name))
      return {
        ...state,
        revision: state.revision + 1,
        worldbooks,
        deletedWorldbookNames: [...new Set([...(state.deletedWorldbookNames ?? []), request.name])],
        lastMutation: { scope: 'worldbook' },
      }
    }
    const bindings = state.worldbookBindings ?? {}
    const worldbookBindings: TavernWorldbookBindings = request.operation === 'bind-global-worldbooks'
      ? { ...bindings, global: request.names }
      : request.operation === 'bind-character-worldbooks'
        ? { ...bindings, character: { primary: request.primary, additional: request.additional } }
        : { ...bindings, chat: request.name }
    return { ...state, revision: state.revision + 1, worldbookBindings, lastMutation: { scope: 'worldbook' } }
  }
  if (request.scope === 'script') {
    const scriptId = request.scriptId
    if (scriptId === undefined || !(scriptId in state.scripts)) {
      throw new Error('Tavern Helper script variable update has an unknown scriptId')
    }
    return {
      ...state,
      revision: state.revision + 1,
      scripts: { ...state.scripts, [scriptId]: request.variables },
      lastMutation: { scope: 'script', scriptId },
    }
  }
  return {
    ...state,
    revision: state.revision + 1,
    scopes: { ...state.scopes, [request.scope]: request.variables },
    lastMutation: { scope: request.scope },
  }
}

/** Serialize one state snapshot into a private command result. */
export function encodeTavernHelperState(state: TavernHelperState): string {
  return `${STATE_PREFIX}${JSON.stringify(state)}`
}

/** Decode a Tavern Helper state from an unrelated-or-matching command result. */
export function decodeTavernHelperState(text: string | undefined): TavernHelperState | undefined {
  if (text === undefined || !text.startsWith(STATE_PREFIX)) return undefined
  const parsed = JSON.parse(text.slice(STATE_PREFIX.length)) as Record<string, unknown>
  if (parsed.format !== 0 || typeof parsed.characterSourceId !== 'string'
    || typeof parsed.revision !== 'number' || !Number.isSafeInteger(parsed.revision) || parsed.revision < 0) {
    throw new Error('Tavern Helper state header is invalid')
  }
  const scopes = record(parsed.scopes, 'Tavern Helper scopes') as Record<string, JsonValue>
  const scripts = record(parsed.scripts, 'Tavern Helper scripts')
  const required = ['global', 'preset', 'character', 'chat', 'message'] as const
  const parsedScopes = Object.fromEntries(required.map(key => [
    key,
    record(scopes[key], `Tavern Helper ${key} variables`),
  ])) as TavernHelperState['scopes']
  const parsedScripts = Object.fromEntries(Object.entries(scripts).map(([id, value]) => [
    id,
    record(value, `Tavern Helper script ${id} variables`),
  ]))
  const parsedWorldbooks = parsed.worldbooks === undefined
    ? undefined
    : Object.fromEntries(Object.entries(record(parsed.worldbooks, 'Tavern Helper worldbooks'))
      .map(([name, entries]) => [worldbookName(name), worldbookEntries(entries)]))
  const deletedWorldbookNames = parsed.deletedWorldbookNames === undefined
    ? undefined : stringArray(parsed.deletedWorldbookNames, 'Tavern Helper deleted worldbook names').map(worldbookName)
  let worldbookBindings: TavernWorldbookBindings | undefined
  if (parsed.worldbookBindings !== undefined) {
    const bindings = record(parsed.worldbookBindings, 'Tavern Helper worldbook bindings') as Record<string, JsonValue>
    const global = bindings.global === undefined ? undefined : stringArray(bindings.global, 'global worldbook names').map(worldbookName)
    const chat = bindings.chat === undefined || bindings.chat === null ? bindings.chat : worldbookName(bindings.chat)
    const characterValue = bindings.character === undefined ? undefined : record(bindings.character, 'character worldbook bindings')
    const primary = characterValue?.primary === undefined || characterValue.primary === null
      ? characterValue?.primary as undefined | null : worldbookName(characterValue.primary)
    const additional = characterValue === undefined
      ? undefined : stringArray(characterValue.additional, 'additional character worldbook names').map(worldbookName)
    worldbookBindings = {
      ...(global === undefined ? {} : { global }),
      ...(characterValue === undefined ? {} : { character: { primary: primary ?? null, additional: additional ?? [] } }),
      ...(chat === undefined ? {} : { chat }),
    }
  }
  if (parsed.presetSourceId !== undefined && typeof parsed.presetSourceId !== 'string') {
    throw new Error('Tavern Helper preset source is invalid')
  }
  if (parsed.presetScriptIds !== undefined && (!Array.isArray(parsed.presetScriptIds)
    || parsed.presetScriptIds.some(value => typeof value !== 'string'))) {
    throw new Error('Tavern Helper preset script ids are invalid')
  }
  const mutation = parsed.lastMutation
  let lastMutation: TavernHelperState['lastMutation']
  if (mutation !== undefined) {
    if (typeof mutation !== 'object' || mutation === null || Array.isArray(mutation)) {
      throw new Error('Tavern Helper last mutation is invalid')
    }
    const value = mutation as Record<string, unknown>
    if (value.scope !== 'global' && value.scope !== 'preset' && value.scope !== 'character'
      && value.scope !== 'chat' && value.scope !== 'message' && value.scope !== 'script' && value.scope !== 'worldbook') {
      throw new Error('Tavern Helper last mutation scope is invalid')
    }
    if (value.scriptId !== undefined && typeof value.scriptId !== 'string') {
      throw new Error('Tavern Helper last mutation scriptId is invalid')
    }
    lastMutation = { scope: value.scope, ...(value.scriptId === undefined ? {} : { scriptId: value.scriptId }) }
  }
  return {
    format: 0,
    characterSourceId: parsed.characterSourceId,
    ...(parsed.presetSourceId === undefined ? {} : { presetSourceId: parsed.presetSourceId }),
    ...(parsed.presetScriptIds === undefined ? {} : { presetScriptIds: parsed.presetScriptIds as string[] }),
    revision: parsed.revision,
    scopes: parsedScopes,
    scripts: parsedScripts,
    ...(parsedWorldbooks === undefined ? {} : { worldbooks: parsedWorldbooks }),
    ...(deletedWorldbookNames === undefined ? {} : { deletedWorldbookNames }),
    ...(worldbookBindings === undefined ? {} : { worldbookBindings }),
    ...(lastMutation === undefined ? {} : { lastMutation }),
  }
}

/** Fold the latest Tavern Helper state from private command results. */
export function readTavernHelperState(events: readonly SessionEvent[]): TavernHelperState | undefined {
  let state: TavernHelperState | undefined
  for (const event of events) {
    if (event.type !== 'command/done' || event.data.kind !== 'success') continue
    const decoded = decodeTavernHelperState(event.data.text)
    if (decoded !== undefined) state = decoded
  }
  return state
}
