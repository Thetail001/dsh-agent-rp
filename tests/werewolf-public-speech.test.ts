import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizePublicSpeechStatement,
  publicSpeechMoveCarriesJudgment,
  publicSpeechMoveContextIssue,
  publicSpeechMoveNeedsPublicEvidence,
  publicSpeechMoveShapeIssue,
  selectPublicSpeechPrior,
  STANDARD_WEREWOLF_PUBLIC_SPEECH_MOVES,
} from '../.dsh-plugin/src/werewolf/werewolf-public-speech.ts'

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
