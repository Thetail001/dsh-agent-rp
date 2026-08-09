/** Completed-session decision review for the standard Werewolf player surface. */

import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import {
  asRoleplaySurfaceReviewEntryId,
  type RoleplayActorId,
  type RoleplaySurfaceReviewEntry,
  type RoleplaySurfaceReviewState,
  type RoleplayView,
} from '../runtime/index.ts'
import type { StandardWerewolfDecisionMemory } from './werewolf-memory.ts'
import {
  STANDARD_WEREWOLF_EVIDENCE_MAX_ITEMS,
  STANDARD_WEREWOLF_RATIONALE_MAX_LENGTH,
} from './werewolf-decision-limits.ts'
import { standardWerewolfRoleIn, standardWerewolfRoleLabel } from './werewolf.ts'

const REVIEW_TITLE = '角色决策复盘'
const REVIEW_DETAIL = '这里只列出已经随剧情提交的结构化选择摘要，不是模型思维链；未完成、超时、无效或被拒绝的尝试不会出现。'

function boundedReviewText(value: string): string {
  return value.length <= STANDARD_WEREWOLF_RATIONALE_MAX_LENGTH
    ? value
    : `${value.slice(0, STANDARD_WEREWOLF_RATIONALE_MAX_LENGTH - 1)}…`
}

function seatLabel(actorId: RoleplayActorId | string): string {
  const number = /^seat-(\d+)$/u.exec(actorId)?.[1]
  return number === undefined ? String(actorId) : `${number} 号玩家`
}

function decisionRole(decision: StandardWerewolfDecisionMemory): string | undefined {
  switch (decision.action.name) {
    case 'wolf-kill':
    case 'wolf-explode': return '狼人'
    case 'seer-inspect': return '预言家'
    case 'witch-act': return '女巫'
    case 'hunter-shoot': return '猎人'
    default: return undefined
  }
}

function actorLabel(view: RoleplayView, decision: StandardWerewolfDecisionMemory): string {
  const actorId = decision.actorId
  const inferred = decisionRole(decision)
  const roleVisible = view.facts.some(fact => String(fact.id) === `${String(actorId)}-role`)
  const role = inferred ?? (roleVisible
    ? standardWerewolfRoleLabel(standardWerewolfRoleIn(view, actorId))
    : undefined)
  return role === undefined ? seatLabel(actorId) : `${seatLabel(actorId)}（${role}）`
}

function phaseLabel(phase: string): string {
  const night = /^night-(\d+)$/u.exec(phase)?.[1]
  if (night !== undefined) return `第 ${night} 夜`
  const sheriff = /^sheriff-(election|pk)-(\d+)$/u.exec(phase)
  if (sheriff?.[2] !== undefined) {
    return sheriff[1] === 'election'
      ? `第 ${sheriff[2]} 天 · 警长竞选`
      : `第 ${sheriff[2]} 天 · 警长平票重投`
  }
  const discussion = /^discussion-(\d+)$/u.exec(phase)?.[1]
  if (discussion !== undefined) return `第 ${discussion} 天 · 公开发言`
  const exile = /^exile-(vote|pk)-(\d+)$/u.exec(phase)
  if (exile?.[2] !== undefined) {
    return exile[1] === 'vote'
      ? `第 ${exile[2]} 天 · 放逐投票`
      : `第 ${exile[2]} 天 · 放逐平票重投`
  }
  const hunter = /^hunter-shot-(night|exile)-(\d+)$/u.exec(phase)
  if (hunter?.[2] !== undefined) {
    return hunter[1] === 'night'
      ? `第 ${hunter[2]} 天 · 夜间猎人结算`
      : `第 ${hunter[2]} 天 · 放逐后猎人结算`
  }
  return '本局其他阶段'
}

function argumentObject(value: JsonValue): Readonly<Record<string, JsonValue>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : {}
}

function stringArgument(argumentsValue: JsonValue, name: string): string | undefined {
  const value = argumentObject(argumentsValue)[name]
  return typeof value === 'string' ? value : undefined
}

function booleanArgument(argumentsValue: JsonValue, name: string): boolean | undefined {
  const value = argumentObject(argumentsValue)[name]
  return typeof value === 'boolean' ? value : undefined
}

function targetDecision(prefix: string, decision: StandardWerewolfDecisionMemory): string {
  const target = stringArgument(decision.action.arguments, 'target_id')
  return target === undefined ? `${prefix}（未记录目标）` : `${prefix}${seatLabel(target)}`
}

