/** Browser-to-Host protocol for copying Agent RP assets into a local modular RP distribution. */

/** Same-origin Agent RP endpoint that proxies only to a loopback RP distribution. */
export const RP_DISTRIBUTION_BRIDGE_PATH = '/api/agent-rp/rp-distribution'

/** Agent RP library asset kinds supported by the first interoperability bridge. */
export const RP_DISTRIBUTION_ASSET_KINDS = ['character', 'preset', 'persona', 'world-info'] as const

/** One transferable Agent RP library asset kind. */
export type RpDistributionAssetKind = typeof RP_DISTRIBUTION_ASSET_KINDS[number]

/** Successful probe of the community RP distribution catalog API. */
export interface RpDistributionProbeResponse {
  readonly format: 0
  readonly target: string
  readonly generatedAt: number
  readonly experienceCount: number
  readonly componentCount: number
  readonly capabilityCount: number
}

/** Request to copy one Agent RP library asset into the local community distribution. */
export interface RpDistributionTransferRequest {
  readonly format: 0
  readonly target: string
  readonly kind: RpDistributionAssetKind
  readonly id: string
}

/** Result of one completed cross-runtime asset copy. */
export interface RpDistributionTransferResponse {
  readonly format: 0
  readonly target: string
  readonly kind: RpDistributionAssetKind
  readonly sourceId: string
  readonly savedIds: readonly string[]
  readonly compatibilityDifferenceCount: number
}
