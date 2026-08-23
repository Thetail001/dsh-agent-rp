/** Host-owned, content-free runtime facts shared by browser diagnostics and compatibility smoke. */

import type { CharacterRemoteResourceType } from '../character-library-protocol.ts'
import { CARD_RUNTIME_PHASES, type CardRuntimePhase } from './card-capability.ts'
import type { ExternalWindowPhase } from './external-window.ts'
import type { TavernScriptRuntimePhase } from './tavern-runtime.ts'
import type { TavernScriptTreeScope } from '../tavern-helper.ts'
import {
  parseAgentRpTurnHealthDiagnostic,
  type AgentRpTurnHealthDiagnostic,
} from '../roleplay-turn-health-protocol.ts'

type Counter = Readonly<Record<string, number>>

/** Opaque publisher identity retained only inside the Host registry. */
export type AgentRpRuntimeDiagnosticSource = symbol

/** Stable role-library preflight state without card, preset, script, or origin identity. */
export interface AgentRpRuntimePreflightFacts {
  readonly status: 'loading' | 'permission-required' | 'error' | 'ready' | 'unknown'
  readonly launch: 'checking' | 'approval-required' | 'ready' | 'unknown'
  readonly startReadiness?: 'checking' | 'approval-required' | 'ready' | 'unknown'
  readonly startAction?: 'checking' | 'approve-and-start' | 'start' | 'unknown'
  readonly permissionDuration: 'session' | 'remember' | 'trust' | 'unknown'
  readonly scripts: number
  readonly cardResources: number
  readonly pendingCardPermissions: number
  readonly pendingScriptPermissions: number
  readonly pendingScriptOrigins: number
  readonly pendingImageOrigins: number
  readonly pendingStyleOrigins: number
  readonly pendingFrameOrigins: number
  readonly pendingPermissions: number
  readonly failed: number
}

/** Stable facts owned by one mounted roleplay Session component. */
export interface AgentRpRuntimeSessionFacts {
  /** Host-derived lifecycle counts; optional while the same-origin request is in flight. */
  readonly turns?: AgentRpTurnHealthDiagnostic
  readonly capabilities: {
    readonly extensions: number
    readonly requirements: number
    readonly available: number
    readonly approvals: number
    readonly requiredUnavailable: number
    readonly unsupported: number
    readonly versionMismatch: number
    readonly denied: number
  }
  readonly auxiliaryGenerations: {
    readonly requests: number
    readonly succeeded: number
    readonly failed: number
    readonly pending: number
    readonly malformed: number
  }
  readonly externalWindowPhases: readonly ExternalWindowPhase[]
  readonly nativeIdentity: {
    readonly state: 'loading' | 'unconfigured' | 'ready' | 'error' | 'unknown'
    readonly approved: number
    readonly pending: number
  }
  readonly variables: {
    readonly surfaces: number
    readonly sharedScopes: number
    readonly scriptScopes: number
  }
  readonly renderer: {
    readonly inlineFrontendSanitizer: 'ready' | 'failed' | 'unknown'
  }
  readonly worldEngine: {
    readonly engine: 'inactive' | 'native-v0' | 'unknown'
    readonly entries: number
    readonly active: number
    readonly budgetExcluded: number
    readonly failures: {
      readonly regexRuntimeUnavailable: number
      readonly regexInvalid: number
      readonly regexExecutionLimit: number
      readonly regexResourceLimit: number
      readonly decoratorUnsupported: number
      readonly templateUnsupported: number
      readonly templateError: number
    }
  }
}

