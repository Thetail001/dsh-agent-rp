/** Browser-safe wire contract for content-free Roleplay turn health. */

export const AGENT_RP_TURN_HEALTH_PATH = '/api/agent-rp/turn-health'

export type RoleplayTurnPhaseDiagnostic = 'prepare' | 'recall' | 'act' | 'settle' | 'present'

export type RoleplayTurnHealthStatus =
  | 'open'
  | 'awaiting-settlement'
  | 'awaiting-presentation'
  | 'complete'

/** Fixed, content-free proof that the world module participated in actual model steps. */
export interface RoleplayWorldRecallDiagnostic {
  readonly steps: number
  readonly outcomes: {
    readonly applied: number
    readonly idle: number
    readonly degraded: number
  }
  readonly contributions: number
}

/** Counts of logged third-party plugin messages consumed by concrete model steps. */
export interface RoleplayExternalRecallDiagnostic {
  readonly steps: number
  readonly messages: number
}

/** Counts only; never includes prompt text, messages, tool names, arguments, or results. */
export interface RoleplayTurnHealthEntry {
  readonly turn: number
  readonly status: RoleplayTurnHealthStatus
  readonly nextPhase?: RoleplayTurnPhaseDiagnostic
  readonly finalizableFromLog: boolean
  readonly worldRecall?: RoleplayWorldRecallDiagnostic
  readonly externalRecall?: RoleplayExternalRecallDiagnostic
  readonly phases: {
    readonly plannedSteps: number
    readonly preparedSteps: number
    readonly recalledSteps: number
    readonly actedSteps: number
    readonly assistantMessages: number
    readonly modelCalls: number
    readonly toolCalls: number
    readonly toolResults: number
    readonly settled: boolean
    readonly presented: boolean
  }
}

/** Aggregate lifecycle health safe to attach to community diagnostics. */
export interface RoleplayTurnHealthSummary {
  readonly audit: 'agent-rp-turn-health-v0'
  readonly turns: number
  readonly statuses: {
    readonly open: number
    readonly awaitingSettlement: number
    readonly awaitingPresentation: number
    readonly complete: number
  }
  readonly latest?: RoleplayTurnHealthEntry
}

export type AgentRpTurnHealthDiagnostic =
  | { readonly format: 0; readonly status: 'loading' | 'invalid' | 'unavailable' }
  | { readonly format: 0; readonly status: 'ready'; readonly health: RoleplayTurnHealthSummary }

function nonNegative(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`invalid Agent RP turn health ${label}`)
  }
  return value
}

function positive(value: unknown, label: string): number {
  const parsed = nonNegative(value, label)
  if (parsed === 0) throw new Error(`invalid Agent RP turn health ${label}`)
  return parsed
}

function parseEntry(value: unknown): RoleplayTurnHealthEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('invalid Agent RP turn health entry')
  }
  const record = value as Record<string, unknown>
  const phase = record.nextPhase
  const phases = record.phases
  if (record.status !== 'open' && record.status !== 'awaiting-settlement'
    && record.status !== 'awaiting-presentation' && record.status !== 'complete') {
    throw new Error('invalid Agent RP turn health status')
  }
  if (phase !== undefined && phase !== 'prepare' && phase !== 'recall' && phase !== 'act'
    && phase !== 'settle' && phase !== 'present') {
    throw new Error('invalid Agent RP turn health phase')
  }
  if (typeof record.finalizableFromLog !== 'boolean'
    || typeof phases !== 'object' || phases === null || Array.isArray(phases)) {
    throw new Error('invalid Agent RP turn health phases')
  }
  const counts = phases as Record<string, unknown>
  if (typeof counts.settled !== 'boolean' || typeof counts.presented !== 'boolean') {
    throw new Error('invalid Agent RP turn health boundaries')
  }
  let worldRecall: RoleplayWorldRecallDiagnostic | undefined
  if (record.worldRecall !== undefined) {
    if (typeof record.worldRecall !== 'object' || record.worldRecall === null
      || Array.isArray(record.worldRecall)) {
      throw new Error('invalid Agent RP world recall diagnostic')
    }
    const world = record.worldRecall as Record<string, unknown>
    const outcomes = world.outcomes
    if (typeof outcomes !== 'object' || outcomes === null || Array.isArray(outcomes)) {
      throw new Error('invalid Agent RP world recall outcomes')
    }
    const values = outcomes as Record<string, unknown>
    const steps = positive(world.steps, 'world recall steps')
    const parsedOutcomes = {
      applied: nonNegative(values.applied, 'world recall applied'),
      idle: nonNegative(values.idle, 'world recall idle'),
      degraded: nonNegative(values.degraded, 'world recall degraded'),
    }
    const contributions = nonNegative(world.contributions, 'world recall contributions')
    if (Object.values(parsedOutcomes).reduce((total, count) => total + count, 0) !== steps
      || (parsedOutcomes.applied === 0) !== (contributions === 0)) {
      throw new Error('invalid Agent RP world recall totals')
    }
    worldRecall = { steps, outcomes: parsedOutcomes, contributions }
  }
  let externalRecall: RoleplayExternalRecallDiagnostic | undefined
  if (record.externalRecall !== undefined) {
    if (typeof record.externalRecall !== 'object' || record.externalRecall === null
      || Array.isArray(record.externalRecall)) {
      throw new Error('invalid Agent RP external recall diagnostic')
    }
    const external = record.externalRecall as Record<string, unknown>
    const steps = positive(external.steps, 'external recall steps')
    const messages = positive(external.messages, 'external recall messages')
    if (messages < steps) throw new Error('invalid Agent RP external recall totals')
    externalRecall = { steps, messages }
  }
  return {
    turn: positive(record.turn, 'turn'),
    status: record.status,
    ...(phase === undefined ? {} : { nextPhase: phase }),
    finalizableFromLog: record.finalizableFromLog,
    ...(worldRecall === undefined ? {} : { worldRecall }),
    ...(externalRecall === undefined ? {} : { externalRecall }),
    phases: {
      plannedSteps: nonNegative(counts.plannedSteps, 'planned steps'),
      preparedSteps: nonNegative(counts.preparedSteps, 'prepared steps'),
      recalledSteps: nonNegative(counts.recalledSteps, 'recalled steps'),
      actedSteps: nonNegative(counts.actedSteps, 'acted steps'),
      assistantMessages: nonNegative(counts.assistantMessages, 'assistant messages'),
      modelCalls: nonNegative(counts.modelCalls ?? 0, 'model calls'),
      toolCalls: nonNegative(counts.toolCalls, 'tool calls'),
      toolResults: nonNegative(counts.toolResults, 'tool results'),
      settled: counts.settled,
      presented: counts.presented,
    },
  }
}

