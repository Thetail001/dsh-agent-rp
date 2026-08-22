import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attachPresetModule,
  detachPresetModule,
  movePresetModule,
} from '../src/preset-module-assembly.ts'

const modules = [
  { identifier: 'system', attached: true, enabled: true, content: 'system' },
  { identifier: 'default-style', attached: true, enabled: true, content: 'default' },
  { identifier: 'choice-a', attached: false, enabled: false, content: 'choice a' },
  { identifier: 'choice-b', attached: false, enabled: false, content: 'choice b' },
] as const

test('installs a catalog module disabled at the end of the active order', () => {
  const attached = attachPresetModule(modules, 'choice-a')

  assert.deepEqual(attached.map(module => [module.identifier, module.attached, module.enabled]), [
    ['system', true, true],
    ['default-style', true, true],
    ['choice-a', true, false],
    ['choice-b', false, false],
  ])
  assert.equal(attached.find(module => module.identifier === 'choice-a')?.content, 'choice a')
})

test('moves an active module back to the catalog without deleting its definition', () => {
  const attached = attachPresetModule(modules, 'choice-a')
  const enabled = attached.map(module => module.identifier === 'choice-a' ? { ...module, enabled: true } : module)
  const detached = detachPresetModule(enabled, 'choice-a')

  assert.deepEqual(detached.map(module => [module.identifier, module.attached, module.enabled]), [
    ['system', true, true],
    ['default-style', true, true],
    ['choice-a', false, false],
    ['choice-b', false, false],
  ])
  assert.equal(detached.length, modules.length)
  assert.equal(detached.find(module => module.identifier === 'choice-a')?.content, 'choice a')
})

test('reorders only the active assembly and preserves catalog order', () => {
  const attached = attachPresetModule(modules, 'choice-a')
  const moved = movePresetModule(attached, 'choice-a', -1)

  assert.deepEqual(moved.map(module => module.identifier), [
    'system', 'choice-a', 'default-style', 'choice-b',
  ])
  assert.deepEqual(moved.filter(module => !module.attached).map(module => module.identifier), ['choice-b'])
})
