import assert from 'node:assert/strict'
import test from 'node:test'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { readCurrentMvuState, readInitialMvuState } from '../src/mvu.ts'
import {
  applyTavernHelperMutation,
  encodeTavernHelperState,
  initializeTavernHelperState,
  parseTavernHelperMutationRequest,
} from '../src/tavern-helper.ts'

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
