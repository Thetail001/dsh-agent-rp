/** Deterministic twelve-seat Werewolf scenario built from canonical Storyworld events. */

import {
  applyRoleplayWorldEvents,
  asRoleplayActorId,
  asRoleplayChoiceId,
  asRoleplayFactId,
  asRoleplayObserverId,
  projectStoryworld,
  storyworldFromSeed,
  type RoleplayActorId,
  type RoleplayFactId,
  type RoleplayObserverId,
  type RoleplaySeed,
  type RoleplayVisibility,
  type RoleplayWorldEvent,
  type Storyworld,
} from '../runtime/index.ts'
import { STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH } from './werewolf-decision-limits.ts'
import {
  standardWerewolfLocationCanVote,
  standardWerewolfLocationIsLiving,
} from './werewolf-life.ts'

/** Hidden role assigned to one seat in the standard scenario. */
export type StandardWerewolfRole =
  | 'villager'
  | 'seer'
  | 'witch'
  | 'hunter'
  | 'idiot'
  | 'wolf'

/** One public ballot, where an omitted target records an abstention. */
export interface StandardWerewolfBallot {
  /** Living seat casting the ballot. */
  readonly voterId: RoleplayActorId
  /** Selected candidate or exile target. */
  readonly targetId?: RoleplayActorId
}

/** One private target proposed by a living wolf before the pack confirms its shared action. */
export interface StandardWerewolfWolfProposal {
  /** Living wolf seat that made the proposal. */
  readonly actorId: RoleplayActorId
  /** Living seat proposed as the victim. */
  readonly targetId: RoleplayActorId
}

/** Frozen public rules exercised by the standard twelve-seat benchmark. */
export const STANDARD_WEREWOLF_RULES = {
  playerCount: 12,
  roles: {
    villager: 4,
    seer: 1,
    witch: 1,
    hunter: 1,
    idiot: 1,
    wolf: 4,
  },
  witch: {
    antidotes: 1,
    poisons: 1,
    selfSave: 'first-night-only',
    onePotionPerNight: true,
  },
  hunter: {
    shootsAfterNightKill: true,
    shootsAfterExile: true,
    shootsAfterPoison: false,
  },
  idiot: {
    survivesExile: true,
    losesVote: true,
  },
  sheriff: {
    election: 'first-day',
    uncontested: 'auto-elect',
    voteWeight: 1.5,
    secondTie: 'no-sheriff',
  },
  exile: {
    secondTie: 'no-elimination',
    revealOrdinaryRole: false,
  },
  wolf: {
    selfKill: true,
    daytimeExplosion: true,
  },
  victory: 'slaughter-side',
} as const

/** Ordered fixed seats used by the standard scenario. */
export const SEATS = Array.from(
  { length: STANDARD_WEREWOLF_RULES.playerCount },
  (_, index) => asRoleplayActorId(`seat-${index + 1}`),
)

function seatAt(index: number): RoleplayActorId {
  const seat = SEATS[index]
  if (seat === undefined) throw new Error(`standard Werewolf seat ${index + 1} is missing`)
  return seat
}

/** Default human-controlled seat used by the CLI fixture. */
export const HUMAN = seatAt(0)
/** Four ordinary-villager seats in the fixed role layout. */
export const STANDARD_WEREWOLF_VILLAGERS = SEATS.slice(0, 4)
/** Fixed Seer seat. */
export const SEER = seatAt(4)
/** Fixed Witch seat. */
export const WITCH = seatAt(5)
/** Fixed Hunter seat. */
export const HUNTER = seatAt(6)
/** Fixed Idiot seat. */
export const IDIOT = seatAt(7)
/** Four fixed werewolf seats. */
export const WOLVES = SEATS.slice(8)
/** Seats whose roles are fully playable through the browser surface. */
export const STANDARD_WEREWOLF_HUMAN_SEATS = [...SEATS]
/** Fact revealed when the good faction wins. */
export const GOOD_VICTORY = asRoleplayFactId('standard-good-victory')
const WOLF_VICTORY = asRoleplayFactId('standard-wolf-victory')

const FIXTURE_ROLES = new Map<RoleplayActorId, StandardWerewolfRole>([
  [HUMAN, 'villager'],
  [seatAt(1), 'villager'],
  [seatAt(2), 'villager'],
  [seatAt(3), 'villager'],
  [SEER, 'seer'],
  [WITCH, 'witch'],
  [HUNTER, 'hunter'],
  [IDIOT, 'idiot'],
  ...WOLVES.map(seat => [seat, 'wolf'] as const),
])
const OBSERVERS = new Map(SEATS.map(seat => [
  seat,
  asRoleplayObserverId(`${seat}-observer`),
]))
const ROLE_FACTS = new Map(SEATS.map(seat => [
  seat,
  asRoleplayFactId(`${seat}-role`),
]))
const ALIGNMENT_FACTS = new Map(SEATS.map(seat => [
  seat,
  asRoleplayFactId(`${seat}-alignment`),
]))

/**
 * Resolve the observer durably assigned to one fixed seat.
 * @param actorId - standard scenario seat.
 * @returns observer bound to that seat.
 */
