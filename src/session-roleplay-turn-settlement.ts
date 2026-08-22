/** Session-adapter contributions to the source-neutral Roleplay settlement. */

import type { Session } from '@deepseek-ai/dsh-session'
import {
  MVU_ROLEPLAY_MODULE_ID,
  mvuTurnSettlementContribution,
  type MvuStateSnapshot,
} from './mvu.ts'
import type { RoleplayTurnSettlementContribution } from './roleplay-runtime.ts'
import type { BoundRoleplayTurnPlan } from './roleplay-turn-settlement.ts'
import type { RoleplayTurnPlanReference } from './roleplay-turn-settlement.ts'
import {
  TAVERN_HELPER_ROLEPLAY_MODULE_ID,
  tavernHelperTurnSettlementContribution,
} from './tavern-helper.ts'

function participates(
  plans: readonly BoundRoleplayTurnPlan[],
  moduleId: string,
): boolean {
  return plans.some(({ plan }) => plan.runtime.modules.some(module =>
    module.id === moduleId && module.phases.includes('settle')))
}

function referenceParticipates(
  plans: readonly RoleplayTurnPlanReference[],
  moduleId: string,
): boolean {
  return plans.some(plan => plan.receipt?.runtime.settleModules?.some(module =>
    module.moduleId === moduleId) === true)
}

/** Ask each active compatibility module for exceptional turn-boundary work. */
export function collectSessionRoleplaySettlementContributions(input: {
  readonly session: Session
  readonly turn: number
  readonly plans: readonly BoundRoleplayTurnPlan[]
  readonly mvu?: MvuStateSnapshot
}): readonly RoleplayTurnSettlementContribution[] {
  const firstSeq = input.plans.length === 0
    ? 0
    : Math.min(...input.plans.map(({ plan }) => plan.input.sessionSeq))
  const mvu = participates(input.plans, MVU_ROLEPLAY_MODULE_ID)
    ? mvuTurnSettlementContribution({
        session: input.session,
        turn: input.turn,
        firstSeq,
        ...(input.mvu === undefined ? {} : { state: input.mvu }),
      })
    : undefined
  return [
    ...(mvu === undefined ? [] : [mvu]),
    ...(participates(input.plans, TAVERN_HELPER_ROLEPLAY_MODULE_ID)
      ? [tavernHelperTurnSettlementContribution()]
      : []),
  ]
}

/** Recover exceptional adapter results from pre-dispatch receipts after a Host restart. */
export function collectSessionRoleplaySettlementContributionsFromReferences(input: {
  readonly session: Session
  readonly turn: number
  readonly plans: readonly RoleplayTurnPlanReference[]
  readonly mvu?: MvuStateSnapshot
}): readonly RoleplayTurnSettlementContribution[] {
  const firstSeq = input.plans.length === 0
    ? 0
    : Math.min(...input.plans.map(plan => plan.input.sessionSeq))
  const mvu = referenceParticipates(input.plans, MVU_ROLEPLAY_MODULE_ID)
    ? mvuTurnSettlementContribution({
        session: input.session,
        turn: input.turn,
        firstSeq,
        ...(input.mvu === undefined ? {} : { state: input.mvu }),
      })
    : undefined
  return [
    ...(mvu === undefined ? [] : [mvu]),
    ...(referenceParticipates(input.plans, TAVERN_HELPER_ROLEPLAY_MODULE_ID)
      ? [tavernHelperTurnSettlementContribution()]
      : []),
  ]
}
