import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRpRuntimeDiagnosticRegistry,
  createAgentRpRuntimeDiagnosticSource,
  installAgentRpRuntimeDiagnostic,
  type AgentRpRuntimeDiagnosticContribution,
  type AgentRpRuntimeSessionFacts,
} from '../src/client/runtime-diagnostic.ts'

const sessionFacts: AgentRpRuntimeSessionFacts = {
  turns: {
    format: 0,
    status: 'ready',
    health: {
      audit: 'agent-rp-turn-health-v0', turns: 1,
      statuses: { open: 0, awaitingSettlement: 0, awaitingPresentation: 0, complete: 1 },
      latest: {
        turn: 1, status: 'complete', finalizableFromLog: true,
        worldRecall: {
          steps: 1, outcomes: { applied: 1, idle: 0, degraded: 0 }, contributions: 14,
        },
        phases: {
          plannedSteps: 1, preparedSteps: 1, recalledSteps: 1, actedSteps: 1,
          assistantMessages: 1, toolCalls: 0, toolResults: 0, settled: true, presented: true,
        },
      },
    },
  },
  capabilities: {
    extensions: 4, requirements: 13, available: 13, approvals: 0,
    requiredUnavailable: 0, unsupported: 0, versionMismatch: 0, denied: 0,
  },
  auxiliaryGenerations: { requests: 2, succeeded: 1, failed: 0, pending: 1, malformed: 0 },
  externalWindowPhases: ['callback-delivered'],
  nativeIdentity: { state: 'ready', approved: 2, pending: 1 },
  variables: { surfaces: 2, sharedScopes: 5, scriptScopes: 1 },
  renderer: { inlineFrontendSanitizer: 'ready' },
  worldEngine: {
    engine: 'native-v0', entries: 611, active: 14, budgetExcluded: 21,
    failures: {
      regexRuntimeUnavailable: 0, regexInvalid: 0, regexExecutionLimit: 0, regexResourceLimit: 0,
      decoratorUnsupported: 0, templateUnsupported: 0, templateError: 0,
    },
  },
}

test('assembles multiple Host publishers without serializing their scope or extra content', () => {
  let time = 100
  const registry = new AgentRpRuntimeDiagnosticRegistry(() => ++time)
  const session = createAgentRpRuntimeDiagnosticSource('session')
  const tavern = createAgentRpRuntimeDiagnosticSource('tavern')
  const firstFrame = createAgentRpRuntimeDiagnosticSource('card-frame')
  const secondFrame = createAgentRpRuntimeDiagnosticSource('card-frame')
  const preflight = createAgentRpRuntimeDiagnosticSource('preflight')
  let notifications = 0
  const unsubscribe = registry.subscribe(() => { notifications += 1 })

  registry.publish(session, {
    kind: 'session', scope: 'private-session-id',
    facts: {
      ...sessionFacts,
      turns: sessionFacts.turns?.status !== 'ready' ? sessionFacts.turns : {
        ...sessionFacts.turns,
        health: { ...sessionFacts.turns.health, privateTurnText: 'must not appear' },
      },
      privateCardText: 'must not appear',
    },
  } as AgentRpRuntimeDiagnosticContribution)
  registry.publish(tavern, {
    kind: 'tavern', scope: 'private-session-id',
    facts: {
      scripts: 2, frames: 2, ready: 2, failed: 0,
      pendingPermissions: 1, startupPermissions: 1, interactionPermissions: 0,
      permissionState: 'startup-blocked',
      permissions: {
        script: 0, image: 0, style: 0, font: 0, frame: 1, identity: 0, externalWindow: 0,
        generation: 0, customGeneration: 0, modelList: 0,
      },
      queuedGenerations: 0, queuedModelLists: 0,
      blockedResources: 2, blockedResourceOrigins: 1, blockedResourceClasses: ['style', 'style'],
      phases: ['ready', 'ready'], scopes: ['character', 'preset'],
      externalWindowPhases: ['external-opened'], nativeIdentityPending: 2,
      scriptName: 'must not appear',
    },
  } as AgentRpRuntimeDiagnosticContribution)
  registry.publish(firstFrame, {
    kind: 'card-frame', scope: 'private-session-id',
    facts: {
      scriptEnabled: true, registered: true, resized: true,
      runtimePhase: 'content-present', resourceMonitor: 'listener-restored',
      privateUrl: 'https://private.example/must-not-appear',
    },
  } as AgentRpRuntimeDiagnosticContribution)
  registry.publish(secondFrame, {
    kind: 'card-frame', scope: 'private-session-id',
    facts: {
      scriptEnabled: false, registered: true, resized: false, blockedResourceClass: 'image',
    },
  })
  registry.publish(preflight, {
    kind: 'preflight',
    facts: {
      status: 'permission-required', launch: 'approval-required', startReadiness: 'approval-required',
      startAction: 'approve-and-start', permissionDuration: 'trust', scripts: 2, cardResources: 7,
      pendingCardPermissions: 1, pendingScriptPermissions: 1, pendingScriptOrigins: 0,
      pendingImageOrigins: 0, pendingStyleOrigins: 0, pendingFrameOrigins: 1, pendingPermissions: 2, failed: 0,
    },
  })

  const snapshot = registry.snapshot()
  assert.equal(snapshot.audit, 'agent-rp-runtime-v0')
  assert.equal(snapshot.revision, 5)
  assert.equal(notifications, 5)
  assert.deepEqual(snapshot.sources, { preflight: 1, sessions: 1, tavern: 1, cardFrames: 2 })
  assert.deepEqual(snapshot.session?.externalWindows.phases, {
    'external-opened': 1, 'callback-delivered': 1,
  })
  assert.deepEqual(snapshot.session?.nativeIdentity, { state: 'ready', approved: 2, pending: 3 })
  assert.deepEqual(snapshot.session?.tavern?.phases, { ready: 2 })
  assert.deepEqual(snapshot.session?.tavern?.scopes, { preset: 1, character: 1 })
  assert.equal(snapshot.session?.tavern?.blockedResources, 2)
  assert.equal(snapshot.session?.tavern?.blockedResourceOrigins, 1)
  assert.equal(snapshot.session?.turns?.status, 'ready')
  assert.deepEqual(snapshot.session?.turns?.status === 'ready'
    ? snapshot.session.turns.health.latest?.worldRecall : undefined, {
    steps: 1, outcomes: { applied: 1, idle: 0, degraded: 0 }, contributions: 14,
  })
  assert.deepEqual(snapshot.session?.tavern?.blockedResourceClasses, { style: 2 })
  assert.deepEqual(snapshot.session?.cardFrames, {
    total: 2, scriptEnabled: 1, inert: 1, registered: 2, resized: 1,
    runtimePhases: { 'content-present': 1 }, resourceMonitors: { 'listener-restored': 1 },
    blockedResourceClasses: { image: 1 },
  })
  assert.equal(snapshot.preflight?.permissionDuration, 'trust')
  assert.doesNotMatch(JSON.stringify(snapshot), /private|example|must not appear|session-id|scriptName/u)

  registry.publish(session, { kind: 'session', scope: 'private-session-id', facts: sessionFacts })
  assert.equal(registry.snapshot().revision, 5)
  assert.equal(notifications, 5)
  unsubscribe()
})

