/** Host-owned reusable Character Card library retaining original transport bytes. */

import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import type { CharacterImportTransport } from './import/session-character.ts'
import type { ImportedCharacterCard, ImportedRegexScript, TavernHelperImportSummary } from './import/types.ts'
import { parseCharacterCardJson, parseCharacterCardJsonBytes, parseCharacterCardValue } from './import/character-card.ts'
import { parseRegexScript } from './import/regex-script.ts'
import { readCharacterCardPng } from './import/png.ts'
import { charxImageAssets, parseCharx } from './import/charx.ts'
import { AI_OUTPUT_PLACEMENT, renderCharacterDisplay, summarizeCharacterRegexScript } from './frontend-regex.ts'
import type {
  CharacterLibraryDetail, CharacterLibraryDisplayExtension, CharacterLibraryImage, CharacterLibraryImportResult,
  CharacterLibrarySummary, CharacterLibraryWorldInfo,
} from './character-library-protocol.ts'

const META_SUFFIX = '.meta.json'
const OVERLAY_SUFFIX = '.overlay.json'
const ID_PATTERN = /^card-[a-f0-9]{32}$/u
const DISPLAY_EXTENSION_ID_PATTERN = /^display-[a-f0-9]{32}$/u
const MAX_DISPLAY_EXTENSION_BYTES = 256 * 1024

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
  readonly index?: StoredCharacterIndex
}

interface StoredCharacterIndex {
  readonly format: 0
  readonly name: string
  readonly displayName: string
  readonly cardVersion: 1 | 2 | 3
  readonly greetingCount: number
  readonly worldInfoCount: number
  readonly regexScriptCount: number
  readonly avatarAvailable: boolean
  readonly imageAssetCount: number
  readonly tavernHelper?: TavernHelperImportSummary
}

interface StoredTextReplacement {
  readonly from: string
  readonly to: string
  readonly expectedMatches: number
}

interface StoredDisplayExtension {
  readonly id: string
  readonly originalFilename: string
  readonly importedAt: number
  readonly enabled: boolean
  readonly remoteImageOrigins: readonly string[]
  readonly replacedCardRegexIndices: readonly number[]
  readonly script: ImportedRegexScript
}

interface StoredCharacterOverlay {
  readonly format: 0
  readonly textReplacements: readonly StoredTextReplacement[]
  readonly displayExtensions: readonly StoredDisplayExtension[]
}

