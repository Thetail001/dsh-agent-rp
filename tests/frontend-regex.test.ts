import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
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

class RuntimeElement {
  readonly children: RuntimeElement[] = []
  readonly classList = { add() {}, remove() {}, toggle() {} }
  readonly dataset: Record<string, string> = {}
  readonly style = { setProperty() {} }
  readonly tagName: string
  hidden = false
  innerHTML = ''

  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase()
  }

  appendChild(child: RuntimeElement): RuntimeElement {
    this.children.push(child)
    return child
  }

  append(...children: RuntimeElement[]): void { this.children.push(...children) }
  prepend(...children: RuntimeElement[]): void { this.children.unshift(...children) }
  insertBefore(child: RuntimeElement): RuntimeElement { return this.appendChild(child) }
  addEventListener(): void {}
  removeAttribute(): void {}
  setAttribute(): void {}
  getAttribute(): null { return null }
  querySelectorAll(): RuntimeElement[] { return [] }
  closest(): undefined { return undefined }
  contains(): boolean { return false }
  remove(): void {}
  replaceChildren(): void { this.children.length = 0 }
  cloneNode(): RuntimeElement { return new RuntimeElement(this.tagName) }
  get outerHTML(): string { return `<${this.tagName.toLowerCase()}>${this.innerHTML}</${this.tagName.toLowerCase()}>` }
}

function runtimeAcceptanceContext(preview: readonly unknown[]) {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const posted: Record<string, unknown>[] = []
  const parent = {
    postMessage(message: Record<string, unknown>) {
      posted.push(message)
      if (message.action !== 'generation-preview') return
      queueMicrotask(() => {
        for (const listener of listeners.get('message') ?? []) listener({
          source: parent,
          data: {
            source: 'dsh-agent-rp-host',
            action: 'generation-preview-result',
            requestId: message.requestId,
            ok: true,
            value: preview,
          },
        })
      })
    },
  }
  const body = new RuntimeElement('body')
  const context: Record<string, unknown> = {
    AbortController,
    AbortSignal,
    Element: RuntimeElement,
    Node: RuntimeElement,
    MutationObserver: class { observe() {} },
    Response,
    URL,
    console,
    document: {
      body,
      readyState: 'complete',
      createElement(tagName: string) {
        const element = new RuntimeElement(tagName) as RuntimeElement & { content?: { childNodes: RuntimeElement[] } }
        if (tagName === 'template') element.content = { childNodes: [] }
        return element
      },
      querySelectorAll() { return [] },
      addEventListener() {},
    },
    fetch() { throw new Error('unexpected native fetch') },
    getComputedStyle() { return { display: 'block', visibility: 'visible', getPropertyValue() { return '' } } },
    parent,
    posted,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    addEventListener(type: string, listener: (event: unknown) => void) {
      const current = listeners.get(type) ?? []
      current.push(listener)
      listeners.set(type, current)
    },
  }
  context.window = context
  return context
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
  assert.match(source!, /window\.generateRaw=/u)
  assert.match(source!, /\/api\/backends\/chat-completions\/generate/u)
  assert.match(source!, /window\.stopGenerationById=/u)
  assert.match(source!, /window\.stopAllGeneration=/u)
  assert.match(source!, /generation-cancel/u)
  assert.match(source!, /CHAT_COMPLETION_PROMPT_READY:'chat_completion_prompt_ready'/u)
  assert.match(source!, /GENERATE_AFTER_DATA:'generate_after_data'/u)
  assert.match(source!, /GENERATE_AFTER_COMBINE_PROMPTS:'generate_after_combine_prompts'/u)
  assert.match(source!, /generation-preview/u)
  assert.match(source!, /generation-preview-result/u)
  assert.ok(source!.indexOf('var prompts=await __dshPromptPreview')
    < source!.indexOf("var response=await window.fetch('/api/backends/chat-completions/generate'"))
  assert.match(source!, /window\.getModelList=/u)
})

test('lets V18-style dry-run listeners capture prompts without Host generation', async () => {
  const prompts = [
    { role: 'system', content: '角色与世界状态' },
    { role: 'user', content: '最近十层对话' },
  ]
  const script = String.raw`
const marker = '__ssDryRunCapture_acceptance__';
const captured = { order: [] };
eventOn(tavern_events.CHAT_COMPLETION_PROMPT_READY, data => {
  captured.order.push('ready');
  captured.ready = data.chat;
});
eventOn(tavern_events.GENERATE_AFTER_DATA, (data, dryRun) => {
  captured.order.push('data');
  captured.data = data.prompt;
  captured.dryRun = dryRun;
});
eventOn(tavern_events.GENERATE_AFTER_COMBINE_PROMPTS, data => {
  captured.order.push('combined');
  captured.combined = data.prompt;
});
const previousFetch = window.fetch;
window.fetch = async (input, init) => {
  const body = typeof init?.body === 'string' ? init.body : '';
  if (!body.includes(marker)) return previousFetch(input, init);
  captured.body = JSON.parse(body);
  return new Response(JSON.stringify({
    choices: [{ message: { role: 'assistant', content: 'captured locally' } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};
window.__acceptance = generate({
  preset_name: 'in_use',
  user_input: '【玄狐上下文抓取】' + marker,
  should_silence: true,
  should_stream: false,
  automatic_trigger: true,
  _qrf_processed_by_hook: true,
  max_chat_history: 10,
}).then(result => ({ result, captured }));
`
  const html = tavernScriptFrameSource({
    id: 'v18-capture', name: '1', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'v18-capture', scriptName: '1', scriptInfo: '', buttons: [],
    characterName: '白露', characterId: 'bailu.png', chatId: 'session-test',
    approvedScriptOrigins: [],
    preset: { name: 'V18', revision: 1, value: {} },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {},
    worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    messages: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext(prompts)
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(await context.__acceptance)) as {
    result: string
    captured: {
      order: string[]
      ready: unknown
      data: unknown
      combined: unknown
      dryRun: boolean
      body: Record<string, unknown>
    }
  }
  assert.equal(result.result, 'captured locally')
  assert.deepEqual(result.captured.order, ['ready', 'data', 'combined'])
  assert.deepEqual(result.captured.ready, prompts)
  assert.deepEqual(result.captured.data, prompts)
  assert.deepEqual(result.captured.combined, prompts)
  assert.equal(result.captured.dryRun, false)
  assert.equal(result.captured.body.user_input, '【玄狐上下文抓取】__ssDryRunCapture_acceptance__')
  assert.deepEqual(result.captured.body.messages, [])
  const actions = (context.posted as Record<string, unknown>[]).map(message => message.action)
  assert.ok(actions.includes('generation-preview'))
  assert.ok(!actions.includes('generate'))
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
