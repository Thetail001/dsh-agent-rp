import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import {
  parseStExtensionGenerationCompletion,
  parseStExtensionGenerationRequest,
  type StExtensionGenerationCompletion,
} from '../src/st-extension-generation-protocol.ts'
import {
  beginStExtensionGeneration,
  registerStExtensionGenerationCoordinator,
  StExtensionGenerationCoordinator,
} from '../src/st-extension-generation.ts'
import { installStExtensionGenerationHttp } from '../src/st-extension-generation-http.ts'
import { createStExtensionGenerationClient } from '../src/client/st-extension-generation.ts'
import type { AgentRpHttpServer } from '../src/host-http.ts'

const idleSignal = new AbortController().signal

test('selects an online Host coordinator across independent Cordis roots', async () => {
  const hostModuleUrl = new URL('../src/st-extension-generation.ts', import.meta.url)
  hostModuleUrl.searchParams.set('host-copy', crypto.randomUUID())
  const hostCopy = await import(hostModuleUrl.href) as typeof import('../src/st-extension-generation.ts')
  const offline = new StExtensionGenerationCoordinator()
  const online = new hostCopy.StExtensionGenerationCoordinator()
  const unregisterOffline = registerStExtensionGenerationCoordinator(offline)
  const unregisterOnline = hostCopy.registerStExtensionGenerationCoordinator(online)
  const poll = online.poll('session-a', 'browser-a', idleSignal)
  const selected = beginStExtensionGeneration('session-a', 1)
  assert.equal(selected, online)
  const request = await poll
  assert.notEqual(request, undefined)
  online.complete(completion(request!, 'browser-a'))
  assert.deepEqual(await selected!.wait('session-a', 1, idleSignal), { outcome: 'applied' })
  unregisterOnline()
  unregisterOffline()
  online.dispose()
  offline.dispose()
})

function completion(
  request: { readonly requestId: string; readonly sessionId: string },
  clientId: string,
  outcome: 'applied' | 'failed' = 'applied',
): StExtensionGenerationCompletion {
  return {
    format: 0,
    operation: 'complete',
    requestId: request.requestId,
    sessionId: request.sessionId,
    clientId,
    outcome,
  }
}

test('starts no barrier without an online poll and selects one stable Session owner', async () => {
  const coordinator = new StExtensionGenerationCoordinator()
  assert.equal(coordinator.begin('session-a', 1), false)
  assert.deepEqual(await coordinator.wait('session-a', 1, idleSignal), { outcome: 'absent' })

  const pollA = coordinator.poll('session-a', 'client-a', idleSignal)
  const pollB = coordinator.poll('session-a', 'client-b', idleSignal)
  assert.equal(coordinator.begin('session-a', 1), true)
  const first = await pollB
  assert.notEqual(first, undefined)
  const firstWait = coordinator.wait('session-a', 1, idleSignal)
  coordinator.complete(completion(first!, 'client-b'))
  assert.deepEqual(await firstWait, { outcome: 'applied' })

  const nextB = coordinator.poll('session-a', 'client-b', idleSignal)
  assert.equal(coordinator.begin('session-a', 2), true)
  const second = await nextB
  assert.notEqual(second, undefined)
  assert.equal(second?.turn, 2)
  const secondWait = coordinator.wait('session-a', 2, idleSignal)
  coordinator.complete(completion(second!, 'client-b', 'failed'))
  assert.deepEqual(await secondWait, { outcome: 'failed' })

  coordinator.dispose()
  assert.equal(await pollA, undefined)
})

test('replaces duplicate polls, rejects foreign completions, and releases aborts', async () => {
  const coordinator = new StExtensionGenerationCoordinator()
  const first = coordinator.poll('session-a', 'client-a', idleSignal)
  const secondController = new AbortController()
  const second = coordinator.poll('session-a', 'client-a', secondController.signal)
  assert.equal(await first, undefined)
  assert.equal(coordinator.begin('session-a', 3), true)
  const request = await second
  assert.notEqual(request, undefined)
  assert.throws(() => coordinator.complete(completion(request!, 'client-b')), /another browser host/u)
  coordinator.complete(completion(request!, 'client-a'))
  assert.deepEqual(await coordinator.wait('session-a', 3, idleSignal), { outcome: 'applied' })

  const aborted = new AbortController()
  const poll = coordinator.poll('session-b', 'client-b', aborted.signal)
  aborted.abort()
  assert.equal(await poll, undefined)
  assert.equal(coordinator.begin('session-b', 1), false)
  coordinator.dispose()
})

