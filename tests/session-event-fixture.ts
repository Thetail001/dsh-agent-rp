/** Detached-Session fixture for the appendIgnorable API not yet present in the published DSH test dependency. */

import {
  Session,
  type SessionEvent,
  type SessionEventMap,
  type SessionEventType,
} from '@deepseek-ai/dsh-session'

interface SessionInternals {
  readonly log: SessionEvent[]
  eventsSnapshot: readonly SessionEvent[] | undefined
}

interface IgnorableSessionPrototype {
  appendIgnorable?<T extends SessionEventType>(
    type: T,
    data: SessionEventMap[T],
  ): SessionEvent<T> & { readonly ignorable: true }
}

/** Install a detached-only equivalent before constructing Session fixtures in this process. */
export function installIgnorableSessionEventFixture(): void {
  const prototype = Session.prototype as Session['constructor']['prototype'] & IgnorableSessionPrototype
  if (typeof prototype.appendIgnorable === 'function') return
  Object.defineProperty(prototype, 'appendIgnorable', {
    configurable: true,
    value<T extends SessionEventType>(
      this: Session,
      type: T,
      data: SessionEventMap[T],
    ): SessionEvent<T> & { readonly ignorable: true } {
      const append = this.append as unknown as (
        eventType: SessionEventType,
        eventData: SessionEventMap[SessionEventType],
      ) => SessionEvent
      const original = append.call(this, type, data)
      const marked = Object.freeze({ ...original, ignorable: true as const }) as SessionEvent
      const internals = this as unknown as SessionInternals
      internals.log[original.seq] = marked
      internals.eventsSnapshot = undefined
      return marked as SessionEvent<T> & { readonly ignorable: true }
    },
  })
}
