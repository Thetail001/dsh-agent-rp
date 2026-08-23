/** Browser-safe resource discovery values for the native Roleplay runtime. */

/** Same-origin read-only resource directory endpoint. */
export const ROLEPLAY_RESOURCE_CATALOG_PATH = '/api/agent-rp/resources'

/** Reusable resource categories that can be selected independently for an experience. */
export const ROLEPLAY_RESOURCE_KINDS = ['actor', 'persona', 'world', 'prompt-policy'] as const

export type RoleplayResourceKind = typeof ROLEPLAY_RESOURCE_KINDS[number]

/** Source-neutral identity used to select one exact reusable resource. */
export interface RoleplayResourceReference {
  readonly kind: RoleplayResourceKind
  readonly id: string
}

/** One reusable resource plus an optional provider-owned immutable variant. */
export interface RoleplayResourceSelection extends RoleplayResourceReference {
  readonly variant?: string
}

/** One selectable actor opening; preview is bounded presentation text, not the durable snapshot. */
export interface RoleplayActorOpeningDetail {
  readonly id: string
  readonly label: string
  readonly preview: string
  readonly truncated: boolean
}

export interface RoleplayActorResourceDetail {
  readonly kind: 'actor'
  readonly openings: readonly RoleplayActorOpeningDetail[]
}

export interface RoleplayPersonaResourceDetail {
  readonly kind: 'persona'
  readonly description: string
}

export interface RoleplayWorldResourceDetail {
  readonly kind: 'world'
  readonly entryCount: number
}

export interface RoleplayPromptPolicyResourceDetail {
  readonly kind: 'prompt-policy'
  readonly moduleCount: number
  readonly enabledModuleCount: number
}

/** Source-neutral, kind-specific information needed to configure one selection. */
export type RoleplayResourceDetail =
  | RoleplayActorResourceDetail
  | RoleplayPersonaResourceDetail
  | RoleplayWorldResourceDetail
  | RoleplayPromptPolicyResourceDetail

/** Stable reference and presentation metadata without source-format payloads. */
export interface RoleplayResourceDescriptor extends RoleplayResourceReference {
  readonly name: string
  readonly availability: 'available' | 'archived'
  readonly updatedAt?: number
}

/** Content-free snapshot returned to the local Roleplay UI. */
export interface RoleplayResourceCatalogResponse {
  readonly format: 0
  readonly entries: readonly RoleplayResourceDescriptor[]
}

/** Explicit detail read for one resource; the collection endpoint remains content-free. */
export interface RoleplayResourceDetailResponse {
  readonly format: 0
  readonly descriptor: RoleplayResourceDescriptor
  readonly detail: RoleplayResourceDetail
}
