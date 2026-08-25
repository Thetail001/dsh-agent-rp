/** Host-owned standalone World Info sources used by direct imports. */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { MAX_WORLD_INFO_JSON_BYTES, parseWorldInfoJsonBytes } from './import/world-info.ts'
import type { ImportedWorldInfo } from './import/types.ts'
import type { WorldInfoLibraryUpload } from './world-info-library-protocol.ts'
import type { CharacterWorldBindingStore } from './character-world-binding-store.ts'

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
  private readonly bindings: CharacterWorldBindingStore | undefined

  constructor(options: {
    readonly root?: string
    readonly bindings?: CharacterWorldBindingStore
  } = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'world-info-imports'))
    this.bindings = options.bindings
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

  /** List sources selected as defaults for newly created RP Sessions. */
  defaultIds(): readonly string[] {
    if (!existsSync(this.root)) return []
    return readdirSync(this.root)
      .filter(filename => /^world-info-[a-f0-9]{32}\.default$/u.test(filename))
      .flatMap(filename => {
        const id = filename.slice(0, -'.default'.length)
        return this.isDefault(id) ? [this.resolve(id).upload] : []
      })
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(entry => entry.id)
  }

  /** Persist whether one retained source should be preselected for future RP Sessions. */
  setDefault(id: string, enabled: boolean): WorldInfoLibraryUpload {
    this.readSource(id)
    if (enabled && !this.isDefault(id) && this.defaultIds().length >= 16) {
      throw new Error('新会话默认世界书最多可以选择 16 本')
    }
    writeFileSync(join(this.root, `${id}.default`), enabled ? '1' : '0', { encoding: 'utf8' })
    return this.resolve(id).upload
  }

  /** Remove one reusable source without affecting Sessions that already logged its lossless snapshot. */
  remove(id: string): WorldInfoLibraryUpload {
    const upload = this.resolve(id).upload
    const characterIds = this.bindings?.referencingCharacters(id) ?? []
    if (characterIds.length > 0) throw new Error('这本世界书仍由角色绑定，请先解除角色世界绑定')
    for (const suffix of ['.json', '.name', '.default']) {
      const path = join(this.root, `${id}${suffix}`)
      if (existsSync(path)) unlinkSync(path)
    }
    return upload
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

  private isDefault(id: string): boolean {
    const preferencePath = join(this.root, `${id}.default`)
    return existsSync(preferencePath) && readFileSync(preferencePath, 'utf8').trim() === '1'
  }

  private describe(id: string, filename: string, worldInfo: ImportedWorldInfo): WorldInfoLibraryUpload {
    return {
      id,
      name: worldInfo.name?.trim() || filename.replace(/\.json$/iu, ''),
      entryCount: worldInfo.lorebook.entries.length,
      degradations: [...worldInfo.degradations],
      defaultForNewSessions: this.isDefault(id),
    }
  }
}