test('selects the latest mounted Session and never inherits facts from another scope', () => {
  const registry = new AgentRpRuntimeDiagnosticRegistry(() => 1)
  const firstSession = createAgentRpRuntimeDiagnosticSource('session')
  const firstFrame = createAgentRpRuntimeDiagnosticSource('frame')
  const secondSession = createAgentRpRuntimeDiagnosticSource('session')

  registry.publish(firstSession, { kind: 'session', scope: 'first-private-id', facts: sessionFacts })
  registry.publish(firstFrame, {
    kind: 'card-frame', scope: 'first-private-id',
    facts: { scriptEnabled: true, registered: true, resized: true, runtimePhase: 'content-present' },
  })
  assert.equal(registry.snapshot().session?.cardFrames.total, 1)

  registry.publish(secondSession, {
    kind: 'session', scope: 'second-private-id',
    facts: {
      ...sessionFacts,
      worldEngine: { ...sessionFacts.worldEngine, engine: 'inactive', entries: 0, active: 0 },
    },
  })
  const second = registry.snapshot()
  assert.equal(second.session?.worldEngine.engine, 'inactive')
  assert.equal(second.session?.cardFrames.total, 0)
  assert.equal(second.session?.tavern, undefined)

  registry.remove(secondSession)
  assert.equal(registry.snapshot().session?.cardFrames.total, 1)
  registry.remove(firstFrame)
  assert.equal(registry.snapshot().session?.cardFrames.total, 0)
  registry.remove(firstSession)
  assert.equal(registry.snapshot().session, undefined)
})

test('normalizes invalid runtime values and restores a previous global snapshot owner', () => {
  const registry = new AgentRpRuntimeDiagnosticRegistry(() => 1)
  const source = createAgentRpRuntimeDiagnosticSource('session')
  registry.publish(source, {
    kind: 'session', scope: 'private',
    facts: {
      ...sessionFacts,
      capabilities: { ...sessionFacts.capabilities, requirements: -2 },
      externalWindowPhases: ['not-a-phase'],
      renderer: { inlineFrontendSanitizer: 'private-card-name' },
    },
  } as unknown as AgentRpRuntimeDiagnosticContribution)
  const snapshot = registry.snapshot()
  assert.equal(snapshot.session?.capabilities.requirements, 0)
  assert.deepEqual(snapshot.session?.externalWindows.phases, {})
  assert.equal(snapshot.session?.renderer.inlineFrontendSanitizer, 'unknown')
  assert.doesNotMatch(JSON.stringify(snapshot), /not-a-phase|private-card-name/u)

  const previous = () => ({ previous: true })
  const target = { __dshAgentRpRuntimeSnapshot: previous } as unknown as Window
  const dispose = installAgentRpRuntimeDiagnostic(target, registry)
  assert.equal(target.__dshAgentRpRuntimeSnapshot?.().revision, snapshot.revision)
  dispose()
  assert.equal(target.__dshAgentRpRuntimeSnapshot, previous)
})
