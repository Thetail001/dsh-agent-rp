import assert from 'node:assert/strict'
import test from 'node:test'
import { InstalledStExtensionSurface } from '../src/client/st-extension-surface.tsx'

interface FakeFrame {
  hidden: boolean
  readonly style: Record<string, string>
}

function fakeFrame(): FakeFrame {
  return { hidden: true, style: {} }
}

test('retains a frame until its permanent mount becomes available', () => {
  const surface = new InstalledStExtensionSurface()
  const frame = fakeFrame()
  const mounted: FakeFrame[] = []

  surface.attachFrame(frame as unknown as HTMLIFrameElement, 7)
  assert.deepEqual(surface.getSnapshot(), {
    available: false,
    failed: 0,
    loaded: 0,
    open: false,
    phase: 'booting',
    registryRevision: 7,
  })
  assert.equal(frame.hidden, false)
  assert.equal(frame.style.display, 'block')
  assert.equal(mounted.length, 0)

  const releaseMount = surface.bindFrameMount(next => {
    mounted.push(next as unknown as FakeFrame)
  })
  assert.deepEqual(mounted, [frame])
  assert.throws(
    () => surface.bindFrameMount(() => undefined),
    /already has a frame mount/u,
  )

  releaseMount()
  const rebound: FakeFrame[] = []
  surface.bindFrameMount(next => {
    rebound.push(next as unknown as FakeFrame)
  })
  assert.deepEqual(rebound, [frame])
})

test('publishes availability and host state without detaching a closed frame', () => {
  const surface = new InstalledStExtensionSurface()
  const frame = fakeFrame()
  const staleFrame = fakeFrame()
  let notifications = 0
  const unsubscribe = surface.subscribe(() => { notifications += 1 })

  surface.open()
  assert.equal(notifications, 0)
  surface.attachFrame(frame as unknown as HTMLIFrameElement, 3)
  surface.setHostState('ready', 2, 1)
  surface.setAvailable(true)
  surface.open()
  assert.deepEqual(surface.getSnapshot(), {
    available: true,
    failed: 1,
    loaded: 2,
    open: true,
    phase: 'ready',
    registryRevision: 3,
  })

  surface.close()
  assert.equal(surface.getSnapshot().open, false)
  surface.bindFrameMount(next => { assert.equal(next, frame) })
  surface.detachFrame(staleFrame as unknown as HTMLIFrameElement)
  assert.equal(surface.getSnapshot().available, true)

  surface.setAvailable(false)
  assert.equal(surface.getSnapshot().open, false)
  surface.detachFrame(frame as unknown as HTMLIFrameElement)
  assert.deepEqual(surface.getSnapshot(), {
    available: false,
    failed: 0,
    loaded: 0,
    open: false,
    phase: 'idle',
    registryRevision: 3,
  })
  unsubscribe()
  assert.equal(notifications, 7)
})

test('dispose releases the retained frame, mount, state, and listeners', () => {
  const surface = new InstalledStExtensionSurface()
  const frame = fakeFrame()
  let notifications = 0
  surface.subscribe(() => { notifications += 1 })
  surface.bindFrameMount(() => undefined)
  surface.attachFrame(frame as unknown as HTMLIFrameElement, 11)
  surface.setAvailable(true)

  surface.dispose()
  assert.deepEqual(surface.getSnapshot(), {
    available: false,
    failed: 0,
    loaded: 0,
    open: false,
    phase: 'idle',
    registryRevision: 0,
  })
  assert.doesNotThrow(() => surface.bindFrameMount(() => undefined))
  surface.setAvailable(true)
  assert.equal(notifications, 2)
})
