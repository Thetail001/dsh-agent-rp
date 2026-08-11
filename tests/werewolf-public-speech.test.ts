import assert from 'node:assert/strict'
import test from 'node:test'
import {
  directedPublicFocusTargetIds,
  finalPublicSpeechTargetId,
  inactivePublicTargetFutureReference,
  normalizePublicSpeechStatement,
  publicHoldTargetIssue,
  publicSpeechJudgmentFamily,
  publicSpeechMovesForPosition,
  publicTargetPronounBallotClaims,
  publicSpeechMoveCarriesJudgment,
  publicSpeechMoveContextIssue,
  publicSpeechMoveNeedsPublicEvidence,
  publicSpeechMoveShapeIssue,
  publicResponseIsGrounded,
  publicStatementDisclosesWolfAlignment,
  publicStatementNegatesCorroboration,
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

test('reserves commit for closing speakers', () => {
  assert.equal(publicSpeechMovesForPosition('early').includes('commit'), false)
  assert.equal(publicSpeechMovesForPosition('middle').includes('commit'), false)
  assert.equal(publicSpeechMovesForPosition('late').includes('commit'), true)
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

test('keeps two table perspectives before requiring new evidence on one judgment family', () => {
  const judgments = [
    { actorId: 'seat-1', targetId: 'seat-9', stance: 'observe' },
    { actorId: 'seat-2', targetId: 'seat-9', stance: 'question' },
    { actorId: 'seat-3', targetId: 'seat-9', stance: 'trust' },
  ]

  assert.equal(publicSpeechJudgmentFamily('suspect'), 'attention')
  assert.equal(selectSaturatedPublicJudgment(judgments.slice(0, 1), 'seat-9', 'suspect'), undefined)
  assert.deepEqual(
    selectSaturatedPublicJudgment(judgments, 'seat-9', 'suspect'),
    judgments[1],
  )
  assert.equal(selectSaturatedPublicJudgment(judgments, 'seat-9', 'trust'), undefined)
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

test('recognizes corroboration negated before or after the verb', () => {
  assert.equal(publicStatementNegatesCorroboration('平安夜不能证明8号是预言家。'), true)
  assert.equal(publicStatementNegatesCorroboration('平安夜也证明不了8号的预言家身份。'), true)
  assert.equal(publicStatementNegatesCorroboration('平安夜证明了8号是预言家。'), false)
})

test('distinguishes a reported wolf accusation from direct self-disclosure', () => {
  assert.equal(publicStatementDisclosesWolfAlignment(
    '8号在警上自称预言家直接点我是狼，可他的查验我不认。',
  ), false)
  assert.equal(publicStatementDisclosesWolfAlignment('其实我是狼，今天我认出。'), true)
  assert.equal(publicStatementDisclosesWolfAlignment('我属于狼人阵营。'), true)
  assert.equal(publicStatementDisclosesWolfAlignment('我得保护我的狼队友。'), true)
})
