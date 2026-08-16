/** Browser-safe protocol for preflighting static Tavern Helper resources before Session launch. */

/** Same-origin endpoint that inspects selected character and preset scripts without executing them. */
export const TAVERN_PREFLIGHT_PATH = '/api/agent-rp/tavern-preflight'

/** Script source selected for one future roleplay Session. */
export type TavernPreflightScope = 'character' | 'preset'

/** Previously approved HTTPS module origins for one selected script. */
export interface TavernPreflightScriptApproval {
  readonly scope: TavernPreflightScope
  readonly scriptId: string
  readonly origins: readonly string[]
}

/** Model-free request to inspect every enabled script selected for a future Session. */
export interface TavernPreflightRequest {
  readonly format: 0
  readonly characterId: string
  readonly presetId?: string
  readonly scriptApprovals: readonly TavernPreflightScriptApproval[]
}

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
