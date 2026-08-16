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
  | 'onboarding-required'
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
    readonly consoleErrorsByPhase: Readonly<Record<
      AgentRpCompatSmokeConsolePhase,
      Readonly<Record<AgentRpCompatSmokeConsoleErrorKind, number>>
    >>
    readonly securityPolicyReasons: Readonly<Record<AgentRpCompatSmokeSecurityPolicyReason, number>>
    readonly consoleErrorSources: Readonly<Record<AgentRpCompatSmokeConsoleSource, number>>
    readonly consoleSignal: AgentRpCompatSmokeConsoleSignal
    readonly pageErrors: number
    readonly failureScreenshot: boolean
  }
  readonly timingsMs: Readonly<Record<string, number>>
  readonly snapshot?: AgentRpBrowserCompatibilitySnapshot
}

/** Content-free categories retained for browser console errors. */
export type AgentRpCompatSmokeConsoleErrorKind = 'resource-load' | 'security-policy' | 'runtime'

/** Fixed lifecycle phase assigned to a browser console error before its text is discarded. */
export type AgentRpCompatSmokeConsolePhase = 'client-load' | 'preflight' | 'runtime' | 'interaction' | 'teardown'

/** Content-free interpretation of browser console and page-error counters. */
export type AgentRpCompatSmokeConsoleSignal = 'clean' | 'security-policy-only' | 'errors-observed'

/** Fixed reason retained for a security-policy console error after its text is discarded. */
export type AgentRpCompatSmokeSecurityPolicyReason =
  | 'sandbox-script'
  | 'script-source'
  | 'style-source'
  | 'connect-source'
  | 'image-source'
  | 'font-source'
  | 'media-source'
  | 'frame-source'
  | 'cross-origin'
  | 'other'

/** Fixed document class retained for a console error after its source URL is discarded. */
export type AgentRpCompatSmokeConsoleSource =
  | 'host-document'
  | 'srcdoc-frame'
  | 'data-frame'
  | 'blob-frame'
  | 'external-document'
  | 'unknown'

/** Classify a browser console error without retaining its text, URL, or arguments. */
export function classifyAgentRpSmokeConsoleError(message: string): AgentRpCompatSmokeConsoleErrorKind {
  if (message.includes('Failed to load resource') || message.includes('net::ERR_')) return 'resource-load'
  if (message.includes('Content Security Policy') || message.includes('Refused to')
    || message.includes('blocked by CORS policy') || message.includes('Cross-Origin')) return 'security-policy'
  return 'runtime'
}

/** Classify a security-policy error into a fixed reason without retaining its text. */
export function classifyAgentRpSmokeSecurityPolicyReason(
  message: string,
): AgentRpCompatSmokeSecurityPolicyReason {
  if (message.includes('frame is sandboxed') && message.includes('allow-scripts')) return 'sandbox-script'
  if (message.includes('script-src')) return 'script-source'
  if (message.includes('style-src')) return 'style-source'
  if (message.includes('connect-src')) return 'connect-source'
  if (message.includes('img-src')) return 'image-source'
  if (message.includes('font-src')) return 'font-source'
  if (message.includes('media-src')) return 'media-source'
  if (message.includes('frame-src') || message.includes('child-src')) return 'frame-source'
  if (message.includes('blocked by CORS policy') || message.includes('Cross-Origin')) return 'cross-origin'
  return 'other'
}

/** Classify a console location without retaining its URL or path. */
export function classifyAgentRpSmokeConsoleSource(
  value: string,
  hostOrigin: string,
): AgentRpCompatSmokeConsoleSource {
  if (value === '' || value === 'about:blank') return 'unknown'
  if (value.startsWith('about:srcdoc')) return 'srcdoc-frame'
  if (value.startsWith('data:')) return 'data-frame'
  if (value.startsWith('blob:')) return 'blob-frame'
  try {
    return new URL(value).origin === hostOrigin ? 'host-document' : 'external-document'
  } catch {
    return 'unknown'
  }
}

/** Distinguish policy enforcement noise from resource, runtime, or page failures. */
export function classifyAgentRpSmokeConsoleSignal(
  kinds: Readonly<Record<AgentRpCompatSmokeConsoleErrorKind, number>>,
  pageErrors: number,
): AgentRpCompatSmokeConsoleSignal {
  if (pageErrors > 0 || kinds['resource-load'] > 0 || kinds.runtime > 0) return 'errors-observed'
  return kinds['security-policy'] > 0 ? 'security-policy-only' : 'clean'
}

