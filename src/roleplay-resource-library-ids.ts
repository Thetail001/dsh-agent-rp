/** Browser-safe stable references used by the current Tavern library adapters. */

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
