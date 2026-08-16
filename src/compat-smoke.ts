/** Content-free lifecycle protocol for deterministic Agent RP browser smoke runs. */

import type {
  AgentRpBrowserCompatibilitySnapshot,
} from './client/compatibility-diagnostic.ts'

/** Process results reserved by the compatibility smoke command. */
export const AGENT_RP_COMPAT_SMOKE_EXIT = {
  healthy: 0,
  manualRequired: 2,
  compatibilityFailure: 3,
  runnerFailure: 4,
} as const

/** Stable terminal stages emitted without card, prompt, URL, identity, or path data. */
export type AgentRpCompatSmokeStage =
  | 'healthy'
  | 'approval-required'
  | 'server-unreachable'
  | 'plugin-unavailable'
  | 'import-failed'
  | 'source-session-failed'
  | 'client-load-failed'
  | 'diagnostic-unavailable'
  | 'selection-failed'
  | 'preflight-checking'
  | 'preflight-failed'
  | 'session-launch-failed'
  | 'frame-unregistered'
  | 'frame-content-empty'
  | 'runtime-failed'
  | 'remote-pending'
  | 'remote-failed'
  | 'interaction-missing'
  | 'interaction-failed'
  | 'runner-failed'

/** Stable status category for command-line and CI consumers. */
export type AgentRpCompatSmokeStatus = 'healthy' | 'manual-required' | 'failed' | 'runner-error'

/** How an explicitly approved preflight grant is retained by the browser smoke. */
export type AgentRpCompatSmokePermissionDuration = 'session' | 'remember'

/** One terminal lifecycle decision. */
export interface AgentRpCompatSmokeDecision {
  readonly status: AgentRpCompatSmokeStatus
  readonly stage: AgentRpCompatSmokeStage
  readonly exitCode: 0 | 2 | 3 | 4
}

/** Content-free report printed by the browser smoke command. */
export interface AgentRpCompatSmokeReport extends AgentRpCompatSmokeDecision {
  readonly audit: 'agent-rp-compat-smoke-v0'
  readonly server: { readonly mode: 'external'; readonly reachable: boolean }
  readonly imports: {
    readonly card: 'created' | 'existing' | 'restored' | 'failed' | 'not-attempted'
    readonly preset: 'created' | 'existing' | 'failed' | 'not-requested' | 'not-attempted'
  }
  readonly browser: {
    readonly consoleErrors: number
    readonly consoleErrorKinds: Readonly<Record<AgentRpCompatSmokeConsoleErrorKind, number>>
    readonly pageErrors: number
    readonly failureScreenshot: boolean
  }
  readonly timingsMs: Readonly<Record<string, number>>
  readonly snapshot?: AgentRpBrowserCompatibilitySnapshot
}

/** Content-free categories retained for browser console errors. */
export type AgentRpCompatSmokeConsoleErrorKind = 'resource-load' | 'security-policy' | 'runtime'

/** Classify a browser console error without retaining its text, URL, or arguments. */
export function classifyAgentRpSmokeConsoleError(message: string): AgentRpCompatSmokeConsoleErrorKind {
  if (message.includes('Failed to load resource') || message.includes('net::ERR_')) return 'resource-load'
  if (message.includes('Content Security Policy') || message.includes('Refused to')
    || message.includes('blocked by CORS policy') || message.includes('Cross-Origin')) return 'security-policy'
  return 'runtime'
}

/** Stable browser actions used by the smoke driver. */
export type AgentRpCompatSmokeAction =
  | 'open-character-library'
  | 'close-character-library'
  | 'toggle-session-settings'
  | 'open-preset-manager'
  | 'close-preset-manager'
  | 'open-world-info-manager'
  | 'close-world-info-manager'
  | 'open-tavern-panel'
  | 'close-tavern-panel'
  | 'open-mobile-surface'

