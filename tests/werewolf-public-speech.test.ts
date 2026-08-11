import assert from 'node:assert/strict'
import test from 'node:test'
import {
  certainPublicIdentityActorIds,
  publicAcknowledgementClaimActorIds,
  deniedPublicSeerClaims,
  directedPublicFocusTargetIds,
  explicitPublicAttentionTargetIds,
  finalPublicSpeechTargetId,
  inactivePublicTargetFutureReference,
  normalizePublicSpeechStatement,
  prematurePublicBallotExplanationTarget,
  publicBallotTargetIds,
  publicEvidenceActorIds,
  publicHoldTargetIssue,
  publicSpeechJudgmentFamily,
  publicSpeechJudgmentCapacity,
  publicSpeechMovesForPosition,
  publicSpeechMovesForTurn,
  publicTargetPronounBallotClaims,
  publicSpeechMoveCarriesJudgment,
  publicSpeechMoveContextIssue,
  publicSpeechMoveNeedsPublicEvidence,
  publicSpeechMoveShapeIssue,
  publicResponseFinalTargetIsGrounded,
  publicResponseIsGrounded,
  publicRoleClaimsForPrivateRole,
  publicSeerCampaignClaimIssue,
  publicSeerClaimTargetIds,
  publicStatementClaimsCurrentSheriffAuthority,
  publicStatementContainsFirstPersonAcknowledgement,
  publicStatementDisclosesWolfAlignment,
  publicStatementMisusesNoDeathCorroboration,
  publicStatementMisusesNightOutcomeCorroboration,
  publicStatementNegatesCorroboration,
  publicStatementRequiresPriorBasisForSeerClaim,
  repeatedPublicStatementIndex,
  selectSaturatedPublicJudgment,
  selectPublicSpeechPrior,
  STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES,
  unavailablePublicTargetResponseRequest,
} from '../src/werewolf/werewolf-public-speech.ts'

const targets = ['seat-2', 'seat-3']
const stances = ['trust', 'suspect', 'question', 'observe']

test('accepts all six speech moves with only their owned judgment fields', () => {
  for (const move of STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES) {
    const carriesJudgment = publicSpeechMoveCarriesJudgment(move)
    assert.equal(publicSpeechMoveShapeIssue({
      move,
      targetId: carriesJudgment ? 'seat-2' : null,
      stance: carriesJudgment ? 'suspect' : null,
      targets,
      stances,
    }), undefined, move)
  }
})

test('lets good roles reveal themselves and wolves bluff any good role', () => {
  assert.deepEqual(publicRoleClaimsForPrivateRole('witch'), ['witch'])
  assert.deepEqual(publicRoleClaimsForPrivateRole('villager'), ['villager'])
  assert.deepEqual(publicRoleClaimsForPrivateRole('wolf'), [
    'seer',
    'witch',
    'hunter',
    'idiot',
    'villager',
  ])
})

test('reserves commit for closing speakers', () => {
  assert.equal(publicSpeechMovesForPosition('early').includes('commit'), false)
  assert.equal(publicSpeechMovesForPosition('middle').includes('commit'), false)
  assert.equal(publicSpeechMovesForPosition('late').includes('commit'), true)
})

test('offers only moves supported by the current public turn', () => {
  assert.deepEqual(publicSpeechMovesForTurn({
    position: 'early',
    hasTargetablePublicEvidence: true,
    hasDirectedConcern: false,
    hasRevisablePrior: false,
    hasFutureSpeaker: true,
    hasCoveredJudgment: false,
    mustAllowExplosion: false,
  }), ['assess', 'hold'])
  assert.deepEqual(publicSpeechMovesForTurn({
    position: 'late',
    hasTargetablePublicEvidence: true,
    hasDirectedConcern: true,
    hasRevisablePrior: true,
    hasFutureSpeaker: false,
    hasCoveredJudgment: true,
    mustAllowExplosion: false,
  }), ['assess', 'respond', 'revise', 'commit', 'pass'])
  assert.deepEqual(publicSpeechMovesForTurn({
    position: 'early',
    hasTargetablePublicEvidence: false,
    hasDirectedConcern: false,
    hasRevisablePrior: false,
    hasFutureSpeaker: true,
    hasCoveredJudgment: false,
    mustAllowExplosion: false,
  }), ['hold', 'pass'])
  assert.deepEqual(publicSpeechMovesForTurn({
    position: 'early',
    hasTargetablePublicEvidence: true,
    hasDirectedConcern: false,
    hasRevisablePrior: false,
    hasFutureSpeaker: true,
    hasCoveredJudgment: false,
    mustAllowExplosion: true,
  }), ['assess', 'hold', 'pass'])
})