export function observerOf(actorId: RoleplayActorId): RoleplayObserverId {
  const observerId = OBSERVERS.get(actorId)
  if (observerId === undefined) throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`)
  return observerId
}

/**
 * Choose a replay-stable human seat from one fresh Session identity.
 * @param sessionId - durable root Session identity minted for the match.
 * @param previousActorId - optional immediately preceding Web-player seat to avoid.
 * @returns one of the twelve fully playable seats.
 */
export function humanActorForSession(
  sessionId: string,
  previousActorId?: RoleplayActorId,
): RoleplayActorId {
  let hash = 2_166_136_261
  for (let index = 0; index < sessionId.length; index++) {
    hash ^= sessionId.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  const seatIndex = (hash >>> 0) % STANDARD_WEREWOLF_HUMAN_SEATS.length
  const selectedIndex = STANDARD_WEREWOLF_HUMAN_SEATS[seatIndex] === previousActorId
    ? (seatIndex + 1) % STANDARD_WEREWOLF_HUMAN_SEATS.length
    : seatIndex
  const seat = STANDARD_WEREWOLF_HUMAN_SEATS[selectedIndex]
  if (seat === undefined) throw new Error('standard Werewolf human seat set is empty')
  return seat
}

/**
 * Recover the human-controlled seat from a durable observer binding.
 * @param observerId - observer recorded beside the scenario seed.
 * @returns the matching playable seat.
 */
export function humanActorForObserver(observerId: RoleplayObserverId): RoleplayActorId {
  const seat = STANDARD_WEREWOLF_HUMAN_SEATS.find(actorId => observerOf(actorId) === observerId)
  if (seat === undefined) {
    throw new Error(`standard Werewolf Web observer does not name a playable seat: ${JSON.stringify(observerId)}`)
  }
  return seat
}

/**
 * Resolve the hidden role assigned to one seat in the deterministic CLI fixture.
 * @param actorId - standard scenario seat.
 * @returns the role assigned by the fixture layout.
 */
export function standardWerewolfRoleOf(actorId: RoleplayActorId): StandardWerewolfRole {
  const role = FIXTURE_ROLES.get(actorId)
  if (role === undefined) throw new Error(`unknown standard Werewolf role for ${JSON.stringify(actorId)}`)
  return role
}

/**
 * Render one standard role for the Simplified Chinese player surface.
 * @param role - role from the frozen layout.
 * @returns concise role label.
 */
export function standardWerewolfRoleLabel(role: StandardWerewolfRole): string {
  switch (role) {
    case 'villager': return '普通村民'
    case 'seer': return '预言家'
    case 'witch': return '女巫'
    case 'hunter': return '猎人'
    case 'idiot': return '白痴'
    case 'wolf': return '狼人'
  }
}

function roleConfirmationChoiceId(actorId: RoleplayActorId): string {
  return `setup:role-confirmed:${String(actorId)}`
}

/**
 * Report whether one player has acknowledged their private role before the first night.
 * @param source - canonical world or observer view containing visible choices.
 * @param actorId - player whose acknowledgement is required.
 * @returns whether that player's private acknowledgement is present.
 */
export function standardWerewolfRoleConfirmed(
  source: { readonly choices: readonly { readonly id: unknown }[] },
  actorId: RoleplayActorId,
): boolean {
  return source.choices.some(choice => String(choice.id) === roleConfirmationChoiceId(actorId))
}

/**
 * Record one player's private role acknowledgement before play begins.
 * @param world - canonical first-night world.
 * @param actorId - player acknowledging their assigned role.
 * @returns world retaining the acknowledgement only for that player's observer.
 */
export function confirmStandardWerewolfRole(
  world: Storyworld,
  actorId: RoleplayActorId,
): Storyworld {
  if (world.scene.location !== 'night-1') {
    throw new Error(`standard Werewolf role confirmation requires night-1, got ${world.scene.location}`)
  }
  void standardWerewolfRoleIn(world, actorId)
  if (standardWerewolfRoleConfirmed(world, actorId)) {
    throw new Error(`${actorId} already confirmed their standard Werewolf role`)
  }
  return apply(world, [recordChoice(
    roleConfirmationChoiceId(actorId),
    `${actorId} confirmed their assigned role.`,
    { kind: 'observers', observerIds: [observerOf(actorId)] },
  )])
}

function roleFactOf(actorId: RoleplayActorId): RoleplayFactId {
  const factId = ROLE_FACTS.get(actorId)
  if (factId === undefined) throw new Error(`unknown standard Werewolf role fact for ${JSON.stringify(actorId)}`)
  return factId
}

function alignmentFactOf(actorId: RoleplayActorId): RoleplayFactId {
  const factId = ALIGNMENT_FACTS.get(actorId)
  if (factId === undefined) {
    throw new Error(`unknown standard Werewolf alignment fact for ${JSON.stringify(actorId)}`)
  }
  return factId
}

function roleLabel(role: StandardWerewolfRole): string {
  switch (role) {
    case 'villager': return 'a villager'
    case 'seer': return 'the Seer'
    case 'witch': return 'the Witch'
    case 'hunter': return 'the Hunter'
    case 'idiot': return 'the Idiot'
    case 'wolf': return 'a werewolf'
  }
}

const ALL_OBSERVERS = SEATS.map(observerOf)

interface StandardWerewolfRoleSource {
  readonly actors: readonly { readonly id: RoleplayActorId }[]
  readonly facts: readonly { readonly id: RoleplayFactId; readonly text: string }[]
}

function roleFromLabel(label: string): StandardWerewolfRole | undefined {
  switch (label) {
    case 'a villager': return 'villager'
    case 'the Seer': return 'seer'
    case 'the Witch': return 'witch'
    case 'the Hunter': return 'hunter'
    case 'the Idiot': return 'idiot'
    case 'a werewolf': return 'wolf'
    default: return undefined
  }
}

/**
 * Resolve one role from the active match's durable seed facts.
 * @param source - canonical world or observer view containing the actor's visible role fact.
 * @param actorId - actor whose role is required.
 * @returns role encoded by that match rather than the deterministic CLI fixture.
 */
export function standardWerewolfRoleIn(
  source: StandardWerewolfRoleSource,
  actorId: RoleplayActorId,
): StandardWerewolfRole {
  if (!source.actors.some(actor => actor.id === actorId)) {
    throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`)
  }
  const fact = source.facts.find(candidate => candidate.id === roleFactOf(actorId))
  const match = fact === undefined ? undefined : /^seat-\d+ is (.+)\.$/u.exec(fact.text)
  const role = match?.[1] === undefined ? undefined : roleFromLabel(match[1])
  if (role === undefined) {
    throw new Error(`standard Werewolf role for ${JSON.stringify(actorId)} is not visible or malformed`)
  }
  return role
}

/**
 * Resolve one visible faction from the active match's durable alignment facts.
 * @param source - canonical world or observer view containing the actor's visible alignment fact.
 * @param actorId - actor whose faction is required.
 * @returns faction encoded by that match without exposing a hidden role.
 */
export function standardWerewolfAlignmentIn(
  source: StandardWerewolfRoleSource,
  actorId: RoleplayActorId,
): 'good' | 'wolf' {
  if (!source.actors.some(actor => actor.id === actorId)) {
    throw new Error(`unknown standard Werewolf actor ${JSON.stringify(actorId)}`)
  }
  const fact = source.facts.find(candidate => candidate.id === alignmentFactOf(actorId))
  const match = fact === undefined
    ? undefined
    : /^seat-\d+ belongs to the (good|werewolf) faction\.$/u.exec(fact.text)
  if (match?.[1] === 'good') return 'good'
  if (match?.[1] === 'werewolf') return 'wolf'
  throw new Error(`standard Werewolf alignment for ${JSON.stringify(actorId)} is not visible or malformed`)
}