function decisionLabel(decision: StandardWerewolfDecisionMemory): string {
  switch (decision.action.name) {
    case 'sheriff-registration': {
      if (booleanArgument(decision.action.arguments, 'stand') !== true) return '不参加警长竞选'
      const statement = stringArgument(decision.action.arguments, 'statement')
      return statement === undefined ? '参加警长竞选' : `报名竞选警长：“${statement}”`
    }
    case 'sheriff-vote': return targetDecision('将警长票投给', decision)
    case 'hunter-shoot': return targetDecision('开枪带走', decision)
    case 'sheriff-badge': {
      const target = stringArgument(decision.action.arguments, 'target_id')
      return target === undefined ? '销毁警徽' : `将警徽移交给${seatLabel(target)}`
    }
    case 'wolf-explode': return '翻牌自爆'
    case 'speak': {
      const statement = stringArgument(decision.action.arguments, 'statement')
      const judgment = decision.publicJudgment
      const stance = judgment?.stance === 'trust'
        ? '信任'
        : judgment?.stance === 'suspect'
          ? '怀疑'
          : judgment?.stance === 'question'
            ? '追问'
            : judgment?.stance === 'observe' ? '继续观察' : undefined
      const prefix = judgment === undefined || stance === undefined
        ? '发表公开发言'
        : `对${seatLabel(judgment.targetId)}持“${stance}”立场`
      return statement === undefined ? prefix : `${prefix}：“${statement}”`
    }
    case 'exile-vote': return targetDecision('投票放逐', decision)
    case 'wolf-kill': return targetDecision('选择袭击', decision)
    case 'seer-inspect': return targetDecision('查验', decision)
    case 'witch-act': {
      const action = stringArgument(decision.action.arguments, 'action')
      if (action === 'save') return '使用解药救人'
      if (action === 'poison') {
        const target = stringArgument(decision.action.arguments, 'poison_target_id')
        return target === undefined ? '使用毒药' : `使用毒药带走${seatLabel(target)}`
      }
      return '本夜不使用药剂'
    }
    default: return '完成一项合法行动'
  }
}

function evidenceLabel(id: string): string {
  const actor = /^(seat-\d+)$/u.exec(id)?.[1]
  if (actor !== undefined) return seatLabel(actor)
  const fact = /^(seat-\d+)-(role|alignment)$/u.exec(id)
  if (fact?.[1] !== undefined) {
    return `${seatLabel(fact[1])}${fact[2] === 'role' ? '的身份' : '的阵营'}`
  }
  if (id === 'standard-good-victory') return '好人阵营获胜事实'
  if (id === 'standard-wolf-victory') return '狼人阵营获胜事实'
  const target = new RegExp(
    '^(?:night:\\d+:(?:wolf-kill|seer:inspect|witch:(?:save|poison))'
    + '|day:\\d+:(?:hunter-shot|idiot-reveal|wolf-explosion)):(seat-\\d+)$',
    'u',
  ).exec(id)?.[1]
  if (target !== undefined) return `涉及${seatLabel(target)}的已提交记录`
  const speaker = /^day:\d+:speech:(seat-\d+)$/u.exec(id)?.[1]
  if (speaker !== undefined) return `${seatLabel(speaker)}的公开发言`
  const voter = /^(?:sheriff-(?:election|pk):\d+|day:\d+:(?:exile-vote|pk-vote)):(seat-\d+):(seat-\d+|abstain)$/u.exec(id)
  if (voter?.[1] !== undefined) return `${seatLabel(voter[1])}的已公开选票`
  const sheriff = /^sheriff:(?:candidate|holder):(seat-\d+)$/u.exec(id)?.[1]
  if (sheriff !== undefined) return `${seatLabel(sheriff)}的警长记录`
  if (id.startsWith('day:') && id.endsWith(':announcement')) return '当天公开的死亡信息'
  if (id.includes(':witch:pass')) return '女巫未使用药剂的私密记录'
  if (id === 'sheriff:none' || id === 'sheriff:destroyed') return '本局公开的警徽状态'
  return `已提交记录 ${id}`
}

function reviewEntry(
  view: RoleplayView,
  revision: number,
  phase: string,
  decision: StandardWerewolfDecisionMemory,
): RoleplaySurfaceReviewEntry {
  const confidence = decision.confidence === 'high' ? '高' : decision.confidence === 'medium' ? '中' : '低'
  const evidence = decision.evidenceIds
    .slice(0, STANDARD_WEREWOLF_EVIDENCE_MAX_ITEMS - 1)
    .map(evidenceLabel)
  if (decision.evidenceIds.length >= STANDARD_WEREWOLF_EVIDENCE_MAX_ITEMS) {
    evidence.push(`另有 ${String(decision.evidenceIds.length - evidence.length)} 项已提交依据`)
  }
  return {
    id: asRoleplaySurfaceReviewEntryId(`revision-${String(revision)}-${String(decision.actorId)}`),
    actor: actorLabel(view, decision),
    phase: phaseLabel(phase),
    decision: boundedReviewText(decisionLabel(decision)),
    rationale: boundedReviewText(decision.rationale.trim()),
    confidence,
    evidence,
  }
}

/**
 * Accumulate committed Character decisions and release them only with the final decision-memory batch.
 * @param current - review entries retained privately by the Host projection.
 * @param view - observer-safe world paired with the event cut.
 * @param event - next committed Session event.
 * @returns collecting or ready review state without raw model transcripts.
 */
export function presentStandardWerewolfReview(
  current: RoleplaySurfaceReviewState | null,
  view: RoleplayView,
  event: SessionEvent,
): RoleplaySurfaceReviewState | null {
  if (event.type !== 'werewolf/decision-memory') return current
  const prior = current?.value.entries ?? []
  const entries = [
    ...prior,
    ...event.data.decisions.map(decision => reviewEntry(view, event.data.revision, event.data.phase, decision)),
  ]
  return {
    ready: current?.ready === true || view.scene.location.startsWith('game-over-'),
    value: { title: REVIEW_TITLE, detail: REVIEW_DETAIL, entries },
  }
}
