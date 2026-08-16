import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readApprovalSet,
  writeApprovalSet,
  type ApprovalStorage,
} from '../src/client/approval-storage.ts'
import {
  readAgentRpSessionResourcePermissions,
  withAgentRpSessionCardPermissions,
  writeAgentRpSessionResourcePermissions,
} from '../src/client/session-permission.ts'

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

test('keeps exact one-Session resources separate from durable card approvals', () => {
  const storage = new MemoryApprovalStorage()
  writeAgentRpSessionResourcePermissions(storage, 'session-a', {
    tavern: {
      scripts: ['script-b', 'script-a', 'script-a'],
      images: ['image-a'],
      frames: [],
    },
    card: [
      { origin: 'https://images.example.test', type: 'image' },
      { origin: 'https://images.example.test', type: 'image' },
    ],
  })

  const permissions = readAgentRpSessionResourcePermissions(storage, 'session-a')
  assert.deepEqual(permissions, {
    tavern: { scripts: ['script-a', 'script-b'], images: ['image-a'], frames: [] },
    card: [{ origin: 'https://images.example.test', type: 'image' }],
  })
  assert.deepEqual(readAgentRpSessionResourcePermissions(storage, 'session-b'), {
    tavern: { scripts: [], images: [], frames: [] }, card: [],
  })
  assert.deepEqual(withAgentRpSessionCardPermissions({
    id: 'card-a',
    approvedRemoteResources: [{ origin: 'https://styles.example.test', type: 'style' as const }],
  }, permissions), {
    id: 'card-a',
    approvedRemoteResources: [
      { origin: 'https://images.example.test', type: 'image' },
      { origin: 'https://styles.example.test', type: 'style' },
    ],
  })
})

test('ignores malformed browser-tab resource permissions', () => {
  const storage = new MemoryApprovalStorage()
  storage.setItem('dsh.agent-rp.session-resource-permissions-v1:session-a', JSON.stringify({
    tavern: { scripts: ['ok', 3], images: 'wrong', frames: [] },
    card: [
      { origin: 'http://unsafe.example.test', type: 'image' },
      { origin: 'https://safe.example.test', type: 'unknown' },
    ],
  }))

  assert.deepEqual(readAgentRpSessionResourcePermissions(storage, 'session-a'), {
    tavern: { scripts: ['ok'], images: [], frames: [] }, card: [],
  })
})
