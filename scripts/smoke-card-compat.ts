/** One-command, content-free browser smoke for one private Character Card and optional preset. */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { homedir, platform, tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import {
  AGENT_RP_COMPAT_SMOKE_EXIT,
  classifyAgentRpSmokeConsoleError,
  classifyAgentRpSmokeConsoleSource,
  classifyAgentRpSmokeSecurityPolicyReason,
  classifyAgentRpSmokeConsoleSignal,
  runAgentRpBrowserCompatibilitySmoke,
  runnerFailure,
  type AgentRpCompatSmokeAction,
  type AgentRpCompatSmokeConsoleErrorKind,
  type AgentRpCompatSmokeConsolePhase,
  type AgentRpCompatSmokeConsoleSource,
  type AgentRpCompatSmokeSecurityPolicyReason,
  type AgentRpCompatSmokeDecision,
  type AgentRpCompatSmokeDriver,
  type AgentRpCompatSmokePermissionDuration,
  type AgentRpCompatSmokeReport,
  type AgentRpCompatSmokeStage,
} from '../src/compat-smoke.ts'
import type { AgentRpBrowserCompatibilitySnapshot } from '../src/client/compatibility-diagnostic.ts'

interface CliOptions {
  readonly cardPath: string
  readonly presetPath?: string
  readonly url: URL
  readonly timeoutMs: number
  readonly headed: boolean
  readonly approvePreflight: boolean
  readonly permissionDuration: AgentRpCompatSmokePermissionDuration
  readonly browserPath?: string
  readonly profilePath: string
}

type CardImportOutcome = AgentRpCompatSmokeReport['imports']['card']
type PresetImportOutcome = AgentRpCompatSmokeReport['imports']['preset']
type CommandFailureStage = Exclude<AgentRpCompatSmokeStage, 'healthy' | 'approval-required'>

class SmokeCommandError extends Error {
  override readonly name = 'SmokeCommandError'

  constructor(readonly stage: CommandFailureStage) {
    super(stage)
  }
}

function usage(): string {
  return [
    'Usage: pnpm run smoke:compat -- --card <card.png|json|charx> [--preset <preset.json>]',
    '       [--url http://127.0.0.1:3091/] [--timeout-ms 90000] [--headed] [--approve-preflight]',
    '       [--permission-duration session|remember]',
    '       [--browser <chromium executable>] [--profile <dedicated browser profile>]',
  ].join('\n')
}

function argument(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  if (index < 0) return undefined
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) throw new SmokeCommandError('runner-failed')
  return value
}

function parseArgs(argv: readonly string[]): CliOptions {
  const cardPath = argument(argv, '--card')
  if (cardPath === undefined) throw new SmokeCommandError('runner-failed')
  const rawUrl = argument(argv, '--url') ?? 'http://127.0.0.1:3091/'
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new SmokeCommandError('runner-failed')
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]'
  if (!loopback || (url.protocol !== 'http:' && url.protocol !== 'https:')
    || url.username !== '' || url.password !== '') throw new SmokeCommandError('runner-failed')
  const rawTimeout = argument(argv, '--timeout-ms') ?? '90000'
  const timeoutMs = Number(rawTimeout)
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 15 * 60_000) {
    throw new SmokeCommandError('runner-failed')
  }
  const presetPath = argument(argv, '--preset')
  const rawPermissionDuration = argument(argv, '--permission-duration') ?? 'session'
  if (rawPermissionDuration !== 'session' && rawPermissionDuration !== 'remember') {
    throw new SmokeCommandError('runner-failed')
  }
  if (argv.includes('--permission-duration') && !argv.includes('--approve-preflight')) {
    throw new SmokeCommandError('runner-failed')
  }
  return {
    cardPath: resolve(cardPath),
    ...(presetPath === undefined ? {} : { presetPath: resolve(presetPath) }),
    url,
    timeoutMs,
    headed: argv.includes('--headed'),
    approvePreflight: argv.includes('--approve-preflight'),
    permissionDuration: rawPermissionDuration,
    ...(argument(argv, '--browser') === undefined ? {} : { browserPath: resolve(argument(argv, '--browser')!) }),
    profilePath: resolve(argument(argv, '--profile') ?? join(homedir(), '.dsh', 'agent-rp-smoke-browser')),
  }
}

