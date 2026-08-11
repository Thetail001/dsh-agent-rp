/** Resolver adapters that expose the standard Werewolf referee through roleplay commits. */

import {
  applyRoleplayWorldEvents,
  asRoleplayActorId,
  asRoleplayChoiceId,
  asRoleplayResolverName,
  type RoleplayActionResolver,
  type RoleplayActorId,
  type RoleplayObserverId,
  type RoleplayResolution,
  type RoleplayVisibility,
  type RoleplayWorldEvent,
  type Storyworld,
} from '../runtime/index.ts'
import {
  confirmStandardWerewolfRole,
  closeSheriffRegistration,
  electSheriff,
  hunterShoot,
  livingSeats,
  observerOf,
  recordWolfProposal,
  recordDaySpeeches,
  resolveExile,
  resolveNight,
  resolveSheriffPk,
  SEATS,
  seerInspect,
  sheriffBadgeHolder,
  standardWerewolfActorWithRole,
  transferSheriff,
  witchAct,
  wolfExplode,
  wolfKill,
} from './werewolf.ts'
import { STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH } from './werewolf-decision-limits.ts'

/** Resolver name for the player's private pre-game role acknowledgement. */
export const STANDARD_CONFIRM_ROLE = asRoleplayResolverName('standard_confirm_role')
/** Resolver name for one private wolf proposal before pack confirmation. */
export const STANDARD_WOLF_PROPOSE = asRoleplayResolverName('standard_wolf_propose')
/** Resolver name for one private wolf target. */
export const STANDARD_WOLF_KILL = asRoleplayResolverName('standard_wolf_kill')
/** Resolver name for one private Witch decision. */
export const STANDARD_WITCH_ACT = asRoleplayResolverName('standard_witch_act')
/** Resolver name for one private Seer inspection. */
export const STANDARD_SEER_INSPECT = asRoleplayResolverName('standard_seer_inspect')
/** Resolver name for one complete, atomically settled night. */
export const STANDARD_RESOLVE_NIGHT = asRoleplayResolverName('standard_resolve_night')
/** Resolver name for entering the Sheriff election. */
export const STANDARD_STAND_SHERIFF = asRoleplayResolverName('standard_stand_sheriff')
/** Resolver name for closing a first-day registration with no candidates. */
export const STANDARD_CLOSE_SHERIFF_REGISTRATION = asRoleplayResolverName(
  'standard_close_sheriff_registration',
)
/** Resolver name for a Sheriff-election ballot. */
export const STANDARD_SHERIFF_VOTE = asRoleplayResolverName('standard_sheriff_vote')
/** Resolver name for one public daytime statement. */
export const STANDARD_SPEAK = asRoleplayResolverName('standard_speak')
/** Resolver name for one exile ballot. */
export const STANDARD_EXILE_VOTE = asRoleplayResolverName('standard_exile_vote')
/** Resolver name for a dead Sheriff's badge transfer or destruction. */
export const STANDARD_TRANSFER_SHERIFF = asRoleplayResolverName('standard_transfer_sheriff')
/** Resolver name for the eligible dead Hunter's shot. */
export const STANDARD_HUNTER_SHOOT = asRoleplayResolverName('standard_hunter_shoot')
/** Resolver name for a living wolf revealing and ending the current day. */
export const STANDARD_WOLF_EXPLODE = asRoleplayResolverName('standard_wolf_explode')

function textArgument(args: unknown, key: string): string {
  const value = (args as Record<string, unknown>)[key]
  if (typeof value !== 'string') throw new Error(`${key} must be a string`)
  return value
}

function optionalTextArgument(args: unknown, key: string): string | undefined {
  const value = (args as Record<string, unknown>)[key]
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`${key} must be a string when supplied`)
  }
  return value
}

function boundedPublicStatement(value: string, key: string, allowBlank: boolean): string {
  if (value.length > STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH) {
    throw new Error(`${key} exceeds the standard Werewolf statement length limit`)
  }
  const trimmed = value.trim()
  if (!allowBlank && trimmed.length === 0) throw new Error(`${key} must be non-blank`)
  return trimmed
}

function isLiving(world: Storyworld, actorId: RoleplayActorId): boolean {
  return world.actors.some(actor =>
    actor.id === actorId && (actor.location === 'alive' || actor.location === 'revealed-idiot'))
}