/**
 * Find the unique actor carrying one singleton role in the active match.
 * @param source - canonical world containing every role fact.
 * @param role - Seer, Witch, Hunter, or Idiot.
 * @returns the actor assigned that role.
 */
export function standardWerewolfActorWithRole(
  source: StandardWerewolfRoleSource,
  role: Exclude<StandardWerewolfRole, 'villager' | 'wolf'>,
): RoleplayActorId {
  const actors = source.actors.filter(actor => standardWerewolfRoleIn(source, actor.id) === role)
  if (actors.length !== 1 || actors[0] === undefined) {
    throw new Error(`standard Werewolf match requires exactly one ${role}`)
  }
  return actors[0].id
}

/**
 * List every actor assigned one role in the active match.
 * @param source - canonical world containing every role fact.
 * @param role - role to select.
 * @returns actors in canonical seat order.
 */
export function standardWerewolfActorsWithRole(
  source: StandardWerewolfRoleSource,
  role: StandardWerewolfRole,
): RoleplayActorId[] {
  return source.actors
    .filter(actor => standardWerewolfRoleIn(source, actor.id) === role)
    .map(actor => actor.id)
}

function validateRoleOrder(roles: readonly StandardWerewolfRole[]): void {
  if (roles.length !== SEATS.length) throw new Error('standard Werewolf role order must name twelve seats')
  for (const [role, expected] of Object.entries(STANDARD_WEREWOLF_RULES.roles)) {
    const actual = roles.filter(candidate => candidate === role).length
    if (actual !== expected) throw new Error(`standard Werewolf role order requires ${String(expected)} ${role}`)
  }
}

/**
 * Build a revision-zero seed from one complete role order.
 * @param roles - role for each item in `SEATS`, in canonical seat order.
 * @returns validated replay-stable standard match seed.
 */
export function createStandardWerewolfSeed(
  roles: readonly StandardWerewolfRole[],
): RoleplaySeed {
  validateRoleOrder(roles)
  const roleByActor = new Map<RoleplayActorId, StandardWerewolfRole>()
  for (const [index, seat] of SEATS.entries()) {
    const role = roles[index]
    if (role === undefined) throw new Error(`standard Werewolf role for ${seat} is missing`)
    roleByActor.set(seat, role)
  }
  const roleOfSeedSeat = (seat: RoleplayActorId): StandardWerewolfRole => {
    const role = roleByActor.get(seat)
    if (role === undefined) throw new Error(`standard Werewolf role for ${seat} is missing`)
    return role
  }
  const wolfObservers = SEATS
    .filter(seat => roleByActor.get(seat) === 'wolf')
    .map(observerOf)
  return {
    version: 0,
    observers: SEATS.map(seat => ({ id: observerOf(seat), name: `${seat} observer` })),
    actors: SEATS.map(seat => ({
      id: seat,
      name: String(seat),
      observerId: observerOf(seat),
      location: 'alive',
      relationships: [],
    })),
    facts: [
      ...SEATS.map((seat) => {
        const role = roleOfSeedSeat(seat)
        return {
          id: roleFactOf(seat),
          text: `${seat} is ${roleLabel(role)}.`,
          visibility: {
            kind: 'observers' as const,
            observerIds: role === 'wolf' ? wolfObservers : [observerOf(seat)],
          },
        }
      }),
      ...SEATS.map((seat) => {
        const role = roleOfSeedSeat(seat)
        return {
          id: alignmentFactOf(seat),
          text: `${seat} belongs to the ${role === 'wolf' ? 'werewolf' : 'good'} faction.`,
          visibility: {
            kind: 'observers' as const,
            observerIds: role === 'wolf' ? wolfObservers : [observerOf(seat)],
          },
        }
      }),
      {
        id: GOOD_VICTORY,
        text: 'The good faction has won the standard match.',
        visibility: { kind: 'observers' as const, observerIds: [] },
      },
      {
        id: WOLF_VICTORY,
        text: 'The werewolf faction has won by slaughtering one good side.',
        visibility: { kind: 'observers' as const, observerIds: [] },
      },
    ],
    scene: { location: 'night-1', participantIds: SEATS },
  }
}

/**
 * Shuffle the standard role multiset with a caller-owned random index source.
 * @param randomIndex - returns an integer in `[0, upperExclusive)` for each Fisher-Yates step.
 * @returns fresh replay-stable seed whose exact layout is persisted in `rp/seed`.
 */
export function createShuffledStandardWerewolfSeed(
  randomIndex: (upperExclusive: number) => number,
): RoleplaySeed {
  const roles = SEATS.map(standardWerewolfRoleOf)
  for (let index = roles.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    if (!Number.isSafeInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new Error(`standard Werewolf random index ${String(swapIndex)} is outside 0..${String(index)}`)
    }
    const current = roles[index]
    const replacement = roles[swapIndex]
    if (current === undefined || replacement === undefined) {
      throw new Error('standard Werewolf shuffle reached a missing role')
    }
    roles[index] = replacement
    roles[swapIndex] = current
  }
  return createStandardWerewolfSeed(roles)
}

/** Revision-zero standard match with private roles and alignments. */
export const STANDARD_WEREWOLF_SEED: RoleplaySeed = createStandardWerewolfSeed(
  SEATS.map(standardWerewolfRoleOf),
)

/**
 * Create a fresh canonical world from the standard seed.
 * @returns revision-zero standard Werewolf world.
 */
export function standardWerewolfWorld(): Storyworld {
  return storyworldFromSeed(STANDARD_WEREWOLF_SEED)
}

function publicVisibility(): RoleplayVisibility {
  return { kind: 'public' }
}

function observerVisibility(observerIds: readonly RoleplayObserverId[]): RoleplayVisibility {
  return { kind: 'observers', observerIds }
}

function recordChoice(
  id: string,
  text: string,
  visibility: RoleplayVisibility,
): RoleplayWorldEvent {
  return {
    kind: 'choice/record',
    choiceId: asRoleplayChoiceId(id),
    text,
    visibility,
  }
}

