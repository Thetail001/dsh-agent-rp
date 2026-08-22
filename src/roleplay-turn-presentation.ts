/** Replayable selection of the visible reply and state presented for one Roleplay turn. */

import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { decodeGenerationState, type GenerationStateRecord } from './generation.ts'
import type { BoundRoleplayTurnPlan } from './roleplay-turn-settlement.ts'
import type {
  RoleplayPresentModuleOutcome,
  RoleplayTurnPresentation,
} from './roleplay-turn-presentation-types.ts'
import {
  decodeTavernHelperState,
  readTavernHelperStateSnapshot,
  type TavernHelperStateSnapshot,
} from './tavern-helper.ts'

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Informational Roleplay presentation; all selected state remains reconstructable without it. */
    'agent-rp/turn-presentation': RoleplayTurnPresentation
  }
}

export type {
  RoleplayPresentModuleOutcome,
  RoleplayPresentationTrigger,
  RoleplayTurnPresentation,
} from './roleplay-turn-presentation-types.ts'

function eventAt(
  events: readonly SessionEvent[],
  seq: number,
): SessionEvent | undefined {
  return events.find(event => event.seq === seq)
}

function assistantAt(
  events: readonly SessionEvent[],
  seq: number,
): Extract<SessionEvent, { type: 'assistant/message' }> {
  const event = eventAt(events, seq)
  if (event?.type !== 'assistant/message') throw new Error('Roleplay presentation references a missing reply')
  return event
}

function latestVisibleAssistantSeq(session: Session): number | undefined {
  for (const seq of [...session.surface.nodes].reverse()) {
    const event = eventAt(session.events, seq)
    if (event?.type !== 'assistant/message') continue
    const text = event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
    if (text.trim() !== '') return seq
  }
  return undefined
}

function presentModuleIds(plans: readonly BoundRoleplayTurnPlan[]): readonly string[] {
  const ids = new Set<string>()
  for (const { plan } of plans) {
    for (const module of plan.runtime.modules) {
      if (module.phases.includes('present')) ids.add(module.id)
    }
  }
  return [...ids]
}

function initialModuleOutcomes(
  moduleIds: readonly string[],
  hasReply: boolean,
  tavernStatus: RoleplayTurnPresentation['state']['tavernStatus'],
): readonly RoleplayPresentModuleOutcome[] {
  return moduleIds.map((moduleId): RoleplayPresentModuleOutcome => {
    if (moduleId === 'adapter:tavern-helper') {
      if (!hasReply) return { moduleId, outcome: 'idle', changes: 0 }
      if (tavernStatus === 'pending') return { moduleId, outcome: 'pending', changes: 0 }
      if (tavernStatus === 'attached') return { moduleId, outcome: 'attached', changes: 1 }
      return { moduleId, outcome: tavernStatus === 'settled' ? 'applied' : 'idle', changes: 0 }
    }
    return { moduleId, outcome: hasReply ? 'applied' : 'idle', changes: hasReply ? 1 : 0 }
  })
}

function causalTavernState(
  events: readonly SessionEvent[],
  replySeq: number,
  beforeSeq = Number.POSITIVE_INFINITY,
): TavernHelperStateSnapshot | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event === undefined || event.seq >= beforeSeq) continue
    if (event.type === 'agent-rp/tavern-state-attachment') {
      if (event.data.cause.replySeq === replySeq) return { eventSeq: event.seq, state: event.data.state }
      continue
    }
    if (event.type !== 'command/done' || event.data.kind !== 'success') continue
    const state = decodeTavernHelperState(event.data.text)
    if (state?.lastMutation?.cause?.replySeq === replySeq) return { eventSeq: event.seq, state }
  }
  return undefined
}

function settlementEventAt(
  events: readonly SessionEvent[],
  seq: number,
): Extract<SessionEvent, { type: 'agent-rp/turn-settlement' }> {
  const event = eventAt(events, seq)
  if (event?.type !== 'agent-rp/turn-settlement') {
    throw new Error('Roleplay presentation references a missing settlement')
  }
  return event
}

