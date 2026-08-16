/** Content-free browser diagnostics for one mounted Agent RP interface. */

type Counter = Readonly<Record<string, number>>

/** Root attribute containing the latest serialized content-free report. */
export const AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE = 'data-agent-rp-compatibility-snapshot'

/** Stable issue codes emitted by the browser compatibility snapshot. */
export type AgentRpBrowserCompatibilityIssue =
  | 'capability-required-unavailable'
  | 'card-frame-content-empty'
  | 'card-frame-runtime-failed'
  | 'card-frame-unregistered'
  | 'external-window-callback-rejected'
  | 'external-window-delivery-unconfirmed'
  | 'external-window-closed-without-callback'
  | 'external-window-open-unconfirmed'
  | 'iframe-sandbox-expanded'
  | 'inline-frontend-sanitizer-degraded'
  | 'interactive-entry-missing'
  | 'preflight-count-mismatch'
  | 'preflight-failed'
  | 'preflight-launch-mismatch'
  | 'preflight-request-failed'
  | 'tavern-permission-count-mismatch'
  | 'tavern-runtime-failed'
  | 'world-engine-degraded'

/** Content-free runtime facts collected from the mounted Agent RP DOM. */
export interface AgentRpBrowserCompatibilitySnapshot {
  readonly audit: 'agent-rp-browser-compat-v0'
  readonly interactions: {
    readonly characterLibrary: {
      readonly launchers: number
      readonly state: 'closed' | 'open'
    }
    readonly presetManager: {
      readonly launchers: number
      readonly state: 'closed' | 'open'
    }
    readonly sessionSettings: {
      readonly launchers: number
      readonly state: 'closed' | 'open'
    }
    readonly tavernPanel: {
      readonly launchers: number
      readonly mobileLaunchers: number
      readonly state: 'closed' | 'mobile' | 'script'
    }
    readonly tavernPermissions: {
      readonly launchers: number
      readonly state: 'closed' | 'open'
    }
    readonly worldInfoManager: {
      readonly launchers: number
      readonly state: 'closed' | 'open'
    }
  }
  readonly session?: {
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
    readonly externalWindows: {
      readonly phases: Counter
    }
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
      readonly inlineFrontendSanitizer: string
    }
    readonly worldEngine: {
      readonly engine: string
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
    readonly tavern?: {
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
        readonly frame: number
        readonly identity: number
        readonly externalWindow: number
        readonly generation: number
        readonly customGeneration: number
        readonly modelList: number
      }
      readonly queuedGenerations: number
      readonly queuedModelLists: number
      readonly phases: Counter
      readonly scopes: Counter
    }
    readonly cardFrames: {
      readonly total: number
      readonly scriptEnabled: number
      readonly inert: number
      readonly registered: number
      readonly resized: number
      readonly runtimePhases: Counter
      readonly resourceMonitors: Counter
      readonly blockedResourceClasses: Counter
    }
  }
  readonly preflight?: {
    readonly status: string
    readonly launch: string
    readonly startReadiness?: string
    readonly startAction?: string
    readonly permissionDuration: 'session' | 'remember' | 'unknown'
    readonly scripts: number
    readonly cardResources: number
    readonly pendingCardPermissions: number
    readonly pendingScriptPermissions: number
    readonly pendingScriptOrigins: number
    readonly pendingImageOrigins: number
    readonly pendingFrameOrigins: number
    readonly pendingPermissions: number
    readonly failed: number
  }
  readonly checks: {
    readonly capabilitiesResolved: boolean
    readonly externalWindowsHealthy: boolean
    readonly iframeSandboxRestricted: boolean
    readonly inlineFrontendHealthy: boolean
    readonly interactiveEntriesPresent: boolean
    readonly preflightConsistent: boolean
    readonly preflightHealthy: boolean
    readonly tavernPermissionsConsistent: boolean
    readonly tavernRuntimeHealthy: boolean
    readonly worldEngineHealthy: boolean
  }
  readonly issues: readonly AgentRpBrowserCompatibilityIssue[]
}

declare global {
  interface Window {
    /** Return content-free Agent RP state for local and community compatibility reports. */
    __dshAgentRpCompatibilitySnapshot?: () => AgentRpBrowserCompatibilitySnapshot
  }
}

