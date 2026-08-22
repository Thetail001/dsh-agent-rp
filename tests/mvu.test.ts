import assert from 'node:assert/strict'
import test from 'node:test'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { appendMvuState, readCurrentMvuState, readCurrentSessionMvuState, readInitialMvuState } from '../src/mvu.ts'
import {
  applyTavernHelperMutation,
  encodeTavernHelperState,
  initializeTavernHelperState,
  parseTavernHelperMutationRequest,
} from '../src/tavern-helper.ts'
import { installIgnorableSessionEventFixture } from './session-event-fixture.ts'

installIgnorableSessionEventFixture()

function cardWithEntries(entries: readonly object[]) {
  return parseCharacterCardJson(JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '测试角色', description: '', personality: '', scenario: '', first_mes: '你好。', mes_example: '',
      creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [],
      creator: 'fixture', character_version: '1.0', extensions: {},
      character_book: { recursive_scanning: false, extensions: {}, entries },
    },
  }))
}

test('merges tagged and named MVU initializers in lorebook order', () => {
  const card = cardWithEntries([{
    id: 2, comment: '[initvar] 后续', keys: [], content: '```yaml\r\n角色:\r\n  等级: 2\r\n物品: [新]\r\n```',
    enabled: false, insertion_order: 20, constant: false, extensions: {},
  }, {
    id: 1, comment: '旧式标签', keys: [], content: '<initvar>\n角色:\n  名称: 小满\n物品: [旧]\n</initvar>',
    enabled: false, insertion_order: 10, constant: false, extensions: {},
  }])

  assert.deepEqual(readInitialMvuState(card), {
    角色: { 名称: '小满', 等级: 2 },
    物品: ['新'],
  })
})

test('adopts browser-initialized MVU state when a card has no static initializer', () => {
  const card = cardWithEntries([])
  const initial = initializeTavernHelperState(card.frontend, 'card-with-runtime-init')
  const state = applyTavernHelperMutation(initial, parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, scope: 'message', variables: { stat_data: { 角色: { 等级: 1 } } },
  })))
  const session = Session.create(SessionId('mvu-runtime-init'))
  session.append('command/done', {
    commandId: CommandId('mvu-runtime-init'), kind: 'success', text: encodeTavernHelperState(state),
  })

  assert.deepEqual(readCurrentMvuState(card, session.events), {
    statData: { 角色: { 等级: 1 } }, updateCount: 0,
  })
})

test('excludes shadowed reply updates while retaining durable script state', () => {
  const card = cardWithEntries([{
    id: 1, comment: '[initvar]', keys: [], content: '角色:\n  等级: 1', enabled: false,
    insertion_order: 1, constant: false, extensions: {},
  }])
  const initial = initializeTavernHelperState(card.frontend, 'mvu-surface-state')
  const scriptState = applyTavernHelperMutation(initial, parseTavernHelperMutationRequest(JSON.stringify({
    format: 0, scope: 'message', variables: { stat_data: { 角色: { 等级: 4 } } },
  })))
  const session = Session.create(SessionId('mvu-surface-state'))
  session.append('command/done', {
    commandId: CommandId('mvu-surface-state'), kind: 'success', text: encodeTavernHelperState(scriptState),
  })
  const original = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '<UpdateVariable><JSONPatch>[{"op":"delta","path":"/角色/等级","value":1}]</JSONPatch></UpdateVariable>' }],
      source: { provider: 'fixture', model: 'fixture' },
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [] })

  assert.deepEqual(readCurrentSessionMvuState(card, session), {
    statData: { 角色: { 等级: 5 } }, updateCount: 2,
  })

  session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [], source: { provider: 'fixture', model: 'fixture' },
    }),
  }, {
    surfaceOp: { op: 'replace', start: original.seq, end: original.seq },
    sourceEventSeqs: [original.seq],
  })

  assert.deepEqual(readCurrentSessionMvuState(card, session), {
    statData: { 角色: { 等级: 4 } }, updateCount: 1,
  })
})

test('replays an exact MVU version checkpoint before applying the new visible reply', () => {
  const card = cardWithEntries([{
    id: 1, comment: '[initvar]', keys: [], content: '角色:\n  等级: 1', enabled: false,
    insertion_order: 1, constant: false, extensions: {},
  }])
  const session = Session.create(SessionId('mvu-version-checkpoint'))
  const rejected = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '<UpdateVariable><JSONPatch>[{"op":"delta","path":"/角色/等级","value":9}]</JSONPatch></UpdateVariable>' }],
      source: { provider: 'fixture', model: 'fixture' },
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [] })
  appendMvuState(session, { statData: { 角色: { 等级: 3 } }, updateCount: 2 })
  session.append('assistant/message', {
    turn: 2,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '<UpdateVariable><JSONPatch>[{"op":"delta","path":"/角色/等级","value":2}]</JSONPatch></UpdateVariable>' }],
      source: { provider: 'fixture', model: 'fixture' },
    }),
  }, {
    surfaceOp: { op: 'replace', start: rejected.seq, end: rejected.seq },
    sourceEventSeqs: [rejected.seq],
  })

  assert.deepEqual(readCurrentSessionMvuState(card, session), {
    statData: { 角色: { 等级: 5 } }, updateCount: 3,
  })
  appendMvuState(session, { statData: { 角色: { 等级: 4 } }, updateCount: 1 })
  assert.deepEqual(readCurrentSessionMvuState(card, Session.create(session.id, session.events)), {
    statData: { 角色: { 等级: 4 } }, updateCount: 1,
  })
})