function apply(world: Storyworld, events: readonly RoleplayWorldEvent[]): Storyworld {
  return applyRoleplayWorldEvents(world, events)
}

function phaseRound(world: Storyworld, phase: string): number {
  const match = new RegExp(`^${phase}-(\\d+)$`).exec(world.scene.location)
  if (match?.[1] === undefined) {
    throw new Error(`standard Werewolf action requires ${phase}, got ${world.scene.location}`)
  }
  return Number(match[1])
}

/**
 * List seats still participating in the match.
 * @param world - canonical match state.
 * @returns living seats, including a revealed Idiot.
 */
export function livingSeats(world: Storyworld): RoleplayActorId[] {
  return world.actors.filter(actor => standardWerewolfLocationIsLiving(actor.location)).map(actor => actor.id)
}

function isLiving(world: Storyworld, actorId: RoleplayActorId): boolean {
  return world.actors.some(actor =>
    actor.id === actorId && standardWerewolfLocationIsLiving(actor.location))
}

function canVote(world: Storyworld, actorId: RoleplayActorId): boolean {
  return world.actors.some(actor =>
    actor.id === actorId && standardWerewolfLocationCanVote(actor.location))
}

function canBeExiled(world: Storyworld, actorId: RoleplayActorId): boolean {
  return canVote(world, actorId)
}

function choiceIds(world: Storyworld, prefix: string): string[] {
  return world.choices.map(choice => String(choice.id)).filter(id => id.startsWith(prefix))
}

function choiceTarget(id: string): RoleplayActorId {
  return asRoleplayActorId(id.slice(id.lastIndexOf(':') + 1))
}

/**
 * Read the wolf proposals visible in one world or observer projection.
 * @param source - canonical world or wolf-observer view containing visible choices.
 * @param round - night whose proposal table is requested.
 * @returns proposals in durable choice order.
 */
export function standardWerewolfWolfProposals(
  source: { readonly choices: readonly { readonly id: unknown }[] },
  round: number,
): StandardWerewolfWolfProposal[] {
  const prefix = `night:${String(round)}:wolf-proposal:`
  return source.choices.flatMap((choice) => {
    const id = String(choice.id)
    if (!id.startsWith(prefix)) return []
    const match = /^(seat-(?:[1-9]|1[0-2])):(seat-(?:[1-9]|1[0-2]))$/u.exec(id.slice(prefix.length))
    if (match?.[1] === undefined || match[2] === undefined) {
      throw new Error(`malformed standard Werewolf wolf proposal ${JSON.stringify(id)}`)
    }
    return [{ actorId: asRoleplayActorId(match[1]), targetId: asRoleplayActorId(match[2]) }]
  })
}

function assertLiving(world: Storyworld, actorId: RoleplayActorId, label: string): void {
  if (!isLiving(world, actorId)) throw new Error(`${label} must be living`)
}

function assertRole(
  world: Storyworld,
  actorId: RoleplayActorId,
  role: StandardWerewolfRole,
): void {
  if (standardWerewolfRoleIn(world, actorId) !== role) throw new Error(`${actorId} is not ${role}`)
}

function nextDayLocation(round: number): string {
  return round === 1 ? 'sheriff-election-1' : `discussion-${round}`
}

function nextNightLocation(round: number): string {
  return `night-${round + 1}`
}

type HunterShotOrigin = 'night' | 'exile'

function hunterShotPhase(world: Storyworld): { readonly origin: HunterShotOrigin; readonly round: number } {
  const match = /^hunter-shot-(night|exile)-(\d+)$/.exec(world.scene.location)
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`standard Werewolf Hunter action requires a Hunter-shot scene, got ${world.scene.location}`)
  }
  return { origin: match[1] as HunterShotOrigin, round: Number(match[2]) }
}

/**
 * Record the wolves' private target without settling the night.
 * @param world - canonical state in a night phase.
 * @param wolfId - living werewolf used for resolver attribution after pack agreement.
 * @param targetId - living target.
 * @returns world containing the private wolf choice.
 */
export function wolfKill(
  world: Storyworld,
  wolfId: RoleplayActorId,
  targetId: RoleplayActorId,
): Storyworld {
  const round = phaseRound(world, 'night')
  assertRole(world, wolfId, 'wolf')
  assertLiving(world, wolfId, 'acting werewolf')
  assertLiving(world, targetId, 'wolf target')
  if (choiceIds(world, `night:${round}:wolf-kill:`).length > 0) {
    throw new Error(`night ${round} already has a wolf target`)
  }
  return apply(world, [recordChoice(
    `night:${round}:wolf-kill:${targetId}`,
    `The werewolves selected ${targetId}.`,
    observerVisibility([
      ...standardWerewolfActorsWithRole(world, 'wolf').map(observerOf),
      observerOf(standardWerewolfActorWithRole(world, 'witch')),
    ]),
  )])
}

/**
 * Record one living wolf's private proposal without selecting the pack target.
 * @param world - canonical state in a night phase.
 * @param wolfId - living werewolf making this proposal.
 * @param targetId - living proposed target.
 * @returns world containing the proposal for living wolf observers only.
 */
export function recordWolfProposal(
  world: Storyworld,
  wolfId: RoleplayActorId,
  targetId: RoleplayActorId,
): Storyworld {
  const round = phaseRound(world, 'night')
  assertRole(world, wolfId, 'wolf')
  assertLiving(world, wolfId, 'proposing werewolf')
  assertLiving(world, targetId, 'wolf proposal target')
  if (standardWerewolfWolfProposals(world, round).some(proposal => proposal.actorId === wolfId)) {
    throw new Error(`${wolfId} already proposed a target during night ${String(round)}`)
  }
  const livingWolfObservers = standardWerewolfActorsWithRole(world, 'wolf')
    .filter(actorId => isLiving(world, actorId))
    .map(observerOf)
  return apply(world, [recordChoice(
    `night:${String(round)}:wolf-proposal:${String(wolfId)}:${String(targetId)}`,
    `${wolfId} proposed ${targetId} to the living wolf pack.`,
    observerVisibility(livingWolfObservers),
  )])
}

/** Witch decision for one night after the wolf target exists. */
export interface WitchAction {
  /** Whether to spend the antidote on the wolf target. */
  readonly save: boolean
  /** Optional living seat on which to spend poison. */
  readonly poisonTargetId?: RoleplayActorId
}

