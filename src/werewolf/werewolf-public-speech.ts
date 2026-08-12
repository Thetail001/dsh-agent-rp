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

/** Public facts and conversational openings that make speech moves usable this turn. */
export interface StandardWerewolfPublicSpeechTurn {
  /** Current place in the living speaking order. */
  readonly position: StandardWerewolfPublicSpeechPosition
  /** Whether public evidence refers to another living player who can be assessed. */
  readonly hasTargetablePublicEvidence: boolean
  /** Whether an earlier public concern currently points at the speaker. */
  readonly hasDirectedConcern: boolean
  /** Whether a prior judgment can be changed using newly public evidence. */
  readonly hasRevisablePrior: boolean
  /** Whether one later living player can still answer a concrete question. */
  readonly hasFutureSpeaker: boolean
  /** Whether the table already contains a structured judgment to answer or close. */
  readonly hasCoveredJudgment: boolean
  /** Whether the wolf-only schema must preserve the pass-shaped explosion branch. */
  readonly mustAllowExplosion: boolean
}

/**
 * Expose only speech moves that the current public context can support. The first non-wolf speaker
 * facing another player's actionable public record must open one judgment instead of spending three
 * model attempts on impossible response or revision shapes.
 * @param turn - public facts and conversational openings available at this exact speaking turn.
 * @returns context-supported moves in stable table order.
 */
export function publicSpeechMovesForTurn(
  turn: StandardWerewolfPublicSpeechTurn,
): readonly StandardWerewolfPublicSpeechMove[] {
  const moves: StandardWerewolfPublicSpeechMove[] = []
  if (turn.hasTargetablePublicEvidence) moves.push('assess')
  if (turn.hasDirectedConcern) moves.push('respond')
  if (turn.hasRevisablePrior) moves.push('revise')
  if (turn.hasFutureSpeaker && !turn.hasCoveredJudgment) moves.push('hold')
  if (turn.position === 'late' && turn.hasCoveredJudgment) moves.push('commit')

  const mustOpenJudgment = turn.hasTargetablePublicEvidence
    && !turn.hasCoveredJudgment
    && !turn.hasDirectedConcern
    && !turn.hasRevisablePrior
  if (!mustOpenJudgment || turn.mustAllowExplosion) moves.push('pass')
  return moves.length === 0 ? ['pass'] : moves
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
  const normalizedPunctuation = statement.replaceAll(',', '，')
  const withoutFalseSheriffHandoff = normalizedPunctuation.replace(FALSE_SHERIFF_HANDOFF_PREFIX, '')
  const withoutWaitTail = withoutFalseSheriffHandoff.replace(REDUNDANT_FUTURE_WAIT_TAIL, '').trimEnd()
  return withoutWaitTail !== statement
    && /[。！？]$/u.test(statement)
    && !/[。！？]$/u.test(withoutWaitTail)
    ? `${withoutWaitTail}。`
    : withoutWaitTail
}

const PUBLIC_STATEMENT_REPETITION_THRESHOLD = 0.6
const PUBLIC_STATEMENT_REPETITION_MIN_BIGRAMS = 20

function publicStatementBigrams(statement: string): ReadonlySet<string> {
  const compact = statement.replace(/[\p{P}\p{S}\s]/gu, '')
  const bigrams = new Set<string>()
  for (let index = 0; index + 1 < compact.length; index += 1) {
    bigrams.add(compact.slice(index, index + 2))
  }
  return bigrams
}

/**
 * Find an earlier turn whose wording is mostly repeated by a new statement. Short table phrases are
 * excluded because shared game terms such as “警长票” are not enough to establish imitation.
 * @param statement - new authored public statement.
 * @param priorStatements - earlier statements from the current speaking round.
 * @returns zero-based source index, or `undefined` when the wording has enough independent content.
 */
