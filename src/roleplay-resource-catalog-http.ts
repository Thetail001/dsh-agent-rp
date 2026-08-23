/** Same-origin read-only HTTP surface for native Roleplay resource discovery. */

import type { Context } from '@deepseek-ai/cordis'
import {
  jsonResponse as json,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import type { RoleplayResourceCatalog } from './roleplay-resource-catalog.ts'
import { ROLEPLAY_RESOURCE_CATALOG_PATH } from './roleplay-resource-catalog-protocol.ts'

/** Register the content-free resource catalog snapshot endpoint. */
export function installRoleplayResourceCatalogHttp(
  ctx: Context,
  catalog: RoleplayResourceCatalog,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: ROLEPLAY_RESOURCE_CATALOG_PATH,
    handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method !== 'GET') {
        response.setHeader('allow', 'GET')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        json(response, 200, { format: 0, entries: catalog.list() })
      } catch (error: unknown) {
        json(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'agent-rp: resource catalog HTTP')
}
