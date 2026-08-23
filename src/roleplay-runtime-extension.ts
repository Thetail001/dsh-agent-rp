/** Source-neutral Host extension seam for one Roleplay turn runtime. */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  ROLEPLAY_TURN_PHASES,
  type RoleplayModuleBinding,
  type RoleplayStateBinding,
  type RoleplayTurnPhase,
  type RoleplayWorldBinding,
} from './roleplay-runtime.ts'
import type { RoleplayPhaseModuleOutcome } from './roleplay-turn-plan.ts'

/** Host service shared by Agent RP profiles and trusted runtime plugins. */
export const ROLEPLAY_RUNTIME_EXTENSIONS_KEY = 'agentRp.runtimeExtensions'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Trusted Host plugins can join the source-neutral Agent RP turn runtime here. */
    'agentRp.runtimeExtensions': RoleplayRuntimeExtensionRegistry
  }
}

/** The only mutable input surface available to an extension is the durable Session log. */
export interface RoleplayRuntimeExtensionResolveInput {
  readonly events: readonly SessionEvent[]
}

/** Session-derived bindings owned by one active extension module. */
export interface RoleplayRuntimeExtensionResolution {
  readonly world?: readonly RoleplayWorldBinding[]
  readonly state?: readonly RoleplayStateBinding[]
  /** Existing state namespaces also observed or settled by this module. */
  readonly stateIds?: readonly string[]
  /** Content-free outcomes for the preparation phases declared by this module. */
  readonly outcomes?: {
    readonly prepare?: Omit<RoleplayPhaseModuleOutcome, 'moduleId'>
    readonly recall?: Omit<RoleplayPhaseModuleOutcome, 'moduleId'>
  }
}

/** One trusted Host plugin's stable runtime declaration. */
export interface RoleplayRuntimeExtensionDefinition {
  readonly module: Omit<RoleplayModuleBinding, 'stateIds'>
  /** Return undefined when the module does not participate in this Session. */
  resolve(input: RoleplayRuntimeExtensionResolveInput): RoleplayRuntimeExtensionResolution | undefined
}

/** Immutable bindings merged into a source-neutral Roleplay runtime snapshot. */
export interface ResolvedRoleplayRuntimeExtensions {
  readonly modules: readonly RoleplayModuleBinding[]
  readonly world: readonly RoleplayWorldBinding[]
  readonly state: readonly RoleplayStateBinding[]
  readonly prepare: readonly RoleplayPhaseModuleOutcome[]
  readonly recall: readonly RoleplayPhaseModuleOutcome[]
}

interface Registration {
  readonly token: symbol
  readonly resolve: RoleplayRuntimeExtensionDefinition['resolve']
  readonly module: Omit<RoleplayModuleBinding, 'stateIds'>
}

function compareStableIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function stableId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /\s/u.test(value)) {
    throw new Error(`${label} must be a non-empty stable id without whitespace`)
  }
  return value
}

function normalizedPhases(phases: readonly RoleplayTurnPhase[]): readonly RoleplayTurnPhase[] {
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error('Roleplay runtime extension phases must not be empty')
  }
  const requested = new Set<RoleplayTurnPhase>()
  for (const phase of phases) {
    if (!ROLEPLAY_TURN_PHASES.includes(phase)) {
      throw new Error(`Unknown Roleplay runtime phase ${JSON.stringify(phase)}`)
    }
    if (requested.has(phase)) {
      throw new Error(`Roleplay runtime extension repeats phase ${JSON.stringify(phase)}`)
    }
    requested.add(phase)
  }
  return ROLEPLAY_TURN_PHASES.filter(phase => requested.has(phase))
}

