/** Least-knowledge role-agent consultation and privacy-safe proposal projection. @module @deepseek-ai/dsh-roleplay/proposal */

import { randomUUID } from 'node:crypto'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { assertNever, type ContentBlock } from '@deepseek-ai/dsh-llm'
import type { CallId } from '@deepseek-ai/dsh-llm'
import { delegationDepthOf, type default as SubagentService } from '@deepseek-ai/dsh-subagent'
import type { JsonSchemaNode, ObjectJsonSchema, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { RoleplayError } from './error.ts'
import { asRoleplayActorId, asRoleplayFactId, asRoleplayProposalId, asRoleplayResolverName } from './ids.ts'
import { assertVisibleReferences } from './reference-validation.ts'
import { projectStoryworld } from './reducer.ts'
import { decodeRoleplayProposal } from './schema.ts'
import type {
  RoleplayActorId,
  RoleplayConsultResult,
  RoleplayContinuityFinding,
  RoleplayIntent,
  RoleplayObserverId,
  RoleplayProposal,
  RoleplayProposalPreviewEvent,
  RoleplayResolverName,
  RoleplayWorldEvent,
  Storyworld,
} from './types.ts'

/** Native tool name for optional role-agent consultation. */
export const ROLEPLAY_CONSULT_TOOL = 'roleplay_consult'

const ROLEPLAY_CONSULT_RECEIPT = 'Roleplay proposal processing completed. Use only a following roleplay-owned '
  + 'context as a usable proposal; if none follows, retry the consultation.'

/** Resolver metadata retained only for internal model-context projection. */
export interface RoleplayResolverView {
  readonly name: RoleplayResolverName
  readonly version: string
  readonly description: string
  readonly parameters: ObjectJsonSchema
}

/**
 * Render the non-authoritative tool receipt that never exposes an unrecorded proposal id.
 * @returns model-facing guidance to wait for the separately admitted proposal context.
 */
export function renderRoleplayConsultReceipt(): ContentBlock[] {
  return [{ type: 'text', text: ROLEPLAY_CONSULT_RECEIPT }]
}

/**
 * Render one observer-safe result only after its private proposal record was accepted.
 * @param result - validated safe consultation result.
 * @returns model-facing context containing the usable proposal id and safe payload.
 */
export function renderRoleplayConsultContext(result: RoleplayConsultResult): ContentBlock[] {
  return [{ type: 'text', text: JSON.stringify(result) }]
}

const CHARACTER_OUTPUT_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resolver: { type: 'string' },
    arguments: {},
  },
  required: ['resolver', 'arguments'],
}

const DIRECTOR_OUTPUT_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    guidance: { type: 'string' },
    focus_actor_ids: { type: 'array', items: { type: 'string' } },
  },
  required: ['guidance', 'focus_actor_ids'],
}

const CONTINUITY_FINDING_SCHEMA: JsonSchemaNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    severity: { type: 'string', enum: ['info', 'warning', 'error'] },
    summary: { type: 'string' },
    actor_ids: { type: 'array', items: { type: 'string' } },
    fact_ids: { type: 'array', items: { type: 'string' } },
  },
  required: ['severity', 'summary', 'actor_ids', 'fact_ids'],
}

const CONTINUITY_OUTPUT_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: { type: 'array', items: CONTINUITY_FINDING_SCHEMA },
  },
  required: ['findings'],
}

/** Build one closed observer-safe event branch without repeating schema framing. */
function previewEventOutput<
  const K extends RoleplayProposalPreviewEvent['kind'],
  const P extends ParameterSchemaSpec,
>(kind: K, properties: P) {
  return {
    type: 'object' as const,
    additionalProperties: false as const,
    properties: {
      kind: { type: 'string' as const, const: kind, required: true as const },
      ...properties,
    },
  }
}

