/** Browser-safe protocol for preflighting static Tavern Helper resources before Session launch. */

import type { RoleplayResourceSelection } from './roleplay-resource-catalog-protocol.ts'

/** Same-origin endpoint that inspects selected launch resources without executing them. */
export const TAVERN_PREFLIGHT_PATH = '/api/agent-rp/tavern-preflight'

/** Same-origin endpoint that returns one Host-resolved execution plan. */
export const TAVERN_EXECUTION_PATH = '/api/agent-rp/tavern-execution'

/** Script source selected for one future roleplay Session. */
export type TavernPreflightScope = 'character' | 'preset'

/** Previously approved HTTPS module origins for one selected script. */
export interface TavernPreflightScriptApproval {
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly origins: readonly string[]
  readonly styleOrigins?: readonly string[]
}

/** Legacy model-free request retained for chat migration and older launch surfaces. */
export interface TavernLegacyPreflightRequest {
  readonly format: 0
  readonly characterId?: string
  readonly presetId?: string
  readonly scriptApprovals: readonly TavernPreflightScriptApproval[]
}

/** Source-neutral request to inspect the complete resource selection for one future experience. */
export interface TavernExperiencePreflightRequest {
  readonly format: 1
  readonly resources: readonly RoleplayResourceSelection[]
  readonly scriptApprovals: readonly TavernPreflightScriptApproval[]
}

/** Every supported model-free launch preflight request. */
export type TavernPreflightRequest = TavernLegacyPreflightRequest | TavernExperiencePreflightRequest

/** Stable static-resolution state for one enabled script. */
export type TavernPreflightStatus = 'ready' | 'permission-required' | 'resolution-error'

/** Script-specific resource plan containing no source code or prompt content. */
export interface TavernPreflightEntry {
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly scriptName: string
  readonly status: TavernPreflightStatus
  readonly requestedScriptOrigin?: string
  readonly remoteImageOrigins: readonly string[]
  readonly remoteStyleOrigins: readonly string[]
  readonly remoteFontOrigins: readonly string[]
  readonly remoteFrameOrigins: readonly string[]
}

/** Complete pre-launch resource plan for the selected character and preset. */
export interface TavernPreflightResult {
  readonly format: 0
  readonly scripts: number
  readonly ready: number
  readonly permissionRequired: number
  readonly failed: number
  readonly entries: readonly TavernPreflightEntry[]
}

/** Request one imported script without sending its source back through the browser. */
export interface TavernExecutionRequest {
  readonly format: 0
  readonly characterId?: string
  readonly presetId?: string
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly approvedOrigins: readonly string[]
  readonly approvedStyleOrigins?: readonly string[]
}

/** Host-resolved module graph instantiated only inside the isolated browser frame. */
export interface TavernExecutionResult {
  readonly format: 0
  readonly execution: import('./tavern-script-resolver.ts').TavernScriptExecution
}

/** One script identity requested from the successful preflight cache. */
export interface TavernExecutionBatchEntry {
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly approvedOrigins: readonly string[]
  readonly approvedStyleOrigins?: readonly string[]
}

/** Request several already-preflighted plans through one browser connection. */
export interface TavernExecutionBatchRequest {
  readonly format: 1
  readonly characterId?: string
  readonly presetId?: string
  readonly entries: readonly TavernExecutionBatchEntry[]
}

/** One cached plan retaining its scope and script identity. */
export interface TavernExecutionBatchResultEntry {
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly execution: import('./tavern-script-resolver.ts').TavernScriptExecution
}

/** Host-resolved plans returned together only after every exact cache key matches. */
export interface TavernExecutionBatchResult {
  readonly format: 1
  readonly entries: readonly TavernExecutionBatchResultEntry[]
}