/** Stable facts owned by one mounted Tavern Helper runtime. */
export interface AgentRpRuntimeTavernFacts {
  readonly scripts: number
  readonly frames: number
  readonly ready: number
  readonly failed: number
  readonly pendingPermissions: number
  readonly startupPermissions: number
  readonly interactionPermissions: number
  readonly permissionState: 'settled' | 'startup-blocked' | 'interaction-pending' | 'unknown'
  readonly permissions: {
    readonly script: number
    readonly image: number
    readonly style: number
    readonly font: number
    readonly frame: number
    readonly identity: number
    readonly externalWindow: number
    readonly generation: number
    readonly customGeneration: number
    readonly modelList: number
  }
  readonly queuedGenerations: number
  readonly queuedModelLists: number
  readonly blockedResources: number
  readonly blockedResourceOrigins: number
  readonly blockedResourceClasses: readonly CharacterRemoteResourceType[]
  readonly phases: readonly TavernScriptRuntimePhase[]
  readonly scopes: readonly TavernScriptTreeScope[]
  readonly externalWindowPhases: readonly ExternalWindowPhase[]
  readonly nativeIdentityPending: number
}

/** Stable facts owned by one mounted light-frontend iframe. */
export interface AgentRpRuntimeCardFrameFacts {
  readonly scriptEnabled: boolean
  readonly registered: boolean
  readonly resized: boolean
  readonly runtimePhase?: CardRuntimePhase
  readonly resourceMonitor?: 'listener-installed' | 'document-open' | 'bootstrap-injected' | 'listener-restored'
  readonly blockedResourceClass?: CharacterRemoteResourceType
}

/** Aggregated Tavern state exposed without publisher or Session identity. */
export interface AgentRpRuntimeTavernSnapshot {
  readonly scripts: number
  readonly frames: number
  readonly ready: number
  readonly failed: number
  readonly pendingPermissions: number
  readonly startupPermissions: number
  readonly interactionPermissions: number
  readonly permissionState: AgentRpRuntimeTavernFacts['permissionState']
  readonly permissions: AgentRpRuntimeTavernFacts['permissions']
  readonly queuedGenerations: number
  readonly queuedModelLists: number
  readonly blockedResources: number
  readonly blockedResourceOrigins: number
  readonly blockedResourceClasses: Counter
  readonly phases: Counter
  readonly scopes: Counter
}

/** Aggregated light-frontend state exposed without frame tokens or DOM content. */
export interface AgentRpRuntimeCardFramesSnapshot {
  readonly total: number
  readonly scriptEnabled: number
  readonly inert: number
  readonly registered: number
  readonly resized: number
  readonly runtimePhases: Counter
  readonly resourceMonitors: Counter
  readonly blockedResourceClasses: Counter
}

/** Active mounted Session facts assembled from Host publishers. */
export interface AgentRpRuntimeSessionSnapshot extends Omit<AgentRpRuntimeSessionFacts, 'externalWindowPhases'> {
  readonly externalWindows: { readonly phases: Counter }
  readonly tavern?: AgentRpRuntimeTavernSnapshot
  readonly cardFrames: AgentRpRuntimeCardFramesSnapshot
}

/** Content-free Host runtime snapshot. Internal source keys and Session ids are never serialized. */
export interface AgentRpRuntimeDiagnosticSnapshot {
  readonly audit: 'agent-rp-runtime-v0'
  readonly revision: number
  readonly updatedAt: number
  readonly sources: {
    readonly preflight: number
    readonly sessions: number
    readonly tavern: number
    readonly cardFrames: number
  }
  readonly preflight?: AgentRpRuntimePreflightFacts
  readonly session?: AgentRpRuntimeSessionSnapshot
}

/** One Host publisher contribution. The scope value is used for joining and never leaves the registry. */
export type AgentRpRuntimeDiagnosticContribution =
  | { readonly kind: 'preflight'; readonly facts: AgentRpRuntimePreflightFacts }
  | { readonly kind: 'session'; readonly scope: string; readonly facts: AgentRpRuntimeSessionFacts }
  | { readonly kind: 'tavern'; readonly scope: string; readonly facts: AgentRpRuntimeTavernFacts }
  | { readonly kind: 'card-frame'; readonly scope: string; readonly facts: AgentRpRuntimeCardFrameFacts }

interface StoredContribution {
  readonly contribution: AgentRpRuntimeDiagnosticContribution
  readonly serialized: string
  readonly sequence: number
}

const externalWindowPhases = [
  'awaiting-user', 'external-opened', 'external-open-unconfirmed', 'callback-rejected', 'callback-validated',
  'callback-delivered', 'callback-delivery-unconfirmed', 'external-closed-without-callback', 'broker-closed',
] as const satisfies readonly ExternalWindowPhase[]

