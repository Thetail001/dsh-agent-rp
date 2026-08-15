import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import type { ImportedRegexScript } from '../src/import/types.ts'
import {
  readTavernExtensionSettings,
  resolveTavernScriptExecution,
  TAVERN_EXTENSION_SETTINGS_KEY,
  TavernScriptOriginApprovalError,
  tavernScriptFrameSource,
  validatedTavernCompatibilityMarkers,
  writeTavernExtensionSettings,
  type TavernScriptSnapshot,
} from '../src/client/tavern-runtime.ts'
import { parseTavernSlashCommand } from '../src/client/tavern-slash.ts'
import {
  AI_OUTPUT_PLACEMENT,
  hasCharacterDisplayFrontend,
  normalizeSillyTavernMarkdown,
  renderCharacterDisplay,
  renderCharacterPromptView,
  splitCharacterDisplay,
  summarizeCharacterRegexScript,
  traceCharacterPromptView,
  USER_INPUT_PLACEMENT,
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

test('summarizes character regex compatibility without exposing its source', () => {
  assert.deepEqual(summarizeCharacterRegexScript(base), {
    scriptName: 'script',
    enabled: true,
    state: 'active',
    placement: [AI_OUTPUT_PLACEMENT],
    unsupportedPlacement: [],
    display: true,
    prompt: false,
    runOnEdit: false,
    minDepth: null,
    maxDepth: null,
  })
  assert.equal(summarizeCharacterRegexScript({ ...base, placement: [AI_OUTPUT_PLACEMENT, 5] }).state, 'partial')
  assert.equal(summarizeCharacterRegexScript({ ...base, placement: [5] }).state, 'unsupported')
  assert.equal(summarizeCharacterRegexScript({ ...base, findRegex: '/[/' }).state, 'invalid')
  assert.equal(summarizeCharacterRegexScript({ ...base, disabled: true }).state, 'disabled')
})

test('renders plain Markdown replacements for user-message display rules', () => {
  const userRule = { ...base, placement: [USER_INPUT_PLACEMENT], replaceString: '**new**' }
  const rendered = renderCharacterDisplay('old', {
    ...character,
    frontend: { ...character.frontend, regexScripts: [userRule] },
  }, USER_INPUT_PLACEMENT)
  assert.equal(rendered, '**new**')
  assert.deepEqual(splitCharacterDisplay(rendered), [{ kind: 'markdown', text: '**new**' }])
})

test('parses Tavern send and trigger pipelines without leaking commands into chat', () => {
  assert.deepEqual(parseTavernSlashCommand('/send 选择A || /trigger'), { kind: 'send', text: '选择A' })
  assert.deepEqual(parseTavernSlashCommand('/send 选择B |/trigger'), { kind: 'send', text: '选择B' })
  assert.deepEqual(parseTavernSlashCommand('/send 选择C||/trigger  '), { kind: 'send', text: '选择C' })
  assert.deepEqual(parseTavernSlashCommand('/send 普通消息'), { kind: 'send', text: '普通消息' })
})

test('distinguishes Tavern draft updates, triggered drafts, and a bare trigger', () => {
  assert.deepEqual(parseTavernSlashCommand('/setinput 暂存内容'), {
    kind: 'set-input', text: '暂存内容', trigger: false,
  })
  assert.deepEqual(parseTavernSlashCommand('/setinput 立即发送 | /trigger'), {
    kind: 'set-input', text: '立即发送', trigger: true,
  })
  assert.deepEqual(parseTavernSlashCommand('/trigger'), { kind: 'trigger' })
  assert.equal(parseTavernSlashCommand('/echo 未支持'), undefined)
})

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
  const stored = new Map<string, unknown>()
  const parent = {
    postMessage(message: Record<string, unknown>) {
      posted.push(message)
      if (message.action === 'preset-replace') {
        queueMicrotask(() => {
          for (const listener of listeners.get('message') ?? []) listener({
            source: parent,
            data: {
              source: 'dsh-agent-rp-host', action: 'preset-result', requestId: message.requestId, ok: true,
            },
          })
        })
        return
      }
      if (message.action === 'worldbook-mutate' || message.action === 'variables-replace') {
        queueMicrotask(() => {
          for (const listener of listeners.get('message') ?? []) listener({
            source: parent,
            data: {
              source: 'dsh-agent-rp-host', action: 'variables-result', requestId: message.requestId, ok: true,
            },
          })
        })
        return
      }
      if (message.action === 'extension-settings-save' && typeof message.requestId === 'string') {
        queueMicrotask(() => {
          for (const listener of listeners.get('message') ?? []) listener({
            source: parent,
            data: {
              source: 'dsh-agent-rp-host', action: 'settings-result', requestId: message.requestId, ok: true,
            },
          })
        })
        return
      }
      if (message.action === 'storage-request' && typeof message.requestId === 'string'
        && typeof message.namespace === 'string' && typeof message.operation === 'string') {
        const prefix = `${message.namespace}\u0000`
        const itemKey = `${prefix}${String(message.key ?? '')}`
        let value: unknown
        if (message.operation === 'get') value = stored.get(itemKey) ?? null
        else if (message.operation === 'set') { stored.set(itemKey, message.value); value = message.value }
        else if (message.operation === 'remove') stored.delete(itemKey)
        else {
          const keys = [...stored.keys()].filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length))
          if (message.operation === 'clear') {
            for (const key of keys) stored.delete(`${prefix}${key}`)
          } else if (message.operation === 'keys') value = keys
          else if (message.operation === 'length') value = keys.length
          else if (message.operation === 'key') value = keys[Number(message.index)] ?? null
        }
        queueMicrotask(() => {
          for (const listener of listeners.get('message') ?? []) listener({
            source: parent,
            data: {
              source: 'dsh-agent-rp-host', action: 'storage-result', requestId: message.requestId, ok: true, value,
            },
          })
        })
        return
      }
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
    crypto: { randomUUID: () => '12345678-1234-4234-8234-123456789abc' },
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
    dispatchHost(data: Record<string, unknown>) {
      for (const listener of listeners.get('message') ?? []) listener({
        source: parent,
        data: { source: 'dsh-agent-rp-host', ...data },
      })
    },
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
  }, 'window.__personaSnapshot={name:getCurrentPersonaName(),id:getCurrentPersonaId()}; window.__renderedMarkdown=builtin.renderMarkdown("**粗体**\\n\\n```yaml\\nkey: value\\n```"); window.__runtimeLibraries={domPurify:"DOMPurify" in SillyTavern.libs,fuse:"Fuse" in SillyTavern.libs,uuid:SillyTavern.getContext().uuidv4()}; replaceScriptButtons([{name:"学校",visible:true}])', {
    scriptId: 'travel', scriptName: '地点选择', scriptInfo: '测试',
    buttons: [{ name: '开始', visible: true }], characterName: '白露', characterId: 'bailu.png',
    chatId: 'session-test', approvedScriptOrigins: [], persona: {
      id: 'persona-12345678-1234-4123-8123-123456789abc', name: '小满', description: '怕冷，喜欢旧书。',
    },
    preset: {
      name: 'V18', revision: 3,
      value: { settings: {}, prompts: [], prompts_unused: [], extensions: {} },
    },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [],
    messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [],
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
  assert.match(source!, /window\.getCurrentPersonaName=/u)
  assert.match(source!, /window\.getCurrentPersonaId=/u)
  assert.match(source!, /window\.builtin=/u)
  assert.match(source!, /window\.SillyTavern\.libs\.DOMPurify=window\.DOMPurify/u)
  assert.match(source!, /window\.SillyTavern\.libs\.Fuse=window\.Fuse/u)
  assert.match(html, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/dompurify@3\.3\.0\/dist\/purify\.min\.js"/u)
  assert.match(html, /integrity="sha384-\+qi1h9Ene5uYXijovnRnDpm2TZiNyVFgYjKIqjw6id8zLdWYt\+tCPG9\/1u6yLaNj"/u)
  assert.match(html, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/fuse\.js@7\.1\.0\/dist\/fuse\.min\.js"/u)
  assert.match(html, /integrity="sha384-P\/y\/5cwqUn6MDvJ9lCHJSaAi2EoH3JSeEdyaORsQMPgbpvA\+NvvUqik7XH2YGBjb"/u)
  assert.match(source!, /window\.getPreset=/u)
  assert.match(source!, /window\.updatePresetWith=/u)
  assert.match(source!, /window\.setPreset=/u)
  assert.match(source!, /window\.getTavernRegexes=/u)
  assert.match(source!, /window\.replaceTavernRegexes=/u)
  assert.match(source!, /window\.updateTavernRegexesWith=/u)
  assert.match(source!, /window\.formatAsTavernRegexedString=/u)
  assert.match(source!, /window\.registerMacroLike=/u)
  assert.match(source!, /window\.unregisterMacroLike=/u)
  assert.match(source!, /window\.substitudeMacros=/u)
  assert.match(source!, /window\.substituteParams=/u)
  assert.match(source!, /window\.injectPrompts=/u)
  assert.match(source!, /window\.uninjectPrompts=/u)
  assert.match(source!, /window\.getScriptTrees=/u)
  assert.match(source!, /window\.getAllEnabledScriptButtons=/u)
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
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  assert.deepEqual(JSON.parse(JSON.stringify(context.__personaSnapshot)), {
    name: '小满', id: 'persona-12345678-1234-4123-8123-123456789abc',
  })
  assert.deepEqual(JSON.parse(JSON.stringify(context.__runtimeLibraries)), {
    domPurify: true, fuse: true, uuid: '12345678-1234-4234-8234-123456789abc',
  })
  assert.equal(context.__renderedMarkdown,
    '<p><strong>粗体</strong></p><pre><code class="language-yaml">key: value</code></pre>')
})

test('preserves authorized ESM imports and plans their required public globals', async () => {
  const originalFetch = globalThis.fetch
  const fetched: string[] = []
  globalThis.fetch = (input: string | URL | Request) => {
    fetched.push(String(input))
    return Promise.resolve(new Response('export function register() { return z.object({ value: z.string() }).parse(YAML.parse("value: ok")); }'))
  }
  try {
    const plan = await resolveTavernScriptExecution([
      "import { register } from 'https://cdn.jsdelivr.net/gh/example/project@1.0.0/module.js';",
      'window.__registered = register();',
    ].join('\n'), AbortSignal.timeout(5_000))
    assert.equal(plan.mode, 'module')
    assert.deepEqual(plan.preloads, ['yaml', 'zod'])
    assert.equal(plan.needsDomPurify, false)
    assert.equal(plan.needsFuse, false)
    assert.match(plan.source, /import \{ register \} from 'https:\/\/cdn\.jsdelivr\.net/u)
    assert.deepEqual(fetched, ['https://cdn.jsdelivr.net/gh/example/project@1.0.0/module.js'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('adapts the public MagVarUpdate side-effect bundle to the Host Mvu capability', async () => {
  const plan = await resolveTavernScriptExecution([
    "import 'https://cdn.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@beta/artifact/bundle.js';",
    'window.__mvu = Mvu;',
  ].join('\n'), AbortSignal.timeout(5_000))
  assert.equal(plan.mode, 'classic')
  assert.equal(plan.source, 'window.__mvu = Mvu;')
})

test('rejects module references that cannot be authorized before execution', async () => {
  await assert.rejects(
    resolveTavernScriptExecution("import value from './local.js';", AbortSignal.timeout(5_000)),
    /完整 HTTPS 地址/u,
  )
  await assert.rejects(
    resolveTavernScriptExecution('const path = location.hash; import(path);', AbortSignal.timeout(5_000)),
    /固定 HTTPS 地址/u,
  )
  await assert.rejects(
    resolveTavernScriptExecution("import 'https://modules.example.test/entry.js';", AbortSignal.timeout(5_000)),
    error => error instanceof TavernScriptOriginApprovalError && error.origin === 'https://modules.example.test',
  )
})

test('runs module plans through a Blob and reports ready only after evaluation', () => {
  const html = tavernScriptFrameSource({
    id: 'module-runtime', name: '模块兼容', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, {
    source: 'export const ready = true;', mode: 'module', preloads: ['yaml', 'zod'],
    needsDomPurify: false, needsFuse: false,
  }, {
    scriptId: 'module-runtime', scriptName: '模块兼容', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [],
    displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  assert.match(html, /script-src 'unsafe-inline' 'unsafe-eval' blob:/u)
  assert.match(html, /connect-src 'none'/u)
  assert.match(source!, /URL\.createObjectURL\(new Blob/u)
  assert.match(source!, /import\("https:\/\/cdn\.jsdelivr\.net\/npm\/yaml@2\.9\.0\/\+esm"\)/u)
  assert.match(source!, /import\("https:\/\/cdn\.jsdelivr\.net\/npm\/zod@4\.4\.3\/\+esm"\)/u)
  assert.ok(source!.indexOf('await import(__dshModuleUrl)') < source!.lastIndexOf("__dshPost('ready',"))
})

test('reports only bounded true compatibility markers after script startup', () => {
  const html = tavernScriptFrameSource({
    id: 'marker-runtime', name: '依赖标记', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, 'window.__辅助计算脚本_loaded__=true;window.__小手机脚本_loaded__=false;window.__invalid=true;', {
    scriptId: 'marker-runtime', scriptName: '依赖标记', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [],
    displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const ready = (context.posted as Record<string, unknown>[]).find(message => message.action === 'ready')

  assert.deepEqual(JSON.parse(JSON.stringify(ready?.markers)), ['__辅助计算脚本_loaded__'])
  assert.deepEqual(validatedTavernCompatibilityMarkers([
    '__辅助计算脚本_loaded__', '__辅助计算脚本_loaded__', '__invalid marker_loaded__', true,
  ]), ['__辅助计算脚本_loaded__'])
})

test('provides the common Tavern Helper lodash surface without opening network access', () => {
  const script = String.raw`
var values = [1, 2, 3, 4];
var removed = _.remove(values, function(value) { return value % 2 === 0; });
window.__lodashSurface = {
  escaped: _.escape('<&>"'),
  object: _.isObject({}),
  date: _.isDate(new Date(0)),
  string: _.isString(new String('x')),
  path: _.toPath('a[0].b'),
  unique: _.uniq([1, 1, 2]),
  concatenated: _.concat([1], [2, 3], 4),
  remaining: values,
  removed: removed,
  intersection: _.intersectionBy([{ id: 1 }, { id: 2 }], [{ id: 2 }], function(item) { return item.id; }).map(function(item) { return item.id; }),
  empty: _.isEmpty({}),
  mapped: _.mapValues({ a: 2 }, function(value) { return value * 3; }),
  sorted: _.sortBy([{ rank: 2 }, { rank: 1 }], 'rank').map(function(value) { return value.rank; }),
  flattened: _.flatMap([{ values: [1, 2] }, { values: [3] }], 'values'),
  some: _.some([{ ready: false }, { ready: true }], ['ready', true]),
  updated: _.update({ nested: { value: 2 } }, 'nested.value', function(value) { return value * 4; }),
  nil: [_.isNil(null), _.isNil(undefined), _.isNil(0)],
  dropped: _.dropRight([1, 2, 3], 2),
  pulled: (function() { var value = ['a', 'b', 'c']; return { removed: _.pullAt(value, [0, 2]), value: value }; })(),
  last: _.last(['a', 'b']),
  saveChat: typeof SillyTavern.saveChat().then === 'function',
};
`
  const html = tavernScriptFrameSource({
    id: 'lodash-runtime', name: '工具兼容', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'lodash-runtime', scriptName: '工具兼容', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [],
    displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)

  assert.deepEqual(JSON.parse(JSON.stringify(context.__lodashSurface)), {
    escaped: '&lt;&amp;&gt;&quot;', object: true, date: true, string: true,
    path: ['a', '0', 'b'], unique: [1, 2], concatenated: [1, 2, 3, 4],
    remaining: [1, 3], removed: [2, 4], intersection: [2], empty: true, mapped: { a: 6 }, saveChat: true,
    sorted: [1, 2], flattened: [1, 2, 3], some: true, updated: { nested: { value: 8 } },
    nil: [true, true, false], dropped: [1], pulled: { removed: ['a', 'c'], value: ['b'] }, last: 'b',
  })
})

test('bridges Tavern confirmation popups to the Host and returns custom results', async () => {
  const script = String.raw`
window.__popupResult = SillyTavern.callGenericPopup(
  builtin.renderMarkdown('**要保存吗？**'),
  SillyTavern.POPUP_TYPE.CONFIRM,
  '',
  { okButton: '保存', cancelButton: '放弃', customButtons: ['稍后'] },
);
toastr.success('已打开确认框');
`
  const html = tavernScriptFrameSource({
    id: 'popup', name: '确认保存', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'popup', scriptName: '确认保存', scriptInfo: '', buttons: [],
    characterName: '白露', characterId: 'bailu.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const popup = (context.posted as Record<string, unknown>[]).find(message => message.action === 'popup-request')
  assert.deepEqual(JSON.parse(JSON.stringify(popup)), {
    source: 'dsh-agent-rp-tavern-script', scriptId: 'popup', action: 'popup-request', requestId: '1',
    popupType: 2, content: '<p><strong>要保存吗？</strong></p>', inputValue: '',
    options: {
      okButton: '保存', cancelButton: '放弃',
      customButtons: [{ text: '稍后', result: 2 }],
    },
  })
  const toast = (context.posted as Record<string, unknown>[]).find(message => message.action === 'toast')
  assert.deepEqual(JSON.parse(JSON.stringify(toast)), {
    source: 'dsh-agent-rp-tavern-script', scriptId: 'popup', action: 'toast',
    level: 'success', value: '已打开确认框',
  })
  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'popup-result', requestId: '1', ok: true, value: 2,
  })
  assert.equal(await context.__popupResult, 2)
})

test('supports modern Popup instances and Popup.show convenience methods', async () => {
  const script = String.raw`
window.__modernPopup = {
  confirm: SillyTavern.Popup.show.confirm('删除记录', '**确定吗？**'),
  input: new SillyTavern.Popup('<p>新的名字</p>', SillyTavern.POPUP_TYPE.INPUT, '旧名字', {
    placeholder: '输入名字',
  }).show(),
};
`
  const html = tavernScriptFrameSource({
    id: 'modern-popup', name: '现代弹窗', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'modern-popup', scriptName: '现代弹窗', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const popups = (context.posted as Record<string, unknown>[]).filter(message => message.action === 'popup-request')
  assert.equal(popups.length, 2)
  assert.deepEqual(JSON.parse(JSON.stringify(popups)), [{
    source: 'dsh-agent-rp-tavern-script', scriptId: 'modern-popup', action: 'popup-request', requestId: '1',
    popupType: 2, content: '<h3>删除记录</h3><p><strong>确定吗？</strong></p>', inputValue: '', options: {},
  }, {
    source: 'dsh-agent-rp-tavern-script', scriptId: 'modern-popup', action: 'popup-request', requestId: '2',
    popupType: 3, content: '<p>新的名字</p>', inputValue: '旧名字', options: { placeholder: '输入名字' },
  }])
  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'popup-result', requestId: '1', ok: true, value: 1,
  })
  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'popup-result', requestId: '2', ok: true, value: '新名字',
  })
  const result = context.__modernPopup as { confirm: Promise<boolean>; input: Promise<string> }
  assert.equal(await result.confirm, true)
  assert.equal(await result.input, '新名字')
})

test('persists extension settings and exposes the lodash debounce used by public Tavern scripts', async () => {
  const script = String.raw`
const st = SillyTavern.getContext();
const sameSettings = st.extensionSettings === extension_settings;
st.extensionSettings.cardRefinery.theme = 'night';
const calls = [];
const saveDraft = st.libs.lodash.debounce(value => calls.push(value), 100);
saveDraft('old');
saveDraft('latest');
const pendingBeforeFlush = saveDraft.pending();
saveDraft.flush();
saveDraft('cancelled');
saveDraft.cancel();
window.__tavernSettings = {
  sameSettings,
  clone: st.libs.lodash.cloneDeep(st.extensionSettings),
  calls,
  pendingBeforeFlush,
  pendingAfterCancel: saveDraft.pending(),
  save: builtin.saveSettings(),
};
`
  const html = tavernScriptFrameSource({
    id: 'settings', name: '扩展设置', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'settings', scriptName: '扩展设置', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    extensionSettings: { cardRefinery: { theme: 'light', autosave: true } },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  await (context.__tavernSettings as { save: Promise<void> }).save
  const result = JSON.parse(JSON.stringify(context.__tavernSettings)) as Record<string, unknown>
  assert.equal(result.sameSettings, true)
  assert.deepEqual(result.clone, { cardRefinery: { theme: 'night', autosave: true } })
  assert.deepEqual(result.calls, ['latest'])
  assert.equal(result.pendingBeforeFlush, true)
  assert.equal(result.pendingAfterCancel, false)
  const save = (context.posted as Record<string, unknown>[]).find(message => message.action === 'extension-settings-save')
  assert.deepEqual(JSON.parse(JSON.stringify(save)), {
    source: 'dsh-agent-rp-tavern-script', scriptId: 'settings', action: 'extension-settings-save', requestId: '1',
    settings: { cardRefinery: { theme: 'night', autosave: true } },
  })
  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'extension-settings-sync', settings: { shared: { revision: 2 } },
  })
  assert.deepEqual(JSON.parse(JSON.stringify(context.extension_settings)), { shared: { revision: 2 } })
})

test('bridges localforage data and isolated instances to Host-owned persistent storage', async () => {
  const script = String.raw`
window.__localforage = (async () => {
  const storage = SillyTavern.libs.localforage;
  const stored = await storage.setItem('session', { stage: 2, title: '钟楼' });
  const loaded = await storage.getItem('session');
  const custom = storage.createInstance({ name: 'card-refinery', storeName: 'sessions' });
  await custom.setItem('draft', ['第一步', '第二步']);
  const customKeys = await custom.keys();
  const iterated = [];
  await custom.iterate((value, key, iteration) => { iterated.push({ value, key, iteration }); });
  const isolated = await storage.getItem('draft');
  await storage.removeItem('session');
  return {
    stored, loaded, customKeys, iterated, isolated,
    rootLength: await storage.length(),
    customLength: await custom.length(),
    firstCustomKey: await custom.key(0),
  };
})();
`
  const html = tavernScriptFrameSource({
    id: 'localforage', name: '持久存储', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'localforage', scriptName: '持久存储', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  assert.deepEqual(JSON.parse(JSON.stringify(await context.__localforage)), {
    stored: { stage: 2, title: '钟楼' },
    loaded: { stage: 2, title: '钟楼' },
    customKeys: ['draft'],
    iterated: [{ value: ['第一步', '第二步'], key: 'draft', iteration: 1 }],
    isolated: null,
    rootLength: 0,
    customLength: 1,
    firstCustomKey: 'draft',
  })
  const requests = (context.posted as Record<string, unknown>[]).filter(message => message.action === 'storage-request')
  assert.ok(requests.some(message => message.namespace === 'localforage\u0000keyvaluepairs'))
  assert.ok(requests.some(message => message.namespace === 'card-refinery\u0000sessions'))
})

test('round-trips browser-persisted Tavern extension settings and recovers corrupt data', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem(key: string) { return values.get(key) ?? null },
    setItem(key: string, value: string) { values.set(key, value) },
  }
  assert.deepEqual(writeTavernExtensionSettings(storage, { sample: { enabled: true } }), {
    sample: { enabled: true },
  })
  assert.deepEqual(readTavernExtensionSettings(storage), { sample: { enabled: true } })
  assert.equal(values.get(TAVERN_EXTENSION_SETTINGS_KEY), '{"sample":{"enabled":true}}')
  values.set(TAVERN_EXTENSION_SETTINGS_KEY, '{')
  assert.deepEqual(readTavernExtensionSettings(storage), {})
  assert.throws(() => writeTavernExtensionSettings(storage, []), /必须是对象/u)
})

test('exposes only the current lossless character card through SillyTavern context and getCharData', () => {
  const characterCard = {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: '白露', nickname: '露露', description: '钟表匠', personality: '沉静', scenario: '打烊前',
      first_mes: '门还没锁。', mes_example: '<START>', alternate_greetings: ['今天来得很早。'],
      system_prompt: '', post_history_instructions: '', creator_notes: '', tags: [], creator: 'fixture',
      character_version: '1', extensions: { custom: { retained: true } },
    },
  }
  const script = String.raw`
const st = SillyTavern.getContext();
const first = getCharData('current');
first.description = 'sandbox copy';
window.__currentCharacter = {
  characterId: st.characterId,
  thisChid: st.this_chid,
  globalThisChid: this_chid,
  characterCount: st.characters.length,
  sameCharacters: st.characters === characters,
  indexedName: st.characters[st.characterId].name,
  current: getCharData('current'),
  byName: getCharData('白露'),
  byAvatar: getCharData('bailu.png'),
  missing: getCharData('另一张卡'),
  names: getCharacterNames(),
  ids: getCharacterIds(),
};
`
  const html = tavernScriptFrameSource({
    id: 'current-card', name: '当前角色', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'current-card', scriptName: '当前角色', scriptInfo: '', buttons: [],
    characterName: '露露', characterId: 'bailu.png', characterCard, chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(context.__currentCharacter)) as Record<string, unknown>
  assert.equal(result.characterId, 0)
  assert.equal(result.thisChid, 0)
  assert.equal(result.globalThisChid, 0)
  assert.equal(result.characterCount, 1)
  assert.equal(result.sameCharacters, true)
  assert.equal(result.indexedName, '白露')
  assert.equal((result.current as Record<string, unknown>).description, '钟表匠')
  assert.equal(((result.current as { data: { extensions: { custom: { retained: boolean } } } })
    .data.extensions.custom.retained), true)
  assert.deepEqual(result.byName, result.current)
  assert.deepEqual(result.byAvatar, result.current)
  assert.equal(result.missing, null)
  assert.deepEqual(result.names, ['白露'])
  assert.deepEqual(result.ids, ['bailu.png'])
})

test('lets Tavern scripts replace the complete preset regex list', async () => {
  const script = String.raw`
window.__regexMutation = replaceTavernRegexes([{
  id: 'script-added', script_name: '', enabled: true,
  find_regex: '/old/gu', replace_string: 'new', trim_strings: [],
  source: { user_input: false, ai_output: true, slash_command: false, world_info: false, reasoning: false },
  destination: { display: true, prompt: false }, run_on_edit: false,
  min_depth: null, max_depth: null,
}], { type: 'preset', name: 'in_use' }).then(() => getTavernRegexes({ type: 'preset', name: 'in_use' }));
`
  const html = tavernScriptFrameSource({
    id: 'regex-editor', name: '正则编辑', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'regex-editor', scriptName: '正则编辑', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test',
    approvedScriptOrigins: [], preset: {
      name: '预设', revision: 1,
      value: { settings: {}, prompts: [], prompts_unused: [], extensions: { regex_scripts: [] } },
    },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const stored = JSON.parse(JSON.stringify(await context.__regexMutation)) as Record<string, unknown>[]
  assert.equal(stored.length, 1)
  assert.equal(stored[0]?.script_name, '未命名-script-added')
  const posted = (context.posted as Record<string, unknown>[]).find(message => message.action === 'preset-replace')
  assert.equal(
    ((posted?.preset as { extensions?: { regex_scripts?: Record<string, unknown>[] } })
      ?.extensions?.regex_scripts?.[0]?.script_name),
    '未命名-script-added',
  )
})

test('lets Tavern scripts inspect current character regexes through new and legacy APIs', () => {
  const characterRegex = {
    id: 'character-regex', script_name: '角色状态栏', enabled: true,
    find_regex: '/status/gu', replace_string: '状态', trim_strings: [],
    source: { user_input: false, ai_output: true, slash_command: false, world_info: false, reasoning: false },
    destination: { display: true, prompt: false }, run_on_edit: false,
    min_depth: null, max_depth: null,
  }
  const presetRegex = { ...characterRegex, id: 'preset-regex', script_name: '预设清理' }
  const script = String.raw`
const mutable = getTavernRegexes({ type: 'character', name: 'current' });
mutable[0].script_name = '不应污染快照';
window.__regexReads = {
  enabled: isCharacterTavernRegexesEnabled(),
  character: getTavernRegexes({ type: 'character', name: '角色' }),
  preset: getTavernRegexes({ type: 'preset', name: 'in_use' }),
  global: getTavernRegexes({ type: 'global' }),
  legacyAll: getTavernRegexes(),
  legacyCharacter: getTavernRegexes({ scope: 'character', enable_state: 'enabled' }),
  legacyGlobal: getTavernRegexes({ scope: 'global' }),
};
`
  const html = tavernScriptFrameSource({
    id: 'regex-reader', name: '正则读取', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'regex-reader', scriptName: '正则读取', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    preset: {
      name: '预设', revision: 1,
      value: { settings: {}, prompts: [], prompts_unused: [], extensions: { regex_scripts: [presetRegex] } },
    },
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [characterRegex],
    presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(context.__regexReads)) as Record<string, unknown>
  assert.equal(result.enabled, true)
  assert.deepEqual(result.character, [characterRegex])
  assert.deepEqual(result.preset, [presetRegex])
  assert.deepEqual(result.global, [])
  assert.deepEqual(result.legacyAll, [{ ...characterRegex, scope: 'character' }])
  assert.deepEqual(result.legacyCharacter, [{ ...characterRegex, scope: 'character' }])
  assert.deepEqual(result.legacyGlobal, [])
})

test('lets Tavern scripts inspect preset and character script trees without sharing mutations', () => {
  const characterScript: TavernScriptSnapshot['characterScriptTrees'][number] = {
    type: 'script', enabled: true, name: '角色状态', id: 'character-status', content: 'void 0', info: '',
    button: { enabled: true, buttons: [{ name: '查看', visible: true }] }, data: { mode: 'compact' },
    export_with: { data: true, button: true },
  }
  const presetScript = { ...characterScript, name: '预设工具', id: 'preset-tool' }
  const script = String.raw`
const mutable = getScriptTrees({ type: 'character' });
mutable[0].name = '不应污染快照';
window.__scriptTrees = {
  character: getScriptTrees({ type: 'character' }),
  preset: getScriptTrees({ type: 'preset' }),
  global: getScriptTrees({ type: 'global' }),
  buttons: getAllEnabledScriptButtons(),
};
`
  const html = tavernScriptFrameSource({
    id: 'tree-reader', name: '脚本读取', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'tree-reader', scriptName: '脚本读取', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [],
    presetScriptTrees: [presetScript], characterScriptTrees: [characterScript], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(context.__scriptTrees)) as Record<string, unknown>
  assert.deepEqual(result.character, [characterScript])
  assert.deepEqual(result.preset, [presetScript])
  assert.deepEqual(result.global, [])
  assert.deepEqual(result.buttons, {
    'character-status': [{ button_id: 'character-status_查看', button_name: '查看' }],
    'preset-tool': [{ button_id: 'preset-tool_查看', button_name: '查看' }],
  })
})

test('persists synchronous and asynchronous Tavern script tree updates', async () => {
  const characterScript: TavernScriptSnapshot['characterScriptTrees'][number] = {
    type: 'script', enabled: true, name: '初始脚本', id: 'character-tool', content: 'void 0', info: '',
    button: { enabled: true, buttons: [{ name: '查看', visible: true }] }, data: { mode: 'compact' },
    export_with: { data: true, button: true },
  }
  const script = String.raw`
window.__acceptance = (async () => {
  await replaceVariables({ mode: 'fresh' }, { type: 'script' });
  const sync = updateScriptTreesWith(trees => trees.map(tree => ({ ...tree, name: '同步修改' })), { type: 'character' });
  const asyncResult = await updateScriptTreesWith(async trees => [{
    type: 'folder', enabled: true, name: '工具箱', id: 'tools', scripts: trees,
  }], { type: 'character' });
  return { sync, asyncResult, current: getScriptTrees({ type: 'character' }), buttons: getAllEnabledScriptButtons() };
})();
`
  const html = tavernScriptFrameSource({
    id: 'character-tool', name: '脚本写入', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'character-tool', scriptName: '脚本写入', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [],
    presetScriptTrees: [], characterScriptTrees: [characterScript], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(await context.__acceptance)) as Record<string, unknown>
  assert.equal((result.sync as Record<string, unknown>[])[0]?.name, '同步修改')
  assert.deepEqual(result.current, result.asyncResult)
  assert.equal(((result.current as Record<string, unknown>[])[0]?.scripts as Record<string, unknown>[])[0]?.name, '同步修改')
  assert.deepEqual(result.buttons, {
    'character-tool': [{ button_id: 'character-tool_查看', button_name: '查看' }],
  })
  const writes = (context.posted as Record<string, unknown>[]).filter(message => message.action === 'worldbook-mutate')
  assert.equal(writes.length, 2)
  assert.deepEqual(writes.map(message => (message.request as Record<string, unknown>).operation), [
    'replace-script-trees', 'replace-script-trees',
  ])
  const firstTrees = (writes[0]?.request as { trees: { data: Record<string, unknown> }[] }).trees
  assert.equal(firstTrees[0]?.data.mode, 'fresh')
})

test('applies and unregisters Tavern Helper macro-like replacements', () => {
  const script = String.raw`
const registration = registerMacroLike(/\{\{mood::(.*?)\}\}/gu, (context, _match, mood) =>
  context.message_id + ':' + context.role + ':' + mood);
registerMacroLike(/\{\{mood::(.*?)\}\}/iu, () => 'duplicate must not win');
window.__macroBefore = formatAsTavernRegexedString('{{mood::平静}}', 'ai_output', 'display', { depth: 0 });
window.__macroDirect = substitudeMacros('{{char}}/{{user}}/{{lastMessageId}}/{{messageId}}/{{mood::安心}}');
registration.unregister();
window.__macroAfter = formatAsTavernRegexedString('{{mood::平静}}', 'ai_output', 'display', { depth: 0 });
`
  const html = tavernScriptFrameSource({
    id: 'macro-runtime', name: '宏替换', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'macro-runtime', scriptName: '宏替换', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [],
    messages: [{ messageId: 0, seq: 1, role: 'assistant', text: '', isHidden: false, data: {}, extra: {} }],
    characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  assert.equal(context.__macroBefore, '0:assistant:平静')
  assert.equal(context.__macroDirect, '角色/用户/0/0/0:assistant:安心')
  assert.equal(context.__macroAfter, '{{mood::平静}}')
})

test('exposes synchronous SillyTavern context macros from current transcript and variable scopes', () => {
  const script = String.raw`
const st = SillyTavern.getContext();
window.__sillyTavernMacros = {
  sameContext: st === SillyTavern,
  direct: substituteParams('{{lastMessage}}|{{lastUserMessage}}|{{lastCharMessage}}|{{get_message_variable::status}}|{{get_chat_variable::route.name}}|{{get_character_variable::profile.title}}|{{get_preset_variable::tone}}|{{get_global_variable::theme}}|{{get_global_variable::missing}}'),
  formatted: substituteParams('状态:\n  {{format_message_variable::status}}\n路线: {{format_chat_variable::route}} / {{format_character_variable::profile}}\n配置:\n  {{format_global_variable::yaml}}'),
  throughContext: st.substituteParams('{{char}}/{{user}}/{{lastMessageId}}'),
  latestChatText: st.chat.at(-1).mes,
};
`
  const html = tavernScriptFrameSource({
    id: 'context-macros', name: '上下文宏', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'context-macros', scriptName: '上下文宏', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', userName: '旅人',
    approvedScriptOrigins: [],
    scopes: {
      global: { theme: '夜色', yaml: { lines: '第一行\n第二行', flags: [true, 'false'] } }, preset: { tone: '温柔' },
      character: { profile: { title: '导游' } }, chat: { route: { name: '北岸' } },
      message: {}, script: {},
    },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [],
    messages: [
      { messageId: 0, seq: 1, role: 'user', text: '去哪里？', isHidden: false, data: {}, extra: {} },
      {
        messageId: 1, seq: 2, role: 'assistant', text: '去灯塔。', isHidden: false,
        data: { status: { value: 3, $internal: '不应暴露' } }, extra: {},
      },
    ],
    characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(context.__sillyTavernMacros)) as Record<string, unknown>
  assert.deepEqual(result, {
    sameContext: true,
    direct: '去灯塔。|去哪里？|去灯塔。|{"value":3}|北岸|导游|温柔|夜色|null',
    formatted: '状态:\n  value: 3\n路线: name: 北岸 / title: 导游\n配置:\n  lines: |-\n    第一行\n    第二行\n  flags:\n    - true\n    - "false"',
    throughContext: '角色/旅人/1',
    latestChatText: '去灯塔。',
  })
})

test('relays filtered Tavern Helper prompt injections and their disposer to the Host', async () => {
  const script = String.raw`
const registration = injectPrompts([
  { id: 'active', position: 'in_chat', depth: 2, role: 'system', content: '当前场景' },
  { id: 'filtered', position: 'in_chat', depth: 0, role: 'user', content: '不应注入', filter: () => false },
], { once: true });
window.__injectionReady = Promise.resolve().then(() => {
  registration.uninject();
  return Promise.resolve();
});
`
  const html = tavernScriptFrameSource({
    id: 'prompt-injector', name: '提示注入', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'prompt-injector', scriptName: '提示注入', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  assert.equal((context.posted as Record<string, unknown>[]).filter(message => message.action === 'injections-replace').length, 1)
  await context.__injectionReady
  await Promise.resolve()
  const mutations = (context.posted as Record<string, unknown>[])
    .filter(message => message.action === 'injections-replace')
  assert.deepEqual(JSON.parse(JSON.stringify(mutations.map(message => message.prompts))), [
    [{
      id: 'active', position: 'in_chat', depth: 2, role: 'system', content: '当前场景',
      shouldScan: false, once: true,
    }],
    [],
  ])
})

test('reevaluates Tavern Helper injection filters after variable snapshots change', () => {
  const script = String.raw`
injectPrompts([{
  id: 'conditional', position: 'none', depth: 0, role: 'system',
  content: '触发条件世界书', should_scan: true,
  filter: () => getVariables({ type: 'chat' }).enabled === true,
}]);
`
  const snapshot = {
    scriptId: 'conditional-injector', scriptName: '条件注入', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: { enabled: false }, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  } as const
  const html = tavernScriptFrameSource({
    id: 'conditional-injector', name: '条件注入', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, snapshot)
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const mutations = (): Record<string, unknown>[] => (context.posted as Record<string, unknown>[])
    .filter(message => message.action === 'injections-replace')
  assert.equal(mutations().length, 0)
  const sync = (enabled: boolean, injectedPrompts: readonly unknown[]): void => {
    ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
      action: 'variables-sync',
      scopes: { ...snapshot.scopes, chat: { enabled } },
      messages: [],
      injectedPrompts,
      worldbooks: {},
      worldbookBindings: snapshot.worldbookBindings,
      activeWorldbookEntries: [],
    })
  }
  sync(true, [])
  assert.deepEqual(JSON.parse(JSON.stringify(mutations().at(-1)?.prompts)), [{
    id: 'conditional', position: 'none', depth: 0, role: 'system',
    content: '触发条件世界书', shouldScan: true, once: false,
  }])
  sync(false, mutations().at(-1)?.prompts as readonly unknown[])
  assert.deepEqual(JSON.parse(JSON.stringify(mutations().at(-1)?.prompts)), [])
})

test('consumes only one-shot prompt injections after a completed generation event', async () => {
  const html = tavernScriptFrameSource({
    id: 'once-injector', name: '单次提示', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, '', {
    scriptId: 'once-injector', scriptName: '单次提示', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
    injectedPrompts: [
      { id: 'once', position: 'in_chat', depth: 0, role: 'system', content: '仅一次', shouldScan: true, once: true },
      { id: 'lasting', position: 'in_chat', depth: 0, role: 'system', content: '保留', shouldScan: true, once: false },
    ],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'event', eventType: 'generation_ended', args: [0],
  })
  await new Promise(resolve => setTimeout(resolve, 0))
  const mutation = (context.posted as Record<string, unknown>[])
    .findLast(message => message.action === 'injections-replace')
  assert.deepEqual(JSON.parse(JSON.stringify(mutation?.prompts)), [
    { id: 'lasting', position: 'in_chat', depth: 0, role: 'system', content: '保留', shouldScan: true, once: false },
  ])
})

test('persists canonical MVU initialization listener changes', async () => {
  const html = tavernScriptFrameSource({
    id: 'mvu-schema', name: '变量结构', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, String.raw`
window.__mvuInitializedEvent = Mvu.events.VARIABLE_INITIALIZED;
eventOn(Mvu.events.VARIABLE_INITIALIZED, variables => { variables.stat_data.ready = true; });
`, {
    scriptId: 'mvu-schema', scriptName: '变量结构', scriptInfo: '', buttons: [],
    characterName: '角色', characterId: 'character.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: { stat_data: {} }, script: {} },
    worldbooks: {}, worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  assert.equal(context.__mvuInitializedEvent, 'mag_variable_initialized')

  ;(context.dispatchHost as (data: Record<string, unknown>) => void)({
    action: 'event', eventType: 'mag_variable_initialized', args: [{ stat_data: {} }, 0],
  })
  await new Promise(resolve => setTimeout(resolve, 0))
  const mutation = (context.posted as Record<string, unknown>[])
    .findLast(message => message.action === 'variables-replace')
  assert.deepEqual(JSON.parse(JSON.stringify(mutation?.variables)), { stat_data: { ready: true } })
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
    activeWorldbookEntries: [],
    messages: [], characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
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

test('exposes worldbook entries and precise activation evidence to Tavern scripts', async () => {
  const script = String.raw`
window.__acceptance = Promise.all([
  getLorebookEntries('规则书'),
  getLorebookEntries('规则书', { filter: { type: 'constant' } }),
]).then(([entries, constants]) => ({
  entries,
  constants,
  activated: SillyTavern.getContext().chatMetadata.wi_activated,
}));
`
  const html = tavernScriptFrameSource({
    id: 'worldbook-reader', name: '世界书读取', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'worldbook-reader', scriptName: '世界书读取', scriptInfo: '', buttons: [],
    characterName: '白露', characterId: 'bailu.png', chatId: 'session-test',
    approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: { own: 'value' }, message: {}, script: {} },
    worldbooks: {
      规则书: [{
        uid: 7, name: '常驻规则', enabled: true,
        strategy: {
          type: 'constant', keys: ['规则'],
          keys_secondary: { logic: 'and_any', keys: ['附加'] }, scan_depth: 2,
        },
        position: { type: 'before_character_definition', role: 'system', depth: 4, order: 23 },
        content: '不得遗忘。', probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: true, delay_until: null },
        effect: { sticky: 2, cooldown: null, delay: null },
      }],
    },
    worldbookBindings: { global: ['规则书'], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: ['规则书.7'], messages: [], characterRegexScripts: [],
    presetScriptTrees: [], characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(await context.__acceptance)) as {
    entries: Record<string, unknown>[]
    constants: Record<string, unknown>[]
    activated: string[]
  }
  assert.deepEqual(result.activated, ['规则书.7'])
  assert.equal(result.entries.length, 1)
  assert.deepEqual(result.constants, result.entries)
  assert.deepEqual(result.entries[0], {
    uid: 7, display_index: 0, comment: '常驻规则', enabled: true, type: 'constant',
    position: 'before_character_definition', depth: null, order: 23, probability: 100,
    keys: ['规则'], key: ['规则'], logic: 'and_any', filters: ['附加'], filter: ['附加'], scan_depth: 2,
    case_sensitive: 'same_as_global', match_whole_words: 'same_as_global',
    use_group_scoring: 'same_as_global', automation_id: null,
    exclude_recursion: false, prevent_recursion: true, delay_until_recursion: false,
    content: '不得遗忘。', group: '', group_prioritized: false, group_weight: 100,
    sticky: 2, cooldown: null, delay: null, constant: true, disable: false,
  })
})

test('round-trips legacy lorebook mutations through the modern Host format', async () => {
  const script = String.raw`
window.__acceptance = (async () => {
  await replaceLorebookEntries('规则书', [{
    uid: 7, comment: '旧式条目', enabled: false, type: 'selective',
    position: 'at_depth_as_assistant', depth: 6, order: 31, probability: 70,
    keys: ['门'], logic: 'and_all', filters: ['夜'], scan_depth: 4,
    case_sensitive: true, match_whole_words: false, use_group_scoring: true,
    automation_id: 'legacy-event', exclude_recursion: true, prevent_recursion: false,
    delay_until_recursion: 2, content: '门只在夜里打开。', group: '夜间',
    group_prioritized: true, group_weight: 88, sticky: 3, cooldown: 2, delay: 1,
  }]);
  const replaced = await getLorebookEntries('规则书');
  const set = await setLorebookEntries('规则书', [{ uid: 7, enabled: true, content: '门在月升后打开。' }]);
  const created = await createLorebookEntries('规则书', [{ comment: '新增条目', position: 'before_author_note' }]);
  const deleted = await deleteLorebookEntries('规则书', [7]);
  return { replaced, set, created, deleted };
})();
`
  const html = tavernScriptFrameSource({
    id: 'legacy-worldbook-writer', name: '旧世界书写入', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, script, {
    scriptId: 'legacy-worldbook-writer', scriptName: '旧世界书写入', scriptInfo: '', buttons: [],
    characterName: '白露', characterId: 'bailu.png', chatId: 'session-test', approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {
      规则书: [{
        uid: 99, name: '将被替换', enabled: true,
        strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
        position: { type: 'at_depth', role: 'system', depth: 4, order: 100 }, content: '', probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
      }],
    },
    worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [], messages: [], characterRegexScripts: [], presetScriptTrees: [],
    characterScriptTrees: [], displayRegexScripts: [],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const result = JSON.parse(JSON.stringify(await context.__acceptance)) as Record<string, Record<string, unknown>[] | Record<string, unknown>>
  const replaced = result.replaced as Record<string, unknown>[]
  assert.equal(replaced.length, 1)
  assert.deepEqual(replaced[0], {
    uid: 7, display_index: 0, comment: '旧式条目', enabled: false, type: 'selective',
    position: 'at_depth_as_assistant', depth: 6, order: 31, probability: 70,
    keys: ['门'], key: ['门'], logic: 'and_all', filters: ['夜'], filter: ['夜'], scan_depth: 4,
    case_sensitive: true, match_whole_words: false, use_group_scoring: true, automation_id: 'legacy-event',
    exclude_recursion: true, prevent_recursion: false, delay_until_recursion: 2,
    content: '门只在夜里打开。', group: '夜间', group_prioritized: true, group_weight: 88,
    sticky: 3, cooldown: 2, delay: 1, constant: false, disable: true,
  })
  const set = result.set as Record<string, unknown>[]
  assert.equal(set[0]?.enabled, true)
  assert.equal(set[0]?.content, '门在月升后打开。')
  const created = result.created as { entries: Record<string, unknown>[]; new_uids: number[] }
  assert.deepEqual(created.new_uids, [0])
  assert.equal(created.entries[1]?.comment, '新增条目')
  assert.equal(created.entries[1]?.position, 'before_author_note')
  const deleted = result.deleted as { entries: Record<string, unknown>[]; delete_occurred: boolean }
  assert.equal(deleted.delete_occurred, true)
  assert.deepEqual(deleted.entries.map(entry => entry.uid), [0])

  const writes = (context.posted as Record<string, unknown>[]).filter(message => message.action === 'worldbook-mutate')
  assert.equal(writes.length, 4)
  const firstRequest = writes[0]?.request as { entries?: Record<string, unknown>[] }
  assert.equal(firstRequest.entries?.[0]?.name, '旧式条目')
  assert.equal((firstRequest.entries?.[0]?.position as Record<string, unknown>)?.role, 'assistant')
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

test('keeps author media fields available to prompts but out of the visible greeting', () => {
  const source = '<角色图片>角色名<img>external.png</img></角色图片>\n正文'
  assert.equal(renderCharacterDisplay(source, character, AI_OUTPUT_PLACEMENT, 0), '\n正文')
  assert.equal(renderCharacterPromptView(source, character, AI_OUTPUT_PLACEMENT, 0), source)
  const display = [{ ...base, findRegex: '/<角色图片>[\\s\\S]*?<\\/角色图片>/gu', replaceString: '<div>external.png</div>' }]
  const withoutCardScripts = { ...character, frontend: { ...character.frontend, regexScripts: [] } }
  assert.equal(renderCharacterDisplay(source, withoutCardScripts, AI_OUTPUT_PLACEMENT, 0, undefined, display), '<div></div>\n正文')
  const dlc = [{
    ...base,
    findRegex: '/<(?:illustration|img)>.*[^A-Za-z0-9\\.\\s<\\/>]+(.*?)<\\/(?:illustration|img)>/g',
    replaceString: '<center><img src=https://files.example.com/$1 width=50% /></center>',
  }]
  const dlcSource = '<角色图片><img>角色名external.png</img></角色图片>\n正文'
  assert.equal(
    renderCharacterDisplay(dlcSource, withoutCardScripts, AI_OUTPUT_PLACEMENT, 0, undefined, dlc),
    '<center><img src=https://files.example.com/external.png width=50% /></center>\n正文',
  )
})

test('runs ordinary message scripts before view-specific scripts', () => {
  const ordinary = { ...base, findRegex: '/<StatusBlocks>([\\s\\S]*?)<\\/StatusBlocks>/gu', replaceString: '$1', markdownOnly: false }
  const display = { ...base, findRegex: '/状态：(.+)/gu', replaceString: '```html\n<details><summary>状态</summary>$1</details>\n```' }
  const prompt = { ...base, findRegex: '/状态：(.+)/gu', replaceString: '状态记录：$1', markdownOnly: false, promptOnly: true }
  const source = '<StatusBlocks>状态：平静</StatusBlocks>'
  const noCardScripts = { ...character, frontend: { ...character.frontend, regexScripts: [] } }

  assert.equal(renderCharacterDisplay(source, noCardScripts, AI_OUTPUT_PLACEMENT, 0, '宝宝', [ordinary, display]),
    '```html\n<details><summary>状态</summary>平静</details>\n```')
  assert.equal(renderCharacterPromptView(source, noCardScripts, AI_OUTPUT_PLACEMENT, 0, '宝宝', [ordinary, prompt]),
    '状态记录：平静')
})

test('reports prompt regex outcomes without exposing expressions or replacements', () => {
  const scripts = [
    { ...base, scriptName: 'ordinary', markdownOnly: false, findRegex: '/old/gu' },
    { ...base, scriptName: 'prompt', markdownOnly: false, promptOnly: true, findRegex: '/new/gu', replaceString: 'done' },
    { ...base, scriptName: 'display', findRegex: '/done/gu' },
  ]
  const trace = traceCharacterPromptView(
    'old',
    { ...character, frontend: { ...character.frontend, regexScripts: [] } },
    AI_OUTPUT_PLACEMENT,
    0,
    '宝宝',
    scripts,
  )
  assert.equal(trace.text, 'done')
  assert.deepEqual(trace.scripts, [
    { index: 0, scriptName: 'ordinary', outcome: 'applied' },
    { index: 1, scriptName: 'prompt', outcome: 'applied' },
    { index: 2, scriptName: 'display', outcome: 'display-only' },
  ])
  assert.equal(JSON.stringify(trace).includes('/old/'), false)
})

test('runs the same two regex phases inside the isolated Tavern runtime', () => {
  const ordinary = { ...base, findRegex: '/<StatusBlocks>([\\s\\S]*?)<\\/StatusBlocks>/gu', replaceString: '$1', markdownOnly: false }
  const display = { ...base, findRegex: '/状态：(.+)/gu', replaceString: '<details><summary>状态</summary>$1</details>' }
  const html = tavernScriptFrameSource({
    id: 'status-runtime', name: '状态栏', content: '', info: '', enabled: true,
    buttonEnabled: false, buttons: [], data: {},
  }, '', {
    scriptId: 'status-runtime', scriptName: '状态栏', scriptInfo: '', buttons: [],
    characterName: '白露', characterId: 'bailu.png', chatId: 'session-test',
    approvedScriptOrigins: [],
    scopes: { global: {}, preset: {}, character: {}, chat: {}, message: {}, script: {} },
    worldbooks: {},
    worldbookBindings: { global: [], character: { primary: null, additional: [] }, chat: null },
    activeWorldbookEntries: [],
    messages: [{ messageId: 0, seq: 1, role: 'assistant', text: '', isHidden: false, data: {}, extra: {} }],
    characterRegexScripts: [], presetScriptTrees: [], characterScriptTrees: [],
    displayRegexScripts: [ordinary, display],
  })
  const source = html.match(/<script>([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(source, undefined)
  const context = runtimeAcceptanceContext([])
  runInNewContext(source!, context)
  const format = context.formatAsDisplayedMessage as (text: string, option: { readonly message_id: number }) => string

  assert.equal(format('<StatusBlocks>状态：平静</StatusBlocks>', { message_id: 0 }),
    '<details><summary>状态</summary>平静</details>')
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

test('keeps HTML examples in fenced code as native Markdown', () => {
  const source = '前文\n\n```ts\nconst body = "<body>"\n```'
  assert.deepEqual(splitCharacterDisplay(source), [{ kind: 'markdown', text: source }])
})

test('isolates ordinary inline HTML for sanitized rendering', () => {
  const source = '正文\n\n<details><summary>状态</summary>平静</details>'
  const segments = splitCharacterDisplay(source)
  assert.deepEqual(segments, [{ kind: 'inline-html', source }])
  assert.equal(hasCharacterDisplayFrontend(segments), true)
  assert.equal(hasCharacterDisplayFrontend([{ kind: 'markdown', text: '纯文字' }]), false)
})

test('keeps legacy center wrappers for the card frontend compatibility pass', () => {
  const source = '<div>角色名<center><img src="image.png"></center></div>'
  assert.deepEqual(splitCharacterDisplay(source), [{ kind: 'inline-html', source }])
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
