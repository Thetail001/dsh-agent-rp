/** Browser-safe character-library values shared by the Host and Roleplay UI. */

import type { SessionPersonaSnapshot } from './persona-library-protocol.ts'

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const CHARACTER_LIBRARY_PATH = '/api/agent-rp/characters'

/** Visible collection selected in the local character library. */
export type CharacterLibraryCollection = 'active' | 'archived'

/** One inert embedded image exposed from a CHARX archive. */
export interface CharacterLibraryImage {
  /** Stable index in the Character Card V3 assets array. */
  readonly index: number
  readonly type: string
  readonly name: string
  readonly mediaType: string
  /** Original embedded URI retained for exact light-frontend substitution. */
  readonly sourceUri: string
}

/** One compact reusable Character Card shown in the library. */
export interface CharacterLibrarySummary {
  readonly id: string
  readonly name: string
  readonly displayName: string
  readonly originalFilename: string
  readonly cardVersion: 1 | 2 | 3
  readonly greetingCount: number
  readonly worldInfoCount: number
  readonly avatarAvailable: boolean
  readonly imageAssetCount: number
  readonly archived: boolean
  readonly transport: 'png' | 'json' | 'charx'
  readonly importedAt: number
  readonly updatedAt: number
}

/** Details loaded only after a user selects one library card. */
export interface CharacterLibraryDetail extends CharacterLibrarySummary {
  readonly mediaType: string
  readonly greetings: readonly string[]
  readonly imageAssets: readonly CharacterLibraryImage[]
}

/** Same-origin URL for one validated inert CHARX image. */
export function characterLibraryImageUrl(id: string, index: number): string {
  return `${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/images/${index}`
}

/** Explicit model-free request embedded beside one selected card attachment. */
export interface CharacterLibrarySessionRequest {
  readonly format: 0
  readonly greetingIndex: number
  readonly userName?: string
  readonly persona?: SessionPersonaSnapshot
}

/** Stable text prefix recognized by the Character Card Session importer. */
export const CHARACTER_LIBRARY_SESSION_PREFIX = '请从角色库开始新会话'

/** Serialize a library launch without exposing its controls to the model. */
export function encodeCharacterLibrarySessionRequest(request: CharacterLibrarySessionRequest): string {
  return `${CHARACTER_LIBRARY_SESSION_PREFIX}\n${JSON.stringify(request)}`
}
