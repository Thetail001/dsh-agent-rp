/** Durable roleplay record rendering and causal Session-log validation. @module @deepseek-ai/dsh-roleplay/log */

import { isDeepStrictEqual } from 'node:util'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { validateArgs, type InferArgs } from '@deepseek-ai/dsh-tools'
import { ROLEPLAY_COMMIT_PARAMETERS } from './commit-parameters.ts'
import { RoleplayError } from './error.ts'
import { ROLEPLAY_CONSULT_TOOL } from './proposal.ts'
import { assertRoleplayCommitResponse } from './protocol.ts'
import { assertVisibleReferences } from './reference-validation.ts'
import { projectStoryworld, replayStoryworld } from './reducer.ts'
import { decodeRoleplayCommit, decodeRoleplayObserver, decodeRoleplayProposal } from './schema.ts'
import type { RoleplayCommit, RoleplayCommitCause, RoleplayObserverId, Storyworld } from './types.ts'

/** Native tool name that owns accepted roleplay commits. */
export const ROLEPLAY_COMMIT_TOOL = 'roleplay_commit'

type RoleplayCommitArguments = InferArgs<typeof ROLEPLAY_COMMIT_PARAMETERS>

/**
 * Render a model-safe receipt for the durable canonical transaction.
 * @param commit - accepted transaction.
 * @returns model-facing content without resolver events or visibility metadata.
 */
export function renderRoleplayToolResult(commit: RoleplayCommit): ContentBlock[] {
  if (commit.origin.kind !== 'model-tool') {
    throw new RoleplayError('application roleplay commits have no model tool result', 'ROLEPLAY_INVALID_DATA')
  }
  return [{
    type: 'text',
    text: JSON.stringify({
      kind: commit.kind,
      version: commit.version,
      callId: commit.origin.callId,
      baseRevision: commit.baseRevision,
      revision: commit.revision,
    }),
  }]
}

/**
 * Render the model-visible commit marker whose source carries the full transaction.
 * @param commit - accepted transaction.
 * @returns the concise context content appended after the successful tool result.
 */
export function renderRoleplayCommitContext(commit: RoleplayCommit): ContentBlock[] {
  return [{ type: 'text', text: `Roleplay revision ${commit.revision} committed.` }]
}

/** Whether one Session event belongs to this package's canonical vocabulary. */
function isRoleplayRecord(event: SessionEvent): boolean {
  return event.type === 'rp/seed'
    || event.type === 'rp/observer'
    || event.type === 'rp/proposal'
    || (event.type === 'user/message' && event.data.source.kind === 'roleplay')
}

/** Validate the immutable Session-to-observer binding at its exact seed boundary. */
function validateObserverRelation(events: readonly SessionEvent[], index: number): void {
  const event = events[index]
  if (event?.type !== 'rp/observer') return
  const binding = decodeRoleplayObserver(event.data)
  if (events.slice(0, index).some(candidate => candidate.type === 'rp/observer')) {
    throw new RoleplayError('a roleplay Session may contain exactly one rp/observer', 'ROLEPLAY_INVALID_DATA')
  }
  const world = replayStoryworld(events.slice(0, index))
  if (world === undefined) {
    throw new RoleplayError('rp/observer appeared before rp/seed', 'ROLEPLAY_NO_SEED')
  }
  if (events[index - 1]?.type !== 'rp/seed') {
    throw new RoleplayError('rp/observer must immediately follow rp/seed', 'ROLEPLAY_INVALID_DATA')
  }
  if (!world.observers.some(observer => observer.id === binding.observerId)) {
    throw new RoleplayError(
      `rp/observer names unknown observer ${JSON.stringify(binding.observerId)}`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
}

/** Reject an empty durable proposal field. */
function requireProposalText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new RoleplayError(`${label} must be non-empty`, 'ROLEPLAY_INVALID_DATA')
  }
}

