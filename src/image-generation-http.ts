/** Same-origin HTTP surface for generated image jobs and their credential. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { GeneratedImageLibrary } from './generated-image-library.ts'
import { cancelGeneratedImageJob } from './image-generation-command.ts'
import { testImageProvider } from './image-generation-providers.ts'
import {
  AGENT_RP_IMAGE_PATH,
  imageCredentialRefName,
  isImageJobId,
  type CredentialedImageProvider,
} from './image-generation-protocol.ts'
import type { AgentRpHttpServer } from './host-http.ts'
import { AGENT_RP_IMAGE_PROVIDERS, normalizeImageGenerationSettings } from './workspace-settings.ts'

const MAX_CREDENTIAL_REQUEST_BYTES = 16 * 1024
const MAX_TEST_REQUEST_BYTES = 512 * 1024

function requestProvider(request: IncomingMessage): CredentialedImageProvider {
  const value = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('provider') ?? 'openai'
  if (!AGENT_RP_IMAGE_PROVIDERS.includes(value as CredentialedImageProvider)) throw new Error('图片提供方无效')
  return value as CredentialedImageProvider
}

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

async function readJsonRequest(request: IncomingMessage, limit: number): Promise<unknown> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > limit) throw new Error('图片服务请求过大')
    chunks.push(data)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

async function readCredentialRequest(request: IncomingMessage): Promise<{ readonly value?: string; readonly clear?: true }> {
  const value = await readJsonRequest(request, MAX_CREDENTIAL_REQUEST_BYTES)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('图片密钥请求无效')
  const record = value as Record<string, unknown>
  if (record.clear === true && record.value === undefined) return { clear: true }
  if (typeof record.value !== 'string' || record.value.trim() === '' || record.value.length > 8_000) {
    throw new Error('图片密钥不能为空')
  }
  return { value: record.value.trim() }
}

function parts(request: IncomingMessage): readonly string[] {
  const pathname = new URL(request.url ?? '/', 'http://agent-rp.local').pathname
  if (pathname === AGENT_RP_IMAGE_PATH) return []
  if (!pathname.startsWith(`${AGENT_RP_IMAGE_PATH}/`)) return ['invalid']
  return pathname.slice(AGENT_RP_IMAGE_PATH.length + 1).split('/').map(decodeURIComponent)
}

/** Register job metadata, cancellation, image reads, and write-only credential management. */
export function installImageGenerationHttp(
  ctx: Context,
  library: GeneratedImageLibrary,
  credentials: CredentialProvider,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'prefix',
    path: AGENT_RP_IMAGE_PATH,
    async handler(request, response) {
      const path = parts(request)
      const sandboxedImage = path.length === 3 && path[0] === 'jobs' && path[2] === 'asset'
      if (!trustedBrowserRequest(request, sandboxedImage)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      try {
        if (request.method === 'GET' && path.length === 1 && path[0] === 'credential') {
          const ref = credentialRef(imageCredentialRefName(requestProvider(request)))
          json(response, 200, { format: 0, credential: await credentials.describe(ref) })
          return
        }
        if (request.method === 'PUT' && path.length === 1 && path[0] === 'credential') {
          const ref = credentialRef(imageCredentialRefName(requestProvider(request)))
          const change = await readCredentialRequest(request)
          if (change.clear === true) await credentials.unset(ref)
          else await credentials.set(ref, change.value!)
          json(response, 200, { format: 0, credential: await credentials.describe(ref) })
          return
        }
        if (request.method === 'POST' && path.length === 1 && path[0] === 'test') {
          const settings = normalizeImageGenerationSettings(await readJsonRequest(request, MAX_TEST_REQUEST_BYTES))
          const credential = await credentials.resolve(credentialRef(imageCredentialRefName(settings.provider)))
          const timeout = AbortSignal.timeout(12_000)
          json(response, 200, { format: 0, test: await testImageProvider(settings, credential?.value, timeout) })
          return
        }
        if (path.length >= 2 && path[0] === 'jobs' && path[1] !== undefined && !isImageJobId(path[1])) {
          json(response, 400, { error: '图片任务 id 无效' })
          return
        }
        if (request.method === 'GET' && path.length === 2 && path[0] === 'jobs' && path[1] !== undefined) {
          json(response, 200, { format: 0, job: library.get(path[1]) })
          return
        }
        if (request.method === 'POST' && path.length === 3 && path[0] === 'jobs'
          && path[1] !== undefined && path[2] === 'cancel') {
          const job = library.get(path[1])
          const cancelled = cancelGeneratedImageJob(path[1])
          json(response, cancelled ? 202 : 200, { format: 0, job, cancelled })
          return
        }
        if (request.method === 'GET' && path.length === 3 && path[0] === 'jobs'
          && path[1] !== undefined && path[2] === 'asset') {
          const asset = library.asset(path[1])
          const url = new URL(request.url ?? '/', 'http://agent-rp.local')
          const extension = asset.mediaType === 'image/jpeg' ? 'jpg' : asset.mediaType.slice('image/'.length)
          const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline'
          response.writeHead(200, {
            'cache-control': 'private, max-age=31536000, immutable',
            'content-disposition': `${disposition}; filename="roleplay-${path[1]}.${extension}"`,
            'content-length': String(asset.data.byteLength),
            'content-security-policy': "default-src 'none'; sandbox",
            'content-type': asset.mediaType,
            'x-content-type-options': 'nosniff',
          })
          response.end(asset.data)
          return
        }
        if (!['GET', 'POST', 'PUT'].includes(request.method ?? '')) {
          response.setHeader('allow', 'GET, POST, PUT')
          json(response, 405, { error: 'method not allowed' })
          return
        }
        json(response, 404, { error: 'not found' })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /没有找到图片任务/u.test(message) ? 404 : /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: image generation HTTP')
}
