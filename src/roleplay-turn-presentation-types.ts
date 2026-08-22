/** Browser-safe contracts for the replayable Roleplay present phase. */

/** Explainable result of one module participating in the present phase. */
export interface RoleplayPresentModuleOutcome {
  readonly moduleId: string
  readonly outcome: 'applied' | 'idle' | 'pending' | 'attached' | 'failed'
  readonly changes: number
  readonly error?: string
}

/** One runtime state selection presented with the visible reply. */
export interface RoleplayPresentedState {
  readonly id: string
  readonly status: 'absent' | 'settled' | 'pending' | 'attached' | 'failed'
  readonly eventSeq?: number
  readonly error?: string
}

/** State and module changes contributed by one present-phase participant. */
export interface RoleplayPresentationContribution {
  readonly module?: RoleplayPresentModuleOutcome
  readonly states?: readonly RoleplayPresentedState[]
}

/** Immutable reason that caused one presentation snapshot to be written. */
export type RoleplayPresentationTrigger =
  | { readonly kind: 'settlement'; readonly eventSeq: number }
  | { readonly kind: 'reply-version'; readonly eventSeq: number }
  | { readonly kind: 'module-update'; readonly eventSeq: number; readonly moduleId: string }

/**
 * Source-neutral view of the reply and runtime state currently presented to the player.
 *
 * State seqs are Session Log boundaries: replaying through the referenced event reconstructs
 * the state selected by this snapshot, even when the state was derived from a reply rather
 * than written as a dedicated state event.
 */
export interface RoleplayTurnPresentation {
  readonly format: 0
  readonly sessionId: string
  readonly turn: number
  readonly settlementSeq: number
  readonly trigger: RoleplayPresentationTrigger
  /** Whether this snapshot selected the latest visible assistant reply when it was written. */
  readonly current: boolean
  readonly selectedReply?: {
    readonly sourceSeq: number
    readonly surfaceSeq: number
    readonly messageId: string
  }
  readonly state: readonly RoleplayPresentedState[]
  readonly version?: {
    readonly groupId: string
    readonly anchorSeq: number
    readonly selectedVersionSeq: number
  }
  readonly present: {
    readonly modules: readonly RoleplayPresentModuleOutcome[]
  }
}
