/** Model-visible Roleplay values that must remain behind the reusable prompt prefix. */

import type { RoleplayTurnPlan } from './roleplay-turn-plan.ts'

/** Render the exact state values consumed by one prepared turn. */
export function renderRoleplayTurnStateContext(plan: RoleplayTurnPlan | undefined): string {
  const states = Object.fromEntries(plan?.stateReads.flatMap(read =>
    read.value === undefined ? [] : [[read.id, read.value]]) ?? [])
  if (Object.keys(states).length === 0) return ''
  return [
    '【本轮只读状态】',
    '以下 JSON 是本轮叙事开始前的当前状态。依据它和已生效规则推进正文；不要在回复中复述 JSON、内部字段或状态更新。',
    JSON.stringify(states),
  ].join('\n')
}