/** Stable browser actions used by the smoke driver. */
export type AgentRpCompatSmokeAction =
  | 'open-character-library'
  | 'close-character-library'
  | 'open-archived-collection'
  | 'open-active-collection'
  | 'toggle-character-archived'
  | 'toggle-session-settings'
  | 'open-preset-manager'
  | 'close-preset-manager'
  | 'toggle-session-preset-module'
  | 'save-session-preset'
  | 'open-world-info-manager'
  | 'close-world-info-manager'
  | 'select-world-info-entry'
  | 'toggle-world-info-entry'
  | 'open-tavern-panel'
  | 'close-tavern-panel'
  | 'open-mobile-surface'

/** Product shell state observed before Agent RP mounts its Session launcher. */
export type AgentRpCompatSmokeClientGate = 'ready' | 'onboarding'

/** Browser operations required by the lifecycle runner. */
export interface AgentRpCompatSmokeDriver {
  readonly delay: (milliseconds: number) => Promise<void>
  readonly clientGate: () => Promise<AgentRpCompatSmokeClientGate>
  readonly acknowledgeOnboarding: () => Promise<void>
  readonly approveRuntimeFont: () => Promise<boolean>
  readonly closeRuntimePermissions: () => Promise<void>
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
  readonly acknowledgeOnboarding?: boolean
  readonly approveRuntimeFonts?: boolean
  readonly approvePreflight?: boolean
  readonly permissionDuration?: AgentRpCompatSmokePermissionDuration
}

const healthyDecision: AgentRpCompatSmokeDecision = {
  status: 'healthy', stage: 'healthy', exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.healthy,
}

function manual(stage: 'approval-required' | 'onboarding-required'): AgentRpCompatSmokeDecision {
  return { status: 'manual-required', stage, exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.manualRequired }
}

/** RPC methods used only when a smoke command explicitly bootstraps an isolated Workspace. */
export interface AgentRpCompatSmokeSourceRpc {
  readonly call: (method: 'workspace.create' | 'session.create', payload: Readonly<Record<string, string>>)
    => Promise<unknown>
}

function smokeRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
}

/**
 * Create a blank source Session through the public Workspace and Session RPCs.
 * @param rpc - RPC transport connected to the isolated Host under test.
 * @param workspacePath - Existing Host-local directory to register or reuse.
 * @returns The new blank Session id; neither path nor id enters the smoke report.
 */
