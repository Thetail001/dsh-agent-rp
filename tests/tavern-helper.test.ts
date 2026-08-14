import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyTavernHelperMutation,
  decodeTavernHelperState,
  encodeTavernHelperState,
  initializeTavernHelperState,
  initializeTavernHelperPresetState,
  parseTavernHelperMutationRequest,
} from '../src/tavern-helper.ts'
import { activeTavernWorldbooks, withTavernWorldbooks } from '../src/world-info-configuration-core.ts'

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
