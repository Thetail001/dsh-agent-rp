/** Bounded, disposable persistence for successfully resolved Tavern execution plans. */

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  TavernScriptExecution,
  TavernScriptModuleDependency,
  TavernStylesheetDependency,
} from './tavern-script-resolver.ts'

const CACHE_FORMAT = 0
/** Bump when resolver output semantics change; ordinary Agent RP releases need not invalidate the cache. */
const RESOLVER_CACHE_REVISION = 5
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1_000
const DEFAULT_MAX_ENTRIES = 64
const DEFAULT_MAX_BYTES = 96 * 1024 * 1024
const MAX_FILE_BYTES = 12 * 1024 * 1024
const cacheKeyPattern = /^[0-9a-f]{64}$/u
const allowedPreloads = new Set([
  'compare-versions', 'json5', 'jsonrepair', 'klona', 'pinia', 'vue', 'yaml', 'zod',
])

interface PersistedTavernExecutionPlan {
  readonly format: typeof CACHE_FORMAT
  readonly resolverRevision: typeof RESOLVER_CACHE_REVISION
  readonly key: string
  readonly createdAt: number
  readonly expiresAt: number
  readonly executionSha256: string
  readonly execution: TavernScriptExecution
}

export interface TavernExecutionDiskCacheOptions {
  readonly root: string
  readonly maxAgeMs?: number
  readonly maximumEntries?: number
  readonly maximumBytes?: number
  readonly now?: () => number
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum
}

function boundedStringArray(value: unknown, maximumEntries: number, maximumLength: number): value is readonly string[] {
  return Array.isArray(value) && value.length <= maximumEntries
    && value.every(entry => boundedString(entry, maximumLength))
}

function validOriginArray(value: unknown): value is readonly string[] {
  if (!boundedStringArray(value, 64, 2_048)) return false
  return value.every(entry => {
    try {
      const url = new URL(entry)
      return url.protocol === 'https:' && url.username === '' && url.password === '' && url.origin === entry
    } catch {
      return false
    }
  })
}

function validHttpsUrlArray(value: unknown): value is readonly string[] {
  if (!boundedStringArray(value, 64, 2_048)) return false
  return value.every(entry => {
    try {
      const url = new URL(entry)
      return url.protocol === 'https:' && url.username === '' && url.password === '' && url.href === entry
    } catch {
      return false
    }
  })
}

function validModuleDependency(value: unknown): value is TavernScriptModuleDependency {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const dependency = value as Record<string, unknown>
  return boundedString(dependency.id, 256)
    && boundedString(dependency.placeholder, 512)
    && boundedString(dependency.source, MAX_FILE_BYTES)
    && boundedStringArray(dependency.dependencies, 256, 256)
}

function validStylesheetDependency(value: unknown): value is TavernStylesheetDependency {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const dependency = value as Record<string, unknown>
  return validHttpsUrlArray([dependency.url]) && boundedString(dependency.source, 512 * 1024)
    && Number.isInteger(dependency.status) && (dependency.status as number) >= 200
    && (dependency.status as number) <= 599
}

function validExecution(value: unknown): value is TavernScriptExecution {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const execution = value as Record<string, unknown>
  if (!boundedString(execution.source, MAX_FILE_BYTES)
    || (execution.mode !== 'classic' && execution.mode !== 'module')
    || !Array.isArray(execution.preloads) || execution.preloads.length > allowedPreloads.size
    || !execution.preloads.every(entry => typeof entry === 'string' && allowedPreloads.has(entry))
    || typeof execution.needsDomPurify !== 'boolean'
    || typeof execution.needsFuse !== 'boolean'
    || !boundedStringArray(execution.compatibilityMarkers, 32, 128)) return false
  if (execution.inlineDependencies !== undefined
    && !boundedStringArray(execution.inlineDependencies, 256, MAX_FILE_BYTES)) return false
  if (execution.moduleDependencies !== undefined
    && (!Array.isArray(execution.moduleDependencies) || execution.moduleDependencies.length > 256
      || !execution.moduleDependencies.every(validModuleDependency))) return false
  if (execution.stylesheetDependencies !== undefined
    && (!Array.isArray(execution.stylesheetDependencies) || execution.stylesheetDependencies.length > 16
      || !execution.stylesheetDependencies.every(validStylesheetDependency)
      || execution.stylesheetDependencies.reduce((bytes, dependency) => bytes
        + new TextEncoder().encode((dependency as TavernStylesheetDependency).source).byteLength, 0) > 1024 * 1024)) return false
  return (execution.remoteImageOrigins === undefined || validOriginArray(execution.remoteImageOrigins))
    && (execution.remoteStyleOrigins === undefined || validOriginArray(execution.remoteStyleOrigins))
    && (execution.remoteStylesheetUrls === undefined || validHttpsUrlArray(execution.remoteStylesheetUrls))
    && (execution.remoteFontOrigins === undefined || validOriginArray(execution.remoteFontOrigins))
    && (execution.remoteFrameOrigins === undefined || validOriginArray(execution.remoteFrameOrigins))
}

