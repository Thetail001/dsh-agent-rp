/** Pre-dispatch Roleplay plan receipts persisted independently from volatile Agent ownership. */

import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { RoleplayTurnPlan } from './roleplay-turn-plan.ts'
import {
  createRoleplayTurnPlanReference,
  type RoleplayTurnPlanReference,
} from './roleplay-turn-settlement.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'

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
