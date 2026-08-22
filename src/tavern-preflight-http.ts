/** Same-origin HTTP preflight for static Tavern Helper resources selected before Session launch. */

import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { CharacterLibrary } from './character-library.ts'
import {
  jsonResponse as json,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { PresetLibrary } from './preset-library.ts'
import { inspectTavernPreflight, TavernExecutionPlanCache } from './tavern-preflight.ts'
import {
  TAVERN_EXECUTION_PATH, TAVERN_PREFLIGHT_PATH, type TavernExecutionBatchRequest, type TavernExecutionRequest,
  type TavernPreflightRequest, type TavernPreflightScope, type TavernPreflightScriptApproval,
} from './tavern-preflight-protocol.ts'
import {
  TavernScriptOriginApprovalError,
} from './tavern-script-resolver.ts'

const MAX_PREFLIGHT_REQUEST_BYTES = 64 * 1024
const MAX_PREFLIGHT_APPROVALS = 256
const MAX_ORIGINS_PER_SCRIPT = 32
const MAX_EXECUTION_BATCH_ENTRIES = 64

class TavernPreflightHttpError extends Error {
  readonly status: 400 | 413

  constructor(status: 400 | 413, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TavernPreflightHttpError'
    this.status = status
  }
}

class TavernExecutionBatchCacheMiss extends Error {
  override readonly name = 'TavernExecutionBatchCacheMiss'
}

function invalidRequest(message: string, options?: ErrorOptions): never {
  throw new TavernPreflightHttpError(400, message, options)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_PREFLIGHT_REQUEST_BYTES) {
    throw new TavernPreflightHttpError(413, '权限预检请求过大')
  }
  const chunks: Buffer[] = []
  let bytes = 0
  try {
    for await (const chunk of request) {
      const data = Buffer.from(chunk as Uint8Array)
      bytes += data.byteLength
      if (bytes > MAX_PREFLIGHT_REQUEST_BYTES) {
        throw new TavernPreflightHttpError(413, '权限预检请求过大')
      }
      chunks.push(data)
    }
  } catch (error: unknown) {
    if (error instanceof TavernPreflightHttpError) throw error
    invalidRequest('权限预检请求读取失败', { cause: error })
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch (error: unknown) {
    invalidRequest('权限预检请求不是有效 JSON', { cause: error })
  }
}

function safeLibraryId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 160 || !/^[\p{L}\p{N}._:-]+$/u.test(value)) {
    invalidRequest(`${label} 无效`)
  }
  return value
}

function safeScriptId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 512) invalidRequest(`${label} 无效`)
  return value
}

function safeOrigin(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2_048) invalidRequest('脚本来源授权无效')
  let url: URL
  try {
    url = new URL(value)
  } catch (error: unknown) {
    invalidRequest('脚本来源授权无效', { cause: error })
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.origin !== value) {
    invalidRequest('脚本来源授权无效')
  }
  return url.origin
}

function safeScope(value: unknown): TavernPreflightScope {
  if (value !== 'character' && value !== 'preset') invalidRequest('脚本权限范围无效')
  return value
}

function parseRequest(value: unknown): TavernPreflightRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidRequest('权限预检请求无效')
  const request = value as Record<string, unknown>
  if (request.format !== 0 || !Array.isArray(request.scriptApprovals)
    || request.scriptApprovals.length > MAX_PREFLIGHT_APPROVALS) invalidRequest('权限预检请求无效')
  const characterId = request.characterId === undefined ? undefined : safeLibraryId(request.characterId, '角色卡 id')
  const presetId = request.presetId === undefined ? undefined : safeLibraryId(request.presetId, '预设 id')
  if (characterId === undefined && presetId === undefined) invalidRequest('权限预检没有可检查的资源')
  const scriptApprovals: TavernPreflightScriptApproval[] = request.scriptApprovals.map((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
      invalidRequest(`脚本授权 ${index + 1} 无效`)
    }
    const approval = candidate as Record<string, unknown>
    if (!Array.isArray(approval.origins) || approval.origins.length > MAX_ORIGINS_PER_SCRIPT) {
      invalidRequest(`脚本授权 ${index + 1} 无效`)
    }
    const scope = safeScope(approval.scope)
    if ((scope === 'character' && characterId === undefined) || (scope === 'preset' && presetId === undefined)) {
      invalidRequest(`脚本授权 ${index + 1} 不属于所选资源`)
    }
    return {
      scope,
      scriptId: safeScriptId(approval.scriptId, `脚本授权 ${index + 1} id`),
      origins: [...new Set(approval.origins.map(safeOrigin))].sort(),
    }
  })
  return {
    format: 0,
    ...(characterId === undefined ? {} : { characterId }),
    ...(presetId === undefined ? {} : { presetId }),
    scriptApprovals,
  }
}