function canVote(world: Storyworld, actorId: RoleplayActorId): boolean {
  return world.actors.some(actor => actor.id === actorId && actor.location === 'alive')
}

function assertLiving(world: Storyworld, actorId: RoleplayActorId, label: string): void {
  if (!isLiving(world, actorId)) throw new Error(`${label} must be living`)
}

function choiceIds(world: Storyworld, prefix: string): string[] {
  return world.choices.map(choice => String(choice.id)).filter(id => id.startsWith(prefix))
}

function choiceTarget(choiceId: string): RoleplayActorId {
  return asRoleplayActorId(choiceId.slice(choiceId.lastIndexOf(':') + 1))
}

function roundAt(world: Storyworld, phase: string): number {
  const match = new RegExp(`^${phase}-(\\d+)$`).exec(world.scene.location)
  if (match?.[1] === undefined) {
    throw new Error(`standard Werewolf action requires ${phase}, got ${world.scene.location}`)
  }
  return Number(match[1])
}

function sameScene(left: Storyworld['scene'], right: Storyworld['scene']): boolean {
  return left.location === right.location
    && left.participantIds.length === right.participantIds.length
    && left.participantIds.every((actorId, index) => actorId === right.participantIds[index])
}

function addedObservers(
  before: Storyworld['facts'][number]['visibility'],
  after: Storyworld['facts'][number]['visibility'],
): RoleplayObserverId[] {
  if (before.kind === 'public' || after.kind === 'public') return []
  return after.observerIds.filter(observerId => !before.observerIds.includes(observerId))
}

function transitionEvents(before: Storyworld, after: Storyworld): RoleplayWorldEvent[] {
  const events: RoleplayWorldEvent[] = []
  for (const actor of after.actors) {
    const previous = before.actors.find(candidate => candidate.id === actor.id)
    if (previous !== undefined && previous.location !== actor.location) {
      events.push({ kind: 'actor/move', actorId: actor.id, location: actor.location })
    }
  }
  for (const fact of after.facts) {
    const previous = before.facts.find(candidate => candidate.id === fact.id)
    if (previous === undefined) continue
    const observerIds = addedObservers(previous.visibility, fact.visibility)
    if (observerIds.length > 0) events.push({ kind: 'fact/reveal', factId: fact.id, observerIds })
  }
  const previousChoiceIds = new Set(before.choices.map(choice => choice.id))
  for (const choice of after.choices) {
    if (previousChoiceIds.has(choice.id)) continue
    events.push({
      kind: 'choice/record',
      choiceId: choice.id,
      text: choice.text,
      visibility: choice.visibility,
    })
  }
  if (!sameScene(before.scene, after.scene)) {
    events.push({
      kind: 'scene/advance',
      location: after.scene.location,
      participantIds: after.scene.participantIds,
    })
  }
  if (events.length === 0) throw new Error('standard Werewolf action produced no state transition')
  return events
}

function attempt(world: Storyworld, operation: () => Storyworld): RoleplayResolution {
  try {
    return { kind: 'accepted', events: transitionEvents(world, operation()) }
  } catch (error) {
    return {
      kind: 'rejected',
      reason: error instanceof Error ? error.message : 'standard Werewolf action failed',
    }
  }
}

function recordChoice(
  world: Storyworld,
  choiceId: string,
  text: string,
  visibility: RoleplayVisibility,
): Storyworld {
  return applyRoleplayWorldEvents(world, [{
    kind: 'choice/record',
    choiceId: asRoleplayChoiceId(choiceId),
    text,
    visibility,
  }])
}

function withoutChoices(world: Storyworld, prefix: string): Storyworld {
  return { ...world, choices: world.choices.filter(choice => !String(choice.id).startsWith(prefix)) }
}

function normalWitchActionCount(world: Storyworld, round: number): number {
  return choiceIds(world, `night:${round}:witch:`).length
}

