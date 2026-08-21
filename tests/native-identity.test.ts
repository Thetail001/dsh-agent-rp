import assert from 'node:assert/strict'
import { createPublicKey, verify } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { AgentRpHttpServer } from '../src/host-http.ts'
import { installNativeIdentityHttp } from '../src/native-identity-http.ts'
import {
  NativeIdentityStore,
  NATIVE_IDENTITY_PRIVATE_KEY_REF,
} from '../src/native-identity.ts'
import {
  normalizeNativeIdentityAudience,
  normalizeNativeIdentityNonce,
  parseNativeIdentityAttestationInput,
} from '../src/native-identity-protocol.ts'

type RegisteredRoute = Parameters<AgentRpHttpServer['register']>[0]

function credentialFixture(): CredentialProvider {
  const values = new Map<string, string>()
  return {
    async resolve(ref: string) {
      const value = values.get(ref)
      return value === undefined ? undefined : { value, source: 'test' }
    },
    async describe(ref: string) {
      return { configured: values.has(ref), source: values.has(ref) ? 'test' : undefined, writable: true }
    },
    async set(ref: string, value: string) { values.set(ref, value) },
    async unset(ref: string) { values.delete(ref) },
  } as unknown as CredentialProvider
}

function nativeIdentityRoute(store: NativeIdentityStore): RegisteredRoute {
  let route: RegisteredRoute | undefined
  const ctx = { effect(register: () => unknown) { register() } } as unknown as Context
  const server: AgentRpHttpServer = {
    register(next) {
      route = next
      return () => {}
    },
  }
  installNativeIdentityHttp(ctx, store, server)
  assert.ok(route)
  assert.equal(route.kind, 'prefix')
  return route
}

async function invokeNativeIdentityRoute(route: RegisteredRoute, options: {
  readonly path: string
  readonly method?: string
  readonly body?: string | Uint8Array
  readonly headers?: IncomingHttpHeaders
}): Promise<{ readonly status: number; readonly body: string; readonly json: unknown }> {
  const request = Object.assign(Readable.from(options.body === undefined ? [] : [options.body]), {
    method: options.method ?? 'GET',
    url: options.path,
    headers: {
      host: '127.0.0.1:3091', origin: 'http://127.0.0.1:3091', 'sec-fetch-site': 'same-origin',
      ...options.headers,
    } satisfies IncomingHttpHeaders,
  }) as unknown as IncomingMessage
  let status: number | undefined
  let body = Buffer.alloc(0)
  const response = {
    setHeader() { return response },
    writeHead(value: number) { status = value; return response },
    end(value?: string | Uint8Array) { if (value !== undefined) body = Buffer.from(value); return response },
  } as unknown as ServerResponse
  await route.handler(request, response)
  assert.notEqual(status, undefined)
  const text = body.toString('utf8')
  return { status: status!, body: text, json: JSON.parse(text) as unknown }
}

test('validates exact HTTPS audiences and replay-resistant native identity nonces', () => {
  assert.equal(normalizeNativeIdentityAudience('https://workshop.example.test'), 'https://workshop.example.test')
  assert.equal(normalizeNativeIdentityAudience('https://workshop.example.test/path'), undefined)
  assert.equal(normalizeNativeIdentityAudience('http://workshop.example.test'), undefined)
  assert.equal(normalizeNativeIdentityNonce('abcdefghijklmnop'), 'abcdefghijklmnop')
  assert.equal(normalizeNativeIdentityNonce('short'), undefined)
  assert.deepEqual(parseNativeIdentityAttestationInput({
    audience: 'https://workshop.example.test',
    nonce: 'abcdefghijklmnop',
    application: 'character:fixture',
    includeDisplayName: true,
  }), {
    audience: 'https://workshop.example.test',
    nonce: 'abcdefghijklmnop',
    application: 'character:fixture',
    includeDisplayName: true,
  })
})