function parseExecutionRequest(value: unknown): TavernExecutionRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidRequest('脚本执行计划请求无效')
  const request = value as Record<string, unknown>
  if (request.format !== 0 || !Array.isArray(request.approvedOrigins)
    || request.approvedOrigins.length > MAX_ORIGINS_PER_SCRIPT) invalidRequest('脚本执行计划请求无效')
  const scope = safeScope(request.scope)
  const characterId = request.characterId === undefined ? undefined : safeLibraryId(request.characterId, '角色卡 id')
  const presetId = request.presetId === undefined ? undefined : safeLibraryId(request.presetId, '预设 id')
  if (scope === 'character' && characterId === undefined) invalidRequest('角色卡 id 无效')
  if (scope === 'preset' && presetId === undefined) invalidRequest('预设 id 无效')
  return {
    format: 0,
    ...(characterId === undefined ? {} : { characterId }),
    ...(presetId === undefined ? {} : { presetId }),
    scope,
    scriptId: safeScriptId(request.scriptId, '脚本 id'),
    approvedOrigins: [...new Set(request.approvedOrigins.map(safeOrigin))].sort(),
  }
}

function parseExecutionBatchRequest(value: unknown): TavernExecutionBatchRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidRequest('批量脚本执行计划请求无效')
  const request = value as Record<string, unknown>
  if (request.format !== 1 || !Array.isArray(request.entries) || request.entries.length < 2
    || request.entries.length > MAX_EXECUTION_BATCH_ENTRIES) invalidRequest('批量脚本执行计划请求无效')
  const characterId = request.characterId === undefined ? undefined : safeLibraryId(request.characterId, '角色卡 id')
  const presetId = request.presetId === undefined ? undefined : safeLibraryId(request.presetId, '预设 id')
  const identities = new Set<string>()
  const entries = request.entries.map((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
      invalidRequest(`批量脚本 ${index + 1} 无效`)
    }
    const entry = candidate as Record<string, unknown>
    const scope = safeScope(entry.scope)
    if ((scope === 'character' && characterId === undefined) || (scope === 'preset' && presetId === undefined)
      || !Array.isArray(entry.approvedOrigins) || entry.approvedOrigins.length > MAX_ORIGINS_PER_SCRIPT) {
      invalidRequest(`批量脚本 ${index + 1} 无效`)
    }
    const scriptId = safeScriptId(entry.scriptId, `批量脚本 ${index + 1} id`)
    const identity = JSON.stringify([scope, scriptId])
    if (identities.has(identity)) invalidRequest('批量脚本执行计划包含重复脚本')
    identities.add(identity)
    return {
      scope,
      scriptId,
      approvedOrigins: [...new Set(entry.approvedOrigins.map(safeOrigin))].sort(),
    }
  })
  return {
    format: 1,
    ...(characterId === undefined ? {} : { characterId }),
    ...(presetId === undefined ? {} : { presetId }),
    entries,
  }
}

