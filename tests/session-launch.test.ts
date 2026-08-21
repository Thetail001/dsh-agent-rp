import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { Context } from '@deepseek-ai/cordis'
import { CharacterLibrary } from '../src/character-library.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { readActiveSessionPreset } from '../src/import/session-preset.ts'
import { readActiveSessionWorldInfos } from '../src/import/session-world-info.ts'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'
import { PresetLibrary } from '../src/preset-library.ts'
import {
  prepareAgentRpRewriteSession,
  prepareAgentRpSession,
  parseAgentRpSessionLaunchRequest,
} from '../src/session-launch.ts'
import { SillyTavernChatLibrary } from '../src/sillytavern-chat-library.ts'
import { readSessionPersona } from '../src/session-persona.ts'
import { WorldInfoLibrary } from '../src/world-info-library.ts'
import { launchAgentRpSession } from '../src/session-launch-http.ts'

function libraries(context: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-session-launch-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  return {
    characters: new CharacterLibrary({ root: join(root, 'characters') }),
    chats: new SillyTavernChatLibrary({ root: join(root, 'chats') }),
    presets: new PresetLibrary({ root: join(root, 'presets') }),
    worldInfos: new WorldInfoLibrary({ root: join(root, 'world-info') }),
  }
}

function appendConversationTurn(session: Session, turn: number, user: string, assistant: string): void {
  session.append('turn/start', { turn })
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: user }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  session.append('assistant/message', {
    turn,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: assistant }],
      source: { provider: 'fixture', model: 'fixture' },
    }),
  }, { surfaceOp: 'append' })
  session.append('turn/end', { turn, reason: { kind: 'completed' } })
}

test('prepares a library character before the Agent is constructed', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0, sourceSessionId: 'source', kind: 'character', characterId: character.id, greetingIndex: 0,
  })
  const session = Session.create(SessionId('launched-character'), prepared.seed)
  assert.equal(session.events.findLast(event => event.type === 'turn/start')?.data.turn, 1)
  assert.equal(readActiveSessionCharacter(session.events)?.result.libraryId, character.id)
  assert.equal(session.events[0]?.type, 'agent-rp/character-card-seed')
  if (session.events[0]?.type !== 'agent-rp/character-card-seed') assert.fail('missing character seed')
  assert.deepEqual(session.events[0].data.source, { characterLibraryId: character.id })
})

test('seeds a selected library preset into a new character Session', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const preset = presets.import(parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '保持角色语气' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  }), '会话预设.json'))
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0,
    sourceSessionId: 'source',
    kind: 'character',
    characterId: character.id,
    greetingIndex: 0,
    presetId: preset.id,
  })
  const session = Session.create(SessionId('launched-with-preset'), prepared.seed)
  const active = readActiveSessionPreset(session.events)
  assert.equal(active?.result.name, '会话预设')
  assert.equal(active?.libraryId, preset.id)
})

test('starts a replayable roleplay Session from standalone World Info without fabricating a character', context => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const worldInfo = worldInfos.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-world-info.json')),
    filename: '海城.json',
  })
  const preset = presets.import(parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '推动世界剧情' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  }), '剧情预设.json'))
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0,
    sourceSessionId: 'source',
    kind: 'world-info',
    importId: worldInfo.id,
    persona: { id: 'persona-01234567', name: '旅人', description: '刚刚抵达海城。' },
    presetId: preset.id,
  })
  const first = Session.create(SessionId('launched-world-info'), prepared.seed)
  const replay = Session.create(SessionId('replayed-world-info'), [...first.events])

  assert.equal(prepared.title, '海城')
  assert.equal(first.events[0]?.type, 'agent-rp/world-info-library-seed')
  assert.deepEqual(
    first.events.filter(event => event.type === 'turn/start' || event.type === 'turn/end')
      .map(event => event.type),
    ['turn/start', 'turn/end'],
  )
  assert.equal(first.events.some(event => event.type === 'step/start' || event.type === 'step/end'), false)
  assert.equal(first.events.some(event => event.type === 'user/message' || event.type === 'assistant/message'), false)
  assert.deepEqual(first.deriveMessages(), [])
  assert.equal(readActiveSessionCharacter(replay.events), undefined)
  assert.equal(readActiveSessionWorldInfos(replay.events)[0]?.result.name, '海城')
  assert.equal(readSessionPersona(replay.events)?.name, '旅人')
  assert.equal(readActiveSessionPreset(replay.events)?.libraryId, preset.id)

  appendConversationTurn(replay, 2, '请告诉我这里是哪里。', '这里是海城。')
  assert.equal(replay.events.findLast(event => event.type === 'turn/start')?.data.turn, 2)
})

