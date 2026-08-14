import assert from 'node:assert/strict'
import test from 'node:test'
import type { ImportedRegexScript } from '../src/import/types.ts'
import { tavernScriptFrameSource } from '../src/client/tavern-runtime.ts'
import {
  AI_OUTPUT_PLACEMENT,
  normalizeSillyTavernMarkdown,
  renderCharacterDisplay,
  renderCharacterPromptView,
  splitCharacterDisplay,
} from '../src/frontend-regex.ts'

const base: ImportedRegexScript = {
  scriptName: 'script',
  findRegex: '/old/gu',
  replaceString: 'new',
  trimStrings: [],
  placement: [AI_OUTPUT_PLACEMENT],
  disabled: false,
  markdownOnly: true,
  promptOnly: false,
  runOnEdit: false,
  substituteRegex: 0,
  minDepth: null,
  maxDepth: null,
}

const character = {
  name: '白露',
  frontend: { regexScripts: [base], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {} },
}

test('builds a parseable Tavern runtime with dynamic script button APIs', () => {
  const html = tavernScriptFrameSource({
    id: 'travel', name: '地点选择', content: '', info: '测试', enabled: true,
    buttonEnabled: true, buttons: [{ name: '开始', visible: true }], data: {},
  }, 'replaceScriptButtons([{name:"学校",visible:true}])', {
    scriptId: 'travel', scriptName: '地点选择', scriptInfo: '测试',
    buttons: [{ name: '开始', visible: true }], characterName: '白露', characterId: 'bailu.png',
    chatId: 'session-test', approvedScriptOrigins: [],
    preset: {
      name: 'V18', revision: 3,
      value: { settings: {}, prompts: [], prompts_unused: [], extensions: {} },
    },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    messages: [],
    displayRegexScripts: [base],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  assert.doesNotThrow(() => { Function(source!) })
  assert.match(source!, /window\.replaceScriptButtons=/u)
  assert.match(source!, /window\.updateScriptButtonsWith=/u)
  assert.match(source!, /window\.formatAsDisplayedMessage=/u)
  assert.match(source!, /window\.retrieveDisplayedMessage=/u)
  assert.match(source!, /window\.refreshOneMessage=/u)
  assert.match(source!, /window\.getCurrentCharId=/u)
  assert.match(source!, /window\.getCurrentChatId=/u)
  assert.match(source!, /window\.getPreset=/u)
  assert.match(source!, /window\.updatePresetWith=/u)
  assert.match(source!, /window\.setPreset=/u)
  assert.match(source!, /window\.getTavernRegexes=/u)
  assert.match(source!, /window\.replaceTavernRegexes=/u)
  assert.match(source!, /window\.updateTavernRegexesWith=/u)
  assert.match(source!, /window\.formatAsTavernRegexedString=/u)
  assert.match(source!, /window\.getModelList=/u)
})

test('runs preset scripts before character scripts for the selected view', () => {
  const preset = [{ ...base, scriptName: 'preset', findRegex: '/seed/gu', replaceString: 'old' }]
  assert.equal(renderCharacterDisplay('seed', character, AI_OUTPUT_PLACEMENT, 0, '宝宝', preset), 'new')
})

test('keeps display-only and prompt-only execution separate', () => {
  const prompt = [{ ...base, markdownOnly: false, promptOnly: true }]
  assert.equal(renderCharacterDisplay('old', { ...character, frontend: { ...character.frontend, regexScripts: [] } }, AI_OUTPUT_PLACEMENT, 0, '宝宝', prompt), 'old')
  assert.equal(renderCharacterPromptView('old', character, AI_OUTPUT_PLACEMENT, 0, '宝宝', prompt), 'new')
})

test('supports raw and escaped macro substitution in the find expression', () => {
  const source = '宝宝.(白露)'
  const raw = [{ ...base, findRegex: String.raw`/{{user}}\.\({{char}}\)/gu`, replaceString: 'raw', substituteRegex: 1 }]
  const escaped = [{ ...base, findRegex: '/{{user}}{{char}}/gu', replaceString: 'escaped', substituteRegex: 2 }]
  const specialCharacter = { name: '(白露)', frontend: {
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {},
  } }
  assert.equal(renderCharacterDisplay(source, character, AI_OUTPUT_PLACEMENT, 0, '宝宝', raw), 'raw')
  assert.equal(renderCharacterDisplay('宝.宝(白露)', specialCharacter, AI_OUTPUT_PLACEMENT, 0, '宝.宝', escaped), 'escaped')
})

test('keeps prose and each fenced frontend document in source order', () => {
  const source = [
    '正文前',
    '',
    '```html',
    '<!doctype html><html><body>卡一</body></html>',
    '```',
    '',
    '正文中',
    '',
    '```html',
    '<!doctype html><html><body>卡二</body></html>',
    '```',
  ].join('\n')
  assert.deepEqual(splitCharacterDisplay(source), [
    { kind: 'markdown', text: '正文前\n\n' },
    { kind: 'html', source: '<!doctype html><html><body>卡一</body></html>\n' },
    { kind: 'markdown', text: '\n正文中\n\n' },
    { kind: 'html', source: '<!doctype html><html><body>卡二</body></html>\n' },
  ])
})

test('leaves ordinary fenced code and inline HTML in native Markdown', () => {
  const source = '前文\n\n```ts\nconst body = "<body>"\n```\n\n<div>片段</div>'
  assert.deepEqual(splitCharacterDisplay(source), [{ kind: 'markdown', text: source }])
})

test('hides model-defined wrapper tags while preserving their displayed text', () => {
  assert.equal(normalizeSillyTavernMarkdown('<content>\n正文\n</content>'), '\n正文\n')
  assert.equal(normalizeSillyTavernMarkdown('<details><summary>展开</summary>正文</details>'),
    '<details><summary>展开</summary>正文</details>')
})

test('keeps unknown tags inside inline and fenced code examples', () => {
  const source = ['正文 <content>内容</content> `示例 <content>`', '', '```xml', '<content>示例</content>', '```'].join('\n')
  assert.equal(normalizeSillyTavernMarkdown(source),
    ['正文 内容 `示例 <content>`', '', '```xml', '<content>示例</content>', '```'].join('\n'))
})
