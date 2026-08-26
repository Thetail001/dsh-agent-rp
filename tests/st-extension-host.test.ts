import assert from 'node:assert/strict'
import test from 'node:test'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  installStExtensionHost,
  type StExtensionSessionBinding,
} from '../src/client/st-extension-host.ts'
import { InstalledStExtensionRegistry } from '../src/client/st-extension-registry.ts'
import { InstalledStExtensionSurface } from '../src/client/st-extension-surface.tsx'
import { agentRpProjectionDefinition } from '../src/projection.ts'

class FakeFrame {
  readonly messages: unknown[] = []
  readonly contentWindow = {
    postMessage: (message: unknown): void => { this.messages.push(message) },
  }
  readonly dataset: Record<string, string> = {}
  readonly attributes = new Map<string, string>()
  readonly style: Record<string, string> = {}
  hidden = false
  referrerPolicy = ''
  removed = false
  srcdoc = ''
  title = ''

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  remove(): void {
    this.removed = true
  }
}

class FakeDocument {
  readonly frames: FakeFrame[] = []
  readonly body = {
    append: (frame: FakeFrame): void => { this.frames.push(frame) },
  }

  createElement(name: string): FakeFrame {
    assert.equal(name, 'iframe')
    return new FakeFrame()
  }
}

class FakeWindow {
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>()

  addEventListener(name: string, listener: EventListenerOrEventListenerObject): void {
    assert.equal(name, 'message')
    this.listeners.add(listener as (event: MessageEvent<unknown>) => void)
  }

  removeEventListener(name: string, listener: EventListenerOrEventListenerObject): void {
    assert.equal(name, 'message')
    this.listeners.delete(listener as (event: MessageEvent<unknown>) => void)
  }

  dispatch(source: object, data: unknown): void {
    for (const listener of this.listeners) listener({ source, data } as MessageEvent<unknown>)
  }
}

class FakeSessionSource {
  currentBinding: StExtensionSessionBinding | undefined = {
    sessionId: SessionId('session-a'),
    projection: agentRpProjectionDefinition.wire.view(agentRpProjectionDefinition.init()),
  }
  readonly listeners = new Set<() => void>()

  current(): StExtensionSessionBinding | undefined {
    return this.currentBinding
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  select(sessionId: string | undefined): void {
    this.currentBinding = sessionId === undefined ? undefined : {
      sessionId: SessionId(sessionId),
      ...(this.currentBinding?.projection === undefined ? {} : { projection: this.currentBinding.projection }),
    }
    for (const listener of this.listeners) listener()
  }

  updateProjection(projection: NonNullable<StExtensionSessionBinding['projection']>): void {
    const current = this.currentBinding
    if (current === undefined) throw new Error('Cannot update a missing Session projection')
    this.currentBinding = { sessionId: current.sessionId, projection }
    for (const listener of this.listeners) listener()
  }
}

async function flushRebuild(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

test('coalesces registrations into one frame, rebuilds once, and tears down completely', async () => {
  const registry = new InstalledStExtensionRegistry()
  const document = new FakeDocument()
  const window = new FakeWindow()
  const warnings: string[] = []
  const writes: unknown[] = []
  const sessions = new FakeSessionSource()
  const dispose = installStExtensionHost(
    window as unknown as Window,
    document as unknown as Document,
    registry,
    sessions,
    {
      read: async () => ({ fixture: { enabled: true } }),
      write: async settings => { writes.push(settings); return settings },
    },
    message => { warnings.push(message) },
  )
  const revokeA = registry.register({
    id: 'extension.a', displayName: 'A', loadingOrder: 0, source: 'export {}',
  })
  const revokeB = registry.register({
    id: 'extension.b', displayName: 'B', loadingOrder: 1, source: 'export {}',
  })
  await flushRebuild()

  assert.equal(document.frames.length, 1)
  const first = document.frames[0] as FakeFrame
  assert.equal(first.hidden, true)
  assert.equal(first.attributes.get('sandbox'), 'allow-scripts allow-same-origin allow-forms')
  assert.match(first.srcdoc, /extension\.a/u)
  assert.match(first.srcdoc, /extension\.b/u)
  assert.match(first.srcdoc, /fixture/u)
  assert.match(first.srcdoc, /session-a/u)
  assert.match(first.srcdoc, /角色会话/u)

  window.dispatch(first.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host',
    token: JSON.parse(first.srcdoc.match(/const boot=(\{.*?\});const entries/u)?.[1] ?? '{}').token,
    action: 'host-state', status: 'ready', loaded: ['extension.a'], failed: ['extension.b'],
  })
  assert.equal(first.dataset.agentRpStExtensionPhase, 'ready')
  assert.equal(first.dataset.agentRpStExtensionLoaded, '1')
  assert.equal(first.dataset.agentRpStExtensionFailed, '1')
  window.dispatch(first.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host',
    token: JSON.parse(first.srcdoc.match(/const boot=(\{.*?\});const entries/u)?.[1] ?? '{}').token,
    action: 'settings-save', settings: { fixture: { enabled: false } },
  })
  await flushRebuild()
  assert.deepEqual(writes, [{ fixture: { enabled: false } }])
  sessions.select('session-b')
  assert.equal(document.frames.length, 1)
  const sessionMessage = first.messages[0] as {
    readonly source: string
    readonly action: string
    readonly token: string
    readonly sessionId: string
    readonly snapshot: { readonly characterName: string }
  }
  assert.equal(sessionMessage.source, 'dsh-agent-rp-host')
  assert.equal(sessionMessage.action, 'session-bind')
  assert.equal(sessionMessage.token,
    JSON.parse(first.srcdoc.match(/const boot=(\{.*?\});const entries/u)?.[1] ?? '{}').token)
  assert.equal(sessionMessage.sessionId, 'session-b')
  assert.equal(sessionMessage.snapshot.characterName, '角色会话')
  const changedProjection = {
    ...sessions.currentBinding!.projection!,
    characterName: '页面更新',
  }
  sessions.updateProjection(changedProjection)
  const projectionMessage = first.messages[1] as {
    readonly action: string
    readonly sessionId: string
    readonly snapshot: { readonly characterName: string }
  }
  assert.equal(projectionMessage.action, 'page-sync')
  assert.equal(projectionMessage.sessionId, 'session-b')
  assert.equal(projectionMessage.snapshot.characterName, '页面更新')

  registry.register({
    id: 'extension.c', displayName: 'C', loadingOrder: 2, source: 'export {}',
  })
  await flushRebuild()
  assert.equal(document.frames.length, 2)
  assert.equal(first.removed, true)

  revokeA()
  revokeB()
  await flushRebuild()
  assert.equal(document.frames.length, 3)
  dispose()
  assert.equal(document.frames.at(-1)?.removed, true)
  assert.equal(window.listeners.size, 0)
  assert.equal(sessions.listeners.size, 0)
  assert.deepEqual(warnings, [])
})