/** Parse the causal consultation arguments needed to bind a proposal to its call. */
function proposalCallArguments(call: Extract<SessionEvent, { type: 'tool/call' }>): {
  role: 'character' | 'director' | 'continuity'
  task: string
  actorId?: string
} {
  let value: unknown
  try {
    value = JSON.parse(call.data.arguments)
  } catch {
    throw new RoleplayError('roleplay_consult arguments are not valid JSON', 'ROLEPLAY_INVALID_DATA')
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RoleplayError('roleplay_consult arguments must be an object', 'ROLEPLAY_INVALID_DATA')
  }
  const record = value as Record<string, unknown>
  if (record.role !== 'character' && record.role !== 'director' && record.role !== 'continuity') {
    throw new RoleplayError('roleplay_consult role is invalid', 'ROLEPLAY_INVALID_DATA')
  }
  if (typeof record.task !== 'string' || record.task.trim().length === 0) {
    throw new RoleplayError('roleplay_consult task must be non-empty', 'ROLEPLAY_INVALID_DATA')
  }
  if (record.role === 'character') {
    if (typeof record.actor_id !== 'string' || record.actor_id.trim().length === 0) {
      throw new RoleplayError('Character roleplay_consult requires actor_id', 'ROLEPLAY_INVALID_DATA')
    }
    return { role: record.role, task: record.task, actorId: record.actor_id }
  }
  if ('actor_id' in record) {
    throw new RoleplayError(`${record.role} roleplay_consult does not accept actor_id`, 'ROLEPLAY_INVALID_DATA')
  }
  return { role: record.role, task: record.task }
}

