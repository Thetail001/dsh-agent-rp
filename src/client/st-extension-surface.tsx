/** Product surface for settings contributed by browser-installed SillyTavern extensions. */

import { useSyncExternalStore } from 'react'

/** Visible lifecycle state of the singleton installed-extension document. */
export interface InstalledStExtensionSurfaceSnapshot {
  readonly available: boolean
  readonly failed: number
  readonly loaded: number
  readonly open: boolean
  readonly phase: 'idle' | 'booting' | 'ready' | 'failed'
  readonly registryRevision: number
}

type FrameMount = (frame: HTMLIFrameElement) => void

const initialSnapshot: InstalledStExtensionSurfaceSnapshot = Object.freeze({
  available: false,
  failed: 0,
  loaded: 0,
  open: false,
  phase: 'idle',
  registryRevision: 0,
})

/** Shared state between the iframe lifecycle owner and the Agent RP workbench. */
export class InstalledStExtensionSurface {
  readonly #listeners = new Set<() => void>()
  #frame: HTMLIFrameElement | undefined
  #mount: FrameMount | undefined
  #snapshot = initialSnapshot

  /** Read the reference-stable current surface state. */
  readonly getSnapshot = (): InstalledStExtensionSurfaceSnapshot => this.#snapshot

  /** Subscribe to surface state changes. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** Connect the permanent product panel to the current iframe. */
  bindFrameMount(mount: FrameMount): () => void {
    if (this.#mount !== undefined) throw new Error('Installed ST extension surface already has a frame mount')
    this.#mount = mount
    if (this.#frame !== undefined) mount(this.#frame)
    return () => {
      if (this.#mount === mount) this.#mount = undefined
    }
  }

  /** Attach a newly compiled singleton iframe without changing its document later. */
  attachFrame(frame: HTMLIFrameElement, registryRevision: number): void {
    this.#frame = frame
    frame.hidden = false
    frame.style.border = '0'
    frame.style.colorScheme = 'dark'
    frame.style.display = 'block'
    frame.style.height = '100%'
    frame.style.width = '100%'
    this.#mount?.(frame)
    this.#publish({
      available: false,
      failed: 0,
      loaded: 0,
      open: false,
      phase: 'booting',
      registryRevision,
    })
  }

  /** Clear state only when the removed iframe is still current. */
  detachFrame(frame: HTMLIFrameElement): void {
    if (this.#frame !== frame) return
    this.#frame = undefined
    this.#publish({
      available: false,
      failed: 0,
      loaded: 0,
      open: false,
      phase: 'idle',
    })
  }

  /** Publish whether an extension contributed visible settings content. */
  setAvailable(available: boolean): void {
    this.#publish({ available, ...available ? {} : { open: false } })
  }

  /** Publish the terminal activation counts for the current iframe. */
  setHostState(phase: 'ready' | 'failed', loaded: number, failed: number): void {
    this.#publish({ failed, loaded, phase })
  }

