import assert from 'node:assert/strict'
import test from 'node:test'
import {
  completeDirectProgress,
  completeDiscussionProgress,
} from '../src/werewolf/werewolf-progress-counts.ts'

test('counts a completed direct action in the full eligible participant pool', () => {
  assert.deepEqual(completeDirectProgress(true, 0, 9), { completed: 1, total: 10 })
  assert.deepEqual(completeDirectProgress(true, 4, 9), { completed: 5, total: 10 })
})

test('does not invent a direct action for an ineligible player', () => {
  assert.deepEqual(completeDirectProgress(false, 0, 9), { completed: 0, total: 9 })
  assert.deepEqual(completeDirectProgress(false, 4, 9), { completed: 4, total: 9 })
})

test('counts committed, direct, and Character speakers once across the living table', () => {
  assert.deepEqual(completeDiscussionProgress(
    ['seat-1', 'seat-2', 'seat-3', 'seat-4'],
    ['seat-1'],
    ['seat-2', 'seat-3'],
  ), { completed: 3, total: 4 })
  assert.deepEqual(completeDiscussionProgress(
    ['seat-1', 'seat-2', 'seat-3', 'seat-4'],
    ['seat-1', 'seat-2'],
    ['seat-2', 'seat-3', 'seat-5'],
  ), { completed: 3, total: 4 })
})
