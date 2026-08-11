/** Shared actor-location rules for the standard Werewolf scenario. */

/**
 * Check whether one actor location still participates in the match.
 * @param location - canonical actor location.
 * @returns whether the actor remains in play, including a revealed Idiot without a vote.
 */
export function standardWerewolfLocationIsLiving(location: string): boolean {
  return location === 'alive' || location === 'revealed-idiot'
}

/**
 * Check whether one actor location retains a ballot and may be exiled.
 * @param location - canonical actor location.
 * @returns whether the actor can cast or receive an exile ballot.
 */
export function standardWerewolfLocationCanVote(location: string): boolean {
  return location === 'alive'
}
