import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DEFAULT_AGENT_RP_SETTINGS, allowsAgentRpEntry, normalizeAgentRpSettings } from '../src/workspace-settings.ts'
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
  }), { ...DEFAULT_AGENT_RP_SETTINGS, workspaceMode: 'selected', workspaceIds: ['workspace-a'] })
  assert.throws(() => normalizeAgentRpSettings({ workspaceMode: 'selected', workspaceIds: [1] }))
})

test('adopts existing single image settings as the default profile', () => {
  const imageGeneration = {
    ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
    provider: 'a1111' as const,
    a1111: { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111, endpoint: 'http://127.0.0.1:7861' },
  }
  const settings = normalizeAgentRpSettings({ workspaceMode: 'all', workspaceIds: [], imageGeneration })
  assert.equal(settings.activeImageProfileId, 'default')
  assert.deepEqual(settings.imageGeneration, imageGeneration)
  assert.deepEqual(settings.imageProfiles, [{ id: 'default', name: '默认配置', settings: imageGeneration }])
})

test('normalizes a reusable ComfyUI API workflow', () => {
  const workflow = '{"1":{"class_type":"CLIPTextEncode","inputs":{"text":"{{prompt}}"}}}'
  const settings = normalizeAgentRpSettings({
    workspaceMode: 'all',
    workspaceIds: [],
    imageGeneration: {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'comfyui',
      comfyui: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui,
        endpoint: 'http://127.0.0.1:8188/',
        workflow,
        width: 640,
        height: 896,
      },
    },
  })
  assert.equal(settings.imageGeneration.provider, 'comfyui')
  assert.equal(settings.imageGeneration.comfyui.workflow, workflow)
  assert.equal(settings.imageGeneration.comfyui.width, 640)
})

test('normalizes NovelAI V4.5 image settings', () => {
  const settings = normalizeAgentRpSettings({
    workspaceMode: 'all',
    workspaceIds: [],
    imageGeneration: {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'novelai',
      novelai: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai,
        model: 'nai-diffusion-4-5-curated',
        width: 1024,
        height: 1024,
      },
    },
  })
  assert.equal(settings.imageGeneration.provider, 'novelai')
  assert.equal(settings.imageGeneration.novelai.model, 'nai-diffusion-4-5-curated')
  assert.equal(settings.imageGeneration.novelai.width, 1024)
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [],
    imageGeneration: {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'novelai',
      novelai: { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai, width: 1000 },
    },
  }), /64 的倍数/u)
})

test('uses the selected image profile and rejects ambiguous profile lists', () => {
  const local = {
    ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
    provider: 'a1111' as const,
    a1111: { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111, endpoint: 'http://127.0.0.1:7862' },
  }
  const imageProfiles = [
    { id: 'cloud', name: '云端', settings: DEFAULT_AGENT_RP_SETTINGS.imageGeneration },
    { id: 'local', name: '本地', settings: local },
  ]
  const settings = normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], activeImageProfileId: 'local', imageProfiles,
  })
  assert.equal(settings.imageGeneration.a1111.endpoint, 'http://127.0.0.1:7862')
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], activeImageProfileId: 'missing', imageProfiles,
  }))
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], activeImageProfileId: 'cloud', imageProfiles: [imageProfiles[0], imageProfiles[0]],
  }))
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], activeImageProfileId: 'cloud',
    imageProfiles: [imageProfiles[0], { ...imageProfiles[1], name: '云端' }],
  }))
})

test('persists workspace settings outside the DSH settings allowlist', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-workspace-settings-'))
  t.after(() => { rmSync(root, { recursive: true, force: true }) })
  const path = join(root, 'settings.json')
  const store = new WorkspaceSettingsStore({ path })
  assert.deepEqual(store.get(), DEFAULT_AGENT_RP_SETTINGS)
  assert.deepEqual(store.set({ workspaceMode: 'selected', workspaceIds: ['workspace-a'] }), {
    ...DEFAULT_AGENT_RP_SETTINGS, workspaceMode: 'selected', workspaceIds: ['workspace-a'],
  })
  assert.deepEqual(new WorkspaceSettingsStore({ path }).get(), {
    ...DEFAULT_AGENT_RP_SETTINGS, workspaceMode: 'selected', workspaceIds: ['workspace-a'],
  })
  assert.match(readFileSync(path, 'utf8'), /"format": 0/u)
})
