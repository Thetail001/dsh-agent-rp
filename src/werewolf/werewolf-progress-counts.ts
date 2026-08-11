/** Complete-table counts layered over direct and Character phase work. */

/**
 * Fold an already submitted direct action into Character batch progress.
 * @param directParticipantIncluded - whether the direct player belongs to this phase's participant pool.
 * @param characterCompleted - Character actions already completed.
 * @param characterTotal - all Character participants in the batch.
 * @returns counts over the complete eligible participant pool.
 */
export function completeDirectProgress(
  directParticipantIncluded: boolean,
  characterCompleted: number,
  characterTotal: number,
): { readonly completed: number; readonly total: number } {
  const directCompleted = directParticipantIncluded ? 1 : 0
  return {
    completed: directCompleted + characterCompleted,
    total: directCompleted + characterTotal,
  }
}

/**
 * Count committed and in-flight speakers once against the full living table.
 * @param livingActorIds - all players eligible to speak this round.
 * @param committedActorIds - speakers already present in the committed Storyworld.
 * @param inFlightActorIds - direct or Character statements prepared by the current command.
 * @returns complete-table speaking progress.
 */
export function completeDiscussionProgress(
  livingActorIds: readonly string[],
  committedActorIds: readonly string[],
  inFlightActorIds: readonly string[],
): { readonly completed: number; readonly total: number } {
  const living = new Set(livingActorIds)
  const completed = new Set([...committedActorIds, ...inFlightActorIds]
    .filter(actorId => living.has(actorId)))
  return { completed: completed.size, total: living.size }
}
