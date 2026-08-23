/** Provider-owned Tavern Helper preflight contributions for selected Roleplay resources. */

import type { Context } from '@deepseek-ai/cordis'
import type { RoleplayResourceCatalog } from './roleplay-resource-catalog.ts'
import type {
  RoleplayResourceDescriptor,
  RoleplayResourceSelection,
} from './roleplay-resource-catalog-protocol.ts'
import type { TavernPreflightSource } from './tavern-preflight.ts'

/** Host service used by trusted input adapters without coupling the resource catalog to Tavern. */
export const TAVERN_RESOURCE_PREFLIGHT_KEY = 'agentRp.tavernResourcePreflight'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Trusted adapters can describe static Tavern scripts owned by their Roleplay resources. */
    'agentRp.tavernResourcePreflight': TavernResourcePreflightRegistry
  }
}

/** Immutable provider-owned selection metadata passed to one Tavern adapter. */
export interface TavernResourcePreflightResolveInput {
  readonly selection: RoleplayResourceSelection
  readonly descriptor: RoleplayResourceDescriptor
}

/** One resource provider's optional Tavern compatibility contribution. */
export interface TavernResourcePreflightContributor {
  readonly providerId: string
  resolve(input: TavernResourcePreflightResolveInput): TavernPreflightSource | undefined
}

interface Registration {
  readonly token: symbol
  readonly providerId: string
  readonly resolve: TavernResourcePreflightContributor['resolve']
}

/** Player selection refers to a missing or archived resource. */
export class TavernResourcePreflightUnavailableError extends Error {
  readonly selection: RoleplayResourceSelection

  constructor(selection: RoleplayResourceSelection) {
    super(`Roleplay resource ${JSON.stringify([selection.kind, selection.id])} is unavailable`)
    this.name = 'TavernResourcePreflightUnavailableError'
    this.selection = selection
  }
}

function stableId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512
    || value.trim() !== value || /\s/u.test(value)) {
    throw new Error(`${label} must be a non-empty stable id without whitespace`)
  }
  return value
}

function source(
  value: TavernPreflightSource,
  providerId: string,
  selection: RoleplayResourceSelection,
): TavernPreflightSource {
  if (typeof value !== 'object' || value === null
    || (value.scope !== 'character' && value.scope !== 'preset')
    || !Array.isArray(value.scripts)) {
    throw new Error(`Tavern resource preflight provider ${JSON.stringify(providerId)} returned an invalid source`)
  }
  const expectedScope = selection.kind === 'actor' ? 'character'
    : selection.kind === 'prompt-policy' ? 'preset' : undefined
  if (expectedScope === undefined || value.scope !== expectedScope) {
    throw new Error(
      `Tavern resource preflight provider ${JSON.stringify(providerId)} returned scope ${JSON.stringify(value.scope)}`
      + ` for ${JSON.stringify(selection.kind)}`,
    )
  }
  const ownerId = stableId(value.ownerId, `Tavern resource preflight provider ${JSON.stringify(providerId)} owner id`)
  if (value.scripts.some(script => typeof script !== 'object' || script === null
    || typeof script.id !== 'string' || script.id.trim() === ''
    || typeof script.name !== 'string' || typeof script.content !== 'string'
    || typeof script.enabled !== 'boolean')) {
    throw new Error(`Tavern resource preflight provider ${JSON.stringify(providerId)} returned invalid scripts`)
  }
  return Object.freeze({ scope: value.scope, ownerId, scripts: Object.freeze([...value.scripts]) })
}

/** Deterministic provider dispatcher kept separate from the source-neutral resource catalog. */
export class TavernResourcePreflightRegistry {
  readonly #registrations = new Map<string, Registration>()

  /** Register one provider adapter and return a stale-disposer-safe revocation. */
  register(contributor: TavernResourcePreflightContributor): () => void {
    const providerId = stableId(contributor.providerId, 'Tavern resource preflight provider id')
    if (this.#registrations.has(providerId)) {
      throw new Error(`Tavern resource preflight provider ${JSON.stringify(providerId)} is already registered`)
    }
    if (typeof contributor.resolve !== 'function') {
      throw new Error(`Tavern resource preflight provider ${JSON.stringify(providerId)} needs a resolver`)
    }
    const registration = { token: Symbol(providerId), providerId, resolve: contributor.resolve.bind(contributor) }
    this.#registrations.set(providerId, registration)
    return () => {
      if (this.#registrations.get(providerId)?.token === registration.token) {
        this.#registrations.delete(providerId)
      }
    }
  }

  /** Resolve selected resources by exact catalog ownership without knowing provider-specific ids. */
  resolve(
    catalog: RoleplayResourceCatalog,
    selections: readonly RoleplayResourceSelection[],
  ): readonly TavernPreflightSource[] {
    const sources: TavernPreflightSource[] = []
    const scopes = new Set<TavernPreflightSource['scope']>()
    for (const selection of selections) {
      const located = catalog.locate(selection.kind, selection.id)
      if (located === undefined || located.descriptor.availability !== 'available') {
        throw new TavernResourcePreflightUnavailableError(selection)
      }
      const registration = this.#registrations.get(located.providerId)
      if (registration === undefined) continue
      const input = Object.freeze({
        selection: Object.freeze({
          kind: selection.kind,
          id: selection.id,
          ...(selection.variant === undefined ? {} : { variant: selection.variant }),
        }),
        descriptor: located.descriptor,
      })
      const resolved = registration.resolve(input)
      if (resolved === undefined) continue
      if (typeof resolved === 'object' && resolved !== null
        && 'then' in resolved && typeof resolved.then === 'function') {
        throw new Error(`Tavern resource preflight provider ${JSON.stringify(registration.providerId)} must resolve synchronously`)
      }
      const normalized = source(resolved, registration.providerId, selection)
      if (scopes.has(normalized.scope)) {
        throw new Error(`More than one selected Roleplay resource contributes Tavern scope ${JSON.stringify(normalized.scope)}`)
      }
      scopes.add(normalized.scope)
      sources.push(normalized)
    }
    return Object.freeze(sources.sort((left, right) => left.scope === right.scope
      ? 0 : left.scope === 'character' ? -1 : 1))
  }
}

/** Register through the caller's Cordis scope so plugin unload revokes its adapter. */
export function registerTavernResourcePreflightContributor(
  ctx: Context,
  contributor: TavernResourcePreflightContributor,
): void {
  const registry = ctx.get(TAVERN_RESOURCE_PREFLIGHT_KEY)
  if (registry === undefined || typeof registry.register !== 'function') {
    throw new Error('Agent RP Tavern resource preflight service is unavailable')
  }
  ctx.effect(
    () => registry.register(contributor),
    `agent-rp: Tavern resource preflight provider ${contributor.providerId}`,
  )
}
