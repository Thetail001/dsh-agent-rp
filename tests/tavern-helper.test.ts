import assert from 'node:assert/strict'
import test from 'node:test'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import {
  applyTavernHelperMutation,
  decodeTavernHelperState,
  encodeTavernHelperState,
  initializeTavernHelperState,
  initializeTavernHelperPresetState,
  parseTavernHelperMutationRequest,
} from '../src/tavern-helper.ts'
import { activeTavernWorldbooks, withTavernWorldbooks } from '../src/world-info-configuration-core.ts'
import {
  runTavernGeneration,
  runTavernPromptPreview,
  tavernChatCompletionsEndpoint,
} from '../src/tavern-generation-http.ts'
import { tavernModelListEndpoint } from '../src/tavern-model-list-http.ts'
import { advanceTavernTranscript, type TavernScriptSnapshot } from '../src/client/tavern-runtime.ts'

function runtimeMessage(
  messageId: number,
  seq: number,
  role: 'user' | 'assistant',
  text: string,
): TavernScriptSnapshot['messages'][number] {
  return { messageId, seq, role, text, isHidden: false, data: {}, extra: {} }
}

test('emits only transcript messages appended after the established runtime baseline', () => {
  const history = [
    runtimeMessage(0, 4, 'user', '旧提问'),
    runtimeMessage(1, 7, 'assistant', '旧回复'),
  ]
  const initial = advanceTavernTranscript(undefined, history)
  assert.deepEqual(initial.appended, [])

  const user = runtimeMessage(2, 9, 'user', '新提问')
  const afterUser = advanceTavernTranscript(initial.cursor, [...history, user])
  assert.deepEqual(afterUser.appended, [user])

  const assistant = runtimeMessage(3, 14, 'assistant', '新回复')
  const afterAssistant = advanceTavernTranscript(afterUser.cursor, [...history, user, assistant])
  assert.deepEqual(afterAssistant.appended, [assistant])
})

test('rebases transcript delivery after a rewrite instead of replaying visible history', () => {
  const history = [
    runtimeMessage(0, 2, 'user', '提问'),
    runtimeMessage(1, 5, 'assistant', '旧回复'),
  ]
  const initial = advanceTavernTranscript(undefined, history)
  const replacement = runtimeMessage(1, 8, 'assistant', '改写后的回复')
  const rewritten = advanceTavernTranscript(initial.cursor, [history[0]!, replacement])
  assert.deepEqual(rewritten.appended, [])

  const next = runtimeMessage(2, 11, 'user', '继续')
  assert.deepEqual(advanceTavernTranscript(rewritten.cursor, [history[0]!, replacement, next]).appended, [next])
})

test('resolves OpenAI-compatible custom generation endpoints without retaining query credentials', () => {
  assert.equal(tavernChatCompletionsEndpoint('https://example.com/v1').href,
    'https://example.com/v1/chat/completions')
  assert.equal(tavernChatCompletionsEndpoint('https://example.com/v1/models?token=secret').href,
    'https://example.com/v1/chat/completions')
  assert.equal(tavernChatCompletionsEndpoint('http://127.0.0.1:11434/v1/chat/completions').href,
    'http://127.0.0.1:11434/v1/chat/completions')
  assert.throws(() => tavernChatCompletionsEndpoint('file:///generate'), /HTTP 或 HTTPS/u)
  assert.throws(() => tavernChatCompletionsEndpoint('https://user:secret@example.com/v1'), /账号或密码/u)
})

