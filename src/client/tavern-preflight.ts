/** Browser client for bounded Tavern Helper resource preflight. */

import {
  TAVERN_EXECUTION_PATH,
  TAVERN_PREFLIGHT_PATH,
  type TavernExecutionRequest,
  type TavernExecutionResult,
  type TavernPreflightRequest,
  type TavernPreflightResult,
} from '../tavern-preflight-protocol.ts'
import type { TavernScriptExecution } from '../tavern-script-resolver.ts'

/** A newly encountered HTTPS origin that still needs player approval. */
export class TavernExecutionOriginApprovalError extends Error {
  readonly origin: string

  constructor(origin: string) {
    super(`远程脚本来源需要授权：${origin}`)
    this.name = 'TavernExecutionOriginApprovalError'
    this.origin = origin
  }
}

function stringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function validExecution(value: unknown): value is TavernScriptExecution {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const execution = value as Partial<TavernScriptExecution>
  return typeof execution.source === 'string'
    && (execution.mode === 'classic' || execution.mode === 'module')
    && (execution.inlineDependencies === undefined || stringArray(execution.inlineDependencies))
    && Array.isArray(execution.preloads)
    && execution.preloads.every(item => [
      'compare-versions', 'json5', 'jsonrepair', 'klona', 'pinia', 'vue', 'yaml', 'zod',
    ].includes(item))
    && typeof execution.needsDomPurify === 'boolean'
    && typeof execution.needsFuse === 'boolean'
    && stringArray(execution.compatibilityMarkers)
    && (execution.remoteImageOrigins === undefined || stringArray(execution.remoteImageOrigins))
    && (execution.remoteStyleOrigins === undefined || stringArray(execution.remoteStyleOrigins))
    && (execution.remoteFrameOrigins === undefined || stringArray(execution.remoteFrameOrigins))
    && (execution.moduleDependencies === undefined || (Array.isArray(execution.moduleDependencies)
      && execution.moduleDependencies.every(module => typeof module === 'object' && module !== null
        && !Array.isArray(module) && typeof module.id === 'string' && typeof module.placeholder === 'string'
        && typeof module.source === 'string' && stringArray(module.dependencies))))
}

/** Discover external script resources before creating a Session. */
export async function fetchTavernPreflight(
  request: TavernPreflightRequest,
  signal: AbortSignal,
): Promise<TavernPreflightResult> {
  const response = await fetch(TAVERN_PREFLIGHT_PATH, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  const value = await response.json() as Partial<TavernPreflightResult> & { readonly error?: string }
  if (!response.ok || value.format !== 0 || !Array.isArray(value.entries)
    || typeof value.scripts !== 'number' || typeof value.ready !== 'number'
    || typeof value.permissionRequired !== 'number' || typeof value.failed !== 'number') {
    throw new Error(value.error ?? `界面资源预检失败（${response.status}）`)
  }
  return value as TavernPreflightResult
}

/** Fetch a Host-resolved execution plan so the browser never reloads its remote ESM graph. */
export async function fetchTavernExecution(
  request: TavernExecutionRequest,
  signal: AbortSignal,
): Promise<TavernScriptExecution> {
  const response = await fetch(TAVERN_EXECUTION_PATH, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  const value = await response.json() as Partial<TavernExecutionResult> & {
    readonly error?: string
    readonly requestedOrigin?: string
  }
  if (response.status === 409 && typeof value.requestedOrigin === 'string') {
    throw new TavernExecutionOriginApprovalError(value.requestedOrigin)
  }
  if (!response.ok || value.format !== 0 || !validExecution(value.execution)) {
    throw new Error(value.error ?? `脚本执行计划读取失败（${response.status}）`)
  }
  return value.execution
}
