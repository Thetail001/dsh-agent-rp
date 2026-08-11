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

/** Speaker position used to expose only moves that are timely at the table. */
export type StandardWerewolfPublicSpeechPosition = 'early' | 'middle' | 'late'

/** Good-aligned identity names that may appear as strategic public claims. */
export const STANDARD_WEREWOLF_PUBLIC_ROLE_CLAIMS = [
  'seer',
  'witch',
  'hunter',
  'idiot',
  'villager',
] as const

/** One good-aligned identity that a player may claim at the table. */
export type StandardWerewolfPublicRoleClaim = typeof STANDARD_WEREWOLF_PUBLIC_ROLE_CLAIMS[number]

/**
 * List public identities available to one private role's table strategy.
 * Good players may reveal only their role; wolves may bluff any good role.
 * @param role - speaker's private standard Werewolf role.
 * @returns legal public role claims for the speaker.
 */
export function publicRoleClaimsForPrivateRole(
  role: StandardWerewolfPublicRoleClaim | 'wolf',
): readonly StandardWerewolfPublicRoleClaim[] {
  return role === 'wolf' ? STANDARD_WEREWOLF_PUBLIC_ROLE_CLAIMS : [role]
}

/**
 * List speech moves available at one table position.
 * @param position - speaker position in the living order.
 * @returns every normal move, with vote-like commitment reserved for the closing seats.
 */
export function publicSpeechMovesForPosition(
  position: StandardWerewolfPublicSpeechPosition,
): readonly StandardWerewolfPublicSpeechMove[] {
  return position === 'late'
    ? STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES
    : STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES.filter(move => move !== 'commit')
}

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

const DIRECT_WOLF_SELF_CLAIM = new RegExp([
  '(?:^|[，。！？；,:：])\\s*(?:好吧|其实|坦白说|说实话)?\\s*(?:我是|我\\s*\\d+\\s*号(?:玩家)?\\s*是|我(?:承认|就是|确实是)|作为|身为)\\s*(?:一名)?\\s*狼(?:人)?(?:阵营)?',
  '(?:^|[，。！？；,:：])\\s*(?:我|本人)\\s*(?:属于|来自)\\s*狼(?:人)?阵营',
  '(?:保护|帮助|掩护)\\s*(?:我的)?\\s*狼(?:队友|队)',
  '狼队友',
  '\\bour\\s+wolf(?:\\s+team|\\s+pack)?\\b',
].join('|'), 'iu')

/**
 * Whether a wolf's public statement directly reveals its own hidden alignment.
 * Reported accusations such as “8 号点我是狼” remain legal table speech.
 * @param statement - public statement authored by a hidden wolf.
 * @returns whether the speaker directly claims or exposes wolf membership.
 */
export function publicStatementDisclosesWolfAlignment(statement: string): boolean {
  return DIRECT_WOLF_SELF_CLAIM.test(statement)
}

/** One explicit denial that a player ever published a named Seer result. */
export interface PublicSeerClaimDenial {
  readonly actorId: string
  readonly targetId: string
}

/**
 * Extract claims that a named player never published one named Seer result.
 * @param statement - public table utterance that may deny an earlier claim.
 * @returns denied claimant/target pairs in textual order.
 */
export function deniedPublicSeerClaims(statement: string): readonly PublicSeerClaimDenial[] {
  return [...statement.matchAll(
    /(?<!\d)(\d{1,2})\s*号(?:玩家)?[^。！？]{0,64}(?:从未|从没|并未|未曾|没有|没)[^。！？]{0,16}(?:查验|查杀|验(?:过|了)?)\s*(\d{1,2})\s*号(?:玩家)?/gu,
  )].flatMap((match) => match[1] === undefined || match[2] === undefined
    ? []
    : [{ actorId: `seat-${match[1]}`, targetId: `seat-${match[2]}` }])
}

/**
 * Extract the named targets from one published Seer claim.
 * @param statement - candidate speech or public table statement.
 * @returns claimed inspection target ids in textual order.
 */
export function publicSeerClaimTargetIds(statement: string): readonly string[] {
  return [...statement.matchAll(/(?:查验|查杀|验(?:过|了)?)\s*(\d{1,2})\s*号(?:玩家)?/gu)]
    .flatMap(match => match[1] === undefined ? [] : [`seat-${match[1]}`])
}

