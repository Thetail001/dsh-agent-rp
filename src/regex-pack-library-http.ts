/** Same-origin import surface for the local regex-pack library. */

import type { Context } from '@deepseek-ai/cordis'
import {
  jsonResponse as json,
  readBoundedRequestBody,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { RegexPackLibrary } from './regex-pack-library.ts'
import { MAX_REGEX_PACK_BYTES, REGEX_PACK_LIBRARY_PATH } from './regex-pack-library-protocol.ts'

/** Register model-free list, upload, and removal routes. */
export function installRegexPackLibraryHttp(ctx: Context, library: RegexPackLibrary, server: AgentRpHttpServer): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: REGEX_PACK_LIBRARY_PATH,
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
        if (request.method === 'DELETE') {
          const id = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('id')
          if (id === null) {
            json(response, 400, { error: '正则包库 id 缺失' })
            return
          }
          library.delete(id)
          json(response, 200, { format: 0, id })
          return
        }
        if (request.method !== 'POST') {
          response.setHeader('allow', 'DELETE, GET, POST')
          json(response, 405, { error: 'method not allowed' })
          return
        }
        const filename = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('filename')?.trim()
        if (filename === undefined || filename === '') {
          json(response, 400, { error: '正则包文件名缺失' })
          return
        }
        const data = new Uint8Array(await readBoundedRequestBody(request, {
          limit: MAX_REGEX_PACK_BYTES,
          emptyMessage: '正则包文件为空',
          tooLargeMessage: '正则包文件超过 2 MiB',
        }))
        const { scripts: _scripts, ...entry } = library.importFile({ data, filename })
        json(response, 200, { format: 0, entry })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /超过 2 MiB/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: regex-pack library HTTP')
}