function failed(stage: Exclude<AgentRpCompatSmokeStage,
  'healthy' | 'approval-required' | 'server-unreachable' | 'runner-failed'>): AgentRpCompatSmokeDecision {
  return { status: 'failed', stage, exitCode: AGENT_RP_COMPAT_SMOKE_EXIT.compatibilityFailure }
}

function roundedDuration(started: number): number {
  return Number((performance.now() - started).toFixed(2))
}

async function responseJson(response: Response, stage: CommandFailureStage): Promise<unknown> {
  if (!response.ok) throw new SmokeCommandError(stage)
  try {
    return await response.json()
  } catch {
    throw new SmokeCommandError(stage)
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
}

function requestBody(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

async function localFetch(url: URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: { origin: url.origin, ...(init.headers ?? {}) },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new SmokeCommandError('server-unreachable')
  }
}

async function probePlugin(options: CliOptions): Promise<void> {
  const response = await localFetch(new URL('/api/agent-rp/characters', options.url), {
    headers: { accept: 'application/json' },
  }, options.timeoutMs)
  if (response.status === 404) throw new SmokeCommandError('plugin-unavailable')
  await responseJson(response, 'plugin-unavailable')
}

async function importCard(options: CliOptions): Promise<{ readonly id: string; readonly outcome: CardImportOutcome }> {
  let bytes: Uint8Array
  try {
    bytes = await readFile(options.cardPath)
  } catch {
    throw new SmokeCommandError('import-failed')
  }
  const mediaType = extname(options.cardPath).toLocaleLowerCase() === '.png' ? 'image/png'
    : extname(options.cardPath).toLocaleLowerCase() === '.charx' ? 'application/zip' : 'application/json'
  const url = new URL('/api/agent-rp/characters/import', options.url)
  url.searchParams.set('filename', basename(options.cardPath))
  const value = record(await responseJson(await localFetch(url, {
    method: 'POST', headers: { accept: 'application/json', 'content-type': mediaType }, body: requestBody(bytes),
  }, options.timeoutMs), 'import-failed'))
  const entry = record(value?.entry)
  const outcome = value?.outcome
  if (typeof entry?.id !== 'string'
    || (outcome !== 'created' && outcome !== 'existing' && outcome !== 'restored')) {
    throw new SmokeCommandError('import-failed')
  }
  return { id: entry.id, outcome }
}

async function importPreset(options: CliOptions): Promise<{ readonly id: string; readonly outcome: PresetImportOutcome }> {
  if (options.presetPath === undefined) throw new SmokeCommandError('import-failed')
  let bytes: Uint8Array
  try {
    bytes = await readFile(options.presetPath)
  } catch {
    throw new SmokeCommandError('import-failed')
  }
  const listUrl = new URL('/api/agent-rp/presets', options.url)
  const beforeValue = record(await responseJson(await localFetch(listUrl, {
    headers: { accept: 'application/json' },
  }, options.timeoutMs), 'import-failed'))
  const beforeIds = new Set(Array.isArray(beforeValue?.entries)
    ? beforeValue.entries.map(record).map(entry => entry?.id).filter((id): id is string => typeof id === 'string')
    : [])
  const url = new URL('/api/agent-rp/presets', options.url)
  url.searchParams.set('filename', basename(options.presetPath))
  const value = record(await responseJson(await localFetch(url, {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: requestBody(bytes),
  }, options.timeoutMs), 'import-failed'))
  const entry = record(value?.entry)
  if (typeof entry?.id !== 'string') throw new SmokeCommandError('import-failed')
  return { id: entry.id, outcome: beforeIds.has(entry.id) ? 'existing' : 'created' }
}

function browserCandidates(): readonly string[] {
  if (platform() === 'win32') return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]
  if (platform() === 'darwin') return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ]
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge']
}

