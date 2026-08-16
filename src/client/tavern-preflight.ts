/** Browser client for bounded Tavern Helper resource preflight. */

import {
  TAVERN_PREFLIGHT_PATH,
  type TavernPreflightRequest,
  type TavernPreflightResult,
} from '../tavern-preflight-protocol.ts'

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
