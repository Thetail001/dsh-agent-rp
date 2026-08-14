import assert from 'node:assert/strict'
import test from 'node:test'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import {
  canTogglePresetPrompt,
  configurePreset,
  parsePresetConfigurationRequest,
} from '../src/preset-configuration.ts'
import { createPresetSessionSeed, readActiveSessionPreset } from '../src/import/session-preset.ts'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'
import { assembleSillyTavernPreset } from '../src/preset-prompt.ts'
import type { FileAttachmentRef } from '../src/import/session-character.ts'

const source = {
  attachmentId: 'preset-source',
  name: '可编辑预设.json',
  mediaType: 'application/json',
} as FileAttachmentRef

function importedPreset() {
  return parseSillyTavernPresetJson(JSON.stringify({
    prompts: [
      { identifier: 'main', name: '主提示', role: 'system', content: 'main', marker: true },
      { identifier: 'style', name: '文风', role: 'system', content: 'style', marker: false },
      { identifier: 'private-marker', name: '扩展结构位', role: 'system', content: '', marker: true },
    ],
    prompt_order: [{ character_id: 100001, order: [
      { identifier: 'main', enabled: true },
      { identifier: 'style', enabled: false },
      { identifier: 'private-marker', enabled: false },
    ] }],
    temperature: 0.8,
    openai_max_tokens: 2048,
  }), source.name)
}

function activePreset() {
  const preset = importedPreset()
  return {
    result: {
      version: 0 as const,
      name: preset.name,
      sourceEventSeq: 0,
      sourceAttachmentId: String(source.attachmentId),
      promptCount: preset.prompts.length,
      enabledCount: 1,
      regexScriptCount: 0,
    },
    importedPreset: preset,
    preset,
    revision: 0,
  }
}

test('edits module switches, order, and generation without changing imported defaults', () => {
  const active = activePreset()
  const edited = configurePreset(active, {
    operation: 'replace',
    revision: 0,
    order: [
      { identifier: 'style', enabled: true },
      { identifier: 'main', enabled: true },
    ],
    content: [],
    generation: { temperature: 1.1, maxTokens: null, reasoningEffort: 'high' },
    regex: [],
  })

  assert.deepEqual(edited.order, [
    { identifier: 'style', enabled: true },
    { identifier: 'main', enabled: true },
  ])
  assert.deepEqual(edited.generation, { temperature: 1.1, reasoningEffort: 'high' })
  assert.equal(active.importedPreset.order[0]?.identifier, 'main')
  assert.deepEqual(active.importedPreset.generation, { temperature: 0.8, maxTokens: 2048 })
})

test('adds, runs, edits, and deletes one session-owned module', () => {
  const active = activePreset()
  const prompts = active.preset.prompts.map(prompt => ({
    identifier: prompt.identifier, name: prompt.name, role: prompt.role, content: prompt.content,
  }))
  const added = configurePreset(active, {
    operation: 'replace', revision: 0,
    prompts: [...prompts, {
      identifier: 'custom', name: '自定义', role: 'user', content: '只在本会话使用',
      injectionPosition: 0, injectionDepth: 4, injectionOrder: 100,
    }],
    order: [...active.preset.order, { identifier: 'custom', enabled: true }],
    content: [], generation: {}, regex: [],
  })
  assert.equal(added.prompts.at(-1)?.systemPrompt, false)
  assert.equal(added.prompts.at(-1)?.marker, false)
  assert.equal(added.prompts.at(-1)?.injectionPosition, 0)
  assert.match(assembleSillyTavernPreset(added, {
    card: {
      format: 0, version: 2, specVersion: '2.0', name: '角色', description: '', personality: '', scenario: '',
      firstMessage: '', messageExample: '', alternateGreetings: [], systemPrompt: '', postHistoryInstructions: '',
      frontend: { regexScripts: [], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {} }, degradations: [], raw: {},
    },
    worldInfoBefore: [], worldInfoAfter: [], session: Session.create(SessionId('custom-preset-prompt')), pendingMessages: [],
  }).system, /SillyTavern user prompt · 自定义.*只在本会话使用/su)

  const deleted = configurePreset({ ...active, preset: added, revision: 1 }, {
    operation: 'replace', revision: 1, prompts,
    order: active.preset.order, content: [], generation: {}, regex: [],
  })
  assert.equal(deleted.prompts.some(prompt => prompt.identifier === 'custom'), false)
  assert.throws(() => configurePreset(active, {
    operation: 'replace', revision: 0,
    prompts: prompts.filter(prompt => prompt.identifier !== 'main'),
    order: active.preset.order.filter(entry => entry.identifier !== 'main'),
    content: [], generation: {}, regex: [],
  }), /built-in module.*cannot be deleted/u)
  assert.throws(() => parsePresetConfigurationRequest(JSON.stringify({
    operation: 'replace', revision: 0,
    prompts: [...prompts, {
      identifier: 'bad-depth', name: '错误深度', role: 'system', content: '',
      injectionPosition: 1, injectionDepth: -1, injectionOrder: 100,
    }],
    order: active.preset.order, content: [], generation: {}, regex: [],
  })), /injectionDepth/u)
})

test('keeps extension markers fixed and restores the exact imported defaults', () => {
  const active = activePreset()
  assert.equal(canTogglePresetPrompt(active.preset, 'style'), true)
  assert.equal(canTogglePresetPrompt(active.preset, 'main'), true)
  assert.equal(canTogglePresetPrompt(active.preset, 'private-marker'), false)
  assert.throws(() => configurePreset(active, {
    operation: 'toggle', revision: 0, identifier: 'private-marker', enabled: true,
  }), /no configurable switch/u)

  const reset = configurePreset({
    ...active,
    preset: { ...active.preset, order: [{ identifier: 'style', enabled: true }] },
    revision: 3,
  }, { operation: 'reset', revision: 3 })
  assert.deepEqual(reset, active.importedPreset)
})

