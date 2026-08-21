/** Same-origin HTTP import surface for the local SillyTavern preset library. */

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
import { parseSillyTavernPresetBytes } from './import/sillytavern-preset.ts'
import { PresetLibrary } from './preset-library.ts'
import { PRESET_LIBRARY_PATH } from './preset-library-http-protocol.ts'

const MAX_PRESET_BYTES = 64 * 1024 * 1024

async function readUpload(request: IncomingMessage): Promise<Uint8Array> {
  return new Uint8Array(await readBoundedRequestBody(request, {
    limit: MAX_PRESET_BYTES,
    emptyMessage: '预设文件为空',
    tooLargeMessage: '预设文件过大',
  }))
}

async function readRename(request: IncomingMessage): Promise<string> {
  const value = await readJsonRequest(request, {
    limit: 8 * 1024,
    emptyMessage: '预设名称请求为空',
    tooLargeMessage: '预设名称请求过大',
    invalidMessage: '预设名称请求不是有效 JSON',
  })
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || typeof (value as Record<string, unknown>).name !== 'string') {
    throw new Error('预设名称请求缺少 name')
  }
  return (value as { readonly name: string }).name
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
        if (request.method === 'PATCH') {
          const id = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('id')
          if (id === null) {
            json(response, 400, { error: '预设库 id 缺失' })
            return
          }
          const { preset: _preset, ...entry } = library.rename(id, await readRename(request))
          json(response, 200, { format: 0, entry })
          return
        }
        if (request.method !== 'POST') {
          response.setHeader('allow', 'GET, POST, PATCH')
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
