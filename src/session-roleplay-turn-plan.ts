/** Pre-dispatch Roleplay plan receipts persisted independently from volatile Agent ownership. */

import { Session, type SessionEvent, type UserMessage } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import type { EjsTemplateEngine } from './ejs-template.ts'
import { prepareRoleplayTurn, type RoleplayTurnPlan } from './roleplay-turn-plan.ts'
import { bindRoleplayExternalContext } from './roleplay-turn-context.ts'
import {
  createRoleplayTurnPlanReference,
  roleplayTurnPlanSha256,
  roleplayTurnPlanSectionSha256,
  type RoleplayTurnPlanReference,
} from './roleplay-turn-settlement.ts'
import { resolveSessionRoleplayRuntime } from './session-roleplay-runtime.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'

function replayBoundary(session: Session, events: readonly SessionEvent[]): Session {
  const constructor = session.constructor as typeof Session
  return constructor.create(session.id, events) as Session
}

/** Content-free prepared plan bound to the exact model step that will consume it. */
export interface SessionRoleplayTurnPlanRecord {
  readonly format: 0
  readonly sessionId: string
  readonly turn: number
  readonly reference: RoleplayTurnPlanReference & { readonly receipt: NonNullable<RoleplayTurnPlanReference['receipt']> }
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Ignorable pre-dispatch receipt used to recover settlement after a Host restart. */
    'agent-rp/turn-plan': SessionRoleplayTurnPlanRecord
  }
}

function sameRecord(left: SessionRoleplayTurnPlanRecord, right: SessionRoleplayTurnPlanRecord): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** Persist one prepared plan before the provider request leaves the Host. */
export function appendSessionRoleplayTurnPlan(
  session: Session,
  turn: number,
  step: number,
  plan: RoleplayTurnPlan,
): SessionEvent<'agent-rp/turn-plan'> {
  if (!Number.isSafeInteger(turn) || turn < 1) throw new Error('Roleplay turn plan turn must be positive')
  if (!Number.isSafeInteger(step) || step < 1) throw new Error('Roleplay turn plan step must be positive')
  if (plan.input.sessionId !== String(session.id)) {
    throw new Error('Roleplay turn plan belongs to another Session')
  }
  const reference = createRoleplayTurnPlanReference(step, plan)
  if (reference.receipt === undefined) throw new Error('Roleplay turn plan receipt is unavailable')
  const record: SessionRoleplayTurnPlanRecord = {
    format: 0,
    sessionId: String(session.id),
    turn,
    reference: { ...reference, receipt: reference.receipt },
  }
  const existing = session.events.find(event => event.type === 'agent-rp/turn-plan'
    && event.data.turn === turn && event.data.reference.step === step)
  if (existing?.type === 'agent-rp/turn-plan') {
    if (!sameRecord(existing.data, record)) {
      throw new Error(`Roleplay turn ${String(turn)} step ${String(step)} changed after dispatch`)
    }
    return existing
  }
  return appendAgentRpSessionEvent(session, 'agent-rp/turn-plan', record)
}

/** Read every pre-dispatch plan receipt in chronological order. */
export function readSessionRoleplayTurnPlans(
  events: readonly SessionEvent[],
): readonly SessionEvent<'agent-rp/turn-plan'>[] {
  return events.flatMap(event => event.type === 'agent-rp/turn-plan' ? [event] : [])
}

/** Select the plans durably dispatched inside one turn before its closing boundary. */
export function readSessionRoleplayTurnPlanReferences(
  events: readonly SessionEvent[],
  turn: number,
  beforeSeq = Number.POSITIVE_INFINITY,
): readonly RoleplayTurnPlanReference[] {
  return readSessionRoleplayTurnPlans(events)
    .filter(event => event.seq < beforeSeq && event.data.turn === turn)
    .map(event => event.data.reference)
    .sort((left, right) => left.step - right.step)
}