  /** Open the panel only when its current document contains settings. */
  open(): void {
    if (this.#snapshot.available) this.#publish({ open: true })
  }

  /** Close the panel without moving or recreating its iframe. */
  close(): void {
    this.#publish({ open: false })
  }

  /** Release retained browser objects after the owning Client plugin unloads. */
  dispose(): void {
    this.#frame = undefined
    this.#mount = undefined
    this.#snapshot = initialSnapshot
    this.#listeners.clear()
  }

  #publish(update: Partial<InstalledStExtensionSurfaceSnapshot>): void {
    const next = Object.freeze({ ...this.#snapshot, ...update })
    if (Object.entries(next).every(([key, value]) => (
      this.#snapshot[key as keyof InstalledStExtensionSurfaceSnapshot] === value
    ))) return
    this.#snapshot = next
    for (const listener of this.#listeners) listener()
  }
}

function phaseText(snapshot: InstalledStExtensionSurfaceSnapshot): string {
  if (snapshot.phase === 'booting') return '正在启动扩展'
  if (snapshot.phase === 'failed') return `宿主失败 · ${snapshot.loaded} 个已加载 · ${snapshot.failed} 个失败`
  if (snapshot.phase === 'ready') return `${snapshot.loaded} 个已加载${snapshot.failed === 0 ? '' : ` · ${snapshot.failed} 个失败`}`
  return '没有运行中的扩展'
}

/** Install the permanent dialog shell that owns the singleton settings iframe. */
export function installStExtensionSurface(
  hostWindow: Window,
  hostDocument: Document,
  surface: InstalledStExtensionSurface,
): () => void {
  const layer = hostDocument.createElement('div')
  layer.hidden = true
  layer.dataset.agentRpStExtensionSettingsLayer = ''
  layer.setAttribute('role', 'presentation')
  layer.style.cssText = 'inset:0;position:fixed;z-index:1240'

  const dismiss = hostDocument.createElement('button')
  dismiss.type = 'button'
  dismiss.setAttribute('aria-label', '关闭 ST 扩展设置')
  dismiss.style.cssText = 'background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.52));border:0;cursor:default;inset:0;padding:0;position:absolute;width:100%'

  const panel = hostDocument.createElement('section')
  panel.dataset.agentRpStExtensionSettingsPanel = ''
  panel.setAttribute('aria-label', 'ST 扩展设置')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('role', 'dialog')
  panel.style.cssText = 'background:var(--dsw-alias-bg-layer-2,#202124);border-left:1px solid var(--dsw-alias-border-l2,#39393c);bottom:0;box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.28));color:var(--dsw-alias-label-primary,#f4f4f5);display:flex;flex-direction:column;position:absolute;right:0;top:0;width:min(560px,100vw)'

  const header = hostDocument.createElement('header')
  header.style.cssText = 'align-items:center;border-bottom:1px solid var(--dsw-alias-border-l2,#39393c);display:flex;gap:10px;padding:15px 16px 13px'
  const heading = hostDocument.createElement('div')
  heading.style.cssText = 'flex:1 1 auto;min-width:0'
  const title = hostDocument.createElement('strong')
  title.textContent = 'ST 扩展设置'
  title.style.cssText = 'display:block;font-size:15px'
  const status = hostDocument.createElement('span')
  status.dataset.agentRpStExtensionSettingsStatus = ''
  status.style.cssText = 'display:block;font-size:11px;margin-top:2px;opacity:.52'
  heading.append(title, status)
  const close = hostDocument.createElement('button')
  close.type = 'button'
  close.setAttribute('aria-label', '关闭 ST 扩展设置')
  close.textContent = '×'
  close.style.cssText = 'align-items:center;background:transparent;border:0;border-radius:50%;color:inherit;cursor:pointer;display:inline-flex;font:inherit;font-size:22px;height:32px;justify-content:center;padding:0;width:32px'
  header.append(heading, close)

  const content = hostDocument.createElement('div')
  content.dataset.agentRpStExtensionSettingsContent = ''
  content.style.cssText = 'flex:1 1 auto;min-height:0;overflow:hidden;padding:12px'
  panel.append(header, content)
  layer.append(dismiss, panel)
  hostDocument.body.append(layer)

  const closePanel = (): void => { surface.close() }
  dismiss.addEventListener('click', closePanel)
  close.addEventListener('click', closePanel)
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && surface.getSnapshot().open) surface.close()
  }
  hostWindow.addEventListener('keydown', onKeyDown)
  const releaseMount = surface.bindFrameMount(frame => { content.append(frame) })
  const render = (): void => {
    const snapshot = surface.getSnapshot()
    layer.hidden = !snapshot.open
    layer.dataset.agentRpStExtensionPhase = snapshot.phase
    layer.dataset.agentRpStExtensionRevision = String(snapshot.registryRevision)
    status.textContent = phaseText(snapshot)
  }
  const unsubscribe = surface.subscribe(render)
  render()

  return () => {
    unsubscribe()
    releaseMount()
    hostWindow.removeEventListener('keydown', onKeyDown)
    dismiss.removeEventListener('click', closePanel)
    close.removeEventListener('click', closePanel)
    layer.remove()
    surface.dispose()
  }
}

/** Props supplied by the Agent RP workbench contribution. */
export interface InstalledStExtensionWorkbenchSectionProps {
  readonly closeWorkbench: () => void
  readonly surface: InstalledStExtensionSurface
}

/** Render the workbench entry only after an extension contributes settings. */
export function InstalledStExtensionWorkbenchSection({
  closeWorkbench,
  surface,
}: InstalledStExtensionWorkbenchSectionProps) {
  const snapshot = useSyncExternalStore(surface.subscribe, surface.getSnapshot, surface.getSnapshot)
  if (!snapshot.available) return null
  return <button type="button" data-agent-rp-action="open-st-extension-settings" onClick={() => {
    closeWorkbench()
    surface.open()
  }} style={{
    alignItems: 'center', background: 'var(--dsw-alias-bg-layer-1, #292a2e)',
    border: '1px solid var(--dsw-alias-border-l2, #3d3d43)', borderRadius: '12px', color: 'inherit',
    cursor: 'pointer', display: 'flex', font: 'inherit', gap: '11px', marginTop: '10px',
    padding: '12px', textAlign: 'left', width: '100%',
  }}>
    <span aria-hidden="true" style={{ fontSize: '19px', lineHeight: 1 }}>▣</span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <strong style={{ display: 'block', fontSize: '13px' }}>ST 扩展设置</strong>
      <span style={{ display: 'block', fontSize: '11px', lineHeight: 1.5, marginTop: '3px', opacity: .52 }}>
        {phaseText(snapshot)}
      </span>
    </span>
    <span aria-hidden="true" style={{ fontSize: '16px', opacity: .38 }}>›</span>
  </button>
}