const tavernRuntimePhases = [
  'preparing', 'permission-required', 'load-error', 'booting', 'ready', 'runtime-error',
] as const satisfies readonly TavernScriptRuntimePhase[]

const tavernScopes = ['global', 'preset', 'character'] as const satisfies readonly TavernScriptTreeScope[]
const resourceMonitors = ['listener-installed', 'document-open', 'bootstrap-injected', 'listener-restored'] as const
const resourceClasses = ['connect', 'font', 'frame', 'image', 'media', 'script', 'style'] as const

function count(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? value as T[number] : fallback
}

function optionalOneOf<const T extends readonly string[]>(value: unknown, values: T): T[number] | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? value as T[number] : undefined
}

function filtered<const T extends readonly string[]>(value: readonly string[], values: T): readonly T[number][] {
  return value.filter((entry): entry is T[number] => (values as readonly string[]).includes(entry))
}

function counter(values: readonly string[], order: readonly string[]): Counter {
  const result: Record<string, number> = {}
  for (const key of order) {
    const total = values.filter(value => value === key).length
    if (total > 0) result[key] = total
  }
  return result
}

function addCounters(left: Counter, right: Counter): Counter {
  const result: Record<string, number> = { ...left }
  for (const [key, value] of Object.entries(right)) result[key] = (result[key] ?? 0) + value
  return result
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return Object.freeze(value)
}

function normalizePreflight(facts: AgentRpRuntimePreflightFacts): AgentRpRuntimePreflightFacts {
  return {
    status: oneOf(facts.status, ['loading', 'permission-required', 'error', 'ready', 'unknown'] as const, 'unknown'),
    launch: oneOf(facts.launch, ['checking', 'approval-required', 'ready', 'unknown'] as const, 'unknown'),
    ...(facts.startReadiness === undefined ? {} : {
      startReadiness: oneOf(facts.startReadiness, ['checking', 'approval-required', 'ready', 'unknown'] as const, 'unknown'),
    }),
    ...(facts.startAction === undefined ? {} : {
      startAction: oneOf(facts.startAction, ['checking', 'approve-and-start', 'start', 'unknown'] as const, 'unknown'),
    }),
    permissionDuration: oneOf(facts.permissionDuration, ['session', 'remember', 'trust', 'unknown'] as const, 'unknown'),
    scripts: count(facts.scripts),
    cardResources: count(facts.cardResources),
    pendingCardPermissions: count(facts.pendingCardPermissions),
    pendingScriptPermissions: count(facts.pendingScriptPermissions),
    pendingScriptOrigins: count(facts.pendingScriptOrigins),
    pendingImageOrigins: count(facts.pendingImageOrigins),
    pendingStyleOrigins: count(facts.pendingStyleOrigins),
    pendingFrameOrigins: count(facts.pendingFrameOrigins),
    pendingPermissions: count(facts.pendingPermissions),
    failed: count(facts.failed),
  }
}

