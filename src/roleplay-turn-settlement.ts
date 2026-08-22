/** Durable, source-neutral result compiled when one Roleplay turn closes. */

import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { readAgentRpMemoryHistory } from './memory.ts'
import {
  ROLEPLAY_MEMORY_MODULE_ID,
  type RoleplayRuntimeSnapshot,
  type RoleplayStateBinding,
  type RoleplayTurnSettlementContribution,
} from './roleplay-runtime.ts'
import type { RoleplayTurnInputKey, RoleplayTurnPlan } from './roleplay-turn-plan.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'

/** Exact prepared input consumed by one model step in the settled turn. */
export interface RoleplayTurnPlanReference {
  readonly step: number
  readonly input: RoleplayTurnInputKey
  /** Content-free receipt for replaying and diagnosing the exact prepared plan. */
  readonly receipt?: RoleplayTurnPlanReceipt
}

/** Durable resource and decision references retained without duplicating model-visible prose. */
export interface RoleplayTurnPlanReceipt {
  readonly runtime: {
    readonly experienceId: string
    readonly actorId?: string
    readonly participantId?: string
    readonly worldIds: readonly string[]
    readonly promptId?: string
    readonly stateIds: readonly string[]
    readonly moduleIds: readonly string[]
  }
  readonly world: {
    readonly activeEntries: readonly { readonly resourceId: string; readonly entryIds: readonly string[] }[]
    readonly approximateTokens: number
    readonly tokenBudget?: number
  }
  readonly promptDiagnostics: RoleplayTurnPlan['prompt']['diagnostics']
  readonly stateReads: readonly {
    readonly id: string
    readonly revision?: number
    readonly eventSeq?: number
  }[]
  readonly memoryReads: RoleplayTurnPlan['memory']['reads']
  readonly generation: RoleplayTurnPlan['generation']
  readonly prepare: RoleplayTurnPlan['prepare']
}

/** Revision change observed at the turn boundary for one runtime state namespace. */
export interface RoleplayStateSettlement {
  readonly id: string
  readonly beforeRevision?: number
  readonly afterRevision?: number
  readonly outcome: 'created' | 'updated' | 'unchanged' | 'removed' | 'unversioned' | 'failed'
  readonly error?: string
}

/** Explainable result of one module that participates in the settle phase. */
export interface RoleplaySettleModuleOutcome {
  readonly moduleId: string
  readonly outcome: 'applied' | 'idle' | 'deferred' | 'failed'
  readonly changes: number
  readonly error?: string
}

/** Replayable summary of state and memory after one complete Roleplay turn. */
export interface RoleplayTurnSettlement {
  readonly format: 0
  readonly sessionId: string
  readonly turn: number
  readonly result: string
  readonly plans: readonly RoleplayTurnPlanReference[]
  readonly reply?: {
    readonly eventSeq: number
    readonly messageId: string
  }
  readonly state: readonly RoleplayStateSettlement[]
  readonly memory: {
    readonly writeAvailable: boolean
    readonly createdIds: readonly string[]
    /** Memory records active before this turn that are no longer active afterward. */
    readonly supersededIds: readonly string[]
    readonly activeCount: number
  }
  readonly settle: {
    readonly modules: readonly RoleplaySettleModuleOutcome[]
  }
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Informational Roleplay settlement; losing it does not change Session reconstruction. */
    'agent-rp/turn-settlement': RoleplayTurnSettlement
  }
}

/** A plan bound to the concrete model step that consumed it. */
export interface BoundRoleplayTurnPlan {
  readonly step: number
  readonly plan: RoleplayTurnPlan
}

export interface CompileRoleplayTurnSettlementInput {
  readonly sessionId: string
  readonly turn: number
  readonly result: string
  readonly plans: readonly BoundRoleplayTurnPlan[]
  readonly events: readonly SessionEvent[]
  readonly after: RoleplayRuntimeSnapshot
  readonly contributions?: readonly RoleplayTurnSettlementContribution[]
}

function stateById(bindings: readonly RoleplayStateBinding[]): ReadonlyMap<string, RoleplayStateBinding> {
  return new Map(bindings.map(binding => [binding.id, binding]))
}

function stateSettlement(
  id: string,
  before: RoleplayStateBinding | undefined,
  after: RoleplayStateBinding | undefined,
  error: string | undefined,
): RoleplayStateSettlement {
  const revisions = {
    ...(before?.revision === undefined ? {} : { beforeRevision: before.revision }),
    ...(after?.revision === undefined ? {} : { afterRevision: after.revision }),
  }
  if (error !== undefined) return { id, ...revisions, outcome: 'failed', error }
  if (before === undefined && after !== undefined) {
    return { id, ...revisions, outcome: after.revision === undefined ? 'unversioned' : 'created' }
  }
  if (before !== undefined && after === undefined) return { id, ...revisions, outcome: 'removed' }
  if (before?.revision === undefined || after?.revision === undefined) {
    return { id, ...revisions, outcome: 'unversioned' }
  }
  return { id, ...revisions, outcome: before.revision === after.revision ? 'unchanged' : 'updated' }
}

