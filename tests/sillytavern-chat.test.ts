import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  MAX_SILLYTAVERN_CHAT_BYTES,
  parseSillyTavernChat,
  parseSillyTavernChatBytes,
} from '../src/import/sillytavern-chat.ts'

test('imports a SillyTavern JSONL chat losslessly with swipes and inert system rows', () => {
  const chat = parseSillyTavernChatBytes(readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl'))

  assert.equal(chat.header.userName, '宝宝')
  assert.equal(chat.header.characterName, '白露')
  assert.deepEqual(chat.header.chatMetadata, { integrity: 'fixture', unknown: { keep: true } })
  assert.deepEqual(chat.messages.map(message => message.kind), ['assistant', 'user', 'narrator', 'system'])
  assert.deepEqual(chat.messages[0]?.swipes, ['门还没锁。', '你来得正好。'])
  assert.equal(chat.messages[0]?.swipeId, 0)
  assert.equal(chat.messages[0]?.text, '门还没锁。')
  assert.deepEqual((chat.messages[0]?.raw as { extra: object }).extra, { model: 'fixture', unknown: true })
})

test('accepts a UTF-8 BOM, CRLF, and blank lines without changing source line numbers', () => {
  const chat = parseSillyTavernChatBytes(Buffer.from('\uFEFF{"chat_metadata":{}}\r\n\r\n{"mes":"你好","is_user":true}\r\n'))

  assert.equal(chat.messages[0]?.line, 3)
  assert.equal(chat.messages[0]?.kind, 'user')
})

test('uses mes as the selected history text without discarding alternate swipes', () => {
  const chat = parseSillyTavernChat([
    '{"chat_metadata":{}}',
    '{"mes":"当前文本","swipes":["旧候选","另一个候选"],"swipe_id":1}',
  ].join('\n'))

  assert.equal(chat.messages[0]?.text, '当前文本')
  assert.deepEqual(chat.messages[0]?.swipes, ['旧候选', '另一个候选'])
})

test('rejects malformed structure instead of silently rewriting it', () => {
  assert.throws(() => parseSillyTavernChat(''), /empty/u)
  assert.throws(() => parseSillyTavernChat('{"mes":"not a header"}'), /chat header/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":[]}'), /chat_metadata must be an object/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":{}}\n{'), /line 2 is not valid JSON/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":{}}\n{"mes":3}'), /line 2\.mes/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":{}}\n{"mes":"x","is_user":"yes"}'), /is_user/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":{}}\n{"mes":"x","is_user":true,"is_system":true}'), /both a user and system/u)
  assert.throws(() => parseSillyTavernChat('{"chat_metadata":{}}\n{"mes":"x","swipes":["x"],"swipe_id":1}'), /outside 1 swipe/u)
  assert.throws(() => parseSillyTavernChatBytes(Uint8Array.from([0xc3, 0x28])), /valid UTF-8/u)
})

test('rejects an oversized chat before parsing', () => {
  assert.throws(() => parseSillyTavernChat('x'.repeat(MAX_SILLYTAVERN_CHAT_BYTES + 1)), /exceeds/u)
})
