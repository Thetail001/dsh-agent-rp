/**
 * Observer-safe session projection and scenario presenter boundary.
 * @module @deepseek-ai/dsh-roleplay
 */

import type { Context } from 'cordis'
import { z } from 'zod'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { decodeRoleplayObserver } from './schema.ts'
import { applyRoleplayCommit, projectStoryworld, storyworldFromSeed } from './reducer.ts'
import type { RoleplayObserverId, RoleplayView, Storyworld } from './types.ts'
import type {
  RoleplayPlayerPresentation,
  RoleplayPlayerSurface,
  RoleplaySurfaceActionId,
  RoleplaySurfaceActorId,
  RoleplaySurfaceFactId,
  RoleplaySurfaceKind,
  RoleplaySurfaceNarration,
  RoleplaySurfaceObserverId,
  RoleplaySurfaceProgress,
  RoleplaySurfaceRecordId,
  RoleplaySurfaceReviewEntryId,
  RoleplaySurfaceReviewState,
} from './surface-types.ts'

/** Maximum committed narration items retained in the UI-scale projection. */
export const ROLEPLAY_SURFACE_NARRATION_LIMIT = 40

/** Scenario plugin that turns one observer-safe view into display and input affordances. */
export interface RoleplaySurfacePresenter {
  /** Stable lower-kebab-case registration identity. */
  readonly name: string
  /** Pure selection over the observer-safe view; must not inspect canonical state. */
  matches(view: RoleplayView): boolean
  /** Pure UI projection over the same observer-safe view. */
  present(view: RoleplayView): RoleplayPlayerPresentation
  /**
   * Project one committed narration onto the durable player timeline.
   * @param before - Observer-safe view immediately before the commit.
   * @param after - Observer-safe view immediately after the commit.
   * @param text - Narration carried by the accepted commit.
   * @returns Player-visible narration, or `null` when the commit is private preparation; omission retains `text`.
   */
  narration?(before: RoleplayView, after: RoleplayView, text: string): string | null
  /**
   * Fold scenario-owned log events into observer-safe current progress.
   * Omission keeps the prior value; returning `null` clears it.
   */
  progress?(
    current: RoleplaySurfaceProgress | null,
    view: RoleplayView,
    event: SessionEvent,
  ): RoleplaySurfaceProgress | null
  /**
   * Fold scenario-owned events into a structured completed-session review.
   * The projection retains collecting state privately and publishes only a ready value after completion.
   */
  review?(
    current: RoleplaySurfaceReviewState | null,
    view: RoleplayView,
    event: SessionEvent,
  ): RoleplaySurfaceReviewState | null
}

interface RoleplayProjectionState {
  readonly world: Storyworld | null
  readonly observerId: RoleplayObserverId | null
  readonly narration: readonly RoleplaySurfaceNarration[]
  /** First committed revision for every presenter-produced public record id. */
  readonly recordRevisions: readonly {
    readonly id: RoleplaySurfaceRecordId
    readonly revision: number
  }[]
  readonly progress: RoleplaySurfaceProgress | null
  readonly review: RoleplaySurfaceReviewState | null
}

const surfaceKindSchema = z.string().min(1).max(80) as unknown as z.ZodType<RoleplaySurfaceKind>
const surfaceObserverIdSchema = z.string().min(1).max(240) as unknown as z.ZodType<RoleplaySurfaceObserverId>
const surfaceActorIdSchema = z.string().min(1).max(240) as unknown as z.ZodType<RoleplaySurfaceActorId>
const surfaceFactIdSchema = z.string().min(1).max(240) as unknown as z.ZodType<RoleplaySurfaceFactId>
const surfaceActionIdSchema = z.string().min(1).max(160) as unknown as z.ZodType<RoleplaySurfaceActionId>
const surfaceRecordIdSchema = z.string().min(1).max(240) as unknown as z.ZodType<RoleplaySurfaceRecordId>
const surfaceReviewEntryIdSchema = z.string().min(1).max(240) as unknown as z.ZodType<RoleplaySurfaceReviewEntryId>
const surfaceText = (max: number) => z.string().min(1).max(max).refine(value => value.trim().length > 0, {
  message: 'Roleplay surface text must be non-blank',
})
const surfaceRecordSchema = z.object({
  id: surfaceRecordIdSchema,
  kind: z.enum(['statement', 'ballot', 'outcome']),
  phase: surfaceText(320),
  text: surfaceText(2_048),
  revision: z.number().int().nonnegative().optional(),
  actorId: surfaceActorIdSchema.optional(),
  targetActorId: surfaceActorIdSchema.optional(),
})