function validPersisted(value: unknown, key: string, now: number): value is PersistedTavernExecutionPlan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const stored = value as Record<string, unknown>
  if (stored.format !== CACHE_FORMAT || stored.resolverRevision !== RESOLVER_CACHE_REVISION || stored.key !== key
    || typeof stored.createdAt !== 'number' || !Number.isSafeInteger(stored.createdAt)
    || typeof stored.expiresAt !== 'number' || !Number.isSafeInteger(stored.expiresAt)
    || stored.createdAt > stored.expiresAt || stored.expiresAt <= now
    || typeof stored.executionSha256 !== 'string' || !cacheKeyPattern.test(stored.executionSha256)
    || !validExecution(stored.execution)) return false
  return sha256(JSON.stringify(stored.execution)) === stored.executionSha256
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    && typeof (error as { readonly code?: unknown }).code === 'string'
    ? (error as { readonly code: string }).code
    : undefined
}

/** File-per-plan cache: local-only, bounded, versioned, and always safe to discard. */
export class TavernExecutionDiskCache {
  private readonly root: string
  private readonly maxAgeMs: number
  private readonly maximumEntries: number
  private readonly maximumBytes: number
  private readonly now: () => number

  constructor(options: TavernExecutionDiskCacheOptions) {
    this.root = resolve(options.root)
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS
    this.maximumEntries = options.maximumEntries ?? DEFAULT_MAX_ENTRIES
    this.maximumBytes = options.maximumBytes ?? DEFAULT_MAX_BYTES
    this.now = options.now ?? Date.now
    if (!Number.isSafeInteger(this.maxAgeMs) || this.maxAgeMs <= 0
      || !Number.isSafeInteger(this.maximumEntries) || this.maximumEntries <= 0
      || !Number.isSafeInteger(this.maximumBytes) || this.maximumBytes <= 0) {
      throw new Error('Tavern execution disk cache limits must be positive integers')
    }
  }

  private path(key: string): string {
    if (!cacheKeyPattern.test(key)) throw new Error('Tavern execution disk cache key is invalid')
    return join(this.root, `${key}.json`)
  }

  private async remove(path: string): Promise<void> {
    await rm(path, { force: true }).catch(() => undefined)
  }

  /** Return one exact, unexpired plan; malformed files are treated as ordinary misses. */
  async get(key: string): Promise<TavernScriptExecution | undefined> {
    const path = this.path(key)
    try {
      const info = await stat(path)
      if (!info.isFile() || info.size <= 0 || info.size > MAX_FILE_BYTES) {
        await this.remove(path)
        return undefined
      }
      const source = await readFile(path, 'utf8')
      let parsed: unknown
      try {
        parsed = JSON.parse(source) as unknown
      } catch {
        await this.remove(path)
        return undefined
      }
      const now = this.now()
      if (!validPersisted(parsed, key, now)) {
        await this.remove(path)
        return undefined
      }
      const touched = new Date(now)
      await utimes(path, touched, touched).catch(() => undefined)
      return parsed.execution
    } catch (error: unknown) {
      if (errorCode(error) === 'ENOENT') return undefined
      throw error
    }
  }

  /** Atomically retain one successful plan, then prune oldest files by count and total bytes. */
  async set(key: string, execution: TavernScriptExecution): Promise<void> {
    const path = this.path(key)
    const createdAt = this.now()
    const stored: PersistedTavernExecutionPlan = {
      format: CACHE_FORMAT,
      resolverRevision: RESOLVER_CACHE_REVISION,
      key,
      createdAt,
      expiresAt: createdAt + this.maxAgeMs,
      executionSha256: sha256(JSON.stringify(execution)),
      execution,
    }
    const encoded = `${JSON.stringify(stored)}\n`
    if (Buffer.byteLength(encoded) > MAX_FILE_BYTES) return
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    const staging = `${path}.${process.pid}.${randomUUID()}.tmp`
    try {
      await writeFile(staging, encoded, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      await this.remove(path)
      await rename(staging, path)
    } finally {
      await this.remove(staging)
    }
    await this.prune()
  }

  private async prune(): Promise<void> {
    const entries = await readdir(this.root, { withFileTypes: true })
    const files = (await Promise.all(entries.flatMap(entry => {
      if (entry.isFile() && /^[0-9a-f]{64}\.json\.\d+\.[0-9a-f-]+\.tmp$/u.test(entry.name)) {
        return [this.remove(join(this.root, entry.name)).then(() => undefined)]
      }
      if (!entry.isFile() || !/^[0-9a-f]{64}\.json$/u.test(entry.name)) return []
      const path = join(this.root, entry.name)
      return [stat(path).then(info => ({ path, size: info.size, mtimeMs: info.mtimeMs }), () => undefined)]
    }))).flatMap(entry => entry === undefined ? [] : [entry])
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
    let retainedEntries = 0
    let retainedBytes = 0
    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_FILE_BYTES
        || retainedEntries >= this.maximumEntries || retainedBytes + file.size > this.maximumBytes) {
        await this.remove(file.path)
        continue
      }
      retainedEntries += 1
      retainedBytes += file.size
    }
  }
}
