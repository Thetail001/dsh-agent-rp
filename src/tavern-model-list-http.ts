/** User-approved OpenAI-compatible model discovery for isolated Tavern Helper scripts. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { AGENT_RP_CAPABILITIES } from './extension-capability.ts'
import {
  TAVERN_MODEL_LIST_PATH,
  type TavernModelListRequest,
  type TavernModelListResponse,
} from './tavern-generation-protocol.ts'

const MODEL_LIST_POLICY = AGENT_RP_CAPABILITIES['model.catalog.external.read']
  .runtimePolicies['tavern-script-frame-v0']
const MAX_REQUEST_BYTES = MODEL_LIST_POLICY.requestBytes
const MAX_RESPONSE_BYTES = MODEL_LIST_POLICY.resultBytes

function readJson(request: IncomingMessage): Promise<unknown> {
  return readJsonRequest(request, {
    limit: MAX_REQUEST_BYTES,
    emptyMessage: '模型列表请求为空',
    tooLargeMessage: '模型列表请求过大',
    invalidMessage: '模型列表请求不是有效 JSON',
  })
}

function request(value: unknown): TavernModelListRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('模型列表请求无效')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.apiurl !== 'string' || record.apiurl.trim() === ''
    || record.apiurl.length > 2_048 || (record.key !== undefined && (typeof record.key !== 'string' || record.key.length > 8_192))) {
    throw new Error('模型列表请求无效')
  }
  return { format: 0, apiurl: record.apiurl.trim(), ...(record.key === undefined ? {} : { key: record.key }) }
}

/** Resolve the OpenAI-compatible model endpoint accepted by Tavern Helper. */
export function tavernModelListEndpoint(value: string): URL {
  let result: URL
  try {
    result = new URL(value.trim())
  } catch (error: unknown) {
    throw new Error('API 地址无效', { cause: error })
  }
  if (result.protocol !== 'http:' && result.protocol !== 'https:') throw new Error('API 地址只支持 HTTP 或 HTTPS')
  if (result.username !== '' || result.password !== '') throw new Error('API 地址不能包含账号或密码')
  result.hash = ''
  result.search = ''
  if (/\/chat\/completions\/?$/u.test(result.pathname)) {
    result.pathname = result.pathname.replace(/\/chat\/completions\/?$/u, '/models')
  } else if (!/\/models\/?$/u.test(result.pathname)) {
    result.pathname = `${result.pathname.replace(/\/$/u, '')}/models`
  }
  return result
}

function modelNames(value: unknown): readonly string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('模型服务返回了无法识别的结果')
  const record = value as Record<string, unknown>
  const candidates = Array.isArray(record.data) ? record.data : Array.isArray(record.models) ? record.models : []
  return [...new Set(candidates.flatMap(item => {
    if (typeof item === 'string') return item.trim() === '' ? [] : [item.trim()]
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
    const entry = item as Record<string, unknown>
    const name = typeof entry.id === 'string' ? entry.id : typeof entry.name === 'string' ? entry.name : ''
    return name.trim() === '' ? [] : [name.trim()]
  }))].sort()
}

/** Query one approved model endpoint without retaining its API key. */
export async function fetchTavernModelList(
  input: TavernModelListRequest | unknown,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<TavernModelListResponse> {
  const parsed = request(input)
  const endpoint = tavernModelListEndpoint(parsed.apiurl)
  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
        ...(parsed.key === undefined || parsed.key === '' ? {} : { authorization: `Bearer ${parsed.key}` }),
      },
      signal,
    })
  } catch (error: unknown) {
    throw new Error(signal.aborted ? '模型服务连接超时' : '无法连接模型服务', { cause: error })
  }
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error('模型服务返回内容过大')
  }
  const body = await response.text()
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('模型服务返回内容过大')
  if (!response.ok) throw new Error(`模型服务请求失败（${response.status}）`)
  let value: unknown
  try {
    value = JSON.parse(body) as unknown
  } catch (error: unknown) {
    throw new Error('模型服务返回了无法识别的结果', { cause: error })
  }
  return { format: 0, models: modelNames(value) }
}

/** Register the model-list bridge used after an explicit per-script origin approval. */
export function installTavernModelListHttp(ctx: Context, server: AgentRpHttpServer): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: TAVERN_MODEL_LIST_PATH,
    async handler(incoming, response) {
      if (!trustedBrowserRequest(incoming)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (incoming.method !== 'POST') {
        response.setHeader('allow', 'POST')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        json(response, 200, await fetchTavernModelList(await readJson(incoming)))
      } catch (error: unknown) {
        json(response, 400, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'agent-rp: Tavern Helper model list HTTP')
}
