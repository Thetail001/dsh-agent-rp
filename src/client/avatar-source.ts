/** Browser-safe selection for a roleplay header avatar. */

/** Resolved avatar input without starting a network request. */
export type RoleplayAvatarSource =
  | { readonly kind: 'direct'; readonly url: string }
  | { readonly kind: 'attachment'; readonly id: string }
  | { readonly kind: 'library'; readonly id: string }
  | { readonly kind: 'fallback' }

/**
 * Select the usable avatar source while waiting for library metadata to prove
 * that the optional avatar endpoint exists.
 */
export function resolveRoleplayAvatarSource(input: {
  readonly imageUrl?: string
  readonly attachmentId?: string
  readonly libraryId?: string
  readonly libraryAvatarAvailable?: boolean
}): RoleplayAvatarSource {
  if (input.imageUrl !== undefined) return { kind: 'direct', url: input.imageUrl }
  if (input.libraryId !== undefined) {
    return input.libraryAvatarAvailable === true
      ? { kind: 'library', id: input.libraryId }
      : { kind: 'fallback' }
  }
  return input.attachmentId === undefined
    ? { kind: 'fallback' }
    : { kind: 'attachment', id: input.attachmentId }
}
