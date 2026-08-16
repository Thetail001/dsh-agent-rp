import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compileExternalWindowRelayDocument,
  enqueueExternalWindowRequest,
  openExternalWindowBroker,
} from '../src/client/external-window.ts'

class FakeElement {
  readonly attributes = new Map<string, string>()
  readonly children: FakeElement[] = []
  readonly dataset: Record<string, string> = {}
  readonly listeners = new Map<string, (event: { readonly target: unknown }) => void>()
  readonly style: Record<string, string> = {}
  contentWindow?: { readonly messages: unknown[]; postMessage(value: unknown): void }
  focused = false
  removed = false
  srcdoc = ''
  title = ''

  constructor(readonly tagName: string) {}

  addEventListener(type: string, listener: (event: { readonly target: unknown }) => void): void {
    this.listeners.set(type, listener)
  }

  append(...values: FakeElement[]): void {
    this.children.push(...values)
  }

  focus(): void {
    this.focused = true
  }

  remove(): void {
    this.removed = true
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }
}

function relayFixture() {
  const body = new FakeElement('body')
  const frameMessages: unknown[] = []
  const frameWindow = { messages: frameMessages, postMessage(value: unknown) { frameMessages.push(value) } }
  const elements: FakeElement[] = []
  const listeners = new Map<string, (event: { source?: unknown; data?: unknown }) => void>()
  const timers = new Map<number, () => void>()
  let timerSequence = 0
  const hostWindow = {
    crypto: { randomUUID: () => 'fixed-token' },
    document: {
      body,
      createElement(tagName: string) {
        const element = new FakeElement(tagName)
        if (tagName === 'iframe') element.contentWindow = frameWindow
        elements.push(element)
        return element
      },
    },
    addEventListener(type: string, listener: (event: { source?: unknown; data?: unknown }) => void) {
      listeners.set(type, listener)
    },
    removeEventListener(type: string) {
      listeners.delete(type)
    },
    setTimeout(callback: () => void) {
      const id = ++timerSequence
      timers.set(id, callback)
      return id
    },
    clearTimeout(id: number) {
      timers.delete(id)
    },
  }
  const runTimers = () => {
    for (let turn = 0; timers.size > 0 && turn < 100; turn += 1) {
      const callbacks = [...timers.values()]
      timers.clear()
      for (const callback of callbacks) callback()
    }
  }
  return { body, elements, frameMessages, frameWindow, hostWindow, listeners, runTimers }
}

