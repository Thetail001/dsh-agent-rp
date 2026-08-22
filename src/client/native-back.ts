/** Browser-side participant in the Android host's layered back contract. */

export const AGENT_RP_NATIVE_BACK_EVENT = 'dsh:native-back'

export const AGENT_RP_NATIVE_BACK_LAYER_SELECTOR = [
  '[data-agent-rp-dialog]',
  '[data-agent-rp-surface][role="dialog"]',
  '[data-agent-rp-workbench-layer]',
  '[data-agent-rp-native-back-layer]',
].join(', ')

interface LayerStyle {
  readonly display: string
  readonly position: string
  readonly visibility: string
  readonly zIndex: string
}

type StyleReader = (element: Element) => LayerStyle
type MouseEventFactory = () => Event

function visible(element: Element, style: LayerStyle): boolean {
  return !(element as HTMLElement).hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && ((element as HTMLElement).getClientRects().length > 0 || style.position === 'fixed')
}

function layerOrder(element: Element, index: number, styleOf: StyleReader): readonly [number, number] {
  const parsed = Number.parseInt(styleOf(element).zIndex, 10)
  return [Number.isFinite(parsed) ? parsed : 0, index]
}

/** Locate the visually highest Agent RP layer without reading its content. */
export function activeAgentRpNativeBackLayer(
  root: ParentNode,
  styleOf: StyleReader = element => getComputedStyle(element),
): Element | undefined {
  return [...root.querySelectorAll(AGENT_RP_NATIVE_BACK_LAYER_SELECTOR)]
    .filter(element => visible(element, styleOf(element)))
    .map((element, index) => ({ element, order: layerOrder(element, index, styleOf) }))
    .sort((left, right) => left.order[0] - right.order[0] || left.order[1] - right.order[1])
    .at(-1)?.element
}

function click(element: Element | null): boolean {
  const clickable = element as (Element & { readonly click?: () => void }) | null
  if (clickable === null || typeof clickable.click !== 'function' || clickable.hasAttribute('disabled')) return false
  clickable.click()
  return true
}

function dismissAgentRpLayer(
  layer: Element,
  root: ParentNode,
  createMouseDown: MouseEventFactory,
): void {
  if (layer.matches('[role="menu"]') && click(root.querySelector(
    '[data-agent-rp-action="toggle-session-settings"][aria-expanded="true"]',
  ))) return
  if (click(layer.querySelector(
    '[data-agent-rp-workbench-dismiss], [data-agent-rp-native-back-dismiss], button[aria-label^="关闭"]',
  ))) return
  // Dialogs already share backdrop-dismiss semantics. Dispatching on the
  // outer layer preserves each dialog's own busy/non-dismissible policy.
  layer.dispatchEvent(createMouseDown())
}

/** Claim and dismiss one Agent RP layer for a host-originated back event. */
export function handleAgentRpNativeBack(
  event: Event,
  root: ParentNode = document,
  styleOf: StyleReader = element => getComputedStyle(element),
  createMouseDown: MouseEventFactory = () => new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
): boolean {
  const layer = activeAgentRpNativeBackLayer(root, styleOf)
  if (layer === undefined) return false
  event.preventDefault()
  dismissAgentRpLayer(layer, root, createMouseDown)
  return true
}

/** Install one effect-scoped listener; no Android JavaScript object is exposed. */
export function installAgentRpNativeBack(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  root: ParentNode,
): () => void {
  const listener = (event: Event): void => { handleAgentRpNativeBack(event, root) }
  target.addEventListener(AGENT_RP_NATIVE_BACK_EVENT, listener)
  return () => { target.removeEventListener(AGENT_RP_NATIVE_BACK_EVENT, listener) }
}
