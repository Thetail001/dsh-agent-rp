/** Same-origin upload surface for direct World Info imports. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AgentRpHttpServer } from './host-http.ts'
import { MAX_WORLD_INFO_JSON_BYTES } from './import/world-info.ts'
import { WorldInfoLibrary } from './world-info-library.ts'
import { WORLD_INFO_LIBRARY_PATH } from './world-info-library-protocol.ts'

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

async function readUpload(request: IncomingMessage): Promise<Uint8Array> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_WORLD_INFO_JSON_BYTES) throw new Error('世界书文件过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_WORLD_INFO_JSON_BYTES) throw new Error('世界书文件过大')
    chunks.push(data)
  }
  return new Uint8Array(Buffer.concat(chunks))
}

/** Register the browser upload used by the private World Info import command. */
export function installWorldInfoLibraryHttp(
  ctx: Context,
  library: WorldInfoLibrary,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: WORLD_INFO_LIBRARY_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method === 'GET') {
        json(response, 200, { format: 0, entries: library.list() })
        return
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'GET, POST')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        const filename = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('filename')?.trim()
        if (filename === undefined || filename === '') throw new Error('世界书文件名缺失')
        json(response, 200, { format: 0, upload: library.importFile({ data: await readUpload(request), filename }) })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: World Info upload HTTP')
}
