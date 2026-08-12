import assert from 'node:assert/strict'
import test from 'node:test'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { claimCharacterCardPrompt } from '../src/index.ts'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { renderCharacterPrompt, renderImportedLorebook, renderMemoryContext } from '../src/prompt.ts'

test('makes the top-level Agent the character and permits concise silence', () => {
  const prompt = renderCharacterPrompt(resolveConfig({ characterName: '小满' }))

  assert.match(prompt, /你是小满/u)
  assert.match(prompt, /不是旁白/u)
  assert.match(prompt, /短答、停顿或暂不追问/u)
  assert.match(prompt, /普通寒暄/u)
  assert.match(prompt, /先调用 remember/u)
  assert.match(prompt, /不存在的共同经历/u)
  assert.doesNotMatch(prompt, /狼人|主持人|子代理/u)
})

test('renders an explicit empty memory snapshot', () => {
  assert.equal(renderMemoryContext([]), '当前没有已记录的持久记忆。')
})

test('claims one Character Card JSON only for an Agent RP import request', () => {
  const request = [
    { type: 'text' as const, text: '请导入这张角色卡' },
    { type: 'file' as const, name: '白露.json', mediaType: 'application/json' },
  ]

  assert.deepEqual(claimCharacterCardPrompt(true, request), { text: '请导入这张角色卡' })
  assert.equal(claimCharacterCardPrompt(false, request), undefined)
  assert.equal(claimCharacterCardPrompt(true, [
    { type: 'text', text: '帮我看看这份数据' },
    { type: 'file', name: '白露.json', mediaType: 'application/json' },
  ]), undefined)
  assert.equal(claimCharacterCardPrompt(true, [
    { type: 'text', text: '请导入这张角色卡' },
    { type: 'file', name: 'notes.txt', mediaType: 'text/plain' },
  ]), undefined)
})

test('activates lorebook entries from the current message before it enters Session history', () => {
  const card = parseCharacterCardJson(JSON.stringify({
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
      alternate_greetings: [],
      tags: [],
      creator: 'fixture',
      character_version: '1',
      character_book: {
        name: '钟楼',
        scan_depth: 10,
        token_budget: 100,
        recursive_scanning: false,
        extensions: {},
        entries: [{
          keys: ['旧钟楼'],
          secondary_keys: [],
          content: '旧钟楼每天午夜停摆一分钟。',
          enabled: true,
          insertion_order: 1,
          case_sensitive: false,
          priority: 1,
          id: 1,
          name: '旧钟楼',
          comment: '',
          selective: false,
          constant: false,
          position: 'before_char',
          extensions: {},
        }],
      },
      extensions: {},
    },
  }))
  const current = createUserMessage({
    content: [{ type: 'text', text: '旧钟楼怎么了？' }],
    source: { kind: 'user' },
  })

  assert.deepEqual(renderImportedLorebook(card, Session.create(SessionId('lore-current')), [current]), {
    beforeCharacter: ['旧钟楼每天午夜停摆一分钟。'],
    afterCharacter: [],
  })
})
