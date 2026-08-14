/** Same-origin HTTP import surface for the local SillyTavern preset library. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AgentRpHttpServer } from './host-http.ts'
import { parseSillyTavernPresetBytes } from './import/sillytavern-preset.ts'
import { PresetLibrary } from './preset-library.ts'
import { PRESET_LIBRARY_PATH } from './preset-library-http-protocol.ts'

const MAX_PRESET_BYTES = 64 * 1024 * 1024

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
  if (Number.isFinite(declared) && declared > MAX_PRESET_BYTES) throw new Error('预设文件过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_PRESET_BYTES) throw new Error('预设文件过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('预设文件为空')
  return new Uint8Array(Buffer.concat(chunks))
}

/** Register model-free preset listing and upload routes for the Roleplay UI. */
export function installPresetLibraryHttp(ctx: Context, library: PresetLibrary, server: AgentRpHttpServer): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: PRESET_LIBRARY_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      try {
        if (request.method === 'GET') {
          json(response, 200, { format: 0, entries: library.list() })
          return
        }
        if (request.method !== 'POST') {
          response.setHeader('allow', 'GET, POST')
          json(response, 405, { error: 'method not allowed' })
          return
        }
        const filename = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('filename')?.trim()
        if (filename === undefined || filename === '' || !/\.json$/iu.test(filename)) {
          json(response, 400, { error: '请选择 SillyTavern 预设 JSON 文件' })
          return
        }
        const preset = parseSillyTavernPresetBytes(await readUpload(request), filename)
        json(response, 200, { format: 0, entry: library.import(preset) })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: preset library HTTP')
}
