import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifySillyTavernJson,
  classifySillyTavernJsonFile,
  selectSillyTavernChatImportName,
  selectSillyTavernDraft,
} from '../src/client/import-hint.ts'

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

test('offers an explicit choice for standalone JSON and PNG resources', () => {
  assert.deepEqual(selectSillyTavernDraft([
    { kind: 'file', file: { name: '白露.json' } },
  ]), { kind: 'json-resource', name: '白露.json' })
  assert.deepEqual(selectSillyTavernDraft([
    { kind: 'image', file: { name: '白露.PNG' } },
  ]), { kind: 'png-candidate', name: '白露.PNG' })
  assert.equal(selectSillyTavernDraft([{ kind: 'file', file: { name: 'notes.txt' } }]), undefined)
  assert.deepEqual(selectSillyTavernDraft([{ kind: 'file', file: { name: '海棠.charx' } }]), {
    kind: 'character-card', name: '海棠.charx',
  })
})

test('classifies inert JSON resources by their stable SillyTavern fields', () => {
  assert.equal(classifySillyTavernJson(JSON.stringify({
    prompts: [{ identifier: 'main', content: 'do not execute' }],
    prompt_order: [{ character_id: 100001, order: [] }],
  })), 'preset')
  assert.equal(classifySillyTavernJson(JSON.stringify({
    spec: 'chara_card_v3',
    data: {
      name: '白露', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
    },
  })), 'character-card')
  assert.equal(classifySillyTavernJson(JSON.stringify({
    name: '城市', entries: { 0: { key: ['车站'], content: '月台' } },
  })), 'world-info')
  assert.equal(classifySillyTavernJson('{not json'), 'unknown')
  assert.equal(classifySillyTavernJson(JSON.stringify({ name: '普通配置', options: [] })), 'unknown')
})

test('does not allocate oversized JSON merely to offer an import hint', async () => {
  let read = false
  assert.equal(await classifySillyTavernJsonFile({
    size: 8 * 1024 * 1024 + 1,
    text: () => { read = true; return Promise.resolve('{}') },
  }), 'unknown')
  assert.equal(read, false)
})