test('rejects judgment fields on conversational moves and missing fields on judgment moves', () => {
  assert.equal(publicSpeechMoveShapeIssue({
    move: 'respond',
    targetId: 'seat-2',
    stance: 'question',
    targets,
    stances,
  }), 'unexpected-judgment')
  assert.equal(publicSpeechMoveShapeIssue({
    move: 'revise',
    targetId: null,
    stance: null,
    targets,
    stances,
  }), 'invalid-target')
})

test('requires pass shape for an explosion', () => {
  assert.equal(publicSpeechMoveShapeIssue({
    action: 'explode',
    move: 'assess',
    targetId: null,
    stance: null,
    targets,
    stances,
  }), 'explosion-move')
  assert.equal(publicSpeechMoveShapeIssue({
    action: 'explode',
    move: 'pass',
    targetId: null,
    stance: null,
    targets,
    stances,
  }), undefined)
})

test('lets hold and pass omit evidence and normalizes pass to one table word', () => {
  assert.equal(publicSpeechMoveNeedsPublicEvidence('hold'), false)
  assert.equal(publicSpeechMoveNeedsPublicEvidence('pass'), false)
  for (const move of ['assess', 'respond', 'revise', 'commit']) {
    assert.equal(publicSpeechMoveNeedsPublicEvidence(move), true, move)
  }
  assert.equal(normalizePublicSpeechStatement('pass', '没有更多要说的'), '过')
  assert.equal(normalizePublicSpeechStatement('hold', '我还缺3号的解释。'), '我还缺3号的解释。')
  assert.equal(normalizePublicSpeechStatement(
    'hold',
    '目前信息太少，我还没有能落定的点，等后面发言。',
  ), '过')
  assert.equal(normalizePublicSpeechStatement(
    'hold',
    '我前面怀疑过3号，但今天还没有能对上的新依据，我等后面发言再看。',
  ), '过')
  assert.equal(normalizePublicSpeechStatement(
    'hold',
    '前面几位都是过，我没拿到更多信号，先定不下来这一票投谁。过。',
  ), '过')
  assert.equal(normalizePublicSpeechStatement(
    'assess',
    '5号昨天说先留判断，票却给了3号，这个前后对不太上，我先记下来，后面7号、11号发言再对照看。',
  ), '5号昨天说先留判断，票却给了3号，这个前后对不太上，我先记下来。')
  assert.equal(normalizePublicSpeechStatement(
    'hold',
    '前面几位基本都过了，我暂时没抓到别的矛盾，先看看后位有没有新信息。',
  ), '过')
  assert.equal(normalizePublicSpeechStatement(
    'assess',
    '我先把警长交给8号，他竞选时给出了明确的带队思路，这个态度我认可。',
  ), '他竞选时给出了明确的带队思路，这个态度我认可。')
  assert.equal(normalizePublicSpeechStatement(
    'assess',
    '我暂时看不清10号这套,先记下。',
  ), '我暂时看不清10号这套，先记下。')
})

test('rejects near-copy table speech without treating short shared terms as repetition', () => {
  const first = '我警长票已经投给6号，因为6号竞选时报出了昨晚查验8号是好人，还给了警徽流预案，比12号只讲空泛思路更实。今天我先跟6号的狼坑走。'
  const nearCopy = '我警长票也投了6号，因为6号竞选时报出昨晚查验8号是好人、还有警徽流预案，比12号只讲空泛带队思路更实。今天我想先听12号把具体范围说清楚，别一直停在口号上。'
  const independent = '我警长票给了12号，6号的查验和警徽流报得太顺，我想先看12号能不能把自己的范围落到具体人。'

  assert.equal(repeatedPublicStatementIndex(nearCopy, [first]), 0)
  assert.equal(repeatedPublicStatementIndex(independent, [first, nearCopy]), undefined)
  assert.equal(repeatedPublicStatementIndex('我也投了6号。', ['我警长票投给6号。']), undefined)
})

