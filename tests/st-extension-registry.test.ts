import assert from 'node:assert/strict'
import test from 'node:test'
import {
  InstalledStExtensionRegistry,
} from '../src/client/st-extension-registry.ts'
import type { AgentRpInstalledStExtensionRegistration } from '../src/client-extension-v0.ts'

function extension(
  id: string,
  loadingOrder: number,
  overrides: Partial<AgentRpInstalledStExtensionRegistration> = {},
): AgentRpInstalledStExtensionRegistration {
  return {
    id,
    displayName: id,
    loadingOrder,
    source: `window[${JSON.stringify(id)}] = true`,
    ...overrides,
  }
}

test('publishes stable immutable snapshots in manifest order and revokes idempotently', () => {
  const registry = new InstalledStExtensionRegistry()
  const initial = registry.getSnapshot()
  const revisions: number[] = []
  const unsubscribe = registry.subscribe(() => { revisions.push(registry.getSnapshot().revision) })
  const revokeB = registry.register(extension('extension.b', 20))
  const afterB = registry.getSnapshot()
  const revokeC = registry.register(extension('extension.c', 10))
  const revokeA = registry.register(extension('extension.a', 10))

  assert.equal(registry.getSnapshot(), registry.getSnapshot())
  assert.notEqual(initial, afterB)
  assert.deepEqual(registry.getSnapshot().entries.map(entry => entry.id), [
    'extension.a', 'extension.c', 'extension.b',
  ])
  assert.equal(Object.isFrozen(registry.getSnapshot()), true)
  assert.equal(Object.isFrozen(registry.getSnapshot().entries), true)
  assert.equal(Object.isFrozen(registry.getSnapshot().entries[0]?.dependencies), true)

  revokeB()
  revokeB()
  revokeC()
  revokeA()
  unsubscribe()
  assert.deepEqual(revisions, [1, 2, 3, 4, 5, 6])
  assert.deepEqual(registry.getSnapshot().entries, [])
  assert.equal(registry.getSnapshot().totalBytes, 0)
})

test('isolates a throwing subscriber without skipping later subscribers', () => {
  const registry = new InstalledStExtensionRegistry()
  const original = console.error
  const errors: unknown[][] = []
  console.error = (...args: unknown[]) => { errors.push(args) }
  let observed = 0
  try {
    registry.subscribe(() => { throw new Error('subscriber failed') })
    registry.subscribe(() => { observed += 1 })
    registry.register(extension('extension.listener', 0))
  } finally {
    console.error = original
  }
  assert.equal(observed, 1)
  assert.equal(errors.length, 1)
})

test('rejects malformed manifests, duplicates, self dependencies, and per-entry limits', () => {
  const registry = new InstalledStExtensionRegistry()
  registry.register(extension('extension.valid', 0, { dependencies: ['extension.base'] }))
  assert.throws(() => registry.register(extension('extension.valid', 1)), /already registered/u)
  assert.throws(() => registry.register(extension(' bad', 0)), /must match/u)
  assert.throws(() => registry.register(extension('extension.name', 0, { displayName: ' padded ' })), /surrounding/u)
  assert.throws(() => registry.register(extension('extension.order', 1.5)), /safe integer/u)
  assert.throws(() => registry.register(extension('extension.self', 0, {
    dependencies: ['extension.self'],
  })), /depend on itself/u)
  assert.throws(() => registry.register(extension('extension.dupe-dependency', 0, {
    dependencies: ['extension.base', 'extension.base'],
  })), /must be unique/u)
  assert.throws(() => registry.register(extension('extension.empty', 0, { source: '' })), /non-empty/u)
  assert.throws(() => registry.register(extension('extension.large', 0, {
    source: 'x'.repeat(2 * 1024 * 1024 + 1),
  })), /exceeds/u)
})

test('enforces aggregate bytes and entry count before mutating the snapshot', () => {
  const sourceBytes = 2 * 1024 * 1024 - 100
  const registry = new InstalledStExtensionRegistry()
  for (let index = 0; index < 4; index += 1) {
    registry.register(extension(`extension.chunk${String(index)}`, index, {
      displayName: 'chunk',
      source: 'x'.repeat(sourceBytes),
    }))
  }
  const before = registry.getSnapshot()
  assert.throws(() => registry.register(extension('extension.overflow', 5, {
    source: 'x'.repeat(512),
  })), /aggregate bytes/u)
  assert.equal(registry.getSnapshot(), before)

  const countRegistry = new InstalledStExtensionRegistry()
  for (let index = 0; index < 64; index += 1) {
    countRegistry.register(extension(`extension.count${String(index)}`, index))
  }
  const countBefore = countRegistry.getSnapshot()
  assert.throws(() => countRegistry.register(extension('extension.count-overflow', 65)), /count exceeds/u)
  assert.equal(countRegistry.getSnapshot(), countBefore)
})
