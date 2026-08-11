/** Private durable decision memory for the standard Werewolf application. */

import { isDeepStrictEqual } from 'node:util'
import type {
  JsonValue,
  Session,
  SessionEvent,
} from '@deepseek-ai/dsh-session'
import {
  projectStoryworld,
  replayStoryworld,
  type RoleplayActorId,
  type RoleplayCommit,
} from '../runtime/index.ts'
import {
  STANDARD_WEREWOLF_EVIDENCE_MAX_ITEMS,
  STANDARD_WEREWOLF_RATIONALE_MAX_LENGTH,
  STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH,
} from './werewolf-decision-limits.ts'
import { livingSeats, observerOf } from './werewolf.ts'

/** Confidence vocabulary accepted from one structured Character decision. */
export type StandardWerewolfDecisionConfidence = 'low' | 'medium' | 'high'

/** Public table stances retained for one concrete discussion target. */
export const STANDARD_WEREWOLF_PUBLIC_STANCES = ['trust', 'suspect', 'question', 'observe'] as const

/** One normalized public stance from a Character's accepted discussion output. */
export type StandardWerewolfPublicStance = typeof STANDARD_WEREWOLF_PUBLIC_STANCES[number]

/** Auditable subject and stance paired with an accepted public statement. */
export interface StandardWerewolfPublicJudgment {
  readonly targetId: RoleplayActorId
  readonly stance: StandardWerewolfPublicStance
}

/** One Character-owned decision retained only after its enclosing world commit succeeds. */
export interface StandardWerewolfDecisionMemory {
  /** Character whose future private requests may receive this record. */
  readonly actorId: RoleplayActorId
  /** Scenario-owned legal action, deliberately separate from the public resolver vocabulary. */
  readonly action: {
    readonly name: string
    readonly arguments: JsonValue
  }
  /** Concise decision summary, not hidden reasoning or a raw model transcript. */
  readonly rationale: string
  /** Character-reported confidence in the selected action. */
  readonly confidence: StandardWerewolfDecisionConfidence
  /** Actor, fact, or choice ids drawn from the Character's private view. */
  readonly evidenceIds: readonly string[]
  /** Structured public read retained only when an accepted discussion speech contributes one. */
  readonly publicJudgment?: StandardWerewolfPublicJudgment
}

/**
 * Find the latest public judgment that one exile ballot would contradict.
 * @param history - chronological committed memory for exactly one Character.
 * @param targetId - proposed legal exile target.
 * @param legalTargetIds - targets available to that Character in the current ballot.
 * @returns the prior speech that requires newly cited public evidence, if any.
 */
export function standardWerewolfBallotContinuityReference(
  history: readonly StandardWerewolfDecisionMemory[],
  targetId: RoleplayActorId,
  legalTargetIds: readonly RoleplayActorId[],
): StandardWerewolfDecisionMemory | undefined {
  const latest = history.findLast(decision =>
    decision.action.name === 'speak' && decision.publicJudgment !== undefined)
  const judgment = latest?.publicJudgment
  if (latest === undefined || judgment === undefined) return undefined
  if (judgment.targetId === targetId) {
    return judgment.stance === 'suspect' ? undefined : latest
  }
  return judgment.stance === 'suspect' && legalTargetIds.includes(judgment.targetId)
    ? latest
    : undefined
}

/** One atomic batch of private decisions causally owned by a committed Storyworld revision. */
export interface StandardWerewolfDecisionMemoryBatch {
  readonly version: 0
  /** Exact canonical Roleplay surface event that made these decisions historical facts. */
  readonly commitEventSeq: number
  /** Storyworld revision and phase observed while the decisions were prepared. */
  readonly baseRevision: number
  readonly phase: string
  /** Revision produced by the referenced canonical commit. */
  readonly revision: number
  readonly decisions: readonly StandardWerewolfDecisionMemory[]
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /**
     * Log-only standard Werewolf Character memory. The generic Roleplay reducer,
     * narrator history, player surface, and other Characters ignore this event.
     */
    'werewolf/decision-memory': StandardWerewolfDecisionMemoryBatch
  }
}

