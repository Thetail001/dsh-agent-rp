/** rc.2 bridge for Roleplay-owned durable Session event types. */

/** Durable event vocabulary interpreted by this bundle. */
export const ROLEPLAY_SESSION_EVENT_TYPES = [
  'rp/seed',
  'rp/observer',
  'rp/proposal',
  'werewolf/decision-failure',
  'werewolf/decision-memory',
  'werewolf/progress',
] as const

interface MutableEventTypeRegistry extends ReadonlySet<string> {
  add(value: string): MutableEventTypeRegistry
  delete(value: string): boolean
}

const registrations = new Map<string, { count: number; owned: boolean }>()

/**
 * Make this downstream bundle's required events readable by rc.2 persistence.
 *
 * rc.2 exports its event vocabulary but defers a public downstream registration
 * service. Roleplay cannot mark these records ignorable: seed, observer binding,
 * Character memory, and live progress all participate in bundle reconstruction.
 * This narrow bridge can be deleted when DSH exposes that registration service.
 *
 * @returns a disposer that releases this registration without removing event
 * types already owned by the Host or another active bundle instance.
 */
export function registerRoleplaySessionEventTypes(knownEventTypes: ReadonlySet<string>): () => void {
  const registry = knownEventTypes as MutableEventTypeRegistry
  if (typeof registry.add !== 'function' || typeof registry.delete !== 'function') {
    throw new Error('this DSH build does not expose a mutable Session event vocabulary')
  }

  for (const eventType of ROLEPLAY_SESSION_EVENT_TYPES) {
    const current = registrations.get(eventType)
    if (current !== undefined) {
      current.count += 1
      continue
    }
    const owned = !registry.has(eventType)
    if (owned) registry.add(eventType)
    registrations.set(eventType, { count: 1, owned })
  }

  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    for (const eventType of ROLEPLAY_SESSION_EVENT_TYPES) {
      const current = registrations.get(eventType)
      if (current === undefined) continue
      current.count -= 1
      if (current.count > 0) continue
      registrations.delete(eventType)
      if (current.owned) registry.delete(eventType)
    }
  }
}
