import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ROLEPLAY_SESSION_EVENT_TYPES,
  registerRoleplaySessionEventTypes,
} from '../src/runtime/session-event-vocabulary.ts'

test('registers the complete Roleplay vocabulary for rc.2 persistence', () => {
  const knownEventTypes = new Set(['user/message', 'rp/seed'])
  const baseline = new Map(ROLEPLAY_SESSION_EVENT_TYPES.map(type => [type, knownEventTypes.has(type)]))
  const releaseFirst = registerRoleplaySessionEventTypes(knownEventTypes)
  const releaseSecond = registerRoleplaySessionEventTypes(knownEventTypes)

  for (const type of ROLEPLAY_SESSION_EVENT_TYPES) assert.equal(knownEventTypes.has(type), true)

  releaseFirst()
  for (const type of ROLEPLAY_SESSION_EVENT_TYPES) assert.equal(knownEventTypes.has(type), true)

  releaseSecond()
  for (const type of ROLEPLAY_SESSION_EVENT_TYPES) {
    assert.equal(knownEventTypes.has(type), baseline.get(type))
  }
})

test('registration disposal is idempotent', () => {
  const knownEventTypes = new Set(['user/message'])
  const baseline = new Map(ROLEPLAY_SESSION_EVENT_TYPES.map(type => [type, knownEventTypes.has(type)]))
  const release = registerRoleplaySessionEventTypes(knownEventTypes)

  release()
  release()

  for (const type of ROLEPLAY_SESSION_EVENT_TYPES) {
    assert.equal(knownEventTypes.has(type), baseline.get(type))
  }
})
