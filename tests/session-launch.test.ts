import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from '../src/character-library.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { readActiveSessionPreset } from '../src/import/session-preset.ts'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'
import { PresetLibrary } from '../src/preset-library.ts'
import { prepareAgentRpSession, parseAgentRpSessionLaunchRequest } from '../src/session-launch.ts'
import { SillyTavernChatLibrary } from '../src/sillytavern-chat-library.ts'

function libraries(context: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-session-launch-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  return {
    characters: new CharacterLibrary({ root: join(root, 'characters') }),
    chats: new SillyTavernChatLibrary({ root: join(root, 'chats') }),
    presets: new PresetLibrary({ root: join(root, 'presets') }),
  }
}

test('prepares a library character before the Agent is constructed', (context) => {
  const { characters, chats, presets } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, {
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
  const { characters, chats, presets } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const preset = presets.import(parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '保持角色语气' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  }), '会话预设.json'))
  const prepared = prepareAgentRpSession(characters, chats, presets, {
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

test('prepares imported JSONL with consecutive turns before the Agent is constructed', (context) => {
  const { characters, chats, presets } = libraries(context)
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'chat.jsonl',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, {
    format: 0, sourceSessionId: 'source', kind: 'chat', importId: upload.id,
  })
  const session = Session.create(SessionId('launched-chat'), prepared.seed)
  const turns = session.events.filter(event => event.type === 'turn/start').map(event => event.data.turn)
  assert.deepEqual(turns, Array.from({ length: turns.length }, (_value, index) => index + 1))
  assert.equal(turns.length > 0, true)
  assert.equal(session.events.filter(event => event.type === 'turn/end').length, turns.length)
})

test('prepares Character Card and JSONL history as one replayable seed', (context) => {
  const { characters, chats, presets } = libraries(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'chat.jsonl',
  })
  const prepared = prepareAgentRpSession(characters, chats, presets, {
    format: 0, sourceSessionId: 'source', kind: 'chat', importId: upload.id, characterId: character.id,
  })
  const first = Session.create(SessionId('migration-first'), prepared.seed)
  const replay = Session.create(SessionId('migration-replay'), [...first.events])
  const turns = replay.events.filter(event => event.type === 'turn/start').map(event => event.data.turn)
  assert.deepEqual(turns, Array.from({ length: turns.length }, (_value, index) => index + 1))
  assert.equal(readActiveSessionCharacter(replay.events)?.result.libraryId, character.id)
})

test('rejects paths and extra browser-owned launch fields', () => {
  assert.throws(() => parseAgentRpSessionLaunchRequest({
    format: 0,
    sourceSessionId: 'source',
    kind: 'chat',
    importId: 'chat-0123456789abcdef0123456789abcdef',
    path: 'C:/private/chat.jsonl',
  }), /字段无效/u)
})
