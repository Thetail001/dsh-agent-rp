/** Narrow HTTP interoperability client for the community dsh-rp-distribution API. */

const RP_API_PATH = '/api/rp/v1'
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 30_000

/** HTTP implementation accepted by the bridge and its focused checks. */
export type RpDistributionFetch = (input: string, init?: RequestInit) => Promise<Response>

/** Source transport accepted by the modular RP import API. */
export type RpDistributionImportPayload =
  | {
    readonly kind: 'character-card-json' | 'persona' | 'world-info' | 'preset'
    readonly source: string
    readonly sourceId: string
  }
  | {
    readonly kind: 'character-card-png' | 'character-card-charx'
    readonly base64: string
    readonly sourceId: string
  }

/** Stable summary returned after probing the target distribution. */
export interface RpDistributionProbe {
  readonly target: string
  readonly generatedAt: number
  readonly experienceCount: number
  readonly componentCount: number
  readonly capabilityCount: number
  readonly remoteAssets: {
    readonly characters: readonly RpDistributionRemoteAsset[]
    readonly presets: readonly RpDistributionRemoteAsset[]
    readonly personas: readonly RpDistributionRemoteAsset[]
    readonly worldInfos: readonly RpDistributionRemoteAsset[]
  }
}

/** One saved modular RP asset available for a portable-source copy. */
export interface RpDistributionRemoteAsset {
  readonly id: string
  readonly name: string
}

/** Original JSON source retained by the modular RP compatibility importer. */
export interface RpDistributionPortableSource {
  readonly target: string
  readonly kind: RpDistributionImportPayload['kind']
  readonly id: string
  readonly sourceId: string
  readonly source: string
}

/** Stable summary returned after importing and saving one source asset. */
export interface RpDistributionTransfer {
  readonly target: string
  readonly savedIds: readonly string[]
  readonly compatibilityDifferenceCount: number
}

/** One modular RP timeline serialized as a portable SillyTavern chat. */
export interface RpDistributionChatExport {
  readonly target: string
  readonly sourceSessionId: string
  readonly filename: string
  readonly source: string
  readonly messageCount: number
  readonly characterName: string
  readonly userName: string
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}响应不是对象`)
  return value as Record<string, unknown>
}

function loopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLocaleLowerCase().replace(/^\[|\]$/gu, '')
  if (normalized === 'localhost' || normalized === '::1') return true
  const octets = normalized.split('.')
  return octets.length === 4 && octets[0] === '127'
    && octets.every(octet => /^\d{1,3}$/u.test(octet) && Number(octet) <= 255)
}

/** Normalize a target origin while preventing library data from being sent off-device. */
export function normalizeRpDistributionTarget(value: string): string {
  let target: URL
  try {
    target = new URL(value.trim())
  } catch {
    throw new Error('模块化 RP 地址无效')
  }
  if ((target.protocol !== 'http:' && target.protocol !== 'https:') || !loopbackHostname(target.hostname)
    || target.username !== '' || target.password !== '' || target.search !== '' || target.hash !== '') {
    throw new Error('模块化 RP 地址必须是这台电脑上的 localhost 或 127.0.0.1 HTTP 地址')
  }
  target.pathname = target.pathname.replace(/\/+$/u, '')
  return target.toString().replace(/\/$/u, '')
}

function apiUrl(target: string, path: string): string {
  return `${normalizeRpDistributionTarget(target)}${RP_API_PATH}${path}`
}

async function responseJson(response: Response, label: string): Promise<unknown> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error(`${label}响应过大`)
  const source = await response.text()
  if (new TextEncoder().encode(source).byteLength > MAX_RESPONSE_BYTES) throw new Error(`${label}响应过大`)
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error(`${label}返回了无法识别的响应`)
  }
  if (!response.ok) {
    const result = record(value, label)
    const message = typeof result.error === 'string'
      ? result.error
      : record(result.error ?? {}, label).message
    throw new Error(typeof message === 'string' && message.trim() !== '' ? message : `${label}失败（${response.status}）`)
  }
  return value
}

async function requestJson(
  fetcher: RpDistributionFetch,
  target: string,
  path: string,
  label: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetcher(apiUrl(target, path), {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined
      ? { accept: 'application/json' }
      : { accept: 'application/json', 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  return responseJson(response, label)
}

/** Verify that a loopback server exposes the modular RP catalog API. */
export async function probeRpDistribution(
  target: string,
  fetcher: RpDistributionFetch = fetch,
): Promise<RpDistributionProbe> {
  const normalized = normalizeRpDistributionTarget(target)
  const [catalogValue, libraryValue, presetValue] = await Promise.all([
    requestJson(fetcher, normalized, '/catalog', '模块化 RP'),
    requestJson(fetcher, normalized, '/library', '模块化 RP 资产库'),
    requestJson(fetcher, normalized, '/presets', '模块化 RP 预设库'),
  ])
  const catalog = record(catalogValue, '模块化 RP')
  const library = record(libraryValue, '模块化 RP 资产库')
  const presets = record(presetValue, '模块化 RP 预设库')
  if (catalog.schemaVersion !== 1 || typeof catalog.generatedAt !== 'number'
    || !Array.isArray(catalog.experiences) || !Array.isArray(catalog.components) || !Array.isArray(catalog.capabilities)) {
    throw new Error('目标没有返回兼容的模块化 RP catalog')
  }
  if (library.schemaVersion !== 1 || presets.schemaVersion !== 1) {
    throw new Error('目标没有返回兼容的模块化 RP 资产目录')
  }
  return {
    target: normalized,
    generatedAt: catalog.generatedAt,
    experienceCount: catalog.experiences.length,
    componentCount: catalog.components.length,
    capabilityCount: catalog.capabilities.length,
    remoteAssets: {
      characters: assetSummaries(library.characters, '模块化 RP 角色卡'),
      presets: assetSummaries(presets.presets, '模块化 RP 预设'),
      personas: assetSummaries(library.personas, '模块化 RP Persona'),
      worldInfos: assetSummaries(library.lorebooks, '模块化 RP 世界书'),
    },
  }
}

function compatibilityDifferenceCount(value: unknown): number {
  const imported = record(value, '模块化 RP 导入')
  if (!Array.isArray(imported.lossReports)) throw new Error('模块化 RP 导入响应缺少兼容性报告')
  let count = 0
  for (const entry of imported.lossReports) {
    const report = record(record(entry, '模块化 RP 兼容性报告').report, '模块化 RP 兼容性报告')
    if (!Array.isArray(report.items)) throw new Error('模块化 RP 兼容性报告字段无效')
    count += report.items.length
  }
  return count
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label}字段无效`)
  return value
}