function pendingMessagesForRecord(
  events: readonly SessionEvent[],
  record: SessionEvent<'agent-rp/turn-plan'>,
): readonly UserMessage[] {
  const { input } = record.data.reference
  if (new Set(input.pendingMessageIds).size !== input.pendingMessageIds.length) {
    throw new Error('Roleplay turn plan contains duplicate pending message ids')
  }
  const candidates = events.slice(input.sessionSeq, record.seq).flatMap(event =>
    event.type === 'user/message' ? [event.data] : [])
  return input.pendingMessageIds.map(id => {
    const matches = candidates.filter(message => String(message.id) === id)
    if (matches.length !== 1) {
      throw new Error(`Roleplay turn plan pending message ${JSON.stringify(id)} is unavailable or ambiguous`)
    }
    return matches[0]!
  })
}

/** Rebuild one complete prepared plan from its exact Session prefix and verify its content digest. */
export function replaySessionRoleplayTurnPlan(input: {
  readonly session: Session
  readonly record: SessionEvent<'agent-rp/turn-plan'>
  readonly deployment: ResolvedConfig
  readonly templateEngine?: EjsTemplateEngine
}): RoleplayTurnPlan {
  const { session, record } = input
  const stored = session.events[record.seq]
  if (stored?.type !== 'agent-rp/turn-plan' || !sameRecord(stored.data, record.data)) {
    throw new Error('Roleplay turn plan record is not present at its declared Session boundary')
  }
  const reference = record.data.reference
  if (record.data.sessionId !== String(session.id) || reference.input.sessionId !== String(session.id)) {
    throw new Error('Roleplay turn plan belongs to another Session')
  }
  if (!Number.isSafeInteger(reference.input.sessionSeq) || reference.input.sessionSeq < 0
    || reference.input.sessionSeq >= record.seq) {
    throw new Error('Roleplay turn plan references an unavailable preparation boundary')
  }
  const expectedDigest = reference.receipt.preparedPlanSha256
  const expectedSections = reference.receipt.preparedPlanSectionsSha256
  if (expectedDigest === undefined || expectedSections === undefined) {
    throw new Error('Roleplay turn plan is too old for exact replay verification')
  }
  const boundary = replayBoundary(session, session.events.slice(0, reference.input.sessionSeq))
  const resolved = resolveSessionRoleplayRuntime({
    session: boundary,
    deployment: input.deployment,
    memoryWriteAvailable: reference.receipt.memoryWriteAvailable === true,
    templateEngineAvailable: input.templateEngine !== undefined,
  })
  const prepared = prepareRoleplayTurn({
    session: boundary,
    sessionBoundarySeq: reference.input.sessionSeq,
    pendingMessages: pendingMessagesForRecord(session.events, record),
    deployment: input.deployment,
    resolved,
    ...(input.templateEngine === undefined ? {} : { templateEngine: input.templateEngine }),
  })
  const replayed = bindRoleplayExternalContext({
    plan: prepared,
    events: session.events,
    visibleMessages: replayBoundary(session, session.events.slice(0, record.seq)).deriveMessages(),
    turn: record.data.turn,
    step: reference.step,
    beforeSeq: record.seq,
  })
  if (JSON.stringify(replayed.input) !== JSON.stringify(reference.input)) {
    const messageIdsMatch = JSON.stringify(replayed.input.pendingMessageIds)
      === JSON.stringify(reference.input.pendingMessageIds)
    throw new Error('Roleplay turn plan input drifted during replay '
      + `(boundary ${String(reference.input.sessionSeq)} -> ${String(replayed.input.sessionSeq)}, `
      + `pending ids match: ${String(messageIdsMatch)})`)
  }
  if (roleplayTurnPlanSha256(replayed) !== expectedDigest) {
    const actualSections = roleplayTurnPlanSectionSha256(replayed)
    const sections = (Object.keys(actualSections) as (keyof RoleplayTurnPlan)[])
      .filter(key => actualSections[key] !== expectedSections[key])
    throw new Error(`Roleplay turn plan no longer matches its durable content digest (${sections.join(', ')})`)
  }
  const replayedReference = createRoleplayTurnPlanReference(reference.step, replayed)
  if (JSON.stringify(replayedReference) !== JSON.stringify(reference)) {
    throw new Error('Roleplay turn plan references no longer match their durable receipt')
  }
  return replayed
}
