import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readApprovalSet,
  writeApprovalSet,
  type ApprovalStorage,
} from '../src/client/approval-storage.ts'

class MemoryApprovalStorage implements ApprovalStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

test('reads only bounded string permission keys and ignores corrupt payloads', () => {
  const storage = new MemoryApprovalStorage()
  storage.setItem('approvals', JSON.stringify(['beta', 3, 'toolong', 'alpha', null]))
  assert.deepEqual([...readApprovalSet(storage, 'approvals', 5)], ['beta', 'alpha'])

  storage.setItem('approvals', '{invalid')
  assert.deepEqual([...readApprovalSet(storage, 'approvals', 5)], [])
  storage.setItem('approvals', JSON.stringify({ value: 'not-an-array' }))
  assert.deepEqual([...readApprovalSet(storage, 'approvals', 5)], [])
})

test('writes deterministic permission sets without changing their exact keys', () => {
  const storage = new MemoryApprovalStorage()
  writeApprovalSet(storage, 'approvals', new Set(['zeta', '["card",true]', 'alpha']))
  assert.equal(storage.getItem('approvals'), JSON.stringify(['["card",true]', 'alpha', 'zeta']))
})