function records(value: unknown, label: string): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${label}字段无效`)
  return value.map((entry, index) => record(entry, `${label}[${index}]`))
}

function assetSummaries(value: unknown, label: string): readonly RpDistributionRemoteAsset[] {
  return records(value, label).map((entry, index) => ({
    id: string(entry.id, `${label}[${index}].id`),
    name: string(entry.name, `${label}[${index}].name`),
  }))
}

function portableKind(kind: 'character' | 'preset' | 'persona' | 'world-info'): {
  readonly queryKind: 'character' | 'preset' | 'persona' | 'lore'
  readonly sourceKind: RpDistributionPortableSource['kind']
} {
  if (kind === 'character') return { queryKind: 'character', sourceKind: 'character-card-json' }
  if (kind === 'world-info') return { queryKind: 'lore', sourceKind: 'world-info' }
  return { queryKind: kind, sourceKind: kind }
}

/** Read one exact retained JSON source from a compatible modular RP runtime. */
export async function readRpDistributionSource(
  target: string,
  kind: 'character' | 'preset' | 'persona' | 'world-info',
  id: string,
  fetcher: RpDistributionFetch = fetch,
): Promise<RpDistributionPortableSource> {
  const normalized = normalizeRpDistributionTarget(target)
  const sourceId = id.trim()
  if (sourceId === '' || sourceId.length > 512) throw new Error('模块化 RP 资产编号无效')
  const expected = portableKind(kind)
  const response = await fetcher(apiUrl(
    normalized,
    `/source?kind=${expected.queryKind}&id=${encodeURIComponent(sourceId)}`,
  ), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (response.status === 404 || response.status === 405) {
    throw new Error('目标版本尚未提供可移植来源接口；请更新 dsh-rp-distribution 后重试')
  }
  const value = record(await responseJson(response, '模块化 RP 来源'), '模块化 RP 来源')
  if (value.schemaVersion !== 1 || value.kind !== expected.sourceKind || value.id !== sourceId
    || typeof value.source !== 'string' || typeof value.sourceId !== 'string' || value.sourceId.trim() === '') {
    throw new Error('模块化 RP 返回了不兼容的可移植来源')
  }
  return {
    target: normalized,
    kind: expected.sourceKind,
    id: sourceId,
    sourceId: value.sourceId,
    source: value.source,
  }
}

function activeName(
  catalog: Record<string, unknown>,
  activeKey: 'characterIds' | 'personaIds',
  collectionKey: 'characters' | 'personas',
): string | undefined {
  const active = record(catalog.active, '模块化 RP 会话资产')
  const ids = active[activeKey]
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('模块化 RP 会话资产字段无效')
  const selected = ids[0]
  if (selected === undefined) return undefined
  const entry = records(catalog[collectionKey], `模块化 RP ${collectionKey}`)
    .find(candidate => candidate.id === selected)
  return entry === undefined ? undefined : string(entry.name, `模块化 RP ${collectionKey} 名称`)
}

function renderedInput(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const text = (value as Record<string, unknown>).text
    if (typeof text === 'string') return text
  }
  const rendered = JSON.stringify(value)
  if (rendered === undefined) throw new Error('模块化 RP 会话包含无法迁移的输入')
  return rendered
}

function portableFilename(characterName: string, sessionId: string): string {
  const stem = `${characterName}-${sessionId}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_')
    .replace(/[. ]+$/gu, '')
    .slice(0, 220) || '模块化-RP-会话'
  return `${stem}.jsonl`
}