function isRoleplayCommitEvent(
  event: SessionEvent | undefined,
): event is SessionEvent<'user/message'> & {
  readonly data: { readonly source: { readonly kind: 'roleplay'; readonly commit: RoleplayCommit } }
} {
  return event?.type === 'user/message' && event.data.source.kind === 'roleplay'
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`standard Werewolf decision memory ${label} must be a non-negative safe integer`)
  }
}

function validatePublicStatementAction(
  decision: StandardWerewolfDecisionMemory,
  index: number,
): void {
  if (decision.action.name !== 'speak' && decision.action.name !== 'sheriff-registration') return
  const args = decision.action.arguments
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error(`standard Werewolf decision memory ${index} public statement arguments are invalid`)
  }
  const statement = args.statement
  if (typeof statement !== 'string') {
    throw new Error(`standard Werewolf decision memory ${index} public statement is invalid`)
  }
  if (statement.length > STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH) {
    throw new Error(`standard Werewolf decision memory ${index} public statement exceeds its length limit`)
  }
  if (statement !== statement.trim()) {
    throw new Error(`standard Werewolf decision memory ${index} public statement is not normalized`)
  }
  if (decision.action.name === 'speak') {
    if (statement.length === 0) {
      throw new Error(`standard Werewolf decision memory ${index} public statement must be non-empty`)
    }
    return
  }
  const stand = args.stand
  if (typeof stand !== 'boolean' || stand !== (statement.length > 0)) {
    throw new Error(
      `standard Werewolf decision memory ${index} campaign statement must be non-empty exactly when standing`,
    )
  }
}

function stringActionArgument(
  decision: StandardWerewolfDecisionMemory,
  name: string,
): string | undefined {
  const args = decision.action.arguments
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return undefined
  const value = args[name]
  return typeof value === 'string' ? value : undefined
}

function validateDecision(
  decision: StandardWerewolfDecisionMemory,
  actorIds: ReadonlySet<string>,
  livingActorIds: ReadonlySet<string>,
  index: number,
): void {
  if (!actorIds.has(decision.actorId)) {
    throw new Error(`standard Werewolf decision memory ${index} names unknown actor ${JSON.stringify(decision.actorId)}`)
  }
  if (!/^[a-z][a-z0-9-]*$/.test(decision.action.name)) {
    throw new Error(`standard Werewolf decision memory ${index} action must use lower-kebab-case`)
  }
  if (decision.rationale.trim().length === 0) {
    throw new Error(`standard Werewolf decision memory ${index} rationale must be non-empty`)
  }
  if (decision.rationale.length > STANDARD_WEREWOLF_RATIONALE_MAX_LENGTH) {
    throw new Error(`standard Werewolf decision memory ${index} rationale exceeds its length limit`)
  }
  const confidence: unknown = decision.confidence
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new Error(`standard Werewolf decision memory ${index} confidence is invalid`)
  }
  if (!Array.isArray(decision.evidenceIds)
    || !decision.evidenceIds.every(id => typeof id === 'string')) {
    throw new Error(`standard Werewolf decision memory ${index} evidence ids are invalid`)
  }
  if (decision.evidenceIds.length > STANDARD_WEREWOLF_EVIDENCE_MAX_ITEMS) {
    throw new Error(`standard Werewolf decision memory ${index} has too many evidence ids`)
  }
  if (new Set(decision.evidenceIds).size !== decision.evidenceIds.length) {
    throw new Error(`standard Werewolf decision memory ${index} repeats an evidence id`)
  }
  if (decision.action.name === 'speak' && decision.publicJudgment !== undefined) {
    const judgment = decision.publicJudgment
    if (!livingActorIds.has(judgment.targetId) || judgment.targetId === decision.actorId) {
      throw new Error(`standard Werewolf decision memory ${index} public judgment target is invalid`)
    }
    if (!STANDARD_WEREWOLF_PUBLIC_STANCES.includes(judgment.stance)) {
      throw new Error(`standard Werewolf decision memory ${index} public judgment stance is invalid`)
    }
  } else if (decision.action.name !== 'speak' && decision.publicJudgment !== undefined) {
    throw new Error(`standard Werewolf decision memory ${index} non-speech action carries a public judgment`)
  }
  if (decision.action.name === 'exile-vote' && !livingActorIds.has(decision.actorId)) {
    throw new Error(`standard Werewolf decision memory ${index} exile voter is not living`)
  }
  validatePublicStatementAction(decision, index)
}

