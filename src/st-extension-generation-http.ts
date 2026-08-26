/** Same-origin long-poll transport for installed ST extension generation barriers. */

import type { Context } from '@deepseek-ai/cordis'
import {
  ST_EXTENSION_GENERATION_PATH,
  parseStExtensionGenerationCompletion,
} from './st-extension-generation-protocol.ts'
import type { StExtensionGenerationCoordinator } from './st-extension-generation.ts'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'

const MAX_COMPLETION_BYTES = 16 * 1024

function query(requestUrl: string | undefined): { readonly sessionId: string; readonly clientId: string } {
  const url = new URL(requestUrl ?? '', 'http://agent-rp.local')
  const sessionId = url.searchParams.get('sessionId') ?? ''
  const clientId = url.searchParams.get('clientId') ?? ''
  if (sessionId.trim() === '' || sessionId.length > 512 || clientId.trim() === '' || clientId.length > 512) {
    throw new Error('ST extension generation poll identity is invalid')
  }
  return { sessionId, clientId }
}

/** Register the browser wait and completion endpoint. */
export function installStExtensionGenerationHttp(
  routeCtx: Context,
  server: AgentRpHttpServer,
  coordinator: StExtensionGenerationCoordinator,
): void {
  routeCtx.effect(() => server.register({
    kind: 'exact',
    path: ST_EXTENSION_GENERATION_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method === 'GET') {
        const controller = new AbortController()
        const abortRequest = (): void => { controller.abort() }
        const abortResponse = (): void => {
          if (!response.writableEnded) controller.abort()
        }
        request.once('aborted', abortRequest)
        response.once('close', abortResponse)
        try {
          const identity = query(request.url)
          const generation = await coordinator.poll(identity.sessionId, identity.clientId, controller.signal)
          if (!response.destroyed) {
            if (generation === undefined) response.writeHead(204, { 'cache-control': 'no-store' }).end()
            else json(response, 200, generation)
          }
        } catch (error: unknown) {
          if (!response.destroyed) json(response, 400, { error: error instanceof Error ? error.message : String(error) })
        } finally {
          request.off('aborted', abortRequest)
          response.off('close', abortResponse)
        }
        return
      }
      if (request.method === 'POST') {
        try {
          const completion = parseStExtensionGenerationCompletion(await readJsonRequest(request, {
            limit: MAX_COMPLETION_BYTES,
            emptyMessage: 'ST extension generation completion is empty',
            tooLargeMessage: 'ST extension generation completion is too large',
            invalidMessage: 'ST extension generation completion is not valid JSON',
          }))
          coordinator.complete(completion)
          json(response, 200, { format: 0, completed: true })
        } catch (error: unknown) {
          json(response, 400, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      response.setHeader('allow', 'GET, POST')
      json(response, 405, { error: 'method not allowed' })
    },
  }), 'agent-rp: installed ST extension generation HTTP')
}