/** Browser operations required by the lifecycle runner. */
export interface AgentRpCompatSmokeDriver {
  readonly delay: (milliseconds: number) => Promise<void>
  readonly snapshot: () => Promise<AgentRpBrowserCompatibilitySnapshot | undefined>
  readonly sourceLauncherCount: (sourceSessionId?: string) => Promise<number>
  readonly clickAction: (action: AgentRpCompatSmokeAction, sourceSessionId?: string) => Promise<void>
  readonly selectCharacter: (characterId: string) => Promise<void>
  readonly selectPreset: (presetId: string) => Promise<void>
  readonly selectPermissionDuration: (duration: AgentRpCompatSmokePermissionDuration) => Promise<void>
  readonly startSession: () => Promise<void>
}

/** Input known only to the local driver; it never enters the report. */
export interface AgentRpCompatSmokeBrowserInput {
  readonly sourceSessionId?: string
  readonly characterId: string
  readonly presetId?: string
  readonly timeoutMs: number
  readonly pollMs?: number
  readonly waitForManualApproval?: boolean
  readonly approvePreflight?: boolean
  readonly permissionDuration?: AgentRpCompatSmokePermissionDuration
}

const healthyDecision: AgentRpCompatSmokeDecision = {
  status: 'healthy', stage: 'healthy', exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.healthy,
}

function manual(stage: 'approval-required'): AgentRpCompatSmokeDecision {
  return { status: 'manual-required', stage, exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.manualRequired }
}

function failed(stage: Exclude<AgentRpCompatSmokeStage,
  'healthy' | 'approval-required' | 'server-unreachable' | 'runner-failed'>): AgentRpCompatSmokeDecision {
  return { status: 'failed', stage, exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.compatibilityFailure }
}

/** Convert a setup failure into a content-free command decision. */
export function runnerFailure(
  stage: 'server-unreachable' | 'runner-failed',
): AgentRpCompatSmokeDecision {
  return { status: 'runner-error', stage, exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.runnerFailure }
}

type PollDecision = AgentRpCompatSmokeDecision | 'pending'

/** Classify one open-library preflight observation. */
export function classifyAgentRpPreflight(
  snapshot: AgentRpBrowserCompatibilitySnapshot | undefined,
  timedOut = false,
): PollDecision {
  if (snapshot === undefined) return timedOut ? failed('diagnostic-unavailable') : 'pending'
  const preflight = snapshot.preflight
  if (preflight === undefined) return timedOut ? failed('diagnostic-unavailable') : 'pending'
  if (!snapshot.checks.preflightConsistent || !snapshot.checks.preflightHealthy
    || preflight.status === 'error' || preflight.failed > 0) return failed('preflight-failed')
  if (preflight.pendingPermissions > 0 || preflight.status === 'permission-required'
    || preflight.launch === 'approval-required') return manual('approval-required')
  if (preflight.status === 'loading' || preflight.launch === 'checking') {
    return timedOut ? failed('preflight-checking') : 'pending'
  }
  if (preflight.status === 'ready' && preflight.launch === 'ready') return healthyDecision
  return failed('preflight-failed')
}

/** Classify one mounted-session observation. Transitional states remain pending until the caller's deadline. */
export function classifyAgentRpRuntime(
  snapshot: AgentRpBrowserCompatibilitySnapshot | undefined,
  timedOut = false,
): PollDecision {
  if (snapshot === undefined) return timedOut ? failed('diagnostic-unavailable') : 'pending'
  const session = snapshot.session
  if (session === undefined) return timedOut ? failed('diagnostic-unavailable') : 'pending'
  const issues = new Set(snapshot.issues)
  if (issues.has('external-window-callback-rejected')
    || issues.has('external-window-delivery-unconfirmed')
    || issues.has('external-window-closed-without-callback')) return failed('remote-failed')
  if (issues.has('external-window-open-unconfirmed')) {
    return timedOut ? failed('remote-pending') : 'pending'
  }
  if (session.nativeIdentity.pending > 0 || (session.tavern?.pendingPermissions ?? 0) > 0) {
    return manual('approval-required')
  }
  if (issues.has('card-frame-runtime-failed') || issues.has('tavern-runtime-failed')
    || issues.has('capability-required-unavailable') || issues.has('iframe-sandbox-expanded')
    || issues.has('inline-frontend-sanitizer-degraded') || issues.has('world-engine-degraded')
    || issues.has('tavern-permission-count-mismatch')) {
    return failed('runtime-failed')
  }
  if (issues.has('card-frame-content-empty')) {
    return timedOut ? failed('frame-content-empty') : 'pending'
  }
  if (issues.has('card-frame-unregistered')) {
    return timedOut ? failed('frame-unregistered') : 'pending'
  }
  const tavern = session.tavern
  if (tavern !== undefined && tavern.ready + tavern.failed < tavern.scripts) {
    return timedOut ? failed('runtime-failed') : 'pending'
  }
  if (session.auxiliaryGenerations.pending > 0) {
    return timedOut ? failed('remote-pending') : 'pending'
  }
  return healthyDecision
}

