/** Browser-safe stable references used by the current Tavern library adapters. */

/** Stable provider ownership ids shared by the built-in catalog and Host adapters. */
export const CHARACTER_LIBRARY_ROLEPLAY_PROVIDER_ID = 'agent-rp:character-library'
export const PRESET_LIBRARY_ROLEPLAY_PROVIDER_ID = 'agent-rp:preset-library'
export const PERSONA_LIBRARY_ROLEPLAY_PROVIDER_ID = 'agent-rp:persona-library'
export const WORLD_INFO_LIBRARY_ROLEPLAY_PROVIDER_ID = 'agent-rp:world-info-library'
export const REGEX_PACK_LIBRARY_ROLEPLAY_PROVIDER_ID = 'agent-rp:regex-pack-library'

/** Exact opaque actor reference written by a library-backed Character Session seed. */
export function characterLibraryRoleplayResourceId(libraryId: string): string {
  return `character:library:${libraryId}`
}

/** Exact opaque prompt-policy reference written by a library-backed preset seed. */
export function presetLibraryRoleplayResourceId(libraryId: string): string {
  return `preset:library:${libraryId}`
}

/** Exact opaque world reference written by a library-backed World Info seed. */
export function worldInfoLibraryRoleplayResourceId(libraryId: string): string {
  return `standalone:library:${libraryId}`
}

/** Exact opaque regex-pack reference written by one library-backed Session seed. */
export function regexPackLibraryRoleplayResourceId(libraryId: string): string {
  return `regex:library:${libraryId}`
}