/** Register a model-free resource preflight for any selected character/preset combination. */
export function installTavernPreflightHttp(
  ctx: Context,
  characters: CharacterLibrary,
  presets: PresetLibrary,
  server: AgentRpHttpServer,
  plans: TavernExecutionPlanCache,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: TAVERN_PREFLIGHT_PATH,
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
        const input = parseRequest(await readJson(request))
        let character: ReturnType<CharacterLibrary['resolve']> | undefined
        if (input.characterId !== undefined) {
          try {
            character = characters.resolve(input.characterId)
          } catch (error: unknown) {
            invalidRequest('角色卡不可用', { cause: error })
          }
        }
        let preset: ReturnType<PresetLibrary['get']> | undefined
        if (input.presetId !== undefined) {
          try {
            preset = presets.get(input.presetId)
          } catch (error: unknown) {
            invalidRequest('预设不可用', { cause: error })
          }
        }
        const result = await inspectTavernPreflight([
          {
            scope: 'character', ownerId: input.characterId ?? '',
            scripts: character?.card.frontend.tavernHelperScripts ?? [],
          },
          {
            scope: 'preset', ownerId: input.presetId ?? '',
            scripts: preset?.preset.tavernHelperScripts ?? [],
          },
        ], input.scriptApprovals, AbortSignal.timeout(30_000), plans)
        json(response, 200, result)
      } catch (error: unknown) {
        if (response.destroyed) return
        const known = error instanceof TavernPreflightHttpError ? error : undefined
        json(response, known?.status ?? 500, { error: known?.message ?? '权限预检暂时不可用' })
      }
    },
  }), 'agent-rp: Tavern Helper resource preflight HTTP')
}

/** Register same-origin Host resolution for one imported Tavern Helper script. */
export function installTavernExecutionHttp(
  ctx: Context,
  characters: CharacterLibrary,
  presets: PresetLibrary,
  server: AgentRpHttpServer,
  plans: TavernExecutionPlanCache,
): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: TAVERN_EXECUTION_PATH,
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
        const value = await readJson(request)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)
          && (value as { readonly format?: unknown }).format === 1) {
          const input = parseExecutionBatchRequest(value)
          const entries = input.entries.map(entry => {
            const ownerId = entry.scope === 'character' ? input.characterId! : input.presetId!
            const execution = plans.get({
              scope: entry.scope,
              ownerId,
              scriptId: entry.scriptId,
              approvedOrigins: entry.approvedOrigins,
            })
            if (execution === undefined) throw new TavernExecutionBatchCacheMiss()
            return { scope: entry.scope, scriptId: entry.scriptId, execution }
          })
          json(response, 200, { format: 1, entries })
          return
        }
        const input = parseExecutionRequest(value)
        const ownerId = input.scope === 'character' ? input.characterId! : input.presetId!
        const identity = {
          scope: input.scope,
          ownerId,
          scriptId: input.scriptId,
          approvedOrigins: input.approvedOrigins,
        }
        const cached = plans.get(identity)
        if (cached !== undefined) {
          json(response, 200, { format: 0, execution: cached })
          return
        }
        let scripts: readonly import('./import/types.ts').ImportedTavernHelperScript[]
        if (input.scope === 'character') {
          try {
            scripts = characters.resolve(input.characterId!).card.frontend.tavernHelperScripts
          } catch (error: unknown) {
            invalidRequest('角色卡不可用', { cause: error })
          }
        } else {
          try {
            scripts = presets.get(input.presetId!).preset.tavernHelperScripts ?? []
          } catch (error: unknown) {
            invalidRequest('预设不可用', { cause: error })
          }
        }
        const script = scripts.find(candidate => candidate.id === input.scriptId)
        if (script === undefined || !script.enabled || script.content.trim() === '') invalidRequest('脚本不可用')
        const execution = await plans.resolve(identity, script.content, AbortSignal.timeout(30_000))
        json(response, 200, { format: 0, execution })
      } catch (error: unknown) {
        if (response.destroyed) return
        if (error instanceof TavernExecutionBatchCacheMiss) {
          json(response, 409, { error: '批量脚本计划需要逐项解析' })
          return
        }
        if (error instanceof TavernScriptOriginApprovalError) {
          json(response, 409, { error: '脚本来源需要授权', requestedOrigin: error.origin })
          return
        }
        const known = error instanceof TavernPreflightHttpError ? error : undefined
        json(response, known?.status ?? 502, { error: known?.message ?? '脚本执行计划暂时不可用' })
      }
    },
  }), 'agent-rp: Tavern Helper execution HTTP')
}