/**
 * Record the Witch's private potion decision without settling the night.
 * @param world - canonical state after the wolf choice.
 * @param witchId - living seat assigned the Witch in this match.
 * @param action - pass, antidote, or poison decision.
 * @returns world containing the private Witch choice.
 */
export function witchAct(
  world: Storyworld,
  witchId: RoleplayActorId,
  action: WitchAction,
): Storyworld {
  const round = phaseRound(world, 'night')
  assertRole(world, witchId, 'witch')
  assertLiving(world, witchId, 'Witch')
  if (choiceIds(world, `night:${round}:witch:`).length > 0) {
    throw new Error(`night ${round} already has a Witch action`)
  }
  if (action.save && action.poisonTargetId !== undefined) {
    throw new Error('the Witch cannot use both potions in one night')
  }
  const wolfKillId = choiceIds(world, `night:${round}:wolf-kill:`)[0]
  if (wolfKillId === undefined) throw new Error('the Witch acts after the wolf target exists')
  const wolfTargetId = choiceTarget(wolfKillId)
  if (action.save) {
    if (choiceIds(world, 'night:').some(id => id.includes(':witch:save:'))) {
      throw new Error('the Witch antidote is already spent')
    }
    if (wolfTargetId === witchId && round !== 1) {
      throw new Error('the Witch may self-save only during night 1')
    }
    return apply(world, [recordChoice(
      `night:${round}:witch:save:${wolfTargetId}`,
      `The Witch used the antidote on ${wolfTargetId}.`,
      observerVisibility([observerOf(witchId)]),
    )])
  }
  if (action.poisonTargetId !== undefined) {
    assertLiving(world, action.poisonTargetId, 'poison target')
    if (action.poisonTargetId === witchId) throw new Error('the Witch cannot poison herself')
    if (choiceIds(world, 'night:').some(id => id.includes(':witch:poison:'))) {
      throw new Error('the Witch poison is already spent')
    }
    return apply(world, [recordChoice(
      `night:${round}:witch:poison:${action.poisonTargetId}`,
      `The Witch poisoned ${action.poisonTargetId}.`,
      observerVisibility([observerOf(witchId)]),
    )])
  }
  return apply(world, [recordChoice(
    `night:${round}:witch:pass`,
    'The Witch used no potion.',
    observerVisibility([observerOf(witchId)]),
  )])
}

/**
 * Record a private Seer inspection and reveal that alignment to the Seer.
 * @param world - canonical state in a night phase.
 * @param seerId - living seat assigned the Seer in this match.
 * @param targetId - living seat to inspect.
 * @returns world containing the inspection and observer-scoped reveal.
 */
export function seerInspect(
  world: Storyworld,
  seerId: RoleplayActorId,
  targetId: RoleplayActorId,
): Storyworld {
  const round = phaseRound(world, 'night')
  assertRole(world, seerId, 'seer')
  assertLiving(world, seerId, 'Seer')
  assertLiving(world, targetId, 'inspection target')
  if (seerId === targetId) throw new Error('the Seer cannot inspect herself')
  if (choiceIds(world, `night:${round}:seer:`).length > 0) {
    throw new Error(`night ${round} already has a Seer inspection`)
  }
  const seerObserver = observerOf(seerId)
  const alignmentFactId = alignmentFactOf(targetId)
  const alreadyKnown = projectStoryworld(world, seerObserver).facts.some(fact => fact.id === alignmentFactId)
  const events: RoleplayWorldEvent[] = [recordChoice(
    `night:${round}:seer:inspect:${targetId}`,
    `The Seer inspected ${targetId}.`,
    observerVisibility([seerObserver]),
  )]
  if (!alreadyKnown) {
    events.unshift({
      kind: 'fact/reveal',
      factId: alignmentFactId,
      observerIds: [seerObserver],
    })
  }
  return apply(world, events)
}

function winnerAfter(world: Storyworld, eliminated: ReadonlySet<RoleplayActorId>): 'good' | 'wolf' | undefined {
  const survivors = livingSeats(world).filter(seat => !eliminated.has(seat))
  const wolves = survivors.filter(seat => standardWerewolfRoleIn(world, seat) === 'wolf').length
  if (wolves === 0) return 'good'
  const villagers = survivors.filter(seat => standardWerewolfRoleIn(world, seat) === 'villager').length
  const gods = survivors.length - wolves - villagers
  if (villagers === 0 || gods === 0) return 'wolf'
  return undefined
}

/**
 * Derive the winner under slaughter-side victory rules.
 * @param world - canonical match state.
 * @returns winning faction, or undefined while both good sides and wolves survive.
 */
export function winnerOf(world: Storyworld): 'good' | 'wolf' | undefined {
  return winnerAfter(world, new Set())
}

function terminalEvents(
  world: Storyworld,
  eliminated: ReadonlySet<RoleplayActorId>,
  fallbackLocation: string,
  extraParticipants: readonly RoleplayActorId[] = [],
): RoleplayWorldEvent[] {
  const survivors = livingSeats(world).filter(seat => !eliminated.has(seat))
  const winner = winnerAfter(world, eliminated)
  const roleReveals = SEATS.flatMap((actorId) => {
    const factId = roleFactOf(actorId)
    const observerIds = ALL_OBSERVERS.filter(observerId =>
      !projectStoryworld(world, observerId).facts.some(fact => fact.id === factId))
    return observerIds.length === 0 ? [] : [{ kind: 'fact/reveal' as const, factId, observerIds }]
  })
  if (winner === 'good') {
    return [
      ...roleReveals,
      { kind: 'fact/reveal', factId: GOOD_VICTORY, observerIds: ALL_OBSERVERS },
      { kind: 'scene/advance', location: 'game-over-good', participantIds: survivors },
    ]
  }
  if (winner === 'wolf') {
    return [
      ...roleReveals,
      { kind: 'fact/reveal', factId: WOLF_VICTORY, observerIds: ALL_OBSERVERS },
      { kind: 'scene/advance', location: 'game-over-wolves', participantIds: survivors },
    ]
  }
  return [{
    kind: 'scene/advance',
    location: fallbackLocation,
    participantIds: [...survivors, ...extraParticipants.filter(seat => !survivors.includes(seat))],
  }]
}