test('bounds a browser barrier and distinguishes timeout from Agent abort', async () => {
  const coordinator = new StExtensionGenerationCoordinator(5)
  const poll = coordinator.poll('session-a', 'client-a', idleSignal)
  coordinator.begin('session-a', 1)
  await poll
  assert.deepEqual(await coordinator.wait('session-a', 1, idleSignal), { outcome: 'timeout' })

  const nextPoll = coordinator.poll('session-a', 'client-a', idleSignal)
  coordinator.begin('session-a', 2)
  await nextPoll
  const aborted = new AbortController()
  const wait = coordinator.wait('session-a', 2, aborted.signal)
  aborted.abort()
  assert.deepEqual(await wait, { outcome: 'failed', error: 'generation aborted' })
  coordinator.dispose()
})

test('parses the exact browser protocol and transports one same-origin cycle', async () => {
  assert.deepEqual(parseStExtensionGenerationRequest({
    format: 0, requestId: 'request-a', sessionId: 'session-a', turn: 4,
  }), { format: 0, requestId: 'request-a', sessionId: 'session-a', turn: 4 })
  assert.throws(() => parseStExtensionGenerationRequest({
    format: 0, requestId: 'request-a', sessionId: 'session-a', turn: -1,
  }), /invalid/u)
  assert.deepEqual(parseStExtensionGenerationCompletion({
    format: 0, operation: 'complete', requestId: 'request-a', sessionId: 'session-a',
    clientId: 'browser-a', outcome: 'failed', error: 'sidecar unavailable',
  }), {
    format: 0, operation: 'complete', requestId: 'request-a', sessionId: 'session-a',
    clientId: 'browser-a', outcome: 'failed', error: 'sidecar unavailable',
  })

  const calls: { readonly input: string; readonly init?: RequestInit }[] = []
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), ...(init === undefined ? {} : { init }) })
    return calls.length === 1
      ? Response.json({ format: 0, requestId: 'request-a', sessionId: 'session-a', turn: 4 })
      : Response.json({ format: 0, completed: true })
  }
  const client = createStExtensionGenerationClient(fetcher, 'browser-a')
  const request = await client.poll('session-a', idleSignal)
  assert.equal(request?.requestId, 'request-a')
  await client.complete({
    format: 0, operation: 'complete', requestId: 'request-a', sessionId: 'session-a', outcome: 'applied',
  })
  assert.match(calls[0]?.input ?? '', /sessionId=session-a&clientId=browser-a/u)
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    format: 0, operation: 'complete', requestId: 'request-a', sessionId: 'session-a',
    outcome: 'applied', clientId: 'browser-a',
  })
})

class FakeServerResponse extends EventEmitter {
  destroyed = false
  writableEnded = false
  status = 0
  readonly headers: Record<string, string> = {}
  body = Buffer.alloc(0)

  setHeader(name: string, value: string): void {
    this.headers[name.toLowerCase()] = String(value)
  }

  writeHead(status: number, headers: Record<string, string> = {}): this {
    this.status = status
    Object.assign(this.headers, headers)
    return this
  }

  end(body?: Uint8Array): this {
    this.body = body === undefined ? Buffer.alloc(0) : Buffer.from(body)
    this.writableEnded = true
    this.emit('close')
    return this
  }
}

function httpRequest(method: string, url: string, body?: string): IncomingMessage {
  return Object.assign(Readable.from(body === undefined ? [] : [body]), {
    method,
    url,
    headers: { host: '127.0.0.1:3080' },
  }) as unknown as IncomingMessage
}

test('keeps a normal GET response alive through completion and accepts its exact POST', async () => {
  let route: Parameters<AgentRpHttpServer['register']>[0] | undefined
  const server: AgentRpHttpServer = {
    register(value) {
      route = value
      return () => { route = undefined }
    },
  }
  const routeCtx = {
    effect: (install: () => () => void) => install(),
  } as unknown as Context
  const coordinator = new StExtensionGenerationCoordinator()
  installStExtensionGenerationHttp(routeCtx, server, coordinator)
  assert.notEqual(route, undefined)

  const getResponse = new FakeServerResponse()
  const get = route!.handler(
    httpRequest('GET', '/api/agent-rp/st-extension-generation?sessionId=session-a&clientId=browser-a'),
    getResponse as unknown as ServerResponse,
  )
  assert.equal(coordinator.begin('session-a', 9), true)
  await get
  assert.equal(getResponse.status, 200)
  const request = JSON.parse(getResponse.body.toString('utf8')) as {
    readonly requestId: string
    readonly sessionId: string
  }
  const wait = coordinator.wait('session-a', 9, idleSignal)
  const postResponse = new FakeServerResponse()
  await route!.handler(httpRequest('POST', '/api/agent-rp/st-extension-generation', JSON.stringify({
    format: 0,
    operation: 'complete',
    requestId: request.requestId,
    sessionId: request.sessionId,
    clientId: 'browser-a',
    outcome: 'applied',
  })), postResponse as unknown as ServerResponse)
  assert.equal(postResponse.status, 200)
  assert.deepEqual(await wait, { outcome: 'applied' })
  coordinator.dispose()
})