async function poll(
  driver: AgentRpCompatSmokeDriver,
  timeoutMs: number,
  pollMs: number,
  classify: (snapshot: AgentRpBrowserCompatibilitySnapshot | undefined, timedOut: boolean) => PollDecision,
  waitForManualApproval = false,
): Promise<{ readonly decision: AgentRpCompatSmokeDecision; readonly snapshot?: AgentRpBrowserCompatibilitySnapshot }> {
  const deadline = Date.now() + timeoutMs
  let snapshot = await driver.snapshot()
  while (true) {
    const decision = classify(snapshot, false)
    if (decision !== 'pending' && !(waitForManualApproval && decision.status === 'manual-required')) {
      return { decision, ...(snapshot === undefined ? {} : { snapshot }) }
    }
    if (Date.now() >= deadline) {
      const terminal = classify(snapshot, true)
      return {
        decision: terminal === 'pending' ? failed('runtime-failed') : terminal,
        ...(snapshot === undefined ? {} : { snapshot }),
      }
    }
    await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
    snapshot = await driver.snapshot()
  }
}

function surfaceState(snapshot: AgentRpBrowserCompatibilitySnapshot, action: AgentRpCompatSmokeAction): string {
  switch (action) {
    case 'open-character-library': case 'close-character-library': return snapshot.interactions.characterLibrary.state
    case 'toggle-session-settings': return snapshot.interactions.sessionSettings.state
    case 'open-preset-manager': case 'close-preset-manager': return snapshot.interactions.presetManager.state
    case 'open-world-info-manager': case 'close-world-info-manager': return snapshot.interactions.worldInfoManager.state
    case 'open-tavern-panel': case 'open-mobile-surface': case 'close-tavern-panel': return snapshot.interactions.tavernPanel.state
  }
}

async function waitForSurface(
  driver: AgentRpCompatSmokeDriver,
  action: AgentRpCompatSmokeAction,
  expected: string | readonly string[],
  timeoutMs: number,
  pollMs: number,
): Promise<AgentRpBrowserCompatibilitySnapshot | undefined> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    const snapshot = await driver.snapshot()
    if (snapshot !== undefined && (typeof expected === 'string'
      ? surfaceState(snapshot, action) === expected
      : expected.includes(surfaceState(snapshot, action)))) return snapshot
    if (Date.now() >= deadline) return snapshot
    await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
  }
}

async function exerciseInteraction(
  driver: AgentRpCompatSmokeDriver,
  open: AgentRpCompatSmokeAction,
  opened: string | readonly string[],
  close: AgentRpCompatSmokeAction,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  await driver.clickAction(open)
  const openedSnapshot = await waitForSurface(driver, open, opened, timeoutMs, pollMs)
  if (openedSnapshot === undefined || !(typeof opened === 'string'
    ? surfaceState(openedSnapshot, open) === opened
    : opened.includes(surfaceState(openedSnapshot, open)))) return false
  await driver.clickAction(close)
  const closed = await waitForSurface(driver, close, 'closed', timeoutMs, pollMs)
  return closed !== undefined && surfaceState(closed, close) === 'closed'
}

