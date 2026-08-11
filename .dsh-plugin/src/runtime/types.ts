/** Type-only vocabulary for the experimental roleplay storyworld. */

import type { AgentSetup } from '@deepseek-ai/dsh-agent'
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { CallId } from '@deepseek-ai/dsh-llm'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools'

/** Stable actor identity inside one Storyworld. */
export type RoleplayActorId = Branded<'RoleplayActorId'>
/** Stable fact identity inside one Storyworld. */
export type RoleplayFactId = Branded<'RoleplayFactId'>
/** Stable observer identity used by visibility projection. */
export type RoleplayObserverId = Branded<'RoleplayObserverId'>
/** Stable user-choice identity inside one Storyworld. */
export type RoleplayChoiceId = Branded<'RoleplayChoiceId'>
/** Stable name of one trusted action resolver. */
export type RoleplayResolverName = Branded<'RoleplayResolverName'>
/** Opaque identity of one non-canonical role-agent proposal. */
export type RoleplayProposalId = Branded<'RoleplayProposalId'>

/** One observer that may receive an observer-specific Storyworld projection. */
export interface RoleplayObserver {
  readonly id: RoleplayObserverId
  readonly name: string
}

/** One directed relationship score owned by an actor. */
export interface RoleplayRelationship {
  readonly actorId: RoleplayActorId
  readonly affinity: number
}

/** One actor's canonical state. */
export interface RoleplayActor {
  readonly id: RoleplayActorId
  readonly name: string
  readonly observerId: RoleplayObserverId
  readonly location: string
  readonly relationships: readonly RoleplayRelationship[]
}

/** Explicit visibility of one canonical Storyworld record. */
export type RoleplayVisibility =
  | { readonly kind: 'public' }
  | { readonly kind: 'observers'; readonly observerIds: readonly RoleplayObserverId[] }

/** One canonical fact and the observers allowed to receive it. */
export interface RoleplayFact {
  readonly id: RoleplayFactId
  readonly text: string
  readonly visibility: RoleplayVisibility
}

/** Active scene constraints used by action resolvers. */
export interface RoleplayScene {
  readonly location: string
  readonly participantIds: readonly RoleplayActorId[]
}

/** One canonical choice retained under an explicit observer policy. */
export interface RoleplayChoice {
  readonly id: RoleplayChoiceId
  readonly text: string
  readonly visibility: RoleplayVisibility
}

/** Durable initial Storyworld stored in the `rp/seed` Session event. */
export interface RoleplaySeed {
  readonly version: 0
  readonly observers: readonly RoleplayObserver[]
  readonly actors: readonly RoleplayActor[]
  readonly facts: readonly RoleplayFact[]
  readonly scene: RoleplayScene
}

/** Durable identity of the one observer whose model history owns a roleplay Session. */
export interface RoleplayObserverBinding {
  readonly version: 0
  readonly observerId: RoleplayObserverId
}

/** Canonical event emitted by a trusted resolver. */
export type RoleplayWorldEvent =
  | {
    readonly kind: 'actor/move'
    readonly actorId: RoleplayActorId
    readonly location: string
  }
  | {
    readonly kind: 'relationship/adjust'
    readonly actorId: RoleplayActorId
    readonly targetId: RoleplayActorId
    readonly delta: number
  }
  | {
    readonly kind: 'fact/reveal'
    readonly factId: RoleplayFactId
    readonly observerIds: readonly RoleplayObserverId[]
  }
  | {
    readonly kind: 'scene/advance'
    readonly location: string
    readonly participantIds: readonly RoleplayActorId[]
  }
  | {
    readonly kind: 'choice/record'
    readonly choiceId: RoleplayChoiceId
    readonly text: string
    readonly visibility: RoleplayVisibility
  }

/** Resolver identity retained without duplicating model arguments already logged by `tool/call`. */
export interface RoleplayCommitCause {
  readonly actorId: RoleplayActorId
  readonly resolver: RoleplayResolverName
}

/** Auditable authority that produced one canonical roleplay transaction. */
export type RoleplayCommitOrigin =
  | { readonly kind: 'model-tool'; readonly callId: CallId }
  | {
    readonly kind: 'application'
    readonly source: string
    readonly sourceEventSeq: number
  }

/** Durable, replayable state transition carried by a roleplay-owned context message. */
export interface RoleplayCommit {
  readonly kind: 'rp/commit'
  readonly version: 0
  readonly origin: RoleplayCommitOrigin
  readonly baseRevision: number
  readonly revision: number
  readonly narration: string
  readonly causes: readonly RoleplayCommitCause[]
  readonly events: readonly RoleplayWorldEvent[]
}

