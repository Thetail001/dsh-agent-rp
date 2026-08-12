import assert from 'node:assert/strict'
import test from 'node:test'
import { selectSillyTavernChatImportName } from '../src/client/import-hint.ts'

const jsonl = { kind: 'file', file: { name: '白露 - 2026-08-12.jsonl' } }

test('selects one standalone SillyTavern JSONL draft', () => {
  assert.equal(selectSillyTavernChatImportName([jsonl]), '白露 - 2026-08-12.jsonl')
  assert.equal(selectSillyTavernChatImportName([
    { kind: 'file', file: { name: '  CHAT.JSONL  ' } },
  ]), 'CHAT.JSONL')
})

test('does not label ambiguous or unrelated drafts as a chat import', () => {
  assert.equal(selectSillyTavernChatImportName([]), undefined)
  assert.equal(selectSillyTavernChatImportName([jsonl, jsonl]), undefined)
  assert.equal(selectSillyTavernChatImportName([{ kind: 'file', file: { name: 'chat.json' } }]), undefined)
  assert.equal(selectSillyTavernChatImportName([{ kind: 'image', file: { name: 'chat.jsonl' } }]), undefined)
})
