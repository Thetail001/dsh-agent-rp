import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { readActiveSessionPreset } from '../src/import/session-preset.ts'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'
import { configurePreset } from '../src/preset-configuration-core.ts'
import { PresetLibrary } from '../src/preset-library.ts'
import { executePresetLibraryCommand } from '../src/preset-library-command.ts'
import { parsePresetLibraryResult } from '../src/preset-library-protocol.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'

function preset(name = '通用预设') {
  return parseSillyTavernPresetJson(JSON.stringify({
    prompts: [
      { identifier: 'main', name: '主提示', role: 'system', content: '默认正文' },
      { identifier: 'style', name: '风格', role: 'system', content: '简短' },
    ],
    prompt_order: [{ character_id: 100001, order: [
      { identifier: 'main', enabled: true },
      { identifier: 'style', enabled: false },
    ] }],
    extensions: { regex_scripts: [], SPreset: { retained: true } },
  }), `${name}.json`)
}

let commandSequence = 0

function invoke(agent: Agent, library: PresetLibrary, request: object): void {
  const commandId = CommandId(`preset-library-${commandSequence++}`)
  const rawInput = JSON.stringify(request)
  agent.session.append('command/run', {
    commandId,
    name: 'rp-preset-library',
    args: ` ${rawInput}`,
    source: { kind: 'user' },
  })
  const result = executePresetLibraryCommand(library, { agent, rawInput })
  agent.session.append('command/done', { commandId, ...result })
}

function projected(agent: Agent) {
  let state = agentRpProjectionDefinition.init()
  for (const event of agent.session.events) state = agentRpProjectionDefinition.apply(state, event)
  return agentRpProjectionDefinition.view(state)
}

test('stores reusable presets outside settings and returns detached session defaults', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-preset-library-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new PresetLibrary({ root })
  const imported = library.import(preset())
  assert.equal(library.import(preset()).id, imported.id)
  assert.deepEqual(library.list().map(item => item.name), ['通用预设'])
  assert.equal(library.get(imported.id).preset.extensionSummary.hasSPreset, true)

  const selected = library.get(imported.id)
  const active = {
    result: {
      version: 0 as const, name: selected.name, sourceEventSeq: 0,
      sourceAttachmentId: `library:${selected.id}`, promptCount: 2, enabledCount: 1, regexScriptCount: 0,
    },
    importedPreset: selected.preset,
    preset: selected.preset,
    revision: 0,
    libraryId: selected.id,
  }
  const edited = configurePreset(active, { operation: 'toggle', revision: 0, identifier: 'style', enabled: true })
  assert.equal(edited.order.find(item => item.identifier === 'style')?.enabled, true)
  assert.equal(library.get(imported.id).preset.order.find(item => item.identifier === 'style')?.enabled, false)
})

test('selects, saves, lists, and deletes library presets without mutating an active snapshot', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-preset-library-command-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new PresetLibrary({ root })
  const imported = library.import(preset())
  const agent = { session: Session.create(SessionId('library-session')) } as Agent

  invoke(agent, library, { operation: 'select', id: imported.id })
  const active = readActiveSessionPreset(agent.session.events)
  assert.equal(active?.libraryId, imported.id)
  assert.equal(active?.preset.name, '通用预设')
  assert.equal(projected(agent).preset?.libraryId, imported.id)
  assert.deepEqual(projected(agent).presetLibrary.map(item => item.id), [imported.id])

  invoke(agent, library, { operation: 'save', name: '我的副本' })
  assert.deepEqual(library.list().map(item => item.name).sort(), ['我的副本', '通用预设'])
  const saved = library.list().find(item => item.name === '我的副本')!
  invoke(agent, library, { operation: 'delete', id: saved.id })
  assert.deepEqual(library.list().map(item => item.name), ['通用预设'])
  assert.equal(readActiveSessionPreset(agent.session.events)?.preset.name, '通用预设')
  assert.equal(agent.session.events.at(-1)?.type, 'command/done')
})

