import assert from 'node:assert/strict'
import test from 'node:test'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { renderCharacterPrompt } from '../src/prompt.ts'
import {
  appendRoleplayState,
  readRoleplayStates,
  ROLEPLAY_STATE_MODULE_ID,
} from '../src/roleplay-state.ts'
import { prepareRoleplayTurn } from '../src/roleplay-turn-plan.ts'
import {
  appendRoleplayTurnSettlement,
  compileRoleplayTurnSettlement,
} from '../src/roleplay-turn-settlement.ts'
import { resolveSessionRoleplayRuntime } from '../src/session-roleplay-runtime.ts'
import { compileInitialSessionRoleplayTurnPresentation } from '../src/session-roleplay-turn-presentation.ts'

const deployment = resolveConfig({ characterName: '岚' })

test('writes conflict-checked state revisions and reconstructs them after reopening', () => {
  const session = Session.create(SessionId('native-state-write'))
  const mutable = { scene: { weather: '雨', hour: 21 }, flags: ['arrived'] }
  const first = appendRoleplayState(session, {
    id: 'state:scene',
    expectedRevision: 0,
    writerModuleId: 'roleplay:fixture',
    value: mutable,
  })
  mutable.scene.weather = '晴'
  mutable.flags.push('mutated-after-append')

  const second = appendRoleplayState(session, {
    id: 'state:scene',
    expectedRevision: 1,
    writerModuleId: 'roleplay:fixture',
    value: { scene: { weather: '雨', hour: 22 }, flags: ['arrived'] },
  })

  assert.equal(first.revision, 1)
  assert.equal(second.revision, 2)
  assert.deepEqual(first.value, { scene: { weather: '雨', hour: 21 }, flags: ['arrived'] })
  assert.throws(() => appendRoleplayState(session, {
    id: 'state:scene',
    expectedRevision: 1,
    writerModuleId: 'roleplay:fixture',
    value: null,
  }), /revision conflict: expected 1, current 2/u)

  const reopened = Session.create(SessionId('native-state-reopened'), session.events)
  assert.deepEqual(readRoleplayStates(reopened.events), [{
    format: 0,
    id: 'state:scene',
    revision: 2,
    writerModuleId: 'roleplay:fixture',
    value: { scene: { weather: '雨', hour: 22 }, flags: ['arrived'] },
    eventSeq: second.eventSeq,
  }])
})

test('rejects discontinuous durable state history instead of silently rebuilding the wrong value', () => {
  const session = Session.create(SessionId('native-state-discontinuous'))
  session.append('agent-rp/state', {
    format: 0,
    id: 'state:clock',
    revision: 2,
    writerModuleId: 'roleplay:fixture',
    value: { hour: 2 },
  })

  assert.throws(() => readRoleplayStates(session.events), /revision is discontinuous: expected 1, received 2/u)
})

test('keeps state-free turns unchanged and compiles exact native state into prepare', () => {
  const emptySession = Session.create(SessionId('native-state-empty'))
  const emptyResolved = resolveSessionRoleplayRuntime({ session: emptySession, deployment })
  const emptyPlan = prepareRoleplayTurn({ session: emptySession, deployment, resolved: emptyResolved })

  assert.deepEqual(emptyResolved.nativeStates, [])
  assert.equal(emptyResolved.snapshot.modules.some(module => module.id === ROLEPLAY_STATE_MODULE_ID), false)
  assert.deepEqual(emptyPlan.stateReads, [])
  assert.equal(emptyPlan.prompt.systemPromptText, renderCharacterPrompt(deployment, [], []))

  const session = Session.create(SessionId('native-state-prepare'))
  const written = appendRoleplayState(session, {
    id: 'state:scene',
    expectedRevision: 0,
    writerModuleId: 'roleplay:fixture',
    value: { location: '钟楼', weather: '浓雾' },
  })
  const resolved = resolveSessionRoleplayRuntime({ session, deployment })
  const plan = prepareRoleplayTurn({ session, deployment, resolved })

  assert.deepEqual(resolved.snapshot.state, [{ id: 'state:scene', owner: 'session', revision: 1 }])
  assert.deepEqual(resolved.snapshot.modules.find(module => module.id === ROLEPLAY_STATE_MODULE_ID), {
    id: ROLEPLAY_STATE_MODULE_ID,
    source: 'native',
    phases: ['prepare', 'settle', 'present'],
    stateIds: ['state:scene'],
  })
  assert.deepEqual(plan.stateReads, [{
    id: 'state:scene',
    owner: 'session',
    revision: 1,
    eventSeq: written.eventSeq,
    writerModuleId: 'roleplay:fixture',
    value: { location: '钟楼', weather: '浓雾' },
  }])
  assert.match(plan.prompt.systemPromptText, /<roleplay_state>[\s\S]*"state:scene"[\s\S]*"浓雾"/u)
  assert.deepEqual(plan.prepare.modules.find(module => module.moduleId === ROLEPLAY_STATE_MODULE_ID), {
    moduleId: ROLEPLAY_STATE_MODULE_ID,
    outcome: 'applied',
    contributions: 1,
  })
})

test('carries native state changes through settle and present without a format-specific branch', () => {
  const session = Session.create(SessionId('native-state-lifecycle'))
  appendRoleplayState(session, {
    id: 'state:scene', expectedRevision: 0, writerModuleId: 'roleplay:fixture', value: { hour: 21 },
  })
  const before = resolveSessionRoleplayRuntime({ session, deployment })
  const plan = prepareRoleplayTurn({ session, deployment, resolved: before })
  const reply = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: [{ type: 'text', text: '钟声响过，已经十点。' }],
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [] })
  appendRoleplayState(session, {
    id: 'state:scene', expectedRevision: 1, writerModuleId: 'roleplay:fixture', value: { hour: 22 },
  })
  const after = resolveSessionRoleplayRuntime({ session, deployment })
  const plans = [{ step: 1, plan }]
  const settlement = compileRoleplayTurnSettlement({
    sessionId: String(session.id),
    turn: 1,
    result: 'completed',
    plans,
    events: session.events,
    after: after.snapshot,
  })
  const settlementEvent = appendRoleplayTurnSettlement(session, settlement)
  const presentation = compileInitialSessionRoleplayTurnPresentation({ session, settlementEvent, plans })

  assert.deepEqual(settlement.reply, { eventSeq: reply.seq, messageId: String(reply.data.message.id) })
  assert.deepEqual(settlement.state, [{
    id: 'state:scene', beforeRevision: 1, afterRevision: 2, outcome: 'updated',
  }])
  assert.deepEqual(settlement.settle.modules.find(module => module.moduleId === ROLEPLAY_STATE_MODULE_ID), {
    moduleId: ROLEPLAY_STATE_MODULE_ID, outcome: 'applied', changes: 1,
  })
  assert.deepEqual(presentation.state, [{
    id: 'state:scene', status: 'settled', eventSeq: settlementEvent.seq,
  }])
  assert.deepEqual(presentation.present.modules.find(module => module.moduleId === ROLEPLAY_STATE_MODULE_ID), {
    moduleId: ROLEPLAY_STATE_MODULE_ID, outcome: 'applied', changes: 1,
  })
})