export function repeatedPublicStatementIndex(
  statement: string,
  priorStatements: readonly string[],
): number | undefined {
  const current = publicStatementBigrams(statement)
  if (current.size < PUBLIC_STATEMENT_REPETITION_MIN_BIGRAMS) return undefined
  for (let index = priorStatements.length - 1; index >= 0; index -= 1) {
    const prior = publicStatementBigrams(priorStatements[index] ?? '')
    if (prior.size < PUBLIC_STATEMENT_REPETITION_MIN_BIGRAMS) continue
    let shared = 0
    for (const bigram of current) if (prior.has(bigram)) shared += 1
    if ((2 * shared) / (current.size + prior.size) >= PUBLIC_STATEMENT_REPETITION_THRESHOLD) {
      return index
    }
  }
  return undefined
}

const PUBLIC_IDENTITY = '(?:狼(?:人)?|好人|预言家|女巫|猎人|白痴|村民|平民)'
const PUBLIC_IDENTITY_CERTAINTY = '(?:结果|已经|现已|确认|证实|坐实|实锤|翻牌)'
const CERTAIN_PUBLIC_IDENTITY_REFERENCES = [
  new RegExp(`${PUBLIC_IDENTITY_CERTAINTY}[^，,；;：:。！？]{0,12}(\\d+)\\s*号(?:玩家)?[^，,；;：:。！？]{0,8}(?:是|为|属于)?\\s*${PUBLIC_IDENTITY}`, 'giu'),
  new RegExp(`(\\d+)\\s*号(?:玩家)?[^，,；;：:。！？]{0,12}${PUBLIC_IDENTITY_CERTAINTY}[^，,；;：:。！？]{0,8}(?:是|为|属于)?\\s*${PUBLIC_IDENTITY}`, 'giu'),
] as const

/**
 * Find identities stated as public certainty without joining separate clauses.
 * @param statement - public table utterance.
 * @returns deduplicated standard seat ids in textual order.
 */
export function certainPublicIdentityActorIds(statement: string): readonly string[] {
  const actors = new Set<string>()
  for (const pattern of CERTAIN_PUBLIC_IDENTITY_REFERENCES) {
    for (const match of statement.matchAll(pattern)) {
      if (match[1] !== undefined) actors.add(`seat-${match[1]}`)
    }
  }
  return [...actors]
}

const PUBLIC_BALLOT_REFERENCE = /^(?:sheriff-(?:election|pk):\d+|day:\d+:(?:exile-vote|pk-vote)):(seat-\d+):(seat-\d+|abstain)$/u

/**
 * Find targets from public Sheriff and exile ballot evidence.
 * @param evidenceIds - evidence ids available in the public table record.
 * @returns deduplicated target ids in evidence order.
 */
export function publicBallotTargetIds(evidenceIds: readonly string[]): readonly string[] {
  const targets = new Set<string>()
  for (const evidenceId of evidenceIds) {
    const targetId = PUBLIC_BALLOT_REFERENCE.exec(evidenceId)?.[2]
    if (targetId !== undefined) targets.add(targetId)
  }
  return [...targets]
}

/**
 * Read the public players directly represented by one evidence id. Announcements without an actor
 * are deliberately excluded so a night death alone cannot force a judgment about an unrelated seat.
 * @param evidenceId - one table-public evidence id.
 * @returns represented player ids in voter/target or author order.
 */
