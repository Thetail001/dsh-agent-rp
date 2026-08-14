/** Session-owned Tavern Helper variable compatibility. */

import { snapshotJsonValue, type JsonValue, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterFrontend, ImportedTavernHelperScript } from './import/types.ts'

/** Tavern Helper variable namespaces supported by the isolated runtime. */
export type TavernVariableScope = 'global' | 'preset' | 'character' | 'chat' | 'message' | 'script'

type JsonRecord = Readonly<Record<string, JsonValue>>

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
  readonly lastMutation?: {
    readonly scope: TavernVariableScope
    readonly scriptId?: string
  }
}

/** Browser request replacing one Tavern Helper variable namespace. */
export interface TavernHelperMutationRequest {
  readonly format: 0
  readonly scope: TavernVariableScope
  readonly scriptId?: string
  readonly variables: JsonRecord
}

const STATE_PREFIX = 'agent-rp-tavern-helper-v0:'
const MAX_VARIABLE_BYTES = 512 * 1024

function record(value: unknown, name: string): JsonRecord {
  const snapshot = snapshotJsonValue(value) as JsonValue | undefined
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) {
    throw new Error(`${name} must be a JSON object`)
  }
  return snapshot
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
  if (new TextEncoder().encode(raw).byteLength > MAX_VARIABLE_BYTES) throw new Error('Tavern Helper variable update is too large')
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
      && value.scope !== 'chat' && value.scope !== 'message' && value.scope !== 'script') {
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
