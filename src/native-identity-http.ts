/** Same-origin management and attestation surface for the Host-owned native identity. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { NativeIdentityStore } from './native-identity.ts'
import {
  AGENT_RP_NATIVE_IDENTITY_PATH,
  parseNativeIdentityAttestationInput,
} from './native-identity-protocol.ts'

const MAX_NATIVE_IDENTITY_REQUEST_BYTES = 16 * 1024

function readJson(request: IncomingMessage): Promise<unknown> {
  return readJsonRequest(request, {
    limit: MAX_NATIVE_IDENTITY_REQUEST_BYTES,
    emptyMessage: '本机身份请求为空',
    tooLargeMessage: '本机身份请求过大',
    invalidMessage: '本机身份请求不是有效 JSON',
  })
}

function requestPath(request: IncomingMessage): string {
  const pathname = new URL(request.url ?? '/', 'http://agent-rp.local').pathname
  return pathname.startsWith(`${AGENT_RP_NATIVE_IDENTITY_PATH}/`)
    ? pathname.slice(AGENT_RP_NATIVE_IDENTITY_PATH.length + 1) : ''
}

/** Register native identity profile management and short-lived proof issuance. */
export function installNativeIdentityHttp(
  ctx: Context,
  store: NativeIdentityStore,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'prefix',
    path: AGENT_RP_NATIVE_IDENTITY_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      try {
        const path = requestPath(request)
        if (request.method === 'GET' && path === 'profile') {
          json(response, 200, { format: 0, identity: await store.get() ?? null })
          return
        }
        if (request.method === 'PUT' && path === 'profile') {
          const body = await readJson(request)
          if (typeof body !== 'object' || body === null || Array.isArray(body)
            || Object.keys(body).some(key => key !== 'displayName')
            || typeof (body as Record<string, unknown>).displayName !== 'string') {
            throw new Error('本机身份资料请求无效')
          }
          json(response, 200, {
            format: 0,
            identity: await store.setDisplayName((body as { readonly displayName: string }).displayName),
          })
          return
        }
        if (request.method === 'POST' && path === 'attest') {
          const input = parseNativeIdentityAttestationInput(await readJson(request))
          if (input === undefined) throw new Error('本机身份签名请求无效')
          json(response, 200, { format: 0, result: await store.issue(input) })
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
        json(response, /过大/u.test(message) ? 413 : /请先/u.test(message) ? 409 : 400, { error: message })
      }
    },
  }), 'agent-rp: native identity HTTP')
}
