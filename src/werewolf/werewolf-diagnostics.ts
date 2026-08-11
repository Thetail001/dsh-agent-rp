/** Durable developer diagnostics for discarded standard Werewolf decisions. */

import type { Session } from '@deepseek-ai/dsh-session'
import type { RoleplayActorId } from '../runtime/index.ts'

/** Reason one Character attempt could not contribute a decision. */
export type StandardWerewolfDecisionFailureKind = 'invalid' | 'timeout'

/** Safe validator category retained without the rejected model text. */
export type StandardWerewolfDecisionValidationIssue =
  | 'ballot-reference'
  | 'commit-grounding'
  | 'evidence'
  | 'hunter-target-corroboration'
  | 'hold-grounding'
  | 'identity-reveal'
  | 'no-death-corroboration'
  | 'private-corroboration'
  | 'private-role-disclosure'
  | 'public-claim-contradiction'
  | 'public-attribution'
  | 'public-grounding'
  | 'rationale'
  | 'response-grounding'
  | 'seer-prior-basis'
  | 'self-ballot'
  | 'shape'
  | 'ballot-continuity'
  | 'stance-change'
  | 'stance-text'
  | 'statement-form'
  | 'statement-length'
  | 'target-reference'
  | 'wolf-disclosure'

/** Observer-safe classification of one discarded Character attempt. */
export interface StandardWerewolfDecisionFailure {
  readonly actorId: RoleplayActorId
  readonly kind: StandardWerewolfDecisionFailureKind
  readonly issue?: StandardWerewolfDecisionValidationIssue
  readonly message: string
}

/** Log-only failure record tied to the player command that requested the attempt. */
export interface StandardWerewolfDecisionFailureRecord {
  readonly version: 0
  readonly sourceEventSeq: number
  readonly baseRevision: number
  readonly phase: string
  readonly actorId: RoleplayActorId
  readonly kind: StandardWerewolfDecisionFailureKind
  readonly issue?: StandardWerewolfDecisionValidationIssue
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Safe failure taxonomy for developer inspection; rejected model text is deliberately omitted. */
    'werewolf/decision-failure': StandardWerewolfDecisionFailureRecord
  }
}

/**
 * Persist one discarded attempt without its model output or private reasoning.
 * @param session - parent Roleplay Session receiving the diagnostic.
 * @param sourceEventSeq - exact `command/run` that requested the attempt.
 * @param baseRevision - Storyworld revision carried by that command.
 * @param phase - canonical scene observed by the Character.
 * @param failure - safe failure classification.
 */
export function appendStandardWerewolfDecisionFailure(
  session: Session,
  sourceEventSeq: number,
  baseRevision: number,
  phase: string,
  failure: StandardWerewolfDecisionFailure,
): void {
  session.append('werewolf/decision-failure', {
    version: 0,
    sourceEventSeq,
    baseRevision,
    phase,
    actorId: failure.actorId,
    kind: failure.kind,
    ...(failure.issue === undefined ? {} : { issue: failure.issue }),
  })
}