const surfaceSchema = z.object({
  kind: surfaceKindSchema,
  locale: surfaceText(40),
  title: surfaceText(160),
  phase: surfaceText(320),
  guidance: surfaceText(2_048),
  guidanceDetail: surfaceText(2_048).optional(),
  status: z.enum(['active', 'complete']),
  revision: z.number().int().nonnegative(),
  observerId: surfaceObserverIdSchema,
  narration: z.array(z.object({
    revision: z.number().int().positive(),
    text: surfaceText(65_536),
    phase: surfaceText(320).optional(),
  })).max(ROLEPLAY_SURFACE_NARRATION_LIMIT),
  facts: z.array(z.object({
    id: surfaceFactIdSchema,
    text: surfaceText(16_384),
  })).max(512),
  notice: z.object({
    title: surfaceText(160),
    text: surfaceText(2_048),
  }).optional(),
  actors: z.array(z.object({
    id: surfaceActorIdSchema,
    label: surfaceText(160),
    state: z.enum(['active', 'inactive', 'unknown']),
    detail: surfaceText(320).optional(),
    badges: z.array(surfaceText(80)).max(8).optional(),
  })).max(256),
  records: z.array(surfaceRecordSchema).max(1_024),
  actions: z.array(z.object({
    id: surfaceActionIdSchema,
    label: surfaceText(240),
    submission: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('prompt'), text: surfaceText(16_384) }),
      z.object({ kind: z.literal('command'), line: surfaceText(16_384) }),
    ]),
    emphasis: z.enum(['primary', 'secondary']),
    actorId: surfaceActorIdSchema.optional(),
    automatic: z.boolean().optional(),
  })).max(64),
  input: z.object({
    placeholder: surfaceText(320),
    submitLabel: surfaceText(120),
    maxLength: z.number().int().positive().max(16_384).optional(),
    submission: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('prompt') }),
      z.object({ kind: z.literal('command'), prefix: surfaceText(16_384) }),
    ]),
  }).optional(),
  progress: z.object({
    title: surfaceText(160),
    detail: surfaceText(2_048),
    completed: z.number().int().nonnegative().optional(),
    total: z.number().int().positive().optional(),
    records: z.array(surfaceRecordSchema).max(256).optional(),
  }).superRefine((progress, refinement) => {
    if (progress.completed !== undefined && progress.total === undefined) {
      refinement.addIssue({ code: 'custom', message: 'Roleplay progress completed requires total' })
    }
    if (progress.completed !== undefined
      && progress.total !== undefined
      && progress.completed > progress.total) {
      refinement.addIssue({ code: 'custom', message: 'Roleplay progress completed cannot exceed total' })
    }
  }).optional(),
  review: z.object({
    title: surfaceText(160),
    detail: surfaceText(2_048),
    entries: z.array(z.object({
      id: surfaceReviewEntryIdSchema,
      actor: surfaceText(160),
      phase: surfaceText(320),
      decision: surfaceText(2_048),
      rationale: surfaceText(2_048),
      confidence: surfaceText(80),
      evidence: z.array(surfaceText(320)).max(64),
    })).max(256),
  }).optional(),
}).superRefine((surface, refinement) => {
  const uniqueIds = (
    values: readonly { readonly id: string }[],
    field: 'actors' | 'facts' | 'actions',
  ): void => {
    const seen = new Set<string>()
    for (const [index, value] of values.entries()) {
      if (!seen.has(value.id)) {
        seen.add(value.id)
        continue
      }
      refinement.addIssue({
        code: 'custom',
        message: `duplicate Roleplay surface ${field} id ${JSON.stringify(value.id)}`,
        path: [field, index, 'id'],
      })
    }
  }
  uniqueIds(surface.actors, 'actors')
  uniqueIds(surface.facts, 'facts')
  uniqueIds(surface.actions, 'actions')
  const visibleRecords = [
    ...surface.records.map((record, index) => ({ record, path: ['records', index] })),
    ...(surface.progress?.records ?? []).map((record, index) => ({
      record,
      path: ['progress', 'records', index],
    })),
  ]
  const recordIds = new Set<string>()
  for (const { record, path } of visibleRecords) {
    if (!recordIds.has(record.id)) recordIds.add(record.id)
    else {
      refinement.addIssue({
        code: 'custom',
        message: `duplicate Roleplay surface records id ${JSON.stringify(record.id)}`,
        path: [...path, 'id'],
      })
    }
  }
  const actorIds = new Set(surface.actors.map(actor => actor.id))
  const automaticActions = surface.actions.filter(action => action.automatic === true)
  if (automaticActions.length > 1) {
    refinement.addIssue({
      code: 'custom',
      message: 'Roleplay surface may expose at most one automatic action',
      path: ['actions'],
    })
  }
  for (const [index, action] of surface.actions.entries()) {
    if (action.actorId !== undefined && !actorIds.has(action.actorId)) {
      refinement.addIssue({
        code: 'custom',
        message: `Roleplay surface action names unknown actor ${JSON.stringify(action.actorId)}`,
        path: ['actions', index, 'actorId'],
      })
    }
  }
  for (const { record, path } of visibleRecords) {
    if (record.actorId !== undefined && !actorIds.has(record.actorId)) {
      refinement.addIssue({
        code: 'custom',
        message: `Roleplay surface record names unknown actor ${JSON.stringify(record.actorId)}`,
        path: [...path, 'actorId'],
      })
    }
    if (record.targetActorId !== undefined && !actorIds.has(record.targetActorId)) {
      refinement.addIssue({
        code: 'custom',
        message: `Roleplay surface record names unknown target ${JSON.stringify(record.targetActorId)}`,
        path: [...path, 'targetActorId'],
      })
    }
  }
  if (surface.review !== undefined) {
    if (surface.status !== 'complete') {
      refinement.addIssue({
        code: 'custom',
        message: 'Roleplay surface review requires completed status',
        path: ['review'],
      })
    }
    const seen = new Set<string>()
    for (const [index, entry] of surface.review.entries.entries()) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id)
        continue
      }
      refinement.addIssue({
        code: 'custom',
        message: `duplicate Roleplay surface review entry id ${JSON.stringify(entry.id)}`,
        path: ['review', 'entries', index, 'id'],
      })
    }
  }
}) as unknown as z.ZodType<RoleplayPlayerSurface>