export function publicEvidenceActorIds(evidenceId: string): readonly string[] {
  const directActor = /^(?:sheriff:(?:candidate|holder):|day:\d+:(?:speech|hunter-shot):)(seat-\d+)$/u
    .exec(evidenceId)?.[1]
  if (directActor !== undefined) return [directActor]
  const ballot = PUBLIC_BALLOT_REFERENCE.exec(evidenceId)
  if (ballot === null) return []
  return [...new Set([ballot[1], ballot[2]].filter(actorId => actorId !== 'abstain'))] as string[]
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

const EXPLICIT_FIRST_PERSON_ATTENTION_REFERENCE = /我(?:先|暂时|现在|更|会)?\s*(?:重点)?\s*(?:关注|怀疑|质疑|警惕|看|盯)(?:着)?\s*(\d{1,2})\s*号(?:玩家)?/gu

/**
 * Read an explicit first-person human table concern without guessing sentiment from arbitrary prose.
 * This narrow form lets Character turns treat “我先关注 1 号” like the same structured judgment
 * they would have produced themselves.
 * @param statement - human-authored public statement.
 * @returns deduplicated target ids in textual order.
 */
export function explicitPublicAttentionTargetIds(statement: string): readonly string[] {
  return [...new Set([...statement.matchAll(EXPLICIT_FIRST_PERSON_ATTENTION_REFERENCE)]
    .flatMap(match => match[1] === undefined ? [] : [`seat-${match[1]}`]))]
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

const EXPLICIT_PUBLIC_JUDGMENT_TARGET_REFERENCES = [
  /我[^。！？]{0,24}(?:关注|怀疑|质疑|警惕|看|盯|注意到)(?:着)?\s*(\d{1,2})\s*号(?:玩家)?/gu,
  /(?:注意力|焦点|方向)[^。！？]{0,16}(?:放回|放在|落在|转向|看向|盯住)?\s*(\d{1,2})\s*号(?:玩家)?/gu,
  /(?:今天|本轮|最后|这一票)[^。！？]{0,20}(?:会|要|准备|倾向)?(?:投给|票给|放逐|出)\s*(\d{1,2})\s*号(?:玩家)?/gu,
  /(?:^|[。！？；：])\s*(\d{1,2})\s*号(?:玩家)?[，,:：]\s*你/gu,
] as const

/**
 * Find the target of the final explicit table judgment rather than the final seat mentioned at all.
 * Historical speech and ballot references may legitimately follow an opening focus without forcing
 * every player to append a mechanical “我先看 N 号” restatement.
 * @param statement - public table utterance.
 * @returns the final explicitly focused standard seat, falling back to the final named seat.
 */
export function publicSpeechJudgmentTargetId(statement: string): string | undefined {
  const targets = EXPLICIT_PUBLIC_JUDGMENT_TARGET_REFERENCES.flatMap(pattern =>
    [...statement.matchAll(pattern)].flatMap((match) => {
      const seat = match[1]
      if (seat === undefined) return []
      const value = Number(seat)
      return Number.isSafeInteger(value) && value >= 1 && value <= 12
        ? [{ index: match.index + match[0].lastIndexOf(seat), actorId: `seat-${String(value)}` }]
        : []
    }))
    .sort((left, right) => left.index - right.index)
  return targets.at(-1)?.actorId ?? finalPublicSpeechTargetId(statement)
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

/**
 * Find players whom a statement says acknowledged or admitted a prior point.
 * Second- and third-person pronouns bind to the structured judgment target.
 * @param statement - public table utterance containing a possible attribution.
 * @param publicTargetId - structured target addressed or judged by the utterance.
 * @returns deduplicated actor ids whose own public words must support the claim.
 */
export function publicAcknowledgementClaimActorIds(
  statement: string,
  publicTargetId: string,
): readonly string[] {
  const actors = new Set<string>()
  if (/(?:你|他|她|对方)(?:也|都)?(?:自己)?(?:确实)?(?:认|承认|认可|同意)(?:了|过)?/u.test(statement)) {
    actors.add(publicTargetId)
  }
  return [...actors]
}

/**
 * Whether a player's own statement acknowledges a prior public point.
 * @param statement - statement authored by the player being cited.
 * @returns whether it contains an affirmative first-person acknowledgement.
 */
export function publicStatementContainsFirstPersonAcknowledgement(statement: string): boolean {
  return /(?:^|[，。！？；:：])\s*我(?:也|都)?(?:自己)?(?:确实)?(?:认|承认|认可|同意)(?:了|过|这|那|[，。！？；]|$)/u
    .test(statement)
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
  /(\d+)\s*号(?:玩家)?[^\d。！？；]{0,40}(?:轮到(?:你)?时|这一轮|这轮)[^。！？；]{0,16}(?:要|得|需要|应该)?(?:把)?[^。！？；]{0,12}(?:话|发言|立场|理由)[^。！？；]{0,8}(?:说|讲)(?:实|满|清楚|透|完整)(?:一点)?(?!了|过)/gu,
  /(\d+)\s*号(?:玩家)?[，,:：]?(?:你)?(?:这一轮|这轮)[^。！？；]{0,8}(?:把)?[^。！？；]{0,8}(?:话|发言|立场|理由)[^。！？；]{0,8}(?:说|讲)(?:实|满|清楚|透|完整)(?:一点)?(?!了|过)/gu,
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

const MISSING_BALLOT_EXPLANATION = new RegExp([
  '(?:票|投票)[^。！？]{0,20}(?:没(?:有)?|未|从未)[^。！？]{0,10}(?:理由|原因|解释|交代|为什么)',
  '(?:没(?:有)?|未|从未)[^。！？]{0,10}(?:理由|原因|解释|交代)[^。！？]{0,12}(?:票|投票)',
].join('|'), 'iu')

/**
 * Return a later speaker described as already lacking a ballot explanation. A later player may be
 * asked to explain when their turn arrives, but has not yet had a public opportunity to do so.
 * @param statement - current public utterance.
 * @param futureActorIds - living players whose speaking turns have not begun.
 * @returns the prematurely judged player, or `undefined`.
 */
export function prematurePublicBallotExplanationTarget(
  statement: string,
  futureActorIds: readonly string[],
): string | undefined {
  for (const match of statement.matchAll(/(?<!\d)(\d{1,2})\s*号(?:玩家)?/gu)) {
    const value = Number(match[1])
    if (!Number.isSafeInteger(value) || value < 1 || value > 12 || match.index === undefined) continue
    const actorId = `seat-${String(value)}`
    if (!futureActorIds.includes(actorId)) continue
    const sentenceStart = Math.max(
      statement.lastIndexOf('。', match.index),
      statement.lastIndexOf('！', match.index),
      statement.lastIndexOf('？', match.index),
    ) + 1
    const remaining = statement.slice(match.index)
    const ending = remaining.search(/[。！？]/u)
    const sentenceEnd = ending === -1 ? statement.length : match.index + ending
    if (MISSING_BALLOT_EXPLANATION.test(statement.slice(sentenceStart, sentenceEnd))) return actorId
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
 * Maximum same-family judgments admitted before a move needs target-owned new evidence.
 * One speaker opens a table read and one closing speaker may convert it into a vote; additional
 * paraphrases do not become independent information merely because another seat authored them.
 * @param move - structured public speech move.
 * @returns allowed same-family judgment count before saturation.
 */
export function publicSpeechJudgmentCapacity(move: unknown): number {
  return move === 'commit' ? 2 : 1
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

/**
 * Whether a response ends on itself or the player whose public concern it answers. Ending on an
 * unrelated seat adds a second table judgment that belongs to a separate speech move.
 * @param statement - public response text.
 * @param actorId - responding player.
 * @param sourceActorIds - players whose public concerns targeted the responder.
 * @returns whether the response keeps one conversational focus.
 */
export function publicResponseFinalTargetIsGrounded(
  statement: string,
  actorId: string,
  sourceActorIds: readonly string[],
): boolean {
  const finalTargetId = finalPublicSpeechTargetId(statement)
  return finalTargetId === undefined
    || finalTargetId === actorId
    || sourceActorIds.includes(finalTargetId)
}

const NEGATED_CORROBORATION_REFERENCE = new RegExp([
  '(?:不能|无法|没法|没有|没|未|不代表|并不|不是|不足以|不)[^。！？]{0,12}(?:吻合|印证|证明|支持|支撑|佐证|相符|一致|对应|背书)',
  '(?:吻合|印证|证明|支持|支撑|佐证|相符|一致|对应|背书)不(?:了|到|能|成立)?',
].join('|'), 'iu')

/**
 * Whether Chinese table speech explicitly denies that one fact corroborates another.
 * @param statement - public statement whose corroboration wording may use preposed or postposed negation.
 * @returns whether the statement contains an explicit denial of corroboration.
 */
export function publicStatementNegatesCorroboration(statement: string): boolean {
  return NEGATED_CORROBORATION_REFERENCE.test(statement)
}

const NO_DEATH_REFERENCE = /平安夜|昨夜平安|夜里?平安|(?:没有|无)玩家死亡|无人死亡/iu
const SEER_RESULT_REFERENCE = new RegExp([
  '预言家|查验|验人|金水|查杀|好人身份',
  '(?:查|验)(?:了)?\s*\d+\s*号(?:玩家)?[^。！？]{0,8}(?:好人|狼人)',
].join('|'), 'iu')
const CORROBORATION_REFERENCE = /吻合|印证|证明|支持|支撑|佐证|相符|一致|对应|背书/iu
const ABSENT_NO_DEATH_REFERENCE = /(?:没有|没|未|并无|缺少)[^。！？]{0,8}平安夜|平安夜(?:都|也)?(?:没有|没发生|不存在)/iu

/**
 * Detect statements that treat a no-death night as evidence for a Seer claim, including wording
 * that incorrectly lists an absent no-death night among the claim's missing corroboration.
 * @param statement - public table utterance.
 * @returns whether the statement assigns evidentiary value to a no-death night.
 */
export function publicStatementMisusesNoDeathCorroboration(statement: string): boolean {
  if (!NO_DEATH_REFERENCE.test(statement)
    || !SEER_RESULT_REFERENCE.test(statement)
    || !CORROBORATION_REFERENCE.test(statement)) return false
  return ABSENT_NO_DEATH_REFERENCE.test(statement)
    || !publicStatementNegatesCorroboration(statement)
}

const NIGHT_OUTCOME_REFERENCE = /狼刀|刀口|刀中|袭击|死亡|倒牌|出局|活着|存活/iu
const NIGHT_OUTCOME_EVIDENCE_REFERENCE = /吻合|印证|证明|支持|支撑|佐证|说明|相符|一致|对应|凭据|反证|核验|核对/iu
const NIGHT_OUTCOME_CORROBORATION_REBUTTAL = new RegExp([
  '(?:不能|无法|不足以)[^。！？]{0,8}(?:反驳|否定|推翻|吻合|印证|证明|支持|支撑|佐证|核验|核对)',
  '(?:不影响|无关|没有关系|两回事)',
].join('|'), 'iu')

/**
 * Whether a statement treats a player's night survival or death as evidence for a Seer result.
 * Wolf attacks and Seer inspections are independent, and this ruleset does not reveal a role on
 * ordinary night death.
 * @param statement - public table utterance.
 * @returns whether the statement assigns invalid evidentiary weight to a night outcome.
 */
export function publicStatementMisusesNightOutcomeCorroboration(statement: string): boolean {
  return SEER_RESULT_REFERENCE.test(statement)
    && NIGHT_OUTCOME_REFERENCE.test(statement)
    && NIGHT_OUTCOME_EVIDENCE_REFERENCE.test(statement)
    && !NIGHT_OUTCOME_CORROBORATION_REBUTTAL.test(statement)
}

const SEER_PRIOR_BASIS_REFERENCE = new RegExp([
  '(?:预言家|查验|验人|金水|查杀)[^。！？]{0,32}',
  '(?:(?:没有|没|缺少|缺乏|拿不出|给不出)[^。！？]{0,8}(?:前置|事前|此前|之前)(?:依据|支撑|实据)',
  '|(?:前置|事前|此前|之前)(?:依据|支撑|实据)[^。！？]{0,8}(?:没有|不足|不够))',
].join(''), 'iu')
const SEER_PRIOR_BASIS_REBUTTAL = new RegExp([
  '(?:查验|预言家)[^。！？]{0,40}(?:不(?:需要|该要求)|无需|本来就是|查验本身)',
  '(?:可|但|不过|其实)[^。！？]{0,28}(?:查验本身|预言家首夜给出的就是查验)',
].join('|'), 'iu')

/**
 * Whether a statement treats the lack of evidence preceding a Seer inspection as a reason to
 * reject it. A player may demand later public corroboration, but an inspection does not need a
 * public premise before the Seer performs it.
 * @param statement - public table utterance.
 * @returns whether the statement imposes the invalid prior-basis requirement.
 */
export function publicStatementRequiresPriorBasisForSeerClaim(statement: string): boolean {
  return SEER_PRIOR_BASIS_REFERENCE.test(statement) && !SEER_PRIOR_BASIS_REBUTTAL.test(statement)
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
  capacity = 1,
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
