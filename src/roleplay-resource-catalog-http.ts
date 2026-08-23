/** Same-origin read-only HTTP surface for native Roleplay resource discovery. */

import type { Context } from '@deepseek-ai/cordis'
import {
  jsonResponse as json,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import type { RoleplayResourceCatalog } from './roleplay-resource-catalog.ts'
import {
  ROLEPLAY_RESOURCE_CATALOG_PATH,
  ROLEPLAY_RESOURCE_KINDS,
  type RoleplayResourceKind,
} from './roleplay-resource-catalog-protocol.ts'

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
        const search = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams
        const kind = search.get('kind')
        const id = search.get('id')
        if (kind === null && id === null) {
          json(response, 200, { format: 0, entries: catalog.list() })
          return
        }
        if (kind === null || id === null || id === ''
          || !ROLEPLAY_RESOURCE_KINDS.includes(kind as RoleplayResourceKind)) {
          json(response, 400, { error: 'invalid resource detail reference' })
          return
        }
        const descriptor = catalog.get(kind as RoleplayResourceKind, id)
        if (descriptor === undefined) {
          json(response, 404, { error: 'resource not found' })
          return
        }
        json(response, 200, {
          format: 0,
          descriptor,
          detail: catalog.inspect(kind as RoleplayResourceKind, id),
        })
      } catch (error: unknown) {
        json(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'agent-rp: resource catalog HTTP')
}
