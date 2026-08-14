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
}

/** Stable summary returned after importing and saving one source asset. */
export interface RpDistributionTransfer {
  readonly target: string
  readonly savedIds: readonly string[]
  readonly compatibilityDifferenceCount: number
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
  const catalog = record(await requestJson(fetcher, normalized, '/catalog', '模块化 RP'), '模块化 RP')
  if (catalog.schemaVersion !== 1 || typeof catalog.generatedAt !== 'number'
    || !Array.isArray(catalog.experiences) || !Array.isArray(catalog.components) || !Array.isArray(catalog.capabilities)) {
    throw new Error('目标没有返回兼容的模块化 RP catalog')
  }
  return {
    target: normalized,
    generatedAt: catalog.generatedAt,
    experienceCount: catalog.experiences.length,
    componentCount: catalog.components.length,
    capabilityCount: catalog.capabilities.length,
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
