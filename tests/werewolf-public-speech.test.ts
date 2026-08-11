import assert from 'node:assert/strict'
import test from 'node:test'
import {
  inactivePublicTargetFutureReference,
  normalizePublicSpeechStatement,
  publicTargetPronounBallotClaims,
  publicSpeechMoveCarriesJudgment,
  publicSpeechMoveContextIssue,
  publicSpeechMoveNeedsPublicEvidence,
  publicSpeechMoveShapeIssue,
  selectPublicSpeechPrior,
  STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES,
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
