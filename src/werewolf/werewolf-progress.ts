/** Observer-safe live progress for direct standard Werewolf phase coordination. */

import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import {
  asRoleplaySurfaceActorId,
  asRoleplaySurfaceRecordId,
  type RoleplayActorId,
  type RoleplaySurfaceProgress,
  type RoleplayView,
} from '../runtime/index.ts'
import { STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH } from './werewolf-decision-limits.ts'
import { observerOf, SEATS, standardWerewolfRoleIn } from './werewolf.ts'

/** One already validated public statement exposed while the rest of the speaking order continues. */
export interface StandardWerewolfProgressStatement {
  readonly actorId: RoleplayActorId
  readonly text: string
}

/** Complete current work state; discussion exposes only validated public speech, never private decisions. */
export type StandardWerewolfProgressState =
  | {
    readonly kind: 'night'
    readonly stage: 'independent' | 'dependent' | 'settling'
  }
  | {
    readonly kind: 'sheriff-registration' | 'sheriff-vote' | 'sheriff-badge' | 'hunter-shot' | 'exile-vote'
    readonly completed: number
    readonly total: number
  }
  | {
    readonly kind: 'discussion'
    readonly round: number
    readonly completed: number
    readonly total: number
    readonly currentActorId?: RoleplayActorId
    readonly statements: readonly StandardWerewolfProgressStatement[]
  }

/** Durable whole-value progress record tied to the exact player command that started the work. */
export interface StandardWerewolfProgressRecord {
  readonly version: 0
  readonly sourceEventSeq: number
  readonly baseRevision: number
  readonly state: StandardWerewolfProgressState | null
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Log-only observer-safe progress for one direct standard Werewolf command. */
    'werewolf/progress': StandardWerewolfProgressRecord
  }
}

/** Sink supplied only to direct browser coordination. */
export interface StandardWerewolfProgressReporter {
  /** Replace the complete current observer-safe progress value. */
  update(state: StandardWerewolfProgressState): void
  /** Clear a previously published value after success or failure. */
  clear(): void
}

function assertSafeInteger(value: number, label: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`standard Werewolf progress ${label} must be a safe integer no smaller than ${minimum}`)
  }
}

function validateDiscussionState(state: Extract<StandardWerewolfProgressState, { readonly kind: 'discussion' }>): void {
  assertSafeInteger(state.round, 'discussion round', 1)
  if (state.currentActorId !== undefined && !/^seat-(?:[1-9]|1[0-2])$/u.test(state.currentActorId)) {
    throw new Error('standard Werewolf discussion progress current actor is invalid')
  }
  if (state.completed < state.total && state.currentActorId === undefined) {
    throw new Error('standard Werewolf discussion progress requires the current speaker before completion')
  }
  if (state.completed === state.total && state.currentActorId !== undefined) {
    throw new Error('standard Werewolf completed discussion progress cannot retain a current speaker')
  }
  if (state.statements.length < state.completed || state.statements.length > state.completed + 1) {
    throw new Error('standard Werewolf discussion progress statement count does not match completion')
  }
  const actors = new Set<string>()
  for (const statement of state.statements) {
    if (!/^seat-(?:[1-9]|1[0-2])$/u.test(statement.actorId)) {
      throw new Error('standard Werewolf discussion progress statement actor is invalid')
    }
    if (actors.has(statement.actorId)) {
      throw new Error('standard Werewolf discussion progress statement actors must be unique')
    }
    actors.add(statement.actorId)
    if (statement.text.trim().length === 0
      || statement.text.length > STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH) {
      throw new Error('standard Werewolf discussion progress statement text is invalid')
    }
  }
  if (state.currentActorId !== undefined && actors.has(state.currentActorId)) {
    throw new Error('standard Werewolf discussion progress current speaker already has a statement')
  }
}

function validateState(state: StandardWerewolfProgressState): void {
  const kind: unknown = state.kind
  if (kind === 'night') {
    const stage: unknown = (state as { readonly stage?: unknown }).stage
    if (stage !== 'independent' && stage !== 'dependent' && stage !== 'settling') {
      throw new Error('standard Werewolf night progress stage is invalid')
    }
    return
  }
  if (kind !== 'sheriff-registration'
    && kind !== 'sheriff-vote'
    && kind !== 'sheriff-badge'
    && kind !== 'hunter-shot'
    && kind !== 'discussion'
    && kind !== 'exile-vote') {
    throw new Error('standard Werewolf progress kind is invalid')
  }
  const counted = state as { readonly completed: number; readonly total: number }
  assertSafeInteger(counted.completed, 'completed', 0)
  assertSafeInteger(counted.total, 'total', 1)
  if (counted.completed > counted.total) {
    throw new Error('standard Werewolf progress completed cannot exceed total')
  }
  if (state.kind === 'discussion') validateDiscussionState(state)
}

