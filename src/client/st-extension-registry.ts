/** Browser-owned registry for installed SillyTavern extension bundles. */

const MAX_EXTENSION_COUNT = 64
const MAX_EXTENSION_SOURCE_BYTES = 2 * 1024 * 1024
const MAX_EXTENSION_STYLE_BYTES = 512 * 1024
const MAX_EXTENSION_TOTAL_BYTES = 8 * 1024 * 1024
const extensionIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u

/** One installed ST extension contributed by a trusted DSH client plugin. */
export interface InstalledStExtensionRegistration {
  readonly id: string
  readonly displayName: string
  readonly loadingOrder: number
  readonly dependencies?: readonly string[]
  /** Self-contained ESM bundle evaluated in the singleton extension document. */
  readonly source: string
  /** Optional stylesheet text installed in the same isolated document. */
  readonly style?: string
}

/** Immutable ordered extension entry owned by the registry. */
export interface InstalledStExtensionEntry {
  readonly id: string
  readonly displayName: string
  readonly loadingOrder: number
  readonly dependencies: readonly string[]
  readonly source: string
  readonly style?: string
}

/** Immutable registry state suitable for `useSyncExternalStore`. */
export interface InstalledStExtensionSnapshot {
  readonly revision: number
  readonly entries: readonly InstalledStExtensionEntry[]
  readonly totalBytes: number
}

interface RegistrationRecord {
  readonly token: symbol
  readonly entry: InstalledStExtensionEntry
  readonly bytes: number
}

function stableId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !extensionIdPattern.test(value)) {
    throw new Error(`${label} must match ${String(extensionIdPattern)}`)
  }
  return value
}

function boundedText(value: unknown, label: string, maximumBytes: number): { readonly text: string; readonly bytes: number } {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`)
  const bytes = new TextEncoder().encode(value).byteLength
  if (bytes > maximumBytes) throw new Error(`${label} exceeds ${String(maximumBytes)} bytes`)
  return { text: value, bytes }
}

function compareEntries(left: InstalledStExtensionEntry, right: InstalledStExtensionEntry): number {
  if (left.loadingOrder !== right.loadingOrder) return left.loadingOrder - right.loadingOrder
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function immutableEntry(registration: InstalledStExtensionRegistration): {
  readonly entry: InstalledStExtensionEntry
  readonly bytes: number
} {
  const id = stableId(registration.id, 'Installed ST extension id')
  const display = boundedText(registration.displayName, 'Installed ST extension displayName', 256)
  if (registration.displayName.trim() !== registration.displayName) {
    throw new Error('Installed ST extension displayName must not have surrounding whitespace')
  }
  if (!Number.isSafeInteger(registration.loadingOrder)
    || registration.loadingOrder < -1_000_000 || registration.loadingOrder > 1_000_000) {
    throw new Error('Installed ST extension loadingOrder must be a safe integer between -1000000 and 1000000')
  }
  const dependencies = registration.dependencies === undefined ? [] : [...registration.dependencies]
  if (dependencies.length > 32) throw new Error('Installed ST extension dependencies exceed 32 entries')
  for (const dependency of dependencies) stableId(dependency, 'Installed ST extension dependency id')
  if (new Set(dependencies).size !== dependencies.length) {
    throw new Error('Installed ST extension dependencies must be unique')
  }
  if (dependencies.includes(id)) throw new Error('Installed ST extension cannot depend on itself')
  const source = boundedText(registration.source, 'Installed ST extension source', MAX_EXTENSION_SOURCE_BYTES)
  const style = registration.style === undefined
    ? undefined
    : boundedText(registration.style, 'Installed ST extension style', MAX_EXTENSION_STYLE_BYTES)
  const entry = Object.freeze({
    id,
    displayName: display.text,
    loadingOrder: registration.loadingOrder,
    dependencies: Object.freeze(dependencies),
    source: source.text,
    ...(style === undefined ? {} : { style: style.text }),
  })
  return { entry, bytes: source.bytes + (style?.bytes ?? 0) }
}

/** Reactive registry shared by Agent RP and trusted browser-side extension plugins. */
export class InstalledStExtensionRegistry {
  readonly #records = new Map<string, RegistrationRecord>()
  readonly #listeners = new Set<() => void>()
  #snapshot: InstalledStExtensionSnapshot = Object.freeze({
    revision: 0,
    entries: Object.freeze([]),
    totalBytes: 0,
  })

  /** Read the stable snapshot object for the current revision. */
  getSnapshot(): InstalledStExtensionSnapshot {
    return this.#snapshot
  }

  /** Subscribe to registration and revocation changes. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** Register one extension and return an idempotent, stale-safe revocation. */
  register(registration: InstalledStExtensionRegistration): () => void {
    const { entry, bytes } = immutableEntry(registration)
    if (this.#records.has(entry.id)) {
      throw new Error(`Installed ST extension ${JSON.stringify(entry.id)} is already registered`)
    }
    if (this.#records.size >= MAX_EXTENSION_COUNT) {
      throw new Error(`Installed ST extension count exceeds ${String(MAX_EXTENSION_COUNT)}`)
    }
    if (this.#snapshot.totalBytes + bytes > MAX_EXTENSION_TOTAL_BYTES) {
      throw new Error(`Installed ST extensions exceed ${String(MAX_EXTENSION_TOTAL_BYTES)} aggregate bytes`)
    }
    const record = { token: Symbol(entry.id), entry, bytes }
    this.#records.set(entry.id, record)
    this.#publish()
    let active = true
    return () => {
      if (!active) return
      active = false
      if (this.#records.get(entry.id)?.token !== record.token) return
      this.#records.delete(entry.id)
      this.#publish()
    }
  }

  #publish(): void {
    this.#snapshot = Object.freeze({
      revision: this.#snapshot.revision + 1,
      entries: Object.freeze([...this.#records.values()].map(record => record.entry).sort(compareEntries)),
      totalBytes: [...this.#records.values()].reduce((total, record) => total + record.bytes, 0),
    })
    for (const listener of this.#listeners) {
      try {
        listener()
      } catch (error) {
        console.error('agent-rp: installed ST extension registry listener failed', error)
      }
    }
  }
}