function resolveBrowserExecutable(explicit?: string): string {
  if (explicit !== undefined) {
    if (!existsSync(explicit)) throw new SmokeCommandError('runner-failed')
    return explicit
  }
  const candidate = browserCandidates().find(existsSync)
  if (candidate === undefined) throw new SmokeCommandError('runner-failed')
  return candidate
}

class PlaywrightSmokeDriver implements AgentRpCompatSmokeDriver {
  private launched = false

  constructor(
    private readonly page: Page,
    private readonly timeoutMs: number,
    private readonly markConsolePhase: (phase: AgentRpCompatSmokeConsolePhase) => void,
  ) {}

  delay(milliseconds: number): Promise<void> {
    return this.page.waitForTimeout(milliseconds)
  }

  async snapshot(): Promise<AgentRpBrowserCompatibilitySnapshot | undefined> {
    return await this.page.evaluate(() => {
      const target = window as Window & {
        __dshAgentRpCompatibilitySnapshot?: () => AgentRpBrowserCompatibilitySnapshot
      }
      if (typeof target.__dshAgentRpCompatibilitySnapshot === 'function') {
        return target.__dshAgentRpCompatibilitySnapshot()
      }
      const serialized = document.documentElement.getAttribute('data-agent-rp-compatibility-snapshot')
      if (serialized === null) return undefined
      try {
        return JSON.parse(serialized) as AgentRpBrowserCompatibilitySnapshot
      } catch {
        return undefined
      }
    })
  }

  async sourceLauncherCount(sourceSessionId?: string): Promise<number> {
    return await this.page.locator('[data-agent-rp-action="open-character-library"]')
      .evaluateAll((elements, expected) => expected === undefined ? elements.length : elements.filter(element =>
        element.getAttribute('data-agent-rp-source-session') === expected).length, sourceSessionId)
  }

  async clickAction(action: AgentRpCompatSmokeAction, sourceSessionId?: string): Promise<void> {
    this.markConsolePhase(this.launched ? 'interaction' : 'preflight')
    const candidates = await this.page.locator(`[data-agent-rp-action="${action}"]`).all()
    for (const candidate of candidates) {
      if (sourceSessionId !== undefined
        && await candidate.getAttribute('data-agent-rp-source-session') !== sourceSessionId) continue
      if (!await candidate.isVisible()) continue
      await candidate.click({ timeout: this.timeoutMs })
      return
    }
    throw new SmokeCommandError('interaction-missing')
  }

  async selectCharacter(characterId: string): Promise<void> {
    this.markConsolePhase('preflight')
    await this.page.waitForFunction(expected => [...document.querySelectorAll('[data-agent-rp-character-id]')]
      .some(element => element.getAttribute('data-agent-rp-character-id') === expected), characterId, {
      timeout: this.timeoutMs,
    })
    const candidates = await this.page.locator('[data-agent-rp-character-id]').all()
    for (const candidate of candidates) {
      if (await candidate.getAttribute('data-agent-rp-character-id') !== characterId) continue
      await candidate.click({ timeout: this.timeoutMs })
      await this.page.waitForFunction(expected => document.querySelector('[data-agent-rp-surface="character-library"]')
        ?.getAttribute('data-agent-rp-selected-character-id') === expected, characterId, { timeout: this.timeoutMs })
      return
    }
    throw new SmokeCommandError('selection-failed')
  }

