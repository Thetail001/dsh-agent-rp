import assert from 'node:assert/strict'
import test from 'node:test'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { CallId, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, type JsonValue } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import {
  cardFromImportMeta,
  prepareCharacterImportResult,
  readActiveSessionCharacter,
  type CharacterImportMeta,
} from '../src/import/session-character.ts'

const raw = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: '白露',
    description: '钟表匠',
    personality: '沉静',
    scenario: '修理铺打烊前',
    first_mes: '门还没锁。',
    mes_example: '',
    creator_notes: '',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: ['今天来得很早。'],
    tags: [],
    creator: 'fixture',
    character_version: '1',
    extensions: { unknown: true },
  },
} as const

function appendImport(session: Session, callId: string, greetingIndex = 0): void {
  const image = {
    attachmentId: AttachmentId('sha256:fixture'),
    mediaType: 'image/png' as const,
    bytes: 100,
    width: 1,
    height: 1,
    name: 'card.png',
  }
  const source = session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '导入这张卡' }, { type: 'image', attachment: image }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const call = session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId(callId),
    name: 'import_character_card',
    arguments: JSON.stringify({ greetingIndex }),
  })
  const card = parseCharacterCardJson(JSON.stringify(raw))
  const value = prepareCharacterImportResult(card, { keyword: 'chara', json: JSON.stringify(raw) }, source.seq, image, greetingIndex)
  const { raw: rawCard, ...result } = value
  const meta: CharacterImportMeta = { format: 0, result, raw: rawCard }
  session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: [{ type: 'text', text: `已导入 ${value.name}` }],
      isError: false,
    }),
    meta: meta as unknown as JsonValue,
  }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
}

function appendHiddenImageImport(session: Session, callId: string): void {
  const image = {
    attachmentId: AttachmentId('sha256:hidden-fixture'),
    mediaType: 'image/png' as const,
    bytes: 120,
    width: 1,
    height: 1,
    name: 'hidden-card.png',
  }
  const source = session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '导入这张角色卡' }],
    source: {
      kind: 'user',
      attachmentConsumer: 'dsh-agent-rp',
      attachments: [image],
    } as never,
  }), { surfaceOp: 'append' })
  const call = session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId(callId),
    name: 'import_character_card',
    arguments: '{}',
  })
  const card = parseCharacterCardJson(JSON.stringify(raw))
  const value = prepareCharacterImportResult(card, { keyword: 'chara', json: JSON.stringify(raw) }, source.seq, image, 0)
  const { raw: rawCard, ...result } = value
  const meta: CharacterImportMeta = { format: 0, result, raw: rawCard }
  session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: [{ type: 'text', text: `已导入 ${value.name}` }],
      isError: false,
    }),
    meta: meta as unknown as JsonValue,
  }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
}

test('replays an imported character and greeting from native tool metadata', () => {
  const session = Session.create(SessionId('character-import'))
  appendImport(session, 'import-1', 1)

  const active = readActiveSessionCharacter(session.events)!
  assert.equal(active.result.selectedGreeting, '今天来得很早。')
  assert.equal(cardFromImportMeta(active.meta).name, '白露')
  assert.deepEqual(cardFromImportMeta(active.meta).raw, raw)
})

test('rejects import metadata that no longer cites its source image', () => {
  const session = Session.create(SessionId('character-import-tamper'))
  appendImport(session, 'import-1')
  const seed = structuredClone(session.events) as unknown as Array<(typeof session.events)[number]>
  const result = seed.find(event => event.type === 'tool/result')!
  if (result.type !== 'tool/result' || typeof result.data.meta !== 'object' || result.data.meta === null || Array.isArray(result.data.meta)) {
    assert.fail('fixture did not produce import metadata')
  }
  const meta = result.data.meta as Record<string, JsonValue>
  const summary = meta.result as Record<string, JsonValue>
  summary.sourceAttachmentId = 'sha256:other'

  assert.throws(() => readActiveSessionCharacter(Session.create(SessionId('tampered'), seed).events), /source attachment is absent/u)
})

test('replays a card whose image was hidden from a text-only model request', () => {
  const session = Session.create(SessionId('character-import-hidden-image'))
  appendHiddenImageImport(session, 'import-hidden')

  assert.equal(readActiveSessionCharacter(session.events)?.result.sourceAttachmentId, 'sha256:hidden-fixture')
})
