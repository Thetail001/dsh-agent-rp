/** Same-origin browser client for installed-extension generation barriers. */

import {
  ST_EXTENSION_GENERATION_PATH,
  parseStExtensionGenerationRequest,
  type StExtensionGenerationCompletion,
  type StExtensionGenerationRequest,
} from '../st-extension-generation-protocol.ts'

/** Browser transport used by the singleton installed-extension document. */
export interface StExtensionGenerationClient {
  readonly clientId: string
  readonly poll: (sessionId: string, signal: AbortSignal) => Promise<StExtensionGenerationRequest | undefined>
  readonly complete: (completion: Omit<StExtensionGenerationCompletion, 'clientId'>) => Promise<void>
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const value = await response.json() as { readonly error?: unknown }
    if (typeof value.error === 'string' && value.error !== '') return new Error(value.error)
  } catch (_invalidJson) {
    // The status-specific fallback is sufficient for an unstructured Host response.
  }
  return new Error(`${fallback}（${response.status}）`)
}

/** Create one stable browser identity and its long-poll transport. */
export function createStExtensionGenerationClient(
  fetcher: typeof fetch = fetch,
  clientId: string = crypto.randomUUID(),
): StExtensionGenerationClient {
  if (clientId.trim() === '' || clientId.length > 512) {
    throw new Error('ST extension generation browser clientId is invalid')
  }
  return {
    clientId,
    async poll(sessionId, signal) {
      const query = new URLSearchParams({ sessionId, clientId })
      const response = await fetcher(`${ST_EXTENSION_GENERATION_PATH}?${query.toString()}`, {
        headers: { accept: 'application/json' },
        signal,
      })
      if (response.status === 204) return undefined
      if (!response.ok) throw await responseError(response, '扩展生成轮询失败')
      return parseStExtensionGenerationRequest(await response.json())
    },
    async complete(completion) {
      const response = await fetcher(ST_EXTENSION_GENERATION_PATH, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ ...completion, clientId }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw await responseError(response, '扩展生成完成回报失败')
    },
  }
}