function witchAction(
  world: Storyworld,
  actorId: RoleplayActorId,
  args: unknown,
): Storyworld {
  const round = roundAt(world, 'night')
  const witchId = standardWerewolfActorWithRole(world, 'witch')
  if (actorId !== witchId) throw new Error(`${actorId} is not the Witch`)
  assertLiving(world, actorId, 'Witch')
  if (normalWitchActionCount(world, round) > 0) {
    throw new Error(`night ${round} already has a Witch action`)
  }
  const wolfTargetId = asRoleplayActorId(textArgument(args, 'wolf_target_id'))
  assertLiving(world, wolfTargetId, 'wolf target')
  const killIds = choiceIds(world, `night:${round}:wolf-kill:`)
  if (killIds.length > 1 || (killIds[0] !== undefined && choiceTarget(killIds[0]) !== wolfTargetId)) {
    throw new Error('the Witch action does not match the selected wolf target')
  }
  const action = textArgument(args, 'action')
  if (action === 'save') {
    if (choiceIds(world, 'night:').some(id => id.includes(':witch:save:'))) {
      throw new Error('the Witch antidote is already spent')
    }
    if (wolfTargetId === witchId && round !== 1) {
      throw new Error('the Witch may self-save only during night 1')
    }
    return recordChoice(
      world,
      `night:${round}:witch:save:${wolfTargetId}`,
      `The Witch used the antidote on ${wolfTargetId}.`,
      { kind: 'observers', observerIds: [observerOf(witchId)] },
    )
  }
  if (action === 'poison') {
    const poisonTarget = optionalTextArgument(args, 'poison_target_id')
    if (poisonTarget === undefined) throw new Error('the Witch poison requires a target')
    const poisonTargetId = asRoleplayActorId(poisonTarget)
    assertLiving(world, poisonTargetId, 'poison target')
    if (poisonTargetId === witchId) throw new Error('the Witch cannot poison herself')
    if (choiceIds(world, 'night:').some(id => id.includes(':witch:poison:'))) {
      throw new Error('the Witch poison is already spent')
    }
    return recordChoice(
      world,
      `night:${round}:witch:poison:${poisonTargetId}`,
      `The Witch poisoned ${poisonTargetId}.`,
      { kind: 'observers', observerIds: [observerOf(witchId)] },
    )
  }
  if (action !== 'pass') throw new Error(`unknown Witch action ${JSON.stringify(action)}`)
  return recordChoice(
    world,
    `night:${round}:witch:pass`,
    'The Witch used no potion.',
    { kind: 'observers', observerIds: [observerOf(witchId)] },
  )
}

function nightReady(world: Storyworld, round: number): boolean {
  const witchId = standardWerewolfActorWithRole(world, 'witch')
  const seerId = standardWerewolfActorWithRole(world, 'seer')
  if (choiceIds(world, `night:${round}:wolf-kill:`).length !== 1) return false
  if (isLiving(world, witchId) && normalWitchActionCount(world, round) !== 1) return false
  return !isLiving(world, seerId) || choiceIds(world, `night:${round}:seer:`).length === 1
}

function settleNightIfReady(world: Storyworld, round: number): Storyworld {
  return nightReady(world, round) ? resolveNight(world) : world
}

/** Complete private decisions needed to settle one standard Werewolf night. */
export interface StandardWerewolfNightIntentArguments {
  readonly wolf_target_id: RoleplayActorId
  readonly witch_action?: 'save' | 'poison' | 'pass'
  readonly witch_poison_target_id?: RoleplayActorId
  readonly seer_target_id?: RoleplayActorId
}

/**
 * Apply a complete night plan without exposing any partial phase transition.
 * @param world - canonical world at a standard Werewolf night.
 * @param wolfId - living wolf used for resolver attribution after the pack agrees.
 * @param args - complete decisions for every living night role.
 * @returns the dawn world after every decision and death is resolved.
 */
export function resolveStandardWerewolfNight(
  world: Storyworld,
  wolfId: RoleplayActorId,
  args: StandardWerewolfNightIntentArguments,
): Storyworld {
  const witchId = standardWerewolfActorWithRole(world, 'witch')
  const seerId = standardWerewolfActorWithRole(world, 'seer')
  let draft = wolfKill(world, wolfId, args.wolf_target_id)
  if (isLiving(world, witchId)) {
    if (args.witch_action === undefined) throw new Error('a living Witch requires one night action')
    switch (args.witch_action) {
      case 'save':
        if (args.witch_poison_target_id !== undefined) {
          throw new Error('a Witch save cannot also name a poison target')
        }
        draft = witchAct(draft, witchId, { save: true })
        break
      case 'poison':
        if (args.witch_poison_target_id === undefined) {
          throw new Error('a Witch poison action requires a target')
        }
        draft = witchAct(draft, witchId, {
          save: false,
          poisonTargetId: args.witch_poison_target_id,
        })
        break
      case 'pass':
        if (args.witch_poison_target_id !== undefined) {
          throw new Error('a Witch pass cannot name a poison target')
        }
        draft = witchAct(draft, witchId, { save: false })
        break
    }
  } else if (args.witch_action !== undefined || args.witch_poison_target_id !== undefined) {
    throw new Error('a dead Witch has no night action')
  }

  if (isLiving(world, seerId)) {
    if (args.seer_target_id === undefined) throw new Error('a living Seer requires one inspection')
    draft = seerInspect(draft, seerId, args.seer_target_id)
  } else if (args.seer_target_id !== undefined) {
    throw new Error('a dead Seer has no night action')
  }
  return resolveNight(draft)
}