/** Problem in a first-night Seer campaign statement's published inspection. */
export type PublicSeerCampaignClaimIssue = 'missing-target' | 'multiple-targets'

/**
 * Validate the one inspection target available before the first Sheriff election.
 * The caller establishes that the speaker publicly claims Seer; later days may
 * legitimately recount more than one inspection and do not use this contract.
 * @param statement - first-day Sheriff campaign statement claiming Seer.
 * @returns the target-count problem, or `undefined` for exactly one target.
 */
export function publicSeerCampaignClaimIssue(
  statement: string,
): PublicSeerCampaignClaimIssue | undefined {
  const targets = new Set(publicSeerClaimTargetIds(statement))
  if (targets.size === 0) return 'missing-target'
  return targets.size > 1 ? 'multiple-targets' : undefined
}

/**
 * Normalize the only fixed public utterance while preserving authored moves.
 * @param move - structured public speech move.
 * @param statement - model-authored public statement.
 * @returns the accepted table utterance.
 */
export function normalizePublicSpeechStatement(move: unknown, statement: string): string {
  if (move === 'pass'
    || (move === 'hold'
      && (GENERIC_INFORMATION_HOLD.test(statement) || EXPLICIT_PASS_ENDING.test(statement.trim())))) {
    return '过'
  }
  const withoutFalseSheriffHandoff = statement.replace(FALSE_SHERIFF_HANDOFF_PREFIX, '')
  const withoutWaitTail = withoutFalseSheriffHandoff.replace(REDUNDANT_FUTURE_WAIT_TAIL, '').trimEnd()
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
  '(?:暂时|目前)?[^。！？]{0,8}没抓到(?:别的|更多|新的)?(?:矛盾|冲突|问题|点)',
].join('|'), 'u')
const EXPLICIT_PASS_ENDING = /(?:^|[，。！？\s])过[。！？]?$/u
const FALSE_SHERIFF_HANDOFF_PREFIX = /^我(?:这轮)?先把警长交给\s*\d+\s*号(?:玩家)?[，,]/u
const REDUNDANT_FUTURE_WAIT_TAIL = new RegExp([
  '[，,](?:我)?(?:先)?(?:等|等待|看|听)(?:一等|一下)?后面[^。！？]{0,48}(?:发言|回应|表态|收口)[^。！？]*[。！？]?$',
  '[，,]后面[^。！？]{0,48}(?:发言|回应|表态|收口)[^。！？]*[。！？]?$',
].join('|'), 'u')

const DIRECT_PUBLIC_FOCUS_REFERENCES = [
  /(?:想|要)?听(?:听)?\s*(\d+)\s*号/gu,
  /(?:还)?缺\s*(\d+)\s*号(?:玩家)?[^。！？]{0,12}(?:解释|表态|票型|理由|判断|说法)/gu,
  /(\d+)\s*号(?:玩家)?[^。！？]{0,48}(?:(?:轮到你(?:时)?|请你|你(?:先|得|要|需要|应该))[^。！？]{0,24}|(?<!已经)把[^。！？]{0,20}(?:这票|理由|判断|说法)[^。！？]{0,12})(?:说清楚|讲清楚|解释(?:一下)?|给出(?:理由|判断|说法))(?!了|过)/gu,
] as const
const DIRECT_PUBLIC_FOCUS_LIST_REFERENCE = /(?:想|要)?听(?:听)?\s*((?:\d+\s*号(?:玩家)?\s*[、,，和及]\s*)+\d+\s*号(?:玩家)?)/gu

/**
 * Find players whom one public statement directly asks to address a concrete point.
 * @param statement - public table utterance that may address later speakers.
 * @returns deduplicated seat ids in textual order.
 */
export function directedPublicFocusTargetIds(statement: string): readonly string[] {
  const targets = new Set<string>()
  for (const list of statement.matchAll(DIRECT_PUBLIC_FOCUS_LIST_REFERENCE)) {
    for (const seat of list[1]?.matchAll(/\d+/gu) ?? []) targets.add(`seat-${seat[0]}`)
  }
  for (const pattern of DIRECT_PUBLIC_FOCUS_REFERENCES) {
    for (const match of statement.matchAll(pattern)) {
      if (match[1] !== undefined) targets.add(`seat-${match[1]}`)
    }
  }
  return [...targets]
}

/**
 * Read the final explicitly numbered player in one public statement.
 * @param statement - public table utterance.
 * @returns the final standard seat id, or `undefined` when no seat is named.
 */
