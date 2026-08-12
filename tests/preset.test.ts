import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { installBundledAgentRpPreset } from '../src/preset.ts'

const SOURCE = resolve('preset')

function temporaryRoot(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-agent-rp-preset-'))
}

test('installs one idempotent managed preset', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))

  assert.equal(installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }), 'created')
  assert.equal(installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }), 'unchanged')
  assert.match(readFileSync(join(root, 'agent-rp', 'agent.cordis.yml'), 'utf8'), /mode: character/u)
  assert.match(readFileSync(join(root, 'agent-rp', 'preset.yml'), 'utf8'), /角色会话/u)
})

test('refuses to replace a locally edited managed preset', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))
  installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE })
  writeFileSync(join(root, 'agent-rp', 'preset.yml'), 'name: 我的角色\n', 'utf8')

  assert.throws(
    () => installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }),
    /edited locally/u,
  )
})

test('refuses to claim an existing user preset with the reserved id', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))
  const target = join(root, 'agent-rp')
  mkdirSync(target)
  writeFileSync(join(target, 'agent.cordis.yml'), '[]\n', 'utf8')
  assert.throws(
    () => installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }),
    /not managed/u,
  )
})