test('adopts an older session preset into the library without replacing its edited state', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-preset-library-adopt-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new PresetLibrary({ root })
  const imported = preset()
  const oldAgent = { session: Session.create(SessionId('pre-library'), [{
    type: 'agent-rp/sillytavern-preset-seed', seq: 0, time: Date.now(), ignorable: true,
    data: {
      format: 0,
      source: { attachmentConsumer: 'dsh-agent-rp', attachments: [{
        kind: 'file', attachmentId: 'sha256:old' as never, bytes: 1, name: 'old.json', mediaType: 'application/json',
      }] },
      result: { version: 0, name: imported.name, sourceEventSeq: 0, sourceAttachmentId: 'sha256:old',
        promptCount: 2, enabledCount: 1, regexScriptCount: 0 },
      preset: imported,
    },
  }]) } as Agent
  const configureId = CommandId('configure-old-preset')
  oldAgent.session.append('command/run', {
    commandId: configureId,
    name: 'rp-preset-configure',
    args: JSON.stringify({ operation: 'toggle', revision: 0, identifier: 'style', enabled: true }),
    source: { kind: 'user' },
  })
  oldAgent.session.append('command/done', { commandId: configureId, kind: 'success' })
  invoke(oldAgent, library, { operation: 'list' })
  const adopted = readActiveSessionPreset(oldAgent.session.events)!
  assert.equal(adopted.preset.order.find(item => item.identifier === 'style')?.enabled, true)
  assert.ok(adopted.libraryId)
  assert.equal(library.list().length, 1)
  assert.equal(projected(oldAgent).preset?.enabledCount, 2)
  assert.equal(projected(oldAgent).preset?.libraryId, adopted.libraryId)
})

test('keeps a selected session snapshot after its reusable library copy is deleted', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-preset-library-delete-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new PresetLibrary({ root })
  const imported = library.import(preset())
  const agent = { session: Session.create(SessionId('deleted-library-source')) } as Agent
  invoke(agent, library, { operation: 'select', id: imported.id })
  invoke(agent, library, { operation: 'delete', id: imported.id })
  assert.equal(library.list().length, 0)
  assert.equal(readActiveSessionPreset(agent.session.events)?.preset.name, '通用预设')
  assert.equal(projected(agent).preset?.name, '通用预设')
  assert.equal(projected(agent).presetLibrary.length, 0)
})

test('ignores unrelated command text and rejects malformed marked results', () => {
  assert.equal(parsePresetLibraryResult('普通命令结果'), undefined)
  assert.throws(() => parsePresetLibraryResult('agent-rp:preset-library:v0:{'), /不是有效 JSON/u)
  assert.throws(() => parsePresetLibraryResult('agent-rp:preset-library:v0:{"format":0,"operation":"list","entries":{}}'), /无效字段/u)
})

test('projects the Host-recorded request instead of reconstructing an inspection guess', () => {
  const imported = preset()
  const agent = { session: Session.create(SessionId('request-inspection'), [{
    type: 'agent-rp/sillytavern-preset-seed', seq: 0, time: 1, ignorable: true,
    data: {
      format: 0,
      source: { attachmentConsumer: 'dsh-agent-rp', attachments: [{
        kind: 'file', attachmentId: 'sha256:request' as never, bytes: 1,
        name: 'request.json', mediaType: 'application/json',
      }] },
      result: {
        version: 0, name: imported.name, sourceEventSeq: 0, sourceAttachmentId: 'sha256:request',
        promptCount: 2, enabledCount: 1, regexScriptCount: 0,
      },
      preset: imported,
    },
  }]) } as Agent
  agent.session.append('request/header', {
    reason: 'initial',
    header: {
      config: {
        provider: 'real-provider', model: 'real-model', reasoningEffort: 'high' as never,
        temperature: 0.7, maxTokens: 4096,
      },
      system: 'Host 最终组装内容',
      tools: [{ name: 'remember', description: 'memory', parameters: { type: 'object', properties: {} } }],
    },
  })
  const view = projected(agent)
  assert.equal(view.lastRequest?.system, 'Host 最终组装内容')
  assert.deepEqual(view.lastRequest?.config, {
    provider: 'real-provider', model: 'real-model', reasoningEffort: 'high', temperature: 0.7, maxTokens: 4096,
  })
  assert.deepEqual(view.lastRequest?.toolNames, ['remember'])
  assert.equal(view.lastRequest?.presetName, imported.name)
  assert.equal(view.lastRequest?.presetRevision, 0)
})