test('forwards one approved custom generation without retaining chat history at depth zero', async () => {
  const session = Session.create(SessionId('custom-generation'))
  session.append('user/message', createUserMessage({
    source: { kind: 'user' }, content: [{ type: 'text', text: '不应发送的历史' }],
  }), { surfaceOp: 'append' })
  const agent = {
    session,
    options: { model: 'fallback-model' },
    runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return task(new AbortController().signal)
    },
  }
  let requested: {
    readonly url: string
    readonly authorization: string | null
    readonly trace: string | null
    readonly body: unknown
  } | undefined
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    requested = {
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization'),
      trace: new Headers(init?.headers).get('x-v18-trace'),
      body: JSON.parse(String(init?.body)) as unknown,
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: '辅助结果' } }] }), {
      headers: { 'content-type': 'application/json' }, status: 200,
    })
  }
  try {
    const ctx = {
      get: (name: string) => name === 'agents' ? { get: () => agent } : undefined,
      systemPrompt: {
        assemble: async () => ({
          sections: [{ name: 'base', text: 'DSH base' }], contexts: [], tools: [], variables: {},
        }),
      },
      llm: { stream: () => { throw new Error('preview contacted the DSH model') } },
    } as never
    const request = {
      format: 0,
      sessionId: 'custom-generation',
      mode: 'raw',
      config: {
        user_input: '只发送当前任务',
        max_chat_history: 0,
        ordered_prompts: [{ role: 'system', content: '辅助系统提示' }, 'chat_history', 'user_input'],
        custom_api: {
          apiurl: 'https://example.com/v1?token=discarded', key: 'test-key', model: 'custom-model', source: 'openai',
          max_tokens: 321, temperature: 0.4, top_p: 0.8, frequency_penalty: -0.2, presence_penalty: 0.3,
          custom_include_body: [
            'top_k: 24',
            'response_options:',
            '  include_usage: true',
            'model: ignored-model',
            'stream: true',
          ].join('\n'),
          custom_exclude_body: ['temperature', 'model', 'stream'],
          custom_include_headers: JSON.stringify({ Authorization: 'Bearer hook-key', 'X-V18-Trace': 18 }),
        },
      },
    } as const
    const preview = await runTavernPromptPreview(ctx, request)
    assert.equal(requested, undefined)
    assert.deepEqual(preview, {
      format: 0,
      prompts: [
        { role: 'system', content: '辅助系统提示' },
        { role: 'user', content: '只发送当前任务' },
      ],
    })
    const result = await runTavernGeneration(ctx, request)
    assert.equal(result.text, '辅助结果')
    assert.deepEqual(requested, {
      url: 'https://example.com/v1/chat/completions',
      authorization: 'Bearer hook-key',
      trace: '18',
      body: {
        model: 'custom-model',
        messages: [
          { role: 'system', content: '辅助系统提示' },
          { role: 'user', content: '只发送当前任务' },
        ],
        stream: false,
        max_tokens: 321,
        top_p: 0.8,
        frequency_penalty: -0.2,
        presence_penalty: 0.3,
        top_k: 24,
        response_options: { include_usage: true },
      },
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects unsafe custom generation headers before contacting the model', async () => {
  const session = Session.create(SessionId('unsafe-custom-generation'))
  const agent = {
    session,
    options: { model: 'fallback-model' },
    runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return task(new AbortController().signal)
    },
  }
  await assert.rejects(runTavernGeneration({
    get: (name: string) => name === 'agents' ? { get: () => agent } : undefined,
    systemPrompt: {
      assemble: async () => ({ sections: [], contexts: [], tools: [], variables: {} }),
    },
  } as never, {
    format: 0,
    sessionId: 'unsafe-custom-generation',
    mode: 'raw',
    config: {
      user_input: '测试',
      custom_api: {
        apiurl: 'https://example.com/v1', model: 'custom-model',
        custom_include_headers: 'Host: attacker.example',
      },
    },
  }), /不允许设置 "Host"/u)
})

test('cancels an active custom generation when its browser request closes', async () => {
  const session = Session.create(SessionId('cancel-custom-generation'))
  const agent = {
    session,
    options: { model: 'fallback-model' },
    runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
      return task(new AbortController().signal)
    },
  }
  const originalFetch = globalThis.fetch
  let started: (() => void) | undefined
  const contacted = new Promise<void>(resolve => { started = resolve })
  globalThis.fetch = async (_input, init) => {
    started?.()
    await new Promise<never>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })
    throw new Error('unreachable')
  }
  const controller = new AbortController()
  try {
    const running = runTavernGeneration({
      get: (name: string) => name === 'agents' ? { get: () => agent } : undefined,
      systemPrompt: {
        assemble: async () => ({ sections: [], contexts: [], tools: [], variables: {} }),
      },
    } as never, {
      format: 0,
      sessionId: 'cancel-custom-generation',
      mode: 'raw',
      config: {
        user_input: '等待取消',
        custom_api: { apiurl: 'https://example.com/v1', model: 'custom-model' },
      },
    }, controller.signal)
    await contacted
    controller.abort()
    await assert.rejects(running, /已取消或超时/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('resolves OpenAI-compatible model list endpoints without retaining query credentials', () => {
  assert.equal(tavernModelListEndpoint('https://example.com/v1').href, 'https://example.com/v1/models')
  assert.equal(tavernModelListEndpoint('https://example.com/v1/chat/completions?token=secret').href,
    'https://example.com/v1/models')
  assert.equal(tavernModelListEndpoint('http://127.0.0.1:11434/v1/models').href,
    'http://127.0.0.1:11434/v1/models')
  assert.throws(() => tavernModelListEndpoint('file:///models'), /HTTP 或 HTTPS/u)
  assert.throws(() => tavernModelListEndpoint('https://user:secret@example.com/v1'), /账号或密码/u)
})

test('parses Tavern Helper chat mutation operations', () => {
  assert.deepEqual(parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'set-chat-messages', messages: [{ message_id: 2, message: '改写' }],
  })), { format: 0, operation: 'set-chat-messages', messages: [{ message_id: 2, message: '改写' }] })
  assert.deepEqual(parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'create-chat-messages', insert_at: -1,
    messages: [{ role: 'assistant', message: '插入' }],
  })), {
    format: 0, operation: 'create-chat-messages', insertAt: -1,
    messages: [{ role: 'assistant', message: '插入' }],
  })
  assert.deepEqual(parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'delete-chat-messages', messageIds: [1, 3],
  })), { format: 0, operation: 'delete-chat-messages', messageIds: [1, 3] })
  assert.deepEqual(parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'rotate-chat-messages', begin: 0, middle: 2, end: 4,
  })), { format: 0, operation: 'rotate-chat-messages', begin: 0, middle: 2, end: 4 })
  assert.deepEqual(parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'set-chat-hidden', start: 0, end: 8, hidden: true,
  })), { format: 0, operation: 'set-chat-hidden', start: 0, end: 8, hidden: true })
  assert.throws(() => parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, operation: 'set-chat-hidden', start: 2, end: 1, hidden: true,
  })), /valid non-negative range/u)
})

