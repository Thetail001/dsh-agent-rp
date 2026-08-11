import assert from 'node:assert/strict'
import test from 'node:test'
import { Config } from '../src/config.ts'

test('uses one supported bounded effort for every Character decision by default', () => {
  const config = Config({})

  assert.equal(config.decisionReasoningEffort, 'off')
  assert.equal(config.discussionReasoningEffort, 'off')
  assert.equal(config.decisionMaxTokens, 2_048)
  assert.equal(config.discussionMaxTokens, 2_048)
  assert.equal(config.discussionAttemptLimit, 3)
})

test('rejects a reasoning effort that the DeepSeek adapter does not advertise', () => {
  assert.throws(() => Config({ discussionReasoningEffort: 'medium' } as never))
})

test('bounds public discussion attempts', () => {
  assert.throws(() => Config({ discussionAttemptLimit: 0 }))
  assert.throws(() => Config({ discussionAttemptLimit: 6 }))
})
