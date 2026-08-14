/** Browser-safe values for model-free preset library access. */

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const PRESET_LIBRARY_PATH = '/api/agent-rp/presets'

/** Compact reusable preset shown before a roleplay Session exists. */
export interface PresetLibrarySummary {
  readonly id: string
  readonly name: string
  readonly promptCount: number
  readonly enabledCount: number
  readonly regexScriptCount: number
  readonly updatedAt: number
}

/** Reusable presets available to a new roleplay Session. */
export interface PresetLibraryListResponse {
  readonly format: 0
  readonly entries: readonly PresetLibrarySummary[]
}

/** Minimum result needed to activate a newly imported library preset. */
export interface PresetLibraryImportResponse {
  readonly format: 0
  readonly entry: { readonly id: string }
}