test('publishes a World Info Session into the source Workspace', async context => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const worldInfo = worldInfos.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-world-info.json')),
    filename: '海城.json',
  })
  const sourceId = SessionId('world-info-source')
  const sourceSession = Session.create(sourceId)
  const sourceAgent = { id: sourceId, session: sourceSession, status: 'idle', inbox: { hasPending: false } }
  let createdSession: Session | undefined
  let attachedSessionId: SessionId | undefined
  let renamedTitle: string | undefined
  const agents = {
    get: (id: SessionId) => id === sourceId ? sourceAgent : undefined,
    create: async (options: { readonly sessionId: SessionId; readonly seed: readonly import('@deepseek-ai/dsh-session').SessionEvent[] }) => {
      createdSession = Session.create(options.sessionId, options.seed)
      return {
        agent: { id: options.sessionId, session: createdSession },
        dispose: async () => {},
      }
    },
  }
  const ctx = {
    get: (name: string): unknown => {
      if (name === 'agents') return agents
      if (name === 'apiProxy') return {
        sessions: {
          models: async () => ({ result: { ok: true, value: { current: { provider: 'fixture', model: 'fixture' } } } }),
          selectModel: async () => ({ result: { ok: true, value: {} } }),
        },
      }
      if (name === 'agentPresets') return {
        resolve: async () => ({ id: 'agent-rp' }),
        mount: async () => {},
      }
      if (name === 'sessionTitle') return {
        get: () => undefined,
        rename: (_session: Session, title: string) => { renamedTitle = title },
      }
      if (name === 'workspace') return {
        list: () => [{
          id: 'workspace-fixture',
          sessionIds: [sourceId],
          attachSession: async (sessionId: SessionId) => { attachedSessionId = sessionId },
        }],
      }
      return undefined
    },
    logger: { warn: () => {} },
  } as unknown as Context

  const result = await launchAgentRpSession(ctx, characters, chats, presets, worldInfos, {
    format: 0,
    sourceSessionId: sourceId,
    kind: 'world-info',
    importId: worldInfo.id,
  })

  assert.equal(attachedSessionId, result.sessionId)
  assert.equal(renamedTitle, '海城')
  assert.equal(createdSession?.events.some(event => event.type === 'turn/start'), true)
  assert.deepEqual(createdSession?.deriveMessages(), [])
})

test('prepares imported JSONL with consecutive turns before the Agent is constructed', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'chat.jsonl',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0, sourceSessionId: 'source', kind: 'chat', importId: upload.id,
  })
  const session = Session.create(SessionId('launched-chat'), prepared.seed)
  const turns = session.events.filter(event => event.type === 'turn/start').map(event => event.data.turn)
  assert.deepEqual(turns, Array.from({ length: turns.length }, (_value, index) => index + 1))
  assert.equal(turns.length > 0, true)
  assert.equal(session.events.filter(event => event.type === 'turn/end').length, turns.length)
})

test('seeds a selected library preset after imported JSONL history', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'chat.jsonl',
  })
  const preset = presets.import(parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '继续原有语气' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  }), '迁移预设.json'))
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0,
    sourceSessionId: 'source',
    kind: 'chat',
    importId: upload.id,
    presetId: preset.id,
  })
  const session = Session.create(SessionId('migrated-with-preset'), prepared.seed)
  const active = readActiveSessionPreset(session.events)
  assert.equal(active?.result.name, '迁移预设')
  assert.equal(active?.libraryId, preset.id)
})

test('prepares Character Card and JSONL history as one replayable seed', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'chat.jsonl',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0, sourceSessionId: 'source', kind: 'chat', importId: upload.id, characterId: character.id,
  })
  const first = Session.create(SessionId('migration-first'), prepared.seed)
  const replay = Session.create(SessionId('migration-replay'), [...first.events])
  const turns = replay.events.filter(event => event.type === 'turn/start').map(event => event.data.turn)
  assert.deepEqual(turns, Array.from({ length: turns.length }, (_value, index) => index + 1))
  assert.equal(readActiveSessionCharacter(replay.events)?.result.libraryId, character.id)
})