/** Parse the causal commit arguments and expand proposal references into their retained causes. */
function commitCallArguments(
  events: readonly SessionEvent[],
  index: number,
  call: Extract<SessionEvent, { type: 'tool/call' }>,
): {
  baseRevision: number
  narration: string
  causes: RoleplayCommitCause[]
} {
  let value: unknown
  try {
    value = JSON.parse(call.data.arguments)
  } catch {
    throw new RoleplayError('roleplay_commit arguments are not valid JSON', 'ROLEPLAY_INVALID_DATA')
  }
  const violations = validateArgs(ROLEPLAY_COMMIT_PARAMETERS, value)
  if (violations.length > 0) {
    throw new RoleplayError(
      `roleplay_commit arguments are invalid: ${violations.join('; ')}`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const args = value as RoleplayCommitArguments
  if (!Number.isSafeInteger(args.base_revision) || args.base_revision < 0) {
    throw new RoleplayError(
      'roleplay_commit base_revision must be a non-negative safe integer',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  if (args.narration.trim().length === 0) {
    throw new RoleplayError('roleplay_commit narration must be non-empty', 'ROLEPLAY_INVALID_DATA')
  }
  if (args.intents.length === 0) {
    throw new RoleplayError('roleplay_commit intents must be a non-empty array', 'ROLEPLAY_INVALID_DATA')
  }

  const baseRevision = args.base_revision
  const seenProposals = new Set<string>()
  const causes = args.intents.map((intent, intentIndex): RoleplayCommitCause => {
    if ('proposal_id' in intent) {
      if (intent.proposal_id.trim().length === 0) {
        throw new RoleplayError(
          `roleplay_commit intent ${intentIndex} proposal_id must be non-empty`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      if (seenProposals.has(intent.proposal_id)) {
        throw new RoleplayError(
          `roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is referenced more than once`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      seenProposals.add(intent.proposal_id)
      const proposalEvent = events.slice(0, index).findLast(candidate =>
        candidate.type === 'rp/proposal' && candidate.data.id === intent.proposal_id)
      if (proposalEvent?.type !== 'rp/proposal') {
        throw new RoleplayError(
          `roleplay_commit references unknown proposal ${JSON.stringify(intent.proposal_id)}`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      const proposal = decodeRoleplayProposal(proposalEvent.data)
      if (proposal.payload.role !== 'character') {
        throw new RoleplayError(
          `roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is advisory and cannot be committed`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      if (proposal.baseRevision !== baseRevision) {
        throw new RoleplayError(
          `roleplay_commit proposal ${JSON.stringify(intent.proposal_id)} is stale`,
          'ROLEPLAY_INVALID_DATA',
        )
      }
      return {
        actorId: proposal.payload.actorId,
        resolver: proposal.payload.resolver,
      }
    }

    if (intent.actor_id.trim().length === 0) {
      throw new RoleplayError(
        `roleplay_commit intent ${intentIndex} actor_id must be non-empty`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    if (intent.resolver.trim().length === 0) {
      throw new RoleplayError(
        `roleplay_commit intent ${intentIndex} resolver must be non-empty`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    return {
      actorId: intent.actor_id as RoleplayCommitCause['actorId'],
      resolver: intent.resolver as RoleplayCommitCause['resolver'],
    }
  })
  return { baseRevision, narration: args.narration, causes }
}

/** Validate one proposal against the exact Storyworld prefix that produced it. */
function validateProposalRelation(
  events: readonly SessionEvent[],
  index: number,
  seenIds: Set<string>,
): void {
  const event = events[index]
  if (event?.type !== 'rp/proposal') return
  const proposal = decodeRoleplayProposal(event.data)
  requireProposalText(proposal.id, 'roleplay proposal id')
  requireProposalText(proposal.callId, 'roleplay proposal call id')
  if (seenIds.has(proposal.id)) {
    throw new RoleplayError(
      `roleplay proposal id ${JSON.stringify(proposal.id)} is duplicated`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  seenIds.add(proposal.id)
  const call = events.slice(0, index).findLast(candidate =>
    candidate.type === 'tool/call' && candidate.data.callId === proposal.callId)
  if (call?.type !== 'tool/call' || call.data.name !== ROLEPLAY_CONSULT_TOOL) {
    throw new RoleplayError(
      'rp/proposal has no causal roleplay_consult tool/call',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const callArgs = proposalCallArguments(call)
  if (callArgs.role !== proposal.payload.role) {
    throw new RoleplayError(
      `rp/proposal role ${JSON.stringify(proposal.payload.role)} does not match its causal consultation`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const world = replayStoryworld(events.slice(0, index))
  if (world === undefined) {
    throw new RoleplayError('rp/proposal appeared before rp/seed', 'ROLEPLAY_NO_SEED')
  }
  if (proposal.baseRevision !== world.revision) {
    throw new RoleplayError(
      `rp/proposal base revision ${proposal.baseRevision} does not match ${world.revision}`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  if (!world.observers.some(observer => observer.id === proposal.observerId)) {
    throw new RoleplayError(
      `rp/proposal names unknown observer ${JSON.stringify(proposal.observerId)}`,
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const actorIds = new Set(world.actors.map(actor => String(actor.id)))
  const visibleFactIds = new Set(
    projectStoryworld(world, proposal.observerId).facts.map(fact => String(fact.id)),
  )
  const payload = proposal.payload
  switch (payload.role) {
    case 'character': {
      const actor = world.actors.find(candidate => candidate.id === payload.actorId)
      if (callArgs.actorId !== payload.actorId) {
        throw new RoleplayError(
          'character proposal actor does not match its causal consultation',
          'ROLEPLAY_INVALID_DATA',
        )
      }
      if (actor === undefined || actor.observerId !== proposal.observerId) {
        throw new RoleplayError(
          'character proposal observer does not own its actor',
          'ROLEPLAY_INVALID_DATA',
        )
      }
      requireProposalText(payload.resolver, 'character proposal resolver')
      requireProposalText(payload.resolverVersion, 'character proposal resolver version')
      break
    }
    case 'director':
      requireProposalText(payload.guidance, 'director proposal guidance')
      assertVisibleReferences(
        payload.focusActorIds,
        actorIds,
        'director focus actor id',
        'ROLEPLAY_INVALID_DATA',
      )
      break
    case 'continuity':
      for (const finding of payload.findings) {
        requireProposalText(finding.summary, 'continuity finding summary')
        assertVisibleReferences(finding.actorIds, actorIds, 'continuity actor id', 'ROLEPLAY_INVALID_DATA')
        assertVisibleReferences(finding.factIds, visibleFactIds, 'continuity fact id', 'ROLEPLAY_INVALID_DATA')
      }
      break
  }
}

/** Validate the durable provenance of one roleplay commit message. */
function validateCommitRelation(events: readonly SessionEvent[], index: number): void {
  const event = events[index]
  if (event?.type !== 'user/message' || event.data.source.kind !== 'roleplay') return
  const commit = decodeRoleplayCommit(event.data.source.commit)
  if (JSON.stringify(event.data.content) !== JSON.stringify(renderRoleplayCommitContext(commit))) {
    throw new RoleplayError('rp/commit message content does not match its canonical transaction', 'ROLEPLAY_INVALID_DATA')
  }
  if (commit.origin.kind === 'application') {
    const { source, sourceEventSeq } = commit.origin
    if (!/^[a-z][a-z0-9-]*$/.test(source)) {
      throw new RoleplayError(
        `rp/commit application source ${JSON.stringify(source)} must use lower-kebab-case`,
        'ROLEPLAY_INVALID_DATA',
      )
    }
    const sourceEvent = events[sourceEventSeq]
    if (sourceEvent === undefined || sourceEvent.seq !== sourceEventSeq || sourceEventSeq >= event.seq) {
      throw new RoleplayError('rp/commit application source event is absent or not prior', 'ROLEPLAY_INVALID_DATA')
    }
    if (!isDeepStrictEqual(event.sourceEventSeqs, [sourceEventSeq])) {
      throw new RoleplayError(
        'rp/commit application message provenance must name only its source event',
        'ROLEPLAY_INVALID_DATA',
      )
    }
    return
  }
  const callId = commit.origin.callId
  const result = events[index - 1]
  if (result?.type !== 'tool/result'
    || result.data.message.source.callId !== callId
    || result.data.message.content[0].isError) {
    throw new RoleplayError('rp/commit must immediately follow its successful causal tool/result', 'ROLEPLAY_INVALID_DATA')
  }
  if (JSON.stringify(result.data.message.content[0].content) !== JSON.stringify(renderRoleplayToolResult(commit))) {
    throw new RoleplayError('rp/commit does not match the canonical causal tool result', 'ROLEPLAY_INVALID_DATA')
  }
  const call = events.slice(0, index - 1).findLast(candidate =>
    candidate.type === 'tool/call'
      && candidate.data.callId === callId
      && candidate.data.turn === result.data.turn
      && candidate.data.step === result.data.step)
  if (call?.type !== 'tool/call' || call.data.name !== ROLEPLAY_COMMIT_TOOL) {
    throw new RoleplayError('rp/commit has no causal roleplay_commit tool/call in its step', 'ROLEPLAY_INVALID_DATA')
  }
  const callArguments = commitCallArguments(events, index, call)
  if (callArguments.baseRevision !== commit.baseRevision) {
    throw new RoleplayError(
      'rp/commit base revision does not match its causal roleplay_commit call',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  if (callArguments.narration !== commit.narration) {
    throw new RoleplayError(
      'rp/commit narration does not match its causal roleplay_commit call',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  if (!isDeepStrictEqual(callArguments.causes, commit.causes)) {
    throw new RoleplayError(
      'rp/commit causes do not match its causal roleplay_commit intents',
      'ROLEPLAY_INVALID_DATA',
    )
  }
  const assistant = events.slice(0, index - 1).findLast(candidate =>
    candidate.type === 'assistant/message'
      && candidate.data.turn === result.data.turn
      && candidate.data.step === result.data.step)
  const blocks = assistant?.type === 'assistant/message' ? assistant.data.message.content : []
  assertRoleplayCommitResponse(blocks, callId, ROLEPLAY_COMMIT_TOOL)
  const assistantCall = blocks.find(block =>
    block.type === 'tool-call'
      && block.id === callId
      && block.name === ROLEPLAY_COMMIT_TOOL)
  /* v8 ignore next -- assertRoleplayCommitResponse requires this exact call immediately above. */
  if (assistantCall?.type !== 'tool-call') throw new Error('roleplay commit response invariant violated')
  if (assistantCall.arguments !== call.data.arguments) {
    throw new RoleplayError(
      'roleplay_commit tool/call arguments do not match the committing assistant response',
      'ROLEPLAY_INVALID_DATA',
    )
  }
}

/**
 * Validate all roleplay records and reconstruct their final Storyworld.
 * @param events - complete Session prefix.
 * @returns the final reconstructed state, or `undefined` before `rp/seed`.
 */
export function validateRoleplayHistory(events: readonly SessionEvent[]): Storyworld | undefined {
  const proposalIds = new Set<string>()
  for (let index = 0; index < events.length; index += 1) {
    validateObserverRelation(events, index)
    validateCommitRelation(events, index)
    validateProposalRelation(events, index, proposalIds)
  }
  const world = replayStoryworld(events)
  if (world !== undefined && !events.some(event => event.type === 'rp/observer')) {
    throw new RoleplayError('roleplay Session has no rp/observer binding', 'ROLEPLAY_INVALID_DATA')
  }
  return world
}

/**
 * Read the durable observer identity after history validation.
 * @param events - validated roleplay Session history.
 * @returns the bound observer, or `undefined` before the initial seed.
 */
export function roleplaySessionObserver(events: readonly SessionEvent[]): RoleplayObserverId | undefined {
  const event = events.find(candidate => candidate.type === 'rp/observer')
  return event?.type === 'rp/observer' ? decodeRoleplayObserver(event.data).observerId : undefined
}

/**
 * Validate one candidate append against the exact live Session prefix.
 * @param session - Session that would own the event.
 * @param event - pre-commit candidate event.
 */
export function validateRoleplayAppend(session: Session, event: SessionEvent): void {
  if (!isRoleplayRecord(event)) return
  const events = [...session.events, event]
  const proposalIds = new Set<string>()
  for (const candidate of session.events) {
    if (candidate.type === 'rp/proposal') proposalIds.add(candidate.data.id)
  }
  const index = events.length - 1
  validateObserverRelation(events, index)
  validateCommitRelation(events, index)
  validateProposalRelation(events, index, proposalIds)
  replayStoryworld(events)
}