  async selectPreset(presetId: string): Promise<void> {
    this.markConsolePhase('preflight')
    await this.page.waitForFunction(expected => [...document.querySelectorAll('#agent-rp-session-preset option')]
      .some(option => option.getAttribute('value') === expected), presetId, { timeout: this.timeoutMs })
    await this.page.locator('#agent-rp-session-preset').selectOption(presetId, { timeout: this.timeoutMs })
    await this.page.waitForFunction(expected => document.querySelector('[data-agent-rp-surface="character-library"]')
      ?.getAttribute('data-agent-rp-selected-preset-id') === expected, presetId, { timeout: this.timeoutMs })
  }

  async selectPermissionDuration(duration: AgentRpCompatSmokePermissionDuration): Promise<void> {
    this.markConsolePhase('preflight')
    await this.page.locator(`[data-agent-rp-permission-duration="${duration}"]`)
      .click({ timeout: this.timeoutMs })
    await this.page.waitForFunction(expected => document
      .querySelector('[data-agent-rp-resource-permission-duration]')
      ?.getAttribute('data-agent-rp-resource-permission-duration') === expected, duration, {
      timeout: this.timeoutMs,
    })
  }

  async startSession(): Promise<void> {
    this.markConsolePhase('runtime')
    await this.page.locator(
      '[data-agent-rp-start-action="approve-and-start"], [data-agent-rp-start-action="start"]',
    ).click({ timeout: this.timeoutMs })
    await this.page.waitForFunction(() => {
      const library = document.querySelector('[data-agent-rp-surface="character-library"]')
      return library === null || library.querySelector('[role="alert"]') !== null
    }, undefined, { timeout: this.timeoutMs })
    if (await this.page.locator('[data-agent-rp-surface="character-library"]').count() > 0) {
      throw new SmokeCommandError('session-launch-failed')
    }
    this.launched = true
  }
}

