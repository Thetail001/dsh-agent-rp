/** Safe browser-side discovery for one-time SillyTavern library migration. */

import { unzip, type UnzipFileInfo } from 'fflate'
import { classifySillyTavernJsonFile, type SillyTavernJsonKind } from './import-hint.ts'
import { MAX_REGEX_PACK_BYTES } from '../regex-pack-library-protocol.ts'

const MEBIBYTE = 1024 * 1024
const MAX_ARCHIVE_BYTES = 512 * MEBIBYTE
const MAX_ARCHIVE_ENTRIES = 50_000
const MAX_EXTRACTED_CANDIDATE_BYTES = 512 * MEBIBYTE
const MAX_CHARACTER_BYTES = 64 * MEBIBYTE
const MAX_PRESET_BYTES = 64 * MEBIBYTE
const MAX_WORLD_INFO_BYTES = 2 * MEBIBYTE
export type SillyTavernMigrationAssetKind = 'character' | 'preset' | 'regex-pack' | 'world-info'
export type SillyTavernMigrationDeferredKind = 'chat' | 'group-chat' | 'persona'
export type SillyTavernMigrationAssetState = 'ready' | 'already-imported' | 'duplicate' | 'too-large'

/** One file-like source. ZIP chats may omit `file` because the first release only previews them. */
export interface SillyTavernMigrationSource {
  readonly path: string
  readonly bytes: number
  readonly file?: File
}

/** Existing Host resources used for exact, model-free duplicate detection. */
export interface SillyTavernMigrationExistingResources {
  readonly characters: readonly { readonly id: string; readonly archived: boolean }[]
  readonly worldInfoIds: readonly string[]
}

/** One importable source and its preview-time disposition. */
export interface SillyTavernMigrationAsset {
  readonly id: string
  readonly kind: SillyTavernMigrationAssetKind
  readonly name: string
  readonly path: string
  readonly bytes: number
  readonly file: File
  readonly state: SillyTavernMigrationAssetState
  readonly selectedByDefault: boolean
  readonly note?: string
}

/** One recognized resource deliberately deferred by the first migration release. */
export interface SillyTavernMigrationDeferred {
  readonly kind: SillyTavernMigrationDeferredKind
  readonly name: string
  readonly path: string
  readonly bytes: number
  readonly characterName?: string
}

/** A bounded problem shown before any Host-owned library is modified. */
export interface SillyTavernMigrationIssue {
  readonly path: string
  readonly message: string
}

/** Complete inert scan result. */
export interface SillyTavernMigrationScan {
  readonly assets: readonly SillyTavernMigrationAsset[]
  readonly deferred: readonly SillyTavernMigrationDeferred[]
  readonly issues: readonly SillyTavernMigrationIssue[]
  readonly ignoredCount: number
  readonly totalFiles: number
}

interface DeferredPathClassification {
  readonly kind: SillyTavernMigrationDeferredKind
  readonly characterName?: string
}

type PathClassification = DeferredPathClassification | {
  readonly kind: SillyTavernMigrationAssetKind | 'json' | 'ignore'
}

const ignoredDirectorySegments = new Set([
  'assets', 'backgrounds', 'backups', 'comfyworkflows', 'context', 'extensions', 'instruct',
  'koboldai settings', 'movingui', 'novelai settings', 'quickreplies', 'reasoning', 'sysprompt',
  'textgen settings', 'themes', 'thumbnails', 'user', 'vectors',
])

function normalizedPath(value: string): string | undefined {
  const parts: string[] = []
  for (const part of value.replaceAll('\\', '/').split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..' || part.includes('\0')) return undefined
    parts.push(part)
  }
  return parts.length === 0 ? undefined : parts.join('/')
}

function filename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function extension(path: string): string {
  const name = filename(path)
  const index = name.lastIndexOf('.')
  return index < 0 ? '' : name.slice(index).toLocaleLowerCase()
}

function directChildOf(parts: readonly string[], segment: string): boolean {
  const index = parts.lastIndexOf(segment)
  return index >= 0 && index === parts.length - 2
}

function classifyPath(path: string): PathClassification {
  const parts = path.split('/')
  const lower = parts.map(part => part.toLocaleLowerCase())
  const ext = extension(path)
  if (lower.includes('group chats') && ext === '.jsonl') return { kind: 'group-chat' }
  const chatIndex = lower.lastIndexOf('chats')
  if (chatIndex >= 0 && ext === '.jsonl') {
    const characterName = parts[chatIndex + 1]?.trim()
    return { kind: 'chat', ...(characterName === undefined || characterName === '' ? {} : { characterName }) }
  }
  if (directChildOf(lower, 'user avatars') && ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return { kind: 'persona' }
  }
  if (directChildOf(lower, 'characters') && ['.png', '.json', '.charx'].includes(ext)) {
    return { kind: 'character' }
  }
  if (directChildOf(lower, 'worlds') && ext === '.json') return { kind: 'world-info' }
  if (directChildOf(lower, 'openai settings') && ext === '.json') return { kind: 'preset' }
  if (lower.some(part => ignoredDirectorySegments.has(part))
    || ['settings.json', 'secrets.json'].includes(lower.at(-1) ?? '')) return { kind: 'ignore' }
  if (ext === '.json') return { kind: 'json' }
  if (ext === '.jsonl') return { kind: 'chat' }
  if (ext === '.charx' || (parts.length === 1 && ext === '.png')) return { kind: 'character' }
  return { kind: 'ignore' }
}