/**
 * Settle one complete night and advance to dawn, Hunter resolution, or game over.
 * @param world - canonical state containing every required night choice.
 * @returns world with deaths and the next phase committed.
 */
export function resolveNight(world: Storyworld): Storyworld {
  const round = phaseRound(world, 'night')
  const witchId = standardWerewolfActorWithRole(world, 'witch')
  const seerId = standardWerewolfActorWithRole(world, 'seer')
  const hunterId = standardWerewolfActorWithRole(world, 'hunter')
  const wolfKillId = choiceIds(world, `night:${round}:wolf-kill:`)[0]
  if (wolfKillId === undefined) throw new Error(`night ${round} has no wolf target`)
  const witchActions = choiceIds(world, `night:${round}:witch:`)
  if (isLiving(world, witchId) && witchActions.length !== 1) {
    throw new Error(`night ${round} requires exactly one Witch action`)
  }
  const inspections = choiceIds(world, `night:${round}:seer:`)
  if (isLiving(world, seerId) && inspections.length !== 1) {
    throw new Error(`night ${round} requires exactly one Seer action`)
  }
  const wolfTarget = choiceTarget(wolfKillId)
  const saved = witchActions.some(id => id === `night:${round}:witch:save:${wolfTarget}`)
  const poisonId = witchActions.find(id => id.includes(':witch:poison:'))
  const poisonTarget = poisonId === undefined ? undefined : choiceTarget(poisonId)
  const deaths = new Set<RoleplayActorId>()
  if (!saved) deaths.add(wolfTarget)
  if (poisonTarget !== undefined) deaths.add(poisonTarget)
  const events: RoleplayWorldEvent[] = [...deaths].map(actorId => ({
    kind: 'actor/move',
    actorId,
    location: 'dead',
  }))
  events.push(recordChoice(
    `day:${round}:announcement`,
    deaths.size === 0
      ? `Day ${round} began without a death.`
      : `Day ${round} began with ${[...deaths].join(' and ')} dead.`,
    publicVisibility(),
  ))
  const hunterKilled = deaths.has(hunterId) && poisonTarget !== hunterId
  if (hunterKilled) {
    events.push({
      kind: 'scene/advance',
      location: `hunter-shot-night-${round}`,
      participantIds: [...livingSeats(world).filter(seat => !deaths.has(seat)), hunterId],
    })
  } else {
    events.push(...terminalEvents(world, deaths, nextDayLocation(round)))
  }
  return apply(world, events)
}

/**
 * Resolve the eligible dead Hunter's shot.
 * @param world - canonical state in a Hunter-shot phase.
 * @param hunterId - dead seat assigned the Hunter in this match.
 * @param targetId - living seat to eliminate.
 * @returns world advanced to the interrupted dawn or next-night flow after the shot.
 */
export function hunterShoot(
  world: Storyworld,
  hunterId: RoleplayActorId,
  targetId: RoleplayActorId,
): Storyworld {
  const { origin, round } = hunterShotPhase(world)
  assertRole(world, hunterId, 'hunter')
  const hunter = world.actors.find(actor => actor.id === hunterId)
  if (hunter?.location !== 'dead') throw new Error('the Hunter must be dead before shooting')
  const poisoned = choiceIds(world, `night:${round}:witch:poison:`).some(id => choiceTarget(id) === hunterId)
  if (poisoned) throw new Error('a poisoned Hunter cannot shoot')
  assertLiving(world, targetId, 'Hunter target')
  const eliminated = new Set([targetId])
  const events: RoleplayWorldEvent[] = [
    { kind: 'fact/reveal', factId: roleFactOf(hunterId), observerIds: ALL_OBSERVERS },
    { kind: 'actor/move', actorId: targetId, location: 'dead' },
    recordChoice(
      `day:${round}:hunter-shot:${targetId}`,
      `The Hunter shot ${targetId}.`,
      publicVisibility(),
    ),
    ...terminalEvents(
      world,
      eliminated,
      origin === 'night' ? nextDayLocation(round) : nextNightLocation(round),
    ),
  ]
  return apply(world, events)
}

function tally(
  world: Storyworld,
  ballots: readonly StandardWerewolfBallot[],
  weighted: boolean,
): Map<RoleplayActorId, number> {
  const seen = new Set<RoleplayActorId>()
  const result = new Map<RoleplayActorId, number>()
  const sheriff = weighted ? currentSheriff(world) : undefined
  for (const ballot of ballots) {
    if (!canVote(world, ballot.voterId)) throw new Error(`${ballot.voterId} cannot vote`)
    if (seen.has(ballot.voterId)) throw new Error(`${ballot.voterId} voted more than once`)
    seen.add(ballot.voterId)
    if (ballot.targetId === undefined) continue
    if (!canBeExiled(world, ballot.targetId)) {
      throw new Error(`${ballot.targetId} cannot be exiled`)
    }
    const weight = ballot.voterId === sheriff ? STANDARD_WEREWOLF_RULES.sheriff.voteWeight : 1
    result.set(ballot.targetId, (result.get(ballot.targetId) ?? 0) + weight)
  }
  return result
}

function leaders(tallyResult: ReadonlyMap<RoleplayActorId, number>): RoleplayActorId[] {
  if (tallyResult.size === 0) return []
  const highVote = Math.max(...tallyResult.values())
  return [...tallyResult.entries()]
    .filter(([, count]) => count === highVote)
    .map(([actorId]) => actorId)
}

function ballotEvents(
  prefix: string,
  ballots: readonly StandardWerewolfBallot[],
): RoleplayWorldEvent[] {
  return ballots.map(ballot => recordChoice(
    `${prefix}:${ballot.voterId}:${ballot.targetId ?? 'abstain'}`,
    ballot.targetId === undefined
      ? `${ballot.voterId} abstained.`
      : `${ballot.voterId} voted for ${ballot.targetId}.`,
    publicVisibility(),
  ))
}

/**
 * Resolve the first Sheriff ballot or open its runoff.
 * @param world - canonical first-day Sheriff-election state.
 * @param candidateIds - distinct living candidates.
 * @param ballots - one ballot from every eligible non-candidate.
 * @returns world with a Sheriff or a Sheriff runoff phase.
 */