test('compiles an opaque relay whose only privileged action is one escaped external popup', () => {
  const source = compileExternalWindowRelayDocument({
    token: 'fixed-token',
    url: 'https://discord.com/oauth2/authorize?state=%3C/script%3E',
    hostname: 'discord.com',
    requesterName: '测试</script><script>mustNotRun()</script>',
    resultBytes: 65_536,
  })

  assert.match(source, /default-src 'none'/u)
  assert.match(source, /window\.open\(config\.url/u)
  assert.match(source, /event\.source===parent/u)
  assert.match(source, /event\.source!==callbackSource/u)
  assert.match(source, /dsh-agent-rp-external-relay/u)
  assert.match(source, /link\.hidden=true/u)
  assert.doesNotMatch(source, /再次前往/u)
  assert.doesNotMatch(source, /测试<\/script><script>mustNotRun\(\)<\/script>/u)
  assert.match(source, /测试\\u003c\/script>\\u003cscript>mustNotRun/u)
})

test('mounts one Host-owned relay and forwards only its bounded accepted callback', () => {
  const fixture = relayFixture()
  const runtimeMessages: unknown[] = []
  const runtimeWindow = { postMessage(value: unknown) { runtimeMessages.push(value) } }
  const phases: string[] = []
  let closed = 0
  const handle = openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=1',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'tavern-script-frame-v0',
    requestId: 'external-1',
    resolveTarget: () => runtimeWindow as unknown as Window,
    onClosed: () => { closed += 1 },
    onStateChange: state => { phases.push(`${state.phase}:${state.attempts}`) },
  })

  assert.notEqual(handle, undefined)
  assert.equal(fixture.body.children.length, 1)
  const overlay = fixture.body.children[0]!
  const frame = fixture.elements.find(element => element.tagName === 'iframe')
  assert.notEqual(frame, undefined)
  assert.equal(frame!.attributes.get('sandbox'), 'allow-scripts allow-popups allow-popups-to-escape-sandbox')
  assert.match(frame!.srcdoc, /登录页将是唯一的新窗口/u)

  const receive = fixture.listeners.get('message')!
  receive({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'wrong-token', action: 'callback',
      origin: 'https://workshop.example.test', value: { ignored: true },
    },
  })
  assert.deepEqual(runtimeMessages, [])

  receive({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'state',
      phase: 'external-opened', attempts: 1,
    },
  })
  receive({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'callback',
      origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
    },
  })
  assert.deepEqual(runtimeMessages, [{
    source: 'dsh-agent-rp-host', action: 'external-window-message', requestId: 'external-1',
    origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
  }])
  assert.deepEqual(phases, ['external-opened:1', 'callback-validated:1'])
  assert.deepEqual(fixture.frameMessages.at(-1), {
    source: 'dsh-agent-rp-host', token: 'fixed-token', action: 'callback-validated',
  })

  handle!.acknowledgeDelivery()
  assert.equal(phases.at(-1), 'callback-delivered:1')
  assert.deepEqual(fixture.frameMessages.at(-1), {
    source: 'dsh-agent-rp-host', token: 'fixed-token', action: 'callback-delivered',
  })

  handle!.focus()
  assert.equal(frame!.focused, true)
  assert.deepEqual(fixture.frameMessages.at(-1), {
    source: 'dsh-agent-rp-host', token: 'fixed-token', action: 'focus',
  })
  overlay.listeners.get('mousedown')!({ target: overlay })
  assert.equal(overlay.removed, true)
  assert.equal(closed, 1)
  assert.equal(phases.at(-1), 'callback-delivered:1')
  assert.equal(fixture.listeners.has('message'), false)
})

test('reports a broker closed before an external callback', () => {
  const fixture = relayFixture()
  const phases: string[] = []
  openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=closed',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'card-frame-v0',
    requestId: 'card-external-window-1',
    resolveTarget: () => undefined,
    onClosed() {},
    onStateChange: state => { phases.push(state.phase) },
  })

  const overlay = fixture.body.children[0]!
  overlay.listeners.get('mousedown')!({ target: overlay })

  assert.equal(phases.at(-1), 'broker-closed')
})

test('keeps rejected relay callbacks inside the isolated prompt', () => {
  const fixture = relayFixture()
  const phases: string[] = []
  openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=2',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'tavern-script-frame-v0',
    requestId: 'external-2',
    resolveTarget: () => undefined,
    onClosed() {},
    onStateChange: state => { phases.push(state.phase) },
  })

  fixture.listeners.get('message')!({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'callback',
      origin: 'http://not-https.example', value: { action: 'discordLoginSuccess' },
    },
  })
  assert.equal(phases.at(-1), 'callback-rejected')
  assert.deepEqual(fixture.frameMessages.at(-1), {
    source: 'dsh-agent-rp-host', token: 'fixed-token', action: 'callback-rejected',
  })
})

test('reports a validated callback whose requesting runtime does not acknowledge delivery', () => {
  const fixture = relayFixture()
  const phases: string[] = []
  openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=3',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'tavern-script-frame-v0',
    requestId: 'external-3',
    resolveTarget: () => ({ postMessage() {} }) as unknown as Window,
    onClosed() {},
    onStateChange: state => { phases.push(state.phase) },
  })

  fixture.listeners.get('message')!({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'callback',
      origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
    },
  })
  fixture.runTimers()

  assert.deepEqual(phases, ['callback-validated', 'callback-delivery-unconfirmed'])
  assert.deepEqual(fixture.frameMessages.at(-1), {
    source: 'dsh-agent-rp-host', token: 'fixed-token', action: 'callback-delivery-unconfirmed',
  })
})

