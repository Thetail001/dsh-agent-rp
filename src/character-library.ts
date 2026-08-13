/** Host-owned reusable Character Card library retaining original transport bytes. */

import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { CharacterImportTransport } from './import/session-character.ts'
import type { ImportedCharacterCard } from './import/types.ts'
import { parseCharacterCardJson, parseCharacterCardJsonBytes } from './import/character-card.ts'
import { readCharacterCardPng } from './import/png.ts'
import { charxAvatar, charxImageAssets, parseCharx } from './import/charx.ts'
import type {
  CharacterLibraryDetail, CharacterLibraryImage, CharacterLibraryImportResult, CharacterLibrarySummary,
} from './character-library-protocol.ts'

const META_SUFFIX = '.meta.json'
const ID_PATTERN = /^card-[a-f0-9]{32}$/u

interface StoredCharacterMetadata {
  readonly format: 0
  readonly id: string
  readonly originalFilename: string
  readonly mediaType: string
  readonly transport: 'png' | 'json' | 'charx'
  readonly metadataKeyword?: 'ccv3' | 'chara'
  readonly bytes: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly archivedAt?: number
}

/** Original validated card submitted to the reusable library. */
export interface CharacterLibraryImport {
  readonly data: Uint8Array
  readonly filename?: string
  readonly mediaType?: string
  readonly card: ImportedCharacterCard
  readonly transport: CharacterImportTransport
}

/** Raw local file selected from the browser-owned character library. */
export interface CharacterLibraryFileImport {
  readonly data: Uint8Array
  readonly filename: string
  readonly mediaType?: string
}

/** Filesystem location override used by focused checks and portable deployments. */
export interface CharacterLibraryOptions {
  readonly root?: string
}

interface CharacterLibraryAsset {
  readonly summary: CharacterLibrarySummary
  readonly originalFilename: string
  readonly mediaType: string
  readonly data: Uint8Array
}

/** Parsed Host-only contents behind one reusable library id. */
export interface ResolvedCharacterLibraryEntry {
  readonly detail: CharacterLibraryDetail
  readonly card: ImportedCharacterCard
  readonly transport: CharacterImportTransport
}

export interface CharacterLibraryAvatar {
  readonly mediaType: string
  readonly data: Uint8Array
}

export interface CharacterLibraryImageAsset extends CharacterLibraryImage {
  readonly data: Uint8Array
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function parseMetadata(value: unknown): StoredCharacterMetadata {
  const meta = object(value, 'character library metadata')
  const validTransport = meta.transport === 'json' || meta.transport === 'charx'
    ? meta.metadataKeyword === undefined
    : meta.transport === 'png' && (meta.metadataKeyword === 'ccv3' || meta.metadataKeyword === 'chara')
  if (meta.format !== 0 || typeof meta.id !== 'string' || !ID_PATTERN.test(meta.id)
    || typeof meta.originalFilename !== 'string' || meta.originalFilename.trim() === ''
    || typeof meta.mediaType !== 'string' || meta.mediaType.trim() === '' || !validTransport
    || typeof meta.bytes !== 'number' || !Number.isSafeInteger(meta.bytes) || meta.bytes < 1
    || typeof meta.createdAt !== 'number' || !Number.isSafeInteger(meta.createdAt) || meta.createdAt < 0
    || typeof meta.updatedAt !== 'number' || !Number.isSafeInteger(meta.updatedAt) || meta.updatedAt < 0
    || (meta.archivedAt !== undefined
      && (typeof meta.archivedAt !== 'number' || !Number.isSafeInteger(meta.archivedAt) || meta.archivedAt < 0))) {
    throw new Error('character library metadata has invalid fields')
  }
  return meta as unknown as StoredCharacterMetadata
}

function safeFilename(value: string | undefined, transport: 'png' | 'json' | 'charx'): string {
  const fallback = `character.${transport}`
  const name = basename(value?.trim() || fallback).trim()
  return name === '' ? fallback : name.slice(0, 240)
}

function summary(
  meta: StoredCharacterMetadata,
  card: ImportedCharacterCard,
  avatarAvailable: boolean,
  imageAssetCount: number,
): CharacterLibrarySummary {
  return {
    id: meta.id,
    name: card.name,
    displayName: card.nickname?.trim() || card.name,
    originalFilename: meta.originalFilename,
    cardVersion: card.version,
    greetingCount: 1 + card.alternateGreetings.length,
    worldInfoCount: card.lorebook?.entries.length ?? 0,
    avatarAvailable,
    imageAssetCount,
    archived: meta.archivedAt !== undefined,
    transport: meta.transport,
    importedAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  }
}

/** Small content-addressed card library; the original PNG, JSON, or CHARX remains exportable. */
export class CharacterLibrary {
  readonly root: string