function publicEvidenceIds(world: ReturnType<typeof replayStoryworld>): Set<string> {
  if (world === undefined) return new Set()
  const views = livingSeats(world).map(actorId => projectStoryworld(world, observerOf(actorId)))
  const first = views[0]
  if (first === undefined) return new Set()
  const candidates = [
    ...first.actors.map(actor => String(actor.id)),
    ...first.facts.map(fact => String(fact.id)),
    ...first.choices.map(choice => String(choice.id)),
  ]
  return new Set(candidates.filter(id => views.every(view =>
    view.actors.some(actor => String(actor.id) === id)
    || view.facts.some(fact => String(fact.id) === id)
    || view.choices.some(choice => String(choice.id) === id))))
}

/**
 * Validate every package-owned memory record against its exact prior Roleplay commit.
 * @param events - complete candidate Session history in sequence order.
 */
export function validateStandardWerewolfDecisionMemoryHistory(
  events: readonly SessionEvent[],
): void {
  const claimedCommits = new Set<number>()
  const priorPublicJudgments = new Map<string, StandardWerewolfDecisionMemory>()
  const actorDecisionHistory = new Map<string, StandardWerewolfDecisionMemory[]>()
  for (const event of events) {
    if (event.type !== 'werewolf/decision-memory') continue
    const record = event.data
    const version: unknown = record.version
    if (version !== 0) throw new Error('standard Werewolf decision memory version must be 0')
    assertNonNegativeSafeInteger(record.commitEventSeq, 'commitEventSeq')
    assertNonNegativeSafeInteger(record.baseRevision, 'baseRevision')
    assertNonNegativeSafeInteger(record.revision, 'revision')
    if (record.commitEventSeq >= event.seq) {
      throw new Error('standard Werewolf decision memory must reference an earlier commit event')
    }
    if (claimedCommits.has(record.commitEventSeq)) {
      throw new Error(`standard Werewolf commit event ${record.commitEventSeq} has duplicate decision memory`)
    }
    claimedCommits.add(record.commitEventSeq)
    const commitEvent = events[record.commitEventSeq]
    if (!isRoleplayCommitEvent(commitEvent) || commitEvent.seq !== record.commitEventSeq) {
      throw new Error('standard Werewolf decision memory does not reference a Roleplay commit')
    }
    const commit = commitEvent.data.source.commit
    if (commit.baseRevision !== record.baseRevision || commit.revision !== record.revision) {
      throw new Error('standard Werewolf decision memory revision does not match its Roleplay commit')
    }
    const before = replayStoryworld(events.slice(0, record.commitEventSeq))
    if (before === undefined
      || before.revision !== record.baseRevision
      || before.scene.location !== record.phase) {
      throw new Error('standard Werewolf decision memory phase does not match its pre-commit Storyworld')
    }
    if (record.decisions.length === 0) {
      throw new Error('standard Werewolf decision memory requires at least one Character decision')
    }
    const actorIds = new Set(before.actors.map(actor => String(actor.id)))
    const livingActorIds = new Set(livingSeats(before).map(String))
    const after = replayStoryworld(events.slice(0, record.commitEventSeq + 1))
    const publicIds = publicEvidenceIds(after)
    const rememberedActors = new Set<string>()
    for (const [index, decision] of record.decisions.entries()) {
      validateDecision(decision, actorIds, livingActorIds, index)
      if (rememberedActors.has(decision.actorId)) {
        throw new Error(`standard Werewolf decision memory repeats actor ${JSON.stringify(decision.actorId)}`)
      }
      rememberedActors.add(decision.actorId)
      const actorHistory = actorDecisionHistory.get(decision.actorId) ?? []
      if (decision.action.name === 'exile-vote') {
        const target = stringActionArgument(decision, 'target_id')
        const legalTargets = record.phase.startsWith('exile-pk-')
          ? before.scene.participantIds.filter(actorId => actorId !== decision.actorId)
          : livingSeats(before).filter(actorId => actorId !== decision.actorId)
        if (target === undefined || !legalTargets.includes(target as RoleplayActorId)) {
          throw new Error(`standard Werewolf decision memory ${index} exile target is invalid`)
        }
        const continuity = standardWerewolfBallotContinuityReference(
          actorHistory,
          target as RoleplayActorId,
          legalTargets,
        )
        if (continuity !== undefined
          && !decision.evidenceIds.some(id => publicIds.has(id) && !continuity.evidenceIds.includes(id))) {
          throw new Error(
            `standard Werewolf decision memory ${index} contradicts its public stance without newly cited public evidence`,
          )
        }
      }
      const judgment = decision.publicJudgment
      if (judgment !== undefined) {
        const key = `${String(decision.actorId)}\0${String(judgment.targetId)}`
        const prior = priorPublicJudgments.get(key)
        if (prior?.publicJudgment?.stance !== undefined
          && prior.publicJudgment.stance !== judgment.stance
          && !decision.evidenceIds.some(id => publicIds.has(id) && !prior.evidenceIds.includes(id))) {
          throw new Error(
            `standard Werewolf decision memory ${index} changes public stance without newly cited public evidence`,
          )
        }
        priorPublicJudgments.set(key, decision)
      }
      actorHistory.push(decision)
      actorDecisionHistory.set(decision.actorId, actorHistory)
    }
  }
}