/** Browser-selected standalone SillyTavern display regex. */
export interface CharacterDisplayExtensionImport {
  readonly data: Uint8Array
  readonly filename: string
  readonly approvedImageOrigins: readonly string[]
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
  readonly source: {
    readonly bytes: number
    readonly originalFilename: string
    readonly mediaType: string
  }
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

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`)
  return value
}

function parseTavernHelperSummary(value: unknown): TavernHelperImportSummary | undefined {
  if (value === undefined) return undefined
  const summary = object(value, 'character library index Tavern Helper summary')
  if (summary.format !== 'object' && summary.format !== 'entries') {
    throw new Error('character library index Tavern Helper format is invalid')
  }
  const expectedScriptCount = summary.expectedScriptCount === undefined
    ? undefined
    : nonNegativeInteger(summary.expectedScriptCount, 'character library index expected script count')
  return {
    format: summary.format,
    scriptCount: nonNegativeInteger(summary.scriptCount, 'character library index script count'),
    enabledScriptCount: nonNegativeInteger(summary.enabledScriptCount, 'character library index enabled script count'),
    variableCount: nonNegativeInteger(summary.variableCount, 'character library index variable count'),
    ignoredFieldCount: nonNegativeInteger(summary.ignoredFieldCount, 'character library index ignored field count'),
    ...(expectedScriptCount === undefined ? {} : { expectedScriptCount }),
  }
}

function parseStoredIndex(value: unknown): StoredCharacterIndex {
  const index = object(value, 'character library index')
  if (index.format !== 0 || typeof index.name !== 'string' || typeof index.displayName !== 'string'
    || (index.cardVersion !== 1 && index.cardVersion !== 2 && index.cardVersion !== 3)
    || typeof index.avatarAvailable !== 'boolean') {
    throw new Error('character library index has invalid fields')
  }
  const tavernHelper = parseTavernHelperSummary(index.tavernHelper)
  return {
    format: 0,
    name: index.name,
    displayName: index.displayName,
    cardVersion: index.cardVersion,
    greetingCount: nonNegativeInteger(index.greetingCount, 'character library index greeting count'),
    worldInfoCount: nonNegativeInteger(index.worldInfoCount, 'character library index World Info count'),
    regexScriptCount: nonNegativeInteger(index.regexScriptCount, 'character library index regex count'),
    avatarAvailable: index.avatarAvailable,
    imageAssetCount: nonNegativeInteger(index.imageAssetCount, 'character library index image count'),
    ...(tavernHelper === undefined ? {} : { tavernHelper }),
  }
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
  const index = meta.index === undefined ? undefined : parseStoredIndex(meta.index)
  return { ...(meta as unknown as StoredCharacterMetadata), ...(index === undefined ? {} : { index }) }
}

function safeHttpsOrigin(value: string, label: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    throw new Error(`${label} must be an HTTPS origin`, { cause: error })
  }
  const hostname = url.hostname.toLocaleLowerCase()
  if (url.protocol !== 'https:' || url.origin !== value || url.username !== '' || url.password !== ''
    || (url.port !== '' && url.port !== '443') || hostname === 'localhost' || hostname.endsWith('.localhost')
    || hostname.endsWith('.local') || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(hostname)) {
    throw new Error(`${label} must be a public HTTPS origin`)
  }
  return url.origin
}

function parseOverlay(value: unknown): StoredCharacterOverlay {
  const record = object(value, 'character library overlay')
  if (record.format !== 0 || !Array.isArray(record.textReplacements) || !Array.isArray(record.displayExtensions)) {
    throw new Error('character library overlay has invalid fields')
  }
  const textReplacements = record.textReplacements.map((item, index) => {
    const replacement = object(item, `character library overlay text replacement ${index + 1}`)
    if (typeof replacement.from !== 'string' || replacement.from === '' || typeof replacement.to !== 'string'
      || typeof replacement.expectedMatches !== 'number' || !Number.isSafeInteger(replacement.expectedMatches)
      || replacement.expectedMatches < 1) {
      throw new Error('character library overlay has an invalid text replacement')
    }
    return replacement as unknown as StoredTextReplacement
  })
  const displayExtensions = record.displayExtensions.map((item, index) => {
    const extension = object(item, `character library display extension ${index + 1}`)
    if (typeof extension.id !== 'string' || !DISPLAY_EXTENSION_ID_PATTERN.test(extension.id)
      || typeof extension.originalFilename !== 'string' || extension.originalFilename.trim() === ''
      || typeof extension.importedAt !== 'number' || !Number.isSafeInteger(extension.importedAt) || extension.importedAt < 0
      || typeof extension.enabled !== 'boolean' || !Array.isArray(extension.remoteImageOrigins)
      || extension.remoteImageOrigins.some(origin => typeof origin !== 'string')
      || !Array.isArray(extension.replacedCardRegexIndices)
      || extension.replacedCardRegexIndices.some(candidate => typeof candidate !== 'number'
        || !Number.isSafeInteger(candidate) || candidate < 0)) {
      throw new Error('character library overlay has an invalid display extension')
    }
    const remoteImageOrigins = extension.remoteImageOrigins.map((origin, originIndex) =>
      safeHttpsOrigin(origin as string, `display extension origin ${originIndex + 1}`))
    const script = parseRegexScript(extension.script as JsonValue, `displayExtensions[${index}].script`)
    return {
      id: extension.id,
      originalFilename: extension.originalFilename,
      importedAt: extension.importedAt,
      enabled: extension.enabled,
      remoteImageOrigins,
      replacedCardRegexIndices: [...extension.replacedCardRegexIndices] as number[],
      script,
    }
  })
  return { format: 0, textReplacements, displayExtensions }
}

function emptyOverlay(): StoredCharacterOverlay {
  return { format: 0, textReplacements: [], displayExtensions: [] }
}

function imageOrigins(script: ImportedRegexScript): readonly string[] {
  const origins = new Set<string>()
  const pattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu
  for (const match of script.replaceString.matchAll(pattern)) {
    const source = match[1] ?? match[2] ?? match[3]
    if (source === undefined || !/^https:\/\//iu.test(source)) continue
    const url = new URL(source)
    origins.add(safeHttpsOrigin(url.origin, 'display extension image origin'))
  }
  return [...origins].sort()
}

function sameMalformedPattern(left: ImportedRegexScript, right: ImportedRegexScript): boolean {
  return !left.findRegex.startsWith('/') && right.findRegex === `/${left.findRegex}`
    && left.replaceString === right.replaceString
    && JSON.stringify(left.placement) === JSON.stringify(right.placement)
    && left.markdownOnly === right.markdownOnly && left.promptOnly === right.promptOnly
}

function replaceStrings(value: unknown, replacement: StoredTextReplacement, state: { matches: number }): unknown {
  if (typeof value === 'string') {
    const matches = value.split(replacement.from).length - 1
    state.matches += matches
    return matches === 0 ? value : value.replaceAll(replacement.from, replacement.to)
  }
  if (Array.isArray(value)) return value.map(item => replaceStrings(item, replacement, state))
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacement, state)]))
}

function cardData(raw: unknown): Record<string, unknown> {
  const root = object(raw, 'character card overlay source')
  return root.spec === 'chara_card_v2' || root.spec === 'chara_card_v3'
    ? object(root.data, 'character card overlay data')
    : root
}

function scriptJson(script: ImportedRegexScript): Record<string, unknown> {
  return {
    ...(script.id === undefined ? {} : { id: script.id }),
    scriptName: script.scriptName,
    findRegex: script.findRegex,
    replaceString: script.replaceString,
    trimStrings: [...script.trimStrings],
    placement: [...script.placement],
    disabled: script.disabled,
    markdownOnly: script.markdownOnly,
    promptOnly: script.promptOnly,
    runOnEdit: script.runOnEdit,
    substituteRegex: script.substituteRegex,
    minDepth: script.minDepth,
    maxDepth: script.maxDepth,
  }
}

function applyOverlay(card: ImportedCharacterCard, overlay: StoredCharacterOverlay): ImportedCharacterCard {
  const enabled = overlay.displayExtensions.filter(extension => extension.enabled)
  if (overlay.textReplacements.length === 0 && enabled.length === 0) return card
  let raw: unknown = structuredClone(card.raw)
  for (const replacement of overlay.textReplacements) {
    const state = { matches: 0 }
    raw = replaceStrings(raw, replacement, state)
    if (state.matches !== replacement.expectedMatches) {
      throw new Error('character library local text correction no longer matches its source')
    }
  }
  if (enabled.length > 0) {
    const data = cardData(raw)
    const extensions = data.extensions === undefined ? {} : object(data.extensions, 'character card overlay extensions')
    const stored = extensions.regex_scripts
    const original = stored === undefined ? [] : Array.isArray(stored) ? stored : (() => {
      throw new Error('character card overlay regex scripts must be an array')
    })()
    const replaced = new Set(enabled.flatMap(extension => extension.replacedCardRegexIndices))
    extensions.regex_scripts = [
      ...original.filter((_script, index) => !replaced.has(index)),
      ...enabled.map(extension => scriptJson(extension.script)),
    ]
    data.extensions = extensions
  }
  return parseCharacterCardValue(raw as JsonValue)
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
    regexScriptCount: card.frontend.regexScripts.length,
    avatarAvailable,
    imageAssetCount,
    ...(card.frontend.tavernHelper === undefined ? {} : { tavernHelper: card.frontend.tavernHelper }),
    archived: meta.archivedAt !== undefined,
    transport: meta.transport,
    importedAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  }
}

function storedIndex(value: CharacterLibrarySummary): StoredCharacterIndex {
  return {
    format: 0,
    name: value.name,
    displayName: value.displayName,
    cardVersion: value.cardVersion,
    greetingCount: value.greetingCount,
    worldInfoCount: value.worldInfoCount,
    regexScriptCount: value.regexScriptCount,
    avatarAvailable: value.avatarAvailable,
    imageAssetCount: value.imageAssetCount,
    ...(value.tavernHelper === undefined ? {} : { tavernHelper: value.tavernHelper }),
  }
}

function indexedSummary(meta: StoredCharacterMetadata, index: StoredCharacterIndex): CharacterLibrarySummary {
  return {
    id: meta.id,
    name: index.name,
    displayName: index.displayName,
    originalFilename: meta.originalFilename,
    cardVersion: index.cardVersion,
    greetingCount: index.greetingCount,
    worldInfoCount: index.worldInfoCount,
    regexScriptCount: index.regexScriptCount,
    avatarAvailable: index.avatarAvailable,
    imageAssetCount: index.imageAssetCount,
    ...(index.tavernHelper === undefined ? {} : { tavernHelper: index.tavernHelper }),
    archived: meta.archivedAt !== undefined,
    transport: meta.transport,
    importedAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  }
}

function greetingDetail(card: ImportedCharacterCard): {
  readonly greetings: readonly string[]
  readonly renderedGreetings: readonly string[]
} {
  const greetings = [card.firstMessage, ...card.alternateGreetings]
  return {
    greetings,
    renderedGreetings: greetings.map(greeting => renderCharacterDisplay(greeting, card, AI_OUTPUT_PLACEMENT, 0)),
  }
}

function regexScriptDetail(card: ImportedCharacterCard): CharacterLibraryDetail['regexScripts'] {
  return card.frontend.regexScripts.map((script, index) => ({
    index,
    ...summarizeCharacterRegexScript(script),
  }))
}

function worldInfoDetail(card: ImportedCharacterCard): CharacterLibraryWorldInfo | undefined {
  if (card.lorebook === undefined) return undefined
  return {
    ...(card.lorebook.name === undefined ? {} : { name: card.lorebook.name }),
    entries: card.lorebook.entries.map(entry => ({
      sourceId: entry.sourceId,
      ...(entry.name === undefined ? {} : { name: entry.name }),
      ...(entry.comment === undefined ? {} : { comment: entry.comment }),
      keys: entry.keys,
      secondaryKeys: entry.secondaryKeys,
      content: entry.content,
      enabled: entry.enabled,
      constant: entry.constant,
      selective: entry.selective,
      useRegex: entry.useRegex,
    })),
  }
}

function displayExtensionDetail(
  overlay: StoredCharacterOverlay,
  sourceCard: ImportedCharacterCard,
): readonly CharacterLibraryDisplayExtension[] {
  return overlay.displayExtensions.map(extension => ({
    id: extension.id,
    scriptName: extension.script.scriptName,
    originalFilename: extension.originalFilename,
    enabled: extension.enabled,
    remoteImageOrigins: extension.remoteImageOrigins,
    replacedCardRegexNames: extension.replacedCardRegexIndices.flatMap(index => {
      const name = sourceCard.frontend.regexScripts[index]?.scriptName
      return name === undefined ? [] : [name]
    }),
  }))
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
    const worldInfo = worldInfoDetail(parsed.card)
    const detail: CharacterLibraryDetail = {
      ...summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length),
      mediaType: entry.meta.mediaType,
      ...greetingDetail(parsed.card),
      imageAssets: parsed.images.map(({ data: _data, ...image }) => image),
      ...(worldInfo === undefined ? {} : { worldInfo }),
      degradations: parsed.card.degradations,
      regexScripts: regexScriptDetail(parsed.card),
      displayExtensions: displayExtensionDetail(parsed.overlay, parsed.sourceCard),
      localCorrectionCount: parsed.overlay.textReplacements.reduce((total, replacement) =>
        total + replacement.expectedMatches, 0),
    }
    this.rememberIndex(entry.meta, detail)
    return detail
  }

  /** Resolve one reusable card for a model-free Session launch. */
  resolve(id: string): ResolvedCharacterLibraryEntry {
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    const worldInfo = worldInfoDetail(parsed.card)
    return {
      detail: {
        ...summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length),
        mediaType: entry.meta.mediaType,
        ...greetingDetail(parsed.card),
        imageAssets: parsed.images.map(({ data: _data, ...image }) => image),
        ...(worldInfo === undefined ? {} : { worldInfo }),
        degradations: parsed.card.degradations,
        regexScripts: regexScriptDetail(parsed.card),
        displayExtensions: displayExtensionDetail(parsed.overlay, parsed.sourceCard),
        localCorrectionCount: parsed.overlay.textReplacements.reduce((total, replacement) =>
          total + replacement.expectedMatches, 0),
      },
      card: parsed.card,
      transport: entry.meta.transport === 'png'
        ? { transport: 'png', metadataKeyword: entry.meta.metadataKeyword! }
        : { transport: entry.meta.transport },
      source: {
        bytes: entry.data.byteLength,
        originalFilename: entry.meta.originalFilename,
        mediaType: entry.meta.mediaType,
      },
    }
  }

  /** Load the original immutable asset by opaque id. */
  asset(id: string): CharacterLibraryAsset {
    const entry = this.readId(id)
    let cardSummary = entry.meta.index === undefined ? undefined : indexedSummary(entry.meta, entry.meta.index)
    if (cardSummary === undefined) {
      const parsed = this.parseStored(entry.meta, entry.data)
      cardSummary = summary(entry.meta, parsed.card, parsed.avatar !== undefined, parsed.images.length)
      this.rememberIndex(entry.meta, cardSummary)
    }
    return {
      summary: cardSummary,
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

  /** Attach one display-only SillyTavern regex without modifying the original card bytes. */
  importDisplayExtension(id: string, input: CharacterDisplayExtensionImport): CharacterLibraryDetail {
    if (input.data.byteLength === 0 || input.data.byteLength > MAX_DISPLAY_EXTENSION_BYTES) {
      throw new Error('显示扩展文件为空或过大')
    }
    let json: string
    try {
      json = new TextDecoder('utf-8', { fatal: true }).decode(input.data).replace(/^\uFEFF/u, '')
    } catch (error) {
      throw new Error('显示扩展必须是 UTF-8 JSON', { cause: error })
    }
    let value: unknown
    try {
      value = JSON.parse(json)
    } catch (error) {
      throw new Error('显示扩展不是有效 JSON', { cause: error })
    }
    const script = parseRegexScript(value as JsonValue, 'display extension')
    if (!script.markdownOnly || script.promptOnly || !script.placement.includes(AI_OUTPUT_PLACEMENT)) {
      throw new Error('这里只接受作用于 AI 消息的纯显示正则')
    }
    const requiredOrigins = imageOrigins(script)
    const approvedOrigins = [...new Set(input.approvedImageOrigins.map((origin, index) =>
      safeHttpsOrigin(origin, `approved image origin ${index + 1}`)))].sort()
    if (JSON.stringify(requiredOrigins) !== JSON.stringify(approvedOrigins)) {
      throw new Error(requiredOrigins.length === 0 ? '显示扩展不需要外部图片授权' : '请先确认显示扩展使用的外部图片域名')
    }
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    const digest = createHash('sha256').update(input.data).digest('hex')
    const extensionId = `display-${digest.slice(0, 32)}`
    const existing = parsed.overlay.displayExtensions.find(extension => extension.id === extensionId)
    if (existing !== undefined) {
      if (!existing.enabled) this.setDisplayExtensionEnabled(id, extensionId, true)
      return this.get(id)
    }
    const replacedCardRegexIndices = parsed.sourceCard.frontend.regexScripts.flatMap((candidate, index) =>
      sameMalformedPattern(candidate, script) ? [index] : [])
    this.writeOverlay(id, {
      ...parsed.overlay,
      displayExtensions: [...parsed.overlay.displayExtensions, {
        id: extensionId,
        originalFilename: safeFilename(input.filename, 'json'),
        importedAt: Date.now(),
        enabled: true,
        remoteImageOrigins: requiredOrigins,
        replacedCardRegexIndices,
        script,
      }],
    })
    return this.get(id)
  }

  /** Enable or pause one local display extension. */
  setDisplayExtensionEnabled(id: string, extensionId: string, enabled: boolean): CharacterLibraryDetail {
    if (!DISPLAY_EXTENSION_ID_PATTERN.test(extensionId)) throw new Error('显示扩展 id 无效')
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    if (!parsed.overlay.displayExtensions.some(extension => extension.id === extensionId)) {
      throw new Error('角色卡没有这个显示扩展')
    }
    this.writeOverlay(id, {
      ...parsed.overlay,
      displayExtensions: parsed.overlay.displayExtensions.map(extension => extension.id === extensionId
        ? { ...extension, enabled }
        : extension),
    })
    return this.get(id)
  }

  /** Remove one local display extension while keeping the original card unchanged. */
  removeDisplayExtension(id: string, extensionId: string): CharacterLibraryDetail {
    if (!DISPLAY_EXTENSION_ID_PATTERN.test(extensionId)) throw new Error('显示扩展 id 无效')
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    const displayExtensions = parsed.overlay.displayExtensions.filter(extension => extension.id !== extensionId)
    if (displayExtensions.length === parsed.overlay.displayExtensions.length) throw new Error('角色卡没有这个显示扩展')
    this.writeOverlay(id, { ...parsed.overlay, displayExtensions })
    return this.get(id)
  }

  /** Apply one exact local wording correction without rewriting the imported card asset. */
  replaceText(id: string, from: string, to: string): CharacterLibraryDetail {
    if (from === '' || from === to || from.length > 2_000 || to.length > 2_000) throw new Error('本地文字修正无效')
    const entry = this.readId(id)
    const parsed = this.parseStored(entry.meta, entry.data)
    const state = { matches: 0 }
    replaceStrings(parsed.card.raw, { from, to, expectedMatches: 1 }, state)
    if (state.matches < 1) throw new Error('没有找到需要修正的文字')
    this.writeOverlay(id, {
      ...parsed.overlay,
      textReplacements: [...parsed.overlay.textReplacements, { from, to, expectedMatches: state.matches }],
    })
    return this.get(id)
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

  private overlayPath(id: string): string {
    this.assertId(id)
    return join(this.root, `${id}${OVERLAY_SUFFIX}`)
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

  private rememberIndex(meta: StoredCharacterMetadata, value: CharacterLibrarySummary): void {
    const index = storedIndex(value)
    if (JSON.stringify(meta.index) === JSON.stringify(index)) return
    this.writeMetadata({ ...meta, index })
  }

  private readOverlay(id: string): StoredCharacterOverlay {
    const path = this.overlayPath(id)
    if (!existsSync(path)) return emptyOverlay()
    try {
      return parseOverlay(JSON.parse(readFileSync(path, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取角色库本地调整 ${JSON.stringify(path)}`, { cause: error })
    }
  }

  private writeOverlay(id: string, overlay: StoredCharacterOverlay): void {
    mkdirSync(this.root, { recursive: true, mode: 0o700 })
    const path = this.overlayPath(id)
    const staging = join(this.root, `.${id}.${process.pid}.${randomUUID()}.overlay.tmp`)
    try {
      writeFileSync(staging, `${JSON.stringify(overlay, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(staging, path)
    } finally {
      rmSync(staging, { force: true })
    }
  }

  private parseStored(meta: StoredCharacterMetadata, data: Uint8Array): {
    readonly card: ImportedCharacterCard
    readonly sourceCard: ImportedCharacterCard
    readonly overlay: StoredCharacterOverlay
    readonly avatar?: CharacterLibraryAvatar
    readonly images: readonly CharacterLibraryImageAsset[]
  } {
    const overlay = this.readOverlay(meta.id)
    if (meta.transport === 'json') {
      const sourceCard = parseCharacterCardJsonBytes(data)
      return { card: applyOverlay(sourceCard, overlay), sourceCard, overlay, images: [] }
    }
    if (meta.transport === 'charx') {
      const charx = parseCharx(data)
      const charxImages = charxImageAssets(charx)
      const icons = charxImages.filter(image => image.type === 'icon')
      const avatar = icons.find(image => image.name.trim().toLocaleLowerCase() === 'main') ?? icons[0]
      const images = charxImages.map(image => ({
        index: image.index,
        type: image.type,
        name: image.name,
        mediaType: image.mediaType,
        sourceUri: charx.card.assets?.[image.index]?.uri ?? '',
        data: image.data,
      }))
      return {
        card: applyOverlay(charx.card, overlay),
        sourceCard: charx.card,
        overlay,
        images,
        ...(avatar === undefined ? {} : { avatar: { mediaType: avatar.mediaType, data: avatar.data } }),
      }
    }
    const payload = readCharacterCardPng(data)
    if (payload.keyword !== meta.metadataKeyword) throw new Error('character library PNG metadata keyword changed')
    const sourceCard = parseCharacterCardJson(payload.json)
    return {
      card: applyOverlay(sourceCard, overlay), sourceCard, overlay,
      avatar: { mediaType: 'image/png', data }, images: [],
    }
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
    let meta: StoredCharacterMetadata
    try {
      meta = parseMetadata(JSON.parse(readFileSync(metaPath, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取角色库文件 ${JSON.stringify(metaPath)}`, { cause: error })
    }
    const asset = statSync(this.assetPath(meta))
    if (!asset.isFile() || asset.size !== meta.bytes) throw new Error('character library asset byte count changed')
    return { summary: meta.index === undefined ? this.get(meta.id) : indexedSummary(meta, meta.index) }
  }
}
