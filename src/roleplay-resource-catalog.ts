/** Source-neutral, read-only registry of reusable Roleplay resources. */

import type { Context } from '@deepseek-ai/cordis'
import {
  ROLEPLAY_RESOURCE_KINDS,
  type RoleplayResourceDescriptor,
  type RoleplayResourceKind,
} from './roleplay-resource-catalog-protocol.ts'

/** Host service used by trusted plugins to publish discoverable Roleplay resources. */
export const ROLEPLAY_RESOURCE_CATALOG_KEY = 'agentRp.resources'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Read-only Roleplay resource providers owned by the current Host. */
    'agentRp.resources': RoleplayResourceCatalog
  }
}

/** One trusted provider. Returned descriptors must be detached, synchronous values. */
export interface RoleplayResourceProvider {
  readonly id: string
  list(): readonly RoleplayResourceDescriptor[]
}

interface Registration {
  readonly token: symbol
  readonly id: string
  readonly list: RoleplayResourceProvider['list']
}

const KIND_ORDER = new Map<RoleplayResourceKind, number>(
  ROLEPLAY_RESOURCE_KINDS.map((kind, index) => [kind, index]),
)

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function stableId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /\s/u.test(value)) {
    throw new Error(`${label} must be a non-empty stable id without whitespace`)
  }
  return value
}

function descriptor(value: RoleplayResourceDescriptor, providerId: string): RoleplayResourceDescriptor {
  const id = stableId(value.id, `Roleplay resource provider ${JSON.stringify(providerId)} resource id`)
  if (!ROLEPLAY_RESOURCE_KINDS.includes(value.kind)) {
    throw new Error(`Roleplay resource provider ${JSON.stringify(providerId)} returned an unknown resource kind`)
  }
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`Roleplay resource provider ${JSON.stringify(providerId)} resource ${JSON.stringify(id)} needs a name`)
  }
  if (value.availability !== 'available' && value.availability !== 'archived') {
    throw new Error(`Roleplay resource provider ${JSON.stringify(providerId)} resource ${JSON.stringify(id)} has invalid availability`)
  }
  if (value.updatedAt !== undefined
    && (!Number.isSafeInteger(value.updatedAt) || value.updatedAt < 0)) {
    throw new Error(`Roleplay resource provider ${JSON.stringify(providerId)} resource ${JSON.stringify(id)} has invalid updatedAt`)
  }
  return Object.freeze({
    id,
    kind: value.kind,
    name: value.name,
    availability: value.availability,
    ...(value.updatedAt === undefined ? {} : { updatedAt: value.updatedAt }),
  })
}

function descriptorKey(value: Pick<RoleplayResourceDescriptor, 'kind' | 'id'>): string {
  return JSON.stringify([value.kind, value.id])
}

function compareDescriptors(left: RoleplayResourceDescriptor, right: RoleplayResourceDescriptor): number {
  return (KIND_ORDER.get(left.kind) ?? Number.MAX_SAFE_INTEGER)
    - (KIND_ORDER.get(right.kind) ?? Number.MAX_SAFE_INTEGER)
    || (left.availability === right.availability ? 0 : left.availability === 'available' ? -1 : 1)
    || compareText(left.name, right.name)
    || compareText(left.id, right.id)
}

/**
 * Live resource directory. Providers retain their own storage and mutation policy;
 * the catalog exposes only normalized discovery metadata and exact runtime ids.
 */
export class RoleplayResourceCatalog {
  readonly #providers = new Map<string, Registration>()

  /** Register one provider and return a stale-disposer-safe revocation. */
  register(provider: RoleplayResourceProvider): () => void {
    const id = stableId(provider.id, 'Roleplay resource provider id')
    if (this.#providers.has(id)) {
      throw new Error(`Roleplay resource provider ${JSON.stringify(id)} is already registered`)
    }
    const registration = { token: Symbol(id), id, list: provider.list.bind(provider) }
    this.#providers.set(id, registration)
    return () => {
      if (this.#providers.get(id)?.token === registration.token) this.#providers.delete(id)
    }
  }

  /** Resolve a deterministic detached snapshot from every currently loaded provider. */
  list(kind?: RoleplayResourceKind): readonly RoleplayResourceDescriptor[] {
    if (kind !== undefined && !ROLEPLAY_RESOURCE_KINDS.includes(kind)) {
      throw new Error(`Unknown Roleplay resource kind ${JSON.stringify(kind)}`)
    }
    const entries: RoleplayResourceDescriptor[] = []
    const owners = new Map<string, string>()
    const providers = [...this.#providers.values()].sort((left, right) => compareText(left.id, right.id))
    for (const provider of providers) {
      const values = provider.list()
      if (!Array.isArray(values)) {
        throw new Error(`Roleplay resource provider ${JSON.stringify(provider.id)} returned an invalid list`)
      }
      for (const value of values) {
        const normalized = descriptor(value, provider.id)
        if (kind !== undefined && normalized.kind !== kind) continue
        const key = descriptorKey(normalized)
        const owner = owners.get(key)
        if (owner !== undefined) {
          throw new Error(`Roleplay resource ${key} is published by both ${JSON.stringify(owner)} and ${JSON.stringify(provider.id)}`)
        }
        owners.set(key, provider.id)
        entries.push(normalized)
      }
    }
    return Object.freeze(entries.sort(compareDescriptors))
  }

  /** Resolve one exact kind/id pair without exposing a provider-specific object. */
  get(kind: RoleplayResourceKind, id: string): RoleplayResourceDescriptor | undefined {
    stableId(id, 'Roleplay resource id')
    return this.list(kind).find(value => value.id === id)
  }
}

/** Register through the caller's Cordis scope so unload always removes the provider. */
export function registerRoleplayResourceProvider(ctx: Context, provider: RoleplayResourceProvider): void {
  const catalog = ctx.get(ROLEPLAY_RESOURCE_CATALOG_KEY)
  if (catalog === undefined || typeof catalog.register !== 'function') {
    throw new Error('Agent RP resource catalog service is unavailable')
  }
  ctx.effect(
    () => catalog.register(provider),
    `agent-rp: resource provider ${provider.id}`,
  )
}