/** Read one live modular RP timeline and serialize it without invoking either model runtime. */
export async function exportRpDistributionChat(
  target: string,
  sessionId: string,
  fetcher: RpDistributionFetch = fetch,
): Promise<RpDistributionChatExport> {
  const normalized = normalizeRpDistributionTarget(target)
  const sourceSessionId = sessionId.trim()
  if (sourceSessionId === '' || sourceSessionId.length > 512) throw new Error('模块化 RP 会话编号无效')
  const [timelineValue, libraryValue] = await Promise.all([
    requestJson(fetcher, normalized, '/timeline', '模块化 RP 会话', { sessionId: sourceSessionId }),
    requestJson(
      fetcher,
      normalized,
      `/library?sessionId=${encodeURIComponent(sourceSessionId)}`,
      '模块化 RP 会话资产',
    ),
  ])
  const timeline = record(timelineValue, '模块化 RP 会话')
  const library = record(libraryValue, '模块化 RP 会话资产')
  if (timeline.sessionId !== sourceSessionId || library.schemaVersion !== 1 || library.sessionId !== sourceSessionId) {
    throw new Error('模块化 RP 返回了其他会话的数据')
  }
  const projection = record(timeline.projection, '模块化 RP 会话投影')
  const history = records(projection.history, '模块化 RP 会话历史')
  const characterName = activeName(library, 'characterIds', 'characters') ?? '模块化 RP'
  const userName = activeName(library, 'personaIds', 'personas') ?? 'User'
  const rows: Record<string, unknown>[] = [{
    user_name: userName,
    character_name: characterName,
    create_date: new Date().toISOString(),
    chat_metadata: {
      imported_from: 'dsh-rp-distribution',
      source_session_id: sourceSessionId,
    },
  }]
  for (const [index, value] of history.entries()) {
    const turnId = string(value.turnId, `模块化 RP 会话历史[${index}].turnId`)
    const assistantMessage = string(value.assistantMessage, `模块化 RP 会话历史[${index}].assistantMessage`)
    const committedAt = value.committedAt
    if (typeof committedAt !== 'number' || !Number.isFinite(committedAt) || committedAt < 0) {
      throw new Error(`模块化 RP 会话历史[${index}].committedAt字段无效`)
    }
    const committedDate = new Date(committedAt)
    if (Number.isNaN(committedDate.getTime())) throw new Error(`模块化 RP 会话历史[${index}].committedAt字段无效`)
    const sendDate = committedDate.toISOString()
    const extra = { dsh_rp_turn_id: turnId, imported_from: 'dsh-rp-distribution' }
    rows.push({ name: userName, is_user: true, is_system: false, mes: renderedInput(value.input), send_date: sendDate, extra })
    rows.push({ name: characterName, is_user: false, is_system: false, mes: assistantMessage, send_date: sendDate, extra })
  }
  return {
    target: normalized,
    sourceSessionId,
    filename: portableFilename(characterName, sourceSessionId),
    source: `${rows.map(row => JSON.stringify(row)).join('\n')}\n`,
    messageCount: history.length * 2,
    characterName,
    userName,
  }
}

/** Import one original asset, retain its loss report, and save it into the target library. */
export async function transferToRpDistribution(
  target: string,
  payload: RpDistributionImportPayload,
  fetcher: RpDistributionFetch = fetch,
): Promise<RpDistributionTransfer> {
  const normalized = normalizeRpDistributionTarget(target)
  const imported = await requestJson(fetcher, normalized, '/import', '模块化 RP 导入', payload)
  const differenceCount = compatibilityDifferenceCount(imported)
  const saveRequest = payload.kind === 'preset'
    ? { action: 'save', source: payload.source, sourceId: payload.sourceId }
    : { action: 'save', ...payload }
  const savePath = payload.kind === 'preset' ? '/presets' : '/library'
  const saved = record(await requestJson(fetcher, normalized, savePath, '模块化 RP 保存', saveRequest), '模块化 RP 保存')
  const savedIds = payload.kind === 'preset'
    ? (typeof saved.presetId === 'string' ? [saved.presetId] : [])
    : (Array.isArray(saved.assetIds) && saved.assetIds.every(id => typeof id === 'string')
        ? saved.assetIds as string[] : [])
  if (savedIds.length === 0) throw new Error('模块化 RP 保存响应没有返回资产 id')
  return {
    target: normalized,
    savedIds,
    compatibilityDifferenceCount: differenceCount,
  }
}
