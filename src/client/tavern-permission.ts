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

/** Permission categories exposed by the isolated Tavern Helper runtime. */
export const TAVERN_PERMISSION_KINDS = [
  'script',
  'image',
  'frame',
  'identity',
  'external-window',
  'generation',
  'custom-generation',
  'model-list',
] as const

/** One permission category exposed by the isolated Tavern Helper runtime. */
export type TavernPermissionKind = typeof TAVERN_PERMISSION_KINDS[number]

/** Whether a request gates script startup or waits for an explicit interaction. */
export type TavernPermissionLifecycle = 'startup' | 'interaction'

/** Minimum fields shared by every pending Tavern Helper permission request. */
export interface TavernPermissionRequest {
  readonly kind: TavernPermissionKind
  readonly key: string
}

/** A pending request annotated with its authoritative lifecycle. */
export type PlannedTavernPermission<T extends TavernPermissionRequest = TavernPermissionRequest> = T & {
  readonly lifecycle: TavernPermissionLifecycle
}

/** Content-free counts derived from one exact permission plan. */
export interface TavernPermissionPlanSummary {
  readonly total: number
  readonly startup: number
  readonly interaction: number
  readonly counts: Readonly<Record<TavernPermissionKind, number>>
  readonly state: 'settled' | 'startup-blocked' | 'interaction-pending'
}

/** Resource kinds whose grants can be planned before script execution. */
export type TavernScriptResourcePermissionKind = 'script' | 'image' | 'frame'

/** Static resources declared by one scoped script. */
export interface TavernScriptResourcePlanEntry {
  readonly scope: TavernPermissionScope
  readonly scriptId: string
  readonly scriptOrigins?: readonly string[]
  readonly imageOrigins?: readonly string[]
  readonly frameOrigins?: readonly string[]
}

/** One exact resource grant still required by a preflight or active Session. */
export interface TavernScriptResourcePermission {
  readonly kind: TavernScriptResourcePermissionKind
  readonly scope: TavernPermissionScope
  readonly scriptId: string
  readonly origin: string
  readonly approvalKey: string
}

/** Resolve the stable library owner shared by preflight and an active Session. */
export function tavernPermissionOwnerId(
  libraryId: string | undefined,
  sourceId: string | undefined,
): string | undefined {
  if (libraryId !== undefined) return libraryId
  if (sourceId?.startsWith('library:') && sourceId.length > 'library:'.length) {
    return sourceId.slice('library:'.length)
  }
  return sourceId
}

/** Classify whether one permission can prevent a script from starting. */
export function tavernPermissionLifecycle(kind: TavernPermissionKind): TavernPermissionLifecycle {
  return kind === 'script' || kind === 'image' || kind === 'frame' ? 'startup' : 'interaction'
}

/** Deduplicate pending permissions and attach their lifecycle in deterministic order. */
export function tavernPermissionPlan<T extends TavernPermissionRequest>(
  requests: readonly T[],
): readonly PlannedTavernPermission<T>[] {
  const plan = new Map<string, PlannedTavernPermission<T>>()
  for (const request of requests) {
    const key = `${request.kind}\u0000${request.key}`
    if (!plan.has(key)) plan.set(key, { ...request, lifecycle: tavernPermissionLifecycle(request.kind) })
  }
  return [...plan.values()].sort((left, right) =>
    `${left.lifecycle === 'startup' ? '0' : '1'}\u0000${left.kind}\u0000${left.key}`
      .localeCompare(`${right.lifecycle === 'startup' ? '0' : '1'}\u0000${right.kind}\u0000${right.key}`))
}

/** Summarize one permission plan without exposing request keys or payloads. */
export function summarizeTavernPermissionPlan(
  permissions: readonly PlannedTavernPermission[],
): TavernPermissionPlanSummary {
  const counts: Record<TavernPermissionKind, number> = {
    script: 0,
    image: 0,
    frame: 0,
    identity: 0,
    'external-window': 0,
    generation: 0,
    'custom-generation': 0,
    'model-list': 0,
  }
  let startup = 0
  let interaction = 0
  for (const permission of permissions) {
    counts[permission.kind] += 1
    if (permission.lifecycle === 'startup') startup += 1
    else interaction += 1
  }
  return {
    total: permissions.length,
    startup,
    interaction,
    counts,
    state: startup > 0 ? 'startup-blocked' : interaction > 0 ? 'interaction-pending' : 'settled',
  }
}

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

/** Serialize a persistent interaction grant through the same stable Session owners. */
export function tavernScriptInteractionApprovalKey(
  characterId: string,
  presetId: string | undefined,
  kind: 'generation' | 'custom-generation' | 'model-list',
  scriptKey: string,
  origin?: string,
): string {
  return JSON.stringify([characterId, presetId ?? null, kind, scriptKey, origin ?? null])
}

/** Resolve pending script resources through the same keys before and after Session launch. */
export function pendingTavernScriptResourcePermissions(input: {
  readonly characterId: string
  readonly presetId?: string
  readonly entries: readonly TavernScriptResourcePlanEntry[]
  readonly approvedScripts: ReadonlySet<string>
  readonly approvedImages: ReadonlySet<string>
  readonly approvedFrames: ReadonlySet<string>
  readonly trustedScriptOrigins?: readonly string[]
}): readonly TavernScriptResourcePermission[] {
  const trustedScripts = new Set(input.trustedScriptOrigins ?? [])
  const permissions = new Map<string, TavernScriptResourcePermission>()
  const add = (
    entry: TavernScriptResourcePlanEntry,
    kind: TavernScriptResourcePermissionKind,
    origins: readonly string[],
    approvals: ReadonlySet<string>,
  ): void => {
    for (const origin of origins) {
      if (kind === 'script' && trustedScripts.has(origin)) continue
      const approvalKey = kind === 'script'
        ? tavernScriptOriginApprovalKey(input.characterId, input.presetId, entry.scope, entry.scriptId, origin)
        : kind === 'image'
          ? tavernScriptImageApprovalKey(input.characterId, input.presetId, entry.scope, entry.scriptId, origin)
          : tavernScriptFrameApprovalKey(input.characterId, input.presetId, entry.scope, entry.scriptId, origin)
      if (!approvals.has(approvalKey)) {
        permissions.set(`${kind}\u0000${approvalKey}`, {
          kind, scope: entry.scope, scriptId: entry.scriptId, origin, approvalKey,
        })
      }
    }
  }
  for (const entry of input.entries) {
    add(entry, 'script', entry.scriptOrigins ?? [], input.approvedScripts)
    add(entry, 'image', entry.imageOrigins ?? [], input.approvedImages)
    add(entry, 'frame', entry.frameOrigins ?? [], input.approvedFrames)
  }
  return [...permissions.values()].sort((left, right) =>
    `${left.kind}\u0000${left.approvalKey}`.localeCompare(`${right.kind}\u0000${right.approvalKey}`))
}
