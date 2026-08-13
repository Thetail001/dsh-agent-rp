/** Bounded Character Card V3 CHARX archive parsing. */

import { unzipSync, type UnzipFileInfo } from 'fflate'
import { parseCharacterCardJsonBytes } from './character-card.ts'
import type { ImportedCharacterCard } from './types.ts'

/** Largest compressed CHARX file accepted by the importer. */
export const MAX_CHARX_BYTES = 64 * 1024 * 1024
/** Largest total uncompressed payload accepted from one CHARX archive. */
export const MAX_CHARX_UNCOMPRESSED_BYTES = 128 * 1024 * 1024
/** Largest entry count accepted from one CHARX archive. */
export const MAX_CHARX_ENTRIES = 512

/** Validated CHARX transport with the canonical root card. */
export interface ImportedCharx {
  readonly card: ImportedCharacterCard
  readonly entries: ReadonlyMap<string, Uint8Array>
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
  readonly data: Uint8Array
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

function archiveFilter(seen: Set<string>, totals: { entries: number; bytes: number }): (file: UnzipFileInfo) => boolean {
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
    return true
  }
}

/** Parse one non-encrypted CHARX ZIP while bounding archive expansion. */
export function parseCharx(data: Uint8Array): ImportedCharx {
  if (data.byteLength > MAX_CHARX_BYTES) throw new Error(`CHARX exceeds ${MAX_CHARX_BYTES} bytes`)
  const seen = new Set<string>()
  const totals = { entries: 0, bytes: 0 }
  let extracted: Record<string, Uint8Array>
  try {
    extracted = unzipSync(data, { filter: archiveFilter(seen, totals) })
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('CHARX ')) throw error
    throw new Error('CHARX is not a supported ZIP archive', { cause: error })
  }
  const entries = new Map<string, Uint8Array>()
  for (const [sourcePath, bytes] of Object.entries(extracted)) {
    entries.set(normalizeCharxPath(sourcePath), bytes)
  }
  const cardBytes = entries.get('card.json')
  if (cardBytes === undefined) throw new Error('CHARX must contain card.json at the archive root')
  const card = parseCharacterCardJsonBytes(cardBytes)
  if (card.version !== 3) throw new Error('CHARX card.json must contain Character Card V3')
  return { card, entries }
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
    const data = path === undefined ? undefined : charx.entries.get(path)
    if (path === undefined || mediaType === undefined || data === undefined) return []
    return [{
      index,
      type: asset.type.trim().toLocaleLowerCase(),
      name: asset.name,
      path,
      mediaType,
      data,
    } satisfies CharxImageAsset]
  })
}

/** Select the card's primary embedded icon according to Character Card V3 rules. */
export function charxAvatar(charx: ImportedCharx): CharxImageAsset | undefined {
  const icons = charxImageAssets(charx).filter(asset => asset.type === 'icon')
  return icons.find(asset => asset.name.trim().toLocaleLowerCase() === 'main') ?? icons[0]
}
