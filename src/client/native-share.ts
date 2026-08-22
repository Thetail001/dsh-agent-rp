/** Android share intent hint carried without file bytes or a content URI. */

export const AGENT_RP_NATIVE_SHARE_EVENT = 'dsh:native-share'

interface NativeShareHint {
  readonly name: string
  readonly mediaType?: string
}

function nativeShareHint(event: Event): NativeShareHint | undefined {
  if (!(event instanceof CustomEvent) || typeof event.detail !== 'object'
    || event.detail === null || Array.isArray(event.detail)) return undefined
  const detail = event.detail as Record<string, unknown>
  if (typeof detail.name !== 'string' || detail.name.trim() === '' || detail.name.length > 240
    || (detail.mediaType !== undefined && typeof detail.mediaType !== 'string')) return undefined
  return {
    name: detail.name,
    ...(typeof detail.mediaType === 'string' ? { mediaType: detail.mediaType } : {}),
  }
}

/** Open the existing resource workbench; the next chosen file input receives the Android URI. */
export function handleAgentRpNativeShare(event: Event, root: ParentNode = document): boolean {
  if (nativeShareHint(event) === undefined) return false
  const launcher = root.querySelector('[data-agent-rp-action="open-workbench"]') as HTMLElement | null
  if (launcher === null || typeof launcher.click !== 'function') return false
  event.preventDefault()
  launcher.click()
  return true
}

/** Install one effect-scoped listener without retaining any shared-file metadata. */
export function installAgentRpNativeShare(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  root: ParentNode,
): () => void {
  const listener = (event: Event): void => { handleAgentRpNativeShare(event, root) }
  target.addEventListener(AGENT_RP_NATIVE_SHARE_EVENT, listener)
  return () => { target.removeEventListener(AGENT_RP_NATIVE_SHARE_EVENT, listener) }
}