test('creates one Host-owned key and issues a short-lived audience-bound ES256 attestation', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-rp-native-identity-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  const credentials = credentialFixture()
  const store = new NativeIdentityStore(credentials, {
    path: join(directory, 'identity.json'),
    now: () => 1_800_000_000_000,
    uuid: () => '123e4567-e89b-42d3-a456-426614174000',
  })

  assert.equal(await store.get(), undefined)
  const profile = await store.setDisplayName('测试用户')
  assert.equal(profile.displayName, '测试用户')
  assert.equal((await credentials.describe(NATIVE_IDENTITY_PRIVATE_KEY_REF)).configured, true)
  assert.doesNotMatch(readFileSync(store.path, 'utf8'), /PRIVATE KEY/u)

  const result = await store.issue({
    audience: 'https://workshop.example.test',
    nonce: 'abcdefghijklmnop',
    application: 'character:fixture',
    includeDisplayName: true,
  })
  assert.equal(result.expiresAt, 1_800_000_300_000)
  const [header, payload, signature] = result.attestation.split('.')
  assert.notEqual(header, undefined)
  assert.notEqual(payload, undefined)
  assert.notEqual(signature, undefined)
  const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8')) as Record<string, unknown>
  assert.deepEqual(claims, {
    iss: 'dsh-native',
    sub: profile.subject,
    aud: 'https://workshop.example.test',
    iat: 1_800_000_000,
    exp: 1_800_000_300,
    nonce: 'abcdefghijklmnop',
    app: claims.app,
    name: '测试用户',
  })
  assert.match(String(claims.app), /^[A-Za-z0-9_-]{43}$/u)
  assert.equal(verify('sha256', Buffer.from(`${header}.${payload}`, 'ascii'), {
    key: createPublicKey({
      key: result.publicKey,
      format: 'jwk',
    } as unknown as Parameters<typeof createPublicKey>[0]),
    dsaEncoding: 'ieee-p1363',
  }, Buffer.from(signature!, 'base64url')), true)

  const updated = await store.setDisplayName('新的名字')
  assert.equal(updated.subject, profile.subject)
  assert.equal(updated.keyId, profile.keyId)
})

test('fails loud when native identity public metadata and its private key diverge', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-rp-native-identity-mismatch-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  const credentials = credentialFixture()
  const store = new NativeIdentityStore(credentials, { path: join(directory, 'identity.json') })
  await store.setDisplayName('测试用户')
  await credentials.unset(NATIVE_IDENTITY_PRIVATE_KEY_REF)
  await assert.rejects(store.get(), /私钥缺失/u)
})

test('serializes concurrent profile creation around one durable key pair', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-rp-native-identity-concurrent-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  let subjects = 0
  const store = new NativeIdentityStore(credentialFixture(), {
    path: join(directory, 'identity.json'),
    uuid: () => {
      subjects += 1
      return '123e4567-e89b-42d3-a456-426614174000'
    },
  })
  const [first, second] = await Promise.all([
    store.setDisplayName('第一个名字'),
    store.setDisplayName('第二个名字'),
  ])
  assert.equal(subjects, 1)
  assert.equal(first.keyId, second.keyId)
  assert.equal((await store.get())?.displayName, '第二个名字')
})

test('manages native identity only through bounded same-origin Host requests', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-rp-native-identity-http-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  const store = new NativeIdentityStore(credentialFixture(), {
    path: join(directory, 'identity.json'),
    now: () => 1_800_000_000_000,
    uuid: () => '123e4567-e89b-42d3-a456-426614174000',
  })
  const route = nativeIdentityRoute(store)
  const empty = await invokeNativeIdentityRoute(route, { path: '/agent-rp/native-identity/profile' })
  assert.equal(empty.status, 200)
  assert.deepEqual(empty.json, { format: 0, identity: null })

  const created = await invokeNativeIdentityRoute(route, {
    path: '/agent-rp/native-identity/profile', method: 'PUT',
    body: JSON.stringify({ displayName: '测试用户' }),
  })
  assert.equal(created.status, 200)
  assert.doesNotMatch(created.body, /PRIVATE KEY/u)

  const attested = await invokeNativeIdentityRoute(route, {
    path: '/agent-rp/native-identity/attest', method: 'POST',
    body: JSON.stringify({
      audience: 'https://workshop.example.test', nonce: 'abcdefghijklmnop',
      application: 'character:fixture', includeDisplayName: false,
    }),
  })
  assert.equal(attested.status, 200)
  assert.match(attested.body, /header|attestation/u)
  assert.doesNotMatch(attested.body, /测试用户/u)

  const forbidden = await invokeNativeIdentityRoute(route, {
    path: '/agent-rp/native-identity/profile',
    headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
  })
  assert.equal(forbidden.status, 403)
  assert.deepEqual(forbidden.json, { error: 'forbidden' })

  const oversized = await invokeNativeIdentityRoute(route, {
    path: '/agent-rp/native-identity/profile', method: 'PUT', body: '{}',
    headers: { 'content-length': String(16 * 1024 + 1) },
  })
  assert.equal(oversized.status, 413)
  assert.deepEqual(oversized.json, { error: '本机身份请求过大' })
})
