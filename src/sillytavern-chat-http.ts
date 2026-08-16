/** Same-origin upload surface for model-free SillyTavern chat migration. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  jsonResponse as json,
  readBoundedRequestBody,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { MAX_SILLYTAVERN_CHAT_BYTES, SillyTavernChatLibrary } from './sillytavern-chat-library.ts'
import { SILLYTAVERN_CHAT_PATH } from './sillytavern-chat-protocol.ts'

async function readUpload(request: IncomingMessage): Promise<Uint8Array> {
  return new Uint8Array(await readBoundedRequestBody(request, {
    limit: MAX_SILLYTAVERN_CHAT_BYTES,
    emptyMessage: '聊天记录文件为空',
    tooLargeMessage: '聊天记录文件过大',
  }))
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