export function finalPublicSpeechTargetId(statement: string): string | undefined {
  const seats = [...statement.matchAll(/(?<!\d)(\d{1,2})\s*号(?:玩家)?/gu)]
    .flatMap((match) => {
      const value = Number(match[1])
      return Number.isSafeInteger(value) && value >= 1 && value <= 12 ? [`seat-${String(value)}`] : []
    })
  return seats.at(-1)
}

/** Context problem that makes a hold repeat or wait for an unavailable answer. */
export type PublicHoldTargetIssue =
  | 'missing-future-target'
  | 'multiple-future-targets'
  | 'unavailable-future-target'
  | 'repeated-future-target'

/**
 * Validate that a hold asks one available later player for a distinct answer.
 * @param input - authored statement, legal later players, and earlier statements from this round.
 * @returns the contextual problem, or `undefined` for one actionable hold.
 */
export function publicHoldTargetIssue(input: {
  readonly statement: string
  readonly legalFutureTargetIds: readonly string[]
  readonly priorStatements: readonly string[]
}): PublicHoldTargetIssue | undefined {
  const targets = directedPublicFocusTargetIds(input.statement)
  if (targets.length === 0) return 'missing-future-target'
  if (targets.length > 1) return 'multiple-future-targets'
  const target = targets[0]
  if (target === undefined || !input.legalFutureTargetIds.includes(target)) {
    return 'unavailable-future-target'
  }
  return input.priorStatements.some(statement => directedPublicFocusTargetIds(statement).includes(target))
    ? 'repeated-future-target'
    : undefined
}

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

const PUBLIC_RESPONSE_REQUEST_REFERENCES = [
  /(?:想|要|请|先|再|希望)?问(?:问|一下|一句)?[^。！？；]{0,8}?(\d+)\s*号(?:玩家)?/gu,
  /(?:想|要|请|先|再|希望)?(?:听(?:听)?|等(?:待)?|看(?:看)?)\s*(\d+)\s*号(?:玩家)?[^。！？；]{0,18}(?:回应|回答|解释|表态|补(?:充|一句)|说(?:说|一下)?|讲(?:讲|一下)?|给(?:个|出))/gu,
  /(?:请|希望|让)\s*(\d+)\s*号(?:玩家)?[^。！？；]{0,18}(?:回应|回答|解释|表态|补(?:充|一句)|说(?:说|一下)?|讲(?:讲|一下)?|给(?:个|出))/gu,
  /(\d+)\s*号(?:玩家)?[，,:：]?(?:你)?(?:能否|能不能|可否|有没有|请|需要)[^。！？；]{0,18}(?:回应|回答|解释|表态|补(?:充|一句)|说(?:说|一下)?|讲(?:讲|一下)?|给(?:个|出))/gu,
  /(\d+)\s*号(?:玩家)?[^。！？；]{0,18}(?:后面|接下来|再|怎么)[^。！？；]{0,8}(?:回应|回答|解释|表态|补(?:充|一句)|说(?:说|一下)?|讲(?:讲|一下)?|给(?:个|出))/gu,
  /(\d+)\s*号(?:玩家)?[^\d。！？；]{0,12}(?:后续|后面|接下来)[^。！？；]{0,16}(?:动作|表现|怎么走|接(?:住)?|回应|解释|表态|发言|讲清楚|说清楚)/gu,
  /(?:后续|后面|接下来)[^\d。！？；]{0,8}(\d+)\s*号(?:玩家)?[^。！？；]{0,12}(?:能|要|得|需要|应该)[^。！？；]{0,8}(?:讲清楚|说清楚|解释|回应|表态|发言)/gu,
  /(\d+)\s*号(?:玩家)?[^\d。！？；]{0,12}(?:自己|本人)[^。！？；]{0,8}(?:得|要|应该|需要)[^。！？；]{0,8}(?:出面|接住|回应|解释|表态|发言)/gu,
  /(\d+)\s*号(?:玩家)?[^\d。！？；]{0,8}(?:你)?(?:先|再|需要|应该|得)[^。！？；]{0,8}(?:正面)?(?:讲讲|说说|讲清楚|说清楚|解释一下|回应一下|表态一下)(?!了|过)/gu,
] as const

/**
 * Find a player who can no longer answer but is asked for another response in the current round.
 * @param statement - public table utterance.
 * @param unavailableActorIds - players whose once-per-round speech has already ended.
 * @returns the first impossible response target, or `undefined`.
 */