function parseSummary(value: unknown): RoleplayTurnHealthSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('invalid Agent RP turn health summary')
  }
  const record = value as Record<string, unknown>
  const statuses = record.statuses
  if (record.audit !== 'agent-rp-turn-health-v0'
    || typeof statuses !== 'object' || statuses === null || Array.isArray(statuses)) {
    throw new Error('invalid Agent RP turn health audit')
  }
  const counts = statuses as Record<string, unknown>
  const turns = nonNegative(record.turns, 'turns')
  const parsedStatuses = {
    open: nonNegative(counts.open, 'open turns'),
    awaitingSettlement: nonNegative(counts.awaitingSettlement, 'awaiting settlement'),
    awaitingPresentation: nonNegative(counts.awaitingPresentation, 'awaiting presentation'),
    complete: nonNegative(counts.complete, 'complete turns'),
  }
  if (Object.values(parsedStatuses).reduce((total, count) => total + count, 0) !== turns
    || (turns === 0) !== (record.latest === undefined)) {
    throw new Error('invalid Agent RP turn health totals')
  }
  const latest = record.latest === undefined ? undefined : parseEntry(record.latest)
  if (latest !== undefined) {
    const expectedPhase = latest.status === 'open'
      ? latest.nextPhase === 'prepare' || latest.nextPhase === 'recall' || latest.nextPhase === 'act'
      : latest.status === 'awaiting-settlement' ? latest.nextPhase === 'settle'
        : latest.status === 'awaiting-presentation' ? latest.nextPhase === 'present'
          : latest.nextPhase === undefined
    const boundariesValid = latest.status === 'complete'
      ? latest.phases.settled && latest.phases.presented
      : latest.status === 'awaiting-presentation'
        ? latest.phases.settled && !latest.phases.presented
        : !latest.phases.settled && !latest.phases.presented
    if (!expectedPhase || !boundariesValid
      || latest.phases.preparedSteps > latest.phases.plannedSteps
      || latest.phases.recalledSteps > latest.phases.plannedSteps
      || (latest.worldRecall?.steps ?? 0) > latest.phases.recalledSteps
      || (latest.externalRecall?.steps ?? 0) > latest.phases.recalledSteps) {
      throw new Error('invalid Agent RP turn health lifecycle')
    }
  }
  return {
    audit: 'agent-rp-turn-health-v0',
    turns,
    statuses: parsedStatuses,
    ...(latest === undefined ? {} : { latest }),
  }
}

/** Parse and strip any fields outside the fixed content-free diagnostic vocabulary. */
export function parseAgentRpTurnHealthDiagnostic(value: unknown): AgentRpTurnHealthDiagnostic {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('invalid Agent RP turn health response')
  }
  const record = value as Record<string, unknown>
  if (record.format !== 0 || (record.status !== 'loading' && record.status !== 'invalid'
    && record.status !== 'unavailable' && record.status !== 'ready')) {
    throw new Error('invalid Agent RP turn health response')
  }
  return record.status === 'ready'
    ? { format: 0, status: 'ready', health: parseSummary(record.health) }
    : { format: 0, status: record.status }
}