function shouldExtractFromArchive(info: UnzipFileInfo): boolean {
  const path = normalizedPath(info.name)
  if (path === undefined || info.name.endsWith('/')) return false
  const classification = classifyPath(path)
  return classification.kind === 'character' || classification.kind === 'preset'
    || classification.kind === 'world-info' || classification.kind === 'json'
}

function mimeType(path: string): string {
  const ext = extension(path)
  if (ext === '.png') return 'image/png'
  if (ext === '.json') return 'application/json'
  if (ext === '.charx' || ext === '.zip') return 'application/zip'
  if (ext === '.jsonl') return 'application/x-ndjson'
  return 'application/octet-stream'
}

function unzipArchive(archive: File): Promise<readonly SillyTavernMigrationSource[]> {
  if (archive.size === 0) throw new Error('SillyTavern 数据 ZIP 为空')
  if (archive.size > MAX_ARCHIVE_BYTES) throw new Error('SillyTavern 数据 ZIP 超过 512 MiB；请拆分后迁移')
  return archive.arrayBuffer().then(buffer => new Promise((resolve, reject) => {
    const catalog: { readonly archiveName: string; readonly path: string; readonly bytes: number }[] = []
    let entryCount = 0
    let extractedBytes = 0
    unzip(new Uint8Array(buffer), {
      filter(info) {
        entryCount += 1
        if (entryCount > MAX_ARCHIVE_ENTRIES) throw new Error('ZIP 文件数量超过安全上限（50,000）')
        const path = normalizedPath(info.name)
        if (path === undefined || info.name.endsWith('/')) return false
        catalog.push({ archiveName: info.name, path, bytes: info.originalSize })
        const extract = shouldExtractFromArchive(info)
        if (extract) {
          extractedBytes += info.originalSize
          if (extractedBytes > MAX_EXTRACTED_CANDIDATE_BYTES) {
            throw new Error('ZIP 中可迁移资源超过 512 MiB；请拆分后迁移')
          }
        }
        return extract
      },
    }, (error, extracted) => {
      if (error !== null) {
        reject(new Error(`无法读取 SillyTavern 数据 ZIP：${error.message}`, { cause: error }))
        return
      }
      resolve(catalog.map(entry => {
        const bytes = extracted[entry.archiveName]
        return {
          path: entry.path,
          bytes: entry.bytes,
          ...(bytes === undefined ? {} : {
            file: new File([bytes], filename(entry.path), { type: mimeType(entry.path) }),
          }),
        }
      }))
    })
  }))
}

/** Expand a selected ZIP, directory, or multi-file selection without evaluating embedded scripts. */
export async function collectSillyTavernMigrationSources(
  files: readonly File[],
): Promise<readonly SillyTavernMigrationSource[]> {
  if (files.length === 0) throw new Error('请选择 SillyTavern 数据 ZIP、数据目录或多个资源文件')
  if (files.length === 1 && /\.zip$/iu.test(files[0]?.name ?? '')) return unzipArchive(files[0]!)
  return files.map(file => {
    const relativePath = (file as File & { readonly webkitRelativePath?: string }).webkitRelativePath?.trim()
    return {
      path: normalizedPath(relativePath || file.name) ?? file.name,
      bytes: file.size,
      file,
    }
  })
}

function jsonKindToAsset(kind: SillyTavernJsonKind): SillyTavernMigrationAssetKind | undefined {
  if (kind === 'character-card') return 'character'
  if (kind === 'world-info') return 'world-info'
  if (kind === 'preset') return 'preset'
  if (kind === 'regex-pack') return 'regex-pack'
  return undefined
}

function sizeLimit(kind: SillyTavernMigrationAssetKind): number {
  if (kind === 'world-info') return MAX_WORLD_INFO_BYTES
  if (kind === 'regex-pack') return MAX_REGEX_PACK_BYTES
  return kind === 'preset' ? MAX_PRESET_BYTES : MAX_CHARACTER_BYTES
}

function sizeLabel(bytes: number): string {
  const mebibytes = bytes / MEBIBYTE
  return `${mebibytes.toFixed(mebibytes < 10 ? 1 : 0)} MiB`
}