test('round-trips the hidden Tavern prefix in durable script state', () => {
  const state = initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperVariables: {}, tavernHelperScripts: [],
  }, 'card-hidden')
  const decoded = decodeTavernHelperState(encodeTavernHelperState({
    ...state,
    hiddenPrefix: [
      { seq: 3, role: 'user', text: '旧问题' },
      { seq: 4, role: 'assistant', text: '旧回复' },
    ],
  }))
  assert.deepEqual(decoded?.hiddenPrefix, [
    { seq: 3, role: 'user', text: '旧问题' },
    { seq: 4, role: 'assistant', text: '旧回复' },
  ])
})

test('persists isolated Tavern Helper variable namespaces', () => {
  const state = initializeTavernHelperState({
    regexScripts: [],
    tavernHelperScriptNames: ['状态同步'],
    tavernHelperVariables: { theme: 'night' },
    tavernHelperScripts: [{
      id: 'sync', name: '状态同步', content: '', info: '', enabled: true,
      buttonEnabled: true, buttons: [], data: { runs: 1 },
    }],
  }, 'card-1')
  const request = parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, scope: 'message', variables: { stat_data: { trust: 3 } },
  }))
  const updated = applyTavernHelperMutation(state, request)
  const decoded = decodeTavernHelperState(encodeTavernHelperState(updated))

  assert.deepEqual(decoded?.scopes.character, { theme: 'night' })
  assert.deepEqual(decoded?.scopes.message, { stat_data: { trust: 3 } })
  assert.deepEqual(decoded?.scripts.sync, { runs: 1 })
  assert.equal(decoded?.revision, 1)
  assert.deepEqual(decoded?.lastMutation, { scope: 'message' })
})

test('keeps preset and character script state independent across reloads', () => {
  const character = initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: ['角色脚本'], tavernHelperVariables: { card: true },
    tavernHelperScripts: [{
      id: 'character', name: '角色脚本', content: '', info: '', enabled: true,
      buttonEnabled: true, buttons: [], data: { characterRuns: 1 },
    }],
  }, 'card-1')
  const preset = initializeTavernHelperPresetState(character, [{
    id: 'preset', name: '预设脚本', content: '', info: '', enabled: true,
    buttonEnabled: true, buttons: [], data: { presetRuns: 2 },
  }], { theme: 'fox' }, 'preset-1')
  const changed = applyTavernHelperMutation(preset, {
    format: 0, scope: 'script', scriptId: 'preset', variables: { presetRuns: 3 },
  })
  const reloaded = initializeTavernHelperPresetState(
    initializeTavernHelperState({
      regexScripts: [], tavernHelperScriptNames: ['角色脚本'], tavernHelperVariables: { card: true },
      tavernHelperScripts: [{
        id: 'character', name: '角色脚本', content: '', info: '', enabled: true,
        buttonEnabled: true, buttons: [], data: { characterRuns: 1 },
      }],
    }, 'card-1', changed),
    [{
      id: 'preset', name: '预设脚本', content: '', info: '', enabled: true,
      buttonEnabled: true, buttons: [], data: { presetRuns: 2 },
    }],
    { theme: 'fox' },
    'preset-1',
  )

  assert.deepEqual(reloaded.scopes.character, { card: true })
  assert.deepEqual(reloaded.scopes.preset, { theme: 'fox' })
  assert.deepEqual(reloaded.scripts.character, { characterRuns: 1 })
  assert.deepEqual(reloaded.scripts.preset, { presetRuns: 3 })
})

test('persists script-created worldbooks and activates them only after binding', () => {
  const initial = initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperVariables: {}, tavernHelperScripts: [],
  }, 'card-1')
  const replaced = applyTavernHelperMutation(initial, parseTavernHelperMutationRequest(JSON.stringify({
    format: 0,
    operation: 'replace-worldbook',
    name: '旅店记忆',
    entries: [{ name: '钥匙', content: '钥匙藏在钟下。', strategy: { type: 'constant' } }],
  })))
  const sources = withTavernWorldbooks([], decodeTavernHelperState(encodeTavernHelperState(replaced)))

  assert.equal(sources[0]?.name, '旅店记忆')
  assert.equal(sources[0]?.lorebook.entries[0]?.content, '钥匙藏在钟下。')
  assert.deepEqual(activeTavernWorldbooks(sources, replaced), [])

  const bound = applyTavernHelperMutation(replaced, {
    format: 0, operation: 'bind-chat-worldbook', name: '旅店记忆',
  })
  assert.deepEqual(activeTavernWorldbooks(sources, bound).map(source => source.name), ['旅店记忆'])
})