const PREVIEW_EVENT_OUTPUT_SCHEMA = {
  oneOf: [
    previewEventOutput('actor/move', {
      actorId: { type: 'string', required: true },
    }),
    previewEventOutput('relationship/adjust', {
      actorId: { type: 'string', required: true },
      targetId: { type: 'string', required: true },
    }),
    previewEventOutput('fact/reveal', {
      factId: { type: 'string', required: true },
    }),
    previewEventOutput('scene/advance', {}),
    previewEventOutput('choice/record', {}),
  ],
} as const

/** Enforced model-facing result union of `roleplay_consult`. */
export const ROLEPLAY_CONSULT_OUTPUT_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'character', required: true },
        proposalId: { type: 'string', required: true },
        baseRevision: { type: 'integer', required: true },
        actorId: { type: 'string', required: true },
        resolver: { type: 'string', required: true },
        preview: {
          type: 'object',
          required: true,
          additionalProperties: false,
          properties: {
            events: { type: 'array', items: PREVIEW_EVENT_OUTPUT_SCHEMA, required: true },
            withheldFactReveals: { type: 'integer', required: true },
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'director', required: true },
        proposalId: { type: 'string', required: true },
        baseRevision: { type: 'integer', required: true },
        guidance: { type: 'string', required: true },
        focusActorIds: { type: 'array', items: { type: 'string' }, required: true },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'continuity', required: true },
        proposalId: { type: 'string', required: true },
        baseRevision: { type: 'integer', required: true },
        findings: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              severity: { type: 'string', enum: ['info', 'warning', 'error'], required: true },
              summary: { type: 'string', required: true },
              actorIds: { type: 'array', items: { type: 'string' }, required: true },
              factIds: { type: 'array', items: { type: 'string' }, required: true },
            },
          },
        },
      },
    },
  ],
} as const

const PERSONAS = {
  character: 'You are a private Character proposal agent. Use only the supplied actor-specific Storyworld view and '
    + 'action schemas. Propose exactly one intent for the named actor. Do not narrate, commit state, or claim that '
    + 'the proposal happened.',
  director: 'You are a Director proposal agent. Use only the supplied narrator-visible Storyworld view. Return '
    + 'structured pacing and focus guidance; do not narrate or commit state.',
  continuity: 'You are a Continuity proposal agent. Use only the supplied narrator-visible Storyworld view. Return '
    + 'structured consistency findings; do not invent hidden facts, narrate, or commit state.',
} as const

/** One role-specific request accepted by the coordinator. */
export type RoleplayConsultRequest =
  | { readonly role: 'character'; readonly task: string; readonly actorId: RoleplayActorId }
  | { readonly role: 'director'; readonly task: string }
  | { readonly role: 'continuity'; readonly task: string }

/** Inputs retained by the roleplay service while one child runs. */
export interface RoleplayConsultOptions {
  readonly subagents: SubagentService
  readonly providerName: string
  readonly agent: Agent
  readonly parentObserverId: RoleplayObserverId
  readonly request: RoleplayConsultRequest
  readonly callId: CallId
  readonly signal: AbortSignal
  readonly getWorld: () => Storyworld
  readonly resolvers: readonly RoleplayResolverView[]
  readonly resolveIntent: (
    world: Storyworld,
    intent: RoleplayIntent,
  ) => { readonly events: readonly RoleplayWorldEvent[]; readonly resolverVersion: string }
}

/** Result and private record produced together after every acceptance check. */
export interface RoleplayConsultation {
  readonly proposal: RoleplayProposal
  readonly result: RoleplayConsultResult
}

/**
 * Require the exact provider capabilities that keep role-agent inputs least-knowledge.
 * @param subagents - provider registry consulted before the Agent is published.
 * @param name - configured provider name that must supply the complete isolation contract.
 */
