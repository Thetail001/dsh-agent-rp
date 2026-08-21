/** Static, non-executing Tavern Helper resource inspection for pre-launch permission planning. */

import type { ImportedTavernHelperScript } from './import/types.ts'
import {
  BUILT_IN_TAVERN_SCRIPT_ORIGINS, resolveTavernScriptExecution, TavernScriptOriginApprovalError,
  type TavernScriptExecution,
} from './tavern-script-resolver.ts'
import type {
  TavernPreflightEntry, TavernPreflightResult, TavernPreflightScope, TavernPreflightScriptApproval,
} from './tavern-preflight-protocol.ts'

/** One immutable script collection selected for a future Session. */
export interface TavernPreflightSource {
  readonly scope: TavernPreflightScope
  readonly ownerId: string
  readonly scripts: readonly ImportedTavernHelperScript[]
}

/** Resolver seam kept private to one Host-owned execution-plan cache. */
export type TavernScriptExecutionResolver = (
  content: string,
  signal: AbortSignal,
  additionalOrigins?: readonly string[],
) => Promise<TavernScriptExecution>

export interface TavernExecutionPlanIdentity {
  readonly scope: TavernPreflightScope
  readonly ownerId: string
  readonly scriptId: string
  readonly approvedOrigins: readonly string[]
}

interface CachedTavernExecutionPlan {
  readonly content: string
  readonly execution: TavernScriptExecution
}

function effectiveOrigins(additional: readonly string[]): readonly string[] {
  return [...new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...additional].map(origin => new URL(origin).origin))].sort()
}

/** Host LRU shared by launch preflight and the matching active Tavern runtimes. */
export class TavernExecutionPlanCache {
  private readonly plans = new Map<string, CachedTavernExecutionPlan>()

  constructor(
    private readonly resolver: TavernScriptExecutionResolver = resolveTavernScriptExecution,
    private readonly maximumEntries = 64,
  ) {}

  private key(identity: TavernExecutionPlanIdentity): string {
    return JSON.stringify([
      identity.scope,
      identity.ownerId,
      identity.scriptId,
      effectiveOrigins(identity.approvedOrigins),
    ])
  }

  /** Read and refresh one exact successful plan without touching its source library. */
  get(identity: TavernExecutionPlanIdentity): TavernScriptExecution | undefined {
    const key = this.key(identity)
    const cached = this.plans.get(key)
    if (cached === undefined) return undefined
    this.plans.delete(key)
    this.plans.set(key, cached)
    return cached.execution
  }

  /** Reuse one successful plan; permission waits and failures never enter the LRU. */
  async resolve(
    identity: TavernExecutionPlanIdentity,
    content: string,
    signal: AbortSignal,
  ): Promise<TavernScriptExecution> {
    const key = this.key(identity)
    const cached = this.plans.get(key)
    if (cached?.content === content) {
      this.plans.delete(key)
      this.plans.set(key, cached)
      return cached.execution
    }
    if (cached !== undefined) this.plans.delete(key)
    const execution = await this.resolver(content, signal, effectiveOrigins(identity.approvedOrigins))
    this.plans.set(key, { content, execution })
    while (this.plans.size > this.maximumEntries) this.plans.delete(this.plans.keys().next().value!)
    return execution
  }
}

function approvalKey(scope: TavernPreflightScope, scriptId: string): string {
  return JSON.stringify([scope, scriptId])
}

/** Inspect static module, image, stylesheet, and child-frame origins without evaluating script code. */
export async function inspectTavernPreflight(
  sources: readonly TavernPreflightSource[],
  approvals: readonly TavernPreflightScriptApproval[],
  signal: AbortSignal,
  plans = new TavernExecutionPlanCache(),
): Promise<TavernPreflightResult> {
  const originsByScript = new Map(approvals.map(approval => [
    approvalKey(approval.scope, approval.scriptId), approval.origins,
  ]))
  const selected = sources.flatMap(source => source.scripts.flatMap(script =>
    !script.enabled || script.content.trim() === '' ? [] : [{ source, script }]))
  const entries = await Promise.all(selected.map(async ({ source, script }): Promise<TavernPreflightEntry> => {
    const approvedOrigins = originsByScript.get(approvalKey(source.scope, script.id)) ?? []
    try {
      const execution = await plans.resolve({
        scope: source.scope,
        ownerId: source.ownerId,
        scriptId: script.id,
        approvedOrigins,
      }, script.content, signal)
      return {
        scope: source.scope,
        scriptId: script.id,
        scriptName: script.name,
        status: 'ready',
        remoteImageOrigins: execution.remoteImageOrigins ?? [],
        remoteStyleOrigins: execution.remoteStyleOrigins ?? [],
        remoteFrameOrigins: execution.remoteFrameOrigins ?? [],
      }
    } catch (reason: unknown) {
      return {
        scope: source.scope,
        scriptId: script.id,
        scriptName: script.name,
        status: reason instanceof TavernScriptOriginApprovalError ? 'permission-required' : 'resolution-error',
        ...(reason instanceof TavernScriptOriginApprovalError ? { requestedScriptOrigin: reason.origin } : {}),
        remoteImageOrigins: [],
        remoteStyleOrigins: [],
        remoteFrameOrigins: [],
      }
    }
  }))
  return {
    format: 0,
    scripts: entries.length,
    ready: entries.filter(entry => entry.status === 'ready').length,
    permissionRequired: entries.filter(entry => entry.status === 'permission-required').length,
    failed: entries.filter(entry => entry.status === 'resolution-error').length,
    entries,
  }
}