test('ignores stale frames and reports bounded current-frame failures', async () => {
  const registry = new InstalledStExtensionRegistry()
  const document = new FakeDocument()
  const window = new FakeWindow()
  const warnings: string[] = []
  const sessions = new FakeSessionSource()
  const dispose = installStExtensionHost(
    window as unknown as Window,
    document as unknown as Document,
    registry,
    sessions,
    { read: async () => ({}), write: async settings => settings },
    message => { warnings.push(message) },
  )
  registry.register({
    id: 'extension.failure', displayName: 'Failure', loadingOrder: 0, source: 'throw new Error()',
  })
  await flushRebuild()
  const frame = document.frames[0] as FakeFrame
  const token = JSON.parse(frame.srcdoc.match(/const boot=(\{.*?\});const entries/u)?.[1] ?? '{}').token as string
  window.dispatch({}, {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'extension-state', extensionId: 'extension.failure', status: 'failed', error: 'stale',
  })
  window.dispatch(frame.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'extension-state', extensionId: 'extension.failure', status: 'failed', error: 'boom',
  })
  window.dispatch(frame.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'settings-surface', hasContent: true,
  })

  assert.deepEqual(warnings, ['agent-rp: installed ST extension "extension.failure" failed: boom'])
  assert.equal(frame.dataset.agentRpStExtensionSettings, 'visible')
  dispose()
})

test('mounts a visible frame in the product surface and synchronizes its state', async () => {
  const registry = new InstalledStExtensionRegistry()
  const document = new FakeDocument()
  const window = new FakeWindow()
  const sessions = new FakeSessionSource()
  const surface = new InstalledStExtensionSurface()
  const mounted: FakeFrame[] = []
  surface.bindFrameMount(frame => { mounted.push(frame as unknown as FakeFrame) })
  const dispose = installStExtensionHost(
    window as unknown as Window,
    document as unknown as Document,
    registry,
    sessions,
    { read: async () => ({}), write: async settings => settings },
    () => undefined,
    surface,
  )
  registry.register({
    id: 'extension.settings', displayName: 'Settings', loadingOrder: 0, source: 'export {}',
  })
  await flushRebuild()

  assert.equal(document.frames.length, 0)
  assert.equal(mounted.length, 1)
  const first = mounted[0] as FakeFrame
  assert.equal(first.hidden, false)
  assert.equal(first.style.height, '100%')
  const token = JSON.parse(first.srcdoc.match(/const boot=(\{.*?\});const entries/u)?.[1] ?? '{}').token as string
  window.dispatch(first.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'settings-surface', hasContent: true,
  })
  window.dispatch(first.contentWindow, {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'host-state', status: 'ready', loaded: ['extension.settings'], failed: [],
  })
  surface.open()
  assert.deepEqual(surface.getSnapshot(), {
    available: true,
    failed: 0,
    loaded: 1,
    open: true,
    phase: 'ready',
    registryRevision: 1,
  })

  surface.close()
  assert.equal(first.removed, false)
  assert.equal(mounted.length, 1)
  dispose()
  assert.equal(first.removed, true)
  assert.equal(surface.getSnapshot().phase, 'idle')
})