/** Wire schema for the optional Roleplay player surface. */
export const roleplayPlayerSurfaceSchema: z.ZodType<RoleplayPlayerSurface | null> = surfaceSchema.nullable()

/**
 * Build the projection definition around the current presenter registry.
 * @param present - present one observer-safe Roleplay view, or decline it.
 * @param progress - fold one event through the matching scenario's safe progress policy.
 * @param review - fold one event through the matching scenario's completed-review policy.
 * @param narration - retain, rewrite, or suppress one commit's player-timeline narration from observer-safe views.
 * @returns the validated Session projection definition for browser surfaces.
 */
export function createRoleplaySurfaceProjection(
  present: (view: RoleplayView) => RoleplayPlayerPresentation | undefined,
  progress: (
    current: RoleplaySurfaceProgress | null,
    view: RoleplayView,
    event: SessionEvent,
  ) => RoleplaySurfaceProgress | null = current => current,
  review: (
    current: RoleplaySurfaceReviewState | null,
    view: RoleplayView,
    event: SessionEvent,
  ) => RoleplaySurfaceReviewState | null = current => current,
  narration: (
    before: RoleplayView,
    after: RoleplayView,
    text: string,
  ) => string | null = (_before, _after, text) => text,
): ProjectionDefinition<'roleplay', RoleplayProjectionState> {
  return {
    key: 'roleplay',
    schema: roleplayPlayerSurfaceSchema,
    stateVersion: 3,
    init: () => ({
      world: null,
      observerId: null,
      narration: [],
      recordRevisions: [],
      progress: null,
      review: null,
    }),
    apply(state, event: SessionEvent) {
      if (event.type === 'rp/seed') {
        if (state.world !== null) throw new Error('roleplay surface projection found duplicate rp/seed')
        return { ...state, world: storyworldFromSeed(event.data) }
      }
      if (event.type === 'rp/observer') {
        if (state.world === null) throw new Error('roleplay surface projection found rp/observer before rp/seed')
        if (state.observerId !== null) throw new Error('roleplay surface projection found duplicate rp/observer')
        const observerId = decodeRoleplayObserver(event.data).observerId
        const view = projectStoryworld(state.world, observerId)
        const presentation = present(view)
        return {
          ...state,
          observerId,
          recordRevisions: presentation?.records.map(record => ({
            id: record.id,
            revision: view.revision,
          })) ?? [],
        }
      }
      let next = state
      if (event.type === 'user/message' && event.data.source.kind === 'roleplay') {
        if (state.world === null) throw new Error('roleplay surface projection found a commit before rp/seed')
        const commit = event.data.source.commit
        const beforeView = state.observerId === null
          ? undefined
          : projectStoryworld(state.world, state.observerId)
        const completedPhase = beforeView === undefined ? undefined : present(beforeView)?.phase
        const world = applyRoleplayCommit(state.world, commit)
        const afterView = state.observerId === null
          ? undefined
          : projectStoryworld(world, state.observerId)
        const projectedNarration = beforeView === undefined || afterView === undefined
          ? commit.narration
          : narration(beforeView, afterView, commit.narration)
        const narrationItems = projectedNarration === null
          ? state.narration
          : [...state.narration, {
            revision: commit.revision,
            text: projectedNarration,
            ...(completedPhase === undefined ? {} : { phase: completedPhase }),
          }].slice(-ROLEPLAY_SURFACE_NARRATION_LIMIT)
        const knownRecordIds = new Set(state.recordRevisions.map(record => record.id))
        const committedRecords = state.observerId === null
          ? []
          : present(projectStoryworld(world, state.observerId))?.records ?? []
        const recordRevisions = [...state.recordRevisions]
        for (const record of committedRecords) {
          if (knownRecordIds.has(record.id)) continue
          knownRecordIds.add(record.id)
          recordRevisions.push({ id: record.id, revision: commit.revision })
        }
        next = {
          ...state,
          world,
          narration: narrationItems,
          recordRevisions,
        }
      }
      if (next.world === null || next.observerId === null) return next
      const view = projectStoryworld(next.world, next.observerId)
      const value = progress(next.progress, view, event)
      const reviewValue = review(next.review, view, event)
      if (value === next.progress && reviewValue === next.review) return next
      return { ...next, progress: value, review: reviewValue }
    },
    view(state) {
      if (state.world === null || state.observerId === null) return null
      const view = projectStoryworld(state.world, state.observerId)
      const presentation = present(view)
      if (presentation === undefined) return null
      if (state.review?.ready === true && presentation.status !== 'complete') {
        throw new Error('roleplay surface presenter marked a review ready before completion')
      }
      const recordRevisionById = new Map(state.recordRevisions.map(record => [record.id, record.revision]))
      return {
        ...presentation,
        records: presentation.records.map((record) => {
          const revision = recordRevisionById.get(record.id)
          return revision === undefined ? record : { ...record, revision }
        }),
        revision: view.revision,
        observerId: view.observerId as unknown as RoleplaySurfaceObserverId,
        narration: state.narration,
        ...state.progress === null ? {} : { progress: state.progress },
        ...state.review?.ready === true ? { review: state.review.value } : {},
      }
    },
  }
}

/**
 * Register the Roleplay projection only when the optional registry is composed.
 * @param ctx - owning Cordis context with an optional projection registry.
 * @param present - current scenario presentation selector.
 * @param progress - current scenario progress fold.
 * @param review - current scenario completed-review fold.
 * @param narration - current scenario committed-narration projection.
 */
export function installRoleplaySurfaceProjection(
  ctx: Context,
  present: (view: RoleplayView) => RoleplayPlayerPresentation | undefined,
  progress: (
    current: RoleplaySurfaceProgress | null,
    view: RoleplayView,
    event: SessionEvent,
  ) => RoleplaySurfaceProgress | null,
  review: (
    current: RoleplaySurfaceReviewState | null,
    view: RoleplayView,
    event: SessionEvent,
  ) => RoleplaySurfaceReviewState | null,
  narration: (before: RoleplayView, after: RoleplayView, text: string) => string | null,
): void {
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(createRoleplaySurfaceProjection(present, progress, review, narration))
  })
}