function candidatesFromChoices(world: Storyworld): RoleplayActorId[] {
  return choiceIds(world, 'sheriff:candidate:').map(choiceTarget)
}

function ballotFromChoice(prefix: string, choiceId: string) {
  const [voter, target] = choiceId.slice(prefix.length + 1).split(':')
  if (voter === undefined || target === undefined) throw new Error('malformed standard Werewolf ballot')
  return {
    voterId: asRoleplayActorId(voter),
    ...(target === 'abstain' ? {} : { targetId: asRoleplayActorId(target) }),
  }
}

const CONFIRM_ROLE_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_CONFIRM_ROLE,
  version: '1',
  applicationOnly: true,
  description: 'Acknowledge the acting player\'s private role before the first standard Werewolf night.',
  parameters: { type: 'object', additionalProperties: false, properties: {} },
  resolve({ world, actorId }) {
    return attempt(world, () => confirmStandardWerewolfRole(world, actorId))
  },
}

const WOLF_PROPOSE_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_WOLF_PROPOSE,
  version: '1',
  applicationOnly: true,
  description: 'Record one living wolf\'s private proposal before the pack confirms a shared target.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
    required: ['target_id'],
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () =>
      recordWolfProposal(world, actorId, asRoleplayActorId(textArgument(args, 'target_id'))))
  },
}

const WOLF_KILL_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_WOLF_KILL,
  version: '1',
  description: 'Select one living victim during the current standard Werewolf night.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const round = roundAt(world, 'night')
      const next = wolfKill(world, actorId, asRoleplayActorId(textArgument(args, 'target_id')))
      return settleNightIfReady(next, round)
    })
  },
}

const WITCH_ACT_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_WITCH_ACT,
  version: '1',
  description: 'Save, poison, or pass once during the current standard Werewolf night.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      action: { type: 'string', enum: ['save', 'poison', 'pass'] },
      wolf_target_id: { type: 'string', enum: SEATS },
      poison_target_id: { type: 'string', enum: SEATS },
    },
    required: ['action', 'wolf_target_id'],
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const round = roundAt(world, 'night')
      return settleNightIfReady(witchAction(world, actorId, args), round)
    })
  },
}

const SEER_INSPECT_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_SEER_INSPECT,
  version: '1',
  description: 'Inspect one living seat and resolve dawn after every required night action.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
    required: ['target_id'],
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const round = roundAt(world, 'night')
      const next = seerInspect(
        world,
        actorId,
        asRoleplayActorId(textArgument(args, 'target_id')),
      )
      return settleNightIfReady(next, round)
    })
  },
}

const RESOLVE_NIGHT_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_RESOLVE_NIGHT,
  version: '1',
  description: 'Atomically settle every required private decision for the current standard Werewolf night.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      wolf_target_id: { type: 'string', enum: SEATS },
      witch_action: { type: 'string', enum: ['save', 'poison', 'pass'] },
      witch_poison_target_id: { type: 'string', enum: SEATS },
      seer_target_id: { type: 'string', enum: SEATS },
    },
    required: ['wolf_target_id'],
  },
  resolve({ world, actorId }, args) {
    const witchAction = optionalTextArgument(args, 'witch_action')
    const witchPoisonTarget = optionalTextArgument(args, 'witch_poison_target_id')
    const seerTarget = optionalTextArgument(args, 'seer_target_id')
    return attempt(world, () => resolveStandardWerewolfNight(world, actorId, {
      wolf_target_id: asRoleplayActorId(textArgument(args, 'wolf_target_id')),
      ...witchAction === undefined
        ? {}
        : { witch_action: witchAction as 'save' | 'poison' | 'pass' },
      ...witchPoisonTarget === undefined
        ? {}
        : { witch_poison_target_id: asRoleplayActorId(witchPoisonTarget) },
      ...seerTarget === undefined
        ? {}
        : { seer_target_id: asRoleplayActorId(seerTarget) },
    }))
  },
}