test('does not join identity certainty across separate clauses', () => {
  assert.deepEqual(certainPublicIdentityActorIds('结果已经确认8号是狼人。'), ['seat-8'])
  assert.deepEqual(certainPublicIdentityActorIds('1号已经确认是好人。'), ['seat-1'])
  assert.deepEqual(certainPublicIdentityActorIds(
    '我尊重投票结果，但我的查验就在那里：1号是好人。',
  ), [])
})

test('reads self-targets from every public ballot phase', () => {
  assert.deepEqual(publicBallotTargetIds([
    'sheriff-election:1:seat-1:seat-10',
    'sheriff-pk:1:seat-2:seat-10',
    'day:1:exile-vote:seat-3:seat-8',
    'day:1:pk-vote:seat-4:seat-8',
    'day:1:speech:seat-5',
  ]), ['seat-10', 'seat-8'])
})

test('finds players represented by actionable public evidence', () => {
  assert.deepEqual(publicEvidenceActorIds('sheriff:candidate:seat-9'), ['seat-9'])
  assert.deepEqual(publicEvidenceActorIds('day:1:speech:seat-8'), ['seat-8'])
  assert.deepEqual(
    publicEvidenceActorIds('sheriff-election:1:seat-3:seat-9'),
    ['seat-3', 'seat-9'],
  )
  assert.deepEqual(publicEvidenceActorIds('day:1:exile-vote:seat-3:abstain'), ['seat-3'])
  assert.deepEqual(publicEvidenceActorIds('day:1:announcement'), [])
})

test('recognizes a concrete question even when its target and request are separated by ballot detail', () => {
  assert.deepEqual(directedPublicFocusTargetIds(
    '10号把警长票投给了5号，轮到你时把这票的理由讲清楚，我先听这一点。',
  ), ['seat-10'])
  assert.deepEqual(directedPublicFocusTargetIds(
    '我想听10号解释一下这张警长票，其他位置暂时不展开。',
  ), ['seat-10'])
  assert.deepEqual(directedPublicFocusTargetIds(
    '10号已经把这张警长票的理由讲清楚了，我不再重复。',
  ), [])
  assert.deepEqual(directedPublicFocusTargetIds('我还缺3号的解释。'), ['seat-3'])
  assert.deepEqual(directedPublicFocusTargetIds(
    '我是预言家，昨晚查验3号是好人。',
  ), [])
  assert.deepEqual(directedPublicFocusTargetIds(
    '我想听听3号、9号、12号，你们那三票当时认了哪一点？',
  ), ['seat-3', 'seat-9', 'seat-12'])
})

test('recognizes an explicit first-person human concern without inferring negated advice', () => {
  assert.deepEqual(
    explicitPublicAttentionTargetIds('1号这个理由我不认，我先关注1号。'),
    ['seat-1'],
  )
  assert.deepEqual(explicitPublicAttentionTargetIds('我现在重点盯着8号。'), ['seat-8'])
  assert.deepEqual(explicitPublicAttentionTargetIds('我不关注3号，先听发言。'), [])
})

test('keeps the final named player aligned with the structured judgment target', () => {
  assert.equal(finalPublicSpeechTargetId(
    '8号先点出了7号照抄，我核对后也认为今天该出7号。',
  ), 'seat-7')
  assert.equal(finalPublicSpeechTargetId(
    '6号说验了1号，但这段查验没有接上公开票型，我今天不认6号。',
  ), 'seat-6')
  assert.equal(finalPublicSpeechTargetId('今天没有新的公开信息，过。'), undefined)
  assert.equal(finalPublicSpeechTargetId('13号不属于这张桌。'), undefined)
})