test('rewrites a completed turn by branching immediately before its user message', (context) => {
  const { characters, chats, presets, worldInfos } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const preset = presets.import(parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '保持角色语气' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  }), '改写预设.json'))
  const prepared = prepareAgentRpSession(characters, chats, presets, worldInfos, {
    format: 0,
    sourceSessionId: 'source',
    kind: 'character',
    characterId: character.id,
    greetingIndex: 0,
    persona: { id: 'persona-01234567', name: '旅人', description: '来自海边。' },
    presetId: preset.id,
  })
  const source = Session.create(SessionId('rewrite-source'), prepared.seed)
  const previousTurn = Math.max(...source.events.flatMap(event => event.type === 'turn/start' ? [event.data.turn] : [])) + 1
  appendConversationTurn(source, previousTurn, '先去港口。', '好，我们沿着潮声往前走。')
  appendConversationTurn(source, previousTurn + 1, '改去钟楼。', '那就转向钟楼。')

  const rewritten = prepareAgentRpRewriteSession(source, previousTurn + 1, '白露')
  const replay = Session.create(SessionId('rewrite-child'), rewritten.seed)
  const transcript = replay.deriveMessages().flatMap(message => message.content.flatMap(block => block.type === 'text' ? [block.text] : []))
  assert.equal(rewritten.title, '白露 · 改写')
  assert.equal(transcript.includes('先去港口。'), true)
  assert.equal(transcript.includes('好，我们沿着潮声往前走。'), true)
  assert.equal(transcript.includes('改去钟楼。'), false)
  assert.equal(transcript.includes('那就转向钟楼。'), false)
  assert.equal(readActiveSessionCharacter(replay.events)?.result.libraryId, character.id)
  assert.equal(readActiveSessionCharacter(replay.events)?.result.userName, '旅人')
  assert.equal(readActiveSessionPreset(replay.events)?.libraryId, preset.id)
})

test('rejects an absent, unfinished, or assistant-only rewrite turn', () => {
  const source = Session.create(SessionId('invalid-rewrite'))
  source.append('turn/start', { turn: 1 })
  assert.throws(() => prepareAgentRpRewriteSession(source, 2), /不存在/u)
  assert.throws(() => prepareAgentRpRewriteSession(source, 1), /尚未完成/u)
  source.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '开场白' }],
      source: { provider: 'fixture', model: 'fixture' },
    }),
  }, { surfaceOp: 'append' })
  source.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  assert.throws(() => prepareAgentRpRewriteSession(source, 1), /没有可改写/u)
  assert.throws(() => prepareAgentRpRewriteSession(source, 0), /轮次无效/u)
})

test('rejects paths and extra browser-owned launch fields', () => {
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'chat',
    importId: 'chat-0123456789abcdef0123456789abcdef',
    path: 'C:/private/chat.jsonl',
  }), /字段无效/u)
  assert.deepEqual(parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'world-info',
    importId: 'world-info-0123456789abcdef0123456789abcdef',
    persona: { id: 'persona-01234567', name: '旅人', description: '来自海边。' },
  }), {
    format: 0,
    sourceSessionId: 'source',
    kind: 'world-info',
    importId: 'world-info-0123456789abcdef0123456789abcdef',
    persona: { id: 'persona-01234567', name: '旅人', description: '来自海边。' },
  })
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'world-info',
    importId: 'world-info-0123456789abcdef0123456789abcdef',
    path: 'C:/private/world-info.json',
  }), /字段无效/u)
  assert.deepEqual(parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'rewrite',
    turn: 3,
    text: '换一种说法。',
  }), { format: 0, sourceSessionId: 'source', kind: 'rewrite', turn: 3, text: '换一种说法。' })
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'rewrite',
    turn: 0,
    text: '无效轮次',
  }), /字段无效/u)
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'rewrite',
    turn: 1,
    text: '   ',
  }), /字段无效/u)
})

test('accepts opt-in memory only for character launches', () => {
  const characterId = 'card-0123456789abcdef0123456789abcdef'
  assert.deepEqual(parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'character',
    characterId,
    greetingIndex: 0,
    memory: 'copy-active',
  }), {
    format: 0,
    sourceSessionId: 'source',
    kind: 'character',
    characterId,
    greetingIndex: 0,
    memory: 'copy-active',
  })
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'character',
    characterId,
    greetingIndex: 0,
    memory: 'everything',
  }), /字段无效/u)
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'chat',
    importId: 'chat-0123456789abcdef0123456789abcdef',
    memory: 'copy-active',
  }), /字段无效/u)
})