/**
 * Return detached committed history for exactly one Character.
 * @param events - authoritative parent Session history.
 * @param actorId - sole Character allowed to receive the returned records.
 * @returns chronological copies annotated with their committed phase and revision.
 */
export function standardWerewolfDecisionHistory(
  events: readonly SessionEvent[],
  actorId: RoleplayActorId,
): readonly (StandardWerewolfDecisionMemory & {
  readonly phase: string
  readonly baseRevision: number
  readonly revision: number
})[] {
  validateStandardWerewolfDecisionMemoryHistory(events)
  return events.flatMap((event) => {
    if (event.type !== 'werewolf/decision-memory') return []
    return event.data.decisions
      .filter(decision => decision.actorId === actorId)
      .map(decision => structuredClone({
        ...decision,
        phase: event.data.phase,
        baseRevision: event.data.baseRevision,
        revision: event.data.revision,
      }))
  })
}

/**
 * Append one private memory batch after its exact canonical commit is present.
 * @param session - parent Roleplay Session that owns the commit and memory.
 * @param commit - accepted commit returned by the Roleplay service.
 * @param phase - exact pre-commit standard Werewolf scene label.
 * @param decisions - validated Character decisions staged before commit.
 * @returns the appended event, or `undefined` when no Character completed a decision.
 */
export function appendStandardWerewolfDecisionMemory(
  session: Session,
  commit: RoleplayCommit,
  phase: string,
  decisions: readonly StandardWerewolfDecisionMemory[],
): SessionEvent<'werewolf/decision-memory'> | undefined {
  if (decisions.length === 0) return undefined
  const commitEvent = session.events.findLast(event =>
    isRoleplayCommitEvent(event) && isDeepStrictEqual(event.data.source.commit, commit))
  if (!isRoleplayCommitEvent(commitEvent)) {
    throw new Error('standard Werewolf decision memory cannot find its accepted Roleplay commit')
  }
  const data: StandardWerewolfDecisionMemoryBatch = {
    version: 0,
    commitEventSeq: commitEvent.seq,
    baseRevision: commit.baseRevision,
    phase,
    revision: commit.revision,
    decisions: structuredClone(decisions),
  }
  validateStandardWerewolfDecisionMemoryHistory([...session.events, {
    type: 'werewolf/decision-memory',
    seq: session.seq,
    time: Date.now(),
    data,
  }])
  return session.append('werewolf/decision-memory', data)
}