const STAND_SHERIFF_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_STAND_SHERIFF,
  version: '3',
  description: 'Stand as a public Sheriff candidate with an optional campaign statement.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { statement: { type: 'string' } },
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      roundAt(world, 'sheriff-election')
      assertLiving(world, actorId, 'Sheriff candidate')
      const supplied = optionalTextArgument(args, 'statement')
      const statement = supplied === undefined
        ? undefined
        : boundedPublicStatement(supplied, 'statement', true)
      return recordChoice(
        world,
        `sheriff:candidate:${actorId}`,
        statement === undefined || statement.length === 0
          ? `${actorId} stood for Sheriff.`
          : `${actorId} stood for Sheriff: ${statement}`,
        { kind: 'public' },
      )
    })
  },
}

const CLOSE_SHERIFF_REGISTRATION_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_CLOSE_SHERIFF_REGISTRATION,
  version: '2',
  description: 'Resolve first-day Sheriff registration when at most one player stands.',
  parameters: { type: 'object', additionalProperties: false, properties: {} },
  resolve({ world, actorId }) {
    return attempt(world, () => {
      assertLiving(world, actorId, 'registration closer')
      return closeSheriffRegistration(world)
    })
  },
}

const SHERIFF_VOTE_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_SHERIFF_VOTE,
  version: '2',
  description: 'Cast or abstain from one Sheriff ballot and resolve after every eligible vote.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const isPk = world.scene.location.startsWith('sheriff-pk-')
      const round = roundAt(world, isPk ? 'sheriff-pk' : 'sheriff-election')
      const candidates = isPk ? [...world.scene.participantIds] : candidatesFromChoices(world)
      if (candidates.length === 0) throw new Error('the Sheriff election has no candidates')
      if (!canVote(world, actorId) || candidates.includes(actorId)) {
        throw new Error(`${actorId} is not eligible to vote for Sheriff`)
      }
      const target = optionalTextArgument(args, 'target_id')
      const targetId = target === undefined ? undefined : asRoleplayActorId(target)
      if (targetId !== undefined && !candidates.includes(targetId)) {
        throw new Error('the Sheriff ballot must name a candidate')
      }
      const prefix = isPk ? `sheriff-pk:${round}` : `sheriff-election:${round}`
      if (choiceIds(world, `${prefix}:${actorId}:`).length > 0) {
        throw new Error(`${actorId} already voted for Sheriff`)
      }
      const recorded = recordChoice(
        world,
        `${prefix}:${actorId}:${targetId ?? 'abstain'}`,
        targetId === undefined ? `${actorId} abstained.` : `${actorId} voted for ${targetId}.`,
        { kind: 'public' },
      )
      const ballotIds = choiceIds(recorded, `${prefix}:`)
      const expected = recorded.actors.filter(actor =>
        actor.location === 'alive' && !candidates.includes(actor.id)).length
      if (ballotIds.length !== expected) return recorded
      const ballots = ballotIds.map(choiceId => ballotFromChoice(prefix, choiceId))
      const base = withoutChoices(recorded, `${prefix}:`)
      return isPk
        ? resolveSheriffPk(base, ballots)
        : electSheriff(base, candidates, ballots)
    })
  },
}

const SPEAK_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_SPEAK,
  version: '2',
  description: 'Record one public statement and open voting after every living seat speaks.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { statement: { type: 'string' } },
    required: ['statement'],
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const round = roundAt(world, 'discussion')
      assertLiving(world, actorId, 'speaker')
      const prefix = `day:${round}:speech:`
      if (world.choices.some(choice => choice.id === `${prefix}${actorId}`)) {
        throw new Error(`${actorId} already spoke during day ${round}`)
      }
      const statement = boundedPublicStatement(textArgument(args, 'statement'), 'statement', false)
      const recorded = recordChoice(
        world,
        `${prefix}${actorId}`,
        `${actorId}: ${statement}`,
        { kind: 'public' },
      )
      const speechIds = choiceIds(recorded, prefix)
      if (speechIds.length !== livingSeats(recorded).length) return recorded
      const statements = new Map(speechIds.map((choiceId) => {
        const speakerId = asRoleplayActorId(choiceId.slice(prefix.length))
        const choice = recorded.choices.find(candidate => candidate.id === choiceId)
        if (choice === undefined) throw new Error(`recorded speech ${choiceId} is missing`)
        return [speakerId, choice.text.slice(`${speakerId}: `.length)] as const
      }))
      return recordDaySpeeches(withoutChoices(recorded, prefix), statements)
    })
  },
}

