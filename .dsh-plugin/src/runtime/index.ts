/** Experimental Storyworld service, resolver registry, and scoped commit runtime. @module @deepseek-ai/dsh-roleplay */

import { isDeepStrictEqual } from 'node:util'
import { Context, Service } from 'cordis'
import type { Agent, AgentSetup } from '@deepseek-ai/dsh-agent'
import { assertNever, createUserMessage, deepFreeze } from '@deepseek-ai/dsh-llm'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import {
  assertObjectJsonSchema,
  defineTool,
  validateJsonSchemaValue,
  type GenericCallView,
  type InferValue,
  type ToolExecution,
} from '@deepseek-ai/dsh-tools'
import { RoleplayError } from './error.ts'
import { decodeRoleplayCommit, decodeRoleplaySeed, ROLEPLAY_COMMIT_VALUE_SCHEMA } from './schema.ts'
import {
  ROLEPLAY_COMMIT_TOOL,
  renderRoleplayCommitContext,
  renderRoleplayToolResult,
  roleplaySessionObserver,
  validateRoleplayAppend,
  validateRoleplayHistory,
} from './log.ts'
import { ROLEPLAY_COMMIT_PARAMETERS } from './commit-parameters.ts'
import {
  ROLEPLAY_CONSULT_OUTPUT_SCHEMA,
  ROLEPLAY_CONSULT_TOOL,
  assertRoleplayProposalProvider,
  consultRoleplay,
  renderRoleplayConsultContext,
  renderRoleplayConsultReceipt,
  type RoleplayConsultRequest,
  type RoleplayResolverView,
} from './proposal.ts'
import { assertRoleplayCommitResponse } from './protocol.ts'
import { applyRoleplayWorldEvents, projectStoryworld, storyworldFromSeed } from './reducer.ts'
import { asRoleplayActorId } from './ids.ts'
import { installRoleplaySurfaceProjection, type RoleplaySurfacePresenter } from './surface.ts'
import type {
  RoleplayPlayerPresentation,
  RoleplaySurfaceProgress,
  RoleplaySurfaceReviewState,
} from './surface-types.ts'
import type {
  RoleplayActionResolver,
  RoleplayAgentOptions,
  RoleplayApplicationCommitDraft,
  RoleplayApplicationTurnOptions,
  RoleplayCommit,
  RoleplayCommitOrigin,
  RoleplayConsultResult,
  RoleplayIntent,
  RoleplayProposal,
  RoleplayResolverName,
  RoleplayWorldEvent,
  Storyworld,
} from './types.ts'

export { RoleplayError } from './error.ts'
export {
  asRoleplayActorId,
  asRoleplayChoiceId,
  asRoleplayFactId,
  asRoleplayObserverId,
  asRoleplayProposalId,
  asRoleplayResolverName,
  asRoleplaySurfaceActionId,
  asRoleplaySurfaceActorId,
  asRoleplaySurfaceFactId,
  asRoleplaySurfaceKind,
  asRoleplaySurfaceRecordId,
  asRoleplaySurfaceReviewEntryId,
} from './ids.ts'
export { ROLEPLAY_COMMIT_TOOL } from './log.ts'
export { projectRoleplayNarration } from './presentation.ts'
export {
  ROLEPLAY_SURFACE_NARRATION_LIMIT,
  createRoleplaySurfaceProjection,
  roleplayPlayerSurfaceSchema,
} from './surface.ts'
export type { RoleplaySurfacePresenter } from './surface.ts'
export type * from './surface-types.ts'
export { ROLEPLAY_CONSULT_TOOL } from './proposal.ts'
export {
  applyRoleplayCommit,
  applyRoleplayWorldEvents,
  projectStoryworld,
  replayStoryworld,
  storyworldFromSeed,
} from './reducer.ts'
export type * from './types.ts'

