/** Transaction-local planning for terminal Werewolf role reveals. */

/**
 * Omit role facts already revealed by an earlier event in the same transaction.
 * @param roleFactIds - complete role fact ids considered by terminal disclosure.
 * @param alreadyRevealedFactIds - facts emitted before terminal disclosure begins.
 * @returns role fact ids still eligible for terminal disclosure, in canonical order.
 */
export function terminalRoleFactIds<T extends string>(
  roleFactIds: readonly T[],
  alreadyRevealedFactIds: readonly T[],
): readonly T[] {
  const alreadyRevealed = new Set(alreadyRevealedFactIds)
  return roleFactIds.filter(factId => !alreadyRevealed.has(factId))
}
