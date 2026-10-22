import assert from 'node:assert/strict'
import test from 'node:test'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { encodeGenerationState } from '../src/generation.ts'
import { hiddenReplyVersionSeqs } from '../src/generation-state-record.ts'
import { modelVisibleDialogue } from '../src/prompt.ts'
import { ROLEPLAY_TURN_PHASES, type RoleplayRuntimeSnapshot } from '../src/roleplay-runtime.ts'
import type { RoleplayTurnPlan } from '../src/roleplay-turn-plan.ts'
import { prepareRoleplayToolPolicy } from '../src/roleplay-tool-guidance.ts'
import { collectSessionRoleplaySettlementContributions } from '../src/session-roleplay-turn-settlement.ts'

const modules = [
  {
    id: 'adapter:mvu', source: 'adapter', phases: ['prepare', 'settle'], stateIds: ['state:mvu'],
  },
  {
    id: 'adapter:tavern-helper', source: 'adapter', phases: ROLEPLAY_TURN_PHASES,
    stateIds: ['state:tavern-helper'],
  },
] as const

function runtime(activeModules: RoleplayRuntimeSnapshot['modules'] = modules): RoleplayRuntimeSnapshot {
  return {
    format: 0,
    lifecycle: ROLEPLAY_TURN_PHASES,
    experience: { id: 'actor:test', name: '测试角色', owner: 'session', mode: 'character' },
    world: { bindings: [] },
    prompt: { strategy: 'native' },
    state: [
      { id: 'state:mvu', owner: 'session', revision: 1 },
      { id: 'state:tavern-helper', owner: 'session', revision: 2 },
    ],
    memory: { read: true, write: false },
    modules: activeModules,
  }
}

function plan(session: Session, snapshot = runtime()): RoleplayTurnPlan {
  return {
    format: 0,
    input: { sessionId: String(session.id), sessionSeq: session.seq, pendingMessageIds: [] },
    runtime: snapshot,
    world: {
      engine: 'native-v0', resources: [], inChat: [], experienceBeforeActor: [], actorBefore: [], actorAfter: [],
      experienceAfterActor: [], approximateTokens: 0,
    },
    prompt: {
      beforeHistory: [], afterHistory: [], inChat: [], includeHistory: true, systemPromptText: '',
      transforms: { actorName: snapshot.experience.name, operations: [] },
      diagnostics: { enabledModules: 0, unsupportedMacros: 0, templateFailures: 0 },
    },
    act: { strategy: 'conversation', responseRepairs: [], stateActions: [] },
    tools: prepareRoleplayToolPolicy(),
    stateReads: snapshot.state,
    memory: { ...snapshot.memory, reads: [], contextText: '' },
    generation: {},
    prepare: { modules: [] },
    recall: { modules: [] },
  }
}

function appendReply(session: Session, text: string) {
  return session.append('assistant/message', { stream: [],
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: [{ type: 'text', text }],
    }),
  }, {
    surfaceOp: 'append',
  })
}

test('collects failure and deferred work from their active modules', () => {
  const session = Session.create(SessionId('settlement-contributions'))
  session.append('turn/start', { turn: 1 })
  const turnPlan = plan(session)
  appendReply(session, '<UpdateVariable><JSONPatch>invalid</JSONPatch></UpdateVariable>')

  assert.deepEqual(collectSessionRoleplaySettlementContributions({
    session,
    turn: 1,
    plans: [{ step: 1, plan: turnPlan }],
    mvu: { statData: {}, updateCount: 1, lastError: 'MVU JSONPatch 无效' },
  }), [
    { moduleId: 'adapter:mvu', outcome: 'failed', error: 'MVU JSONPatch 无效' },
    { moduleId: 'adapter:tavern-helper', outcome: 'deferred' },
  ])
})

test('does not attribute a hidden old MVU failure to the selected reply', () => {
  const session = Session.create(SessionId('settlement-hidden-mvu'))
  session.append('turn/start', { turn: 1 })
  const turnPlan = plan(session, runtime([modules[0]!]))
  const invalid = appendReply(session, '<UpdateVariable>broken</UpdateVariable>')
  const selected = appendReply(session, '当前选中的正常回复')
  // 0.2.1：被否决的版本仍以 append 留在日志与表面上，选中关系由账本记录；
  // 结算只能把本轮失败归因到账本里选中的那一版。
  session.append('command/done', {
    commandId: CommandId('settlement-hidden-mvu-select'), kind: 'success', text: encodeGenerationState({
      format: 0,
      groupId: '00000000-0000-4000-8000-0000000000b1',
      operation: 'regenerate',
      originSeq: invalid.seq,
      anchorSeq: invalid.seq,
      assistantSeqs: [invalid.seq, selected.seq],
      versions: [
        { seq: invalid.seq, text: '<UpdateVariable>broken</UpdateVariable>' },
        { seq: selected.seq, text: '当前选中的正常回复' },
      ],
      selectedVersionSeq: selected.seq,
      surfaceSeq: selected.seq,
    } as const),
  })

  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())], [invalid.seq])
  assert.deepEqual(modelVisibleDialogue(session), ['当前选中的正常回复'])
  assert.deepEqual(collectSessionRoleplaySettlementContributions({
    session,
    turn: 1,
    plans: [{ step: 1, plan: turnPlan }],
    mvu: { statData: {}, updateCount: 0, lastError: '旧版本错误' },
  }), [])
})

test('never reports compatibility work for modules absent from the prepared plan', () => {
  const session = Session.create(SessionId('settlement-inactive-modules'))
  const turnPlan = plan(session, runtime([]))
  appendReply(session, '<UpdateVariable>broken</UpdateVariable>')

  assert.deepEqual(collectSessionRoleplaySettlementContributions({
    session,
    turn: 1,
    plans: [{ step: 1, plan: turnPlan }],
    mvu: { statData: {}, updateCount: 0, lastError: '不应上报' },
  }), [])
})
