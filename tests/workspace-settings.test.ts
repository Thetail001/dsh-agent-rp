import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  DEFAULT_AGENT_RP_SETTINGS,
  allowsAgentRpEntry,
  normalizeAgentRpSettings,
  setAgentRpWorkspaceEntry,
} from '../src/workspace-settings.ts'
import { WorkspaceSettingsStore } from '../src/workspace-settings-store.ts'

test('workspace entry defaults to every workspace while settings load', () => {
  assert.equal(allowsAgentRpEntry(undefined, undefined), true)
  assert.equal(allowsAgentRpEntry(undefined, 'workspace-a'), true)
})

test('all-workspace mode allows registered and ungrouped sessions', () => {
  const settings = { workspaceMode: 'all' as const, workspaceIds: [], workspaceExcludedIds: [] }
  assert.equal(allowsAgentRpEntry(settings, 'workspace-a'), true)
  assert.equal(allowsAgentRpEntry(settings, undefined), true)
})

test('all-workspace mode can exclude one workspace without changing the default', () => {
  const settings = {
    ...DEFAULT_AGENT_RP_SETTINGS,
    workspaceExcludedIds: ['workspace-a'],
  }
  assert.equal(allowsAgentRpEntry(settings, 'workspace-a'), false)
  assert.equal(allowsAgentRpEntry(settings, 'workspace-b'), true)
  assert.equal(allowsAgentRpEntry(settings, undefined), true)
})

test('selected-workspace mode allows only listed workspace ids', () => {
  const settings = { workspaceMode: 'selected' as const, workspaceIds: ['workspace-a'], workspaceExcludedIds: [] }
  assert.equal(allowsAgentRpEntry(settings, 'workspace-a'), true)
  assert.equal(allowsAgentRpEntry(settings, 'workspace-b'), false)
})

test('selected-workspace mode hides entry points from ungrouped sessions', () => {
  const settings = { workspaceMode: 'selected' as const, workspaceIds: ['workspace-a'], workspaceExcludedIds: [] }
  assert.equal(allowsAgentRpEntry(settings, undefined), false)
})

test('normalizes duplicate workspace ids and rejects malformed settings', () => {
  assert.deepEqual(normalizeAgentRpSettings({
    workspaceMode: 'selected', workspaceIds: ['workspace-a', 'workspace-a'],
  }), { ...DEFAULT_AGENT_RP_SETTINGS, workspaceMode: 'selected', workspaceIds: ['workspace-a'] })
  assert.throws(() => normalizeAgentRpSettings({ workspaceMode: 'selected', workspaceIds: [1] }))
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], workspaceExcludedIds: [1],
  }))
})

test('updates one workspace through the active policy list', () => {
  const excluded = setAgentRpWorkspaceEntry(DEFAULT_AGENT_RP_SETTINGS, 'workspace-a', false)
  assert.deepEqual(excluded.workspaceExcludedIds, ['workspace-a'])
  assert.equal(allowsAgentRpEntry(excluded, 'workspace-b'), true)
  assert.deepEqual(setAgentRpWorkspaceEntry(excluded, 'workspace-a', true).workspaceExcludedIds, [])

  const selected = { ...DEFAULT_AGENT_RP_SETTINGS, workspaceMode: 'selected' as const }
  const enabled = setAgentRpWorkspaceEntry(selected, 'workspace-a', true)
  assert.deepEqual(enabled.workspaceIds, ['workspace-a'])
  assert.deepEqual(setAgentRpWorkspaceEntry(enabled, 'workspace-a', false).workspaceIds, [])
})

test('adds default Comfy Cloud tool guidance to older settings documents', () => {
  const settings = normalizeAgentRpSettings({ workspaceMode: 'all', workspaceIds: [] })
  assert.equal(settings.toolGuidance.enabled, true)
  assert.equal(settings.toolGuidance.imageMode, 'auto')
  assert.equal(settings.toolGuidance.custom[0]?.id, 'comfy-cloud-saved-workflow')
  assert.match(settings.toolGuidance.custom[0]?.text ?? '', /run_saved_workflow/u)
})

test('normalizes editable tool guidance and rejects ambiguous entries', () => {
  const settings = normalizeAgentRpSettings({
    workspaceMode: 'all',
    workspaceIds: [],
    toolGuidance: {
      enabled: true,
      includeFramework: false,
      includeAgentRp: true,
      imageMode: 'always',
      custom: [{ id: ' local-comfy ', enabled: true, text: ' use_image_tool ' }],
    },
  })
  assert.deepEqual(settings.toolGuidance, {
    enabled: true,
    includeFramework: false,
    includeAgentRp: true,
    imageMode: 'always',
    custom: [{ id: 'local-comfy', enabled: true, text: 'use_image_tool' }],
  })
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [],
    toolGuidance: { custom: [{ id: 'duplicate', text: 'one' }, { id: 'duplicate', text: 'two' }] },
  }), /unique/u)
  assert.throws(() => normalizeAgentRpSettings({
    workspaceMode: 'all', workspaceIds: [], toolGuidance: { imageMode: 'sometimes' },
  }), /imageMode/u)
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

test('persists WebUI tool guidance for the character runtime', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-tool-guidance-settings-'))
  t.after(() => { rmSync(root, { recursive: true, force: true }) })
  const path = join(root, 'settings.json')
  const store = new WorkspaceSettingsStore({ path })
  const saved = store.set({
    ...DEFAULT_AGENT_RP_SETTINGS,
    toolGuidance: {
      enabled: true,
      includeFramework: true,
      includeAgentRp: true,
      imageMode: 'never',
      custom: [{ id: 'mcp-image', enabled: true, text: 'Call the configured MCP image tool.' }],
    },
  })
  assert.equal(saved.toolGuidance.imageMode, 'never')
  assert.deepEqual(new WorkspaceSettingsStore({ path }).get().toolGuidance, saved.toolGuidance)
})
