/** Replay-safe completion of asynchronous wolf-pack ballots. */

import type { RoleplayActorId } from '../runtime/index.ts'

/**
 * Preserve direct ballots and complete one ballot for every independently controlled wolf.
 * @param directByActor - already committed ballots, such as the human seat's selection.
 * @param agentActors - living Character seats in the same order as decision targets.
 * @param decisionTargets - validated targets, with undefined for an invalid or expired Character.
 * @param fallbackTarget - replay-stable target used only for a missing Character decision.
 * @returns one target for every direct or Character-controlled living wolf.
 */
export function completeWolfBallotTargets(
  directByActor: ReadonlyMap<RoleplayActorId, RoleplayActorId>,
  agentActors: readonly RoleplayActorId[],
  decisionTargets: readonly (RoleplayActorId | undefined)[],
  fallbackTarget: (actorId: RoleplayActorId) => RoleplayActorId,
): Map<RoleplayActorId, RoleplayActorId> {
  const completed = new Map(directByActor)
  for (const [index, actorId] of agentActors.entries()) {
    completed.set(actorId, decisionTargets[index] ?? fallbackTarget(actorId))
  }
  return completed
}
