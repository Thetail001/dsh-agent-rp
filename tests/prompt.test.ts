import assert from 'node:assert/strict'
import test from 'node:test'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { claimAgentRpPrompt } from '../src/index.ts'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import {
  renderCharacterPrompt,
  renderImportedChatPrompt,
  renderImportedLorebook,
  renderImportedWorldInfos,
  renderMemoryContext,
  renderImportedCharacterPrompt,
  substituteCardMacros,
} from '../src/prompt.ts'
import { parseWorldInfoJson } from '../src/import/world-info.ts'

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

test('continues an imported chat identity without the deployment default persona', () => {
  const prompt = renderImportedChatPrompt('白露', '宝宝')

  assert.match(prompt, /你是白露/u)
  assert.match(prompt, /名为宝宝/u)
  assert.match(prompt, /已导入的对话历史为准/u)
  assert.doesNotMatch(prompt, /岚|旧书修复铺/u)
})

test('adds a selected Persona to an imported chat without a Character Card', () => {
  const prompt = renderImportedChatPrompt('白露', '小满', '怕冷，喜欢旧书。')

  assert.match(prompt, /名为小满/u)
  assert.match(prompt, /怕冷，喜欢旧书/u)
})

test('resolves stable SillyTavern identity macros across imported card prose', () => {
  const card = parseCharacterCardJson(JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '白露',
      description: '{{char}}替{{user}}修表',
      personality: '<char>很安静',
      scenario: '<user>刚进门',
      first_mes: '{{user}}，门还没锁。',
      mes_example: '<START>\n<bot>: 坐吧，<user>。',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '{{char}}不要替{{user}}行动。',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {},
    },
  }))

  assert.equal(substituteCardMacros(card.firstMessage, card, '宝宝'), '宝宝，门还没锁。')
  const prompt = renderImportedCharacterPrompt(card, ['{{char}}知道钟楼。'], [], '宝宝')
  assert.match(prompt, /白露替宝宝修表/u)
  assert.match(prompt, /宝宝刚进门/u)
  assert.match(prompt, /白露: 坐吧，宝宝/u)
  assert.match(prompt, /白露不要替宝宝行动/u)
  assert.doesNotMatch(prompt, /\{\{(?:char|user)\}\}|<(?:char|bot|user)>/iu)
})

test('claims one Character Card JSON only for an Agent RP import request', () => {
  const request = [
    { type: 'text' as const, text: '请导入这张角色卡' },
    { type: 'file' as const, name: '白露.json', mediaType: 'application/json' },
  ]

  assert.deepEqual(claimAgentRpPrompt(true, request), { text: '请导入这张角色卡' })
  assert.equal(claimAgentRpPrompt(false, request), undefined)
  assert.equal(claimAgentRpPrompt(true, [
    { type: 'text', text: '帮我看看这份数据' },
    { type: 'file', name: '白露.json', mediaType: 'application/json' },
  ]), undefined)
  assert.equal(claimAgentRpPrompt(true, [
    { type: 'text', text: '请导入这张角色卡' },
    { type: 'file', name: 'notes.txt', mediaType: 'text/plain' },
  ]), undefined)
})

test('claims one CHARX file as an explicit Character Card import', () => {
  assert.deepEqual(claimAgentRpPrompt(true, [
    { type: 'text', text: '请导入这张角色卡' },
    { type: 'file', name: '海棠.charx', mediaType: 'application/zip' },
  ]), { text: '请导入这张角色卡' })
})

test('claims one standalone World Info JSON without confusing it with a card request', () => {
  const request = [
    { type: 'text' as const, text: '请导入这本世界书' },
    { type: 'file' as const, name: '海城.json', mediaType: 'application/json' },
  ]

  assert.deepEqual(claimAgentRpPrompt(true, request), { text: '请导入这本世界书' })
  assert.equal(claimAgentRpPrompt(true, [
    { type: 'text', text: '请导入这本世界书' },
    { type: 'file', name: '海城.json', mediaType: 'application/json' },
    { type: 'file', name: '山城.json', mediaType: 'application/json' },
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

test('combines active entries from independent World Info books', () => {
  const first = parseWorldInfoJson(JSON.stringify({ entries: { 1: {
    key: [], keysecondary: [], content: '海城终年多雾。', constant: true, order: 1, position: 0,
  } } }))
  const second = parseWorldInfoJson(JSON.stringify({ entries: { 2: {
    key: ['钟楼'], keysecondary: [], content: '钟楼午夜停摆。', order: 1, position: 1,
  } } }))
  const current = createUserMessage({ content: [{ type: 'text', text: '去钟楼。' }], source: { kind: 'user' } })

  assert.deepEqual(renderImportedWorldInfos(
    [first, second], Session.create(SessionId('standalone-lore')), [current],
  ), {
    beforeCharacter: ['海城终年多雾。'],
    afterCharacter: ['钟楼午夜停摆。'],
  })
})