function validateInitialState(state: StandardWerewolfProgressState): void {
  if (state.kind === 'night') {
    if (state.stage !== 'independent') {
      throw new Error('standard Werewolf night progress must start at the independent stage')
    }
    return
  }
  if (state.completed !== 0) {
    throw new Error('standard Werewolf counted progress must start with zero completed attempts')
  }
}

function validateStateTransition(
  previous: StandardWerewolfProgressState,
  current: StandardWerewolfProgressState,
): void {
  if (previous.kind !== current.kind) {
    throw new Error('standard Werewolf progress kind cannot change within one command')
  }
  if (previous.kind === 'night') {
    if (current.kind !== 'night') {
      throw new Error('standard Werewolf progress kind cannot change within one command')
    }
    const stages = ['independent', 'dependent', 'settling'] as const
    if (stages.indexOf(current.stage) !== stages.indexOf(previous.stage) + 1) {
      throw new Error('standard Werewolf night progress must advance exactly one stage')
    }
    return
  }
  if (current.kind === 'night') {
    throw new Error('standard Werewolf progress kind cannot change within one command')
  }
  if (current.total !== previous.total) {
    throw new Error('standard Werewolf counted progress total cannot change within one command')
  }
  if (current.completed !== previous.completed + 1) {
    throw new Error('standard Werewolf counted progress must advance one completed attempt at a time')
  }
  if (previous.kind === 'discussion' && current.kind === 'discussion') {
    if (current.round !== previous.round) {
      throw new Error('standard Werewolf discussion progress round cannot change within one command')
    }
    if (current.statements.length !== previous.statements.length + 1) {
      throw new Error('standard Werewolf discussion progress must append one public statement per completed speaker')
    }
    for (const [index, statement] of previous.statements.entries()) {
      const next = current.statements[index]
      if (next?.actorId !== statement.actorId || next.text !== statement.text) {
        throw new Error('standard Werewolf discussion progress cannot rewrite an earlier public statement')
      }
    }
  }
}

/**
 * Validate package-owned progress histories and their exact command provenance.
 * @param events - complete candidate Session history in sequence order.
 */
export function validateStandardWerewolfProgressHistory(events: readonly SessionEvent[]): void {
  const operations = new Map<number, {
    readonly baseRevision: number
    cleared: boolean
    state: StandardWerewolfProgressState
  }>()
  for (const event of events) {
    if (event.type !== 'werewolf/progress') continue
    const record = event.data
    const version: unknown = record.version
    if (version !== 0) throw new Error('standard Werewolf progress version must be 0')
    assertSafeInteger(record.sourceEventSeq, 'sourceEventSeq', 0)
    assertSafeInteger(record.baseRevision, 'baseRevision', 0)
    if (record.sourceEventSeq >= event.seq) {
      throw new Error('standard Werewolf progress must reference an earlier command event')
    }
    const source = events[record.sourceEventSeq]
    if (source?.type !== 'command/run'
      || source.seq !== record.sourceEventSeq
      || source.data.name !== 'roleplay-action') {
      throw new Error('standard Werewolf progress does not reference a roleplay-action command')
    }
    if (source.data.args === undefined) {
      throw new Error('standard Werewolf progress command has no arguments')
    }
    const commandRevision = Number(source.data.args.trim().split(/\s+/u)[0])
    if (commandRevision !== record.baseRevision) {
      throw new Error('standard Werewolf progress base revision does not match its command')
    }
    const prior = operations.get(record.sourceEventSeq)
    if (prior?.cleared === true) {
      throw new Error('standard Werewolf progress cannot reopen after it is cleared')
    }
    if (prior !== undefined && prior.baseRevision !== record.baseRevision) {
      throw new Error('standard Werewolf progress changed base revision within one command')
    }
    if (record.state === null) {
      if (prior === undefined) throw new Error('standard Werewolf progress cannot clear before it starts')
      prior.cleared = true
      continue
    }
    validateState(record.state)
    if (prior === undefined) {
      validateInitialState(record.state)
      operations.set(record.sourceEventSeq, {
        baseRevision: record.baseRevision,
        cleared: false,
        state: record.state,
      })
    } else {
      validateStateTransition(prior.state, record.state)
      prior.state = record.state
    }
  }
}

/**
 * Create one source-bound progress reporter whose records remain safe for player projection.
 * @param session - parent Roleplay Session receiving the log-only snapshots.
 * @param sourceEventSeq - exact `command/run` that caused the work.
 * @param baseRevision - surface revision carried by that command.
 * @returns a single-use reporter; clearing before the first update is a no-op.
 */
