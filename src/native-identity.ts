/** Host-owned native identity key, profile, and audience-bound attestation issuer. */

import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  type NativeIdentityAttestation,
  type NativeIdentityAttestationInput,
  type NativeIdentityProfile,
  type NativeIdentityPublicKey,
} from './native-identity-protocol.ts'

/** Credential reference containing the native identity private key. */
export const NATIVE_IDENTITY_PRIVATE_KEY_REF = credentialRef('DSH_AGENT_RP_NATIVE_IDENTITY_PRIVATE_KEY')

const ATTESTATION_LIFETIME_SECONDS = 5 * 60

interface StoredNativeIdentityProfile extends NativeIdentityProfile {}

/** Filesystem override used by focused checks and portable deployments. */
export interface NativeIdentityStoreOptions {
  readonly path?: string
  readonly now?: () => number
  readonly uuid?: () => string
}

function base64Url(value: Uint8Array | string): string {
  return Buffer.from(value).toString('base64url')
}

function publicKeyFields(value: JsonWebKey): NativeIdentityPublicKey {
  if (value.kty !== 'EC' || value.crv !== 'P-256' || typeof value.x !== 'string' || typeof value.y !== 'string') {
    throw new Error('本机身份公钥格式无效')
  }
  return { kty: 'EC', crv: 'P-256', x: value.x, y: value.y }
}

function keyId(publicKey: NativeIdentityPublicKey): string {
  return base64Url(createHash('sha256').update(JSON.stringify(publicKey), 'utf8').digest())
}

function applicationId(value: string): string {
  return base64Url(createHash('sha256').update(`dsh-agent-rp\0${value}`, 'utf8').digest())
}

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('本机身份名称无效')
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > 80) throw new Error('本机身份名称需为 1 到 80 个字符')
  return normalized
}

function parseStoredProfile(value: unknown): StoredNativeIdentityProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('本机身份资料无效')
  const record = value as Record<string, unknown>
  const publicKey = publicKeyFields(record.publicKey as JsonWebKey)
  if (record.format !== 0 || record.provider !== 'dsh-native'
    || typeof record.subject !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(record.subject)
    || typeof record.keyId !== 'string' || record.keyId !== keyId(publicKey)
    || typeof record.createdAt !== 'number' || !Number.isSafeInteger(record.createdAt) || record.createdAt <= 0) {
    throw new Error('本机身份资料无效')
  }
  return {
    format: 0,
    provider: 'dsh-native',
    subject: record.subject,
    displayName: normalizeDisplayName(record.displayName),
    keyId: record.keyId,
    publicKey,
    createdAt: record.createdAt,
  }
}

/** Durable Host manager that never returns the native identity private key. */
export class NativeIdentityStore {
  readonly path: string
  private readonly now: () => number
  private readonly uuid: () => string
  private operations: Promise<void> = Promise.resolve()

  constructor(private readonly credentials: CredentialProvider, options: NativeIdentityStoreOptions = {}) {
    this.path = resolve(options.path ?? dshHomePath('agent-rp', 'native-identity.json'))
    this.now = options.now ?? Date.now
    this.uuid = options.uuid ?? randomUUID
  }

  private readProfileFile(): StoredNativeIdentityProfile | undefined {
    if (!existsSync(this.path)) return undefined
    try {
      return parseStoredProfile(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取本机身份资料 ${JSON.stringify(this.path)}`, { cause: error })
    }
  }

  private writeProfileFile(profile: StoredNativeIdentityProfile): void {
    const parent = dirname(this.path)
    mkdirSync(parent, { recursive: true, mode: 0o700 })
    const staging = `${this.path}.${process.pid}.${randomUUID()}.tmp`
    try {
      writeFileSync(staging, `${JSON.stringify(profile, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(staging, this.path)
    } finally {
      rmSync(staging, { force: true })
    }
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operations.then(operation, operation)
    this.operations = result.then(() => undefined, () => undefined)
    return result
  }

  private async read(): Promise<NativeIdentityProfile | undefined> {
    const [profile, credential] = await Promise.all([
      Promise.resolve(this.readProfileFile()),
      this.credentials.resolve(NATIVE_IDENTITY_PRIVATE_KEY_REF),
    ])
    if (profile === undefined && credential === undefined) return undefined
    if (profile === undefined) throw new Error('本机身份私钥存在，但资料文件缺失')
    if (credential === undefined) throw new Error('本机身份资料存在，但私钥缺失')
    const derived = publicKeyFields(createPublicKey(createPrivateKey(credential.value)).export({ format: 'jwk' }))
    if (keyId(derived) !== profile.keyId) throw new Error('本机身份资料与私钥不匹配')
    return profile
  }

  /** Read the public profile, failing when only one half of the durable identity exists. */
  async get(): Promise<NativeIdentityProfile | undefined> {
    return this.runExclusive(() => this.read())
  }

  /** Create the native identity once or update its non-secret display name. */
  async setDisplayName(displayName: string): Promise<NativeIdentityProfile> {
    const normalized = normalizeDisplayName(displayName)
    return this.runExclusive(async () => {
      const current = await this.read()
      if (current !== undefined) {
        const next = { ...current, displayName: normalized }
        this.writeProfileFile(next)
        return next
      }
      const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
      const privateKey = pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
      const publicKey = publicKeyFields(pair.publicKey.export({ format: 'jwk' }))
      const profile: StoredNativeIdentityProfile = {
        format: 0,
        provider: 'dsh-native',
        subject: this.uuid(),
        displayName: normalized,
        keyId: keyId(publicKey),
        publicKey,
        createdAt: this.now(),
      }
      await this.credentials.set(NATIVE_IDENTITY_PRIVATE_KEY_REF, privateKey)
      try {
        this.writeProfileFile(profile)
      } catch (error: unknown) {
        await this.credentials.unset(NATIVE_IDENTITY_PRIVATE_KEY_REF)
        throw error
      }
      return profile
    })
  }

  /** Issue one five-minute ES256 proof bound to an HTTPS audience, nonce, and Host-derived application id. */
  async issue(input: NativeIdentityAttestationInput): Promise<NativeIdentityAttestation> {
    return this.runExclusive(async () => {
      const profile = await this.read()
      if (profile === undefined) throw new Error('请先在 Agent RP 设置中创建本机身份')
      const credential = await this.credentials.resolve(NATIVE_IDENTITY_PRIVATE_KEY_REF)
      if (credential === undefined) throw new Error('本机身份私钥缺失')
      const issuedAt = Math.floor(this.now() / 1_000)
      const expiresAt = issuedAt + ATTESTATION_LIFETIME_SECONDS
      const header = base64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: profile.keyId, jwk: profile.publicKey }))
      const payload = base64Url(JSON.stringify({
        iss: 'dsh-native',
        sub: profile.subject,
        aud: input.audience,
        iat: issuedAt,
        exp: expiresAt,
        nonce: input.nonce,
        app: applicationId(input.application),
        ...(input.includeDisplayName ? { name: profile.displayName } : {}),
      }))
      const signingInput = `${header}.${payload}`
      const signature = sign('sha256', Buffer.from(signingInput, 'ascii'), {
        key: createPrivateKey(credential.value),
        dsaEncoding: 'ieee-p1363',
      })
      return {
        format: 0,
        provider: 'dsh-native',
        attestation: `${signingInput}.${base64Url(signature)}`,
        expiresAt: expiresAt * 1_000,
        keyId: profile.keyId,
        publicKey: profile.publicKey,
      }
    })
  }
}