export function electSheriff(
  world: Storyworld,
  candidateIds: readonly RoleplayActorId[],
  ballots: readonly StandardWerewolfBallot[],
): Storyworld {
  const round = phaseRound(world, 'sheriff-election')
  if (round !== 1) throw new Error('the Sheriff election occurs only on day 1')
  if (candidateIds.length === 0) throw new Error('the Sheriff election requires a candidate')
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error('a Sheriff candidate may stand only once')
  }
  for (const candidateId of candidateIds) assertLiving(world, candidateId, 'Sheriff candidate')
  const candidateSet = new Set(candidateIds)
  const eligibleVoters = livingSeats(world).filter(actorId =>
    canVote(world, actorId) && !candidateSet.has(actorId))
  if (ballots.length !== eligibleVoters.length) {
    throw new Error('every eligible non-candidate must submit one Sheriff ballot')
  }
  for (const ballot of ballots) {
    if (candidateSet.has(ballot.voterId)) throw new Error('an active Sheriff candidate cannot vote')
    if (ballot.targetId !== undefined && !candidateSet.has(ballot.targetId)) {
      throw new Error('a Sheriff ballot must name an active candidate')
    }
  }
  const events = ballotEvents('sheriff-election:1', ballots)
  const electionLeaders = leaders(tally(world, ballots, false))
  if (electionLeaders.length !== 1) {
    events.push({
      kind: 'scene/advance',
      location: 'sheriff-pk-1',
      participantIds: electionLeaders.length === 0 ? candidateIds : electionLeaders,
    })
    return apply(world, events)
  }
  const sheriffId = electionLeaders[0]
  if (sheriffId === undefined) throw new Error('the Sheriff election has no winner')
  events.push(
    recordChoice(
      `sheriff:holder:${sheriffId}`,
      `${sheriffId} became Sheriff.`,
      publicVisibility(),
    ),
    {
      kind: 'scene/advance',
      location: 'discussion-1',
      participantIds: livingSeats(world),
    },
  )
  return apply(world, events)
}

/**
 * Resolve a first-day registration with at most one candidate.
 * @param world - canonical first-day Sheriff-registration state with zero or one candidate.
 * @returns world advanced to public discussion with the uncontested result.
 */
export function closeSheriffRegistration(world: Storyworld): Storyworld {
  const round = phaseRound(world, 'sheriff-election')
  if (round !== 1) throw new Error('the Sheriff election occurs only on day 1')
  const candidateChoices = choiceIds(world, 'sheriff:candidate:')
  if (candidateChoices.length > 1) {
    throw new Error('Sheriff registration with multiple candidates must proceed to a ballot')
  }
  const candidateId = candidateChoices[0]?.slice('sheriff:candidate:'.length)
  return apply(world, [
    candidateId === undefined
      ? recordChoice('sheriff:none', 'No player stood for Sheriff.', publicVisibility())
      : recordChoice(
        `sheriff:holder:${candidateId}`,
        `${candidateId} became Sheriff uncontested.`,
        publicVisibility(),
      ),
    { kind: 'scene/advance', location: 'discussion-1', participantIds: livingSeats(world) },
  ])
}

/**
 * Resolve the Sheriff runoff and proceed with or without a Sheriff.
 * @param world - canonical Sheriff-runoff state.
 * @param ballots - one ballot from every eligible non-candidate.
 * @returns world advanced to public discussion.
 */
export function resolveSheriffPk(
  world: Storyworld,
  ballots: readonly StandardWerewolfBallot[],
): Storyworld {
  const round = phaseRound(world, 'sheriff-pk')
  const pkCandidates = new Set(world.scene.participantIds)
  const eligibleVoters = livingSeats(world).filter(actorId =>
    canVote(world, actorId) && !pkCandidates.has(actorId))
  if (ballots.length !== eligibleVoters.length) {
    throw new Error('every eligible non-candidate must submit one Sheriff PK ballot')
  }
  for (const ballot of ballots) {
    if (pkCandidates.has(ballot.voterId)) throw new Error('a Sheriff PK candidate cannot vote')
    if (ballot.targetId !== undefined && !pkCandidates.has(ballot.targetId)) {
      throw new Error('a Sheriff PK ballot must name a tied candidate')
    }
  }
  const events = ballotEvents(`sheriff-pk:${round}`, ballots)
  const electionLeaders = leaders(tally(world, ballots, false))
  if (electionLeaders.length !== 1) {
    events.push(
      recordChoice('sheriff:none', 'The second tie left the match without a Sheriff.', publicVisibility()),
      { kind: 'scene/advance', location: `discussion-${round}`, participantIds: livingSeats(world) },
    )
    return apply(world, events)
  }
  const sheriffId = electionLeaders[0]
  if (sheriffId === undefined) throw new Error('the Sheriff PK has no winner')
  events.push(
    recordChoice(`sheriff:holder:${sheriffId}`, `${sheriffId} became Sheriff.`, publicVisibility()),
    { kind: 'scene/advance', location: `discussion-${round}`, participantIds: livingSeats(world) },
  )
  return apply(world, events)
}

/**
 * Read the last recorded Sheriff badge owner even when that actor has died.
 * @param world - canonical match state.
 * @returns recorded holder, or undefined after destruction or before election.
 */
export function sheriffBadgeHolder(world: Storyworld): RoleplayActorId | undefined {
  const marker = world.choices.findLast((choice) => {
    const id = String(choice.id)
    return id === 'sheriff:destroyed' || id.startsWith('sheriff:holder:')
  })
  if (marker === undefined || marker.id === 'sheriff:destroyed') return undefined
  return choiceTarget(String(marker.id))
}

/**
 * Read the current living Sheriff badge holder.
 * @param world - canonical match state.
 * @returns living holder, or undefined when absent or awaiting transfer.
 */
export function currentSheriff(world: Storyworld): RoleplayActorId | undefined {
  const actorId = sheriffBadgeHolder(world)
  return actorId !== undefined && isLiving(world, actorId) ? actorId : undefined
}

/**
 * Record one public statement per living seat and open exile voting.
 * @param world - canonical public-discussion state.
 * @param statements - non-empty statement keyed by every living seat.
 * @returns world advanced to exile voting.
 */