async function fingerprint(file: File, path: string): Promise<{ readonly batch: string; readonly sha256?: string }> {
  const batchFallback = `unhashed:${path}:${file.size}:${file.lastModified}`
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) return { batch: batchFallback }
  try {
    const digest = await subtle.digest('SHA-256', await file.arrayBuffer())
    const sha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
    return { batch: sha256, sha256 }
  } catch {
    // LAN-hosted mobile browsers may not expose Web Crypto outside a secure context.
    return { batch: batchFallback }
  }
}

function deferredSource(
  source: SillyTavernMigrationSource,
  classification: DeferredPathClassification,
): SillyTavernMigrationDeferred {
  return {
    kind: classification.kind,
    name: filename(source.path),
    path: source.path,
    bytes: source.bytes,
    ...(classification.characterName === undefined ? {} : { characterName: classification.characterName }),
  }
}

/**
 * Classify a complete selection before any import begins.
 * API keys, global settings, plugin caches, and unrelated media are counted but never read.
 */
export async function scanSillyTavernMigration(
  sources: readonly SillyTavernMigrationSource[],
  existing: SillyTavernMigrationExistingResources,
): Promise<SillyTavernMigrationScan> {
  const candidates: { readonly source: SillyTavernMigrationSource; readonly kind: SillyTavernMigrationAssetKind }[] = []
  const deferred: SillyTavernMigrationDeferred[] = []
  const issues: SillyTavernMigrationIssue[] = []
  let ignoredCount = 0
  for (const source of sources) {
    const classification = classifyPath(source.path)
    if (classification.kind === 'chat' || classification.kind === 'group-chat' || classification.kind === 'persona') {
      deferred.push(deferredSource(source, classification))
      continue
    }
    if (classification.kind === 'ignore') {
      ignoredCount += 1
      continue
    }
    let kind: SillyTavernMigrationAssetKind | undefined = classification.kind === 'json'
      ? undefined : classification.kind
    if (classification.kind === 'json') {
      kind = source.file === undefined ? undefined : jsonKindToAsset(await classifySillyTavernJsonFile(source.file))
    }
    if (kind === undefined || source.file === undefined) {
      issues.push({ path: source.path, message: '无法识别为角色卡、世界书、Chat Completion 预设或独立正则包' })
      continue
    }
    candidates.push({ source, kind })
  }

  const existingCharacters = new Map(existing.characters.map(entry => [entry.id, entry.archived] as const))
  const existingWorldInfos = new Set(existing.worldInfoIds)
  const batch = new Map<string, string>()
  const assets: SillyTavernMigrationAsset[] = []
  for (const candidate of candidates) {
    const { source, kind } = candidate
    const limit = sizeLimit(kind)
    if (source.bytes > limit) {
      assets.push({
        id: `too-large:${assets.length}:${source.path}`,
        kind,
        name: filename(source.path),
        path: source.path,
        bytes: source.bytes,
        file: source.file!,
        state: 'too-large',
        selectedByDefault: false,
        note: `文件为 ${sizeLabel(source.bytes)}，当前上限为 ${sizeLabel(limit)}`,
      })
      continue
    }
    const digest = await fingerprint(source.file!, source.path)
    const duplicateKey = `${kind}:${digest.batch}`
    const sameBatch = batch.get(duplicateKey)
    const hostId = digest.sha256 === undefined ? undefined
      : kind === 'character' ? `card-${digest.sha256.slice(0, 32)}`
        : kind === 'world-info' ? `world-info-${digest.sha256.slice(0, 32)}` : undefined
    const archived = hostId === undefined ? undefined : existingCharacters.get(hostId)
    const alreadyImported = kind === 'character' ? archived === false
      : kind === 'world-info' && hostId !== undefined && existingWorldInfos.has(hostId)
    let state: SillyTavernMigrationAssetState = 'ready'
    let selectedByDefault = true
    let note: string | undefined
    if (sameBatch !== undefined) {
      state = 'duplicate'
      selectedByDefault = false
      note = `与本批次「${sameBatch}」内容相同`
    } else if (alreadyImported) {
      state = 'already-imported'
      selectedByDefault = false
      note = '资源中心已经有相同内容'
    } else if (kind === 'character' && archived === true) {
      note = '导入后会从收纳箱恢复'
    }
    batch.set(duplicateKey, filename(source.path))
    assets.push({
      id: `${kind}:${digest.batch}:${assets.length}`,
      kind,
      name: filename(source.path),
      path: source.path,
      bytes: source.bytes,
      file: source.file!,
      state,
      selectedByDefault,
      ...(note === undefined ? {} : { note }),
    })
  }
  return { assets, deferred, issues, ignoredCount, totalFiles: sources.length }
}

/** Collect and classify one browser selection in a single inert preview operation. */
export async function prepareSillyTavernMigration(
  files: readonly File[],
  existing: SillyTavernMigrationExistingResources,
): Promise<SillyTavernMigrationScan> {
  return scanSillyTavernMigration(await collectSillyTavernMigrationSources(files), existing)
}
