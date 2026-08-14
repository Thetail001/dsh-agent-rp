/** Host-owned standalone World Info sources used by direct imports. */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { MAX_WORLD_INFO_JSON_BYTES, parseWorldInfoJsonBytes } from './import/world-info.ts'
import type { ImportedWorldInfo } from './import/types.ts'
import type { WorldInfoLibraryUpload } from './world-info-library-protocol.ts'

const ID_PATTERN = /^world-info-[a-f0-9]{32}$/u

/** Parsed Host-only source behind one opaque import id. */
export interface ResolvedWorldInfoUpload {
  readonly upload: WorldInfoLibraryUpload
  readonly worldInfo: ImportedWorldInfo
}

/** Original retained World Info source suitable for lossless transfer. */
export interface WorldInfoLibraryAsset extends ResolvedWorldInfoUpload {
  readonly filename: string
  readonly data: Uint8Array
}

/** Content-addressed store for original World Info JSON bytes. */
export class WorldInfoLibrary {
  readonly root: string

  constructor(options: { readonly root?: string } = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'world-info-imports'))
  }

  /** Validate and retain one browser-selected World Info JSON file. */
  importFile(input: { readonly data: Uint8Array; readonly filename: string }): WorldInfoLibraryUpload {
    const name = basename(input.filename.trim()).slice(0, 240)
    if (name === '' || !/\.json$/iu.test(name)) throw new Error('请选择 SillyTavern World Info JSON 文件')
    if (input.data.byteLength === 0) throw new Error('世界书文件为空')
    if (input.data.byteLength > MAX_WORLD_INFO_JSON_BYTES) throw new Error('世界书文件过大')
    const worldInfo = parseWorldInfoJsonBytes(input.data)
    const id = `world-info-${createHash('sha256').update(input.data).digest('hex').slice(0, 32)}`
    mkdirSync(this.root, { recursive: true })
    const dataPath = join(this.root, `${id}.json`)
    const namePath = join(this.root, `${id}.name`)
    if (!existsSync(dataPath)) writeFileSync(dataPath, input.data, { flag: 'wx' })
    if (!existsSync(namePath)) writeFileSync(namePath, name, { encoding: 'utf8', flag: 'wx' })
    return this.describe(id, name, worldInfo)
  }

  /** List retained World Info sources by display name. */
  list(): readonly WorldInfoLibraryUpload[] {
    if (!existsSync(this.root)) return []
    return readdirSync(this.root)
      .filter(filename => /^world-info-[a-f0-9]{32}\.json$/u.test(filename))
      .map(filename => this.resolve(filename.slice(0, -'.json'.length)).upload)
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  /** Load the exact original source bytes retained for one import. */
  asset(id: string): WorldInfoLibraryAsset {
    const source = this.readSource(id)
    const worldInfo = parseWorldInfoJsonBytes(source.data)
    return {
      upload: this.describe(id, source.filename, worldInfo),
      worldInfo,
      filename: source.filename,
      data: source.data,
    }
  }

  /** Resolve one validated source without accepting a filesystem path from the browser. */
  resolve(id: string): ResolvedWorldInfoUpload {
    const { upload, worldInfo } = this.asset(id)
    return { upload, worldInfo }
  }

  private readSource(id: string): { readonly filename: string; readonly data: Uint8Array } {
    if (!ID_PATTERN.test(id)) throw new Error('世界书导入编号无效')
    const dataPath = join(this.root, `${id}.json`)
    const namePath = join(this.root, `${id}.name`)
    if (!existsSync(dataPath) || !existsSync(namePath)) throw new Error('这本世界书已不可用，请重新选择 JSON 文件')
    const data = new Uint8Array(readFileSync(dataPath))
    const filename = readFileSync(namePath, 'utf8').trim()
    if (filename === '' || !/\.json$/iu.test(filename) || data.byteLength > MAX_WORLD_INFO_JSON_BYTES) {
      throw new Error('已保存的世界书来源无效')
    }
    return { filename, data }
  }

  private describe(id: string, filename: string, worldInfo: ImportedWorldInfo): WorldInfoLibraryUpload {
    return {
      id,
      name: worldInfo.name?.trim() || filename.replace(/\.json$/iu, ''),
      entryCount: worldInfo.lorebook.entries.length,
      degradations: [...worldInfo.degradations],
    }
  }
}