function normalizeSession(facts: AgentRpRuntimeSessionFacts): AgentRpRuntimeSessionFacts {
  let turns: AgentRpTurnHealthDiagnostic | undefined
  if (facts.turns !== undefined) {
    try {
      turns = parseAgentRpTurnHealthDiagnostic(facts.turns)
    } catch {
      turns = { format: 0, status: 'invalid' }
    }
  }
  return {
    ...(turns === undefined ? {} : { turns }),
    capabilities: {
      extensions: count(facts.capabilities.extensions), requirements: count(facts.capabilities.requirements),
      available: count(facts.capabilities.available), approvals: count(facts.capabilities.approvals),
      requiredUnavailable: count(facts.capabilities.requiredUnavailable), unsupported: count(facts.capabilities.unsupported),
      versionMismatch: count(facts.capabilities.versionMismatch), denied: count(facts.capabilities.denied),
    },
    auxiliaryGenerations: {
      requests: count(facts.auxiliaryGenerations.requests), succeeded: count(facts.auxiliaryGenerations.succeeded),
      failed: count(facts.auxiliaryGenerations.failed), pending: count(facts.auxiliaryGenerations.pending),
      malformed: count(facts.auxiliaryGenerations.malformed),
    },
    externalWindowPhases: filtered(facts.externalWindowPhases, externalWindowPhases),
    nativeIdentity: {
      state: oneOf(facts.nativeIdentity.state, ['loading', 'unconfigured', 'ready', 'error', 'unknown'] as const, 'unknown'),
      approved: count(facts.nativeIdentity.approved), pending: count(facts.nativeIdentity.pending),
    },
    variables: {
      surfaces: count(facts.variables.surfaces), sharedScopes: count(facts.variables.sharedScopes),
      scriptScopes: count(facts.variables.scriptScopes),
    },
    renderer: {
      inlineFrontendSanitizer: oneOf(facts.renderer.inlineFrontendSanitizer, ['ready', 'failed', 'unknown'] as const, 'unknown'),
    },
    worldEngine: {
      engine: oneOf(facts.worldEngine.engine, ['inactive', 'native-v0', 'unknown'] as const, 'unknown'),
      entries: count(facts.worldEngine.entries), active: count(facts.worldEngine.active),
      budgetExcluded: count(facts.worldEngine.budgetExcluded),
      failures: {
        regexRuntimeUnavailable: count(facts.worldEngine.failures.regexRuntimeUnavailable),
        regexInvalid: count(facts.worldEngine.failures.regexInvalid),
        regexExecutionLimit: count(facts.worldEngine.failures.regexExecutionLimit),
        regexResourceLimit: count(facts.worldEngine.failures.regexResourceLimit),
        decoratorUnsupported: count(facts.worldEngine.failures.decoratorUnsupported),
        templateUnsupported: count(facts.worldEngine.failures.templateUnsupported),
        templateError: count(facts.worldEngine.failures.templateError),
      },
    },
  }
}

function normalizeTavern(facts: AgentRpRuntimeTavernFacts): AgentRpRuntimeTavernFacts {
  return {
    scripts: count(facts.scripts), frames: count(facts.frames), ready: count(facts.ready), failed: count(facts.failed),
    pendingPermissions: count(facts.pendingPermissions), startupPermissions: count(facts.startupPermissions),
    interactionPermissions: count(facts.interactionPermissions),
    permissionState: oneOf(
      facts.permissionState, ['settled', 'startup-blocked', 'interaction-pending', 'unknown'] as const, 'unknown',
    ),
    permissions: {
      script: count(facts.permissions.script), image: count(facts.permissions.image),
      style: count(facts.permissions.style), font: count(facts.permissions.font), frame: count(facts.permissions.frame),
      identity: count(facts.permissions.identity), externalWindow: count(facts.permissions.externalWindow),
      generation: count(facts.permissions.generation), customGeneration: count(facts.permissions.customGeneration),
      modelList: count(facts.permissions.modelList),
    },
    queuedGenerations: count(facts.queuedGenerations), queuedModelLists: count(facts.queuedModelLists),
    blockedResources: count(facts.blockedResources), blockedResourceOrigins: count(facts.blockedResourceOrigins),
    blockedResourceClasses: filtered(facts.blockedResourceClasses, resourceClasses),
    phases: filtered(facts.phases, tavernRuntimePhases), scopes: filtered(facts.scopes, tavernScopes),
    externalWindowPhases: filtered(facts.externalWindowPhases, externalWindowPhases),
    nativeIdentityPending: count(facts.nativeIdentityPending),
  }
}

function normalizeCardFrame(facts: AgentRpRuntimeCardFrameFacts): AgentRpRuntimeCardFrameFacts {
  const runtimePhase = optionalOneOf(facts.runtimePhase, CARD_RUNTIME_PHASES)
  const resourceMonitor = optionalOneOf(facts.resourceMonitor, resourceMonitors)
  const blockedResourceClass = optionalOneOf(facts.blockedResourceClass, resourceClasses)
  return {
    scriptEnabled: facts.scriptEnabled === true,
    registered: facts.registered === true,
    resized: facts.resized === true,
    ...(runtimePhase === undefined ? {} : { runtimePhase }),
    ...(resourceMonitor === undefined ? {} : { resourceMonitor }),
    ...(blockedResourceClass === undefined ? {} : { blockedResourceClass }),
  }
}