/** One stable player-facing narration item derived from an accepted commit. */
export interface RoleplayNarrationEntry {
  readonly revision: number
  readonly text: string
}

/** Message attribution for one accepted roleplay transaction. */
export interface RoleplayMessageSource {
  readonly kind: 'roleplay'
  readonly commit: RoleplayCommit
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    roleplay: RoleplayMessageSource
  }
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Initial canonical Storyworld. Exactly one may appear before roleplay commits. */
    'rp/seed': RoleplaySeed
    /** Immutable observer identity for every model-visible view in this Session. */
    'rp/observer': RoleplayObserverBinding
    /** Validated role-agent output that remains non-canonical until explicitly accepted. */
    'rp/proposal': RoleplayProposal
  }
}

/** Complete canonical Storyworld derived from one Session event prefix. */
export interface Storyworld {
  readonly revision: number
  readonly observers: readonly RoleplayObserver[]
  readonly actors: readonly RoleplayActor[]
  readonly facts: readonly RoleplayFact[]
  readonly scene: RoleplayScene
  readonly choices: readonly RoleplayChoice[]
}

/** Actor projection that deliberately omits observer ownership. */
export interface RoleplayViewActor {
  readonly id: RoleplayActorId
  readonly name: string
  readonly location: string
  readonly relationships: readonly RoleplayRelationship[]
}

/** Fact projection that deliberately omits its visibility policy. */
export interface RoleplayViewFact {
  readonly id: RoleplayFactId
  readonly text: string
}

/** Choice projection that deliberately omits its visibility policy. */
export interface RoleplayViewChoice {
  readonly id: RoleplayChoiceId
  readonly text: string
}

/** Structurally redacted view supplied to exactly one observer. */
export interface RoleplayView {
  readonly revision: number
  readonly observerId: RoleplayObserverId
  readonly actors: readonly RoleplayViewActor[]
  readonly facts: readonly RoleplayViewFact[]
  readonly scene: RoleplayScene
  readonly choices: readonly RoleplayViewChoice[]
}

/** One transaction action proposed to a named trusted resolver. */
export interface RoleplayIntent {
  readonly actorId: RoleplayActorId
  readonly resolver: RoleplayResolverName
  readonly arguments: JsonValue
}

/** Draft returned by trusted application coordination inside one reserved Roleplay transaction. */
export interface RoleplayApplicationCommitDraft {
  readonly baseRevision: number
  readonly narration: string
  readonly intents: readonly RoleplayIntent[]
}

/** Provenance and cancellation supplied by a trusted application action. */
export interface RoleplayApplicationTurnOptions {
  /** Stable lower-kebab-case application source recorded in the canonical commit. */
  readonly source: string
  /** Sequence of the already-logged user action that caused this transaction. */
  readonly sourceEventSeq: number
  /** Caller-owned cancellation for coordination before the commit point. */
  readonly signal: AbortSignal
}

/** Character-agent output retained privately until the narrator accepts it. */
export interface RoleplayCharacterProposal {
  readonly role: 'character'
  readonly actorId: RoleplayActorId
  readonly resolver: RoleplayResolverName
  readonly resolverVersion: string
  readonly arguments: JsonValue
}

/** Director-agent guidance derived only from the narrator's observer view. */
export interface RoleplayDirectorProposal {
  readonly role: 'director'
  readonly guidance: string
  readonly focusActorIds: readonly RoleplayActorId[]
}

/** One structured continuity finding derived only from the narrator's observer view. */
export interface RoleplayContinuityFinding {
  readonly severity: 'info' | 'warning' | 'error'
  readonly summary: string
  readonly actorIds: readonly RoleplayActorId[]
  readonly factIds: readonly RoleplayFactId[]
}

/** Continuity-agent findings that remain advisory. */
export interface RoleplayContinuityProposal {
  readonly role: 'continuity'
  readonly findings: readonly RoleplayContinuityFinding[]
}

/** Role-specific private payload of one durable, non-canonical proposal. */
export type RoleplayProposalPayload =
  | RoleplayCharacterProposal
  | RoleplayDirectorProposal
  | RoleplayContinuityProposal

/** Durable proposal record ignored by the canonical Storyworld reducer. */
export interface RoleplayProposal {
  readonly version: 0
  readonly id: RoleplayProposalId
  readonly callId: CallId
  readonly baseRevision: number
  readonly observerId: RoleplayObserverId
  readonly payload: RoleplayProposalPayload
}

