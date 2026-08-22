/** Same-origin upload surface for direct World Info imports. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  jsonResponse as json,
  readBoundedRequestBody,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { MAX_WORLD_INFO_JSON_BYTES } from './import/world-info.ts'
import { WorldInfoLibrary } from './world-info-library.ts'
import { WORLD_INFO_LIBRARY_PATH } from './world-info-library-protocol.ts'

async function readUpload(request: IncomingMessage): Promise<Uint8Array> {
  return new Uint8Array(await readBoundedRequestBody(request, {
    limit: MAX_WORLD_INFO_JSON_BYTES,
    emptyMessage: '世界书文件为空',
    tooLargeMessage: '世界书文件过大',
  }))
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
      if (request.method === 'PATCH') {
        try {
          const value = await readJsonRequest(request, {
            limit: 4 * 1024,
            emptyMessage: '世界书默认加载设置为空',
            tooLargeMessage: '世界书默认加载设置过大',
            invalidMessage: '世界书默认加载设置不是有效 JSON',
          })
          if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('世界书默认加载设置无效')
          const record = value as Record<string, unknown>
          if (record.format !== 0 || typeof record.id !== 'string'
            || typeof record.defaultForNewSessions !== 'boolean'
            || Object.keys(record).some(key => !['format', 'id', 'defaultForNewSessions'].includes(key))) {
            throw new Error('世界书默认加载设置字段无效')
          }
          json(response, 200, { format: 0, upload: library.setDefault(record.id, record.defaultForNewSessions) })
        } catch (error: unknown) {
          json(response, 400, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'GET, PATCH, POST')
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
