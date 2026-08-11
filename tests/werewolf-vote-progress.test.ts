import assert from 'node:assert/strict'
import test from 'node:test'
import { completeVoteProgress } from '../src/werewolf/werewolf-vote-progress.ts'

test('counts the direct ballot in the complete eligible voter pool', () => {
  assert.deepEqual(completeVoteProgress(true, 0, 9), { completed: 1, total: 10 })
  assert.deepEqual(completeVoteProgress(true, 4, 9), { completed: 5, total: 10 })
})

test('does not invent a ballot when the direct player is ineligible', () => {
  assert.deepEqual(completeVoteProgress(false, 0, 9), { completed: 0, total: 9 })
  assert.deepEqual(completeVoteProgress(false, 4, 9), { completed: 4, total: 9 })
})
