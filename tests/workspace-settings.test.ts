import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { allowsAgentRpEntry, normalizeAgentRpSettings } from '../src/workspace-settings.ts'
import { WorkspaceSettingsStore } from '../src/workspace-settings-store.ts'

test('workspace entry defaults to every workspace while settings load', () => {
  assert.equal(allowsAgentRpEntry(undefined, undefined), true)
  assert.equal(allowsAgentRpEntry(undefined, 'workspace-a'), true)
})

test('all-workspace mode allows registered and ungrouped sessions', () => {
  const settings = { workspaceMode: 'all' as const, workspaceIds: [] }
  assert.equal(allowsAgentRpEntry(settings, 'workspace-a'), true)
  assert.equal(allowsAgentRpEntry(settings, undefined), true)
})

test('selected-workspace mode allows only listed workspace ids', () => {
  const settings = { workspaceMode: 'selected' as const, workspaceIds: ['workspace-a'] }
  assert.equal(allowsAgentRpEntry(settings, 'workspace-a'), true)
  assert.equal(allowsAgentRpEntry(settings, 'workspace-b'), false)
})

test('selected-workspace mode hides entry points from ungrouped sessions', () => {
  const settings = { workspaceMode: 'selected' as const, workspaceIds: ['workspace-a'] }
  assert.equal(allowsAgentRpEntry(settings, undefined), false)
})

test('normalizes duplicate workspace ids and rejects malformed settings', () => {
  assert.deepEqual(normalizeAgentRpSettings({
    workspaceMode: 'selected', workspaceIds: ['workspace-a', 'workspace-a'],
  }), { workspaceMode: 'selected', workspaceIds: ['workspace-a'] })
  assert.throws(() => normalizeAgentRpSettings({ workspaceMode: 'selected', workspaceIds: [1] }))
})

test('persists workspace settings outside the DSH settings allowlist', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-workspace-settings-'))
  t.after(() => { rmSync(root, { recursive: true, force: true }) })
  const path = join(root, 'settings.json')
  const store = new WorkspaceSettingsStore({ path })
  assert.deepEqual(store.get(), { workspaceMode: 'all', workspaceIds: [] })
  assert.deepEqual(store.set({ workspaceMode: 'selected', workspaceIds: ['workspace-a'] }), {
    workspaceMode: 'selected', workspaceIds: ['workspace-a'],
  })
  assert.deepEqual(new WorkspaceSettingsStore({ path }).get(), {
    workspaceMode: 'selected', workspaceIds: ['workspace-a'],
  })
  assert.match(readFileSync(path, 'utf8'), /"format": 0/u)
})