export function unavailablePublicTargetResponseRequest(
  statement: string,
  unavailableActorIds: readonly string[],
): string | undefined {
  const unavailable = new Set(unavailableActorIds)
  const directedUnavailable = directedPublicFocusTargetIds(statement)
    .find(actorId => unavailable.has(actorId))
  if (directedUnavailable !== undefined) return directedUnavailable
  for (const pattern of PUBLIC_RESPONSE_REQUEST_REFERENCES) {
    for (const match of statement.matchAll(pattern)) {
      const seat = match[1]
      if (seat !== undefined && unavailable.has(`seat-${seat}`)) return `seat-${seat}`
    }
  }
  return undefined
}

const CURRENT_SHERIFF_SELF_AUTHORITY = /(?:^|[，。！？；])\s*(?:现在|已经)?(?:警徽在我(?:这里|手里|手上|这边)|我是(?:本局)?警长)(?:[，。！？；]|$)/u

/**
 * Whether a candidate states that the unsettled Sheriff authority already belongs to itself.
 * Conditional plans such as “如果我拿到警徽” remain legal campaign speech.
 * @param statement - first-day Sheriff campaign statement.
 * @returns whether the statement asserts current authority before the ballot.
 */
export function publicStatementClaimsCurrentSheriffAuthority(statement: string): boolean {
  return CURRENT_SHERIFF_SELF_AUTHORITY.test(statement)
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

/** Broad table-reading family used to limit repeated judgments without silencing the first reply. */
export type PublicSpeechJudgmentFamily = 'trust' | 'attention'

/**
 * Group public stances by whether they trust or scrutinize a target.
 * @param stance - structured public stance.
 * @returns the table-reading family, or `undefined` outside the stance vocabulary.
 */
export function publicSpeechJudgmentFamily(stance: unknown): PublicSpeechJudgmentFamily | undefined {
  if (stance === 'trust') return 'trust'
  if (stance === 'suspect' || stance === 'question' || stance === 'observe') return 'attention'
  return undefined
}

/**
 * Whether a response addresses an existing concern instead of inventing an unheard challenge.
 * @param history - structured judgments already spoken in the current round.
 * @param actorId - player producing the response.
 * @param citesDirectedStatement - whether cited public text independently names the speaker.
 * @returns whether the response has one table-public reason to exist.
 */
export function publicResponseIsGrounded<T extends {
  readonly targetId: string
  readonly stance: string
}>(
  history: readonly T[],
  actorId: string,
  citesDirectedStatement: boolean,
): boolean {
  return citesDirectedStatement || history.some(judgment =>
    judgment.targetId === actorId && publicSpeechJudgmentFamily(judgment.stance) === 'attention')
}

const NEGATED_CORROBORATION_REFERENCE = new RegExp([
  '(?:不能|无法|不代表|并不|不是|不足以|不)[^。！？]{0,12}(?:吻合|印证|证明|支持|佐证|相符|一致|对应)',
  '(?:吻合|印证|证明|支持|佐证|相符|一致|对应)不(?:了|到|能|成立)?',
].join('|'), 'iu')

/**
 * Whether Chinese table speech explicitly denies that one fact corroborates another.
 * @param statement - public statement whose corroboration wording may use preposed or postposed negation.
 * @returns whether the statement contains an explicit denial of corroboration.
 */
export function publicStatementNegatesCorroboration(statement: string): boolean {
  return NEGATED_CORROBORATION_REFERENCE.test(statement)
}

/**
 * Return the latest matching judgment only after a target/family has filled its table capacity.
 * @param history - public judgments in chronological order.
 * @param targetId - target proposed by the current speaker.
 * @param stance - stance proposed by the current speaker.
 * @param capacity - number of distinct speakers allowed before repetition needs new evidence.
 * @returns the latest saturated judgment, or `undefined` while another perspective is still useful.
 */
export function selectSaturatedPublicJudgment<T extends {
  readonly targetId: string
  readonly stance: string
}>(
  history: readonly T[],
  targetId: unknown,
  stance: unknown,
  capacity = 2,
): T | undefined {
  const family = publicSpeechJudgmentFamily(stance)
  if (family === undefined) return undefined
  const matching = history.filter(judgment =>
    judgment.targetId === targetId && publicSpeechJudgmentFamily(judgment.stance) === family)
  return matching.length >= capacity ? matching.at(-1) : undefined
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
