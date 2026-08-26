/** Model-visible Roleplay values that must remain behind the reusable prompt prefix. */

import type {
  RoleplayPromptTransformPlan,
  RoleplayStateRead,
  RoleplayTurnPlan,
} from './roleplay-turn-plan.ts'
import { stringifySillyTavernPromptJson } from './sillytavern-identity-macro.ts'

/** Render state values after stable history without persisting a changing runtime-context snapshot. */
export function renderRoleplayStateContext(
  stateReads: readonly RoleplayStateRead[],
  transforms: Pick<RoleplayPromptTransformPlan, 'actorName' | 'participantName'>,
): string {
  const states = Object.fromEntries(stateReads.flatMap(read =>
    read.value === undefined ? [] : [[read.id, read.value]]))
  if (Object.keys(states).length === 0) return ''
  const identity = {
    characterName: transforms.actorName,
    participantName: transforms.participantName,
  }
  return [
    '【本轮只读状态】',
    '以下 JSON 是本轮叙事开始前的当前状态。依据它和已生效规则推进正文；不要在回复中复述 JSON、内部字段或状态更新。',
    stringifySillyTavernPromptJson(states, {
      characterName: identity.characterName,
      ...(identity.participantName === undefined ? {} : { userName: identity.participantName }),
    }),
  ].join('\n')
}

/** Render the exact state values consumed by one prepared turn. */
export function renderRoleplayTurnStateContext(plan: RoleplayTurnPlan | undefined): string {
  return plan === undefined ? '' : renderRoleplayStateContext(plan.stateReads, plan.prompt.transforms)
}
