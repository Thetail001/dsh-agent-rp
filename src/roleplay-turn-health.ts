/** Content-free lifecycle health derived exclusively from unified Roleplay turn records. */

import type { RoleplayTurnRecord } from './roleplay-turn-record.ts'
import type {
  RoleplayTurnHealthEntry,
  RoleplayTurnHealthStatus,
  RoleplayTurnHealthSummary,
  RoleplayTurnPhaseDiagnostic,
} from './roleplay-turn-health-protocol.ts'
import { ROLEPLAY_WORLD_MODULE_ID } from './roleplay-runtime.ts'

/** Whether a closed turn has enough content-free receipts to recreate settle and present. */
export function roleplayTurnRecordFinalizable(record: RoleplayTurnRecord): boolean {
  return record.plans.length > 0 && record.plans.every(({ reference }) =>
    reference.receipt !== undefined
    && reference.receipt.memoryWriteAvailable !== undefined
    && reference.receipt.runtime.settleModules !== undefined
    && reference.receipt.runtime.presentModuleIds !== undefined)
}

function status(record: RoleplayTurnRecord): RoleplayTurnHealthStatus {
  if (record.boundary.endSeq === undefined) return 'open'
  if (record.settle === undefined) return 'awaiting-settlement'
  return record.present === undefined ? 'awaiting-presentation' : 'complete'
}

function entry(record: RoleplayTurnRecord): RoleplayTurnHealthEntry {
  const currentStatus = status(record)
  const preparedSteps = record.prepare.steps.filter(step => step.modules !== undefined).length
  const recalledSteps = record.recall.steps.filter(step => step.modules !== undefined).length
  const plannedSteps = record.plans.length
  const nextPhase: RoleplayTurnPhaseDiagnostic | undefined = currentStatus === 'open'
    ? plannedSteps === 0 || preparedSteps < plannedSteps ? 'prepare'
      : recalledSteps < plannedSteps ? 'recall' : 'act'
    : currentStatus === 'awaiting-settlement' ? 'settle'
      : currentStatus === 'awaiting-presentation' ? 'present' : undefined
  const actSteps = record.act?.steps ?? []
  const worldOutcomes = record.recall.steps.flatMap(step =>
    step.modules?.filter(module => module.moduleId === ROLEPLAY_WORLD_MODULE_ID) ?? [])
  const worldRecall = worldOutcomes.length === 0 ? undefined : {
    steps: worldOutcomes.length,
    outcomes: {
      applied: worldOutcomes.filter(module => module.outcome === 'applied').length,
      idle: worldOutcomes.filter(module => module.outcome === 'idle').length,
      degraded: worldOutcomes.filter(module => module.outcome === 'degraded').length,
    },
    contributions: worldOutcomes.reduce((total, module) => total + module.contributions, 0),
  }
  const externalSteps = record.recall.steps.filter(step => (step.contextReads?.length ?? 0) > 0)
  const externalRecall = externalSteps.length === 0 ? undefined : {
    steps: externalSteps.length,
    messages: externalSteps.reduce((total, step) => total + (step.contextReads?.length ?? 0), 0),
  }
  return {
    turn: record.turn,
    status: currentStatus,
    ...(nextPhase === undefined ? {} : { nextPhase }),
    finalizableFromLog: roleplayTurnRecordFinalizable(record),
    ...(worldRecall === undefined ? {} : { worldRecall }),
    ...(externalRecall === undefined ? {} : { externalRecall }),
    phases: {
      plannedSteps,
      preparedSteps,
      recalledSteps,
      actedSteps: actSteps.length,
      assistantMessages: actSteps.reduce((total, step) => total + step.assistantMessages.length, 0),
      toolCalls: actSteps.reduce((total, step) => total + step.toolCalls.length, 0),
      toolResults: actSteps.reduce((total, step) => total + step.toolResults.length, 0),
      settled: record.settle !== undefined,
      presented: record.present !== undefined,
    },
  }
}

/** Summarize already validated records without retaining any content-bearing field. */
export function summarizeRoleplayTurnHealth(
  records: readonly RoleplayTurnRecord[],
): RoleplayTurnHealthSummary {
  const entries = records.map(entry)
  return {
    audit: 'agent-rp-turn-health-v0',
    turns: entries.length,
    statuses: {
      open: entries.filter(value => value.status === 'open').length,
      awaitingSettlement: entries.filter(value => value.status === 'awaiting-settlement').length,
      awaitingPresentation: entries.filter(value => value.status === 'awaiting-presentation').length,
      complete: entries.filter(value => value.status === 'complete').length,
    },
    ...(entries.at(-1) === undefined ? {} : { latest: entries.at(-1)! }),
  }
}
