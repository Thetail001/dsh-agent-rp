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
import { runTavernGeneration, tavernChatCompletionsEndpoint } from '../src/tavern-generation-http.ts'
import { tavernModelListEndpoint } from '../src/tavern-model-list-http.ts'

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
  let requested: { readonly url: string; readonly authorization: string | null; readonly body: unknown } | undefined
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    requested = {
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization'),
      body: JSON.parse(String(init?.body)) as unknown,
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: '辅助结果' } }] }), {
      headers: { 'content-type': 'application/json' }, status: 200,
    })
  }
  try {
    const result = await runTavernGeneration({
      get: (name: string) => name === 'agents' ? { get: () => agent } : undefined,
      systemPrompt: {
        assemble: async () => ({
          sections: [{ name: 'base', text: 'DSH base' }], contexts: [], tools: [], variables: {},
        }),
      },
    } as never, {
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
        },
      },
    })
    assert.equal(result.text, '辅助结果')
    assert.deepEqual(requested, {
      url: 'https://example.com/v1/chat/completions',
      authorization: 'Bearer test-key',
      body: {
        model: 'custom-model',
        messages: [
          { role: 'system', content: '辅助系统提示' },
          { role: 'user', content: '只发送当前任务' },
        ],
        stream: false,
        max_tokens: 321,
        temperature: 0.4,
        top_p: 0.8,
        frequency_penalty: -0.2,
        presence_penalty: 0.3,
      },
    })
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
