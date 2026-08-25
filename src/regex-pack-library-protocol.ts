/** Browser-safe values for the standalone regex-pack library. */

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const REGEX_PACK_LIBRARY_PATH = '/api/agent-rp/regex-packs'

/** Maximum standalone file size accepted by browser migration and the Host. */
export const MAX_REGEX_PACK_BYTES = 2 * 1024 * 1024

/** Compact reusable pack shown before a roleplay Session exists. */
export interface RegexPackLibrarySummary {
  readonly id: string
  readonly name: string
  readonly scriptCount: number
  readonly enabledCount: number
  readonly displayCount: number
  readonly promptCount: number
  readonly updatedAt: number
}

/** Reusable regex packs available to the resource center and launch composer. */
export interface RegexPackLibraryListResponse {
  readonly format: 0
  readonly entries: readonly RegexPackLibrarySummary[]
}

/** Minimum result returned after importing one pack. */
export interface RegexPackLibraryImportResponse {
  readonly format: 0
  readonly entry: RegexPackLibrarySummary
}

/** Confirmation returned after removing one reusable pack. */
export interface RegexPackLibraryDeleteResponse {
  readonly format: 0
  readonly id: string
}
