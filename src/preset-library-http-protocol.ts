/** Browser-safe values for model-free preset uploads. */

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const PRESET_LIBRARY_PATH = '/api/agent-rp/presets'

/** Minimum result needed to activate a newly imported library preset. */
export interface PresetLibraryImportResponse {
  readonly format: 0
  readonly entry: { readonly id: string }
}
