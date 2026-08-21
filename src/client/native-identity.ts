/** Browser-side management, permission keys, and Host calls for DSH native identity. */

import {
  AGENT_RP_NATIVE_IDENTITY_PATH,
  normalizeNativeIdentityAudience,
  type NativeIdentityAttestation,
  type NativeIdentityAttestationInput,
  type NativeIdentityProfile,
  type NativeIdentityPublicKey,
} from '../native-identity-protocol.ts'
import {
  boundedAgentRpCapabilityResultError,
  type AgentRpExtensionRuntime,
} from '../extension-capability.ts'
import { readApprovalSet, writeApprovalSet } from './approval-storage.ts'

/** LocalStorage key for exact application-and-audience native identity grants. */
export const NATIVE_IDENTITY_APPROVALS_KEY = 'agent-rp-native-identity-approvals-v0'
/** Browser event emitted after the Host permission set changes. */
export const nativeIdentityApprovalsChangedEvent = 'dsh-agent-rp-native-identity-approvals-changed'
/** Browser event emitted after the public Host identity profile changes. */
export const nativeIdentityProfileChangedEvent = 'dsh-agent-rp-native-identity-profile-changed'

/** One validated native-identity request waiting for approval or Host delivery. */
export interface NativeIdentityRuntimeRequest {
  readonly key: string
  readonly target: Window
  readonly runtime: Extract<AgentRpExtensionRuntime, 'card-frame-v0' | 'tavern-script-frame-v0'>
  readonly requestId: string
  readonly application: string
  readonly applicationName: string
  readonly audience: string
  readonly nonce: string
  readonly includeDisplayName: boolean
  readonly scriptKey?: string
  readonly token?: string
}

function publicKey(value: unknown): NativeIdentityPublicKey | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return record.kty === 'EC' && record.crv === 'P-256'
    && typeof record.x === 'string' && typeof record.y === 'string'
    ? { kty: 'EC', crv: 'P-256', x: record.x, y: record.y } : undefined
}

function profile(value: unknown): NativeIdentityProfile | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const key = publicKey(record.publicKey)
  if (record.format !== 0 || record.provider !== 'dsh-native' || key === undefined
    || typeof record.subject !== 'string' || typeof record.displayName !== 'string'
    || typeof record.keyId !== 'string' || typeof record.createdAt !== 'number') return undefined
  return {
    format: 0, provider: 'dsh-native', subject: record.subject, displayName: record.displayName,
    keyId: record.keyId, publicKey: key, createdAt: record.createdAt,
  }
}

function attestation(value: unknown): NativeIdentityAttestation | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const key = publicKey(record.publicKey)
  if (record.format !== 0 || record.provider !== 'dsh-native' || key === undefined
    || typeof record.attestation !== 'string' || record.attestation.length === 0 || record.attestation.length > 24_000
    || typeof record.expiresAt !== 'number' || !Number.isSafeInteger(record.expiresAt)
    || typeof record.keyId !== 'string') return undefined
  return {
    format: 0, provider: 'dsh-native', attestation: record.attestation,
    expiresAt: record.expiresAt, keyId: record.keyId, publicKey: key,
  }
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json() as unknown
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('本机身份响应无效')
  const record = value as Record<string, unknown>
  if (!response.ok) throw new Error(typeof record.error === 'string' ? record.error : '本机身份请求失败')
  return record
}

/** Serialize a persistent grant without allowing another card, script, audience, or claim set to inherit it. */
export function nativeIdentityApprovalKey(
  application: string,
  audience: string,
  includeDisplayName: boolean,
): string {
  const normalizedAudience = normalizeNativeIdentityAudience(audience)
  if (application.length === 0 || application.length > 512 || normalizedAudience === undefined) {
    throw new Error('本机身份授权范围无效')
  }
  return JSON.stringify([application, normalizedAudience, includeDisplayName])
}

/** Read exact application-and-audience grants from browser storage. */
export function readApprovedNativeIdentities(): ReadonlySet<string> {
  return readApprovalSet(localStorage, NATIVE_IDENTITY_APPROVALS_KEY, 4_096)
}

/** Persist native identity grants and notify all mounted runtimes. */
export function writeApprovedNativeIdentities(approvals: ReadonlySet<string>): void {
  writeApprovalSet(localStorage, NATIVE_IDENTITY_APPROVALS_KEY, approvals)
  window.dispatchEvent(new Event(nativeIdentityApprovalsChangedEvent))
}

/** Read the current public native identity profile without creating one. */
export async function readNativeIdentityProfile(): Promise<NativeIdentityProfile | undefined> {
  const body = await responseJson(await fetch(`${AGENT_RP_NATIVE_IDENTITY_PATH}/profile`, {
    headers: { accept: 'application/json' },
  }))
  if (body.identity === null) return undefined
  const result = profile(body.identity)
  if (result === undefined) throw new Error('本机身份资料响应无效')
  return result
}

/** Create the native identity once or replace its non-secret display name. */
export async function writeNativeIdentityDisplayName(displayName: string): Promise<NativeIdentityProfile> {
  const body = await responseJson(await fetch(`${AGENT_RP_NATIVE_IDENTITY_PATH}/profile`, {
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  }))
  const result = profile(body.identity)
  if (result === undefined) throw new Error('本机身份资料响应无效')
  window.dispatchEvent(new Event(nativeIdentityProfileChangedEvent))
  return result
}

/** Ask the Host to issue one approved, audience-bound native identity proof. */
export async function issueNativeIdentityAttestation(
  input: NativeIdentityAttestationInput,
): Promise<NativeIdentityAttestation> {
  const body = await responseJson(await fetch(`${AGENT_RP_NATIVE_IDENTITY_PATH}/attest`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }))
  const result = attestation(body.result)
  if (result === undefined) throw new Error('本机身份签名响应无效')
  return result
}

/** Issue one native proof and return a bounded capability result to the current runtime. */
export async function deliverNativeIdentityResult(
  request: NativeIdentityRuntimeRequest,
  target: Window,
): Promise<void> {
  try {
    const value = await issueNativeIdentityAttestation({
      audience: request.audience,
      nonce: request.nonce,
      application: request.application,
      includeDisplayName: request.includeDisplayName,
    })
    target.postMessage({
      source: 'dsh-agent-rp-host', action: 'capability-result', capability: 'identity.native.attest',
      requestId: request.requestId, ok: true, value,
    }, '*')
  } catch (reason: unknown) {
    target.postMessage({
      source: 'dsh-agent-rp-host', action: 'capability-result', capability: 'identity.native.attest',
      requestId: request.requestId, ok: false,
      error: boundedAgentRpCapabilityResultError(
        'identity.native.attest', request.runtime, reason, '本机身份请求失败',
      ),
    }, '*')
  }
}
