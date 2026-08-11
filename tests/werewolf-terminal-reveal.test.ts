import assert from 'node:assert/strict'
import test from 'node:test'
import { terminalRoleFactIds } from '../src/werewolf/werewolf-terminal-reveals.ts'

test('terminal disclosure omits a role revealed earlier in the same transaction', () => {
  const roleFactIds = ['seat-1-role', 'seat-2-role', 'seat-3-role'] as const

  assert.deepEqual(
    terminalRoleFactIds(roleFactIds, ['seat-2-role']),
    ['seat-1-role', 'seat-3-role'],
  )
})