export async function bootstrapAgentRpCompatSmokeSourceSession(
  rpc: AgentRpCompatSmokeSourceRpc,
  workspacePath: string,
): Promise<string> {
  const workspaceValue = smokeRecord(await rpc.call('workspace.create', { path: workspacePath }))
  const workspace = smokeRecord(workspaceValue?.workspace)
  if (typeof workspace?.workspaceId !== 'string' || workspace.workspaceId === '') {
    throw new Error('workspace.create returned no workspace id')
  }
  const sessionValue = smokeRecord(await rpc.call('session.create', { workspaceId: workspace.workspaceId }))
  if (typeof sessionValue?.sessionId !== 'string' || sessionValue.sessionId === '') {
    throw new Error('session.create returned no session id')
  }
  return sessionValue.sessionId
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
  approveRuntimeFonts = false,
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
  const pendingTavernPermissions = session.tavern?.pendingPermissions ?? 0
  const pendingFontPermissions = approveRuntimeFonts ? session.tavern?.permissions.font ?? 0 : 0
  if (session.nativeIdentity.pending > 0 || pendingTavernPermissions > pendingFontPermissions) {
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
    case 'open-character-library': case 'close-character-library':
    case 'open-archived-collection': case 'open-active-collection':
    case 'toggle-character-archived': return snapshot.interactions.characterLibrary.state
    case 'toggle-session-settings': return snapshot.interactions.sessionSettings.state
    case 'open-preset-manager': case 'close-preset-manager':
    case 'toggle-session-preset-module': case 'save-session-preset': return snapshot.interactions.presetManager.state
    case 'open-world-info-manager': case 'close-world-info-manager':
    case 'select-world-info-entry': case 'toggle-world-info-entry': return snapshot.interactions.worldInfoManager.state
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

/** Content-free session preset counts used to verify one save round trip. */
function presetCounts(snapshot: AgentRpBrowserCompatibilitySnapshot):
  { readonly revision: number; readonly enabledCount: number; readonly enabledRegexCount: number } | undefined {
  const preset = snapshot.session?.preset
  if (preset === undefined) return undefined
  return { revision: preset.revision, enabledCount: preset.enabledCount, enabledRegexCount: preset.enabledRegexCount }
}

/**
 * Flip one session-owned preset switch, save it, and wait for the content-free
 * counts to advance. A manager with no toggleable switches is a successful no-op.
 */
async function exerciseSessionPresetToggle(
  driver: AgentRpCompatSmokeDriver,
  snapshot: AgentRpBrowserCompatibilitySnapshot,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  const baseline = presetCounts(snapshot)
  if (snapshot.interactions.presetManager.toggleable === 0 || baseline === undefined) return true
  try {
    await driver.clickAction('toggle-session-preset-module')
    await driver.clickAction('save-session-preset')
  } catch {
    return false
  }
  const deadline = Date.now() + timeoutMs
  while (true) {
    const current = await driver.snapshot()
    const counts = current === undefined ? undefined : presetCounts(current)
    if (counts !== undefined && counts.revision > baseline.revision) {
      const enabledChanged = counts.enabledCount === baseline.enabledCount + 1
        || counts.enabledCount === baseline.enabledCount - 1
      const regexChanged = counts.enabledRegexCount === baseline.enabledRegexCount + 1
        || counts.enabledRegexCount === baseline.enabledRegexCount - 1
      if (enabledChanged !== regexChanged) return true
    }
    if (Date.now() >= deadline) return false
    await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
  }
}

/**
 * Select one world-info entry, toggle it, and wait for the durable world-info
 * configuration revision to advance. A manager with no entries is a successful no-op.
 */
async function exerciseWorldInfoToggle(
  driver: AgentRpCompatSmokeDriver,
  snapshot: AgentRpBrowserCompatibilitySnapshot,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  const baseline = snapshot.session?.worldEngine.revision
  if (snapshot.interactions.worldInfoManager.entries === 0 || baseline === undefined) return true
  try {
    await driver.clickAction('select-world-info-entry')
    await driver.clickAction('toggle-world-info-entry')
  } catch {
    return false
  }
  const deadline = Date.now() + timeoutMs
  while (true) {
    const current = await driver.snapshot()
    const revision = current?.session?.worldEngine.revision
    if (revision !== undefined && revision > baseline) return true
    if (Date.now() >= deadline) return false
    await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
  }
}

/** Content-free character-library facts used to verify one archive round trip. */
function libraryFacts(snapshot: AgentRpBrowserCompatibilitySnapshot): {
  readonly collection: AgentRpBrowserCompatibilitySnapshot['interactions']['characterLibrary']['collection']
  readonly entries: number
  readonly archiveToggle: number
} {
  return snapshot.interactions.characterLibrary
}

async function waitForLibraryFacts(
  driver: AgentRpCompatSmokeDriver,
  predicate: (snapshot: AgentRpBrowserCompatibilitySnapshot) => boolean,
  timeoutMs: number,
  pollMs: number,
): Promise<AgentRpBrowserCompatibilitySnapshot | undefined> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    const snapshot = await driver.snapshot()
    if (snapshot !== undefined && predicate(snapshot)) return snapshot
    if (Date.now() >= deadline) return undefined
    await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
  }
}

/**
 * Archive the selected character into the collection box and restore it, waiting
 * for the content-free entry counts and collection to round-trip.
 */
