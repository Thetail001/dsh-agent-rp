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
  if (move === 'pass' || (move === 'hold' && GENERIC_INFORMATION_HOLD.test(statement))) return '过'
  const withoutWaitTail = statement.replace(REDUNDANT_FUTURE_WAIT_TAIL, '').trimEnd()
  return withoutWaitTail !== statement
    && /[。！？]$/u.test(statement)
    && !/[。！？]$/u.test(withoutWaitTail)
    ? `${withoutWaitTail}。`
    : withoutWaitTail
}

const GENERIC_INFORMATION_HOLD = new RegExp([
  '信息(?:确实|还是|仍然|还|也)?(?:太少|不足)',
  '(?:没有|没|还没有|还没)(?:能|有)?[^。！？]{0,16}(?:新(?:的)?(?:依据|信息|线索)|线索|逻辑点|能落定的点|能指认谁的点|能指人的点)',
  '(?:暂时|目前)[^。！？]{0,12}(?:判断不出来|无法判断|没法判断)',
].join('|'), 'u')
const REDUNDANT_FUTURE_WAIT_TAIL = new RegExp([
  '[，,](?:我)?(?:先)?(?:等|等待|看|听)(?:一等|一下)?后面[^。！？]{0,48}(?:发言|回应|表态|收口)[^。！？]*[。！？]?$',
  '[，,]后面[^。！？]{0,48}(?:发言|回应|表态|收口)[^。！？]*[。！？]?$',
].join('|'), 'u')

/** One ballot claim whose pronoun is bound to the structured public target. */
export interface PublicTargetPronounBallotClaim {
  readonly voterId: string
  readonly targetId: string
}

/**
 * Extract ballot claims headed by an otherwise ambiguous second- or third-person pronoun.
 * @param statement - public table utterance.
 * @param publicTargetId - structured player whom the utterance addresses or judges.
 * @param speakerId - player producing the utterance.
 * @returns ballot claims that must be grounded in public records.
 */
export function publicTargetPronounBallotClaims(
  statement: string,
  publicTargetId: string,
  speakerId: string,
): readonly PublicTargetPronounBallotClaim[] {
  const claims: PublicTargetPronounBallotClaim[] = []
  const positiveTarget = '(?<![没未不])投(?:给(?:了)?|了|的(?:却)?是)?\\s*(\\d+)\\s*号'
  for (const match of statement.matchAll(new RegExp(
    `(?:你|他|她|对方)[^。！？]{0,18}${positiveTarget}`,
    'gu',
  ))) {
    if (match[1] !== undefined) {
      claims.push({ voterId: publicTargetId, targetId: `seat-${match[1]}` })
    }
  }
  if (/(?:(?:你|他|她|对方))[^。！？]{0,18}(?<![没未不])投(?:给(?:了)?|了|的(?:却)?是)?\s*我/u.test(statement)) {
    claims.push({ voterId: publicTargetId, targetId: speakerId })
  }
  return claims
}

const FUTURE_PLAYER_DEPENDENCY = new RegExp([
  '还(?:需要|需|要)(?:更多)?(?:公开)?信息',
  '待(?:观察|回应|解释|发言)',
  '等(?:待)?[^，。！？；]{0,18}(?:发言|回应|解释|收口|表态)',
  '(?:今天|明天|后面|下一轮)[^，。！？；]{0,12}(?:继续)?(?:看|观察|听|等)',
].join('|'), 'u')

/**
 * Find an eliminated player treated as a source of future table information.
 * @param statement - public table utterance.
 * @param inactiveActorIds - players no longer alive in the current Storyworld.
 * @returns the first impossible future source, or `undefined`.
 */
export function inactivePublicTargetFutureReference(
  statement: string,
  inactiveActorIds: readonly string[],
): string | undefined {
  const clauses = statement.split(/[。！？；]/u)
  return inactiveActorIds.find((actorId) => {
    const seat = /^seat-(\d+)$/u.exec(actorId)?.[1]
    if (seat === undefined) return false
    const reference = new RegExp(`(?<!\\d)${seat}\\s*号(?:玩家)?`, 'u')
    return clauses.some(clause => reference.test(clause) && FUTURE_PLAYER_DEPENDENCY.test(clause))
  })
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
