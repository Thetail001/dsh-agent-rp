import assert from 'node:assert/strict'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { CharacterLibrary } from '../src/character-library.ts'
import type { AgentRpHttpServer } from '../src/host-http.ts'
import type { ImportedTavernHelperScript } from '../src/import/types.ts'
import type { PresetLibrary } from '../src/preset-library.ts'
import { installTavernPreflightHttp } from '../src/tavern-preflight-http.ts'
import { TAVERN_PREFLIGHT_PATH } from '../src/tavern-preflight-protocol.ts'

type RegisteredRoute = Parameters<AgentRpHttpServer['register']>[0]

interface HttpResult {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
  readonly json: unknown
}

interface InvokeOptions {
  readonly method?: string
  readonly headers?: IncomingHttpHeaders
  readonly body?: string | Uint8Array | readonly Uint8Array[]
  readonly stream?: Readable
}

const PRIVATE_SCRIPT_SOURCE = 'PRIVATE_SCRIPT_SOURCE_MUST_NOT_LEAK'
const PRIVATE_CARD_BODY = 'PRIVATE_CARD_BODY_MUST_NOT_LEAK'
const PRIVATE_PROMPT = 'PRIVATE_PROMPT_MUST_NOT_LEAK'
const PRIVATE_PATH = 'C:\\private\\cards\\secret.json'

function script(id: string, content = `window.__private=${JSON.stringify(PRIVATE_SCRIPT_SOURCE)};`): ImportedTavernHelperScript {
  return {
    id,
    name: `script-${id}`,
    content,
    info: PRIVATE_PROMPT,
    enabled: true,
    buttonEnabled: false,
    buttons: [],
    data: { privateCardBody: PRIVATE_CARD_BODY },
  }
}

function testLibraries(characterScripts: readonly ImportedTavernHelperScript[] = [script('character-script')]): {
  readonly characters: CharacterLibrary
  readonly presets: PresetLibrary
} {
  const characters = {
    resolve(id: string) {
      if (id !== 'character-ok') throw new Error(`cannot read ${PRIVATE_PATH}`)
      return { card: { frontend: { tavernHelperScripts: characterScripts } } }
    },
  } as unknown as CharacterLibrary
  const presets = {
    get(id: string) {
      if (id !== 'preset-ok') throw new Error(`cannot read ${PRIVATE_PATH}`)
      return { preset: { tavernHelperScripts: [script('preset-script')] } }
    },
  } as unknown as PresetLibrary
  return { characters, presets }
}

function registeredRoute(
  libraries: { readonly characters: CharacterLibrary; readonly presets: PresetLibrary } = testLibraries(),
): RegisteredRoute {
  let route: RegisteredRoute | undefined
  const ctx = {
    effect(register: () => unknown) { register() },
  } as unknown as Context
  const server: AgentRpHttpServer = {
    register(next) {
      route = next
      return () => {}
    },
  }
  installTavernPreflightHttp(ctx, libraries.characters, libraries.presets, server)
  assert.ok(route)
  assert.equal(route.kind, 'exact')
  assert.equal(route.path, TAVERN_PREFLIGHT_PATH)
  return route
}

function responseCapture(): { readonly response: ServerResponse; readonly result: () => HttpResult } {
  let status: number | undefined
  let body = Buffer.alloc(0)
  const headers = new Map<string, string>()
  const target = {
    destroyed: false,
    writableEnded: false,
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value))
      return target
    },
    writeHead(nextStatus: number, nextHeaders?: Readonly<Record<string, string | number | readonly string[]>>) {
      status = nextStatus
      for (const [name, value] of Object.entries(nextHeaders ?? {})) {
        headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value))
      }
      return target
    },
    end(chunk?: string | Uint8Array) {
      if (chunk !== undefined) body = Buffer.from(chunk)
      return target
    },
  }
  return {
    response: target as unknown as ServerResponse,
    result() {
      if (status === undefined) throw new Error('HTTP route did not write a status')
      const text = body.toString('utf8')
      return { status, headers: Object.fromEntries(headers), body: text, json: JSON.parse(text) as unknown }
    },
  }
}

function bodyChunks(body: InvokeOptions['body']): readonly Uint8Array[] {
  if (body === undefined) return []
  if (typeof body === 'string') return [Buffer.from(body)]
  if (body instanceof Uint8Array) return [body]
  return body
}

