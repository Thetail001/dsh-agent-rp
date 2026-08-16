/** Pure permission-key helpers for card-scoped Tavern Helper resources. */

import type { TavernPreflightScriptApproval } from '../tavern-preflight-protocol.ts'
import { readApprovalSet, writeApprovalSet } from './approval-storage.ts'

const tavernScriptOriginsKey = 'dsh.agent-rp.tavern-script-origin-approvals-v1'
const tavernScriptImageApprovalsKey = 'dsh.agent-rp.tavern-script-image-approvals-v1'
const tavernScriptFrameApprovalsKey = 'dsh.agent-rp.tavern-script-frame-approvals-v1'
const tavernScriptGenerationApprovalsKey = 'dsh.agent-rp.tavern-script-generation-approvals'
const tavernScriptCustomGenerationApprovalsKey = 'dsh.agent-rp.tavern-script-custom-generation-approvals'
const tavernScriptModelApprovalsKey = 'dsh.agent-rp.tavern-script-model-approvals'

/** Script-tree namespace that owns one isolated Tavern Helper script. */
export type TavernPermissionScope = 'global' | 'preset' | 'character'

/** Whether a future Session can start without bypassing its resource preflight. */
export type TavernPreflightLaunchPhase = 'checking' | 'approval-required' | 'ready'

/** Keep launch behind preflight discovery and explicit resource approval. */
export function tavernPreflightLaunchPhase(input: {
  readonly expected: boolean
  readonly loading: boolean
  readonly settled: boolean
  readonly pendingPermissions: number
}): TavernPreflightLaunchPhase {
  if (!input.expected) return 'ready'
  if (input.loading || !input.settled) return 'checking'
  return input.pendingPermissions > 0 ? 'approval-required' : 'ready'
}

/** Normalize one exact HTTPS origin without accepting paths or credentials. */
export function normalizedTavernScriptOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value ? url.origin : undefined
  } catch {
    return undefined
  }
}

/** Normalize the HTTP(S) API origin used by one model request. */
export function normalizedTavernModelOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
  } catch {
    return undefined
  }
}

/** Read exact remote-module approvals from browser storage. */
export function readApprovedTavernScriptOrigins(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptOriginsKey, 4_096)
}

/** Persist exact remote-module approvals. */
export function writeApprovedTavernScriptOrigins(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptOriginsKey, approvals)
}

/** Read approved image origins from browser storage. */
export function readApprovedTavernScriptImages(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptImageApprovalsKey, 3_072)
}

/** Persist approved image origins. */
export function writeApprovedTavernScriptImages(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptImageApprovalsKey, approvals)
}

/** Read approved nested-frame origins from browser storage. */
export function readApprovedTavernScriptFrames(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptFrameApprovalsKey, 3_072)
}

/** Persist approved nested-frame origins. */
export function writeApprovedTavernScriptFrames(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptFrameApprovalsKey, approvals)
}

/** Read approved standard generation callers from browser storage. */
export function readApprovedTavernScriptGenerations(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptGenerationApprovalsKey, 1_024)
}

/** Persist approved standard generation callers. */
export function writeApprovedTavernScriptGenerations(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptGenerationApprovalsKey, approvals)
}

/** Read approved custom generation origins from browser storage. */
export function readApprovedTavernScriptCustomGenerations(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptCustomGenerationApprovalsKey, 3_072)
}

/** Persist approved custom generation origins. */
export function writeApprovedTavernScriptCustomGenerations(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptCustomGenerationApprovalsKey, approvals)
}

/** Read approved model-list origins from browser storage. */
export function readApprovedTavernScriptModels(): ReadonlySet<string> {
  return readApprovalSet(localStorage, tavernScriptModelApprovalsKey, 3_072)
}

/** Persist approved model-list origins. */
export function writeApprovedTavernScriptModels(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, tavernScriptModelApprovalsKey, approvals)
}

/** Serialize one remote module grant without allowing another card, preset, or script to inherit it. */
export function tavernScriptOriginApprovalKey(
  characterId: string,
  presetId: string | undefined,
  scope: TavernPermissionScope,
  scriptId: string,
  origin: string,
): string {
  return JSON.stringify([characterId, presetId ?? null, scope, scriptId, origin])
}

/** Parse one current-version remote module grant; legacy global-origin records remain inert. */
export function parseTavernScriptOriginApprovalKey(value: string): {
  readonly characterId: string
  readonly presetId?: string
  readonly scope: TavernPermissionScope
  readonly scriptId: string
  readonly origin: string
} | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed) || parsed.length !== 5 || typeof parsed[0] !== 'string'
    || (parsed[1] !== null && typeof parsed[1] !== 'string')
    || (parsed[2] !== 'global' && parsed[2] !== 'preset' && parsed[2] !== 'character')
    || typeof parsed[3] !== 'string') return undefined
  const origin = normalizedTavernScriptOrigin(parsed[4])
  if (origin === undefined) return undefined
  return {
    characterId: parsed[0],
    ...(parsed[1] === null ? {} : { presetId: parsed[1] }),
    scope: parsed[2],
    scriptId: parsed[3],
    origin,
  }
}

/** Select exact module origins granted to one future or active script. */
export function approvedTavernScriptOrigins(
  approvals: ReadonlySet<string>,
  characterId: string,
  presetId: string | undefined,
  scope: TavernPermissionScope,
  scriptId: string,
): readonly string[] {
  const origins: string[] = []
  for (const approval of approvals) {
    const value = parseTavernScriptOriginApprovalKey(approval)
    if (value?.characterId === characterId && value.presetId === presetId
      && value.scope === scope && value.scriptId === scriptId) origins.push(value.origin)
  }
  return [...new Set(origins)].sort()
}

/** Group stored module grants into the bounded preflight request representation. */
export function tavernPreflightApprovals(
  approvals: ReadonlySet<string>,
  characterId: string,
  presetId: string | undefined,
): readonly TavernPreflightScriptApproval[] {
  const grouped = new Map<string, { readonly scope: 'character' | 'preset'; readonly scriptId: string; origins: Set<string> }>()
  for (const approval of approvals) {
    const value = parseTavernScriptOriginApprovalKey(approval)
    if (value === undefined || value.characterId !== characterId || value.presetId !== presetId
      || value.scope === 'global') continue
    const key = JSON.stringify([value.scope, value.scriptId])
    const entry = grouped.get(key) ?? { scope: value.scope, scriptId: value.scriptId, origins: new Set<string>() }
    entry.origins.add(value.origin)
    grouped.set(key, entry)
  }
  return [...grouped.values()].map(entry => ({
    scope: entry.scope,
    scriptId: entry.scriptId,
    origins: [...entry.origins].sort(),
  }))
}

/** Serialize one remote image grant with the same ownership fields as module grants. */
export function tavernScriptImageApprovalKey(
  characterId: string,
  presetId: string | undefined,
  scope: TavernPermissionScope,
  scriptId: string,
  origin: string,
): string {
  return JSON.stringify([characterId, presetId ?? null, scope, scriptId, origin])
}

/** Serialize one nested-frame grant without allowing an image grant to activate executable content. */
export function tavernScriptFrameApprovalKey(
  characterId: string,
  presetId: string | undefined,
  scope: TavernPermissionScope,
  scriptId: string,
  origin: string,
): string {
  return JSON.stringify([characterId, presetId ?? null, scope, scriptId, origin])
}