async function exerciseStableInteractions(
  driver: AgentRpCompatSmokeDriver,
  snapshot: AgentRpBrowserCompatibilitySnapshot,
  timeoutMs: number,
  pollMs: number,
): Promise<AgentRpCompatSmokeDecision> {
  if (!snapshot.checks.interactiveEntriesPresent) return failed('interaction-missing')
  try {
    if (!await exerciseInteraction(driver, 'open-character-library', 'open', 'close-character-library', timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    await driver.clickAction('toggle-session-settings')
    const settingsForPreset = await waitForSurface(driver, 'toggle-session-settings', 'open', timeoutMs, pollMs)
    if (settingsForPreset === undefined || settingsForPreset.interactions.sessionSettings.state !== 'open') {
      return failed('interaction-failed')
    }
    if (!await exerciseInteraction(driver, 'open-preset-manager', 'open', 'close-preset-manager', timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    await driver.clickAction('toggle-session-settings')
    const settingsForWorldInfo = await waitForSurface(driver, 'toggle-session-settings', 'open', timeoutMs, pollMs)
    if (settingsForWorldInfo === undefined || settingsForWorldInfo.interactions.sessionSettings.state !== 'open') {
      return failed('interaction-failed')
    }
    if (!await exerciseInteraction(driver, 'open-world-info-manager', 'open', 'close-world-info-manager', timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    if ((snapshot.session?.tavern?.scripts ?? 0) > 0
      && !await exerciseInteraction(driver, 'open-tavern-panel', ['script', 'mobile'], 'close-tavern-panel', timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    if (snapshot.interactions.tavernPanel.mobileLaunchers > 0
      && !await exerciseInteraction(driver, 'open-mobile-surface', 'mobile', 'close-tavern-panel', timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    return healthyDecision
  } catch {
    return failed('interaction-failed')
  }
}

/** Drive one already-created blank Session through card selection, launch, runtime settle, and stable UI entries. */
export async function runAgentRpBrowserCompatibilitySmoke(
  driver: AgentRpCompatSmokeDriver,
  input: AgentRpCompatSmokeBrowserInput,
): Promise<{ readonly decision: AgentRpCompatSmokeDecision; readonly snapshot?: AgentRpBrowserCompatibilitySnapshot }> {
  const pollMs = input.pollMs ?? 100
  const launcherDeadline = Date.now() + input.timeoutMs
  while (await driver.sourceLauncherCount(input.sourceSessionId) === 0) {
    if (Date.now() >= launcherDeadline) return { decision: failed('client-load-failed') }
    await driver.delay(Math.min(pollMs, Math.max(1, launcherDeadline - Date.now())))
  }
  try {
    await driver.clickAction('open-character-library', input.sourceSessionId)
    const library = await waitForSurface(
      driver, 'open-character-library', 'open', input.timeoutMs, pollMs,
    )
    if (library === undefined || library.interactions.characterLibrary.state !== 'open') {
      return { decision: failed('selection-failed'), ...(library === undefined ? {} : { snapshot: library }) }
    }
    await driver.selectCharacter(input.characterId)
    if (input.presetId !== undefined) await driver.selectPreset(input.presetId)
  } catch {
    return { decision: failed('selection-failed') }
  }

  const preflight = await poll(
    driver, input.timeoutMs, pollMs, classifyAgentRpPreflight,
    input.approvePreflight ? false : input.waitForManualApproval,
  )
  let launched = false
  if (input.approvePreflight && preflight.decision.status === 'manual-required') {
    try {
      await driver.selectPermissionDuration(input.permissionDuration ?? 'session')
      await driver.startSession()
      launched = true
    } catch {
      return { decision: failed('session-launch-failed'), ...(preflight.snapshot === undefined ? {} : { snapshot: preflight.snapshot }) }
    }
  }
  if (!launched) {
    if (preflight.decision.status !== 'healthy') return preflight
    try {
      await driver.startSession()
    } catch {
      return { decision: failed('session-launch-failed'), ...(preflight.snapshot === undefined ? {} : { snapshot: preflight.snapshot }) }
    }
  }
  const runtime = await poll(
    driver, input.timeoutMs, pollMs, classifyAgentRpRuntime, input.waitForManualApproval,
  )
  if (runtime.decision.status !== 'healthy' || runtime.snapshot === undefined) return runtime
  const interaction = await exerciseStableInteractions(
    driver, runtime.snapshot, input.timeoutMs, pollMs,
  )
  const finalSnapshot = await driver.snapshot()
  return { decision: interaction, ...(finalSnapshot === undefined ? { snapshot: runtime.snapshot } : { snapshot: finalSnapshot }) }
}
