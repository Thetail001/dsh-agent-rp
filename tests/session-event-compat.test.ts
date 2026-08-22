import assert from 'node:assert/strict'
import test from 'node:test'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { appendAgentRpSessionEvent, supportsAgentRpSessionEvents } from '../src/session-event-compat.ts'
import type {} from '../src/roleplay-state.ts'

test('refuses an unsafe fallback without changing a published-host Session', () => {
  const session = Session.create(SessionId('published-host-without-plugin-events'))

  assert.equal(supportsAgentRpSessionEvents(session), false)
  assert.throws(() => appendAgentRpSessionEvent(session, 'agent-rp/state', {
    format: 0,
    id: 'state:fixture',
    revision: 1,
    ownerModuleId: 'roleplay:fixture',
    writerModuleId: 'roleplay:fixture',
    value: { safe: true },
  }), /已拒绝写入/u)
  assert.equal(session.seq, 0)
  assert.deepEqual(session.events, [])
})