function normalizeContribution(
  contribution: AgentRpRuntimeDiagnosticContribution,
): AgentRpRuntimeDiagnosticContribution {
  switch (contribution.kind) {
    case 'preflight': return { kind: 'preflight', facts: normalizePreflight(contribution.facts) }
    case 'session': return { kind: 'session', scope: contribution.scope, facts: normalizeSession(contribution.facts) }
    case 'tavern': return { kind: 'tavern', scope: contribution.scope, facts: normalizeTavern(contribution.facts) }
    case 'card-frame': return { kind: 'card-frame', scope: contribution.scope, facts: normalizeCardFrame(contribution.facts) }
  }
}

function latest<T extends AgentRpRuntimeDiagnosticContribution['kind']>(
  contributions: Iterable<StoredContribution>,
  kind: T,
  scope?: string,
): Extract<AgentRpRuntimeDiagnosticContribution, { readonly kind: T }> | undefined {
  let selected: StoredContribution | undefined
  for (const entry of contributions) {
    if (entry.contribution.kind !== kind
      || (scope !== undefined && 'scope' in entry.contribution && entry.contribution.scope !== scope)) continue
    if (selected === undefined || entry.sequence > selected.sequence) selected = entry
  }
  return selected?.contribution as Extract<AgentRpRuntimeDiagnosticContribution, { readonly kind: T }> | undefined
}

/** Mutable Host registry whose snapshots contain only fixed enums, booleans, counters, and timestamps. */
export class AgentRpRuntimeDiagnosticRegistry {
  private readonly contributions = new Map<AgentRpRuntimeDiagnosticSource, StoredContribution>()
  private readonly listeners = new Set<() => void>()
  private revision = 0
  private sequence = 0
  private updatedAt: number

  constructor(private readonly now: () => number = Date.now) {
    this.updatedAt = now()
  }

  /** Publish one complete source value; equal normalized facts do not create a new revision. */
  publish(source: AgentRpRuntimeDiagnosticSource, contribution: AgentRpRuntimeDiagnosticContribution): void {
    const normalized = deepFreeze(normalizeContribution(contribution))
    const serialized = JSON.stringify(normalized)
    if (this.contributions.get(source)?.serialized === serialized) return
    this.sequence += 1
    this.contributions.set(source, { contribution: normalized, serialized, sequence: this.sequence })
    this.changed()
  }

  /** Remove one publisher and all facts it owned. */
  remove(source: AgentRpRuntimeDiagnosticSource): void {
    if (!this.contributions.delete(source)) return
    this.changed()
  }

  /** Subscribe to revision changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Return the latest preflight and mounted Session assembled without content-bearing identities. */
  snapshot(): AgentRpRuntimeDiagnosticSnapshot {
    const values = [...this.contributions.values()]
    const preflight = latest(values, 'preflight')?.facts
    const activeSession = latest(values, 'session')
    const activeScope = activeSession?.scope
    const tavern = activeScope === undefined ? undefined : latest(values, 'tavern', activeScope)?.facts
    const frames = activeScope === undefined ? [] : values.flatMap(entry =>
      entry.contribution.kind === 'card-frame' && entry.contribution.scope === activeScope
        ? [entry.contribution.facts] : [])
    const session = activeSession === undefined ? undefined : this.sessionSnapshot(activeSession.facts, tavern, frames)
    return {
      audit: 'agent-rp-runtime-v0', revision: this.revision, updatedAt: this.updatedAt,
      sources: {
        preflight: values.filter(entry => entry.contribution.kind === 'preflight').length,
        sessions: values.filter(entry => entry.contribution.kind === 'session').length,
        tavern: values.filter(entry => entry.contribution.kind === 'tavern').length,
        cardFrames: values.filter(entry => entry.contribution.kind === 'card-frame').length,
      },
      ...(preflight === undefined ? {} : { preflight }),
      ...(session === undefined ? {} : { session }),
    }
  }

