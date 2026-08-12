import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJsonBytes } from '../src/import/character-card.ts'
import { createCharacterCardSessionSeed } from '../src/import/character-card-seed.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { substituteCardMacros } from '../src/prompt.ts'

const attachment = {
  kind: 'file' as const,
  attachmentId: AttachmentId('sha256:direct-card'),
  bytes: 1_000,
  name: '白露.json',
  mediaType: 'application/json',
}

test('seeds a native roleplay Session directly from one Character Card JSON', () => {
  const card = parseCharacterCardJsonBytes(readFileSync('tests/fixtures/manual-character-card.json'))
  const greeting = substituteCardMacros(card.firstMessage, card)
  const seed = createCharacterCardSessionSeed(card, attachment, 0, greeting)
  const session = Session.create(SessionId('direct-card-import'), seed)

  assert.equal(readActiveSessionCharacter(session.events)?.result.name, '白露')
  assert.deepEqual(session.deriveMessages().map(message => ({
    role: message.role,
    text: message.content[0]?.type === 'text' ? message.content[0].text : undefined,
  })), [{ role: 'assistant', text: '门还没锁，你进来吧。' }])
  assert.equal(seed[0]?.type, 'agent-rp/character-card-seed')
})

test('keeps an empty greeting as an active blank character Session', () => {
  const source = JSON.parse(readFileSync('tests/fixtures/manual-character-card.json', 'utf8')) as {
    data: { first_mes: string }
  }
  source.data.first_mes = ''
  const card = parseCharacterCardJsonBytes(Buffer.from(JSON.stringify(source)))
  const seed = createCharacterCardSessionSeed(card, attachment, 0, '')

  assert.equal(seed.length, 1)
  assert.equal(readActiveSessionCharacter(seed)?.result.name, '白露')
})