/** Observer-safe preview event returned for a private character proposal. */
export type RoleplayProposalPreviewEvent =
  | {
    readonly kind: 'actor/move'
    readonly actorId: RoleplayActorId
  }
  | {
    readonly kind: 'relationship/adjust'
    readonly actorId: RoleplayActorId
    readonly targetId: RoleplayActorId
  }
  | {
    readonly kind: 'fact/reveal'
    readonly factId: RoleplayFactId
  }
  | {
    readonly kind: 'scene/advance'
  }
  | {
    readonly kind: 'choice/record'
  }

/** Privacy-safe model result of a Character consultation. */
export interface RoleplayCharacterConsultResult {
  readonly kind: 'character'
  readonly proposalId: RoleplayProposalId
  readonly baseRevision: number
  readonly actorId: RoleplayActorId
  readonly resolver: RoleplayResolverName
  readonly preview: {
    readonly events: RoleplayProposalPreviewEvent[]
    readonly withheldFactReveals: number
  }
}

/** Model result of a Director consultation. */
export interface RoleplayDirectorConsultResult {
  readonly kind: 'director'
  readonly proposalId: RoleplayProposalId
  readonly baseRevision: number
  readonly guidance: string
  readonly focusActorIds: RoleplayActorId[]
}

/** Continuity finding after its safe fields are detached for the narrator. */
export interface RoleplayContinuityConsultFinding {
  readonly severity: 'info' | 'warning' | 'error'
  readonly summary: string
  readonly actorIds: RoleplayActorId[]
  readonly factIds: RoleplayFactId[]
}

/** Model result of a Continuity consultation. */
export interface RoleplayContinuityConsultResult {
  readonly kind: 'continuity'
  readonly proposalId: RoleplayProposalId
  readonly baseRevision: number
  readonly findings: RoleplayContinuityConsultFinding[]
}

/** Observer-safe model result returned by `roleplay_consult`. */
export type RoleplayConsultResult =
  | RoleplayCharacterConsultResult
  | RoleplayDirectorConsultResult
  | RoleplayContinuityConsultResult

/** Accepted or rejected deterministic resolver outcome. */
export type RoleplayResolution =
  | { readonly kind: 'accepted'; readonly events: readonly RoleplayWorldEvent[] }
  | { readonly kind: 'rejected'; readonly reason: string }

/** Inputs available to a trusted resolver. */
export interface RoleplayResolverContext {
  readonly world: Storyworld
  readonly actorId: RoleplayActorId
}

/** Trusted, deterministic action extension registered by a Cordis plugin. */
export interface RoleplayActionResolver {
  readonly name: RoleplayResolverName
  /** Stable semantic version; change it whenever validation or emitted events can change. */
  readonly version: string
  /** Restrict this resolver to trusted application transactions and omit it from every model action projection. */
  readonly applicationOnly?: boolean
  readonly description: string
  readonly parameters: ObjectJsonSchema
  resolve(context: RoleplayResolverContext, args: JsonValue): RoleplayResolution
}

/** Per-agent roleplay composition. Existing seeded/forked Sessions may omit `seed`. */
export interface RoleplayAgentOptions {
  readonly observerId: RoleplayObserverId
  readonly seed?: RoleplaySeed
  /**
   * Attach durable application state without exposing model-facing Roleplay prompts or tools.
   * Application commands remain available through the owning Host integration.
   */
  readonly applicationOnly?: boolean
  /**
   * Maximum same-turn reminders after the narrator stops without a commit.
   * Omit or set to zero to disable correction.
   */
  readonly maxCorrectionAttempts?: number
  /**
   * Fresh-context structured subagent provider used by `roleplay_consult`.
   * Omit to expose no proposal tool.
   */
  readonly proposalProvider?: string
}

/** Creation-time setup returned by the roleplay service. */
export type RoleplayAgentSetup = AgentSetup

/** Stable roleplay failure taxonomy. */
export type RoleplayErrorCode =
  | 'ROLEPLAY_BUSY'
  | 'ROLEPLAY_DUPLICATE_RESOLVER'
  | 'ROLEPLAY_INVALID_DATA'
  | 'ROLEPLAY_INVALID_INTENT'
  | 'ROLEPLAY_INVALID_RESPONSE'
  | 'ROLEPLAY_INTENT_REJECTED'
  | 'ROLEPLAY_NESTED_COMMIT'
  | 'ROLEPLAY_NO_SEED'
  | 'ROLEPLAY_PROPOSAL_FAILED'
  | 'ROLEPLAY_PROPOSAL_UNAVAILABLE'
  | 'ROLEPLAY_STALE_RESOLVER'
  | 'ROLEPLAY_STALE_REVISION'
  | 'ROLEPLAY_UNKNOWN_RESOLVER'