function latestTurnReply(
  events: readonly SessionEvent[],
  turn: number,
): RoleplayTurnSettlement['reply'] | undefined {
  const surface = new Set<number>()
  for (const event of events) {
    if (event.type === 'user/message' || event.type === 'assistant/message' || event.type === 'tool/result') {
      if (event.surfaceOp === 'append') surface.add(event.seq)
      else if (event.surfaceOp !== undefined) {
        for (const seq of [...surface]) {
          if (seq >= event.surfaceOp.start && seq <= event.surfaceOp.end) surface.delete(seq)
        }
        surface.add(event.seq)
      }
    }
  }
  const reply = events.findLast(event => event.type === 'assistant/message'
    && event.data.turn === turn && surface.has(event.seq))
  return reply?.type === 'assistant/message'
    ? { eventSeq: reply.seq, messageId: String(reply.data.message.id) }
    : undefined
}

function planReceipt(plan: RoleplayTurnPlan): RoleplayTurnPlanReceipt {
  return {
    runtime: {
      experienceId: plan.runtime.experience.id,
      ...(plan.runtime.actor === undefined ? {} : { actorId: plan.runtime.actor.id }),
      ...(plan.runtime.participant === undefined ? {} : { participantId: plan.runtime.participant.id }),
      worldIds: plan.runtime.world.bindings.map(binding => binding.id),
      ...(plan.runtime.prompt.resource === undefined ? {} : { promptId: plan.runtime.prompt.resource.id }),
      stateIds: plan.runtime.state.map(binding => binding.id),
      moduleIds: plan.runtime.modules.map(module => module.id),
    },
    world: {
      activeEntries: plan.world.resources.map(resource => ({
        resourceId: resource.resource.id,
        entryIds: resource.entries.filter(entry => entry.active).map(entry => entry.entryId),
      })),
      approximateTokens: plan.world.approximateTokens,
      ...(plan.world.tokenBudget === undefined ? {} : { tokenBudget: plan.world.tokenBudget }),
    },
    promptDiagnostics: { ...plan.prompt.diagnostics },
    stateReads: plan.stateReads.map(read => ({
      id: read.id,
      ...(read.revision === undefined ? {} : { revision: read.revision }),
      ...(read.eventSeq === undefined ? {} : { eventSeq: read.eventSeq }),
    })),
    memoryReads: plan.memory.reads.map(read => ({ ...read })),
    generation: { ...plan.generation },
    prepare: { modules: plan.prepare.modules.map(module => ({ ...module })) },
  }
}

interface SettleModuleContract {
  readonly moduleId: string
  readonly stateIds: ReadonlySet<string>
}

function settleModuleContracts(plans: readonly BoundRoleplayTurnPlan[]): readonly SettleModuleContract[] {
  const contracts = new Map<string, Set<string>>()
  const stateOwners = new Map<string, string>()
  for (const { plan } of plans) {
    for (const module of plan.runtime.modules) {
      if (!module.phases.includes('settle')) continue
      let stateIds = contracts.get(module.id)
      if (stateIds === undefined) {
        stateIds = new Set()
        contracts.set(module.id, stateIds)
      }
      for (const stateId of module.stateIds ?? []) {
        const owner = stateOwners.get(stateId)
        if (owner !== undefined && owner !== module.id) {
          throw new Error(`Roleplay state ${stateId} is owned by both ${owner} and ${module.id}`)
        }
        stateOwners.set(stateId, module.id)
        stateIds.add(stateId)
      }
    }
  }
  return [...contracts].map(([moduleId, stateIds]) => ({ moduleId, stateIds }))
}

function settlementContributions(
  contracts: readonly SettleModuleContract[],
  contributions: readonly RoleplayTurnSettlementContribution[],
): ReadonlyMap<string, RoleplayTurnSettlementContribution> {
  const moduleIds = new Set(contracts.map(contract => contract.moduleId))
  const result = new Map<string, RoleplayTurnSettlementContribution>()
  for (const contribution of contributions) {
    if (!moduleIds.has(contribution.moduleId)) {
      throw new Error(`Roleplay settlement contribution references inactive module ${contribution.moduleId}`)
    }
    if (result.has(contribution.moduleId)) {
      throw new Error(`Roleplay settlement contains duplicate contribution for ${contribution.moduleId}`)
    }
    if (contribution.outcome === 'failed'
      && (contribution.error === undefined || contribution.error.trim() === '')) {
      throw new Error(`Roleplay failed contribution for ${contribution.moduleId} requires an error`)
    }
    if (contribution.outcome === 'deferred' && contribution.error !== undefined) {
      throw new Error(`Roleplay deferred contribution for ${contribution.moduleId} cannot contain an error`)
    }
    result.set(contribution.moduleId, contribution)
  }
  return result
}

