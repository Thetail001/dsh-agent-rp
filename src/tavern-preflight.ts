/** Static, non-executing Tavern Helper resource inspection for pre-launch permission planning. */

import type { ImportedTavernHelperScript } from './import/types.ts'
import {
  resolveTavernScriptExecution, TavernScriptOriginApprovalError,
} from './tavern-script-resolver.ts'
import type {
  TavernPreflightEntry, TavernPreflightResult, TavernPreflightScope, TavernPreflightScriptApproval,
} from './tavern-preflight-protocol.ts'

/** One immutable script collection selected for a future Session. */
export interface TavernPreflightSource {
  readonly scope: TavernPreflightScope
  readonly scripts: readonly ImportedTavernHelperScript[]
}

function approvalKey(scope: TavernPreflightScope, scriptId: string): string {
  return JSON.stringify([scope, scriptId])
}

/** Inspect static dependencies and image origins without evaluating script code. */
export async function inspectTavernPreflight(
  sources: readonly TavernPreflightSource[],
  approvals: readonly TavernPreflightScriptApproval[],
  signal: AbortSignal,
): Promise<TavernPreflightResult> {
  const originsByScript = new Map(approvals.map(approval => [
    approvalKey(approval.scope, approval.scriptId), approval.origins,
  ]))
  const entries: TavernPreflightEntry[] = []
  for (const source of sources) for (const script of source.scripts) {
    if (!script.enabled || script.content.trim() === '') continue
    try {
      const execution = await resolveTavernScriptExecution(
        script.content,
        signal,
        originsByScript.get(approvalKey(source.scope, script.id)) ?? [],
      )
      entries.push({
        scope: source.scope,
        scriptId: script.id,
        scriptName: script.name,
        status: 'ready',
        remoteImageOrigins: execution.remoteImageOrigins ?? [],
        remoteFrameOrigins: execution.remoteFrameOrigins ?? [],
      })
    } catch (reason: unknown) {
      entries.push({
        scope: source.scope,
        scriptId: script.id,
        scriptName: script.name,
        status: reason instanceof TavernScriptOriginApprovalError ? 'permission-required' : 'resolution-error',
        ...(reason instanceof TavernScriptOriginApprovalError ? { requestedScriptOrigin: reason.origin } : {}),
        remoteImageOrigins: [],
        remoteFrameOrigins: [],
      })
    }
  }
  return {
    format: 0,
    scripts: entries.length,
    ready: entries.filter(entry => entry.status === 'ready').length,
    permissionRequired: entries.filter(entry => entry.status === 'permission-required').length,
    failed: entries.filter(entry => entry.status === 'resolution-error').length,
    entries,
  }
}