/** Compile the first present-phase snapshot from a completed turn settlement. */
export function compileInitialRoleplayTurnPresentation(input: {
  readonly session: Session
  readonly settlementEvent: Extract<SessionEvent, { type: 'agent-rp/turn-settlement' }>
  readonly plans: readonly BoundRoleplayTurnPlan[]
}): RoleplayTurnPresentation {
  const { session, settlementEvent, plans } = input
  const settlement = settlementEvent.data
  if (settlement.sessionId !== String(session.id)) throw new Error('Roleplay settlement belongs to another Session')
  const reply = settlement.reply === undefined ? undefined : assistantAt(session.events, settlement.reply.eventSeq)
  if (reply !== undefined && String(reply.data.message.id) !== settlement.reply?.messageId) {
    throw new Error('Roleplay settlement reply identity changed')
  }
  const causalTavern = reply === undefined
    ? undefined
    : causalTavernState(session.events, reply.seq, settlementEvent.seq)
  const baselineTavern = causalTavern ?? readTavernHelperStateSnapshot(session.events, settlementEvent.seq)
  const deferred = settlement.settle.modules.some(module =>
    module.moduleId === 'adapter:tavern-helper' && module.outcome === 'deferred')
  const tavernStatus: RoleplayTurnPresentation['state']['tavernStatus'] = causalTavern !== undefined
    ? 'attached'
    : deferred && reply !== undefined ? 'pending'
      : baselineTavern === undefined ? 'absent' : 'settled'
  const hasMvu = settlement.state.some(state => state.id === 'state:mvu'
    && state.outcome !== 'removed' && state.outcome !== 'failed')
  return {
    format: 0,
    sessionId: String(session.id),
    turn: settlement.turn,
    settlementSeq: settlementEvent.seq,
    trigger: { kind: 'settlement', eventSeq: settlementEvent.seq },
    current: reply !== undefined && latestVisibleAssistantSeq(session) === reply.seq,
    ...(reply === undefined ? {} : {
      selectedReply: {
        sourceSeq: reply.seq,
        surfaceSeq: reply.seq,
        messageId: String(reply.data.message.id),
      },
    }),
    state: {
      ...(hasMvu ? { mvuStateSeq: settlementEvent.seq } : {}),
      ...(baselineTavern === undefined ? {} : { tavernStateSeq: baselineTavern.eventSeq }),
      tavernStatus,
    },
    present: {
      modules: initialModuleOutcomes(presentModuleIds(plans), reply !== undefined, tavernStatus),
    },
  }
}

/** Fold every presentation snapshot in chronological order. */
export function readRoleplayTurnPresentations(
  events: readonly SessionEvent[],
): readonly RoleplayTurnPresentation[] {
  return events.flatMap(event => event.type === 'agent-rp/turn-presentation' ? [event.data] : [])
}

/** Latest snapshot that selected the then-current visible assistant reply. */
export function readCurrentRoleplayTurnPresentation(
  events: readonly SessionEvent[],
): RoleplayTurnPresentation | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'agent-rp/turn-presentation' && event.data.current) return event.data
  }
  return undefined
}

function latestPresentationForReply(
  events: readonly SessionEvent[],
  replySeq: number,
): RoleplayTurnPresentation | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'agent-rp/turn-presentation'
      && (event.data.selectedReply?.sourceSeq === replySeq
        || event.data.selectedReply?.surfaceSeq === replySeq)) return event.data
  }
  return undefined
}

function updatedModules(
  modules: readonly RoleplayPresentModuleOutcome[],
  module: RoleplayPresentModuleOutcome,
): readonly RoleplayPresentModuleOutcome[] {
  return modules.some(candidate => candidate.moduleId === module.moduleId)
    ? modules.map(candidate => candidate.moduleId === module.moduleId ? module : candidate)
    : [...modules, module]
}

function selectedGenerationVersion(
  generation: GenerationStateRecord,
): GenerationStateRecord['versions'][number] {
  const selected = generation.versions.find(version => version.seq === generation.selectedVersionSeq)
  if (selected === undefined) throw new Error('Roleplay reply version has no selected reply')
  return selected
}

function presentationForGeneration(
  session: Session,
  event: Extract<SessionEvent, { type: 'command/done' }>,
  generation: GenerationStateRecord,
): RoleplayTurnPresentation | undefined {
  const baseline = latestPresentationForReply(session.events, generation.anchorSeq)
  if (baseline === undefined) return undefined
  settlementEventAt(session.events, baseline.settlementSeq)
  selectedGenerationVersion(generation)
  const source = assistantAt(session.events, generation.selectedVersionSeq)
  const surface = assistantAt(session.events, generation.surfaceSeq)
  const tavern = readTavernHelperStateSnapshot(session.events, event.seq)
  const tavernStatus = tavern === undefined ? 'absent' as const : 'attached' as const
  return {
    format: 0,
    sessionId: String(session.id),
    turn: baseline.turn,
    settlementSeq: baseline.settlementSeq,
    trigger: { kind: 'reply-version', eventSeq: event.seq },
    current: latestVisibleAssistantSeq(session) === surface.seq,
    selectedReply: {
      sourceSeq: source.seq,
      surfaceSeq: surface.seq,
      messageId: String(surface.data.message.id),
    },
    state: {
      ...(generation.mvu === undefined ? {} : { mvuStateSeq: event.seq }),
      ...(tavern === undefined ? {} : { tavernStateSeq: tavern.eventSeq }),
      tavernStatus,
    },
    version: {
      groupId: generation.groupId,
      anchorSeq: generation.anchorSeq,
      selectedVersionSeq: generation.selectedVersionSeq,
    },
    present: {
      modules: updatedModules(
        updatedModules(baseline.present.modules, {
          moduleId: 'roleplay:reply-versions', outcome: 'applied', changes: 1,
        }),
        {
          moduleId: 'adapter:tavern-helper',
          outcome: tavern === undefined ? 'idle' : 'attached',
          changes: tavern === undefined ? 0 : 1,
        },
      ),
    },
  }
}

