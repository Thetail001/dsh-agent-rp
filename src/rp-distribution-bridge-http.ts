/** Same-origin Host route for copying local Agent RP assets into dsh-rp-distribution. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { CharacterLibrary } from './character-library.ts'
import type { AgentRpHttpServer } from './host-http.ts'
import { exportSillyTavernPresetJson } from './preset-export.ts'
import { PersonaLibrary } from './persona-library.ts'
import { PresetLibrary } from './preset-library.ts'
import { WorldInfoLibrary } from './world-info-library.ts'
import {
  RP_DISTRIBUTION_ASSET_KINDS,
  RP_DISTRIBUTION_BRIDGE_PATH,
  type RpDistributionAssetKind,
  type RpDistributionTransferRequest,
} from './rp-distribution-bridge-protocol.ts'
import {
  probeRpDistribution,
  transferToRpDistribution,
  type RpDistributionImportPayload,
} from './rp-distribution-bridge.ts'

const MAX_REQUEST_BYTES = 16 * 1024

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
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new Error('RP 互通请求过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_REQUEST_BYTES) throw new Error('RP 互通请求过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('RP 互通请求为空')
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function transferRequest(value: unknown): RpDistributionTransferRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('RP 互通请求不是对象')
  const request = value as Record<string, unknown>
  if (request.format !== 0 || typeof request.target !== 'string' || typeof request.id !== 'string'
    || !RP_DISTRIBUTION_ASSET_KINDS.includes(request.kind as RpDistributionAssetKind)
    || Object.keys(request).some(key => !['format', 'target', 'kind', 'id'].includes(key))) {
    throw new Error('RP 互通请求字段无效')
  }
  return request as unknown as RpDistributionTransferRequest
}

function characterPayload(library: CharacterLibrary, id: string): RpDistributionImportPayload {
  const asset = library.asset(id)
  if (asset.summary.transport === 'json') {
    let source: string
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(asset.data)
    } catch (error: unknown) {
      throw new Error('角色卡 JSON 不是 UTF-8 文本', { cause: error })
    }
    return { kind: 'character-card-json', source, sourceId: asset.originalFilename }
  }
  return {
    kind: asset.summary.transport === 'png' ? 'character-card-png' : 'character-card-charx',
    base64: Buffer.from(asset.data).toString('base64'),
    sourceId: asset.originalFilename,
  }
}

function payloadFor(
  request: RpDistributionTransferRequest,
  characterLibrary: CharacterLibrary,
  presetLibrary: PresetLibrary,
  personaLibrary: PersonaLibrary,
  worldInfoLibrary: WorldInfoLibrary,
): RpDistributionImportPayload {
  if (request.kind === 'character') return characterPayload(characterLibrary, request.id)
  if (request.kind === 'preset') {
    const entry = presetLibrary.get(request.id)
    return { kind: 'preset', source: exportSillyTavernPresetJson(entry.preset), sourceId: `${entry.name}.json` }
  }
  if (request.kind === 'world-info') {
    const asset = worldInfoLibrary.asset(request.id)
    let source: string
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(asset.data)
    } catch (error: unknown) {
      throw new Error('世界书 JSON 不是 UTF-8 文本', { cause: error })
    }
    return { kind: 'world-info', source, sourceId: asset.filename }
  }
  const entry = personaLibrary.get(request.id)
  return {
    kind: 'persona',
    source: JSON.stringify({ name: entry.name, description: entry.description }),
    sourceId: `${entry.name}.json`,
  }
}

/** Register the loopback-only bridge used by the RP interoperability settings page. */
export function installRpDistributionBridgeHttp(
  ctx: Context,
  characterLibrary: CharacterLibrary,
  presetLibrary: PresetLibrary,
  personaLibrary: PersonaLibrary,
  worldInfoLibrary: WorldInfoLibrary,
  server: AgentRpHttpServer,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: RP_DISTRIBUTION_BRIDGE_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      try {
        if (request.method === 'GET') {
          const target = new URL(request.url ?? '/', 'http://agent-rp.local').searchParams.get('target')
          if (target === null) throw new Error('缺少模块化 RP 地址')
          json(response, 200, { format: 0, ...await probeRpDistribution(target) })
          return
        }
        if (request.method === 'POST') {
          const input = transferRequest(await readJson(request))
          const result = await transferToRpDistribution(
            input.target,
            payloadFor(input, characterLibrary, presetLibrary, personaLibrary, worldInfoLibrary),
          )
          json(response, 200, {
            format: 0,
            target: result.target,
            kind: input.kind,
            sourceId: input.id,
            savedIds: result.savedIds,
            compatibilityDifferenceCount: result.compatibilityDifferenceCount,
          })
          return
        }
        response.setHeader('allow', 'GET, POST')
        json(response, 405, { error: 'method not allowed' })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : /中没有/u.test(message) ? 404 : 400, { error: message })
      }
    },
  }), 'agent-rp: modular RP bridge HTTP')
}