/** Stable roleplay protocol guidance registered only in an attached agent scope. */
const ROLEPLAY_INSTRUCTION = 'You narrate from the supplied observer-specific Storyworld view. '
  + 'Treat ordinary prose, tool failures, and proposed intents as non-canonical. To accept a story turn, respond with '
  + 'exactly one roleplay_commit tool call and no other visible content. Copy the current revision as base_revision. '
  + 'The call commits only after every named resolver accepts; otherwise revise the proposal and retry.'

/** Additional protocol guidance present only when role-agent consultation is enabled. */
const ROLEPLAY_PROPOSAL_INSTRUCTION = 'roleplay_consult creates non-canonical proposals in fresh, '
  + 'least-knowledge agents. Character proposal ids may replace direct intents in roleplay_commit. '
  + 'Director and continuity proposals are advisory and cannot be committed.'

type RoleplayCommitValue = InferValue<typeof ROLEPLAY_COMMIT_VALUE_SCHEMA>

interface ResolvedRoleplayCommit {
  readonly record: RoleplayCommit
  readonly value: RoleplayCommitValue
}

/** Same-turn reminder used by the optional bounded correction controller. */
const ROLEPLAY_CORRECTION_INSTRUCTION = 'No roleplay transaction was committed. Retry this turn with exactly '
  + 'one roleplay_commit tool call and no visible text. Use the current Storyworld revision and revise or replace any '
  + 'rejected intent.'

declare module 'cordis' {
  interface Context {
    roleplay: RoleplayService
  }
}