const EXILE_VOTE_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_EXILE_VOTE,
  version: '2',
  description: 'Cast one exile ballot and resolve the vote after every eligible seat votes.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      const isPk = world.scene.location.startsWith('exile-pk-')
      const round = roundAt(world, isPk ? 'exile-pk' : 'exile-vote')
      const candidates = isPk ? [...world.scene.participantIds] : []
      if (!canVote(world, actorId) || candidates.includes(actorId)) {
        throw new Error(`${actorId} is not eligible to vote for exile`)
      }
      const target = optionalTextArgument(args, 'target_id')
      const targetId = target === undefined ? undefined : asRoleplayActorId(target)
      if (targetId !== undefined) assertLiving(world, targetId, 'exile target')
      if (targetId !== undefined && isPk && !candidates.includes(targetId)) {
        throw new Error('an exile PK ballot must name a tied candidate')
      }
      const prefix = `day:${round}:${isPk ? 'pk-vote' : 'exile-vote'}`
      if (choiceIds(world, `${prefix}:${actorId}:`).length > 0) {
        throw new Error(`${actorId} already voted for exile`)
      }
      const recorded = recordChoice(
        world,
        `${prefix}:${actorId}:${targetId ?? 'abstain'}`,
        targetId === undefined ? `${actorId} abstained.` : `${actorId} voted for ${targetId}.`,
        { kind: 'public' },
      )
      const ballotIds = choiceIds(recorded, `${prefix}:`)
      const expected = recorded.actors.filter(actor =>
        actor.location === 'alive' && !candidates.includes(actor.id)).length
      if (ballotIds.length !== expected) return recorded
      const ballots = ballotIds.map(choiceId => ballotFromChoice(prefix, choiceId))
      return resolveExile(withoutChoices(recorded, `${prefix}:`), ballots)
    })
  },
}

const TRANSFER_SHERIFF_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_TRANSFER_SHERIFF,
  version: '1',
  description: 'Transfer or destroy the badge owned by the acting dead Sheriff.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () => {
      if (sheriffBadgeHolder(world) !== actorId || isLiving(world, actorId)) {
        throw new Error(`${actorId} is not the dead Sheriff awaiting a badge decision`)
      }
      const target = optionalTextArgument(args, 'target_id')
      return transferSheriff(world, target === undefined ? undefined : asRoleplayActorId(target))
    })
  },
}

const HUNTER_SHOOT_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_HUNTER_SHOOT,
  version: '2',
  description: 'Let the dead Hunter shoot one living seat when the current scene permits it.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { target_id: { type: 'string', enum: SEATS } },
    required: ['target_id'],
  },
  resolve({ world, actorId }, args) {
    return attempt(world, () =>
      hunterShoot(world, actorId, asRoleplayActorId(textArgument(args, 'target_id'))))
  },
}

const WOLF_EXPLODE_RESOLVER: RoleplayActionResolver = {
  name: STANDARD_WOLF_EXPLODE,
  version: '1',
  description: 'Reveal one living wolf and end the current standard Werewolf day.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  resolve({ world, actorId }) {
    return attempt(world, () => wolfExplode(world, actorId))
  },
}

/** Ordered trusted resolvers comprising the standard Werewolf application. */
export const STANDARD_WEREWOLF_RESOLVERS = [
  CONFIRM_ROLE_RESOLVER,
  WOLF_PROPOSE_RESOLVER,
  WOLF_KILL_RESOLVER,
  WITCH_ACT_RESOLVER,
  SEER_INSPECT_RESOLVER,
  RESOLVE_NIGHT_RESOLVER,
  STAND_SHERIFF_RESOLVER,
  CLOSE_SHERIFF_REGISTRATION_RESOLVER,
  SHERIFF_VOTE_RESOLVER,
  SPEAK_RESOLVER,
  EXILE_VOTE_RESOLVER,
  TRANSFER_SHERIFF_RESOLVER,
  HUNTER_SHOOT_RESOLVER,
  WOLF_EXPLODE_RESOLVER,
] as const
