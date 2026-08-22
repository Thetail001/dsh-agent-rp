/** Format-independent description of one Roleplay turn runtime. */

/** Stable lifecycle shared by native resources and compatibility adapters. */
export const ROLEPLAY_TURN_PHASES = ['prepare', 'generate', 'settle', 'present'] as const

export type RoleplayTurnPhase = typeof ROLEPLAY_TURN_PHASES[number]

/** Stable module identities owned by the source-neutral prepare runtime. */
export const ROLEPLAY_PROMPT_MODULE_ID = 'roleplay:prompt'
export const ROLEPLAY_MEMORY_MODULE_ID = 'roleplay:memory'
export const ROLEPLAY_WORLD_MODULE_ID = 'roleplay:world'
export const ROLEPLAY_PROMPT_ADAPTER_MODULE_ID = 'adapter:prompt-modules'
export const ROLEPLAY_EJS_ADAPTER_MODULE_ID = 'adapter:ejs'

/** One resource bound into the current experience without exposing its source format. */
export interface RoleplayResourceRef {
  readonly id: string
  readonly name: string
  readonly owner: 'deployment' | 'session'
  /** Optional adapter provenance for diagnostics; runtime consumers must not branch on it. */
  readonly adapter?: string
}

/** The playable experience can be a single character or a world-owned scene. */
export interface RoleplayExperienceRef extends RoleplayResourceRef {
  readonly mode: 'character' | 'scene'
}

/** Player identity selected independently from the actor and world. */
export interface RoleplayParticipantRef extends RoleplayResourceRef {
  readonly description?: string
}

/** One world resource and its semantic placement in the experience. */
export interface RoleplayWorldBinding extends RoleplayResourceRef {
  readonly placement: 'actor' | 'experience'
}

/** Prompt policy selected for this turn, independent from provider/model settings. */
export interface RoleplayPromptBinding {
  readonly strategy: 'native' | 'modules'
  readonly resource?: RoleplayResourceRef
}

/** Replayable state namespace participating in this turn. */
export interface RoleplayStateBinding {
  readonly id: string
  readonly owner: 'deployment' | 'session'
  readonly adapter?: string
  readonly revision?: number
}

/** Runtime module contribution and the phases in which it participates. */
export interface RoleplayModuleBinding {
  readonly id: string
  readonly source: 'native' | 'adapter'
  readonly phases: readonly RoleplayTurnPhase[]
  /** Runtime state namespaces whose turn-boundary changes belong to this module. */
  readonly stateIds?: readonly string[]
}

/** Exceptional settle-phase result reported by one runtime module. */
export interface RoleplayTurnSettlementContribution {
  readonly moduleId: string
  readonly outcome: 'deferred' | 'failed'
  readonly error?: string
}

/**
 * Complete source-neutral view of the resources participating in one turn.
 * The snapshot is derived from deployment configuration plus the Session log;
 * it is never a second mutable source of truth.
 */
export interface RoleplayRuntimeSnapshot {
  readonly format: 0
  readonly lifecycle: typeof ROLEPLAY_TURN_PHASES
  readonly experience: RoleplayExperienceRef
  readonly actor?: RoleplayResourceRef
  readonly participant?: RoleplayParticipantRef
  readonly world: {
    readonly bindings: readonly RoleplayWorldBinding[]
    readonly tokenBudget?: number
  }
  readonly prompt: RoleplayPromptBinding
  readonly state: readonly RoleplayStateBinding[]
  readonly memory: {
    readonly read: true
    readonly write: boolean
  }
  readonly modules: readonly RoleplayModuleBinding[]
}
