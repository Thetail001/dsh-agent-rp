/** Public table-speech moves and their structural contract. */

/** One conversational action completed by a public Werewolf statement. */
export const STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES = [
  'assess',
  'respond',
  'revise',
  'hold',
  'commit',
  'pass',
] as const

/** One accepted public table-speech action. */
export type StandardWerewolfPublicSpeechMove = typeof STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES[number]

/**
 * Whether a value names one accepted public table-speech action.
 * @param value - value received from structured model output.
 * @returns whether the value belongs to the move vocabulary.
 */
export function isStandardWerewolfPublicSpeechMove(
  value: unknown,
): value is StandardWerewolfPublicSpeechMove {
  return (STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES as readonly unknown[]).includes(value)
}

/**
 * Whether a speech move publishes one structured target and stance.
 * @param move - structured public speech move.
 * @returns whether the move carries a public judgment.
 */
export function publicSpeechMoveCarriesJudgment(
  move: unknown,
): move is 'assess' | 'revise' | 'commit' {
  return move === 'assess' || move === 'revise' || move === 'commit'
}

/**
 * Whether a speech move must cite at least one table-public evidence item.
 * @param move - structured public speech move.
 * @returns whether public grounding is mandatory.
 */
export function publicSpeechMoveNeedsPublicEvidence(move: unknown): boolean {
  return move !== 'hold' && move !== 'pass'
}

/**
 * Normalize the only fixed public utterance while preserving authored moves.
 * @param move - structured public speech move.
 * @param statement - model-authored public statement.
 * @returns the accepted table utterance.
 */
export function normalizePublicSpeechStatement(move: unknown, statement: string): string {
  return move === 'pass' ? '过' : statement
}

/**
 * Select the judgment that one move must preserve or revise.
 * @param move - structured public speech move.
 * @param targetId - target published by the current move.
 * @param history - public judgments in chronological order.
 * @returns the latest judgment overall for revise, otherwise the latest judgment on the current target.
 */
export function selectPublicSpeechPrior<T extends { readonly targetId: string }>(
  move: unknown,
  targetId: unknown,
  history: readonly T[],
): T | undefined {
  return history.findLast(judgment => move === 'revise' || judgment.targetId === targetId)
}

/** Compact structural problem returned before context-sensitive speech validation. */
export type PublicSpeechMoveShapeIssue =
  | 'invalid-move'
  | 'invalid-target'
  | 'invalid-stance'
  | 'unexpected-judgment'
  | 'explosion-move'

/** Contextual mismatch between a judgment move and public decision history. */
export type PublicSpeechMoveContextIssue =
  | 'revise-without-prior-change'
  | 'revise-without-new-evidence'
  | 'change-without-revise'
  | 'commit-without-candidate'

/**
 * Validate the target/stance shape owned by a public speech move.
 * @param input - untrusted structured speech fields and their allowed vocabularies.
 * @returns the first structural issue, or `undefined` when the shape is valid.
 */
export function publicSpeechMoveShapeIssue(input: {
  readonly action?: unknown
  readonly move: unknown
  readonly targetId: unknown
  readonly stance: unknown
  readonly targets: readonly string[]
  readonly stances: readonly string[]
}): PublicSpeechMoveShapeIssue | undefined {
  if (!isStandardWerewolfPublicSpeechMove(input.move)) return 'invalid-move'
  if (input.action === 'explode' && input.move !== 'pass') return 'explosion-move'
  if (!publicSpeechMoveCarriesJudgment(input.move) || input.action === 'explode') {
    return input.targetId === null && input.stance === null ? undefined : 'unexpected-judgment'
  }
  if (typeof input.targetId !== 'string' || !input.targets.includes(input.targetId)) return 'invalid-target'
  if (typeof input.stance !== 'string' || !input.stances.includes(input.stance)) return 'invalid-stance'
  return undefined
}

/**
 * Validate the history-dependent contract of revise and commit.
 * @param input - normalized judgment fields plus the prior and table-public context.
 * @returns the first contextual issue, or `undefined` when the move is grounded.
 */
export function publicSpeechMoveContextIssue(input: {
  readonly move: unknown
  readonly targetId: unknown
  readonly stance: unknown
  readonly evidenceIds: readonly string[]
  readonly publicEvidenceIds: readonly string[]
  readonly prior?: {
    readonly targetId: string
    readonly stance: string
    readonly evidenceIds: readonly string[]
  }
  readonly coveredTargetIds: readonly string[]
}): PublicSpeechMoveContextIssue | undefined {
  const prior = input.prior
  const hasNewPublicEvidence = prior !== undefined
    && input.evidenceIds.some(id => input.publicEvidenceIds.includes(id) && !prior.evidenceIds.includes(id))
  if (input.move === 'revise') {
    if (prior === undefined || (prior.targetId === input.targetId && prior.stance === input.stance)) {
      return 'revise-without-prior-change'
    }
    if (!hasNewPublicEvidence) return 'revise-without-new-evidence'
  } else if (prior !== undefined && prior.targetId === input.targetId && prior.stance !== input.stance) {
    return 'change-without-revise'
  }
  if (input.move === 'commit'
    && prior?.targetId !== input.targetId
    && (typeof input.targetId !== 'string' || !input.coveredTargetIds.includes(input.targetId))) {
    return 'commit-without-candidate'
  }
  return undefined
}
