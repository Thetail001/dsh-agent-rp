import assert from 'node:assert/strict'
import test from 'node:test'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import {
  parseAgentRpTurnHealthDiagnostic,
} from '../src/roleplay-turn-health-protocol.ts'
import {
  summarizeRoleplayTurnHealth,
} from '../src/roleplay-turn-health.ts'
import { readRoleplayTurnRecords, type RoleplayTurnRecord } from '../src/roleplay-turn-record.ts'

function record(input: {
  readonly turn: number
  readonly closed?: boolean
  readonly planned?: boolean
  readonly settled?: boolean
  readonly presented?: boolean
}): RoleplayTurnRecord {
  const planned = input.planned === true
  const plan = {
    step: 1,
    eventSeq: 2,
    reference: {
      step: 1,
      input: { sessionId: 'private-session', sessionSeq: 1, pendingMessageIds: ['private-message'] },
      receipt: {
        memoryWriteAvailable: true,
        runtime: { settleModules: [], presentModuleIds: [] },
      },
    },
  }
  return {
    format: 0,
    sessionId: 'private-session',
    turn: input.turn,
    lifecycle: ['prepare', 'recall', 'act', 'settle', 'present'],
    boundary: { startSeq: 1, ...(input.closed === true ? { endSeq: 5, result: 'private-result' } : {}) },
    plans: planned ? [plan] : [],
    prepare: { steps: planned ? [{ step: 1, eventSeq: 2, input: plan.reference.input, modules: [] }] : [] },
    recall: { steps: planned ? [{ step: 1, eventSeq: 2, modules: [] }] : [] },
    ...(input.settled === true ? {
      act: { steps: [{
        step: 1,
        assistantMessages: [{ eventSeq: 3, messageId: 'private-reply' }],
        toolCalls: [{ eventSeq: 4, callId: 'private-call', name: 'private-tool' }],
        toolResults: [{ eventSeq: 5, callId: 'private-call', outcome: 'succeeded' }],
      }] },
      settle: { eventSeq: 6, result: 'private-result', state: [], memory: [], modules: [] },
    } : {}),
    ...(input.presented === true ? {
      present: { eventSeq: 7, trigger: { kind: 'settlement', eventSeq: 6 }, current: true, state: [], modules: [] },
    } : {}),
  } as unknown as RoleplayTurnRecord
}

test('locates the next lifecycle phase without retaining record content', () => {
  const summary = summarizeRoleplayTurnHealth([
    record({ turn: 1 }),
    record({ turn: 2, planned: true }),
    record({ turn: 3, planned: true, closed: true }),
    record({ turn: 4, planned: true, closed: true, settled: true }),
    record({ turn: 5, planned: true, closed: true, settled: true, presented: true }),
  ])
  assert.deepEqual(summary.statuses, {
    open: 2, awaitingSettlement: 1, awaitingPresentation: 1, complete: 1,
  })
  assert.deepEqual(summary.latest, {
    turn: 5,
    status: 'complete',
    finalizableFromLog: true,
    phases: {
      plannedSteps: 1, preparedSteps: 1, recalledSteps: 1, actedSteps: 1,
      assistantMessages: 1, toolCalls: 1, toolResults: 1, settled: true, presented: true,
    },
  })
  assert.doesNotMatch(
    JSON.stringify(summary),
    /private-(?:session|message|reply|call|tool|result)/u,
  )

  const phases = [
    record({ turn: 1 }),
    record({ turn: 2, planned: true }),
    record({ turn: 3, planned: true, closed: true }),
    record({ turn: 4, planned: true, closed: true, settled: true }),
  ].map(value => summarizeRoleplayTurnHealth([value]).latest?.nextPhase)
  assert.deepEqual(phases, ['prepare', 'act', 'settle', 'present'])
})

test('keeps a boundary-only open turn visible to prepare-phase diagnostics', () => {
  const session = Session.create(SessionId('turn-health-open'))
  session.append('turn/start', { turn: 1 })
  const records = readRoleplayTurnRecords(session)
  assert.equal(records.length, 1)
  assert.deepEqual(summarizeRoleplayTurnHealth(records).latest, {
    turn: 1,
    status: 'open',
    nextPhase: 'prepare',
    finalizableFromLog: false,
    phases: {
      plannedSteps: 0, preparedSteps: 0, recalledSteps: 0, actedSteps: 0,
      assistantMessages: 0, toolCalls: 0, toolResults: 0, settled: false, presented: false,
    },
  })
})

test('wire parser strips every field outside the fixed diagnostic vocabulary', () => {
  const health = summarizeRoleplayTurnHealth([record({
    turn: 1, planned: true, closed: true, settled: true, presented: true,
  })])
  const parsed = parseAgentRpTurnHealthDiagnostic({
    format: 0,
    status: 'ready',
    health: {
      ...health,
      privateSession: 'must not remain',
      latest: { ...health.latest, privatePrompt: 'must not remain' },
    },
    privateCard: 'must not remain',
  })
  assert.equal(parsed.status, 'ready')
  assert.doesNotMatch(JSON.stringify(parsed), /private|must not remain/u)
  assert.throws(() => parseAgentRpTurnHealthDiagnostic({
    format: 0, status: 'ready', health: { ...health, turns: -1 },
  }), /invalid Agent RP turn health/u)
  assert.throws(() => parseAgentRpTurnHealthDiagnostic({
    format: 0, status: 'ready', health: {
      ...health, statuses: { ...health.statuses, complete: health.statuses.complete + 1 },
    },
  }), /invalid Agent RP turn health totals/u)
})
