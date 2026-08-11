import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoleplayActorId } from '../src/runtime/index.ts'
import { completeWolfBallotTargets } from '../src/werewolf/wolf-ballot.ts'

const actor = (value: string): RoleplayActorId => value as RoleplayActorId

test('completes only missing Character ballots without promoting the direct seat', () => {
  const human = actor('seat-1')
  const wolves = [actor('seat-2'), actor('seat-3'), actor('seat-4')]
  const fallbackActors: RoleplayActorId[] = []

  const completed = completeWolfBallotTargets(
    new Map([[human, actor('seat-8')]]),
    wolves,
    [actor('seat-7'), undefined, actor('seat-6')],
    (actorId) => {
      fallbackActors.push(actorId)
      return actor('seat-5')
    },
  )

  assert.deepEqual([...completed], [
    [human, actor('seat-8')],
    [wolves[0], actor('seat-7')],
    [wolves[1], actor('seat-5')],
    [wolves[2], actor('seat-6')],
  ])
  assert.deepEqual(fallbackActors, [wolves[1]])
})

test('an entirely expired Character pack still produces one independent ballot per seat', () => {
  const wolves = [actor('seat-9'), actor('seat-10'), actor('seat-11'), actor('seat-12')]
  const fallbackTargets = new Map(wolves.map((actorId, index) => [actorId, actor(`seat-${index + 1}`)]))

  const completed = completeWolfBallotTargets(
    new Map(),
    wolves,
    wolves.map(() => undefined),
    actorId => fallbackTargets.get(actorId)!,
  )

  assert.equal(completed.size, wolves.length)
  assert.deepEqual([...completed.values()], [...fallbackTargets.values()])
})

test('a missing final ballot can retain that seat\'s recorded proposal', () => {
  const wolves = [actor('seat-9'), actor('seat-10')]
  const proposals = new Map([
    [wolves[0], actor('seat-3')],
    [wolves[1], actor('seat-4')],
  ])

  const completed = completeWolfBallotTargets(
    new Map(),
    wolves,
    [actor('seat-5'), undefined],
    actorId => proposals.get(actorId)!,
  )

  assert.deepEqual([...completed], [
    [wolves[0], actor('seat-5')],
    [wolves[1], actor('seat-4')],
  ])
})