export function createStandardWerewolfProgressReporter(
  session: Session,
  sourceEventSeq: number,
  baseRevision: number,
): StandardWerewolfProgressReporter {
  let active = false
  let cleared = false
  const append = (state: StandardWerewolfProgressState | null): void => {
    const data: StandardWerewolfProgressRecord = { version: 0, sourceEventSeq, baseRevision, state }
    validateStandardWerewolfProgressHistory([...session.events, {
      type: 'werewolf/progress',
      seq: session.seq,
      time: Date.now(),
      data,
    }])
    session.append('werewolf/progress', data)
  }
  return {
    update(state) {
      if (cleared) throw new Error('standard Werewolf progress reporter is already cleared')
      append(state)
      active = true
    },
    clear() {
      if (!active) return
      append(null)
      active = false
      cleared = true
    },
  }
}

/**
 * Fold scenario progress into player-safe Chinese copy.
 * @param current - prior player progress.
 * @param _view - observer-projected world paired with the event cut.
 * @param event - next committed Session event.
 * @returns the replacement progress, the prior reference, or `null` to clear it.
 */
export function presentStandardWerewolfProgress(
  current: RoleplaySurfaceProgress | null,
  view: RoleplayView,
  event: SessionEvent,
): RoleplaySurfaceProgress | null {
  if (event.type === 'session/end-seed') return null
  if (event.type === 'command/run' || event.type === 'command/done') return null
  if (event.type === 'user/message' && event.data.source.kind === 'roleplay') return null
  if (event.type !== 'werewolf/progress') return current
  const state = event.data.state
  if (state === null) return null
  if (state.kind === 'night') {
    const observerActor = SEATS.find(actorId => observerOf(actorId) === view.observerId)
    const wolfObserver = observerActor !== undefined
      && standardWerewolfRoleIn(view, observerActor) === 'wolf'
    const stage = state.stage === 'independent'
      ? { completed: 1, detail: '首轮行动 1/3' }
      : state.stage === 'dependent'
        ? { completed: 2, detail: '后续行动 2/3' }
        : { completed: 3, detail: '夜间结算 3/3' }
    if (wolfObserver && state.stage === 'independent') {
      return {
        title: '狼队正在商议',
        ...stage,
        total: 3,
      }
    }
    return {
      title: state.stage === 'settling' ? '正在结算本夜' : '夜间行动进行中',
      ...stage,
      total: 3,
    }
  }
  const settled = state.completed === state.total
  if (state.kind === 'sheriff-registration') {
    return {
      title: settled ? '即将公布报名结果' : '其他玩家正在决定是否参选',
      detail: settled
        ? '正在公布候选人与竞选发言'
        : `已完成 ${state.completed}/${state.total}`,
      completed: state.completed,
      total: state.total,
    }
  }
  const copy = state.kind === 'sheriff-vote'
    ? settled
      ? { title: '正在公布警长投票结果', detail: '投票已经结束' }
      : {
        title: '其他玩家正在投票',
        detail: `已投票 ${state.completed}/${state.total}`,
      }
    : state.kind === 'sheriff-badge'
      ? settled
        ? { title: '正在公布警徽去向', detail: '警长已经做出决定' }
        : {
          title: '等待警徽去向',
          detail: `已完成 ${state.completed}/${state.total}`,
        }
      : state.kind === 'hunter-shot'
        ? settled
          ? { title: '正在公布猎人行动', detail: '猎人已经做出决定' }
          : {
            title: '等待猎人行动',
            detail: `已完成 ${state.completed}/${state.total}`,
          }
        : state.kind === 'discussion'
          ? settled
            ? { title: '本轮发言结束', detail: '正在进入投票' }
            : {
              title: `${state.currentActorId === undefined ? '下一位玩家' : `${String(state.currentActorId).slice(5)} 号玩家`}正在发言`,
              detail: `已发言 ${state.completed}/${state.total}`,
            }
          : settled
            ? { title: '正在公布放逐投票结果', detail: '投票已经结束' }
            : {
              title: '其他玩家正在投票',
              detail: `已投票 ${state.completed}/${state.total}`,
            }
  return {
    ...copy,
    completed: state.completed,
    total: state.total,
    ...state.kind === 'discussion'
      ? {
        records: state.statements.map(statement => ({
          id: asRoleplaySurfaceRecordId(`day:${String(state.round)}:speech:${statement.actorId}`),
          kind: 'statement' as const,
          phase: `第 ${String(state.round)} 天 · 公开发言`,
          actorId: asRoleplaySurfaceActorId(statement.actorId),
          text: statement.text,
        })),
      }
      : {},
  }
}