function integer(element: Element, name: string): number {
  const value = Number(element.getAttribute(name))
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function value(element: Element, name: string): string {
  return element.getAttribute(name) ?? ''
}

function nativeIdentityState(element: Element): 'loading' | 'unconfigured' | 'ready' | 'error' | 'unknown' {
  const state = value(element, 'data-agent-rp-native-identity')
  return state === 'loading' || state === 'unconfigured' || state === 'ready' || state === 'error'
    ? state : 'unknown'
}

function counter(elements: readonly Element[], name: string): Counter {
  const result: Record<string, number> = {}
  for (const element of elements) {
    const current = element.getAttribute(name)
    if (current !== null && current !== '') result[current] = (result[current] ?? 0) + 1
  }
  return result
}

function sandboxTokens(frame: Element): readonly string[] | undefined {
  const source = frame.getAttribute('sandbox')
  return source === null ? undefined : source.trim() === '' ? [] : source.trim().split(/\s+/u)
}

function restrictedSandbox(frame: Element): boolean {
  const tokens = sandboxTokens(frame)
  if (frame.getAttribute('data-agent-rp-tavern-script-scope') !== null) {
    return tokens?.length === 3
      && tokens.includes('allow-scripts') && tokens.includes('allow-same-origin') && tokens.includes('allow-forms')
      && frame.getAttribute('src')?.startsWith('data:text/html;charset=utf-8;base64,') === true
      && frame.getAttribute('srcdoc') === null
  }
  return tokens?.length === 1 && tokens[0] === 'allow-scripts'
}

/** Read one mounted Agent RP interface without copying names, content, URLs, ids, or error messages. */
export function collectAgentRpBrowserCompatibilitySnapshot(
  root: ParentNode,
): AgentRpBrowserCompatibilitySnapshot {
  const status = root.querySelector('[data-agent-rp-status]')
  const tavern = root.querySelector('[data-agent-rp-tavern-total]')
  const tavernFrames = [...root.querySelectorAll('iframe[data-agent-rp-tavern-script-scope]')]
  const cardFrames = [...root.querySelectorAll('iframe[data-agent-rp-frame]')]
  const allFrames = [...tavernFrames, ...cardFrames]
  const scriptCardFrames = cardFrames.filter(frame => sandboxTokens(frame)?.includes('allow-scripts') === true)
  const externalWindowPhases = counter(
    [...root.querySelectorAll('[data-agent-rp-external-window-phase]')],
    'data-agent-rp-external-window-phase',
  )
  const preflightElement = root.querySelector('[data-agent-rp-resource-preflight]')
  const startElement = root.querySelector('[data-agent-rp-start-readiness]')
  const characterLibraryLaunchers = root.querySelectorAll('[data-agent-rp-action="open-character-library"]').length
  const characterLibraryOpen = root.querySelector('[data-agent-rp-surface="character-library"]') !== null
  const sessionSettingsLaunchers = root.querySelectorAll('[data-agent-rp-action="toggle-session-settings"]').length
  const sessionSettingsOpen = root.querySelector('[data-agent-rp-surface="session-settings"]')
    ?.getAttribute('data-agent-rp-surface-state') === 'open'
  const presetManagerLaunchers = root.querySelectorAll('[data-agent-rp-action="open-preset-manager"]').length
  const presetManagerOpen = root.querySelector('[data-agent-rp-surface="preset-manager"]') !== null
  const worldInfoManagerLaunchers = root.querySelectorAll('[data-agent-rp-action="open-world-info-manager"]').length
  const worldInfoManagerOpen = root.querySelector('[data-agent-rp-surface="world-info-manager"]') !== null
  const tavernPanelLaunchers = root.querySelectorAll('[data-agent-rp-action="open-tavern-panel"]').length
  const mobileLaunchers = root.querySelectorAll('[data-agent-rp-action="open-mobile-surface"]').length
  const tavernPermissionLaunchers = root.querySelectorAll('[data-agent-rp-action="open-tavern-permissions"]').length
  const tavernPermissionsOpen = root.querySelector('[data-agent-rp-surface="tavern-permissions"]') !== null
  const tavernPanelStateValue = root.querySelector('[data-agent-rp-surface="tavern-panel"]')
    ?.getAttribute('data-agent-rp-surface-state')
  const tavernPanelState = tavernPanelStateValue === 'mobile' || tavernPanelStateValue === 'script'
    ? tavernPanelStateValue
    : 'closed'
  const issues = new Set<AgentRpBrowserCompatibilityIssue>()

  let session: AgentRpBrowserCompatibilitySnapshot['session']
  if (status !== null) {
    const capabilities = {
      extensions: integer(status, 'data-agent-rp-capability-extensions'),
      requirements: integer(status, 'data-agent-rp-capability-requirements'),
      available: integer(status, 'data-agent-rp-capability-available'),
      approvals: integer(status, 'data-agent-rp-capability-approvals'),
      requiredUnavailable: integer(status, 'data-agent-rp-capability-required-unavailable'),
      unsupported: integer(status, 'data-agent-rp-capability-unsupported'),
      versionMismatch: integer(status, 'data-agent-rp-capability-version-mismatch'),
      denied: integer(status, 'data-agent-rp-capability-denied'),
    }
    if (capabilities.requiredUnavailable > 0) issues.add('capability-required-unavailable')
    if ((externalWindowPhases['external-open-unconfirmed'] ?? 0) > 0) {
      issues.add('external-window-open-unconfirmed')
    }
    if ((externalWindowPhases['callback-rejected'] ?? 0) > 0) {
      issues.add('external-window-callback-rejected')
    }
    if ((externalWindowPhases['callback-delivery-unconfirmed'] ?? 0) > 0) {
      issues.add('external-window-delivery-unconfirmed')
    }
    if ((externalWindowPhases['external-closed-without-callback'] ?? 0) > 0) {
      issues.add('external-window-closed-without-callback')
    }
    const inlineFrontendSanitizer = value(status, 'data-agent-rp-inline-frontend-sanitizer')
    if (inlineFrontendSanitizer !== 'ready') issues.add('inline-frontend-sanitizer-degraded')
    const unregisteredCardFrames = scriptCardFrames.filter(
      frame => frame.getAttribute('data-agent-rp-frame-registered') !== 'true',
    ).length
    if (unregisteredCardFrames > 0) issues.add('card-frame-unregistered')
    const runtimePhases = counter(scriptCardFrames, 'data-agent-rp-runtime-phase')
    if ((runtimePhases['content-empty'] ?? 0) > 0) issues.add('card-frame-content-empty')
    if ((runtimePhases['runtime-error'] ?? 0) + (runtimePhases['runtime-rejection'] ?? 0) > 0) {
      issues.add('card-frame-runtime-failed')
    }
    const tavernFailed = tavern === null ? 0 : integer(tavern, 'data-agent-rp-tavern-failed')
    if (tavernFailed > 0) issues.add('tavern-runtime-failed')
    const tavernPermissionState = tavern?.getAttribute('data-agent-rp-tavern-permission-state')
    const normalizedTavernPermissionState = tavernPermissionState === 'settled'
      || tavernPermissionState === 'startup-blocked' || tavernPermissionState === 'interaction-pending'
      ? tavernPermissionState : 'unknown'
    const worldEngineFailures = {
      regexRuntimeUnavailable: integer(status, 'data-agent-rp-world-engine-regex-runtime-unavailable'),
      regexInvalid: integer(status, 'data-agent-rp-world-engine-regex-invalid'),
      regexExecutionLimit: integer(status, 'data-agent-rp-world-engine-regex-execution-limit'),
      regexResourceLimit: integer(status, 'data-agent-rp-world-engine-regex-resource-limit'),
      decoratorUnsupported: integer(status, 'data-agent-rp-world-engine-decorator-unsupported'),
      templateUnsupported: integer(status, 'data-agent-rp-world-engine-template-unsupported'),
      templateError: integer(status, 'data-agent-rp-world-engine-template-error'),
    }
    if (Object.values(worldEngineFailures).some(count => count > 0)) issues.add('world-engine-degraded')
    session = {
      capabilities,
      auxiliaryGenerations: {
        requests: integer(status, 'data-agent-rp-auxiliary-generation-requests'),
        succeeded: integer(status, 'data-agent-rp-auxiliary-generation-succeeded'),
        failed: integer(status, 'data-agent-rp-auxiliary-generation-failed'),
        pending: integer(status, 'data-agent-rp-auxiliary-generation-pending'),
        malformed: integer(status, 'data-agent-rp-auxiliary-generation-malformed'),
      },
      externalWindows: { phases: externalWindowPhases },
      nativeIdentity: {
        state: nativeIdentityState(status),
        approved: integer(status, 'data-agent-rp-native-identity-approved'),
        pending: integer(status, 'data-agent-rp-native-identity-pending')
          + (tavern === null ? 0 : integer(tavern, 'data-agent-rp-native-identity-pending')),
      },
      variables: {
        surfaces: integer(status, 'data-agent-rp-variable-surfaces'),
        sharedScopes: integer(status, 'data-agent-rp-variable-shared-scopes'),
        scriptScopes: integer(status, 'data-agent-rp-variable-script-scopes'),
      },
      renderer: { inlineFrontendSanitizer },
      worldEngine: {
        engine: value(status, 'data-agent-rp-world-engine'),
        entries: integer(status, 'data-agent-rp-world-engine-entries'),
        active: integer(status, 'data-agent-rp-world-engine-active'),
        budgetExcluded: integer(status, 'data-agent-rp-world-engine-budget-excluded'),
        failures: worldEngineFailures,
      },
      ...(tavern === null ? {} : { tavern: {
        scripts: integer(tavern, 'data-agent-rp-tavern-total'),
        frames: tavernFrames.length,
        ready: integer(tavern, 'data-agent-rp-tavern-ready'),
        failed: tavernFailed,
        pendingPermissions: integer(tavern, 'data-agent-rp-tavern-permissions'),
        startupPermissions: integer(tavern, 'data-agent-rp-tavern-startup-permissions'),
        interactionPermissions: integer(tavern, 'data-agent-rp-tavern-interaction-permissions'),
        permissionState: normalizedTavernPermissionState,
        permissions: {
          script: integer(tavern, 'data-agent-rp-tavern-permission-script'),
          image: integer(tavern, 'data-agent-rp-tavern-permission-image'),
          frame: integer(tavern, 'data-agent-rp-tavern-permission-frame'),
          identity: integer(tavern, 'data-agent-rp-tavern-permission-identity'),
          externalWindow: integer(tavern, 'data-agent-rp-tavern-permission-external-window'),
          generation: integer(tavern, 'data-agent-rp-tavern-permission-generation'),
          customGeneration: integer(tavern, 'data-agent-rp-tavern-permission-custom-generation'),
          modelList: integer(tavern, 'data-agent-rp-tavern-permission-model-list'),
        },
        queuedGenerations: integer(tavern, 'data-agent-rp-tavern-generation-queued'),
        queuedModelLists: integer(tavern, 'data-agent-rp-tavern-model-list-queued'),
        phases: counter(tavernFrames, 'data-agent-rp-tavern-phase'),
        scopes: counter(tavernFrames, 'data-agent-rp-tavern-script-scope'),
      } }),
      cardFrames: {
        total: cardFrames.length,
        scriptEnabled: scriptCardFrames.length,
        inert: cardFrames.filter(frame => sandboxTokens(frame)?.length === 0).length,
        registered: scriptCardFrames.length - unregisteredCardFrames,
        resized: scriptCardFrames.filter(frame => frame.getAttribute('data-agent-rp-resize-received') === 'true').length,
        runtimePhases,
        resourceMonitors: counter(scriptCardFrames, 'data-agent-rp-resource-monitor'),
        blockedResourceClasses: counter(scriptCardFrames, 'data-agent-rp-resource-blocked'),
      },
    }
  }

  const interactiveEntriesPresent = session === undefined || (
    characterLibraryLaunchers > 0
    && sessionSettingsLaunchers > 0
    && presetManagerLaunchers > 0
    && worldInfoManagerLaunchers > 0
    && (session.tavern === undefined || session.tavern.scripts === 0 || tavernPanelLaunchers > 0)
    && (session.tavern === undefined || session.tavern.pendingPermissions === 0 || tavernPermissionLaunchers > 0)
  )
  if (!interactiveEntriesPresent) issues.add('interactive-entry-missing')
  const expectedTavernPermissionState = session?.tavern === undefined ? undefined
    : session.tavern.startupPermissions > 0 ? 'startup-blocked'
      : session.tavern.interactionPermissions > 0 ? 'interaction-pending' : 'settled'
  const expectedTavernStartupPermissions = session?.tavern === undefined ? undefined
    : session.tavern.permissions.script + session.tavern.permissions.image + session.tavern.permissions.frame
  const expectedTavernInteractionPermissions = session?.tavern === undefined ? undefined
    : session.tavern.permissions.identity + session.tavern.permissions.externalWindow
      + session.tavern.permissions.generation + session.tavern.permissions.customGeneration
      + session.tavern.permissions.modelList
  const tavernPermissionsConsistent = session?.tavern === undefined
    || (Object.values(session.tavern.permissions).reduce((total, count) => total + count, 0)
      === session.tavern.pendingPermissions
      && session.tavern.startupPermissions + session.tavern.interactionPermissions
        === session.tavern.pendingPermissions
      && session.tavern.startupPermissions === expectedTavernStartupPermissions
      && session.tavern.interactionPermissions === expectedTavernInteractionPermissions
      && session.tavern.permissionState === expectedTavernPermissionState)
  if (!tavernPermissionsConsistent) issues.add('tavern-permission-count-mismatch')

  let preflight: AgentRpBrowserCompatibilitySnapshot['preflight']
  let preflightConsistent = true
  let preflightHealthy = true
  if (preflightElement !== null) {
    const pendingCardPermissions = integer(preflightElement, 'data-agent-rp-resource-preflight-card-permissions')
    const pendingScriptPermissions = integer(preflightElement, 'data-agent-rp-resource-preflight-script-permissions')
    const pendingScriptOrigins = integer(preflightElement, 'data-agent-rp-resource-preflight-script-origins')
    const pendingImageOrigins = integer(preflightElement, 'data-agent-rp-resource-preflight-image-origins')
    const pendingFrameOrigins = integer(preflightElement, 'data-agent-rp-resource-preflight-frame-origins')
    const pendingPermissions = integer(preflightElement, 'data-agent-rp-resource-preflight-permissions')
    const statusValue = value(preflightElement, 'data-agent-rp-resource-preflight')
    const launch = value(preflightElement, 'data-agent-rp-resource-launch')
    const failed = integer(preflightElement, 'data-agent-rp-resource-preflight-failed')
    const startReadiness = startElement?.getAttribute('data-agent-rp-start-readiness') ?? undefined
    const startAction = startElement?.getAttribute('data-agent-rp-start-action') ?? undefined
    const permissionDurationValue = value(preflightElement, 'data-agent-rp-resource-permission-duration')
    const permissionDuration = permissionDurationValue === 'session' || permissionDurationValue === 'remember'
      ? permissionDurationValue : 'unknown'
    preflightConsistent = pendingPermissions === pendingCardPermissions + pendingScriptPermissions
      && pendingScriptPermissions === pendingScriptOrigins + pendingImageOrigins + pendingFrameOrigins
      && permissionDuration !== 'unknown'
    if (!preflightConsistent) issues.add('preflight-count-mismatch')
    const expectedLaunch = statusValue === 'loading' ? 'checking'
      : pendingPermissions > 0 ? 'approval-required' : 'ready'
    const expectedStartAction = expectedLaunch === 'checking' ? 'checking'
      : expectedLaunch === 'approval-required' ? 'approve-and-start' : 'start'
    if (launch !== expectedLaunch || (startReadiness !== undefined && startReadiness !== launch)
      || (startElement !== null && startAction !== expectedStartAction)) {
      preflightConsistent = false
      issues.add('preflight-launch-mismatch')
    }
    if (failed > 0) {
      preflightHealthy = false
      issues.add('preflight-failed')
    }
    if (statusValue === 'error') {
      preflightHealthy = false
      issues.add('preflight-request-failed')
    }
    preflight = {
      status: statusValue,
      launch,
      ...(startReadiness === undefined ? {} : { startReadiness }),
      ...(startAction === undefined ? {} : { startAction }),
      permissionDuration,
      scripts: integer(preflightElement, 'data-agent-rp-resource-preflight-scripts'),
      cardResources: integer(preflightElement, 'data-agent-rp-resource-preflight-card-resources'),
      pendingCardPermissions,
      pendingScriptPermissions,
      pendingScriptOrigins,
      pendingImageOrigins,
      pendingFrameOrigins,
      pendingPermissions,
      failed,
    }
  }

  if (allFrames.some(frame => !restrictedSandbox(frame))) issues.add('iframe-sandbox-expanded')
  return {
    audit: 'agent-rp-browser-compat-v0',
    interactions: {
      characterLibrary: {
        launchers: characterLibraryLaunchers,
        state: characterLibraryOpen ? 'open' : 'closed',
      },
      presetManager: {
        launchers: presetManagerLaunchers,
        state: presetManagerOpen ? 'open' : 'closed',
      },
      sessionSettings: {
        launchers: sessionSettingsLaunchers,
        state: sessionSettingsOpen ? 'open' : 'closed',
      },
      tavernPanel: {
        launchers: tavernPanelLaunchers,
        mobileLaunchers,
        state: tavernPanelState,
      },
      tavernPermissions: {
        launchers: tavernPermissionLaunchers,
        state: tavernPermissionsOpen ? 'open' : 'closed',
      },
      worldInfoManager: {
        launchers: worldInfoManagerLaunchers,
        state: worldInfoManagerOpen ? 'open' : 'closed',
      },
    },
    ...(session === undefined ? {} : { session }),
    ...(preflight === undefined ? {} : { preflight }),
    checks: {
      capabilitiesResolved: session === undefined || session.capabilities.requiredUnavailable === 0,
      externalWindowsHealthy: !issues.has('external-window-callback-rejected')
        && !issues.has('external-window-delivery-unconfirmed')
        && !issues.has('external-window-closed-without-callback')
        && !issues.has('external-window-open-unconfirmed'),
      iframeSandboxRestricted: !issues.has('iframe-sandbox-expanded'),
      inlineFrontendHealthy: session === undefined || !issues.has('inline-frontend-sanitizer-degraded'),
      interactiveEntriesPresent,
      preflightConsistent,
      preflightHealthy,
      tavernPermissionsConsistent,
      tavernRuntimeHealthy: session?.tavern === undefined || session.tavern.failed === 0,
      worldEngineHealthy: session === undefined || !issues.has('world-engine-degraded'),
    },
    issues: [...issues].sort(),
  }
}

/** Install the content-free snapshot function without granting a card frame access to the Host page. */
export function installAgentRpBrowserCompatibilityDiagnostic(
  target: Window,
  root: ParentNode,
): () => void {
  const previous = target.__dshAgentRpCompatibilitySnapshot
  const documentRoot = 'documentElement' in root ? (root as Document).documentElement : undefined
  const previousAttribute = documentRoot?.getAttribute(AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE) ?? undefined
  const snapshot = (): AgentRpBrowserCompatibilitySnapshot => collectAgentRpBrowserCompatibilitySnapshot(root)
  const refresh = (): void => {
    if (documentRoot === undefined) return
    const serialized = JSON.stringify(snapshot())
    if (documentRoot.getAttribute(AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE) !== serialized) {
      documentRoot.setAttribute(AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE, serialized)
    }
  }
  target.__dshAgentRpCompatibilitySnapshot = snapshot
  let scheduledRefresh: number | undefined
  const scheduleRefresh = (): void => {
    if (scheduledRefresh !== undefined) return
    scheduledRefresh = target.setTimeout(() => {
      scheduledRefresh = undefined
      refresh()
    }, 50)
  }
  const observer = new MutationObserver(scheduleRefresh)
  observer.observe(root as Node, {
    attributes: true,
    attributeFilter: [
      'sandbox',
      'data-agent-rp-status',
      'data-agent-rp-inline-frontend-sanitizer',
      'data-agent-rp-capability-extensions',
      'data-agent-rp-capability-requirements',
      'data-agent-rp-capability-available',
      'data-agent-rp-capability-approvals',
      'data-agent-rp-capability-required-unavailable',
      'data-agent-rp-capability-unsupported',
      'data-agent-rp-capability-version-mismatch',
      'data-agent-rp-capability-denied',
      'data-agent-rp-native-identity',
      'data-agent-rp-native-identity-approved',
      'data-agent-rp-native-identity-pending',
      'data-agent-rp-auxiliary-generation-requests',
      'data-agent-rp-auxiliary-generation-succeeded',
      'data-agent-rp-auxiliary-generation-failed',
      'data-agent-rp-auxiliary-generation-pending',
      'data-agent-rp-auxiliary-generation-malformed',
      'data-agent-rp-external-window-phase',
      'data-agent-rp-variable-surfaces',
      'data-agent-rp-variable-shared-scopes',
      'data-agent-rp-variable-script-scopes',
      'data-agent-rp-world-engine',
      'data-agent-rp-world-engine-entries',
      'data-agent-rp-world-engine-active',
      'data-agent-rp-world-engine-budget-excluded',
      'data-agent-rp-world-engine-regex-runtime-unavailable',
      'data-agent-rp-world-engine-regex-invalid',
      'data-agent-rp-world-engine-regex-execution-limit',
      'data-agent-rp-world-engine-regex-resource-limit',
      'data-agent-rp-world-engine-decorator-unsupported',
      'data-agent-rp-world-engine-template-unsupported',
      'data-agent-rp-world-engine-template-error',
      'data-agent-rp-tavern-total',
      'data-agent-rp-tavern-ready',
      'data-agent-rp-tavern-failed',
      'data-agent-rp-tavern-permissions',
      'data-agent-rp-tavern-startup-permissions',
      'data-agent-rp-tavern-interaction-permissions',
      'data-agent-rp-tavern-permission-state',
      'data-agent-rp-tavern-permission-script',
      'data-agent-rp-tavern-permission-image',
      'data-agent-rp-tavern-permission-frame',
      'data-agent-rp-tavern-permission-identity',
      'data-agent-rp-tavern-permission-external-window',
      'data-agent-rp-tavern-permission-generation',
      'data-agent-rp-tavern-permission-custom-generation',
      'data-agent-rp-tavern-permission-model-list',
      'data-agent-rp-tavern-generation-queued',
      'data-agent-rp-tavern-model-list-queued',
      'data-agent-rp-tavern-phase',
      'data-agent-rp-tavern-script-scope',
      'data-agent-rp-frame',
      'data-agent-rp-frame-registered',
      'data-agent-rp-resize-received',
      'data-agent-rp-runtime-phase',
      'data-agent-rp-resource-monitor',
      'data-agent-rp-resource-blocked',
      'data-agent-rp-resource-preflight',
      'data-agent-rp-resource-launch',
      'data-agent-rp-resource-preflight-scripts',
      'data-agent-rp-resource-preflight-card-resources',
      'data-agent-rp-resource-preflight-card-permissions',
      'data-agent-rp-resource-preflight-script-permissions',
      'data-agent-rp-resource-preflight-script-origins',
      'data-agent-rp-resource-preflight-image-origins',
      'data-agent-rp-resource-preflight-frame-origins',
      'data-agent-rp-resource-preflight-permissions',
      'data-agent-rp-resource-preflight-failed',
      'data-agent-rp-resource-permission-duration',
      'data-agent-rp-start-readiness',
      'data-agent-rp-start-action',
      'data-agent-rp-action',
      'data-agent-rp-surface',
      'data-agent-rp-surface-state',
    ],
    childList: true,
    subtree: true,
  })
  refresh()
  return () => {
    observer.disconnect()
    if (scheduledRefresh !== undefined) target.clearTimeout(scheduledRefresh)
    if (documentRoot !== undefined) {
      if (previousAttribute === undefined) documentRoot.removeAttribute(AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE)
      else documentRoot.setAttribute(AGENT_RP_BROWSER_COMPATIBILITY_ATTRIBUTE, previousAttribute)
    }
    if (previous === undefined) delete target.__dshAgentRpCompatibilitySnapshot
    else target.__dshAgentRpCompatibilitySnapshot = previous
  }
}
