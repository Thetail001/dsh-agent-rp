import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from '../src/character-library.ts'
import { executeCharacterLibraryCommand } from '../src/character-library-command.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'

test('starts one local character without sending its asset to a model', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-command-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new CharacterLibrary({ root })
  const entry = library.importFile({
    data: new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json')),
    filename: 'character.json',
    mediaType: 'application/json',
  })
  const agent = { session: Session.create(SessionId('character-library-command')) } as Agent
  const commandId = CommandId('character-library-1')
  agent.session.append('command/run', {
    commandId,
    name: 'rp-character-library',
    source: { kind: 'user' },
  })
  const result = executeCharacterLibraryCommand(library, {
    commandId,
    agent,
    rawInput: JSON.stringify({ format: 0, characterId: entry.id, greetingIndex: 1 }),
  })
  agent.session.append('command/done', { commandId, ...result })

  assert.equal(readActiveSessionCharacter(agent.session.events)?.result.libraryId, entry.id)
  assert.deepEqual(agent.session.deriveMessages().map(message => message.content[0]), [
    { type: 'text', text: '今天来得很早。' },
  ])
  assert.equal(agent.session.events.some(event => event.type === 'user/message'), false)
  let state = agentRpProjectionDefinition.init()
  for (const event of agent.session.events) state = agentRpProjectionDefinition.apply(state, event)
  assert.equal(agentRpProjectionDefinition.view(state).avatarLibraryId, entry.id)
})