function settleModules(
  contracts: readonly SettleModuleContract[],
  state: readonly RoleplayStateSettlement[],
  memory: RoleplayTurnSettlement['memory'],
  contributions: ReadonlyMap<string, RoleplayTurnSettlementContribution>,
): readonly RoleplaySettleModuleOutcome[] {
  const stateFor = (id: string) => state.find(item => item.id === id)
  return contracts.map(({ moduleId, stateIds }): RoleplaySettleModuleOutcome => {
    const relatedStates = [...stateIds].flatMap(id => {
      const related = stateFor(id)
      return related === undefined ? [] : [related]
    })
    const changes = moduleId === ROLEPLAY_MEMORY_MODULE_ID
      ? memory.createdIds.length + memory.supersededIds.length
      : relatedStates.filter(related => related.outcome === 'created' || related.outcome === 'updated'
        || related.outcome === 'removed').length
    const contribution = contributions.get(moduleId)
    const outcome = contribution?.outcome === 'failed' || relatedStates.some(related => related.outcome === 'failed')
      ? 'failed' as const
      : contribution?.outcome === 'deferred' ? 'deferred' as const
        : changes > 0 ? 'applied' as const
          : 'idle' as const
    const error = contribution?.outcome === 'failed' ? contribution.error
      : relatedStates.find(related => related.outcome === 'failed')?.error
    return { moduleId, outcome, changes, ...(error === undefined ? {} : { error }) }
  })
}

/** Compile a turn-final settlement from the same plans used for generation. */
export function compileRoleplayTurnSettlement(
  input: CompileRoleplayTurnSettlementInput,
): RoleplayTurnSettlement {
  if (input.plans.length === 0) throw new Error('Roleplay settlement requires at least one prepared plan')
  const plans = [...input.plans].sort((left, right) => left.step - right.step)
  const steps = new Set<number>()
  for (const { step, plan } of plans) {
    if (!Number.isSafeInteger(step) || step < 1) throw new Error('Roleplay settlement step must be positive')
    if (steps.has(step)) throw new Error(`Roleplay settlement contains duplicate step ${String(step)}`)
    steps.add(step)
    if (plan.input.sessionId !== input.sessionId) {
      throw new Error('Roleplay settlement plan belongs to another Session')
    }
    if (!Number.isSafeInteger(plan.input.sessionSeq) || plan.input.sessionSeq < 0
      || plan.input.sessionSeq > input.events.length) {
      throw new Error('Roleplay settlement plan references an unavailable Session boundary')
    }
  }
  const firstPlan = plans[0]!.plan
  const contracts = settleModuleContracts(plans)
  const contributions = settlementContributions(contracts, input.contributions ?? [])
  const stateFailures = new Map<string, string>()
  for (const contract of contracts) {
    const contribution = contributions.get(contract.moduleId)
    if (contribution?.outcome !== 'failed' || contribution.error === undefined) continue
    for (const stateId of contract.stateIds) stateFailures.set(stateId, contribution.error)
  }
  const beforeStates = stateById(firstPlan.stateReads)
  const afterStates = stateById(input.after.state)
  const stateIds = new Set([...beforeStates.keys(), ...afterStates.keys(), ...stateFailures.keys()])
  const state = [...stateIds].map(id => stateSettlement(
    id,
    beforeStates.get(id),
    afterStates.get(id),
    stateFailures.get(id),
  ))
  const beforeMemory = readAgentRpMemoryHistory(input.events.slice(0, firstPlan.input.sessionSeq))
  const afterMemory = readAgentRpMemoryHistory(input.events)
  const beforeAll = new Set(beforeMemory.all.map(memory => String(memory.id)))
  const afterActive = new Set(afterMemory.active.map(memory => String(memory.id)))
  const memory = {
    writeAvailable: plans.some(({ plan }) => plan.memory.write),
    createdIds: afterMemory.all.filter(memoryRecord => !beforeAll.has(String(memoryRecord.id)))
      .map(memoryRecord => String(memoryRecord.id)),
    supersededIds: beforeMemory.active.filter(memoryRecord => !afterActive.has(String(memoryRecord.id)))
      .map(memoryRecord => String(memoryRecord.id)),
    activeCount: afterMemory.active.length,
  }
  const reply = latestTurnReply(input.events, input.turn)
  return {
    format: 0,
    sessionId: input.sessionId,
    turn: input.turn,
    result: input.result,
    plans: plans.map(({ step, plan }) => ({ step, input: plan.input, receipt: planReceipt(plan) })),
    ...(reply === undefined ? {} : { reply }),
    state,
    memory,
    settle: {
      modules: settleModules(contracts, state, memory, contributions),
    },
  }
}

/** Append an informational settlement through the Host's replay-safe plugin-event seam. */
export function appendRoleplayTurnSettlement(
  session: Session,
  settlement: RoleplayTurnSettlement,
): SessionEvent<'agent-rp/turn-settlement'> {
  const existing = session.events.find(event => event.type === 'agent-rp/turn-settlement'
    && event.data.turn === settlement.turn)
  if (existing?.type === 'agent-rp/turn-settlement') return existing
  return appendAgentRpSessionEvent(session, 'agent-rp/turn-settlement', settlement)
}

/** Fold previously written settlement records in chronological order. */
export function readRoleplayTurnSettlements(events: readonly SessionEvent[]): readonly RoleplayTurnSettlement[] {
  return events.flatMap(event => event.type === 'agent-rp/turn-settlement' ? [event.data] : [])
}