test('allows one actionable hold without repeating an earlier waiting target', () => {
  const base = {
    statement: '我还缺10号对昨天那张票的解释。',
    legalFutureTargetIds: ['seat-10', 'seat-11'],
    priorStatements: ['8号的警长票我暂时看不懂。'],
  }
  assert.equal(publicHoldTargetIssue(base), undefined)
  assert.equal(publicHoldTargetIssue({
    ...base,
    priorStatements: ['我也想听10号解释一下那张票。'],
  }), 'repeated-future-target')
  assert.equal(publicHoldTargetIssue({
    ...base,
    legalFutureTargetIds: ['seat-11'],
  }), 'unavailable-future-target')
  assert.equal(publicHoldTargetIssue({
    ...base,
    statement: '我想听10号，也想听11号。',
  }), 'multiple-future-targets')
  assert.equal(publicHoldTargetIssue({
    ...base,
    statement: '我想等后面再说。',
  }), 'missing-future-target')
})

test('binds ambiguous ballot pronouns to the structured public target', () => {
  assert.deepEqual(publicTargetPronounBallotClaims(
    '4号今天先点10号，他自己也是投了10号警长当选的那一边。',
    'seat-4',
    'seat-7',
  ), [{ voterId: 'seat-4', targetId: 'seat-10' }])
  assert.deepEqual(publicTargetPronounBallotClaims(
    '对方昨天投给了我，今天却完全不接这张票。',
    'seat-4',
    'seat-7',
  ), [{ voterId: 'seat-4', targetId: 'seat-7' }])
})

test('binds acknowledgement pronouns to the structured public target', () => {
  assert.deepEqual(publicAcknowledgementClaimActorIds(
    '你也认了，可轮到你只回一个“过”。',
    'seat-6',
  ), ['seat-6'])
  assert.deepEqual(publicAcknowledgementClaimActorIds(
    '他也自己认了，轮到自己解释却只回一个“过”。',
    'seat-6',
  ), ['seat-6'])
  assert.equal(publicStatementContainsFirstPersonAcknowledgement(
    '我认，那句话确实不妥。',
  ), true)
  assert.equal(publicStatementContainsFirstPersonAcknowledgement(
    'seat-9: 我认，那句话确实不妥。',
  ), true)
  assert.equal(publicStatementContainsFirstPersonAcknowledgement('过'), false)
})

test('rejects future dependencies on eliminated players without blocking historical review', () => {
  const inactive = ['seat-1', 'seat-9']
  assert.equal(inactivePublicTargetFutureReference(
    '9号和1号的情况还需要更多公开信息，我先保留判断。',
    inactive,
  ), 'seat-1')
  assert.equal(inactivePublicTargetFutureReference(
    '1号已经出局，他昨天投给8号的记录还可以回看。',
    inactive,
  ), undefined)
  assert.equal(inactivePublicTargetFutureReference(
    '10号和7号都出局了，前面的两条线没法再核对。',
    ['seat-7', 'seat-10'],
  ), undefined)
})

test('finds response requests directed at players whose speaking turn already ended', () => {
  const unavailable = ['seat-2', 'seat-5']
  assert.equal(unavailablePublicTargetResponseRequest(
    '我想问问5号，你这张票准备怎么解释？',
    unavailable,
  ), 'seat-5')
  assert.equal(unavailablePublicTargetResponseRequest(
    '我先听5号补一句，再决定这一票。',
    unavailable,
  ), 'seat-5')
  assert.equal(unavailablePublicTargetResponseRequest(
    '我先把票跟到11号这边，看看5号后面怎么解释再说。',
    unavailable,
  ), 'seat-5')
  assert.equal(unavailablePublicTargetResponseRequest(
    '警长既然说查了5号是狼，我先把票给5号，跟警长看看后面怎么解释。',
    unavailable,
  ), 'seat-5')
  assert.equal(unavailablePublicTargetResponseRequest(
    '4号后续有实际动作我再判断，现在先不下结论。',
    ['seat-4'],
  ), 'seat-4')
  assert.equal(unavailablePublicTargetResponseRequest(
    '我先看看9号和4号后面怎么走。',
    ['seat-4'],
  ), 'seat-4')
  assert.equal(unavailablePublicTargetResponseRequest(
    '4号自己得出面接住这条查验。',
    ['seat-4'],
  ), 'seat-4')
  assert.equal(unavailablePublicTargetResponseRequest(
    '6号你先正面讲讲这个判断依据吧。',
    ['seat-6'],
  ), 'seat-6')
  assert.equal(unavailablePublicTargetResponseRequest(
    '还是希望后面6号能正面讲清楚。',
    ['seat-6'],
  ), 'seat-6')
  assert.equal(unavailablePublicTargetResponseRequest(
    '5号你自己这一轮除了这句还看不出立场，轮到时把话说实一点。',
    ['seat-5'],
  ), 'seat-5')
  assert.equal(unavailablePublicTargetResponseRequest(
    '3号你这轮把话说满一点，我先把你也记进观察范围里。',
    ['seat-3'],
  ), 'seat-3')
  assert.equal(unavailablePublicTargetResponseRequest(
    '3号这轮已经把话说得很满，我不认同。',
    ['seat-3'],
  ), undefined)
  assert.equal(unavailablePublicTargetResponseRequest(
    '我想听后位8号说说这张票。',
    unavailable,
  ), undefined)
  assert.equal(unavailablePublicTargetResponseRequest(
    '我想看看4号自己怎么接。',
    unavailable,
  ), undefined)
  assert.equal(unavailablePublicTargetResponseRequest(
    '5号昨天投给8号，这条公开记录还可以回看。',
    unavailable,
  ), undefined)
})

