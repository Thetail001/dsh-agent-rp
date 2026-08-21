/** Same-origin Host route for copying local Agent RP assets into dsh-rp-distribution. */

import type { IncomingMessage } from 'node:http'
import { basename } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { CharacterLibrary } from './character-library.ts'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { exportSillyTavernPresetJson } from './preset-export.ts'
import { parseSillyTavernPresetBytes } from './import/sillytavern-preset.ts'
import { PersonaLibrary } from './persona-library.ts'
import { PresetLibrary } from './preset-library.ts'
import { SillyTavernChatLibrary } from './sillytavern-chat-library.ts'
import { WorldInfoLibrary } from './world-info-library.ts'
import {
  RP_DISTRIBUTION_ASSET_KINDS,
  RP_DISTRIBUTION_BRIDGE_PATH,
  type RpDistributionAssetImportRequest,
  type RpDistributionChatImportRequest,
  type RpDistributionAssetKind,
  type RpDistributionTransferRequest,
} from './rp-distribution-bridge-protocol.ts'
import {
  exportRpDistributionChat,
  probeRpDistribution,
  readRpDistributionSource,
  transferToRpDistribution,
  type RpDistributionFetch,
  type RpDistributionImportPayload,
} from './rp-distribution-bridge.ts'

const MAX_REQUEST_BYTES = 16 * 1024

function chatImportRequest(value: unknown): RpDistributionChatImportRequest | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const request = value as Record<string, unknown>
  if (request.operation !== 'import-chat') return undefined
  if (request.format !== 0 || typeof request.target !== 'string' || typeof request.sessionId !== 'string'
    || Object.keys(request).some(key => !['format', 'operation', 'target', 'sessionId'].includes(key))) {
    throw new Error('RP 会话迁移请求字段无效')
  }
  return request as unknown as RpDistributionChatImportRequest
}

function assetImportRequest(value: unknown): RpDistributionAssetImportRequest | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const request = value as Record<string, unknown>
  if (request.operation !== 'import-asset') return undefined
  if (request.format !== 0 || typeof request.target !== 'string' || typeof request.id !== 'string'
    || !RP_DISTRIBUTION_ASSET_KINDS.includes(request.kind as RpDistributionAssetKind)
    || Object.keys(request).some(key => !['format', 'operation', 'target', 'kind', 'id'].includes(key))) {
    throw new Error('RP 资产迁移请求字段无效')
  }
  return request as unknown as RpDistributionAssetImportRequest
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  return readJsonRequest(request, {
    limit: MAX_REQUEST_BYTES,
    emptyMessage: 'RP 互通请求为空',
    tooLargeMessage: 'RP 互通请求过大',
    invalidMessage: 'RP 互通请求不是有效 JSON',
  })
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

function jsonFilename(sourceId: string, fallback: string): string {
  const name = basename(sourceId.trim()).slice(0, 240)
  if (name === '') return fallback
  return /\.json$/iu.test(name) ? name : `${name}.json`
}

function personaSource(source: string): { readonly format: 0; readonly name: string; readonly description: string } {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('模块化 RP Persona 来源不是 JSON', { cause: error })
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('模块化 RP Persona 来源不是对象')
  }
  const entry = value as Record<string, unknown>
  if (typeof entry.name !== 'string' || typeof entry.description !== 'string') {
    throw new Error('模块化 RP Persona 来源字段无效')
  }
  return { format: 0, name: entry.name, description: entry.description }
}

/** Copy one retained remote JSON source through the receiving Agent RP library parser. */
export async function receiveRpDistributionAsset(
  request: RpDistributionAssetImportRequest,
  characterLibrary: CharacterLibrary,
  presetLibrary: PresetLibrary,
  personaLibrary: PersonaLibrary,
  worldInfoLibrary: WorldInfoLibrary,
  fetcher: RpDistributionFetch = fetch,
): Promise<{ readonly target: string; readonly savedId: string; readonly name: string }> {
  const portable = await readRpDistributionSource(request.target, request.kind, request.id, fetcher)
  const data = new TextEncoder().encode(portable.source)
  if (request.kind === 'character') {
    const entry = characterLibrary.importFile({
      data,
      filename: jsonFilename(portable.sourceId, 'character.json'),
      mediaType: 'application/json',
    })
    return { target: portable.target, savedId: entry.id, name: entry.displayName }
  }
  if (request.kind === 'preset') {
    const preset = parseSillyTavernPresetBytes(data, jsonFilename(portable.sourceId, 'preset.json'))
    const entry = presetLibrary.import(preset)
    return { target: portable.target, savedId: entry.id, name: entry.name }
  }
  if (request.kind === 'persona') {
    const entry = personaLibrary.save(personaSource(portable.source))
    return { target: portable.target, savedId: entry.id, name: entry.name }
  }
  const upload = worldInfoLibrary.importFile({
    data,
    filename: jsonFilename(portable.sourceId, 'world-info.json'),
  })
  return { target: portable.target, savedId: upload.id, name: upload.name }
}

/** Register the loopback-only bridge used by the RP interoperability settings page. */
export function installRpDistributionBridgeHttp(
  ctx: Context,
  characterLibrary: CharacterLibrary,
  presetLibrary: PresetLibrary,
  personaLibrary: PersonaLibrary,
  worldInfoLibrary: WorldInfoLibrary,
  chatLibrary: SillyTavernChatLibrary,
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
          const value = await readJson(request)
          const chat = chatImportRequest(value)
          if (chat !== undefined) {
            const exported = await exportRpDistributionChat(chat.target, chat.sessionId)
            const upload = chatLibrary.importFile({
              data: new TextEncoder().encode(exported.source),
              filename: exported.filename,
            })
            json(response, 200, {
              format: 0,
              operation: 'import-chat',
              target: exported.target,
              sourceSessionId: exported.sourceSessionId,
              importId: upload.id,
              filename: upload.name,
              messageCount: upload.messageCount,
              characterName: exported.characterName,
              userName: exported.userName,
            })
            return
          }
          const asset = assetImportRequest(value)
          if (asset !== undefined) {
            const imported = await receiveRpDistributionAsset(
              asset,
              characterLibrary,
              presetLibrary,
              personaLibrary,
              worldInfoLibrary,
            )
            json(response, 200, {
              format: 0,
              operation: 'import-asset',
              target: imported.target,
              kind: asset.kind,
              sourceId: asset.id,
              savedId: imported.savedId,
              name: imported.name,
            })
            return
          }
          const input = transferRequest(value)
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