async function captureFailureScreenshot(page: Page | undefined): Promise<boolean> {
  if (page === undefined) return false
  try {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-agent-rp-smoke-'))
    await page.screenshot({ path: join(directory, 'failure.png'), fullPage: false })
    return true
  } catch {
    return false
  }
}

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes('--help')) {
    console.log(usage())
    return
  }
  const totalStarted = performance.now()
  const timingsMs: Record<string, number> = {}
  let decision: AgentRpCompatSmokeDecision = runnerFailure('runner-failed')
  let cardOutcome: CardImportOutcome = 'not-attempted'
  let presetOutcome: PresetImportOutcome = 'not-attempted'
  let reachable = false
  let consoleErrors = 0
  const consoleErrorKinds: Record<AgentRpCompatSmokeConsoleErrorKind, number> = {
    'resource-load': 0,
    'security-policy': 0,
    runtime: 0,
  }
  const emptyConsoleKinds = (): Record<AgentRpCompatSmokeConsoleErrorKind, number> => ({
    'resource-load': 0, 'security-policy': 0, runtime: 0,
  })
  const consoleErrorsByPhase: Record<
    AgentRpCompatSmokeConsolePhase,
    Record<AgentRpCompatSmokeConsoleErrorKind, number>
  > = {
    'client-load': emptyConsoleKinds(),
    preflight: emptyConsoleKinds(),
    runtime: emptyConsoleKinds(),
    interaction: emptyConsoleKinds(),
    teardown: emptyConsoleKinds(),
  }
  const securityPolicyReasons: Record<AgentRpCompatSmokeSecurityPolicyReason, number> = {
    'sandbox-script': 0,
    'script-source': 0,
    'style-source': 0,
    'connect-source': 0,
    'image-source': 0,
    'font-source': 0,
    'media-source': 0,
    'frame-source': 0,
    'cross-origin': 0,
    other: 0,
  }
  const consoleErrorSources: Record<AgentRpCompatSmokeConsoleSource, number> = {
    'host-document': 0,
    'srcdoc-frame': 0,
    'data-frame': 0,
    'blob-frame': 0,
    'external-document': 0,
    unknown: 0,
  }
  let consolePhase: AgentRpCompatSmokeConsolePhase = 'client-load'
  let pageErrors = 0
  let screenshot = false
  let snapshot: AgentRpBrowserCompatibilitySnapshot | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined
  try {
    const options = parseArgs(argv)
    const probeStarted = performance.now()
    await probePlugin(options)
    reachable = true
    timingsMs.serverProbe = roundedDuration(probeStarted)

    const cardStarted = performance.now()
    const card = await importCard(options)
    cardOutcome = card.outcome
    timingsMs.cardImport = roundedDuration(cardStarted)

    let preset: { readonly id: string; readonly outcome: PresetImportOutcome } | undefined
    if (options.presetPath === undefined) presetOutcome = 'not-requested'
    else {
      const presetStarted = performance.now()
      preset = await importPreset(options)
      presetOutcome = preset.outcome
      timingsMs.presetImport = roundedDuration(presetStarted)
    }

    await mkdir(options.profilePath, { recursive: true })
    const browserStarted = performance.now()
    context = await chromium.launchPersistentContext(options.profilePath, {
      executablePath: resolveBrowserExecutable(options.browserPath),
      headless: !options.headed,
      viewport: { width: 1440, height: 1000 },
    })
    page = context.pages()[0] ?? await context.newPage()
    page.on('console', message => {
      if (message.type() !== 'error') return
      const kind = classifyAgentRpSmokeConsoleError(message.text())
      consoleErrors += 1
      consoleErrorKinds[kind] += 1
      consoleErrorsByPhase[consolePhase][kind] += 1
      consoleErrorSources[classifyAgentRpSmokeConsoleSource(message.location().url, options.url.origin)] += 1
      if (kind === 'security-policy') {
        securityPolicyReasons[classifyAgentRpSmokeSecurityPolicyReason(message.text())] += 1
      }
    })
    page.on('pageerror', () => { pageErrors += 1 })
    await page.goto(options.url.href, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
    if (new URL(page.url()).origin !== options.url.origin) throw new SmokeCommandError('client-load-failed')
    const driver = new PlaywrightSmokeDriver(page, options.timeoutMs, phase => { consolePhase = phase })
    const result = await runAgentRpBrowserCompatibilitySmoke(driver, {
      characterId: card.id,
      ...(preset === undefined ? {} : { presetId: preset.id }),
      timeoutMs: options.timeoutMs,
      waitForManualApproval: options.headed,
      approvePreflight: options.approvePreflight,
      permissionDuration: options.permissionDuration,
    })
    decision = result.decision
    snapshot = result.snapshot
    timingsMs.browser = roundedDuration(browserStarted)
  } catch (error: unknown) {
    const stage = error instanceof SmokeCommandError ? error.stage : 'runner-failed'
    if (stage === 'server-unreachable' || stage === 'runner-failed') decision = runnerFailure(stage)
    else decision = failed(stage)
    if (stage === 'import-failed') {
      if (cardOutcome === 'not-attempted') cardOutcome = 'failed'
      else presetOutcome = 'failed'
    }
  } finally {
    consolePhase = 'teardown'
    if (decision.status !== 'healthy') screenshot = await captureFailureScreenshot(page)
    try {
      await context?.close()
    } catch {
      // The smoke report already records the lifecycle result; browser teardown has no card-safe detail to add.
    }
  }
  timingsMs.total = roundedDuration(totalStarted)
  const report: AgentRpCompatSmokeReport = {
    audit: 'agent-rp-compat-smoke-v0',
    ...decision,
    server: { mode: 'external', reachable },
    imports: { card: cardOutcome, preset: presetOutcome },
    browser: {
      consoleErrors,
      consoleErrorKinds,
      consoleErrorsByPhase,
      securityPolicyReasons,
      consoleErrorSources,
      consoleSignal: classifyAgentRpSmokeConsoleSignal(consoleErrorKinds, pageErrors),
      pageErrors,
      failureScreenshot: screenshot,
    },
    timingsMs,
    ...(snapshot === undefined ? {} : { snapshot }),
  }
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = decision.exitCode
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main(process.argv.slice(2))
}