export function assertRoleplayProposalProvider(subagents: SubagentService, name: string): void {
  if (name.trim().length === 0) {
    throw new RoleplayError('roleplay proposal provider must be non-empty', 'ROLEPLAY_PROPOSAL_UNAVAILABLE')
  }
  const provider = subagents.getProvider(name)
  if (provider === undefined) {
    throw new RoleplayError(
      `roleplay proposal provider ${JSON.stringify(name)} is not registered`,
      'ROLEPLAY_PROPOSAL_UNAVAILABLE',
    )
  }
  if (provider.inheritsParentContext) {
    throw new RoleplayError(
      `roleplay proposal provider ${JSON.stringify(name)} inherits parent context`,
      'ROLEPLAY_PROPOSAL_UNAVAILABLE',
    )
  }
  const required = [
    'outputSchema',
    'depthLimit',
    'toolFilter',
    'persona',
    'sessionVisibility',
  ] as const
  const missing = required.filter(capability => !provider.capabilities[capability])
  if (missing.length > 0) {
    throw new RoleplayError(
      `roleplay proposal provider ${JSON.stringify(name)} lacks ${missing.join(', ')} capability`,
      'ROLEPLAY_PROPOSAL_UNAVAILABLE',
    )
  }
}

/** Child-visible request with no parent transcript or canonical authority. */
function proposalPrompt(
  request: RoleplayConsultRequest,
  world: Storyworld,
  observerId: RoleplayObserverId,
  resolvers: readonly RoleplayResolverView[],
): ContentBlock[] {
  const value = {
    role: request.role,
    task: request.task,
    ...request.role === 'character' ? { actor_id: request.actorId } : {},
    storyworld: projectStoryworld(world, observerId),
    actions: resolvers,
  }
  return [{
    type: 'text',
    text: 'Produce one non-canonical roleplay proposal from this least-knowledge input.\n\n'
      + `<roleplay-proposal-request>\n${JSON.stringify(value)}\n</roleplay-proposal-request>`,
  }]
}

