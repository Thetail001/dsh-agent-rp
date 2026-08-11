import assert from 'node:assert/strict'
import test from 'node:test'
import type { Session } from '@deepseek-ai/dsh-session'
import { asRoleplayActorId } from '../src/runtime/ids.ts'
import { appendStandardWerewolfDecisionFailure } from '../src/werewolf/werewolf-diagnostics.ts'

test('logs only the safe classification of a discarded Character attempt', () => {
  const appended: unknown[] = []
  const session = {
    append(type: string, data: unknown) {
      appended.push({ type, data })
    },
  } as unknown as Session

  appendStandardWerewolfDecisionFailure(
    session,
    41,
    7,
    'discussion-2',
    {
      actorId: asRoleplayActorId('seat-5'),
      kind: 'invalid',
      issue: 'hold-grounding',
      message: 'rejected model text must not be retained',
    },
  )

  assert.deepEqual(appended, [{
    type: 'werewolf/decision-failure',
    data: {
      version: 0,
      sourceEventSeq: 41,
      baseRevision: 7,
      phase: 'discussion-2',
      actorId: 'seat-5',
      kind: 'invalid',
      issue: 'hold-grounding',
    },
  }])
})