function moduleDeclaration(
  module: Omit<RoleplayModuleBinding, 'stateIds'>,
): Omit<RoleplayModuleBinding, 'stateIds'> {
  const id = stableId(module.id, 'Roleplay runtime extension module id')
  if (module.source !== 'native' && module.source !== 'adapter') {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(id)} has an unknown source`)
  }
  return Object.freeze({ id, source: module.source, phases: normalizedPhases(module.phases) })
}

function worldBinding(value: RoleplayWorldBinding, moduleId: string): RoleplayWorldBinding {
  const id = stableId(value.id, `Roleplay runtime extension ${JSON.stringify(moduleId)} world id`)
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(moduleId)} world ${JSON.stringify(id)} needs a name`)
  }
  if (value.owner !== 'deployment' && value.owner !== 'session') {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(moduleId)} world ${JSON.stringify(id)} has an unknown owner`)
  }
  if (value.placement !== 'actor' && value.placement !== 'experience') {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(moduleId)} world ${JSON.stringify(id)} has an unknown placement`)
  }
  if (value.adapter !== undefined) stableId(value.adapter, 'Roleplay runtime extension world adapter')
  return Object.freeze({
    id,
    name: value.name,
    owner: value.owner,
    placement: value.placement,
    ...(value.adapter === undefined ? {} : { adapter: value.adapter }),
  })
}

function stateBinding(value: RoleplayStateBinding, moduleId: string): RoleplayStateBinding {
  const id = stableId(value.id, `Roleplay runtime extension ${JSON.stringify(moduleId)} state id`)
  if (value.owner !== 'deployment' && value.owner !== 'session') {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(moduleId)} state ${JSON.stringify(id)} has an unknown owner`)
  }
  if (value.adapter !== undefined) stableId(value.adapter, 'Roleplay runtime extension state adapter')
  if (value.revision !== undefined && (!Number.isSafeInteger(value.revision) || value.revision < 0)) {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(moduleId)} state ${JSON.stringify(id)} has an invalid revision`)
  }
  return Object.freeze({
    id,
    owner: value.owner,
    ...(value.adapter === undefined ? {} : { adapter: value.adapter }),
    ...(value.revision === undefined ? {} : { revision: value.revision }),
  })
}

function uniqueIds(values: readonly { readonly id: string }[], label: string): void {
  const ids = new Set<string>()
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`${label} ${JSON.stringify(value.id)} is contributed more than once`)
    ids.add(value.id)
  }
}