test('resolves the current runtime when an iframe was replaced while the external page was open', () => {
  const fixture = relayFixture()
  const firstMessages: unknown[] = []
  const replacementMessages: unknown[] = []
  let currentTarget = { postMessage(value: unknown) { firstMessages.push(value) } }
  openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=4',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'tavern-script-frame-v0',
    requestId: 'external-4',
    resolveTarget: () => currentTarget as unknown as Window,
    onClosed() {},
  })
  currentTarget = { postMessage(value: unknown) { replacementMessages.push(value) } }

  fixture.listeners.get('message')!({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'callback',
      origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
    },
  })

  assert.deepEqual(firstMessages, [])
  assert.deepEqual(replacementMessages, [{
    source: 'dsh-agent-rp-host', action: 'external-window-message', requestId: 'external-4',
    origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
  }])
})

test('retries a validated callback against a replacement runtime until delivery is acknowledged', () => {
  const fixture = relayFixture()
  const phases: string[] = []
  const firstMessages: unknown[] = []
  const replacementMessages: unknown[] = []
  let handle: ReturnType<typeof openExternalWindowBroker>
  const replacementTarget = {
    postMessage(value: unknown) {
      replacementMessages.push(value)
      handle?.acknowledgeDelivery()
    },
  }
  let currentTarget = {
    postMessage(value: unknown) {
      firstMessages.push(value)
      currentTarget = replacementTarget
    },
  }
  handle = openExternalWindowBroker({
    hostWindow: fixture.hostWindow as unknown as Window,
    url: 'https://discord.com/oauth2/authorize?client_id=5',
    hostname: 'discord.com',
    requesterName: '测试卡',
    runtime: 'tavern-script-frame-v0',
    requestId: 'external-5',
    resolveTarget: () => currentTarget as unknown as Window,
    onClosed() {},
    onStateChange: state => { phases.push(state.phase) },
  })

  fixture.listeners.get('message')!({
    source: fixture.frameWindow,
    data: {
      source: 'dsh-agent-rp-external-relay', token: 'fixed-token', action: 'callback',
      origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
    },
  })
  fixture.runTimers()

  const expected = {
    source: 'dsh-agent-rp-host', action: 'external-window-message', requestId: 'external-5',
    origin: 'https://workshop.example.test', value: { action: 'discordLoginSuccess' },
  }
  assert.deepEqual(firstMessages, [expected])
  assert.deepEqual(replacementMessages, [expected])
  assert.deepEqual(phases, ['callback-validated', 'callback-delivered'])
})

test('queues unique external-window requests and rejects duplicate or excessive prompts', () => {
  const messages: unknown[] = []
  const target = { postMessage(value: unknown) { messages.push(value) } } as unknown as Window
  const request = { key: 'request-1', requestId: 'runtime-1', target }
  const queued = enqueueExternalWindowRequest(new Map(), new Map(), request)
  assert.equal(queued.get('request-1'), request)

  const duplicate = enqueueExternalWindowRequest(queued, new Map(), request)
  assert.equal(duplicate, queued)
  assert.deepEqual(messages.pop(), {
    source: 'dsh-agent-rp-host', action: 'capability-result', capability: 'ui.external-window.open',
    requestId: 'runtime-1', ok: false, error: '外部窗口请求标识重复',
  })

  const full = new Map(Array.from({ length: 8 }, (_, index) => [
    `request-${index + 10}`,
    { key: `request-${index + 10}`, requestId: `runtime-${index + 10}`, target },
  ]))
  const excessive = { key: 'request-20', requestId: 'runtime-20', target }
  assert.equal(enqueueExternalWindowRequest(full, new Map(), excessive), full)
  assert.deepEqual(messages.pop(), {
    source: 'dsh-agent-rp-host', action: 'capability-result', capability: 'ui.external-window.open',
    requestId: 'runtime-20', ok: false, error: '等待确认的外部窗口过多',
  })
})
