/** Complete-table progress for a direct player's ballot followed by Character ballots. */

/**
 * Fold an already submitted direct ballot into Character batch progress.
 * @param directVoterIncluded - whether the direct player belongs to this phase's voter pool.
 * @param characterCompleted - Character ballots already completed.
 * @param characterTotal - all Character voters in the batch.
 * @returns counts over the complete eligible voter pool.
 */
export function completeVoteProgress(
  directVoterIncluded: boolean,
  characterCompleted: number,
  characterTotal: number,
): { readonly completed: number; readonly total: number } {
  const directBallots = directVoterIncluded ? 1 : 0
  return {
    completed: directBallots + characterCompleted,
    total: directBallots + characterTotal,
  }
}