export function recordDaySpeeches(
  world: Storyworld,
  statements: ReadonlyMap<RoleplayActorId, string>,
): Storyworld {
  const round = phaseRound(world, 'discussion')
  const living = livingSeats(world)
  if (statements.size !== living.length) throw new Error('every living player must speak before voting')
  const events: RoleplayWorldEvent[] = living.map((actorId) => {
    const statement = statements.get(actorId)
    if (statement === undefined || statement.trim().length === 0) {
      throw new Error(`${actorId} lacks a public statement`)
    }
    if (statement.length > STANDARD_WEREWOLF_STATEMENT_MAX_LENGTH) {
      throw new Error(`${actorId} public statement exceeds its length limit`)
    }
    const normalized = statement.trim()
    return recordChoice(
      `day:${round}:speech:${actorId}`,
      `${actorId}: ${normalized}`,
      publicVisibility(),
    )
  })
  events.push({
    kind: 'scene/advance',
    location: `exile-vote-${round}`,
    participantIds: living,
  })
  return apply(world, events)
}

/**
 * Resolve one exile ballot, including runoff, Idiot, Hunter, and victory rules.
 * @param world - canonical exile or exile-runoff state.
 * @param ballots - one ballot from every eligible voter.
 * @returns world advanced to the resulting phase.
 */
export function resolveExile(
  world: Storyworld,
  ballots: readonly StandardWerewolfBallot[],
): Storyworld {
  const isPk = world.scene.location.startsWith('exile-pk-')
  const round = phaseRound(world, isPk ? 'exile-pk' : 'exile-vote')
  const pkCandidates = new Set(isPk ? world.scene.participantIds : [])
  const eligibleVoters = livingSeats(world).filter(actorId =>
    canVote(world, actorId) && !pkCandidates.has(actorId))
  if (ballots.length !== eligibleVoters.length) {
    throw new Error('every eligible living player must submit one exile ballot')
  }
  if (isPk) {
    for (const ballot of ballots) {
      if (pkCandidates.has(ballot.voterId)) throw new Error('an exile PK candidate cannot vote')
      if (ballot.targetId !== undefined && !pkCandidates.has(ballot.targetId)) {
        throw new Error('an exile PK ballot must name a tied candidate')
      }
    }
  }
  const exileTally = tally(world, ballots, true)
  const exileLeaders = leaders(exileTally)
  const events = ballotEvents(`day:${round}:${isPk ? 'pk-vote' : 'exile-vote'}`, ballots)
  if (exileLeaders.length !== 1) {
    if (!isPk) {
      events.push({
        kind: 'scene/advance',
        location: `exile-pk-${round}`,
        participantIds: exileLeaders.length === 0 ? livingSeats(world) : exileLeaders,
      })
    } else {
      events.push(
        recordChoice(
          `day:${round}:no-exile`,
          `Day ${round} ended without an elimination after the second tie.`,
          publicVisibility(),
        ),
        {
          kind: 'scene/advance',
          location: nextNightLocation(round),
          participantIds: livingSeats(world),
        },
      )
    }
    return apply(world, events)
  }
  const eliminatedId = exileLeaders[0]
  if (eliminatedId === undefined) throw new Error('the exile vote has no winner')
  if (standardWerewolfRoleIn(world, eliminatedId) === 'idiot') {
    events.push(
      { kind: 'actor/move', actorId: eliminatedId, location: 'revealed-idiot' },
      { kind: 'fact/reveal', factId: roleFactOf(eliminatedId), observerIds: ALL_OBSERVERS },
      recordChoice(
        `day:${round}:idiot-reveal:${eliminatedId}`,
        `${eliminatedId} revealed as the Idiot, survived, and lost the vote.`,
        publicVisibility(),
      ),
      {
        kind: 'scene/advance',
        location: nextNightLocation(round),
        participantIds: livingSeats(world),
      },
    )
    return apply(world, events)
  }
  events.push({ kind: 'actor/move', actorId: eliminatedId, location: 'dead' })
  if (standardWerewolfRoleIn(world, eliminatedId) === 'hunter') {
    events.push({
      kind: 'scene/advance',
      location: `hunter-shot-exile-${round}`,
      participantIds: livingSeats(world),
    })
    return apply(world, events)
  }
  events.push(...terminalEvents(world, new Set([eliminatedId]), nextNightLocation(round)))
  return apply(world, events)
}

/**
 * Transfer or destroy the badge after its holder dies.
 * @param world - canonical match state with a dead badge holder.
 * @param targetId - optional living recipient; omission destroys the badge.
 * @returns world containing the public badge decision.
 */
export function transferSheriff(
  world: Storyworld,
  targetId?: RoleplayActorId,
): Storyworld {
  const sheriffId = sheriffBadgeHolder(world)
  if (sheriffId === undefined) throw new Error('the match has no Sheriff badge to transfer')
  if (isLiving(world, sheriffId)) throw new Error('a living Sheriff retains the badge')
  if (targetId !== undefined) assertLiving(world, targetId, 'badge recipient')
  return apply(world, [recordChoice(
    targetId === undefined ? 'sheriff:destroyed' : `sheriff:holder:${targetId}`,
    targetId === undefined
      ? `${sheriffId} destroyed the Sheriff badge.`
      : `${sheriffId} transferred the Sheriff badge to ${targetId}.`,
    publicVisibility(),
  )])
}

/**
 * Resolve a living wolf's daytime explosion and end that day.
 * @param world - canonical public daytime state.
 * @param wolfId - living wolf choosing to explode.
 * @returns world advanced to the next night or game over.
 */
export function wolfExplode(
  world: Storyworld,
  wolfId: RoleplayActorId,
): Storyworld {
  const match = /^(?:discussion|exile-vote|exile-pk)-(\d+)$/.exec(world.scene.location)
  if (match?.[1] === undefined) throw new Error('a werewolf may explode only during the day')
  const round = Number(match[1])
  assertRole(world, wolfId, 'wolf')
  assertLiving(world, wolfId, 'exploding werewolf')
  const eliminated = new Set([wolfId])
  return apply(world, [
    { kind: 'actor/move', actorId: wolfId, location: 'dead' },
    { kind: 'fact/reveal', factId: roleFactOf(wolfId), observerIds: ALL_OBSERVERS },
    recordChoice(
      `day:${round}:wolf-explosion:${wolfId}`,
      `${wolfId} exploded as a werewolf and ended the day.`,
      publicVisibility(),
    ),
    ...terminalEvents(world, eliminated, nextNightLocation(round)),
  ])
}