test('rejects a missing ballot explanation before the voter has a speaking turn', () => {
  const future = ['seat-10', 'seat-11', 'seat-12']
  assert.equal(prematurePublicBallotExplanationTarget(
    '11号那票一直没给过理由，我心里记着这条线。',
    future,
  ), 'seat-11')
  assert.equal(prematurePublicBallotExplanationTarget(
    '11号那票至今没给过理由，这个我记着。',
    future,
  ), 'seat-11')
  assert.equal(prematurePublicBallotExplanationTarget(
    '11号轮到你时，只说清楚你这张警长票的理由。',
    future,
  ), undefined)
  assert.equal(prematurePublicBallotExplanationTarget(
    '11号那票一直没给过理由，我心里记着这条线。',
    ['seat-12'],
  ), undefined)
})

test('rejects one unavailable player inside a directed seat list', () => {
  assert.equal(unavailablePublicTargetResponseRequest(
    '我想听听3号、9号、12号，你们那三票当时认了哪一点？',
    ['seat-1', 'seat-2', 'seat-3', 'seat-4'],
  ), 'seat-3')
})

test('requires revise to change an earlier judgment on newly cited public information', () => {
  const base = {
    move: 'revise',
    targetId: 'seat-2',
    evidenceIds: ['day:2:speech:seat-2'],
    publicEvidenceIds: ['day:2:speech:seat-2'],
    prior: { targetId: 'seat-2', stance: 'trust', evidenceIds: ['day:1:speech:seat-2'] },
    coveredTargetIds: [],
  }
  assert.equal(publicSpeechMoveContextIssue({ ...base, stance: 'suspect' }), undefined)
  assert.equal(publicSpeechMoveContextIssue({ ...base, stance: 'trust' }), 'revise-without-prior-change')
  assert.equal(publicSpeechMoveContextIssue({
    ...base,
    stance: 'suspect',
    evidenceIds: ['day:1:speech:seat-2'],
  }), 'revise-without-new-evidence')
  assert.equal(publicSpeechMoveContextIssue({
    ...base,
    targetId: 'seat-3',
    stance: 'trust',
  }), undefined)
  assert.equal(publicSpeechMoveContextIssue({
    ...base,
    move: 'assess',
    stance: 'suspect',
  }), 'change-without-revise')
  assert.equal(publicSpeechMoveContextIssue({
    move: 'revise',
    targetId: 'seat-2',
    stance: 'suspect',
    evidenceIds: ['day:2:speech:seat-2'],
    publicEvidenceIds: ['day:2:speech:seat-2'],
    coveredTargetIds: [],
  }), 'revise-without-prior-change')
})

test('allows commit only when it carries an existing candidate', () => {
  const base = {
    move: 'commit',
    targetId: 'seat-2',
    stance: 'suspect',
    evidenceIds: ['day:2:speech:seat-3'],
    publicEvidenceIds: ['day:2:speech:seat-3'],
  }
  assert.equal(publicSpeechMoveContextIssue({ ...base, coveredTargetIds: [] }), 'commit-without-candidate')
  assert.equal(publicSpeechMoveContextIssue({ ...base, coveredTargetIds: ['seat-2'] }), undefined)
})