async function exerciseCharacterArchive(
  driver: AgentRpCompatSmokeDriver,
  snapshot: AgentRpBrowserCompatibilitySnapshot,
  characterId: string,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  const baseline = libraryFacts(snapshot)
  if (baseline.collection !== 'active') return false
  try {
    await driver.selectCharacter(characterId)
  } catch {
    return false
  }
  const selectedActive = await waitForLibraryFacts(
    driver, value => libraryFacts(value).archiveToggle >= 1, timeoutMs, pollMs,
  )
  if (selectedActive === undefined) return false
  try {
    await driver.clickAction('open-archived-collection')
  } catch {
    return false
  }
  const archivedBaseline = await waitForLibraryFacts(
    driver, value => libraryFacts(value).collection === 'archived', timeoutMs, pollMs,
  )
  if (archivedBaseline === undefined) return false
  const archivedEntries = libraryFacts(archivedBaseline).entries
  try {
    await driver.clickAction('open-active-collection')
    const active = await waitForLibraryFacts(
      driver, value => libraryFacts(value).collection === 'active', timeoutMs, pollMs,
    )
    if (active === undefined) return false
    await driver.selectCharacter(characterId)
  } catch {
    return false
  }
  const reselected = await waitForLibraryFacts(
    driver, value => libraryFacts(value).archiveToggle >= 1, timeoutMs, pollMs,
  )
  if (reselected === undefined) return false
  try {
    await driver.clickAction('toggle-character-archived')
  } catch {
    return false
  }
  const movedAway = await waitForLibraryFacts(
    driver, value => libraryFacts(value).collection === 'active'
      && libraryFacts(value).entries === baseline.entries - 1, timeoutMs, pollMs,
  )
  if (movedAway === undefined) return false
  try {
    await driver.clickAction('open-archived-collection')
  } catch {
    return false
  }
  const movedIn = await waitForLibraryFacts(
    driver, value => libraryFacts(value).collection === 'archived'
      && libraryFacts(value).entries === archivedEntries + 1, timeoutMs, pollMs,
  )
  if (movedIn === undefined) return false
  try {
    await driver.selectCharacter(characterId)
  } catch {
    return false
  }
  const selectedArchived = await waitForLibraryFacts(
    driver, value => libraryFacts(value).archiveToggle >= 1, timeoutMs, pollMs,
  )
  if (selectedArchived === undefined) return false
  try {
    await driver.clickAction('toggle-character-archived')
  } catch {
    return false
  }
  const restoredAway = await waitForLibraryFacts(
    driver, value => libraryFacts(value).collection === 'archived'
      && libraryFacts(value).entries === archivedEntries, timeoutMs, pollMs,
  )
  if (restoredAway === undefined) return false
  try {
    await driver.clickAction('open-active-collection')
  } catch {
    return false
  }
  const restoredActive = await waitForLibraryFacts(
    driver, value => libraryFacts(value).collection === 'active'
      && libraryFacts(value).entries === baseline.entries, timeoutMs, pollMs,
  )
  return restoredActive !== undefined
}