async function invoke(route: RegisteredRoute, options: InvokeOptions = {}): Promise<HttpResult> {
  const request = Object.assign(options.stream ?? Readable.from(bodyChunks(options.body)), {
    method: options.method ?? 'POST',
    headers: {
      host: '127.0.0.1:3091',
      origin: 'http://127.0.0.1:3091',
      'sec-fetch-site': 'same-origin',
      ...options.headers,
    } satisfies IncomingHttpHeaders,
  }) as unknown as IncomingMessage
  const capture = responseCapture()
  await route.handler(request, capture.response)
  return capture.result()
}

function request(overrides: Readonly<Record<string, unknown>> = {}): string {
  return JSON.stringify({ format: 0, characterId: 'character-ok', scriptApprovals: [], ...overrides })
}

test('registers a same-origin POST-only Tavern preflight route', async () => {
  const route = registeredRoute()
  const method = await invoke(route, { method: 'GET' })
  assert.equal(method.status, 405)
  assert.equal(method.headers.allow, 'POST')
  assert.deepEqual(method.json, { error: 'method not allowed' })

  for (const headers of [
    { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    { origin: 'https://attacker.example', 'sec-fetch-site': 'same-origin' },
    { host: '', origin: undefined },
  ]) {
    const forbidden = await invoke(route, { body: request(), headers })
    assert.equal(forbidden.status, 403)
    assert.deepEqual(forbidden.json, { error: 'forbidden' })
  }
})

test('bounds declared and streamed Tavern preflight request bodies', async () => {
  const route = registeredRoute()
  const declared = await invoke(route, {
    body: request(),
    headers: { 'content-length': String(64 * 1024 + 1) },
  })
  assert.equal(declared.status, 413)
  assert.deepEqual(declared.json, { error: '权限预检请求过大' })

  const streamed = await invoke(route, { body: Buffer.alloc(64 * 1024 + 1, 0x20) })
  assert.equal(streamed.status, 413)
  assert.deepEqual(streamed.json, { error: '权限预检请求过大' })
})

test('rejects malformed requests before accessing character or preset content', async () => {
  const route = registeredRoute()
  const cases = [
    { body: '{', error: '权限预检请求不是有效 JSON' },
    { body: JSON.stringify([]), error: '权限预检请求无效' },
    { body: request({ format: 1 }), error: '权限预检请求无效' },
    { body: request({ characterId: '../secret' }), error: '角色卡 id 无效' },
    { body: request({ presetId: 'folder/secret' }), error: '预设 id 无效' },
  ]
  for (const item of cases) {
    const result = await invoke(route, { body: item.body })
    assert.equal(result.status, 400)
    assert.deepEqual(result.json, { error: item.error })
  }
})

test('bounds approval counts and origins per script', async () => {
  const route = registeredRoute()
  const approval = (index: number, origins: readonly string[] = []) => ({
    scope: index % 2 === 0 ? 'character' : 'preset',
    scriptId: `script-${index}`,
    origins,
  })
  const accepted = await invoke(route, {
    body: request({
      scriptApprovals: Array.from({ length: 256 }, (_, index) => approval(index)),
      presetId: 'preset-ok',
    }),
  })
  assert.equal(accepted.status, 200)

  const tooManyApprovals = await invoke(route, {
    body: request({ scriptApprovals: Array.from({ length: 257 }, (_, index) => approval(index)) }),
  })
  assert.equal(tooManyApprovals.status, 400)
  assert.deepEqual(tooManyApprovals.json, { error: '权限预检请求无效' })

  const acceptedOrigins = await invoke(route, {
    body: request({ scriptApprovals: [approval(0, Array.from(
      { length: 32 }, (_, index) => `https://origin-${index}.example`,
    ))] }),
  })
  assert.equal(acceptedOrigins.status, 200)

  const tooManyOrigins = await invoke(route, {
    body: request({ scriptApprovals: [approval(0, Array.from(
      { length: 33 }, (_, index) => `https://origin-${index}.example`,
    ))] }),
  })
  assert.equal(tooManyOrigins.status, 400)
  assert.deepEqual(tooManyOrigins.json, { error: '脚本授权 1 无效' })
})

test('accepts only exact credential-free HTTPS origins', async () => {
  const route = registeredRoute()
  const exact = await invoke(route, {
    body: request({ scriptApprovals: [{
      scope: 'character', scriptId: 'character-script', origins: ['https://modules.example:8443'],
    }] }),
  })
  assert.equal(exact.status, 200)

  for (const origin of [
    'http://modules.example',
    'https://user:secret@modules.example',
    'https://modules.example/',
    'https://modules.example/path',
    'https://modules.example?query=1',
    'not a URL',
  ]) {
    const invalid = await invoke(route, {
      body: request({ scriptApprovals: [{ scope: 'character', scriptId: 'character-script', origins: [origin] }] }),
    })
    assert.equal(invalid.status, 400)
    assert.deepEqual(invalid.json, { error: '脚本来源授权无效' })
  }
})

test('uses stable library and request-stream errors without exposing local details', async () => {
  const route = registeredRoute()
  const missingCharacter = await invoke(route, { body: request({ characterId: 'missing-character' }) })
  assert.equal(missingCharacter.status, 400)
  assert.deepEqual(missingCharacter.json, { error: '角色卡不可用' })

  const missingPreset = await invoke(route, { body: request({ presetId: 'missing-preset' }) })
  assert.equal(missingPreset.status, 400)
  assert.deepEqual(missingPreset.json, { error: '预设不可用' })

  const failedStream = Readable.from((async function* () {
    yield Buffer.from('{')
    throw new Error(`aborted while reading ${PRIVATE_PATH}`)
  })())
  const interrupted = await invoke(route, { stream: failedStream })
  assert.equal(interrupted.status, 400)
  assert.deepEqual(interrupted.json, { error: '权限预检请求读取失败' })

  for (const result of [missingCharacter, missingPreset, interrupted]) {
    assert.doesNotMatch(result.body, /private|secret|stack|\\cards\\/iu)
  }
})

test('returns only the static resource plan, never script source, card content, prompts, or resolver errors', async () => {
  const resolverError = 'PRIVATE_RESOLVER_ERROR_MUST_NOT_LEAK'
  const route = registeredRoute(testLibraries([
    script('ready-script'),
    script('failed-script', 'const specifier=location.hash; import(specifier);'),
    script('remote-failed-script', "import 'https://cdn.jsdelivr.net/gh/dsh-agent-rp/preflight-private-error@0.0.0/bundle.js';"),
  ]))
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => Promise.reject(new Error(resolverError))
  let result: HttpResult
  try {
    result = await invoke(route, { body: request() })
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(result.status, 200)
  assert.deepEqual(result.json, {
    format: 0,
    scripts: 3,
    ready: 1,
    permissionRequired: 0,
    failed: 2,
    entries: [{
      scope: 'character', scriptId: 'ready-script', scriptName: 'script-ready-script',
      status: 'ready', remoteImageOrigins: [], remoteStyleOrigins: [], remoteFrameOrigins: [],
    }, {
      scope: 'character', scriptId: 'failed-script', scriptName: 'script-failed-script',
      status: 'resolution-error', remoteImageOrigins: [], remoteStyleOrigins: [], remoteFrameOrigins: [],
    }, {
      scope: 'character', scriptId: 'remote-failed-script', scriptName: 'script-remote-failed-script',
      status: 'resolution-error', remoteImageOrigins: [], remoteStyleOrigins: [], remoteFrameOrigins: [],
    }],
  })
  for (const privateValue of [PRIVATE_SCRIPT_SOURCE, PRIVATE_CARD_BODY, PRIVATE_PROMPT, resolverError, PRIVATE_PATH]) {
    assert.doesNotMatch(result.body, new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
  }
})

test('hides unexpected implementation errors behind a stable server response', async () => {
  const characters = {
    resolve() {
      return Object.defineProperty({}, 'card', {
        get() { throw new Error(`unexpected failure in ${PRIVATE_PATH}`) },
      })
    },
  } as unknown as CharacterLibrary
  const result = await invoke(registeredRoute({ characters, presets: testLibraries().presets }), { body: request() })
  assert.equal(result.status, 500)
  assert.deepEqual(result.json, { error: '权限预检暂时不可用' })
  assert.doesNotMatch(result.body, /private|secret|stack|\\cards\\/iu)
})
