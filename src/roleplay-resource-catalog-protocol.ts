/** Browser-safe resource discovery values for the native Roleplay runtime. */

/** Same-origin read-only resource directory endpoint. */
export const ROLEPLAY_RESOURCE_CATALOG_PATH = '/api/agent-rp/resources'

/** Reusable resource categories that can be selected independently for an experience. */
export const ROLEPLAY_RESOURCE_KINDS = ['actor', 'persona', 'world', 'prompt-policy'] as const

export type RoleplayResourceKind = typeof ROLEPLAY_RESOURCE_KINDS[number]

/** Stable reference and presentation metadata without source-format payloads. */
export interface RoleplayResourceDescriptor {
  readonly id: string
  readonly kind: RoleplayResourceKind
  readonly name: string
  readonly availability: 'available' | 'archived'
  readonly updatedAt?: number
}

/** Content-free snapshot returned to the local Roleplay UI. */
export interface RoleplayResourceCatalogResponse {
  readonly format: 0
  readonly entries: readonly RoleplayResourceDescriptor[]
}
