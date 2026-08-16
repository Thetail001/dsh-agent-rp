/** Wire protocol used by an HTTPS page embedded inside an Agent RP runtime. */

/** Versioned postMessage channel for embedded-service native identity requests. */
export const AGENT_RP_EMBEDDED_IDENTITY_CHANNEL = 'dsh-agent-rp:identity'

/** One identity request sent with a single-use MessagePort to the containing runtime. */
export interface EmbeddedNativeIdentityRequest {
  readonly channel: typeof AGENT_RP_EMBEDDED_IDENTITY_CHANNEL
  readonly action: 'request'
  readonly format: 0
  readonly requestId: string
  readonly audience: string
  readonly nonce: string
  readonly includeDisplayName: boolean
}

/** Stable failure categories returned without Host, card, or player details. */
export type EmbeddedNativeIdentityFailure = 'busy' | 'identity-unavailable'