test('replays the latest session configuration and rejects stale editor revisions', () => {
  const preset = importedPreset()
  const seed = createPresetSessionSeed([], preset, source)
  const configured: SessionEvent<'command/run'> = {
    type: 'command/run',
    seq: 1,
    time: Date.now(),
    data: {
      commandId: CommandId('preset-test'),
      name: 'rp-preset-configure',
      args: JSON.stringify({
        operation: 'replace',
        revision: 0,
        order: preset.order.map(entry => ({ ...entry, enabled: entry.identifier !== 'private-marker' })),
        content: [{ identifier: 'style', content: 'edited style' }],
        generation: {},
        regex: [],
      }),
      source: { kind: 'user' },
    },
  }
  const replayed = readActiveSessionPreset([...seed, configured])
  assert.equal(replayed?.revision, 1)
  assert.equal(replayed?.preset.order.find(entry => entry.identifier === 'style')?.enabled, true)
  assert.equal(replayed?.preset.prompts.find(entry => entry.identifier === 'style')?.content, 'edited style')
  assert.equal(replayed?.importedPreset.prompts.find(entry => entry.identifier === 'style')?.content, 'style')
  const assembled = assembleSillyTavernPreset(replayed!.preset, {
    card: {
      format: 0, version: 2, specVersion: '2.0', name: '角色', description: '', personality: '', scenario: '',
      firstMessage: '', messageExample: '', alternateGreetings: [], systemPrompt: '', postHistoryInstructions: '',
      frontend: { regexScripts: [], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {} }, degradations: [], raw: {},
    },
    worldInfoBefore: [], worldInfoAfter: [], session: Session.create(SessionId('configured-preset-prompt')), pendingMessages: [],
  })
  assert.match(assembled.system, /edited style/u)
  assert.doesNotMatch(assembled.system, /^style$/mu)
  assert.equal(replayed?.importedPreset.order[1]?.enabled, false)
  assert.throws(() => configurePreset(replayed!, {
    operation: 'toggle', revision: 0, identifier: 'style', enabled: false,
  }), /expected revision 1/u)
})

test('decodes the private manager command at its Host boundary', () => {
  assert.deepEqual(parsePresetConfigurationRequest(JSON.stringify({
    operation: 'move', revision: 4, identifier: 'style', before: 'main',
  })), { operation: 'move', revision: 4, identifier: 'style', before: 'main' })
  assert.throws(() => parsePresetConfigurationRequest('{'), /valid JSON/u)
  assert.throws(() => parsePresetConfigurationRequest(JSON.stringify({
    operation: 'replace', revision: 0,
    order: [{ identifier: 'style', enabled: true }, { identifier: 'style', enabled: false }],
    content: [], generation: {}, regex: [],
  })), /repeats module/u)
  assert.throws(() => configurePreset(activePreset(), {
    operation: 'replace', revision: 0, order: activePreset().preset.order,
    content: [{ identifier: 'main', content: 'cannot edit a marker' }], generation: {}, regex: [],
  }), /no editable content/u)
  assert.deepEqual(parsePresetConfigurationRequest(JSON.stringify({
    operation: 'generation', revision: 0, reasoningEffort: 'provider-owned-level',
  })), { operation: 'generation', revision: 0, reasoningEffort: 'provider-owned-level' })
})

test('edits preset regex switches and depths independently from prompt modules', () => {
  const preset = parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: 'main', marker: true }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
    extensions: { regex_scripts: [{
      scriptName: '隐藏元数据', findRegex: '/<meta>[\\s\\S]*?<\\/meta>/gu', replaceString: '',
      trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: true,
      runOnEdit: false, substituteRegex: 0, minDepth: null, maxDepth: null,
    }] },
  }), 'regex.json')
  const active = {
    ...activePreset(),
    importedPreset: preset,
    preset,
    result: { ...activePreset().result, regexScriptCount: 1 },
  }
  const disabled = configurePreset(active, {
    operation: 'replace', revision: 0, order: preset.order, content: [], generation: {},
    regex: [{ index: 0, disabled: true, minDepth: 2, maxDepth: 8 }],
  })
  assert.equal(disabled.regexScripts[0]?.disabled, true)
  assert.equal(disabled.regexScripts[0]?.minDepth, 2)
  assert.equal(disabled.regexScripts[0]?.maxDepth, 8)
  assert.equal(disabled.order[0]?.enabled, true)
  const decoded = parsePresetConfigurationRequest(JSON.stringify({
    operation: 'replace', revision: 0, order: preset.order, content: [], generation: {},
    regex: [{ index: 0, disabled: false, minDepth: null, maxDepth: -1 }],
  }))
  assert.equal(decoded.operation, 'replace')
  if (decoded.operation !== 'replace') assert.fail('expected replace operation')
  assert.deepEqual(decoded.regex, [{ index: 0, disabled: false, minDepth: null, maxDepth: -1 }])
  assert.throws(() => parsePresetConfigurationRequest(JSON.stringify({
    operation: 'replace', revision: 0, order: preset.order, content: [], generation: {},
    regex: [{ index: 0, disabled: false, minDepth: '2' }],
  })), /minDepth/u)
  assert.throws(() => configurePreset(active, {
    operation: 'replace', revision: 0, order: preset.order, content: [], generation: {}, regex: [{ index: 1, disabled: true }],
  }), /does not match/u)
})
