/** Cold recovery for Roleplay settlements whose volatile coordinator state was lost. */

import { Session, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import {
  appendRoleplayTurnPresentation,
} from './roleplay-turn-presentation.ts'
import {
  appendRoleplayTurnSettlement,
  compileRoleplayTurnSettlementFromReferences,
  type RoleplayTurnPlanReference,
} from './roleplay-turn-settlement.ts'
import { resolveSessionRoleplayRuntime } from './session-roleplay-runtime.ts'
import {
  readSessionRoleplayTurnPlanReferences,
} from './session-roleplay-turn-plan.ts'
import {
  compileInitialSessionRoleplayTurnPresentation,
} from './session-roleplay-turn-presentation.ts'
import {
  collectSessionRoleplaySettlementContributionsFromReferences,
} from './session-roleplay-turn-settlement.ts'

/** Content-free count of records restored from pre-dispatch receipts. */
export interface SessionRoleplayTurnRecoveryResult {
  readonly settlements: number
  readonly presentations: number
  readonly turns: readonly number[]
}

function referencesRecoverable(plans: readonly RoleplayTurnPlanReference[]): boolean {
  return plans.length > 0 && plans.every(plan => plan.receipt !== undefined
    && plan.receipt.memoryWriteAvailable !== undefined
    && plan.receipt.runtime.settleModules !== undefined
    && plan.receipt.runtime.presentModuleIds !== undefined)
}

function presentationExists(
  events: readonly SessionEvent[],
  settlementSeq: number,
): boolean {
  return events.some(event => event.type === 'agent-rp/turn-presentation'
    && event.data.settlementSeq === settlementSeq)
}

/**
 * Restore missing settlement/presentation records for closed turns.
 * Old logs without pre-dispatch receipts remain readable and are deliberately skipped.
 */
export function recoverSessionRoleplayTurns(input: {
  readonly session: Session
  readonly deployment: ResolvedConfig
  readonly templateEngineAvailable?: boolean
}): SessionRoleplayTurnRecoveryResult {
  const closedTurns = input.session.events.filter((event): event is SessionEvent<'turn/end'> =>
    event.type === 'turn/end')
  const recoveredTurns: number[] = []
  let settlements = 0
  let presentations = 0
  for (const closing of closedTurns) {
    let settlement = input.session.events.find(event => event.type === 'agent-rp/turn-settlement'
      && event.data.turn === closing.data.turn)
    const plans = settlement?.type === 'agent-rp/turn-settlement'
      ? settlement.data.plans
      : readSessionRoleplayTurnPlanReferences(input.session.events, closing.data.turn, closing.seq)
    if (!referencesRecoverable(plans)) continue
    if (settlement?.type !== 'agent-rp/turn-settlement') {
      const boundary = Session.create(input.session.id, input.session.events.slice(0, closing.seq + 1))
      const memoryWriteAvailable = plans.some(plan => plan.receipt?.memoryWriteAvailable === true)
      const resolved = resolveSessionRoleplayRuntime({
        session: boundary,
        deployment: input.deployment,
        memoryWriteAvailable,
        ...(input.templateEngineAvailable === undefined
          ? {} : { templateEngineAvailable: input.templateEngineAvailable }),
      })
      const value = compileRoleplayTurnSettlementFromReferences({
        sessionId: String(input.session.id),
        turn: closing.data.turn,
        result: closing.data.reason.kind,
        plans,
        events: boundary.events.slice(0, closing.seq + 1),
        after: resolved.snapshot,
        contributions: collectSessionRoleplaySettlementContributionsFromReferences({
          session: boundary,
          turn: closing.data.turn,
          plans,
          ...(resolved.mvu === undefined ? {} : { mvu: resolved.mvu }),
        }),
      })
      settlement = appendRoleplayTurnSettlement(input.session, value)
      settlements += 1
      recoveredTurns.push(closing.data.turn)
    }
    if (settlement.type === 'agent-rp/turn-settlement'
      && !presentationExists(input.session.events, settlement.seq)) {
      appendRoleplayTurnPresentation(
        input.session,
        compileInitialSessionRoleplayTurnPresentation({
          session: input.session,
          settlementEvent: settlement,
        }),
      )
      presentations += 1
    }
  }
  return { settlements, presentations, turns: recoveredTurns }
}
