/** Same-origin HTTP surface for Agent RP workspace preferences. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { AGENT_RP_WORKSPACE_SETTINGS_PATH } from './workspace-settings.ts'
import { WorkspaceSettingsStore } from './workspace-settings-store.ts'

const MAX_SETTINGS_BYTES = 512 * 1024

async function readJson(request: IncomingMessage): Promise<unknown> {
  return readJsonRequest(request, {
    limit: MAX_SETTINGS_BYTES,
    emptyMessage: 'Agent RP 设置内容为空',
    tooLargeMessage: 'Agent RP 设置内容过大',
    invalidMessage: 'Agent RP 设置内容不是有效 JSON',
  })
}

/** Register durable reads and whole-document writes for plugin preferences. */
export function installWorkspaceSettingsHttp(
  ctx: Context,
  store: WorkspaceSettingsStore,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: AGENT_RP_WORKSPACE_SETTINGS_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      try {
        if (request.method === 'GET') {
          json(response, 200, { format: 0, settings: store.get() })
          return
        }
        if (request.method === 'PUT') {
          json(response, 200, { format: 0, settings: store.set(await readJson(request)) })
          return
        }
        response.setHeader('allow', 'GET, PUT')
        json(response, 405, { error: 'method not allowed' })
      } catch (error: unknown) {
        json(response, /过大/u.test(String(error)) ? 413 : 400, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }), 'agent-rp: workspace settings HTTP')
}
