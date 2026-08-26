/** Transient non-fatal notices produced after a roleplay Session is created. */

export interface SessionLaunchNotice {
  readonly id: number
  readonly message: string
}

/** Observable notice source shared by the launch request and shell overlay. */
export interface SessionLaunchNoticeSource {
  getSnapshot(): SessionLaunchNotice | undefined
  subscribe(listener: () => void): () => void
  publish(message: string): SessionLaunchNotice
  clear(id: number): void
}

/** Create an isolated latest-notice store with stale-dismiss protection. */
export function createSessionLaunchNoticeSource(): SessionLaunchNoticeSource {
  const listeners = new Set<() => void>()
  let sequence = 0
  let snapshot: SessionLaunchNotice | undefined
  const notify = (): void => { for (const listener of listeners) listener() }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    publish(message) {
      snapshot = { id: ++sequence, message }
      notify()
      return snapshot
    },
    clear(id) {
      if (snapshot?.id !== id) return
      snapshot = undefined
      notify()
    },
  }
}