  private changed(): void {
    this.revision += 1
    this.updatedAt = this.now()
    for (const listener of this.listeners) listener()
  }

  private sessionSnapshot(
    session: AgentRpRuntimeSessionFacts,
    tavern: AgentRpRuntimeTavernFacts | undefined,
    frames: readonly AgentRpRuntimeCardFrameFacts[],
  ): AgentRpRuntimeSessionSnapshot {
    const cardFrames: AgentRpRuntimeCardFramesSnapshot = {
      total: frames.length,
      scriptEnabled: frames.filter(frame => frame.scriptEnabled).length,
      inert: frames.filter(frame => !frame.scriptEnabled).length,
      registered: frames.filter(frame => frame.registered).length,
      resized: frames.filter(frame => frame.resized).length,
      runtimePhases: counter(frames.flatMap(frame => frame.runtimePhase === undefined ? [] : [frame.runtimePhase]), CARD_RUNTIME_PHASES),
      resourceMonitors: counter(frames.flatMap(frame => frame.resourceMonitor === undefined ? [] : [frame.resourceMonitor]), resourceMonitors),
      blockedResourceClasses: counter(frames.flatMap(frame => frame.blockedResourceClass === undefined ? [] : [frame.blockedResourceClass]), resourceClasses),
    }
    const sessionExternalWindows = counter(session.externalWindowPhases, externalWindowPhases)
    const tavernExternalWindows = counter(tavern?.externalWindowPhases ?? [], externalWindowPhases)
    return {
      ...(session.turns === undefined ? {} : { turns: session.turns }),
      capabilities: session.capabilities,
      auxiliaryGenerations: session.auxiliaryGenerations,
      externalWindows: { phases: addCounters(sessionExternalWindows, tavernExternalWindows) },
      nativeIdentity: {
        ...session.nativeIdentity,
        pending: session.nativeIdentity.pending + (tavern?.nativeIdentityPending ?? 0),
      },
      variables: session.variables,
      renderer: session.renderer,
      worldEngine: session.worldEngine,
      ...(tavern === undefined ? {} : { tavern: {
        scripts: tavern.scripts, frames: tavern.frames, ready: tavern.ready, failed: tavern.failed,
        pendingPermissions: tavern.pendingPermissions, startupPermissions: tavern.startupPermissions,
        interactionPermissions: tavern.interactionPermissions, permissionState: tavern.permissionState,
        permissions: tavern.permissions, queuedGenerations: tavern.queuedGenerations,
        queuedModelLists: tavern.queuedModelLists, blockedResources: tavern.blockedResources,
        blockedResourceOrigins: tavern.blockedResourceOrigins,
        blockedResourceClasses: counter(tavern.blockedResourceClasses, resourceClasses),
        phases: counter(tavern.phases, tavernRuntimePhases), scopes: counter(tavern.scopes, tavernScopes),
      } }),
      cardFrames,
    }
  }
}

declare global {
  interface Window {
    /** Return Host-owned content-free Agent RP runtime state. */
    __dshAgentRpRuntimeSnapshot?: () => AgentRpRuntimeDiagnosticSnapshot
  }
}

/** Create one publisher key that cannot be serialized into a report. */
export function createAgentRpRuntimeDiagnosticSource(label: string): AgentRpRuntimeDiagnosticSource {
  return Symbol(label)
}

/** Install the Host runtime snapshot function and restore any previous owner during plugin teardown. */
export function installAgentRpRuntimeDiagnostic(
  target: Window,
  registry: AgentRpRuntimeDiagnosticRegistry,
): () => void {
  const previous = target.__dshAgentRpRuntimeSnapshot
  const snapshot = (): AgentRpRuntimeDiagnosticSnapshot => registry.snapshot()
  target.__dshAgentRpRuntimeSnapshot = snapshot
  return () => {
    if (target.__dshAgentRpRuntimeSnapshot !== snapshot) return
    if (previous === undefined) delete target.__dshAgentRpRuntimeSnapshot
    else target.__dshAgentRpRuntimeSnapshot = previous
  }
}