  constructor(options: CharacterLibraryOptions = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'characters'))
  }

  /** List active or archived cards newest first without returning greeting bodies or file bytes. */
  list(collection: 'active' | 'archived' = 'active'): readonly CharacterLibrarySummary[] {
    if (!existsSync(this.root)) return []
    return readdirSync(this.root)
      .filter(filename => filename.endsWith(META_SUFFIX))
      .map(filename => this.readEntry(join(this.root, filename)).summary)
      .filter(entry => entry.archived === (collection === 'archived'))
      .sort((left, right) => right.importedAt - left.importedAt || left.displayName.localeCompare(right.displayName))
  }

  /** Load card metadata and selectable greetings by opaque id. */
  get(id: string): CharacterLibraryDetail {
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    return {
      ...summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length),
      mediaType: entry.meta.mediaType,
      greetings: [parsed.card.firstMessage, ...parsed.card.alternateGreetings],
      imageAssets: parsed.images.map(({ data: _data, ...image }) => image),
    }
  }

  /** Resolve one reusable card for a model-free Session launch. */
  resolve(id: string): ResolvedCharacterLibraryEntry {
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    return {
      detail: {
        ...summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length),
        mediaType: entry.meta.mediaType,
        greetings: [parsed.card.firstMessage, ...parsed.card.alternateGreetings],
        imageAssets: parsed.images.map(({ data: _data, ...image }) => image),
      },
      card: parsed.card,
      transport: entry.meta.transport === 'png'
        ? { transport: 'png', metadataKeyword: entry.meta.metadataKeyword! }
        : { transport: entry.meta.transport },
    }
  }

  /** Load the original immutable asset by opaque id. */
  asset(id: string): CharacterLibraryAsset {
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    return {
      summary: summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length),
      originalFilename: entry.meta.originalFilename,
      mediaType: entry.meta.mediaType,
      data: entry.data,
    }
  }

  /** Load the primary inert avatar image without exposing the enclosing CHARX archive. */
  avatar(id: string): CharacterLibraryAvatar | undefined {
    const entry = this.readId(id)
    return this.parseStored(entry.meta, entry.data).avatar
  }

  /** Load one card-declared embedded image by its stable V3 asset index. */
  image(id: string, index: number): CharacterLibraryImageAsset | undefined {
    if (!Number.isSafeInteger(index) || index < 0) return undefined
    const entry = this.readId(id)
    return this.parseStored(entry.meta, entry.data).images.find(image => image.index === index)
  }

  /** Save one already validated card, deduplicating exact original bytes. */
  import(input: CharacterLibraryImport): CharacterLibraryDetail {
    return this.importWithOutcome(input).entry
  }

  /** Save one validated card and report whether it was added, reused, or restored. */
  importWithOutcome(input: CharacterLibraryImport): CharacterLibraryImportResult {
    const digest = createHash('sha256').update(input.data).digest('hex')
    const id = `card-${digest.slice(0, 32)}`
    const existingMeta = this.metaPath(id)
    if (existsSync(existingMeta)) {
      const existing = this.get(id)
      return existing.archived
        ? { entry: this.restore(id), outcome: 'restored' }
        : { entry: existing, outcome: 'existing' }
    }
    mkdirSync(this.root, { recursive: true, mode: 0o700 })
    const now = Date.now()
    const transport = input.transport.transport
    const meta: StoredCharacterMetadata = {
      format: 0,
      id,
      originalFilename: safeFilename(input.filename, transport),
      mediaType: input.mediaType?.trim() || (transport === 'png' ? 'image/png'
        : transport === 'charx' ? 'application/zip' : 'application/json'),
      transport,
      ...(input.transport.transport === 'png' ? { metadataKeyword: input.transport.metadataKeyword } : {}),
      bytes: input.data.byteLength,
      createdAt: now,
      updatedAt: now,
    }
    const assetPath = this.assetPath(meta)
    const assetStaging = join(this.root, `.${id}.${process.pid}.${randomUUID()}.${transport}.tmp`)
    const metaStaging = join(this.root, `.${id}.${process.pid}.${randomUUID()}.meta.tmp`)
    try {
      writeFileSync(assetStaging, input.data, { mode: 0o600 })
      writeFileSync(metaStaging, `${JSON.stringify(meta, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(assetStaging, assetPath)
      renameSync(metaStaging, existingMeta)
    } catch (error: unknown) {
      rmSync(assetStaging, { force: true })
      rmSync(metaStaging, { force: true })
      if (existsSync(existingMeta)) {
        const existing = this.get(id)
        return existing.archived
          ? { entry: this.restore(id), outcome: 'restored' }
          : { entry: existing, outcome: 'existing' }
      }
      rmSync(assetPath, { force: true })
      throw error
    }
    const detail = this.get(id)
    if (detail.name !== input.card.name || detail.cardVersion !== input.card.version) {
      throw new Error('stored character card does not match the validated import')
    }
    return { entry: detail, outcome: 'created' }
  }

  /** Parse and save one supported Character Card file selected from the local browser. */
  importFile(input: CharacterLibraryFileImport): CharacterLibraryDetail {
    return this.importFileWithOutcome(input).entry
  }

  /** Parse one browser-selected card file and report its library import outcome. */
  importFileWithOutcome(input: CharacterLibraryFileImport): CharacterLibraryImportResult {
    const filename = input.filename.trim()
    const mediaType = input.mediaType?.split(';', 1)[0]?.trim().toLocaleLowerCase()
    if (/\.charx$/iu.test(filename) || mediaType === 'application/zip') {
      const card = parseCharx(input.data).card
      return this.importWithOutcome({ ...input, card, transport: { transport: 'charx' } })
    }
    if (/\.json$/iu.test(filename) || mediaType === 'application/json') {
      const card = parseCharacterCardJsonBytes(input.data)
      return this.importWithOutcome({ ...input, card, transport: { transport: 'json' } })
    }
    if (/\.png$/iu.test(filename) || mediaType === 'image/png') {
      const payload = readCharacterCardPng(input.data)
      const card = parseCharacterCardJson(payload.json)
      return this.importWithOutcome({
        ...input,
        card,
        transport: { transport: 'png', metadataKeyword: payload.keyword },
      })
    }
    throw new Error('请选择 PNG、JSON 或 CHARX 角色卡')
  }

  /** Hide one reusable card from the everyday collection without touching its original asset. */
  archive(id: string): CharacterLibraryDetail {
    const entry = this.readId(id)
    if (entry.meta.archivedAt !== undefined) return this.get(id)
    const now = Date.now()
    this.writeMetadata({ ...entry.meta, archivedAt: now, updatedAt: now })
    return this.get(id)
  }

  /** Return one archived card to the everyday collection without changing its original asset. */
  restore(id: string): CharacterLibraryDetail {
    const entry = this.readId(id)
    if (entry.meta.archivedAt === undefined) return this.get(id)
    const { archivedAt: _archivedAt, ...active } = entry.meta
    this.writeMetadata({ ...active, updatedAt: Date.now() })
    return this.get(id)
  }

  private assertId(id: string): void {
    if (!ID_PATTERN.test(id)) throw new Error('角色库 id 无效')
  }

  private metaPath(id: string): string {
    this.assertId(id)
    return join(this.root, `${id}${META_SUFFIX}`)
  }

  private assetPath(meta: StoredCharacterMetadata): string {
    return join(this.root, `${meta.id}.${meta.transport}`)
  }

  private writeMetadata(meta: StoredCharacterMetadata): void {
    const staging = join(this.root, `.${meta.id}.${process.pid}.${randomUUID()}.meta.tmp`)
    try {
      writeFileSync(staging, `${JSON.stringify(meta, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(staging, this.metaPath(meta.id))
    } finally {
      rmSync(staging, { force: true })
    }
  }

  private parseStored(meta: StoredCharacterMetadata, data: Uint8Array): {
    readonly card: ImportedCharacterCard
    readonly avatar?: CharacterLibraryAvatar
    readonly images: readonly CharacterLibraryImageAsset[]
  } {
    if (meta.transport === 'json') return { card: parseCharacterCardJsonBytes(data), images: [] }
    if (meta.transport === 'charx') {
      const charx = parseCharx(data)
      const avatar = charxAvatar(charx)
      const images = charxImageAssets(charx).map(image => ({
        index: image.index,
        type: image.type,
        name: image.name,
        mediaType: image.mediaType,
        sourceUri: charx.card.assets?.[image.index]?.uri ?? '',
        data: image.data,
      }))
      return {
        card: charx.card,
        images,
        ...(avatar === undefined ? {} : { avatar: { mediaType: avatar.mediaType, data: avatar.data } }),
      }
    }
    const payload = readCharacterCardPng(data)
    if (payload.keyword !== meta.metadataKeyword) throw new Error('character library PNG metadata keyword changed')
    return { card: parseCharacterCardJson(payload.json), avatar: { mediaType: 'image/png', data }, images: [] }
  }

  private readId(id: string): { readonly meta: StoredCharacterMetadata; readonly data: Uint8Array } {
    const metaPath = this.metaPath(id)
    if (!existsSync(metaPath)) throw new Error(`角色库中没有 ${JSON.stringify(id)}`)
    let meta: StoredCharacterMetadata
    try {
      meta = parseMetadata(JSON.parse(readFileSync(metaPath, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取角色库文件 ${JSON.stringify(metaPath)}`, { cause: error })
    }
    if (meta.id !== id) throw new Error('character library filename and metadata id differ')
    const assetPath = this.assetPath(meta)
    const data = new Uint8Array(readFileSync(assetPath))
    if (data.byteLength !== meta.bytes) throw new Error('character library asset byte count changed')
    return { meta, data }
  }

  private readEntry(metaPath: string): { readonly summary: CharacterLibrarySummary } {
    let id: string
    try {
      id = parseMetadata(JSON.parse(readFileSync(metaPath, 'utf8'))).id
    } catch (error: unknown) {
      throw new Error(`无法读取角色库文件 ${JSON.stringify(metaPath)}`, { cause: error })
    }
    return { summary: this.asset(id).summary }
  }
}
