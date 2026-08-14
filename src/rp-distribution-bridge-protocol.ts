/** Browser-to-Host protocol for copying Agent RP assets into a local modular RP distribution. */

/** Same-origin Agent RP endpoint that proxies only to a loopback RP distribution. */
export const RP_DISTRIBUTION_BRIDGE_PATH = '/api/agent-rp/rp-distribution'

/** Agent RP library asset kinds supported by the first interoperability bridge. */
export const RP_DISTRIBUTION_ASSET_KINDS = ['character', 'preset', 'persona', 'world-info'] as const

/** One transferable Agent RP library asset kind. */
export type RpDistributionAssetKind = typeof RP_DISTRIBUTION_ASSET_KINDS[number]

/** One saved asset exposed by the modular RP library catalogs. */
export interface RpDistributionRemoteAssetSummary {
  readonly id: string
  readonly name: string
}

/** Assets that can be copied back from a compatible modular RP runtime. */
export interface RpDistributionRemoteAssets {
  readonly characters: readonly RpDistributionRemoteAssetSummary[]
  readonly presets: readonly RpDistributionRemoteAssetSummary[]
  readonly personas: readonly RpDistributionRemoteAssetSummary[]
  readonly worldInfos: readonly RpDistributionRemoteAssetSummary[]
}

/** Successful probe of the community RP distribution catalog API. */
export interface RpDistributionProbeResponse {
  readonly format: 0
  readonly target: string
  readonly generatedAt: number
  readonly experienceCount: number
  readonly componentCount: number
  readonly capabilityCount: number
  readonly remoteAssets: RpDistributionRemoteAssets
}

/** Request to copy one Agent RP library asset into the local community distribution. */
export interface RpDistributionTransferRequest {
  readonly format: 0
  readonly target: string
  readonly kind: RpDistributionAssetKind
  readonly id: string
}

/** Request to retain one live modular RP timeline as an Agent RP chat import. */
export interface RpDistributionChatImportRequest {
  readonly format: 0
  readonly operation: 'import-chat'
  readonly target: string
  readonly sessionId: string
}

/** Request to copy one retained modular RP source into the Agent RP library. */
export interface RpDistributionAssetImportRequest {
  readonly format: 0
  readonly operation: 'import-asset'
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

/** Result of retaining one modular RP timeline in the Agent RP chat library. */
export interface RpDistributionChatImportResponse {
  readonly format: 0
  readonly operation: 'import-chat'
  readonly target: string
  readonly sourceSessionId: string
  readonly importId: string
  readonly filename: string
  readonly messageCount: number
  readonly characterName: string
  readonly userName: string
}

/** Result of copying one modular RP asset into its Agent RP library. */
export interface RpDistributionAssetImportResponse {
  readonly format: 0
  readonly operation: 'import-asset'
  readonly target: string
  readonly kind: RpDistributionAssetKind
  readonly sourceId: string
  readonly savedId: string
  readonly name: string
}