function phaseOutcome(
  module: Omit<RoleplayModuleBinding, 'stateIds'>,
  phase: 'prepare' | 'recall',
  value: Omit<RoleplayPhaseModuleOutcome, 'moduleId'> | undefined,
): RoleplayPhaseModuleOutcome | undefined {
  const participates = module.phases.includes(phase)
  if (!participates && value !== undefined) {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(module.id)} reports inactive ${phase}`)
  }
  if (!participates) return undefined
  if (value === undefined) {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(module.id)} must report its ${phase} outcome`)
  }
  if (value.outcome !== 'applied' && value.outcome !== 'idle' && value.outcome !== 'degraded') {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(module.id)} has an invalid ${phase} outcome`)
  }
  if (!Number.isSafeInteger(value.contributions) || value.contributions < 0) {
    throw new Error(`Roleplay runtime extension ${JSON.stringify(module.id)} has an invalid ${phase} contribution count`)
  }
  return Object.freeze({ moduleId: module.id, outcome: value.outcome, contributions: value.contributions })
}

/**
 * Registry of trusted, synchronous Session-log resolvers.
 * Registration order never affects a turn: active modules are resolved by stable id.
 */
export class RoleplayRuntimeExtensionRegistry {
  readonly #registrations = new Map<string, Registration>()

  /** Register one module and return its stale-disposer-safe revocation. */
  register(definition: RoleplayRuntimeExtensionDefinition): () => void {
    const module = moduleDeclaration(definition.module)
    if (this.#registrations.has(module.id)) {
      throw new Error(`Roleplay runtime extension module ${JSON.stringify(module.id)} is already registered`)
    }
    const registration = { token: Symbol(module.id), resolve: definition.resolve, module }
    this.#registrations.set(module.id, registration)
    return () => {
      if (this.#registrations.get(module.id)?.token === registration.token) {
        this.#registrations.delete(module.id)
      }
    }
  }

  /** Resolve every active module from one immutable Session-log boundary. */
  resolve(events: readonly SessionEvent[]): ResolvedRoleplayRuntimeExtensions {
    const modules: RoleplayModuleBinding[] = []
    const world: RoleplayWorldBinding[] = []
    const state: RoleplayStateBinding[] = []
    const prepare: RoleplayPhaseModuleOutcome[] = []
    const recall: RoleplayPhaseModuleOutcome[] = []
    const input = Object.freeze({ events: Object.freeze([...events]) })
    const registrations = [...this.#registrations.values()]
      .sort((left, right) => compareStableIds(left.module.id, right.module.id))
    for (const registration of registrations) {
      const resolution = registration.resolve(input)
      if (resolution === undefined) continue
      if (typeof resolution !== 'object' || resolution === null) {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} returned an invalid resolution`)
      }
      if ('then' in resolution && typeof resolution.then === 'function') {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} must resolve synchronously`)
      }
      if (resolution.world !== undefined && !Array.isArray(resolution.world)) {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} returned invalid worlds`)
      }
      if (resolution.state !== undefined && !Array.isArray(resolution.state)) {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} returned invalid states`)
      }
      if (resolution.stateIds !== undefined && !Array.isArray(resolution.stateIds)) {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} returned invalid state ids`)
      }
      if (resolution.outcomes !== undefined
        && (typeof resolution.outcomes !== 'object' || resolution.outcomes === null)) {
        throw new Error(`Roleplay runtime extension ${JSON.stringify(registration.module.id)} returned invalid outcomes`)
      }
      const resolvedWorld = (resolution.world ?? []).map(value => worldBinding(value, registration.module.id))
      const resolvedState = (resolution.state ?? []).map(value => stateBinding(value, registration.module.id))
      const stateIds = [...new Set([
        ...resolvedState.map(value => value.id),
        ...(resolution.stateIds ?? []).map(value => stableId(
          value,
          `Roleplay runtime extension ${JSON.stringify(registration.module.id)} state reference`,
        )),
      ])].sort(compareStableIds)
      modules.push(Object.freeze({
        ...registration.module,
        ...(stateIds.length === 0 ? {} : { stateIds: Object.freeze(stateIds) }),
      }))
      world.push(...resolvedWorld)
      state.push(...resolvedState)
      const prepareOutcome = phaseOutcome(registration.module, 'prepare', resolution.outcomes?.prepare)
      const recallOutcome = phaseOutcome(registration.module, 'recall', resolution.outcomes?.recall)
      if (prepareOutcome !== undefined) prepare.push(prepareOutcome)
      if (recallOutcome !== undefined) recall.push(recallOutcome)
    }
    uniqueIds(world, 'Roleplay runtime extension world')
    uniqueIds(state, 'Roleplay runtime extension state')
    return Object.freeze({
      modules: Object.freeze(modules),
      world: Object.freeze(world),
      state: Object.freeze(state),
      prepare: Object.freeze(prepare),
      recall: Object.freeze(recall),
    })
  }
}

/** Register through the caller's Cordis scope so plugin unload always revokes the module. */
export function registerRoleplayRuntimeExtension(
  ctx: Context,
  definition: RoleplayRuntimeExtensionDefinition,
): void {
  const registry = ctx.get(ROLEPLAY_RUNTIME_EXTENSIONS_KEY)
  if (registry === undefined || typeof registry.register !== 'function') {
    throw new Error('Agent RP runtime extension service is unavailable')
  }
  ctx.effect(
    () => registry.register(definition),
    `agent-rp: runtime extension ${definition.module.id}`,
  )
}