/** Validate one resolver name at the registry boundary. */
function assertResolverName(name: string): void {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new RoleplayError(
      `roleplay resolver name ${JSON.stringify(name)} must use lower_snake_case`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
}

/** Validate that the model's committing message contains only this direct call. */
function assertCommittingResponse(agent: Agent, callId: string): void {
  const assistant = agent.session.events.findLast(event => event.type === 'assistant/message')
  const blocks = assistant?.type === 'assistant/message' ? assistant.data.message.content : []
  assertRoleplayCommitResponse(blocks, callId, ROLEPLAY_COMMIT_TOOL)
}

/** Render one complete observer view and the currently enabled action vocabulary. */
function renderView(world: Storyworld, observerId: RoleplayAgentOptions['observerId'], resolvers: RoleplayResolverView[]): string {
  const value = { storyworld: projectStoryworld(world, observerId), actions: resolvers }
  return `## Storyworld view\n\n<storyworld-view>\n${JSON.stringify(value)}\n</storyworld-view>`
}

/** Generic pending card for the terminal commit tool. */
function presentCommit(args: { narration: string }): GenericCallView {
  return { card: 'generic', title: 'Commit story turn', kind: 'other', rawInput: args.narration }
}

/** Generic pending card for role-agent consultation. */
function presentConsult(args: { role: string; task: string }): GenericCallView {
  return {
    card: 'generic',
    title: `Consult ${args.role}`,
    kind: 'other',
    rawInput: args.task,
  }
}

/** Resolve the optional bounded-correction count before Agent setup begins. */
function resolveMaxCorrectionAttempts(value: number | undefined): number {
  if (value === undefined) return 0
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RoleplayError(
      'roleplay maxCorrectionAttempts must be a non-negative safe integer',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  return value
}

type RoleplayCommitIntentInput =
  | {
    readonly actor_id: string
    readonly resolver: string
    readonly arguments: JsonValue
  }
  | { readonly proposal_id: string }

/** One direct intent or proposal expansion with an optional pinned resolver contract. */
interface PreparedRoleplayIntent extends RoleplayIntent {
  readonly expectedResolverVersion?: string
}

/** Process-local trusted resolver registry and per-agent roleplay composer. */
export class RoleplayService extends Service {
  static inject = ['tools', 'systemPrompt']

  private readonly resolvers = new Map<RoleplayResolverName, RoleplayActionResolver>()
  private readonly presenters = new Map<string, RoleplaySurfacePresenter>()
  private readonly attachedAgents = new WeakSet<Agent>()

  constructor(ctx: Context) {
    super(ctx, 'roleplay')
    installRoleplaySurfaceProjection(
      ctx,
      view => this.present(view),
      (current, view, event) => this.presentProgress(current, view, event),
      (current, view, event) => this.presentReview(current, view, event),
      (before, after, text) => this.presentNarration(before, after, text),
    )
  }

  /**
   * Register one scenario-owned observer-safe player presenter.
   * @param presenter - selector and pure presentation projection.
   * @returns an idempotent disposer for this exact presenter.
   */
  registerPresenter(presenter: RoleplaySurfacePresenter): () => void {
    if (!/^[a-z][a-z0-9-]*$/.test(presenter.name)) {
      throw new RoleplayError(
        `roleplay presenter name ${JSON.stringify(presenter.name)} must use lower-kebab-case`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    if (this.presenters.has(presenter.name)) {
      throw new RoleplayError(
        `roleplay presenter ${JSON.stringify(presenter.name)} is already registered`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    this.presenters.set(presenter.name, presenter)
    let active = true
    return () => {
      if (!active) return
      active = false
      if (this.presenters.get(presenter.name) === presenter) this.presenters.delete(presenter.name)
    }
  }

  /** Resolve exactly one matching scenario presenter without exposing canonical state. */
  private presenter(view: import('./types.ts').RoleplayView): RoleplaySurfacePresenter | undefined {
    const matches = [...this.presenters.values()].filter(presenter => presenter.matches(view))
    if (matches.length > 1) {
      throw new RoleplayError(
        `roleplay view matched multiple presenters: ${matches.map(item => item.name).join(', ')}`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    return matches[0]
  }

  /** Produce one complete scenario presentation through its matching presenter. */
  private present(view: import('./types.ts').RoleplayView): RoleplayPlayerPresentation | undefined {
    return this.presenter(view)?.present(view)
  }

  /** Project one commit's narration through the matching scenario presenter. */
  private presentNarration(
    before: import('./types.ts').RoleplayView,
    after: import('./types.ts').RoleplayView,
    text: string,
  ): string | null {
    const presenter = this.presenter(before)
    return presenter?.narration === undefined ? text : presenter.narration(before, after, text)
  }

  /** Fold one event through the matching progress presenter, preserving its explicit clear result. */
  private presentProgress(
    current: RoleplaySurfaceProgress | null,
    view: import('./types.ts').RoleplayView,
    event: SessionEvent,
  ): RoleplaySurfaceProgress | null {
    const presenter = this.presenter(view)
    return presenter?.progress === undefined ? current : presenter.progress(current, view, event)
  }

  /** Fold one event through the matching completed-review presenter. */
  private presentReview(
    current: RoleplaySurfaceReviewState | null,
    view: import('./types.ts').RoleplayView,
    event: SessionEvent,
  ): RoleplaySurfaceReviewState | null {
    const presenter = this.presenter(view)
    return presenter?.review === undefined ? current : presenter.review(current, view, event)
  }

  /**
   * Register one trusted deterministic action resolver.
   * @param resolver - name, action description, enforced object schema, and transition function.
   * @returns an idempotent disposer that removes this exact registration.
   */
  registerResolver(resolver: RoleplayActionResolver): () => void {
    assertResolverName(resolver.name)
    if (resolver.version.trim().length === 0) {
      throw new RoleplayError('roleplay resolver version must be non-empty', 'ROLEPLAY_INVALID_DATA')
    }
    if (resolver.description.trim().length === 0) {
      throw new RoleplayError('roleplay resolver description must be non-empty', 'ROLEPLAY_INVALID_DATA')
    }
    assertObjectJsonSchema(resolver.parameters)
    if (this.resolvers.has(resolver.name)) {
      throw new RoleplayError(
        `roleplay resolver ${JSON.stringify(resolver.name)} is already registered`,
        'ROLEPLAY_DUPLICATE_RESOLVER',
      )
    }
    const stored: RoleplayActionResolver = {
      ...resolver,
      parameters: deepFreeze(structuredClone(resolver.parameters)),
    }
    this.resolvers.set(stored.name, stored)
    let active = true
    return () => {
      if (!active) return
      active = false
      /* v8 ignore else -- duplicate rejection prevents replacement while this active closure owns the exact entry. */
      if (this.resolvers.get(stored.name) === stored) this.resolvers.delete(stored.name)
    }
  }

  /** Return detached resolver metadata in registration order for model projection. */
  private resolverViews(): RoleplayResolverView[] {
    return [...this.resolvers.values()]
      .filter(resolver => resolver.applicationOnly !== true)
      .map(resolver => ({
        name: resolver.name,
        version: resolver.version,
        description: resolver.description,
        parameters: structuredClone(resolver.parameters),
      }))
  }

  /** Resolve one trusted intent against an exact draft and validate its complete event sequence. */
  private resolveIntent(
    world: Storyworld,
    intent: RoleplayIntent,
    expectedResolverVersion?: string,
  ): { world: Storyworld; events: readonly RoleplayWorldEvent[]; resolverVersion: string } {
    if (!world.actors.some(actor => actor.id === intent.actorId)) {
      throw new RoleplayError(
        `roleplay intent names unknown actor ${JSON.stringify(intent.actorId)}`,
        'ROLEPLAY_INVALID_INTENT',
      )
    }
    const resolver = this.resolvers.get(intent.resolver)
    if (resolver === undefined) {
      throw new RoleplayError(
        `unknown roleplay resolver ${JSON.stringify(intent.resolver)}`,
        'ROLEPLAY_UNKNOWN_RESOLVER',
      )
    }
    if (expectedResolverVersion !== undefined && resolver.version !== expectedResolverVersion) {
      throw new RoleplayError(
        `stale roleplay resolver ${JSON.stringify(intent.resolver)} version `
          + `${JSON.stringify(expectedResolverVersion)}; current version is ${JSON.stringify(resolver.version)}`,
        'ROLEPLAY_STALE_RESOLVER',
      )
    }
    const violations = validateJsonSchemaValue(resolver.parameters, intent.arguments)
    if (violations.length > 0) {
      throw new RoleplayError(
        `invalid ${resolver.name} intent: ${violations.join('; ')}`,
        'ROLEPLAY_INVALID_INTENT',
      )
    }
    const resolution = resolver.resolve({ world, actorId: intent.actorId }, intent.arguments)
    if (resolution.kind === 'rejected') {
      throw new RoleplayError(
        `${resolver.name} rejected the intent: ${resolution.reason}`,
        'ROLEPLAY_INTENT_REJECTED',
      )
    }
    return {
      world: applyRoleplayWorldEvents(world, resolution.events),
      events: resolution.events,
      resolverVersion: resolver.version,
    }
  }

  /** Expand direct inputs and same-Session Character proposal references in caller order. */
  private commitIntents(
    events: readonly SessionEvent[],
    inputs: readonly RoleplayCommitIntentInput[],
    baseRevision: number,
  ): PreparedRoleplayIntent[] {
    const seenProposals = new Set<string>()
    return inputs.map((input): PreparedRoleplayIntent => {
      if (!('proposal_id' in input)) {
        return {
          actorId: input.actor_id as RoleplayIntent['actorId'],
          resolver: input.resolver as RoleplayIntent['resolver'],
          arguments: input.arguments,
        }
      }
      if (seenProposals.has(input.proposal_id)) {
        throw new RoleplayError(
          `roleplay proposal ${JSON.stringify(input.proposal_id)} is referenced more than once`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      seenProposals.add(input.proposal_id)
      const event = events.findLast(candidate =>
        candidate.type === 'rp/proposal' && candidate.data.id === input.proposal_id)
      if (event?.type !== 'rp/proposal') {
        throw new RoleplayError(
          `roleplay proposal ${JSON.stringify(input.proposal_id)} is not in this Session`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      if (event.data.payload.role !== 'character') {
        throw new RoleplayError(
          `roleplay ${event.data.payload.role} proposal ${JSON.stringify(input.proposal_id)} is advisory`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      if (event.data.baseRevision !== baseRevision) {
        throw new RoleplayError(
          `stale roleplay proposal revision ${event.data.baseRevision}; current revision is ${baseRevision}`,
          'ROLEPLAY_STALE_REVISION',
        )
      }
      return {
        actorId: event.data.payload.actorId,
        resolver: event.data.payload.resolver,
        arguments: event.data.payload.arguments,
        expectedResolverVersion: event.data.payload.resolverVersion,
      }
    })
  }

  /** Resolve trusted intents into one detached canonical transaction. */
  private resolveCommit(
    world: Storyworld,
    intents: readonly PreparedRoleplayIntent[],
    narration: string,
    origin: RoleplayCommitOrigin,
  ): ResolvedRoleplayCommit {
    if (narration.trim().length === 0 || intents.length === 0) {
      throw new RoleplayError(
        'roleplay commit requires non-empty narration and at least one intent',
        'ROLEPLAY_INVALID_INTENT',
      )
    }
    let draft = world
    const events: RoleplayWorldEvent[] = []
    for (const intent of intents) {
      if (origin.kind === 'model-tool' && this.resolvers.get(intent.resolver)?.applicationOnly === true) {
        throw new RoleplayError(
          `roleplay resolver ${JSON.stringify(intent.resolver)} is application-only and cannot be used by a model commit`,
          'ROLEPLAY_INVALID_INTENT',
        )
      }
      const resolution = this.resolveIntent(draft, intent, intent.expectedResolverVersion)
      draft = resolution.world
      events.push(...resolution.events)
    }
    const outputEvents = events.map((event) => {
      switch (event.kind) {
        case 'actor/move': return {
          kind: event.kind,
          actorId: String(event.actorId),
          location: event.location,
        }
        case 'relationship/adjust': return {
          kind: event.kind,
          actorId: String(event.actorId),
          targetId: String(event.targetId),
          delta: event.delta,
        }
        case 'fact/reveal': return {
          kind: event.kind,
          factId: String(event.factId),
          observerIds: event.observerIds.map(String),
        }
        case 'scene/advance': return {
          kind: event.kind,
          location: event.location,
          participantIds: event.participantIds.map(String),
        }
        case 'choice/record': return {
          kind: event.kind,
          choiceId: String(event.choiceId),
          text: event.text,
          visibility: event.visibility.kind === 'public'
            ? { kind: 'public' as const }
            : {
              kind: 'observers' as const,
              observerIds: event.visibility.observerIds.map(String),
            },
        }
        /* v8 ignore next -- RoleplayWorldEvent is closed and every variant is rendered above. */
        default: return assertNever(event, 'roleplay commit output event')
      }
    })
    const commit: RoleplayCommitValue = {
      kind: 'rp/commit',
      version: 0,
      origin,
      baseRevision: world.revision,
      revision: world.revision + 1,
      narration,
      causes: intents.map(intent => ({
        actorId: String(intent.actorId),
        resolver: String(intent.resolver),
      })),
      events: outputEvents,
    }
    return { record: decodeRoleplayCommit(commit), value: commit }
  }

  /**
   * Run one application-owned revision from true Agent idle and append it atomically.
   * Later waking input remains queued until preparation and publication settle.
   * @param agent - attached Roleplay Agent that must have no active turn or maintenance task.
   * @param options - durable application provenance and caller cancellation.
   * @param prepare - domain coordinator that receives the exact immutable starting Storyworld.
   * @throws a `ROLEPLAY_BUSY` error when the Agent is not idle at admission.
   * @returns the accepted canonical commit after its observer-safe message enters the Session.
   */
  async runApplicationTurn(
    agent: Agent,
    options: RoleplayApplicationTurnOptions,
    prepare: (world: Storyworld) => RoleplayApplicationCommitDraft | Promise<RoleplayApplicationCommitDraft>,
  ): Promise<RoleplayCommit> {
    if (!this.attachedAgents.has(agent)) {
      throw new RoleplayError('application turn requires an attached Roleplay Agent', 'ROLEPLAY_INVALID_DATA')
    }
    if (!/^[a-z][a-z0-9-]*$/.test(options.source)) {
      throw new RoleplayError(
        `roleplay application source ${JSON.stringify(options.source)} must use lower-kebab-case`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    if (!Number.isSafeInteger(options.sourceEventSeq) || options.sourceEventSeq < 0) {
      throw new RoleplayError(
        'roleplay application sourceEventSeq must be a non-negative safe integer',
        'ROLEPLAY_INVALID_DATA',
      )
    }
    const sourceEvent = agent.session.events[options.sourceEventSeq]
    if (sourceEvent === undefined || sourceEvent.seq !== options.sourceEventSeq) {
      throw new RoleplayError('roleplay application source event does not exist', 'ROLEPLAY_INVALID_DATA')
    }
    let started = false
    try {
      return await agent.runMaintenance(async (maintenanceSignal) => {
        started = true
        const signal = AbortSignal.any([options.signal, maintenanceSignal])
        signal.throwIfAborted()
        const initial = validateRoleplayHistory(agent.session.events)
        if (initial === undefined) throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
        const draft = await prepare(initial)
        signal.throwIfAborted()
        const current = validateRoleplayHistory(agent.session.events)
        if (current === undefined) throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
        if (current.revision !== initial.revision || draft.baseRevision !== current.revision) {
          throw new RoleplayError(
            `stale roleplay application revision ${draft.baseRevision}; current revision is ${current.revision}`,
            'ROLEPLAY_STALE_REVISION',
          )
        }
        const { record: commit } = this.resolveCommit(current, draft.intents, draft.narration, {
          kind: 'application',
          source: options.source,
          sourceEventSeq: options.sourceEventSeq,
        })
        agent.session.append('user/message', createUserMessage({
          content: renderRoleplayCommitContext(commit),
          source: { kind: 'roleplay', commit },
        }), { surfaceOp: 'append', sourceEventSeqs: [options.sourceEventSeq] })
        return commit
      })
    } catch (error: unknown) {
      if (!started) {
        throw new RoleplayError('roleplay application turn requires an idle Agent', 'ROLEPLAY_BUSY')
      }
      throw error
    }
  }

  /**
   * Compose one unpublished Agent with a Storyworld view and terminal commit tool.
   * @param options - observer identity and a seed for fresh Sessions.
   * @returns the creation-time setup callback; all registrations unwind with the Agent scope.
   */
  setup(options: RoleplayAgentOptions): AgentSetup {
    const maxCorrectionAttempts = resolveMaxCorrectionAttempts(options.maxCorrectionAttempts)
    const seedRecord = options.seed === undefined ? undefined : decodeRoleplaySeed(options.seed)
    const preparedSeed = seedRecord === undefined ? undefined : storyworldFromSeed(seedRecord)
    return (agentCtx) => {
      const agent = agentCtx.agent
      if (agent === undefined) {
        throw new RoleplayError('roleplay setup requires an Agent scope', 'ROLEPLAY_INVALID_DATA')
      }
      const existing = validateRoleplayHistory(agent.session.events)
      const recordedObserver = roleplaySessionObserver(agent.session.events)
      const initial = existing ?? preparedSeed
      if (initial === undefined) {
        throw new RoleplayError('a fresh roleplay Session requires a seed', 'ROLEPLAY_NO_SEED')
      }
      const freshSeed = existing === undefined ? seedRecord : undefined
      if (existing !== undefined && preparedSeed !== undefined) {
        const recordedSeed = agent.session.events.find(event => event.type === 'rp/seed')
        /* v8 ignore next -- successful history validation guarantees one preceding seed. */
        if (recordedSeed?.type !== 'rp/seed') {
          throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
        }
        if (!isDeepStrictEqual(storyworldFromSeed(recordedSeed.data), preparedSeed)) {
          throw new RoleplayError('supplied roleplay seed does not match the Session history', 'ROLEPLAY_INVALID_DATA')
        }
      }
      if (existing !== undefined && recordedObserver !== options.observerId) {
        throw new RoleplayError(
          `roleplay Session is bound to observer ${JSON.stringify(recordedObserver)} and cannot resume as `
            + JSON.stringify(options.observerId),
          'ROLEPLAY_INVALID_DATA',
        )
      }
      projectStoryworld(initial, options.observerId)
      this.attachedAgents.add(agent)
      agentCtx.effect(() => () => { this.attachedAgents.delete(agent) })

      const proposalProvider = options.proposalProvider
      const subagents = proposalProvider === undefined ? undefined : agentCtx.get('subagents')
      const stagedProposals = new WeakMap<
        ToolExecution,
        { readonly proposal: RoleplayProposal; readonly result: RoleplayConsultResult }
      >()
      if (proposalProvider !== undefined) {
        if (subagents === undefined) {
          throw new RoleplayError(
            'roleplay proposalProvider requires the subagent service',
            'ROLEPLAY_PROPOSAL_UNAVAILABLE',
          )
        }
        assertRoleplayProposalProvider(subagents, proposalProvider)
        agentCtx.on('tools/result', (exec, result) => {
          if (exec.name !== ROLEPLAY_CONSULT_TOOL) return
          const staged = stagedProposals.get(exec)
          if (staged === undefined) return
          stagedProposals.delete(exec)
          if (result.isError || !isDeepStrictEqual(result.value, staged.result)) return
          agent.session.append('rp/proposal', staged.proposal)
          agent.inject(createUserMessage({
            content: renderRoleplayConsultContext(staged.result),
            source: { kind: 'plugin', plugin: 'roleplay' },
          }))
        })
      }

      agentCtx.on('internal/dispatch', (_mode, eventName, args) => {
        if (eventName !== 'session/event') return
        const [session, event] = args as [typeof agent.session, SessionEvent]
        if (session === agent.session) validateRoleplayAppend(session, event)
      })
      if (maxCorrectionAttempts > 0) {
        let correctionTurn: number | undefined
        let correctionAttempts = 0
        agentCtx.on('agent/turn-stopping', ({ agent: subject, turn, signal }) => {
          if (subject !== agent) return
          signal.throwIfAborted()
          if (correctionTurn !== turn) {
            correctionTurn = turn
            correctionAttempts = 0
          }
          if (correctionAttempts >= maxCorrectionAttempts) return
          correctionAttempts += 1
          agent.steer(createUserMessage({
            content: [{ type: 'text', text: ROLEPLAY_CORRECTION_INSTRUCTION }],
            source: { kind: 'plugin', plugin: 'roleplay' },
          }))
        })
      }

      agentCtx.systemPrompt.section({
        name: 'roleplay:protocol',
        order: 140,
        text: ROLEPLAY_INSTRUCTION,
      })
      if (proposalProvider !== undefined) {
        agentCtx.systemPrompt.section({
          name: 'roleplay:proposals',
          order: 141,
          text: ROLEPLAY_PROPOSAL_INSTRUCTION,
        })
      }
      agentCtx.systemPrompt.context({
        name: 'roleplay:view',
        order: 70,
        text: () => {
          const world = validateRoleplayHistory(agent.session.events)
          /* v8 ignore next -- setup requires or appends the seed before prompt assembly can call this context. */
          if (world === undefined) throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
          return renderView(world, options.observerId, this.resolverViews())
        },
      })

      agentCtx.tools.register(defineTool({
        name: ROLEPLAY_COMMIT_TOOL,
        description: 'Atomically resolve and commit one narrated Storyworld revision. This terminal tool is valid only '
          + 'as the sole content of a direct assistant response.',
        parameters: ROLEPLAY_COMMIT_PARAMETERS,
        output: {
          schema: ROLEPLAY_COMMIT_VALUE_SCHEMA,
          render: (_args, commit) => renderRoleplayToolResult(decodeRoleplayCommit(commit)),
        },
        execute: (args, exec) => {
          if (exec.agent !== agent) {
            throw new RoleplayError('roleplay_commit belongs to a different Agent scope', 'ROLEPLAY_INVALID_DATA')
          }
          if (exec.parent !== undefined) {
            throw new RoleplayError('roleplay_commit cannot run through a nested tool transport', 'ROLEPLAY_NESTED_COMMIT')
          }
          assertCommittingResponse(agent, exec.callId)
          const world = validateRoleplayHistory(agent.session.events)
          /* v8 ignore next -- the append-only Session passed setup's required-seed check before this tool was registered. */
          if (world === undefined) throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
          if (args.base_revision !== world.revision) {
            throw new RoleplayError(
              `stale roleplay revision ${args.base_revision}; current revision is ${world.revision}`,
              'ROLEPLAY_STALE_REVISION',
            )
          }
          const intents = this.commitIntents(
            agent.session.events,
            args.intents,
            world.revision,
          )
          const commit = this.resolveCommit(world, intents, args.narration, {
            kind: 'model-tool',
            callId: exec.callId,
          })
          exec.deferContext(createUserMessage({
            content: renderRoleplayCommitContext(commit.record),
            source: { kind: 'roleplay', commit: commit.record },
          }))
          exec.concludeTurn()
          return Promise.resolve(commit.value)
        },
        presentCall: presentCommit,
        isConcurrencySafe: () => false,
      }))
      if (proposalProvider !== undefined && subagents !== undefined) {
        agentCtx.tools.register(defineTool({
          name: ROLEPLAY_CONSULT_TOOL,
          description: 'Ask one fresh least-knowledge Character, Director, or Continuity agent for a structured, '
            + 'non-canonical proposal. Character results can later be referenced by proposal_id; other roles advise.',
          parameters: {
            role: {
              type: 'string',
              enum: ['character', 'director', 'continuity'],
              required: true,
              description: 'Proposal responsibility.',
            },
            task: {
              type: 'string',
              required: true,
              description: 'Specific question or candidate the role agent should evaluate.',
            },
            actor_id: {
              type: 'string',
              description: 'Required only for a Character proposal.',
            },
          },
          output: {
            schema: ROLEPLAY_CONSULT_OUTPUT_SCHEMA,
            render: () => renderRoleplayConsultReceipt(),
          },
          execute: async (args, exec) => {
            if (exec.agent !== agent) {
              throw new RoleplayError('roleplay_consult belongs to a different Agent scope', 'ROLEPLAY_INVALID_DATA')
            }
            if (exec.parent !== undefined) {
              throw new RoleplayError(
                'roleplay_consult cannot run through a nested tool transport',
                'ROLEPLAY_INVALID_DATA',
              )
            }
            if (args.role === 'character' && args.actor_id === undefined) {
              throw new RoleplayError(
                'Character roleplay consultation requires actor_id',
                'ROLEPLAY_INVALID_INTENT',
              )
            }
            if (args.role !== 'character' && args.actor_id !== undefined) {
              throw new RoleplayError(
                `${args.role} roleplay consultation does not accept actor_id`,
                'ROLEPLAY_INVALID_INTENT',
              )
            }
            const request: RoleplayConsultRequest = args.role === 'character'
              ? { role: args.role, task: args.task, actorId: asRoleplayActorId(args.actor_id as string) }
              : { role: args.role, task: args.task }
            const getWorld = (): Storyworld => {
              const world = validateRoleplayHistory(agent.session.events)
              /* v8 ignore next -- setup validated a seed before registering this scoped tool. */
              if (world === undefined) throw new RoleplayError('roleplay Session has no seed', 'ROLEPLAY_NO_SEED')
              return world
            }
            const consultation = await consultRoleplay({
              subagents,
              providerName: proposalProvider,
              agent,
              parentObserverId: options.observerId,
              request,
              callId: exec.callId,
              signal: exec.signal,
              getWorld,
              resolvers: this.resolverViews(),
              resolveIntent: (world, intent) => this.resolveIntent(world, intent),
            })
            stagedProposals.set(exec, consultation)
            return consultation.result
          },
          presentCall: presentConsult,
          isConcurrencySafe: () => false,
        }))
      }
      if (freshSeed !== undefined) {
        return {
          commit() {
            agent.session.append('rp/seed', freshSeed)
            agent.session.append('rp/observer', { version: 0, observerId: options.observerId })
          },
        }
      }
    }
  }
}

export default RoleplayService
