/** Same-origin upload surface for model-free SillyTavern chat migration. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AgentRpHttpServer } from './host-http.ts'
import { MAX_SILLYTAVERN_CHAT_BYTES, SillyTavernChatLibrary } from './sillytavern-chat-library.ts'
import { SILLYTAVERN_CHAT_PATH } from './sillytavern-chat-protocol.ts'

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
  if (Number.isFinite(declared) && declared > MAX_SILLYTAVERN_CHAT_BYTES) throw new Error('聊天记录文件过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_SILLYTAVERN_CHAT_BYTES) throw new Error('聊天记录文件过大')
    chunks.push(data)
  }
  return new Uint8Array(Buffer.concat(chunks))
}

/** Register the one-shot browser upload used by the private migration command. */
export function installSillyTavernChatHttp(
  ctx: Context,
  library: SillyTavernChatLibrary,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'prefix',
    path: SILLYTAVERN_CHAT_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'POST')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        const url = new URL(request.url ?? '/', 'http://agent-rp.local')
        const filename = url.searchParams.get('filename')?.trim()
        if (filename === undefined || filename === '') throw new Error('聊天记录文件名缺失')
        json(response, 200, { format: 0, upload: library.importFile({ data: await readUpload(request), filename }) })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: SillyTavern chat upload HTTP')
}
