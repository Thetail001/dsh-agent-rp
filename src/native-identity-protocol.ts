/** Wire types for Host-owned, audience-bound DSH native identity attestations. */

/** Same-origin HTTP root used by the native identity manager and capability broker. */
export const AGENT_RP_NATIVE_IDENTITY_PATH = '/agent-rp/native-identity'

/** Public P-256 key fields included with a native identity attestation. */
export interface NativeIdentityPublicKey {
  readonly kty: 'EC'
  readonly crv: 'P-256'
  readonly x: string
  readonly y: string
}

/** Non-secret profile managed by the DSH Host. */
export interface NativeIdentityProfile {
  readonly format: 0
  readonly provider: 'dsh-native'
  readonly subject: string
  readonly displayName: string
  readonly keyId: string
  readonly publicKey: NativeIdentityPublicKey
  readonly createdAt: number
}

/** One attestation request already bound to a Host-derived application identity. */
export interface NativeIdentityAttestationInput {
  readonly audience: string
  readonly nonce: string
  readonly application: string
  readonly includeDisplayName: boolean
}

/** Short-lived proof returned to an approved isolated runtime. */
export interface NativeIdentityAttestation {
  readonly format: 0
  readonly provider: 'dsh-native'
  readonly attestation: string
  readonly expiresAt: number
  readonly keyId: string
  readonly publicKey: NativeIdentityPublicKey
}

/** Normalize one exact HTTPS audience origin. */
export function normalizeNativeIdentityAudience(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.username === '' && parsed.password === ''
      && parsed.origin === value ? parsed.origin : undefined
  } catch {
    return undefined
  }
}

/** Validate a replay-resistant nonce supplied by the relying service. */
export function normalizeNativeIdentityNonce(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,256}$/u.test(value) ? value : undefined
}

/** Parse a complete Host attestation request without applying card or script ownership. */
export function parseNativeIdentityAttestationInput(value: unknown): NativeIdentityAttestationInput | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (Object.keys(record).some(key => !['audience', 'nonce', 'application', 'includeDisplayName'].includes(key))) {
    return undefined
  }
  const audience = normalizeNativeIdentityAudience(record.audience)
  const nonce = normalizeNativeIdentityNonce(record.nonce)
  if (audience === undefined || nonce === undefined
    || typeof record.application !== 'string' || record.application.length === 0 || record.application.length > 512
    || typeof record.includeDisplayName !== 'boolean') return undefined
  return { audience, nonce, application: record.application, includeDisplayName: record.includeDisplayName }
}