function presentationForTavernMutation(
  session: Session,
  event: Extract<SessionEvent, { type: 'command/done' | 'agent-rp/tavern-state-attachment' }>,
): RoleplayTurnPresentation | undefined {
  const tavern = event.type === 'agent-rp/tavern-state-attachment'
    ? event.data.state
    : decodeTavernHelperState(event.data.text)
  const cause = event.type === 'agent-rp/tavern-state-attachment'
    ? event.data.cause
    : tavern?.lastMutation?.cause
  if (tavern === undefined || cause === undefined || cause.sessionId !== String(session.id)) return undefined
  assistantAt(session.events, cause.replySeq)
  const baseline = latestPresentationForReply(session.events, cause.replySeq)
  if (baseline?.selectedReply === undefined) return undefined
  settlementEventAt(session.events, baseline.settlementSeq)
  const mvuChanged = (tavern.lastMutation?.scope === 'message' || tavern.lastMutation?.scope === 'chat')
    && typeof tavern.scopes[tavern.lastMutation.scope].stat_data === 'object'
    && tavern.scopes[tavern.lastMutation.scope].stat_data !== null
    && !Array.isArray(tavern.scopes[tavern.lastMutation.scope].stat_data)
  return {
    ...baseline,
    trigger: { kind: 'tavern-mutation', eventSeq: event.seq },
    current: latestVisibleAssistantSeq(session) === baseline.selectedReply.surfaceSeq,
    state: {
      ...(baseline.state.mvuStateSeq === undefined && !mvuChanged
        ? {}
        : { mvuStateSeq: mvuChanged ? event.seq : baseline.state.mvuStateSeq }),
      tavernStateSeq: event.seq,
      tavernStatus: 'attached',
    },
    present: {
      modules: updatedModules(baseline.present.modules, {
        moduleId: 'adapter:tavern-helper', outcome: 'attached', changes: 1,
      }),
    },
  }
}

/** Compile a follow-up presentation from one reply-version or causal Tavern command result. */
export function compileRoleplayTurnPresentationUpdate(
  session: Session,
  event: Extract<SessionEvent, { type: 'command/done' | 'agent-rp/tavern-state-attachment' }>,
): RoleplayTurnPresentation | undefined {
  if (event.type === 'agent-rp/tavern-state-attachment') {
    return presentationForTavernMutation(session, event)
  }
  if (event.data.kind !== 'success') return undefined
  const generation = decodeGenerationState(event.data.text)
  return generation === undefined
    ? presentationForTavernMutation(session, event)
    : presentationForGeneration(session, event, generation)
}

/** Append one idempotent presentation snapshot through the Host's ignorable-event seam. */
export function appendRoleplayTurnPresentation(
  session: Session,
  presentation: RoleplayTurnPresentation,
): SessionEvent<'agent-rp/turn-presentation'> {
  if (presentation.sessionId !== String(session.id)) throw new Error('Roleplay presentation belongs to another Session')
  const existing = session.events.find(event => event.type === 'agent-rp/turn-presentation'
    && event.data.trigger.kind === presentation.trigger.kind
    && event.data.trigger.eventSeq === presentation.trigger.eventSeq)
  if (existing?.type === 'agent-rp/turn-presentation') return existing
  const appendIgnorable = (session as Session & {
    appendIgnorable?: (type: 'agent-rp/turn-presentation', data: RoleplayTurnPresentation) =>
      SessionEvent<'agent-rp/turn-presentation'>
  }).appendIgnorable
  if (typeof appendIgnorable === 'function') {
    return appendIgnorable.call(session, 'agent-rp/turn-presentation', presentation)
  }
  return session.append('agent-rp/turn-presentation', presentation)
}
