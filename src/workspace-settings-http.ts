/** Same-origin HTTP surface for Agent RP workspace preferences. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AgentRpHttpServer } from './host-http.ts'
import { AGENT_RP_WORKSPACE_SETTINGS_PATH } from './workspace-settings.ts'
import { WorkspaceSettingsStore } from './workspace-settings-store.ts'

const MAX_SETTINGS_BYTES = 512 * 1024

function trustedBrowserRequest(request: IncomingMessage): boolean {
  const host = request.headers.host
  if (host === undefined || host.trim() === '' || request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(body)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_SETTINGS_BYTES) throw new Error('Agent RP 设置内容过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_SETTINGS_BYTES) throw new Error('Agent RP 设置内容过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('Agent RP 设置内容为空')
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
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
