import assert from 'node:assert/strict'
import test from 'node:test'
import { ROLEPLAY_TURN_PHASES, type RoleplayRuntimeSnapshot } from '../src/roleplay-runtime.ts'
import { RoleplayTurnCoordinator } from '../src/roleplay-turn-coordinator.ts'
import type { RoleplayTurnPlan } from '../src/roleplay-turn-plan.ts'

function plan(label: string, sessionSeq = 0): RoleplayTurnPlan {
  const runtime: RoleplayRuntimeSnapshot = {
    format: 0,
    lifecycle: ROLEPLAY_TURN_PHASES,
    experience: { id: `experience:${label}`, name: label, owner: 'session', mode: 'character' },
    world: { bindings: [] },
    prompt: { strategy: 'native' },
    state: [],
    memory: { read: true, write: false },
    modules: [],
  }
  return {
    format: 0,
    input: { sessionId: 'coordinator-session', sessionSeq, pendingMessageIds: [] },
    runtime,
    world: {
      engine: 'native-v0', resources: [], inChat: [], experienceBeforeActor: [], actorBefore: [], actorAfter: [],
      experienceAfterActor: [], approximateTokens: 0,
    },
    prompt: {
      beforeHistory: [], afterHistory: [], inChat: [], includeHistory: true, systemPromptText: '',
      transforms: { actorName: label, operations: [] },
      diagnostics: { enabledModules: 0, unsupportedMacros: 0, templateFailures: 0 },
    },
    act: { responseRepairs: [] },
    stateReads: [],
    memory: { ...runtime.memory, reads: [], contextText: '' },
    generation: {},
    prepare: { modules: [] },
    recall: { modules: [] },
  }
}

test('binds each prepared plan to the exact Agent-loop step', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  const first = plan('first', 1)
  const second = plan('second', 3)

  coordinator.prepare(owner, first)
  assert.equal(coordinator.current(owner), first)
  assert.equal(coordinator.bindStep(owner, 2, 1), first)
  coordinator.prepare(owner, second)
  assert.equal(coordinator.bindStep(owner, 2, 2), second)

  assert.deepEqual(coordinator.completeTurn(owner, 2), [
    { step: 1, plan: first },
    { step: 2, plan: second },
  ])
  assert.equal(coordinator.current(owner), undefined)
})

test('preserves the first plan when the same step is retried', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  const original = plan('original')
  const retry = plan('retry')

  coordinator.prepare(owner, original)
  assert.equal(coordinator.bindStep(owner, 1, 1), original)
  coordinator.prepare(owner, retry)
  assert.equal(coordinator.bindStep(owner, 1, 1), original)
  assert.deepEqual(coordinator.completeTurn(owner, 1), [{ step: 1, plan: original }])
  assert.equal(coordinator.current(owner), retry)
})

test('finalizes a prepared plan once before binding it to the model step', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  const prepared = plan('prepared')
  let finalizations = 0

  coordinator.prepare(owner, prepared)
  const finalized = coordinator.bindStep(owner, 1, 1, value => {
    finalizations++
    return { ...value, generation: { temperature: 0.4 } }
  })
  const retry = coordinator.bindStep(owner, 1, 1, value => {
    finalizations++
    return value
  })

  assert.equal(finalizations, 1)
  assert.equal(retry, finalized)
  assert.equal(coordinator.current(owner), finalized)
  assert.deepEqual(finalized?.generation, { temperature: 0.4 })
})

test('does not let a delayed turn end erase a newer unconsumed plan', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  const old = plan('old')
  const next = plan('next')

  coordinator.prepare(owner, old)
  coordinator.bindStep(owner, 4, 1)
  coordinator.prepare(owner, next)

  assert.deepEqual(coordinator.completeTurn(owner, 4), [{ step: 1, plan: old }])
  assert.equal(coordinator.current(owner), next)
})

test('ignores unprepared turns and releases all owner state', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  const prepared = plan('prepared')

  assert.equal(coordinator.bindStep(owner, 1, 1), undefined)
  assert.deepEqual(coordinator.completeTurn(owner, 1), [])
  coordinator.prepare(owner, prepared)
  coordinator.bindStep(owner, 1, 1)
  coordinator.release(owner)
  assert.equal(coordinator.current(owner), undefined)
  assert.deepEqual(coordinator.completeTurn(owner, 1), [])
})

test('rejects invalid turn and step boundaries', () => {
  const coordinator = new RoleplayTurnCoordinator<object>()
  const owner = {}
  coordinator.prepare(owner, plan('invalid'))

  assert.throws(() => coordinator.bindStep(owner, 0, 1), /turn must be a positive integer/u)
  assert.throws(() => coordinator.bindStep(owner, 1, Number.NaN), /step must be a positive integer/u)
  assert.throws(() => coordinator.completeTurn(owner, -1), /turn must be a positive integer/u)
})
