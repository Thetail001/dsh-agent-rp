import assert from 'node:assert/strict'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentRpHttpServer } from '../src/host-http.ts'
import { RegexPackLibrary } from '../src/regex-pack-library.ts'
import { installRegexPackLibraryHttp } from '../src/regex-pack-library-http.ts'
import { REGEX_PACK_LIBRARY_PATH } from '../src/regex-pack-library-protocol.ts'
import { isSillyTavernRegexPackValue, parseRegexPackJson } from '../src/regex-pack.ts'

type RegisteredRoute = Parameters<AgentRpHttpServer['register']>[0]

function routeFor(library: RegexPackLibrary): RegisteredRoute {
  let route: RegisteredRoute | undefined
  const context = { effect(register: () => unknown) { register() } } as unknown as Context
  const server: AgentRpHttpServer = {
    register(next) {
      route = next
      return () => {}
    },
  }
  installRegexPackLibraryHttp(context, library, server)
  assert.ok(route)
  return route
}

interface RouteResponse {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly json: unknown
}

async function requestRoute(
  route: RegisteredRoute,
  options: {
    readonly method: string
    readonly path?: string
    readonly body?: string | Uint8Array
    readonly headers?: IncomingHttpHeaders
  },
): Promise<RouteResponse> {
  const body = options.body === undefined ? [] : [options.body]
  const request = Object.assign(Readable.from(body), {
    method: options.method,
    headers: {
      host: '127.0.0.1:3091',
      origin: 'http://127.0.0.1:3091',
      'sec-fetch-site': 'same-origin',
      ...options.headers,
    },
    url: `${REGEX_PACK_LIBRARY_PATH}${options.path ?? ''}`,
  }) as unknown as IncomingMessage
  let status: number | undefined
  let responseHeaders: Record<string, string> = {}
  let responseBody = Buffer.alloc(0)
  const response = {
    setHeader(name: string, value: string) { responseHeaders[name.toLowerCase()] = value; return response },
    writeHead(next: number, headers: Record<string, string>) {
      status = next
      responseHeaders = { ...responseHeaders, ...Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])) }
      return response
    },
    end(value?: string | Uint8Array) { if (value !== undefined) responseBody = Buffer.from(value); return response },
  } as unknown as ServerResponse
  await route.handler(request, response)
  assert.notEqual(status, undefined)
  return { status: status!, headers: responseHeaders, json: JSON.parse(responseBody.toString('utf8')) as unknown }
}

function rule(name: string, options: { readonly disabled?: boolean; readonly markdownOnly?: boolean; readonly promptOnly?: boolean } = {}) {
  return {
    id: name,
    scriptName: name,
    findRegex: `/(${name})/g`,
    replaceString: '$1',
    trimStrings: [],
    placement: [1, 2],
    disabled: options.disabled ?? false,
    markdownOnly: options.markdownOnly ?? false,
    promptOnly: options.promptOnly ?? false,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  }
}

test('recognizes single and array SillyTavern regex exports without inspecting their code', () => {
  assert.equal(isSillyTavernRegexPackValue(rule('single')), true)
  assert.equal(isSillyTavernRegexPackValue([rule('display'), rule('prompt')]), true)
  assert.equal(isSillyTavernRegexPackValue([]), false)
  assert.equal(isSillyTavernRegexPackValue({ prompts: [], prompt_order: [] }), false)
  assert.equal(parseRegexPackJson(JSON.stringify(rule('single'))).length, 1)
  assert.throws(() => parseRegexPackJson('[]'), /没有规则/u)
})

test('keeps the manual standalone regex fixture importable', () => {
  const scripts = parseRegexPackJson(readFileSync('tests/fixtures/manual-regex-pack.json', 'utf8'))
  assert.deepEqual(scripts.map(script => ({
    name: script.scriptName,
    placement: script.placement,
    display: script.markdownOnly,
    prompt: script.promptOnly,
  })), [{ name: '全局显示探针', placement: [2], display: true, prompt: false }])
})

