/** Strict replay reducer and observer projection for the canonical Storyworld. @module @deepseek-ai/dsh-roleplay/reducer */

import { assertNever, deepFreeze } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { RoleplayError } from './error.ts'
import { decodeRoleplayCommit, decodeRoleplaySeed } from './schema.ts'
import type {
  RoleplayActor,
  RoleplayFact,
  RoleplayObserverId,
  RoleplaySeed,
  RoleplayVisibility,
  RoleplayView,
  RoleplayWorldEvent,
  Storyworld,
} from './types.ts'

/** Reject an empty identifier or human-readable field at the semantic boundary. */
function requireText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new RoleplayError(`${label} must be non-empty`, 'ROLEPLAY_INVALID_DATA')
  }
}

/** Reject a duplicate id while constructing one indexed seed domain. */
function requireUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    requireText(value, label)
    if (seen.has(value)) {
      throw new RoleplayError(`${label} ${JSON.stringify(value)} is duplicated`, 'ROLEPLAY_INVALID_DATA')
    }
    seen.add(value)
  }
}

/** Validate one observer policy against its owning Storyworld domain. */
function validateVisibility(
  visibility: RoleplayVisibility,
  observerIds: ReadonlySet<RoleplayObserverId>,
  label: string,
): void {
  if (visibility.kind === 'public') return
  requireUnique(visibility.observerIds, `${label} observer id`)
  for (const observerId of visibility.observerIds) {
    if (!observerIds.has(observerId)) {
      throw new RoleplayError(
        `${label} names unknown observer ${JSON.stringify(observerId)}`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
  }
}

/** Validate semantic links inside a structurally valid seed. */
function validateSeed(seed: RoleplaySeed): void {
  if (seed.observers.length === 0) {
    throw new RoleplayError('roleplay seed requires at least one observer', 'ROLEPLAY_INVALID_DATA')
  }
  if (seed.actors.length === 0) {
    throw new RoleplayError('roleplay seed requires at least one actor', 'ROLEPLAY_INVALID_DATA')
  }
  requireUnique(seed.observers.map(observer => observer.id), 'observer id')
  requireUnique(seed.actors.map(actor => actor.id), 'actor id')
  requireUnique(seed.facts.map(fact => fact.id), 'fact id')
  const observerIds = new Set(seed.observers.map(observer => observer.id))
  const actorIds = new Set(seed.actors.map(actor => actor.id))
  for (const observer of seed.observers) requireText(observer.name, `observer ${JSON.stringify(observer.id)} name`)
  for (const actor of seed.actors) {
    requireText(actor.name, `actor ${JSON.stringify(actor.id)} name`)
    requireText(actor.location, `actor ${JSON.stringify(actor.id)} location`)
    if (!observerIds.has(actor.observerId)) {
      throw new RoleplayError(
        `actor ${JSON.stringify(actor.id)} names unknown observer ${JSON.stringify(actor.observerId)}`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    requireUnique(actor.relationships.map(relationship => relationship.actorId), `actor ${JSON.stringify(actor.id)} relationship target`)
    for (const relationship of actor.relationships) {
      if (!actorIds.has(relationship.actorId)) {
        throw new RoleplayError(
          `actor ${JSON.stringify(actor.id)} relates to unknown actor ${JSON.stringify(relationship.actorId)}`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      if (!Number.isSafeInteger(relationship.affinity)) {
        throw new RoleplayError('relationship affinity must be a safe integer', 'ROLEPLAY_INVALID_DATA')
      }
    }
  }
  for (const fact of seed.facts) {
    requireText(fact.text, `fact ${JSON.stringify(fact.id)} text`)
    validateVisibility(fact.visibility, observerIds, `fact ${JSON.stringify(fact.id)}`)
  }
  requireText(seed.scene.location, 'scene location')
  if (seed.scene.participantIds.length === 0) {
    throw new RoleplayError('scene requires at least one participant', 'ROLEPLAY_INVALID_DATA')
  }
  requireUnique(seed.scene.participantIds, 'scene participant id')
  for (const actorId of seed.scene.participantIds) {
    if (!actorIds.has(actorId)) {
      throw new RoleplayError(`scene names unknown actor ${JSON.stringify(actorId)}`, 'ROLEPLAY_INVALID_DATA')
    }
  }
}

/**
 * Build revision zero from one validated seed.
 * @param candidate - untrusted or caller-owned seed value.
 * @returns the immutable initial Storyworld.
 */
export function storyworldFromSeed(candidate: unknown): Storyworld {
  const seed = decodeRoleplaySeed(candidate)
  validateSeed(seed)
  return deepFreeze({
    revision: 0,
    observers: seed.observers,
    actors: seed.actors,
    facts: seed.facts,
    scene: seed.scene,
    choices: [],
  })
}

/** Find one canonical actor or reject the resolver-produced reference. */
function actorAt(world: Storyworld, actorId: string): { actor: RoleplayActor; index: number } {
  const index = world.actors.findIndex(actor => actor.id === actorId)
  const actor = world.actors[index]
  if (actor === undefined) {
    throw new RoleplayError(`world event names unknown actor ${JSON.stringify(actorId)}`, 'ROLEPLAY_INVALID_DATA')
  }
  return { actor, index }
}

/** Find one canonical fact or reject the resolver-produced reference. */
function factAt(world: Storyworld, factId: string): { fact: RoleplayFact; index: number } {
  const index = world.facts.findIndex(fact => fact.id === factId)
  const fact = world.facts[index]
  if (fact === undefined) {
    throw new RoleplayError(`world event names unknown fact ${JSON.stringify(factId)}`, 'ROLEPLAY_INVALID_DATA')
  }
  return { fact, index }
}

/** Apply one trusted resolver event without advancing the transaction revision. */
function applyWorldEvent(world: Storyworld, event: RoleplayWorldEvent): Storyworld {
  switch (event.kind) {
    case 'actor/move': {
      const { actor, index } = actorAt(world, event.actorId)
      requireText(event.location, 'actor/move location')
      if (actor.location === event.location) {
        throw new RoleplayError(`actor ${JSON.stringify(event.actorId)} is already at ${JSON.stringify(event.location)}`, 'ROLEPLAY_INVALID_DATA')
      }
      const actors = [...world.actors]
      actors[index] = { ...actor, location: event.location }
      return { ...world, actors }
    }
    case 'relationship/adjust': {
      const { actor, index } = actorAt(world, event.actorId)
      actorAt(world, event.targetId)
      if (!Number.isSafeInteger(event.delta) || event.delta === 0) {
        throw new RoleplayError('relationship/adjust delta must be a non-zero safe integer', 'ROLEPLAY_INVALID_DATA')
      }
      const relationshipIndex = actor.relationships.findIndex(item => item.actorId === event.targetId)
      const current = actor.relationships[relationshipIndex]?.affinity ?? 0
      const affinity = current + event.delta
      if (!Number.isSafeInteger(affinity)) {
        throw new RoleplayError('relationship/adjust affinity overflowed a safe integer', 'ROLEPLAY_INVALID_DATA')
      }
      const relationships = [...actor.relationships]
      const next = { actorId: event.targetId, affinity }
      if (relationshipIndex < 0) relationships.push(next)
      else relationships[relationshipIndex] = next
      const actors = [...world.actors]
      actors[index] = { ...actor, relationships }
      return { ...world, actors }
    }
    case 'fact/reveal': {
      const { fact, index } = factAt(world, event.factId)
      if (fact.visibility.kind === 'public') {
        throw new RoleplayError(`fact ${JSON.stringify(event.factId)} is already public`, 'ROLEPLAY_INVALID_DATA')
      }
      if (event.observerIds.length === 0) {
        throw new RoleplayError('fact/reveal requires at least one observer', 'ROLEPLAY_INVALID_DATA')
      }
      requireUnique(event.observerIds, 'fact/reveal observer id')
      const known = new Set(world.observers.map(observer => observer.id))
      const observerIds = [...fact.visibility.observerIds]
      let changed = false
      for (const observerId of event.observerIds) {
        if (!known.has(observerId)) {
          throw new RoleplayError(`fact/reveal names unknown observer ${JSON.stringify(observerId)}`, 'ROLEPLAY_INVALID_DATA')
        }
        if (!observerIds.includes(observerId)) {
          observerIds.push(observerId)
          changed = true
        }
      }
      if (!changed) {
        throw new RoleplayError(`fact ${JSON.stringify(event.factId)} is already visible to every named observer`, 'ROLEPLAY_INVALID_DATA')
      }
      const facts = [...world.facts]
      facts[index] = { ...fact, visibility: { kind: 'observers', observerIds } }
      return { ...world, facts }
    }
    case 'scene/advance': {
      requireText(event.location, 'scene/advance location')
      if (event.participantIds.length === 0) {
        throw new RoleplayError('scene/advance requires at least one participant', 'ROLEPLAY_INVALID_DATA')
      }
      requireUnique(event.participantIds, 'scene/advance participant id')
      for (const actorId of event.participantIds) actorAt(world, actorId)
      if (world.scene.location === event.location
        && world.scene.participantIds.length === event.participantIds.length
        && world.scene.participantIds.every((actorId, index) => actorId === event.participantIds[index])) {
        throw new RoleplayError('scene/advance must change the active scene', 'ROLEPLAY_INVALID_DATA')
      }
      return {
        ...world,
        scene: {
          location: event.location,
          participantIds: [...event.participantIds],
        },
      }
    }
    case 'choice/record': {
      requireText(event.choiceId, 'choice id')
      requireText(event.text, `choice ${JSON.stringify(event.choiceId)} text`)
      if (world.choices.some(choice => choice.id === event.choiceId)) {
        throw new RoleplayError(`choice id ${JSON.stringify(event.choiceId)} is duplicated`, 'ROLEPLAY_INVALID_DATA')
      }
      validateVisibility(
        event.visibility,
        new Set(world.observers.map(observer => observer.id)),
        `choice ${JSON.stringify(event.choiceId)}`,
      )
      return {
        ...world,
        choices: [...world.choices, {
          id: event.choiceId,
          text: event.text,
          visibility: event.visibility,
        }],
      }
    }
    /* v8 ignore next 2 -- RoleplayWorldEvent is closed and every variant is handled above. */
    default:
      return assertNever(event, 'roleplay world event')
  }
}

/**
 * Apply resolver-produced events as one still-uncommitted draft.
 * @param world - canonical base state.
 * @param events - deterministic resolver output in causal order.
 * @returns a detached state with the same revision.
 */
export function applyRoleplayWorldEvents(
  world: Storyworld,
  events: readonly RoleplayWorldEvent[],
): Storyworld {
  if (events.length === 0) {
    throw new RoleplayError('an accepted resolver must produce at least one world event', 'ROLEPLAY_INVALID_DATA')
  }
  let next = world
  for (const event of events) next = applyWorldEvent(next, event)
  return deepFreeze(next)
}

/**
 * Apply one durable transaction after exact revision validation.
 * @param world - current canonical state.
 * @param candidate - untrusted or caller-owned commit value.
 * @returns the next immutable revision.
 */
export function applyRoleplayCommit(world: Storyworld, candidate: unknown): Storyworld {
  const commit = decodeRoleplayCommit(candidate)
  if (commit.origin.kind === 'model-tool') {
    requireText(commit.origin.callId, 'roleplay commit tool callId')
  } else {
    requireText(commit.origin.source, 'roleplay commit application source')
    if (!Number.isSafeInteger(commit.origin.sourceEventSeq) || commit.origin.sourceEventSeq < 0) {
      throw new RoleplayError(
        'roleplay commit application sourceEventSeq must be a non-negative safe integer',
        'ROLEPLAY_INVALID_DATA',
      )
    }
  }
  requireText(commit.narration, 'roleplay commit narration')
  if (commit.causes.length === 0) {
    throw new RoleplayError('roleplay commit requires at least one cause', 'ROLEPLAY_INVALID_DATA')
  }
  if (commit.baseRevision !== world.revision) {
    throw new RoleplayError(
      `stale roleplay revision ${commit.baseRevision}; current revision is ${world.revision}`,
      'ROLEPLAY_STALE_REVISION',
    )
  }
  if (commit.revision !== commit.baseRevision + 1) {
    throw new RoleplayError(
      `roleplay commit revision must advance ${commit.baseRevision} to ${commit.baseRevision + 1}, got ${commit.revision}`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const actorIds = new Set(world.actors.map(actor => actor.id))
  for (const cause of commit.causes) {
    requireText(cause.resolver, 'roleplay resolver name')
    if (!actorIds.has(cause.actorId)) {
      throw new RoleplayError(`roleplay cause names unknown actor ${JSON.stringify(cause.actorId)}`, 'ROLEPLAY_INVALID_DATA')
    }
  }
  const draft = applyRoleplayWorldEvents(world, commit.events)
  return deepFreeze({ ...draft, revision: commit.revision })
}

/**
 * Strictly replay the roleplay records in one Session prefix.
 * @param events - durable Session events in log order.
 * @returns the reconstructed Storyworld, or `undefined` before any `rp/seed`.
 */
export function replayStoryworld(events: readonly SessionEvent[]): Storyworld | undefined {
  let world: Storyworld | undefined
  for (const event of events) {
    if (event.type === 'rp/seed') {
      if (world !== undefined) {
        throw new RoleplayError('a Session may contain exactly one rp/seed', 'ROLEPLAY_INVALID_DATA')
      }
      world = storyworldFromSeed(event.data)
      continue
    }
    if (event.type !== 'user/message' || event.data.source.kind !== 'roleplay') continue
    if (world === undefined) {
      throw new RoleplayError('rp/commit appeared before rp/seed', 'ROLEPLAY_NO_SEED')
    }
    world = applyRoleplayCommit(world, event.data.source.commit)
  }
  return world
}

/**
 * Project one canonical state without retaining unauthorized fact records or visibility metadata.
 * @param world - canonical Storyworld.
 * @param observerId - exact observer receiving the view.
 * @returns an immutable structurally redacted projection.
 */
export function projectStoryworld(world: Storyworld, observerId: RoleplayObserverId): RoleplayView {
  if (!world.observers.some(observer => observer.id === observerId)) {
    throw new RoleplayError(`unknown roleplay observer ${JSON.stringify(observerId)}`, 'ROLEPLAY_INVALID_DATA')
  }
  const facts = world.facts
    .filter(fact => fact.visibility.kind === 'public' || fact.visibility.observerIds.includes(observerId))
    .map(fact => ({ id: fact.id, text: fact.text }))
  const choices = world.choices
    .filter(choice =>
      choice.visibility.kind === 'public' || choice.visibility.observerIds.includes(observerId))
    .map(choice => ({ id: choice.id, text: choice.text }))
  return deepFreeze({
    revision: world.revision,
    observerId,
    actors: world.actors.map(actor => ({
      id: actor.id,
      name: actor.name,
      location: actor.location,
      relationships: actor.relationships,
    })),
    facts,
    scene: world.scene,
    choices,
  })
}