async function exerciseStableInteractions(
  driver: AgentRpCompatSmokeDriver,
  snapshot: AgentRpBrowserCompatibilitySnapshot,
  timeoutMs: number,
  pollMs: number,
  characterId?: string,
): Promise<AgentRpCompatSmokeDecision> {
  if (!snapshot.checks.interactiveEntriesPresent) return failed('interaction-missing')
  try {
    await driver.clickAction('open-character-library')
    const libraryOpened = await waitForSurface(driver, 'open-character-library', 'open', timeoutMs, pollMs)
    if (libraryOpened === undefined || libraryOpened.interactions.characterLibrary.state !== 'open') {
      return failed('interaction-failed')
    }
    if (characterId !== undefined
      && !await exerciseCharacterArchive(driver, libraryOpened, characterId, timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    await driver.clickAction('close-character-library')
    const libraryClosed = await waitForSurface(driver, 'close-character-library', 'closed', timeoutMs, pollMs)
    if (libraryClosed === undefined || libraryClosed.interactions.characterLibrary.state !== 'closed') {
      return failed('interaction-failed')
    }
    await driver.clickAction('toggle-session-settings')
    const settingsForPreset = await waitForSurface(driver, 'toggle-session-settings', 'open', timeoutMs, pollMs)
    if (settingsForPreset === undefined || settingsForPreset.interactions.sessionSettings.state !== 'open') {
      return failed('interaction-failed')
    }
    await driver.clickAction('open-preset-manager')
    const presetManagerOpened = await waitForSurface(driver, 'open-preset-manager', 'open', timeoutMs, pollMs)
    if (presetManagerOpened === undefined || presetManagerOpened.interactions.presetManager.state !== 'open') {
      return failed('interaction-failed')
    }
    if (!await exerciseSessionPresetToggle(driver, presetManagerOpened, timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    // A successful product save closes the manager itself; only close it when it stayed open.
    const afterPresetSave = await driver.snapshot()
    if (afterPresetSave !== undefined && afterPresetSave.interactions.presetManager.state !== 'closed') {
      await driver.clickAction('close-preset-manager')
      const presetManagerClosed = await waitForSurface(driver, 'close-preset-manager', 'closed', timeoutMs, pollMs)
      if (presetManagerClosed === undefined || presetManagerClosed.interactions.presetManager.state !== 'closed') {
        return failed('interaction-failed')
      }
    }
    await driver.clickAction('toggle-session-settings')
    const settingsForWorldInfo = await waitForSurface(driver, 'toggle-session-settings', 'open', timeoutMs, pollMs)
    if (settingsForWorldInfo === undefined || settingsForWorldInfo.interactions.sessionSettings.state !== 'open') {
      return failed('interaction-failed')
    }
    await driver.clickAction('open-world-info-manager')
    const worldInfoOpened = await waitForSurface(driver, 'open-world-info-manager', 'open', timeoutMs, pollMs)
    if (worldInfoOpened === undefined || worldInfoOpened.interactions.worldInfoManager.state !== 'open') {
      return failed('interaction-failed')
    }
    if (!await exerciseWorldInfoToggle(driver, worldInfoOpened, timeoutMs, pollMs)) {
      return failed('interaction-failed')
    }
    await driver.clickAction('close-world-info-manager')
    const worldInfoClosed = await waitForSurface(driver, 'close-world-info-manager', 'closed', timeoutMs, pollMs)
    if (worldInfoClosed === undefined || worldInfoClosed.interactions.worldInfoManager.state !== 'closed') {
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
  let clientGate: AgentRpCompatSmokeClientGate
  try {
    clientGate = await driver.clientGate()
  } catch {
    return { decision: failed('client-load-failed') }
  }
  if (clientGate === 'onboarding') {
    if (!input.acknowledgeOnboarding) return { decision: manual('onboarding-required') }
    try {
      await driver.acknowledgeOnboarding()
    } catch {
      return { decision: failed('client-load-failed') }
    }
  }
  const launcherDeadline = Date.now() + input.timeoutMs
  while (await driver.sourceLauncherCount(input.sourceSessionId) === 0) {
    if (Date.now() >= launcherDeadline) {
      return { decision: failed(input.sourceSessionId === undefined ? 'client-load-failed' : 'source-session-failed') }
    }
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
    driver, input.timeoutMs, pollMs,
    (snapshot, timedOut) => classifyAgentRpRuntime(snapshot, timedOut, input.approveRuntimeFonts),
    input.waitForManualApproval,
  )
  if (runtime.decision.status !== 'healthy' || runtime.snapshot === undefined) return runtime
  let runtimeSnapshot = runtime.snapshot
  if (input.approveRuntimeFonts) {
    const deadline = Date.now() + input.timeoutMs
    let quietMs = 0
    let previous = Date.now()
    try {
      await driver.delay(Math.min(750, input.timeoutMs))
      while (Date.now() < deadline) {
        const snapshot = await driver.snapshot()
        if (snapshot === undefined) {
          quietMs = 0
        } else {
          const tavern = snapshot.session?.tavern
          const pendingFonts = tavern?.permissions.font ?? 0
          const blockedFonts = tavern?.blockedResourceClasses.font ?? 0
          const scriptsReady = tavern !== undefined && tavern.ready === tavern.scripts && tavern.failed === 0
          if (pendingFonts > 0) {
            if (!await driver.approveRuntimeFont()) return { decision: failed('interaction-failed'), snapshot }
            quietMs = 0
          } else if (blockedFonts > 0 || !scriptsReady) {
            quietMs = 0
          } else {
            const now = Date.now()
            quietMs += Math.max(pollMs, now - previous)
            if (quietMs >= 1_500) {
              runtimeSnapshot = snapshot
              break
            }
          }
        }
        previous = Date.now()
        await driver.delay(Math.min(pollMs, Math.max(1, deadline - Date.now())))
      }
      if (quietMs < 1_500) return { decision: failed('interaction-failed'), snapshot: runtimeSnapshot }
    } catch {
      return { decision: failed('interaction-failed'), snapshot: runtimeSnapshot }
    } finally {
      try {
        await driver.closeRuntimePermissions()
      } catch {
        // The lifecycle decision retains the primary failure; closing an optional permission panel adds no signal.
      }
    }
  }
  const interaction = await exerciseStableInteractions(
    driver, runtimeSnapshot, input.timeoutMs, pollMs, input.characterId,
  )
  const finalSnapshot = await driver.snapshot()
  return { decision: interaction, snapshot: finalSnapshot ?? runtimeSnapshot }
}