/** Observer identity and structured schema granted to one role. */
function childComposition(
  request: RoleplayConsultRequest,
  world: Storyworld,
  parentObserverId: RoleplayObserverId,
): { observerId: RoleplayObserverId; outputSchema: ObjectJsonSchema; persona: string } {
  switch (request.role) {
    case 'character': {
      const actor = world.actors.find(candidate => candidate.id === request.actorId)
      if (actor === undefined) {
        throw new RoleplayError(
          `roleplay consultation names unknown actor ${JSON.stringify(request.actorId)}`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      return {
        observerId: actor.observerId,
        outputSchema: CHARACTER_OUTPUT_SCHEMA,
        persona: PERSONAS.character,
      }
    }
    case 'director':
      return {
        observerId: parentObserverId,
        outputSchema: DIRECTOR_OUTPUT_SCHEMA,
        persona: PERSONAS.director,
      }
    case 'continuity':
      return {
        observerId: parentObserverId,
        outputSchema: CONTINUITY_OUTPUT_SCHEMA,
        persona: PERSONAS.continuity,
      }
    /* v8 ignore next -- RoleplayConsultRequest is closed and every role is composed above. */
    default:
      return assertNever(request, 'roleplay consultation role')
  }
}

/** Await one published run and preserve both execution and quiescent-disposal failures. */
async function settleChild(
  run: Awaited<ReturnType<SubagentService['start']>>,
): Promise<Awaited<typeof run.result>> {
  const [runResult] = await Promise.allSettled([run.result])
  const [disposal] = await Promise.allSettled([run.dispose()])
  if (runResult.status === 'rejected' || disposal.status === 'rejected') {
    const failures: unknown[] = []
    if (runResult.status === 'rejected') failures.push(runResult.reason)
    if (disposal.status === 'rejected') failures.push(disposal.reason)
    const cause = failures.length === 1
      ? failures[0]
      : new AggregateError(failures, 'roleplay proposal child failed and did not dispose cleanly')
    throw new RoleplayError('roleplay proposal child failed', 'ROLEPLAY_PROPOSAL_FAILED', { cause })
  }
  return runResult.value
}

/** Convert resolver events into a preview that cannot disclose newly visible facts. */
function safePreview(
  world: Storyworld,
  observerId: RoleplayObserverId,
  events: readonly RoleplayWorldEvent[],
): { events: RoleplayProposalPreviewEvent[]; withheldFactReveals: number } {
  const visibleFacts = new Set(projectStoryworld(world, observerId).facts.map(fact => fact.id))
  const safe: RoleplayProposalPreviewEvent[] = []
  let withheldFactReveals = 0
  for (const event of events) {
    switch (event.kind) {
      case 'actor/move':
        safe.push({ kind: event.kind, actorId: event.actorId })
        break
      case 'relationship/adjust':
        safe.push({
          kind: event.kind,
          actorId: event.actorId,
          targetId: event.targetId,
        })
        break
      case 'fact/reveal':
        if (visibleFacts.has(event.factId)) {
          safe.push({ kind: event.kind, factId: event.factId })
        } else {
          withheldFactReveals += 1
        }
        break
      case 'scene/advance':
        safe.push({ kind: event.kind })
        break
      case 'choice/record':
        safe.push({ kind: event.kind })
        break
      /* v8 ignore next -- RoleplayWorldEvent is closed and every variant is projected above. */
      default:
        assertNever(event, 'roleplay proposal preview event')
    }
  }
  return { events: safe, withheldFactReveals }
}

/** Convert one validated child value into a durable record and observer-safe result. */
function materializeProposal(
  options: RoleplayConsultOptions,
  world: Storyworld,
  observerId: RoleplayObserverId,
  structured: unknown,
): RoleplayConsultation {
  const id = asRoleplayProposalId(randomUUID())
  const base = {
    version: 0 as const,
    id,
    callId: options.callId,
    baseRevision: world.revision,
    observerId,
  }
  switch (options.request.role) {
    case 'character': {
      const output = structured as { resolver: string; arguments: RoleplayIntent['arguments'] }
      const intent: RoleplayIntent = {
        actorId: options.request.actorId,
        resolver: asRoleplayResolverName(output.resolver),
        arguments: output.arguments,
      }
      const offeredResolver = options.resolvers.find(resolver => resolver.name === intent.resolver)
      if (offeredResolver === undefined) {
        throw new RoleplayError(
          `character proposal names unoffered resolver ${JSON.stringify(intent.resolver)}`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      const resolution = options.resolveIntent(world, intent)
      if (resolution.resolverVersion !== offeredResolver.version) {
        throw new RoleplayError(
          `stale roleplay resolver ${JSON.stringify(intent.resolver)} version `
            + `${JSON.stringify(offeredResolver.version)}; current version is `
            + JSON.stringify(resolution.resolverVersion),
          'ROLEPLAY_STALE_RESOLVER',
        )
      }
      const proposal = decodeRoleplayProposal({
        ...base,
        payload: {
          role: 'character',
          actorId: intent.actorId,
          resolver: intent.resolver,
          resolverVersion: resolution.resolverVersion,
          arguments: intent.arguments,
        },
      })
      return {
        proposal,
        result: {
          kind: 'character',
          proposalId: id,
          baseRevision: world.revision,
          actorId: intent.actorId,
          resolver: intent.resolver,
          preview: safePreview(world, options.parentObserverId, resolution.events),
        },
      }
    }
    case 'director': {
      const output = structured as { guidance: string; focus_actor_ids: string[] }
      if (output.guidance.trim().length === 0) {
        throw new RoleplayError('director guidance must be non-empty', 'ROLEPLAY_PROPOSAL_FAILED')
      }
      const actorIds = new Set(world.actors.map(actor => String(actor.id)))
      assertVisibleReferences(
        output.focus_actor_ids,
        actorIds,
        'director focus actor id',
        'ROLEPLAY_PROPOSAL_FAILED',
      )
      const focusActorIds = output.focus_actor_ids.map(asRoleplayActorId)
      const proposal = decodeRoleplayProposal({
        ...base,
        payload: { role: 'director', guidance: output.guidance, focusActorIds },
      })
      return {
        proposal,
        result: {
          kind: 'director',
          proposalId: id,
          baseRevision: world.revision,
          guidance: output.guidance,
          focusActorIds,
        },
      }
    }
    case 'continuity': {
      const output = structured as {
        findings: {
          severity: RoleplayContinuityFinding['severity']
          summary: string
          actor_ids: string[]
          fact_ids: string[]
        }[]
      }
      const view = projectStoryworld(world, observerId)
      const actorIds = new Set(view.actors.map(actor => String(actor.id)))
      const factIds = new Set(view.facts.map(fact => String(fact.id)))
      const findings = output.findings.map((finding) => {
        if (finding.summary.trim().length === 0) {
          throw new RoleplayError('continuity finding summary must be non-empty', 'ROLEPLAY_PROPOSAL_FAILED')
        }
        assertVisibleReferences(finding.actor_ids, actorIds, 'continuity actor id', 'ROLEPLAY_PROPOSAL_FAILED')
        assertVisibleReferences(finding.fact_ids, factIds, 'continuity fact id', 'ROLEPLAY_PROPOSAL_FAILED')
        return {
          severity: finding.severity,
          summary: finding.summary,
          actorIds: finding.actor_ids.map(asRoleplayActorId),
          factIds: finding.fact_ids.map(asRoleplayFactId),
        }
      })
      const proposal = decodeRoleplayProposal({
        ...base,
        payload: { role: 'continuity', findings },
      })
      return {
        proposal,
        result: {
          kind: 'continuity',
          proposalId: id,
          baseRevision: world.revision,
          findings,
        },
      }
    }
    /* v8 ignore next -- RoleplayConsultRequest is closed and every result is materialized above. */
    default:
      return assertNever(options.request, 'roleplay consultation result')
  }
}

/**
 * Run one fresh structured role agent, recheck its world revision, and materialize its proposal.
 * @param options - parent authority, least-knowledge view, provider, and deterministic resolver seam.
 * @returns the private durable record and its observer-safe model result.
 */
export async function consultRoleplay(options: RoleplayConsultOptions): Promise<RoleplayConsultation> {
  if (options.request.task.trim().length === 0) {
    throw new RoleplayError('roleplay consultation task must be non-empty', 'ROLEPLAY_INVALID_INTENT')
  }
  assertRoleplayProposalProvider(options.subagents, options.providerName)
  const initial = options.getWorld()
  const composition = childComposition(options.request, initial, options.parentObserverId)
  const maxDepth = delegationDepthOf(options.agent) + 1
  if (!Number.isSafeInteger(maxDepth)) {
    throw new RoleplayError('roleplay proposal depth exceeds the safe-integer range', 'ROLEPLAY_PROPOSAL_UNAVAILABLE')
  }
  const run = await options.subagents.start(options.providerName, {
    label: `roleplay ${options.request.role} proposal`,
    prompt: proposalPrompt(options.request, initial, composition.observerId, options.resolvers),
    parent: options.agent,
    signal: options.signal,
    outputSchema: composition.outputSchema,
    maxDepth,
    toolFilter: { allow: [] },
    persona: composition.persona,
    sessionVisibility: 'internal',
  })
  const child = await settleChild(run)
  if (child.stopReason !== 'completed' || child.structured === undefined) {
    throw new RoleplayError(
      `roleplay proposal child stopped with ${JSON.stringify(child.stopReason)}`,
      'ROLEPLAY_PROPOSAL_FAILED',
    )
  }
  const current = options.getWorld()
  if (current.revision !== initial.revision) {
    throw new RoleplayError(
      `stale roleplay proposal revision ${initial.revision}; current revision is ${current.revision}`,
      'ROLEPLAY_STALE_REVISION',
    )
  }
  return materializeProposal(options, current, composition.observerId, child.structured)
}
