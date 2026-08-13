/** Same-origin HTTP surface for the local Character Card library. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { CharacterLibrary } from './character-library.ts'
import { CHARACTER_LIBRARY_PATH } from './character-library-protocol.ts'
import type { AgentRpHttpServer } from './host-http.ts'
import { MAX_CHARX_BYTES } from './import/charx.ts'

function trustedBrowserRequest(request: IncomingMessage, sandboxedImage: boolean): boolean {
  const host = request.headers.host
  if (host === undefined || host.trim() === '') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') {
    return sandboxedImage && request.headers['sec-fetch-dest'] === 'image'
      && request.headers['sec-fetch-mode'] === 'no-cors' && request.headers.origin === undefined
  }
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

function fail(response: ServerResponse, status: number, message: string): void {
  json(response, status, { error: message })
}

async function readUpload(request: IncomingMessage): Promise<Uint8Array> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_CHARX_BYTES) throw new Error('角色卡文件过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_CHARX_BYTES) throw new Error('角色卡文件过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('角色卡文件为空')
  return new Uint8Array(Buffer.concat(chunks))
}

function pathParts(request: IncomingMessage): readonly string[] {
  const pathname = new URL(request.url ?? '/', 'http://agent-rp.local').pathname
  if (pathname === CHARACTER_LIBRARY_PATH) return []
  if (!pathname.startsWith(`${CHARACTER_LIBRARY_PATH}/`)) return ['invalid']
  return pathname.slice(CHARACTER_LIBRARY_PATH.length + 1).split('/').map(decodeURIComponent)
}

/** Register local library reads plus reversible archive operations for the Roleplay UI. */
export function installCharacterLibraryHttp(ctx: Context, library: CharacterLibrary, server: AgentRpHttpServer): void {
  ctx.effect(() => server.register({
    kind: 'prefix',
    path: CHARACTER_LIBRARY_PATH,
    async handler(request, response) {
      const parts = pathParts(request)
      const sandboxedImage = parts.length === 3 && parts[0] !== undefined
        && parts[1] === 'images' && parts[2] !== undefined && /^\d+$/u.test(parts[2])
      if (!trustedBrowserRequest(request, sandboxedImage)) {
        fail(response, 403, 'forbidden')
        return
      }
      try {
        if (request.method === 'GET' && parts.length === 0) {
          const url = new URL(request.url ?? '/', 'http://agent-rp.local')
          const collection = url.searchParams.get('collection')
          if (collection !== null && collection !== 'active' && collection !== 'archived') {
            fail(response, 400, 'invalid character collection')
            return
          }
          json(response, 200, { format: 0, entries: library.list(collection ?? 'active') })
          return
        }
        if (request.method === 'GET' && parts.length === 1 && parts[0] !== undefined) {
          json(response, 200, { format: 0, entry: library.get(parts[0]) })
          return
        }
        if (request.method === 'POST' && parts.length === 1 && parts[0] === 'import') {
          const url = new URL(request.url ?? '/', 'http://agent-rp.local')
          const filename = url.searchParams.get('filename')?.trim()
          if (filename === undefined || filename === '') {
            fail(response, 400, '角色卡文件名缺失')
            return
          }
          const result = library.importFileWithOutcome({
            data: await readUpload(request),
            filename,
            ...(request.headers['content-type'] === undefined ? {} : { mediaType: request.headers['content-type'] }),
          })
          json(response, 200, { format: 0, ...result })
          return
        }
        if (request.method === 'POST' && parts.length === 2 && parts[0] !== undefined
          && (parts[1] === 'archive' || parts[1] === 'restore')) {
          const entry = parts[1] === 'archive' ? library.archive(parts[0]) : library.restore(parts[0])
          json(response, 200, { format: 0, entry })
          return
        }
        if (request.method === 'GET' && parts.length === 2 && parts[0] !== undefined && parts[1] === 'asset') {
          const asset = library.asset(parts[0])
          response.writeHead(200, {
            'cache-control': 'private, max-age=31536000, immutable',
            'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(asset.originalFilename)}`,
            'content-length': String(asset.data.byteLength),
            'content-type': asset.mediaType,
            'x-content-type-options': 'nosniff',
          })
          response.end(asset.data)
          return
        }
        if (request.method === 'GET' && parts.length === 2 && parts[0] !== undefined && parts[1] === 'avatar') {
          const avatar = library.avatar(parts[0])
          if (avatar === undefined) {
            fail(response, 404, 'avatar not found')
            return
          }
          response.writeHead(200, {
            'cache-control': 'private, max-age=31536000, immutable',
            'content-length': String(avatar.data.byteLength),
            'content-type': avatar.mediaType,
            'content-security-policy': "default-src 'none'; sandbox",
            'x-content-type-options': 'nosniff',
          })
          response.end(avatar.data)
          return
        }
        if (request.method === 'GET' && parts.length === 3 && parts[0] !== undefined && parts[1] === 'images' && parts[2] !== undefined) {
          const index = /^\d+$/u.test(parts[2]) ? Number(parts[2]) : Number.NaN
          const image = library.image(parts[0], index)
          if (image === undefined) {
            fail(response, 404, 'image not found')
            return
          }
          response.writeHead(200, {
            'cache-control': 'private, max-age=31536000, immutable',
            'content-length': String(image.data.byteLength),
            'content-type': image.mediaType,
            'content-security-policy': "default-src 'none'; sandbox",
            'x-content-type-options': 'nosniff',
          })
          response.end(image.data)
          return
        }
        if (request.method !== 'GET' && request.method !== 'POST') {
          response.setHeader('allow', 'GET, POST')
          fail(response, 405, 'method not allowed')
          return
        }
        fail(response, 404, 'not found')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        fail(response, /角色库中没有/u.test(message) ? 404 : /过大/u.test(message) ? 413 : 400, message)
      }
    },
  }), 'agent-rp: character library HTTP')
}