test('revise compares the latest judgment while other moves preserve the same target', () => {
  const oldTarget = { targetId: 'seat-2', stance: 'trust' }
  const latest = { targetId: 'seat-3', stance: 'suspect' }
  const history = [oldTarget, latest]

  assert.equal(selectPublicSpeechPrior('revise', 'seat-2', history), latest)
  assert.equal(selectPublicSpeechPrior('assess', 'seat-2', history), oldTarget)
})

test('keeps one table perspective before requiring new evidence on one judgment family', () => {
  const judgments = [
    { actorId: 'seat-1', targetId: 'seat-9', stance: 'observe' },
    { actorId: 'seat-2', targetId: 'seat-9', stance: 'question' },
    { actorId: 'seat-3', targetId: 'seat-9', stance: 'trust' },
  ]

  assert.equal(publicSpeechJudgmentFamily('suspect'), 'attention')
  assert.deepEqual(
    selectSaturatedPublicJudgment(judgments.slice(0, 1), 'seat-9', 'suspect'),
    judgments[0],
  )
  assert.deepEqual(selectSaturatedPublicJudgment(judgments, 'seat-9', 'trust'), judgments[2])
})

test('admits one closing judgment after the opening table perspective', () => {
  const judgments = [
    { actorId: 'seat-1', targetId: 'seat-9', stance: 'observe' },
    { actorId: 'seat-2', targetId: 'seat-9', stance: 'question' },
    { actorId: 'seat-3', targetId: 'seat-9', stance: 'suspect' },
  ]

  assert.equal(publicSpeechJudgmentCapacity('assess'), 1)
  assert.equal(publicSpeechJudgmentCapacity('commit'), 2)
  assert.equal(
    selectSaturatedPublicJudgment(
      judgments.slice(0, 1),
      'seat-9',
      'suspect',
      publicSpeechJudgmentCapacity('commit'),
    ),
    undefined,
  )
  assert.deepEqual(
    selectSaturatedPublicJudgment(
      judgments.slice(0, 2),
      'seat-9',
      'suspect',
      publicSpeechJudgmentCapacity('commit'),
    ),
    judgments[1],
  )
})

test('accepts a response to an existing structured concern', () => {
  const judgments = [
    { targetId: 'seat-11', stance: 'question' },
    { targetId: 'seat-5', stance: 'trust' },
  ]

  assert.equal(publicResponseIsGrounded(judgments, 'seat-11', false), true)
  assert.equal(publicResponseIsGrounded(judgments, 'seat-5', false), false)
  assert.equal(publicResponseIsGrounded([], 'seat-11', true), true)
})

test('keeps a response on itself or the player whose concern it answers', () => {
  assert.equal(publicResponseFinalTargetIsGrounded(
    '4号说我竞选没给可验证的信息，这点我认。',
    'seat-5',
    ['seat-4'],
  ), true)
  assert.equal(publicResponseFinalTargetIsGrounded(
    '这项质疑我已经回应完了。',
    'seat-5',
    ['seat-4'],
  ), true)
  assert.equal(publicResponseFinalTargetIsGrounded(
    '我不认4号这句话。',
    'seat-5',
    ['seat-4'],
  ), true)
  assert.equal(publicResponseFinalTargetIsGrounded(
    '4号说我竞选没给可验证的信息，这点我认；6号的查验仍然只有他自己宣称。',
    'seat-5',
    ['seat-4'],
  ), false)
})

test('recognizes corroboration negated before or after the verb', () => {
  assert.equal(publicStatementNegatesCorroboration('平安夜不能证明8号是预言家。'), true)
  assert.equal(publicStatementNegatesCorroboration('平安夜，这条查验没法印证。'), true)
  assert.equal(publicStatementNegatesCorroboration('第一天平安夜，查验没有外界印证。'), true)
  assert.equal(publicStatementNegatesCorroboration('平安夜也证明不了8号的预言家身份。'), true)
  assert.equal(publicStatementNegatesCorroboration('平安夜证明了8号是预言家。'), false)
})

