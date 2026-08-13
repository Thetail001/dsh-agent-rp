import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from '../src/character-library.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { readSillyTavernChatIdentity } from '../src/import/sillytavern-chat-seed.ts'
import { decodeSillyTavernChatCommandRecord } from '../src/sillytavern-chat-protocol.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'
import { executeSillyTavernChatCommand } from '../src/sillytavern-chat-command.ts'
import { SillyTavernChatLibrary } from '../src/sillytavern-chat-library.ts'

function setup(context: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-chat-command-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const chats = new SillyTavernChatLibrary({ root: join(root, 'chats') })
  const characters = new CharacterLibrary({ root: join(root, 'characters') })
  const upload = chats.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')),
    filename: 'manual-chat.jsonl',
  })
  return { chats, characters, upload }
}

test('migrates JSONL history into one blank Session without a model turn', (context) => {
  const { chats, characters, upload } = setup(context)
  const agent = { session: Session.create(SessionId('sillytavern-chat-command')) } as Agent
  const commandId = CommandId('sillytavern-chat-1')
  agent.session.append('command/run', { commandId, name: 'rp-chat-import', source: { kind: 'user' } })
  const result = executeSillyTavernChatCommand(chats, characters, {
    commandId,
    agent,
    rawInput: JSON.stringify({ format: 0, importId: upload.id }),
  })
  agent.session.append('command/done', { commandId, ...result })

  assert.equal(readSillyTavernChatIdentity(agent.session.events)?.characterName, upload.characterName)
  assert.equal(agent.session.events.some(event => event.type === 'agent-rp/sillytavern-chat-import'), false)
  const done = agent.session.events.at(-1)
  assert.equal(done?.type, 'command/done')
  if (done?.type !== 'command/done' || done.data.kind !== 'success') assert.fail('missing command result')
  assert.equal(decodeSillyTavernChatCommandRecord(done.data.text)?.messageCount, upload.messageCount)
  assert.equal(agent.session.events.some(event => event.type === 'request/header'), false)
  assert.equal(agent.session.deriveMessages().length > 0, true)
  let state = agentRpProjectionDefinition.init()
  for (const event of agent.session.events) state = agentRpProjectionDefinition.apply(state, event)
  assert.equal(agentRpProjectionDefinition.view(state).importedMessageCount, upload.messageCount)
})

test('migrates JSONL history with one selected library Character Card', (context) => {
  const { chats, characters, upload } = setup(context)
  const character = characters.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const agent = { session: Session.create(SessionId('sillytavern-card-chat-command')) } as Agent
  const commandId = CommandId('sillytavern-chat-2')
  agent.session.append('command/run', { commandId, name: 'rp-chat-import', source: { kind: 'user' } })
  const result = executeSillyTavernChatCommand(chats, characters, {
    commandId,
    agent,
    rawInput: JSON.stringify({ format: 0, importId: upload.id, characterId: character.id }),
  })
  agent.session.append('command/done', { commandId, ...result })

  assert.equal(readActiveSessionCharacter(agent.session.events)?.result.libraryId, character.id)
  assert.equal(readActiveSessionCharacter(agent.session.events)?.result.userName, upload.userName)
  let state = agentRpProjectionDefinition.init()
  for (const event of agent.session.events) state = agentRpProjectionDefinition.apply(state, event)
  const projection = agentRpProjectionDefinition.view(state)
  assert.equal(projection.avatarLibraryId, character.id)
  assert.equal(projection.importedMessageCount, upload.messageCount)
})

test('rejects migration into a Session that already contains dialogue', (context) => {
  const { chats, characters, upload } = setup(context)
  const agent = { session: Session.create(SessionId('sillytavern-chat-nonblank')) } as Agent
  agent.session.append('turn/start', { turn: 1 })
  const commandId = CommandId('sillytavern-chat-3')
  agent.session.append('command/run', { commandId, name: 'rp-chat-import', source: { kind: 'user' } })
  assert.throws(() => executeSillyTavernChatCommand(chats, characters, {
    commandId,
    agent,
    rawInput: JSON.stringify({ format: 0, importId: upload.id }),
  }), /只能迁移到新会话/u)
})