test('stores one ordered mixed regex pack independently from future Session snapshots', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-regex-packs-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const scripts = [
    rule('display', { markdownOnly: true }),
    rule('prompt', { promptOnly: true }),
    rule('both', { markdownOnly: true, promptOnly: true }),
    rule('shared', { disabled: true }),
  ]
  const data = new TextEncoder().encode(JSON.stringify(scripts))
  const library = new RegexPackLibrary({ root })
  const imported = library.importFile({ data, filename: '数据库配套正则.json' })
  assert.equal(imported.name, '数据库配套正则')
  assert.equal(imported.scriptCount, 4)
  assert.equal(imported.enabledCount, 3)
  assert.equal(imported.displayCount, 3)
  assert.equal(imported.promptCount, 3)
  assert.deepEqual(imported.scripts.map(script => script.scriptName), ['display', 'prompt', 'both', 'shared'])
  assert.deepEqual(library.list(), [{
    id: imported.id,
    name: imported.name,
    scriptCount: 4,
    enabledCount: 3,
    displayCount: 3,
    promptCount: 3,
    updatedAt: imported.updatedAt,
  }])
  assert.equal(library.importFile({ data, filename: '副本.json' }).id, imported.id)
  const detached = library.get(imported.id)
  ;(detached.scripts[0] as { scriptName: string }).scriptName = 'changed'
  assert.equal(library.get(imported.id).scripts[0]?.scriptName, 'display')
  library.delete(imported.id)
  assert.deepEqual(library.list(), [])
  assert.throws(() => library.get(imported.id), /没有/u)
})

test('serves trusted list, import, and removal requests with bounded failures', async context => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-regex-pack-http-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new RegexPackLibrary({ root })
  const route = routeFor(library)
  const source = JSON.stringify([rule('display', { markdownOnly: true }), rule('prompt', { promptOnly: true })])

  assert.deepEqual(await requestRoute(route, { method: 'GET' }), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-length': '25',
      'content-type': 'application/json; charset=utf-8',
    },
    json: { format: 0, entries: [] },
  })
  const imported = await requestRoute(route, {
    method: 'POST', path: '?filename=%E6%95%B0%E6%8D%AE%E5%BA%93.json', body: source,
  })
  assert.equal(imported.status, 200)
  const entry = (imported.json as { entry: { id: string; scriptCount: number; displayCount: number; promptCount: number } }).entry
  assert.equal(entry.scriptCount, 2)
  assert.equal(entry.displayCount, 1)
  assert.equal(entry.promptCount, 1)
  assert.equal((await requestRoute(route, { method: 'GET' }).then(result =>
    (result.json as { entries: unknown[] }).entries.length)), 1)
  assert.deepEqual(await requestRoute(route, { method: 'DELETE', path: `?id=${entry.id}` }), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-length': String(Buffer.byteLength(JSON.stringify({ format: 0, id: entry.id }))),
      'content-type': 'application/json; charset=utf-8',
    },
    json: { format: 0, id: entry.id },
  })

  assert.equal((await requestRoute(route, { method: 'POST', body: source })).status, 400)
  assert.equal((await requestRoute(route, { method: 'POST', path: '?filename=empty.json' })).status, 400)
  assert.equal((await requestRoute(route, {
    method: 'POST', path: '?filename=large.json', headers: { 'content-length': String(2 * 1024 * 1024 + 1) },
  })).status, 413)
  assert.equal((await requestRoute(route, { method: 'DELETE' })).status, 400)
  const method = await requestRoute(route, { method: 'PATCH' })
  assert.equal(method.status, 405)
  assert.equal(method.headers.allow, 'DELETE, GET, POST')
  assert.equal((await requestRoute(route, {
    method: 'GET', headers: { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' },
  })).status, 403)
})
