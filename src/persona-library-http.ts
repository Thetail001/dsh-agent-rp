/** Same-origin HTTP surface for the local Persona library. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { PersonaLibrary } from './persona-library.ts'
import { PERSONA_LIBRARY_PATH, type PersonaLibrarySaveRequest } from './persona-library-protocol.ts'

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
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > 16_384) throw new Error('Persona 请求过大')
    chunks.push(data)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function parseSaveRequest(value: unknown): PersonaLibrarySaveRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Persona 请求不是对象')
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (record.format !== 0 || typeof record.name !== 'string' || typeof record.description !== 'string'
    || (record.id !== undefined && typeof record.id !== 'string')
    || keys.some(key => key !== 'format' && key !== 'id' && key !== 'name' && key !== 'description')) {
    throw new Error('Persona 请求字段无效')
  }
  return record as unknown as PersonaLibrarySaveRequest
}

/** Register local Persona list, read, create, and update operations. */
export function installPersonaLibraryHttp(ctx: Context, library: PersonaLibrary): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: PERSONA_LIBRARY_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      const pathname = new URL(request.url ?? '/', 'http://agent-rp.local').pathname
      const suffix = pathname === PERSONA_LIBRARY_PATH ? '' : pathname.slice(PERSONA_LIBRARY_PATH.length + 1)
      try {
        if (request.method === 'GET' && suffix === '') {
          json(response, 200, { format: 0, entries: library.list() })
          return
        }
        if (request.method === 'GET' && suffix !== '' && !suffix.includes('/')) {
          json(response, 200, { format: 0, entry: library.get(decodeURIComponent(suffix)) })
          return
        }
        if (request.method === 'POST' && suffix === '') {
          json(response, 200, { format: 0, entry: library.save(parseSaveRequest(await readJson(request))) })
          return
        }
        response.setHeader('allow', 'GET, POST')
        json(response, request.method === 'GET' || request.method === 'POST' ? 404 : 405, { error: 'not found' })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /库中没有/u.test(message) ? 404 : 400, { error: message })
      }
    },
  }), 'agent-rp: Persona library HTTP')
}
