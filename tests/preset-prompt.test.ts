import assert from 'node:assert/strict'
import test from 'node:test'
import { createMessage, createUserMessage, type Message } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { ImportedSillyTavernPreset } from '../src/import/sillytavern-preset.ts'
import type { ImportedCharacterCard } from '../src/import/types.ts'
import { assembleSillyTavernPreset, injectSillyTavernInChatPrompts } from '../src/preset-prompt.ts'
import { EjsTemplateEngine } from '../src/ejs-template.ts'

const card: ImportedCharacterCard = {
  format: 0,
  version: 2,
  specVersion: '2.0',
  name: '白露',
  description: '{{char}}在修表。',
  personality: '安静但敏锐。',
  scenario: '{{user}}刚刚推门进来。',
  firstMessage: '门还没锁。',
  messageExample: '<START>\n{{char}}: 坐吧，{{user}}。',
  alternateGreetings: [],
  systemPrompt: '',
  postHistoryInstructions: '',
  frontend: { regexScripts: [], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {} },
  degradations: [],
  raw: {},
}

test('assembles markers and nested variables on the correct side of chat history', () => {
  const prompts: ImportedSillyTavernPreset['prompts'] = [
    { identifier: 'variables', name: '变量', role: 'system', content: '{{setvar::tone::轻声}}{{setvar::line::{{getvar::tone}}回答}}', marker: false, systemPrompt: true, forbidOverrides: false },
    { identifier: 'comment', name: '注释', role: 'system', content: '{{// 不进入提示词}}', marker: false, systemPrompt: true, forbidOverrides: false },
    { identifier: 'worldInfoBefore', name: '世界书前', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'charDescription', name: '角色描述', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'charPersonality', name: '性格', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'scenario', name: '场景', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'personaDescription', name: '用户设定', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'dialogueExamples', name: '示例', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'chatHistory', name: '历史', role: 'system', content: '', marker: true, systemPrompt: true, forbidOverrides: false },
    { identifier: 'after', name: '历史后', role: 'system', content: '{{getvar::line}}：{{lastUserMessage}}', marker: false, systemPrompt: true, forbidOverrides: false },
    { identifier: 'prefill', name: '回复前缀', role: 'assistant', content: 'OUTPUT', marker: false, systemPrompt: false, forbidOverrides: false },
    { identifier: 'in-chat', name: '聊天内注入', role: 'system', content: '暂不应进入请求', marker: false, systemPrompt: false, forbidOverrides: false, injectionPosition: 1, injectionDepth: 2, injectionOrder: 100 },
    { identifier: 'disabled', name: '关闭项', role: 'system', content: '绝不能出现', marker: false, systemPrompt: true, forbidOverrides: false },
  ]
  const preset: ImportedSillyTavernPreset = {
    format: 0,
    name: '测试预设',
    prompts,
    order: prompts.map(prompt => ({ identifier: prompt.identifier, enabled: prompt.identifier !== 'disabled' })),
    generation: {},
    formats: {
      worldInfo: '<world>{0}</world>',
      scenario: '<scenario>{{scenario}}</scenario>',
      personality: '<personality>{{personality}}</personality>',
    },
    regexScripts: [],
    extensionSummary: { regexScriptCount: 0, hasSPreset: false, hasTavernHelper: false },
  }
  const pending = createUserMessage({
    content: [{ type: 'text', text: '表为什么停了？' }],
    source: { kind: 'user' },
  })
  const assembled = assembleSillyTavernPreset(preset, {
    card,
    userName: '宝宝',
    userPersona: '怕冷。',
    worldInfoBefore: ['海城终年多雾。'],
    worldInfoAfter: [],
    session: Session.create(SessionId('preset-prompt')),
    pendingMessages: [pending],
  })

  assert.match(assembled.system, /<world>海城终年多雾。<\/world>/u)
  assert.match(assembled.system, /白露在修表/u)
  assert.match(assembled.system, /<personality>安静但敏锐。<\/personality>/u)
  assert.match(assembled.system, /<scenario>宝宝刚刚推门进来。<\/scenario>/u)
  assert.match(assembled.system, /怕冷/u)
  assert.match(assembled.system, /白露: 坐吧，宝宝/u)
  assert.doesNotMatch(assembled.system, /历史后|OUTPUT|暂不应进入请求|绝不能出现/u)
  assert.match(assembled.afterHistory, /轻声回答：表为什么停了/u)
  assert.match(assembled.afterHistory, /SillyTavern assistant prompt · 回复前缀/u)
  assert.match(assembled.afterHistory, /OUTPUT/u)
  assert.doesNotMatch(`${assembled.system}\n${assembled.afterHistory}`, /\{\{|不进入提示词|暂不应进入请求|绝不能出现/u)
  assert.deepEqual(assembled.inChat, [{
    role: 'system', content: '暂不应进入请求', depth: 2, order: 100,
  }])
  assert.equal(assembled.enabledPromptCount, 12)
  assert.equal(assembled.degradedRoleCount, 1)
  assert.equal(assembled.unsupportedMacroCount, 0)
  assert.equal(assembled.templateFailureCount, 0)
})

test('renders EJS in imported preset modules and drops only a failing module', async () => {
  const engine = await EjsTemplateEngine.create()
  const prompts: ImportedSillyTavernPreset['prompts'] = [
    { identifier: 'main', name: '主提示', role: 'system', content: '<% if (getvar("enabled")) { %><%= char %>回应<%- user %><% } %>', marker: false, systemPrompt: true, forbidOverrides: false },
    { identifier: 'broken', name: '坏模板', role: 'system', content: '<% while (true) {} %>', marker: false, systemPrompt: true, forbidOverrides: false },
  ]
  const preset: ImportedSillyTavernPreset = {
    format: 0,
    name: 'EJS 预设',
    prompts,
    order: prompts.map(prompt => ({ identifier: prompt.identifier, enabled: true })),
    generation: {},
    formats: { worldInfo: '{0}', scenario: '{0}', personality: '{0}' },
    regexScripts: [],
    extensionSummary: { regexScriptCount: 0, hasSPreset: false, hasTavernHelper: false },
  }
  const context = {
    characterName: '<白露>', userName: '<宝宝>', messages: [], variables: { enabled: true },
  }
  const assembled = assembleSillyTavernPreset(preset, {
    card,
    userName: '<宝宝>',
    worldInfoBefore: [],
    worldInfoAfter: [],
    session: Session.create(SessionId('preset-ejs')),
    renderTemplate: template => engine.render(template, context),
  })

  assert.equal(assembled.system, '&lt;白露&gt;回应<宝宝>')
  assert.equal(assembled.templateFailureCount, 1)
})

function message(role: Message['role'], text: string): Message {
  return createMessage({
    role,
    source: role === 'user' ? { kind: 'user' } : { kind: 'plugin', plugin: 'fixture' },
    content: [{ type: 'text', text }],
  })
}

test('inserts in-chat modules by depth, descending priority, and role', () => {
  const injected = injectSillyTavernInChatPrompts([
    message('user', '旧问题'),
    message('assistant', '旧回答'),
    message('user', '最新问题'),
  ], [
    { role: 'assistant', content: '低优先级助手', depth: 1, order: 100 },
    { role: 'system', content: '低优先级系统', depth: 1, order: 100 },
    { role: 'user', content: '高优先级用户', depth: 1, order: 200 },
    { role: 'system', content: '末尾提醒', depth: 0, order: 100 },
    { role: 'system', content: '更早提醒', depth: 9, order: 100 },
  ])

  assert.deepEqual(injected.map(item => ({
    role: item.role,
    text: item.content.flatMap(block => block.type === 'text' ? [block.text] : []).join(''),
  })), [
    { role: 'system', text: '更早提醒' },
    { role: 'user', text: '旧问题' },
    { role: 'assistant', text: '旧回答' },
    { role: 'user', text: '高优先级用户' },
    { role: 'system', text: '低优先级系统' },
    { role: 'assistant', text: '低优先级助手' },
    { role: 'user', text: '最新问题' },
    { role: 'system', text: '末尾提醒' },
  ])
})
