import assert from 'node:assert/strict'
import test from 'node:test'
import { EjsTemplateEngine } from '../src/ejs-template.ts'
import { inspectLorebook } from '../src/import/lorebook.ts'
import type { ImportedLorebook } from '../src/import/types.ts'

const engine = await EjsTemplateEngine.create()

test('renders standard escaped, raw, statement, comment, and print tags', () => {
  const result = engine.render([
    '<%# hidden %><% if (getvar("mood") === "calm") { %>',
    '<%= char %> / <%- user %> / <% print(messages.length) %>',
    '<% } %>',
  ].join(''), {
    characterName: '<角色>',
    userName: '<用户>',
    messages: ['一', '二'],
    variables: { mood: 'calm' },
  })

  assert.deepEqual(result, { ok: true, text: '&lt;角色&gt; / <用户> / 2' })
})

test('settles self-contained async EJS without exposing Host callbacks', () => {
  const result = engine.render('<% const value = await Promise.resolve(6 * 7); %><%= value %>', {
    characterName: '角色', userName: '用户', messages: [],
  })

  assert.deepEqual(result, { ok: true, text: '42' })
})

test('bounds pending and rejected async EJS without leaking error text', () => {
  assert.deepEqual(engine.render('<% await new Promise(() => {}); %>private pending text', {
    characterName: '角色', userName: '用户', messages: [],
  }), { ok: false, kind: 'execution-limit' })
  assert.deepEqual(engine.render('<% await Promise.reject(new Error("private rejection text")); %>', {
    characterName: '角色', userName: '用户', messages: [],
  }), { ok: false, kind: 'runtime-error' })
})

test('bounds all templates rendered through one prompt context', () => {
  const render = engine.createRenderer({ characterName: '角色', userName: '用户', messages: [] })
  for (let index = 0; index < 256; index += 1) {
    assert.deepEqual(render('<%= char %>'), { ok: true, text: '角色' })
  }
  assert.deepEqual(render('<%= char %>'), { ok: false, kind: 'execution-limit' })
})

test('supports EJS whitespace slurping without changing ordinary text', () => {
  const result = engine.render('甲  <%_ const value = 2; _%>\n  乙<%= value %>\n丙<% -%>\n丁', {
    characterName: '角色', userName: '用户', messages: [],
  })

  assert.deepEqual(result, { ok: true, text: '甲乙2\n丙丁' })
})

test('emits escaped EJS delimiters as literal text', () => {
  assert.deepEqual(engine.render('<%%= user %%>', {
    characterName: '角色', userName: '用户', messages: [],
  }), { ok: true, text: '<%= user %>' })
})

test('does not expose Node, network, or module globals', () => {
  const result = engine.render('<%= [typeof process, typeof require, typeof fetch].join(",") %>', {
    characterName: '角色', userName: '用户', messages: [],
  })

  assert.deepEqual(result, { ok: true, text: 'undefined,undefined,undefined' })
})

test('reads nested merged variables and explicit scopes without allowing writes', () => {
  const result = engine.render('<%= getvar("stats.trust") %>/<%= getvar("stats.mood") %>/<%= getvar("stats.hp") %>/<%= getglobalvar("tone") %>/<%= getchatvar("tone") %>/<%= getvar("stat_data.hp") %>', {
    characterName: '角色',
    userName: '用户',
    messages: [],
    variableScopes: {
      global: { tone: 'global', stats: { trust: 1, mood: 'calm' } },
      chat: { tone: 'chat', stats: { trust: 3 } },
      message: { stats: { hp: 7 } },
    },
    statData: { hp: 9 },
  })

  assert.deepEqual(result, { ok: true, text: '3/calm/7/global/chat/9' })
})

test('exposes deterministic generation metadata and role-aware chat readers', () => {
  const result = engine.render([
    '<%= [charName, userName, runType, lastMessageId, lastUserMessageId, lastCharMessageId].join("|") %>\n',
    '<%= [lastUserMessage, lastCharMessage, getChatMessage(-1), getChatMessage(1, "assistant")].join("|") %>\n',
    '<%= getChatMessages(2).join(",") %>\n',
    '<%= getChatMessages(3, "user").join(",") %>\n',
    '<%= getChatMessages(1, 2).join(",") %>',
  ].join(''), {
    characterName: '角色',
    userName: '用户',
    messages: ['问一', '答一', '问二'],
    transcript: [
      { role: 'user', content: '问一' },
      { role: 'assistant', content: '答一' },
      { role: 'user', content: '问二' },
    ],
  })

  assert.deepEqual(result, {
    ok: true,
    text: '角色|用户|generate|2|2|1\n问二|答一|问二|答一\n答一,问二\n问一,问二\n答一,问二',
  })
})

test('supports EJS variable options and camel-case scope aliases as read-only snapshots', () => {
  const result = engine.render('<%= getvar("missing", { defaults: 5 }) %>/<%= typeof getvar("missing", { scope: "global" }) %>/<%= getvar("tone", { scope: "global" }) %>/<%= getLocalVar("tone") %>/<%= getCharacterVar("tone") %>', {
    characterName: '角色', userName: '用户', messages: [],
    variableScopes: { global: { tone: 'global' }, chat: { tone: 'chat' }, character: { tone: 'character' } },
  })

  assert.deepEqual(result, { ok: true, text: '5/undefined/global/chat/character' })
})

test('parses JSON context without treating special object keys as source syntax', () => {
  const variables = JSON.parse('{"__proto__":{"visible":"own value"}}') as Record<string, never>
  const result = engine.render('<%= getvar("__proto__.visible", "missing") %>', {
    characterName: '角色', userName: '用户', messages: [], variables,
  })

  assert.deepEqual(result, { ok: true, text: 'own value' })
})

test('interrupts non-terminating templates and reports source errors without source text', () => {
  assert.deepEqual(engine.render('<% while (true) {} %>', {
    characterName: '角色', userName: '用户', messages: [],
  }), { ok: false, kind: 'execution-limit' })
  assert.deepEqual(engine.render('<% if ( %>private fixture', {
    characterName: '角色', userName: '用户', messages: [],
  }), { ok: false, kind: 'syntax-error' })
})

test('activates rendered EJS lore and keeps failures out of the prompt', () => {
  const entry = (content: string, insertionOrder: number) => ({
    sourceId: String(insertionOrder), keys: [], secondaryKeys: [], content, enabled: true,
    insertionOrder, selective: false, constant: true, caseSensitive: false,
    matchWholeWords: false, secondaryLogic: 'and-any' as const, position: 'before_char' as const,
    ignoreBudget: false, useRegex: false, hasDecorators: false,
  })
  const book: ImportedLorebook = {
    recursiveScanning: false,
    entries: [
      entry('<% if (getvar("open")) { %><%= char %>看见了<%- user %>。<% } %>', 1),
      entry('<% while (true) {} %>', 2),
    ],
  }
  const inspected = inspectLorebook(book, ['开门。'], {
    renderTemplate: template => engine.render(template, {
      characterName: '<角色>', userName: '<用户>', messages: ['开门。'], variables: { open: true },
    }),
  })

  assert.deepEqual(inspected.beforeCharacter, ['&lt;角色&gt;看见了<用户>。'])
  assert.equal(inspected.entries[0]?.template, 'rendered')
  assert.equal(inspected.entries[1]?.reason, 'template-error')
  assert.equal(inspected.entries[1]?.template, 'execution-limit')
})