test('rejects listing an absent no-death night as missing Seer corroboration', () => {
  assert.equal(publicStatementMisusesNoDeathCorroboration(
    '12号这句查验没有平安夜，也没有别的记录能支撑。',
  ), true)
  assert.equal(publicStatementMisusesNoDeathCorroboration(
    '我手头既没有平安夜，也没有记录能给这句查验背书。',
  ), true)
  assert.equal(publicStatementMisusesNoDeathCorroboration(
    '平安夜不能证明8号是预言家。',
  ), false)
  assert.equal(publicStatementMisusesNoDeathCorroboration(
    '这项查验目前只有12号自己的宣称，尚无其他公开记录可核对。',
  ), false)
})

test('rejects night survival or death as evidence for a Seer result', () => {
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '9号说查验11号是好人，可首晚出局的是2号，11号并没被狼刀过，这条查验没有公开印证。',
  ), true)
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '9号首夜查验11号好人，2号首晚出局说明这条查验暂时没法当凭据。',
  ), true)
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '9号首夜查验11号，目前只有本人宣称，11号今天还活着没有反证。',
  ), true)
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '11号还活着不能反驳9号的查验。',
  ), false)
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '2号夜里死亡不能证明9号查验11号是真的。',
  ), false)
  assert.equal(publicStatementMisusesNightOutcomeCorroboration(
    '2号的死亡和9号查验11号是两回事。',
  ), false)
})

test('rejects demands for evidence before a first-night Seer inspection', () => {
  assert.equal(publicStatementRequiresPriorBasisForSeerClaim(
    '2号这句查验没有任何前置依据便能说出口，我先不认。',
  ), true)
  assert.equal(publicStatementRequiresPriorBasisForSeerClaim(
    '除了那句查验，他没有给出任何前置支撑。',
  ), true)
  assert.equal(publicStatementRequiresPriorBasisForSeerClaim(
    '1号说查验没有前置依据，可预言家首夜给出的就是查验本身。',
  ), false)
  assert.equal(publicStatementRequiresPriorBasisForSeerClaim(
    '这项查验目前只有2号自己的宣称，尚无其他公开记录可核对。',
  ), false)
})

test('distinguishes a reported wolf accusation from direct self-disclosure', () => {
  assert.equal(publicStatementDisclosesWolfAlignment(
    '8号在警上自称预言家直接点我是狼，可他的查验我不认。',
  ), false)
  assert.equal(publicStatementDisclosesWolfAlignment('其实我是狼，今天我认出。'), true)
  assert.equal(publicStatementDisclosesWolfAlignment('我属于狼人阵营。'), true)
  assert.equal(publicStatementDisclosesWolfAlignment('我得保护我的狼队友。'), true)
})

test('pairs a denied Seer result with the public claim it contradicts', () => {
  assert.deepEqual(deniedPublicSeerClaims(
    '8号从头到尾只投过6号一票，从没说过查验6号。',
  ), [{ actorId: 'seat-8', targetId: 'seat-6' }])
  assert.deepEqual(deniedPublicSeerClaims(
    '8号查验6号这件事我不信。',
  ), [])
  assert.deepEqual(publicSeerClaimTargetIds(
    '我是预言家，首夜查验6号为狼人，第二夜验了10号。',
  ), ['seat-6', 'seat-10'])
})

test('requires one final first-night inspection in a Seer campaign claim', () => {
  assert.equal(publicSeerCampaignClaimIssue(
    '我是预言家，昨晚查验3号是好人。',
  ), undefined)
  assert.equal(publicSeerCampaignClaimIssue(
    '我是预言家，警徽流先按位置验人。',
  ), 'missing-target')
  assert.equal(publicSeerCampaignClaimIssue(
    '我是预言家，昨晚查验6号……不，我查验了3号，3号是好人。',
  ), 'multiple-targets')
})

test('distinguishes current Sheriff authority from a conditional campaign plan', () => {
  assert.equal(publicStatementClaimsCurrentSheriffAuthority(
    '警徽在我这里，预言家可以安全报查验。',
  ), true)
  assert.equal(publicStatementClaimsCurrentSheriffAuthority(
    '如果我拿到警徽，我会先听完一轮再归票。',
  ), false)
})
