/**
 * Browser-safe player-surface contract for observer-projected roleplay sessions.
 * @module @deepseek-ai/dsh-roleplay/client
 */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Scenario presenter identity carried across the Host/client boundary. */
export type RoleplaySurfaceKind = Branded<'RoleplaySurfaceKind'>
/** Actor identity after projection onto the player surface. */
export type RoleplaySurfaceActorId = Branded<'RoleplaySurfaceActorId'>
/** Visible fact identity after projection onto the player surface. */
export type RoleplaySurfaceFactId = Branded<'RoleplaySurfaceFactId'>
/** Bound observer identity after projection onto the player surface. */
export type RoleplaySurfaceObserverId = Branded<'RoleplaySurfaceObserverId'>
/** Ephemeral action identity used only for one rendered surface revision. */
export type RoleplaySurfaceActionId = Branded<'RoleplaySurfaceActionId'>
/** Stable identity for one completed-session review entry. */
export type RoleplaySurfaceReviewEntryId = Branded<'RoleplaySurfaceReviewEntryId'>
/** Stable identity for one observer-visible public record. */
export type RoleplaySurfaceRecordId = Branded<'RoleplaySurfaceRecordId'>

/** One player-visible actor row prepared by a scenario presenter. */
export interface RoleplaySurfaceActor {
  readonly id: RoleplaySurfaceActorId
  readonly label: string
  readonly state: 'active' | 'inactive' | 'unknown'
  readonly detail?: string
  /** Short scenario-owned public badges such as self, Sheriff, or a revealed role. */
  readonly badges?: readonly string[]
}

/** One observer-visible fact retained from the structural Storyworld projection. */
export interface RoleplaySurfaceFact {
  readonly id: RoleplaySurfaceFactId
  readonly text: string
}

/** One current observer-private result that deserves attention outside the public record. */
export interface RoleplaySurfaceNotice {
  readonly title: string
  readonly text: string
}

/** Browser submission owned by the scenario presenter. */
export type RoleplaySurfaceSubmission =
  | { readonly kind: 'prompt'; readonly text: string }
  | { readonly kind: 'command'; readonly line: string }

/** One safe shortcut that submits the exact prompt or command supplied by the scenario presenter. */
export interface RoleplaySurfaceAction {
  readonly id: RoleplaySurfaceActionId
  readonly label: string
  readonly submission: RoleplaySurfaceSubmission
  readonly emphasis: 'primary' | 'secondary'
  /** Actor selected by this action, allowing a roster to own target selection. */
  readonly actorId?: RoleplaySurfaceActorId
  /** Whether the client should start this no-choice action once per surface revision. */
  readonly automatic?: boolean
}

/** Optional freeform player input owned by the scenario's current phase. */
export interface RoleplaySurfaceInput {
  readonly placeholder: string
  readonly submitLabel: string
  /** Optional positive UTF-16 code-unit cap enforced by the client before submission. */
  readonly maxLength?: number
  /** Exact transport for the trimmed player text; command prefixes receive one JSON string argument. */
  readonly submission:
    | { readonly kind: 'prompt' }
    | { readonly kind: 'command'; readonly prefix: string }
}

/** Observer-safe live progress prepared by the matching scenario presenter. */
export interface RoleplaySurfaceProgress {
  readonly title: string
  readonly detail: string
  readonly completed?: number
  readonly total?: number
  /** Validated public records available before the enclosing phase finishes committing. */
  readonly records?: readonly RoleplaySurfaceRecord[]
}

/** One committed narration item located in the phase that the commit completed. */
export interface RoleplaySurfaceNarration {
  readonly revision: number
  readonly text: string
  /** Scenario-owned phase label captured before the commit advances the Storyworld. */
  readonly phase?: string
}

/** One scenario-localized public statement, ballot, or outcome derived from the observer view. */
export interface RoleplaySurfaceRecord {
  readonly id: RoleplaySurfaceRecordId
  readonly kind: 'statement' | 'ballot' | 'outcome'
  readonly phase: string
  readonly text: string
  /** Commit revision that first published this record; live progress records omit it. */
  readonly revision?: number
  /** Public actor associated with the record, when one exists. */
  readonly actorId?: RoleplaySurfaceActorId
  /** Public ballot target, omitted for abstentions and non-ballot records. */
  readonly targetActorId?: RoleplaySurfaceActorId
}

/** One scenario-localized accepted decision shown only after the session completes. */
export interface RoleplaySurfaceReviewEntry {
  readonly id: RoleplaySurfaceReviewEntryId
  readonly actor: string
  readonly phase: string
  readonly decision: string
  readonly rationale: string
  readonly confidence: string
  readonly evidence: readonly string[]
}

/** Completed-session review prepared by a scenario presenter. */
export interface RoleplaySurfaceReview {
  readonly title: string
  readonly detail: string
  readonly entries: readonly RoleplaySurfaceReviewEntry[]
}

/** Private projection-fold state; only a ready value may cross the browser boundary. */
export interface RoleplaySurfaceReviewState {
  readonly ready: boolean
  readonly value: RoleplaySurfaceReview
}

/** Scenario-owned display projection derived only from an observer-safe view. */
export interface RoleplayPlayerPresentation {
  readonly kind: RoleplaySurfaceKind
  readonly locale: string
  readonly title: string
  readonly phase: string
  /** Scenario-owned instruction that tells the player what to do on this surface revision. */
  readonly guidance: string
  /** Optional supporting context rendered below the primary instruction. */
  readonly guidanceDetail?: string
  readonly status: 'active' | 'complete'
  readonly actors: readonly RoleplaySurfaceActor[]
  readonly facts: readonly RoleplaySurfaceFact[]
  /** Optional observer-private result rendered separately from public table history. */
  readonly notice?: RoleplaySurfaceNotice
  /** Structured public table history; narration remains the concise phase outcome. */
  readonly records: readonly RoleplaySurfaceRecord[]
  readonly actions: readonly RoleplaySurfaceAction[]
  readonly input?: RoleplaySurfaceInput
}

/** Complete UI-scale session projection consumed by Roleplay clients. */
export interface RoleplayPlayerSurface extends RoleplayPlayerPresentation {
  readonly revision: number
  readonly observerId: RoleplaySurfaceObserverId
  readonly narration: readonly RoleplaySurfaceNarration[]
  /** Ephemeral current work derived from log events without exposing private decisions. */
  readonly progress?: RoleplaySurfaceProgress
  /** Scenario-localized structured review available only after completion. */
  readonly review?: RoleplaySurfaceReview
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Observer-safe Roleplay surface, or null until a matching scenario presenter is available. */
    roleplay: RoleplayPlayerSurface | null
  }
}
