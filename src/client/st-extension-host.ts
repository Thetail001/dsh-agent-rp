/** Browser lifecycle owner for the singleton installed ST extension document. */

import { compileStExtensionDocument, parseStExtensionHostMessage } from './st-extension-document.ts'
import type { InstalledStExtensionRegistry } from './st-extension-registry.ts'

/**
 * Mount one rebuildable extension iframe for a browser ClientContext.
 * @param hostWindow - Browser window receiving reports from the current frame.
 * @param hostDocument - Browser document that owns the singleton frame.
 * @param registry - Client-side extension registration source.
 * @param warn - Content-free lifecycle warning sink.
 * @returns Complete teardown for the Client plugin effect.
 */
export function installStExtensionHost(
  hostWindow: Window,
  hostDocument: Document,
  registry: InstalledStExtensionRegistry,
  warn: (message: string) => void,
): () => void {
  let active = true
  let scheduled = false
  let frame: HTMLIFrameElement | undefined
  let token: string | undefined

  const removeFrame = (): void => {
    frame?.remove()
    frame = undefined
    token = undefined
  }
  const rebuild = (): void => {
    scheduled = false
    if (!active) return
    removeFrame()
    const snapshot = registry.getSnapshot()
    if (snapshot.entries.length === 0) return
    token = crypto.randomUUID()
    const nonce = crypto.randomUUID().replaceAll('-', '')
    const next = hostDocument.createElement('iframe')
    next.title = 'SillyTavern 扩展宿主'
    next.dataset.agentRpStExtensionHost = ''
    next.dataset.agentRpStExtensionPhase = 'booting'
    next.dataset.agentRpStExtensionRevision = String(snapshot.revision)
    next.hidden = true
    next.referrerPolicy = 'no-referrer'
    next.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms')
    next.srcdoc = compileStExtensionDocument({ entries: snapshot.entries, nonce, token })
    frame = next
    hostDocument.body.append(next)
  }
  const schedule = (): void => {
    if (scheduled || !active) return
    scheduled = true
    queueMicrotask(rebuild)
  }
  const receive = (event: MessageEvent<unknown>): void => {
    if (frame === undefined || token === undefined || event.source !== frame.contentWindow) return
    const message = parseStExtensionHostMessage(event.data, token)
    if (message === undefined) return
    if (message.action === 'settings-surface') {
      frame.dataset.agentRpStExtensionSettings = message.hasContent ? 'visible' : 'empty'
      return
    }
    if (message.action === 'extension-state') {
      if (message.status === 'failed') {
        warn(`agent-rp: installed ST extension ${JSON.stringify(message.extensionId)} failed: ${message.error}`)
      }
      return
    }
    frame.dataset.agentRpStExtensionPhase = message.status
    frame.dataset.agentRpStExtensionLoaded = String(message.loaded.length)
    frame.dataset.agentRpStExtensionFailed = String(message.failed.length)
    if (message.status === 'failed') warn(`agent-rp: installed ST extension host failed: ${message.error}`)
  }

  hostWindow.addEventListener('message', receive)
  const unsubscribe = registry.subscribe(schedule)
  schedule()
  return () => {
    if (!active) return
    active = false
    unsubscribe()
    hostWindow.removeEventListener('message', receive)
    removeFrame()
  }
}
