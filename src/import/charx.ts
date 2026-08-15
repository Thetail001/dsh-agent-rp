/** Bounded Character Card V3 CHARX archive parsing. */

import { unzipSync, type UnzipFileInfo } from 'fflate'
import { MAX_CHARACTER_CARD_FILE_BYTES, parseCharacterCardJsonBytes } from './character-card.ts'
import type { ImportedCharacterCard } from './types.ts'

/** Largest compressed CHARX file accepted by the importer. */
export const MAX_CHARX_BYTES = MAX_CHARACTER_CARD_FILE_BYTES
/** Largest total uncompressed payload accepted from one CHARX archive. */
export const MAX_CHARX_UNCOMPRESSED_BYTES = 128 * 1024 * 1024
/** Largest entry count accepted from one CHARX archive. */
export const MAX_CHARX_ENTRIES = 4_096

/** One validated archive entry that remains compressed until requested. */
export interface CharxEntry {
  readonly path: string
  readonly bytes: number
}

/** Validated CHARX transport with the canonical root card. */
export interface ImportedCharx {
  readonly card: ImportedCharacterCard
  readonly archive: Uint8Array
  readonly entries: ReadonlyMap<string, CharxEntry>
}

const IMAGE_MEDIA_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

/** One card-declared embedded image safe to expose as inert media. */
export interface CharxImageAsset {
  readonly index: number
  readonly type: string
  readonly name: string
  readonly path: string
  readonly mediaType: string
}

/** Normalize a case-sensitive CHARX entry path without allowing an archive escape. */
export function normalizeCharxPath(value: string): string {
  const normalized = value.replace(/\\/gu, '/')
  if (normalized.startsWith('/') || /^[a-z]:/iu.test(normalized)) {
    throw new Error('CHARX contains an invalid archive path')
  }
  const path = normalized.replace(/\/+$/gu, '')
  if (path === '' || path.includes('\0')) {
    throw new Error('CHARX contains an invalid archive path')
  }
  const segments = path.split('/')
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    throw new Error('CHARX contains an unsafe archive path')
  }
  return segments.join('/')
}

interface ArchiveScan {
  readonly entries: ReadonlyMap<string, CharxEntry>
  readonly extracted: ReadonlyMap<string, Uint8Array>
}

function scanArchive(data: Uint8Array, requested: ReadonlySet<string>): ArchiveScan {
  const seen = new Set<string>()
  const entries = new Map<string, CharxEntry>()
  const totals = { entries: 0, bytes: 0 }
  let extracted: Record<string, Uint8Array>
  try {
    extracted = unzipSync(data, { filter: archiveFilter(seen, entries, totals, requested) })
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('CHARX ')) throw error
    throw new Error('CHARX is not a supported ZIP archive', { cause: error })
  }
  const selected = new Map<string, Uint8Array>()
  for (const [sourcePath, bytes] of Object.entries(extracted)) {
    selected.set(normalizeCharxPath(sourcePath), bytes)
  }
  return { entries, extracted: selected }
}

function archiveFilter(
  seen: Set<string>,
  entries: Map<string, CharxEntry>,
  totals: { entries: number; bytes: number },
  requested: ReadonlySet<string>,
): (file: UnzipFileInfo) => boolean {
  return file => {
    const path = normalizeCharxPath(file.name)
    totals.entries += 1
    totals.bytes += file.originalSize
    if (totals.entries > MAX_CHARX_ENTRIES) throw new Error(`CHARX contains more than ${MAX_CHARX_ENTRIES} entries`)
    if (!Number.isSafeInteger(file.originalSize) || file.originalSize < 0
      || totals.bytes > MAX_CHARX_UNCOMPRESSED_BYTES) {
      throw new Error(`CHARX expands beyond ${MAX_CHARX_UNCOMPRESSED_BYTES} bytes`)
    }
    if (seen.has(path)) throw new Error(`CHARX contains duplicate path ${JSON.stringify(path)}`)
    seen.add(path)
    entries.set(path, { path, bytes: file.originalSize })
    return requested.has(path)
  }
}

/** Parse one non-encrypted CHARX ZIP without inflating unrequested media. */
export function parseCharx(data: Uint8Array): ImportedCharx {
  if (data.byteLength > MAX_CHARX_BYTES) throw new Error(`CHARX exceeds ${MAX_CHARX_BYTES} bytes`)
  const scan = scanArchive(data, new Set(['card.json']))
  const cardBytes = scan.extracted.get('card.json')
  if (cardBytes === undefined) throw new Error('CHARX must contain card.json at the archive root')
  const card = parseCharacterCardJsonBytes(cardBytes)
  if (card.version !== 3) throw new Error('CHARX card.json must contain Character Card V3')
  return { card, archive: data, entries: scan.entries }
}

/** Inflate one validated entry while leaving every other archive payload compressed. */
export function readCharxEntry(charx: ImportedCharx, sourcePath: string): Uint8Array | undefined {
  const path = normalizeCharxPath(sourcePath)
  if (!charx.entries.has(path)) return undefined
  return scanArchive(charx.archive, new Set([path])).extracted.get(path)
}

function embeddedPath(uri: string): string | undefined {
  const value = uri.trim()
  const prefix = ['embeded://', 'embedded://', '__asset:'].find(candidate =>
    value.toLocaleLowerCase().startsWith(candidate))
  return prefix === undefined ? undefined : normalizeCharxPath(value.slice(prefix.length))
}

/** Resolve card-declared embedded image assets, declining code and unknown media. */
export function charxImageAssets(charx: ImportedCharx): readonly CharxImageAsset[] {
  return (charx.card.assets ?? []).flatMap((asset, index) => {
    const path = embeddedPath(asset.uri)
    const ext = asset.ext.trim().toLocaleLowerCase().replace(/^\./u, '')
    const mediaType = IMAGE_MEDIA_TYPES[ext]
    if (path === undefined || mediaType === undefined || !charx.entries.has(path)) return []
    return [{
      index,
      type: asset.type.trim().toLocaleLowerCase(),
      name: asset.name,
      path,
      mediaType,
    } satisfies CharxImageAsset]
  })
}

/** Inflate one card-declared inert image selected from a parsed CHARX manifest. */
export function readCharxImageAsset(charx: ImportedCharx, asset: CharxImageAsset): Uint8Array {
  const data = readCharxEntry(charx, asset.path)
  if (data === undefined) throw new Error(`CHARX image entry ${JSON.stringify(asset.path)} is missing`)
  return data
}

/** Select the card's primary embedded icon according to Character Card V3 rules. */
export function charxAvatar(charx: ImportedCharx): CharxImageAsset | undefined {
  const icons = charxImageAssets(charx).filter(asset => asset.type === 'icon')
  return icons.find(asset => asset.name.trim().toLocaleLowerCase() === 'main') ?? icons[0]
}
