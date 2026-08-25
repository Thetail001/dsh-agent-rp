/** Host-owned reusable SillyTavern regex-pack library. */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { ImportedRegexScript } from './import/types.ts'
import { parseRegexPackBytes, parseRegexPackValue, summarizeRegexPackScripts } from './regex-pack.ts'
import type { RegexPackLibrarySummary } from './regex-pack-library-protocol.ts'

const ID_PATTERN = /^regex-[a-f0-9]{32}$/u

interface StoredRegexPack {
  readonly format: 0
  readonly id: string
  readonly name: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly scripts: readonly ImportedRegexScript[]
}

/** Complete detached entry used while materializing one Session. */
export interface RegexPackLibraryEntry extends RegexPackLibrarySummary {
  readonly scripts: readonly ImportedRegexScript[]
}

/** Raw local file selected from the browser resource center. */
export interface RegexPackLibraryFileImport {
  readonly data: Uint8Array
  readonly filename: string
}

/** Filesystem location override used by focused checks and portable deployments. */
export interface RegexPackLibraryOptions {
  readonly root?: string
}

function packName(filename: string): string {
  const name = basename(filename.trim(), extname(filename.trim())).trim()
  if (name === '') throw new Error('正则包文件名无效')
  return name.slice(0, 160)
}

function summary(value: StoredRegexPack): RegexPackLibrarySummary {
  return {
    id: value.id,
    name: value.name,
    ...summarizeRegexPackScripts(value.scripts),
    updatedAt: value.updatedAt,
  }
}

function stored(value: unknown): StoredRegexPack {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('正则包库文件不是对象')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.id !== 'string' || !ID_PATTERN.test(record.id)
    || typeof record.name !== 'string' || record.name.trim() === ''
    || typeof record.createdAt !== 'number' || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0
    || typeof record.updatedAt !== 'number' || !Number.isSafeInteger(record.updatedAt) || record.updatedAt < 0) {
    throw new Error('正则包库文件字段无效')
  }
  const scripts = parseRegexPackValue(record.scripts, 'stored regex pack')
  return {
    format: 0,
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scripts,
  }
}

/** Content-addressed library whose files remain independent from Session snapshots. */
export class RegexPackLibrary {
  readonly root: string

  constructor(options: RegexPackLibraryOptions = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'regex-packs'))
  }

  /** List valid packs, newest first. */
  list(): readonly RegexPackLibrarySummary[] {
    if (!existsSync(this.root)) return []
    return readdirSync(this.root).filter(filename => filename.endsWith('.json')).map(filename =>
      summary(this.read(join(this.root, filename))))
      .sort((left, right) => right.updatedAt - left.updatedAt || left.name.localeCompare(right.name))
  }

  /** Read one exact pack as a detached value. */
  get(id: string): RegexPackLibraryEntry {
    this.assertId(id)
    const path = join(this.root, `${id}.json`)
    if (!existsSync(path)) throw new Error(`正则包库中没有 ${JSON.stringify(id)}`)
    const value = this.read(path)
    return { ...summary(value), scripts: structuredClone(value.scripts) }
  }

  /** Import one single-rule or array export and deduplicate normalized behavior. */
  importFile(input: RegexPackLibraryFileImport): RegexPackLibraryEntry {
    if (!/\.json$/iu.test(input.filename.trim())) throw new Error('请选择 SillyTavern 正则 JSON 文件')
    const scripts = parseRegexPackBytes(input.data, input.filename)
    const digest = createHash('sha256').update(JSON.stringify(scripts)).digest('hex')
    const id = `regex-${digest.slice(0, 32)}`
    const path = join(this.root, `${id}.json`)
    if (existsSync(path)) return this.get(id)
    const now = Date.now()
    const value: StoredRegexPack = { format: 0, id, name: packName(input.filename), createdAt: now, updatedAt: now, scripts }
    mkdirSync(this.root, { recursive: true, mode: 0o700 })
    const staging = join(this.root, `.${id}.${process.pid}.${randomUUID()}.tmp`)
    try {
      writeFileSync(staging, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(staging, path)
    } catch (error: unknown) {
      rmSync(staging, { force: true })
      throw error
    }
    return this.get(id)
  }

  /** Remove one reusable copy without touching any Session snapshot. */
  delete(id: string): void {
    this.assertId(id)
    const path = join(this.root, `${id}.json`)
    if (!existsSync(path)) throw new Error(`正则包库中没有 ${JSON.stringify(id)}`)
    rmSync(path)
  }

  private assertId(id: string): void {
    if (!ID_PATTERN.test(id)) throw new Error('正则包库 id 无效')
  }

  private read(path: string): StoredRegexPack {
    try {
      return stored(JSON.parse(readFileSync(path, 'utf8')))
    } catch (error: unknown) {
      throw new Error('正则包库文件无法读取', { cause: error })
    }
  }
}
