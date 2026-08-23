import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CommandId } from '@deepseek-ai/dsh-commands'
import {
  createAssistantMessage,
  createUserMessage,
  type GenerateOptions,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { appendMvuState, readCurrentMvuState, readCurrentSessionMvuState, readInitialMvuState } from '../src/mvu.ts'
import { installMvuStreamCompletion } from '../src/mvu-stream.ts'
import { ROLEPLAY_TURN_PHASES } from '../src/roleplay-runtime.ts'
import type { RoleplayTurnPlan } from '../src/roleplay-turn-plan.ts'
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

test('repairs a missing MVU block from only the frozen act plan in a cardless Session', async () => {
  type StreamHandler = (
    options: GenerateOptions,
    next: () => AsyncIterable<StreamChunk>,
  ) => AsyncIterable<StreamChunk>
  const session = Session.create(SessionId('mvu-frozen-act-plan'))
  const plan: RoleplayTurnPlan = {
    format: 0,
    input: { sessionId: String(session.id), sessionSeq: 0, pendingMessageIds: [] },
    runtime: {
      format: 0,
      lifecycle: ROLEPLAY_TURN_PHASES,
      experience: { id: 'fixture', name: '测试角色', owner: 'session', mode: 'character' },
      world: { bindings: [] },
      prompt: { strategy: 'native' },
      state: [{ id: 'state:mvu', owner: 'session', revision: 3 }],
      memory: { read: true, write: false },
      modules: [{
        id: 'adapter:mvu', source: 'adapter', phases: ['prepare', 'act', 'settle'], stateIds: ['state:mvu'],
      }],
    },
    world: {
      engine: 'native-v0', resources: [], inChat: [], experienceBeforeActor: [], actorBefore: [], actorAfter: [],
      experienceAfterActor: [], approximateTokens: 0,
    },
    prompt: {
      beforeHistory: [], afterHistory: [], inChat: [], includeHistory: true, systemPromptText: '',
      transforms: { actorName: '测试角色', operations: [] },
      diagnostics: { enabledModules: 0, unsupportedMacros: 0, templateFailures: 0 },
    },
    act: { responseRepairs: [{
      engine: 'mvu-v0', moduleId: 'adapter:mvu', stateId: 'state:mvu', updateInstructions: '只用冻结规则',
    }] },
    stateReads: [{
      id: 'state:mvu', owner: 'session', revision: 3, writerModuleId: 'adapter:mvu', value: { score: 7 },
    }],
    memory: { read: true, write: false, reads: [], contextText: '' },
    generation: {},
    prepare: { modules: [] },
    recall: { modules: [] },
  }
  let handler: StreamHandler | undefined
  let supplementalRequest: GenerateOptions | undefined
  const ctx = {
    on(_event: string, callback: StreamHandler) { handler = callback },
    llm: {
      stream(options: GenerateOptions) {
        supplementalRequest = options
        return (async function* (): AsyncIterable<StreamChunk> {
          const text = '<UpdateVariable><Analysis>无变化</Analysis><JSONPatch>[]</JSONPatch></UpdateVariable>'
          yield { type: 'block-start', index: 0, blockType: 'text' }
          yield { type: 'text-delta', index: 0, text }
          yield { type: 'block-end', index: 0, block: { type: 'text', text } }
          yield { type: 'finish', reason: { kind: 'stop' } }
        })()
      },
    },
    logger: { warn() {} },
  } as unknown as Context
  const agent = { session } as Agent
  installMvuStreamCompletion(ctx, id => id === String(session.id) ? agent : undefined, () => plan)
  assert.ok(handler)
  const options = Object.freeze({
    provider: 'fixture', model: 'fixture', sessionId: session.id,
    messages: [createUserMessage({
      source: { kind: 'user' }, content: [{ type: 'text', text: '继续' }],
    })],
  }) as GenerateOptions
  const output: StreamChunk[] = []
  const original = async function* (): AsyncIterable<StreamChunk> {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: '原始回复' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: '原始回复' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  for await (const chunk of handler(options, original)) output.push(chunk)

  const requestText = supplementalRequest?.messages.flatMap(message => message.content
    .flatMap(block => block.type === 'text' ? [block.text] : [])).join('\n') ?? ''
  assert.match(requestText, /"score":7/u)
  assert.match(requestText, /只用冻结规则/u)
  assert.match(output.flatMap(chunk => chunk.type === 'text-delta' ? [chunk.text] : []).join(''),
    /<UpdateVariable>/u)
})
