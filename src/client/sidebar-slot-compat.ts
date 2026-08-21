/** Browser-only geometry helpers for DSH sidebar slot compatibility. */

/**
 * Locate the nearest full-height sidebar ancestor and return its right edge.
 * Older DSH sidebar slots expose only the wide/rail state, so the registrant
 * must derive the column boundary from the rendered trigger.
 */
export function resolveLegacySidebarWidth(
  trigger: HTMLElement,
  viewportHeight: number = window.innerHeight,
): number {
  const documentBody = trigger.ownerDocument?.body
  const documentRoot = trigger.ownerDocument?.documentElement
  let ancestor = trigger.parentElement
  while (ancestor !== null && ancestor !== documentBody && ancestor !== documentRoot) {
    const rectangle = ancestor.getBoundingClientRect()
    if (rectangle.left <= 2 && rectangle.height >= viewportHeight * .75) {
      return Math.max(0, Math.round(rectangle.right))
    }
    ancestor = ancestor.parentElement
  }
  return Math.max(0, Math.round(trigger.getBoundingClientRect().right))
}
