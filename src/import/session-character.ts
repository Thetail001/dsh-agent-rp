/** Durable imported-character replay from native tool events. */

import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from './character-card.ts'
import { CHARACTER_IMPORT_DEGRADATIONS } from './types.ts'
import type { CharacterCardPngPayload, CharacterImportDegradation, ImportedCharacterCard } from './types.ts'

export interface FileAttachmentRef {
  readonly kind: 'file'
  readonly attachmentId: ImageAttachmentRef['attachmentId']
  readonly bytes: number
  readonly name: string
  readonly mediaType?: string
}

export type CharacterCardAttachmentRef = ImageAttachmentRef | FileAttachmentRef

/** Transport-specific provenance recorded with an imported card. */
export type CharacterImportTransport =
  | { readonly transport: 'png'; readonly metadataKeyword: CharacterCardPngPayload['keyword'] }
  | { readonly transport: 'json'; readonly metadataKeyword?: never }
  | { readonly transport: 'charx'; readonly metadataKeyword?: never }

/** Model-facing canonical value for one completed import. */
export interface CharacterImportResult {
  readonly version: 0
  readonly name: string
  readonly cardVersion: 1 | 2 | 3
  readonly sourceEventSeq: number
  readonly sourceAttachmentId: string
  readonly transport: CharacterImportTransport['transport']
  readonly metadataKeyword?: CharacterCardPngPayload['keyword']
  readonly greetingIndex: number
  readonly selectedGreeting: string
  readonly userName?: string
  readonly degradations: Array<ImportedCharacterCard['degradations'][number]>
  readonly libraryId?: string
}

/** Execution-only canonical value projected into compact text and durable metadata. */
export interface CharacterImportValue extends CharacterImportResult {
  readonly raw: JsonValue
}

/** Replayable presentation metadata carrying the lossless card JSON. */
export interface CharacterImportMeta {
  readonly format: 0
  readonly result: CharacterImportResult
  readonly raw: JsonValue
}

/** Last successful imported character in one Session. */
export interface ActiveSessionCharacter {
  readonly result: CharacterImportResult
  readonly meta: CharacterImportMeta
}

/** Reconstruct the normalized active card from its preserved JSON. */
export function cardFromImportMeta(meta: CharacterImportMeta): ImportedCharacterCard {
  return parseCharacterCardJson(JSON.stringify(meta.raw))
}

function jsonObject(value: JsonValue | undefined, label: string): Record<string, JsonValue> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value
}

function parseResult(value: JsonValue | undefined): CharacterImportResult {
  const record = jsonObject(value, 'import_character_card result')
  const validTransport = record.transport === 'png'
    ? record.metadataKeyword === 'ccv3' || record.metadataKeyword === 'chara'
    : (record.transport === 'json' || record.transport === 'charx') && record.metadataKeyword === undefined
  if (record.version !== 0 || typeof record.name !== 'string'
    || (record.cardVersion !== 1 && record.cardVersion !== 2 && record.cardVersion !== 3)
    || typeof record.sourceEventSeq !== 'number' || !Number.isSafeInteger(record.sourceEventSeq)
    || typeof record.sourceAttachmentId !== 'string'
    || !validTransport
    || typeof record.greetingIndex !== 'number' || !Number.isSafeInteger(record.greetingIndex) || record.greetingIndex < 0
    || typeof record.selectedGreeting !== 'string'
    || (record.libraryId !== undefined && (typeof record.libraryId !== 'string'
      || !/^card-[a-f0-9]{32}$/u.test(record.libraryId)))
    || (record.userName !== undefined && (typeof record.userName !== 'string' || record.userName.trim() === ''))
    || !Array.isArray(record.degradations)
    || record.degradations.some(value => typeof value !== 'string'
      || !CHARACTER_IMPORT_DEGRADATIONS.includes(value as CharacterImportDegradation))) {
    throw new Error('import_character_card result has invalid fields')
  }
  return record as unknown as CharacterImportResult
}

function parseMeta(value: JsonValue | undefined): CharacterImportMeta {
  const meta = jsonObject(value, 'import_character_card metadata')
  if (meta.format !== 0) throw new Error('import_character_card metadata has an unsupported format')
  const result = parseResult(meta.result)
  if (meta.raw === undefined) throw new Error('import_character_card metadata is missing raw card data')
  return { format: 0, result, raw: meta.raw }
}

/** Recognize one durable PNG reference usable as a Character Card transport. */
export function isPngCharacterCardAttachment(value: unknown): value is ImageAttachmentRef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.kind === undefined && record.mediaType === 'image/png'
    && typeof record.attachmentId === 'string' && typeof record.bytes === 'number'
    && typeof record.width === 'number' && typeof record.height === 'number'
}

/** Recognize one durable standalone JSON reference usable as a Character Card transport. */
export function isJsonCharacterCardAttachment(value: unknown): value is FileAttachmentRef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.kind === 'file' && typeof record.attachmentId === 'string'
    && typeof record.bytes === 'number' && typeof record.name === 'string' && /\.json$/iu.test(record.name)
    && (record.mediaType === undefined || typeof record.mediaType === 'string')
}

/** Recognize one durable CHARX reference usable as a Character Card transport. */
export function isCharxCharacterCardAttachment(value: unknown): value is FileAttachmentRef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.kind === 'file' && typeof record.attachmentId === 'string'
    && typeof record.bytes === 'number' && typeof record.name === 'string' && /\.charx$/iu.test(record.name)
    && (record.mediaType === undefined || typeof record.mediaType === 'string')
}

function sourceAttachments(events: readonly SessionEvent[], sourceEventSeq: number): CharacterCardAttachmentRef[] {
  const source = events[sourceEventSeq]
  if (source?.type !== 'user/message' || source.seq !== sourceEventSeq) {
    throw new Error('import_character_card sourceEventSeq does not reference a user message')
  }
  const direct = source.data.content.flatMap(block => block.type === 'image' && isPngCharacterCardAttachment(block.attachment)
    ? [block.attachment]
    : [])
  const sourceMeta = source.data.source.kind === 'user'
    ? source.data.source as unknown as Record<string, JsonValue>
    : undefined
  if (sourceMeta === undefined) throw new Error('import_character_card source attachment metadata is invalid')
  const attachments = sourceMeta.attachmentConsumer === 'dsh-agent-rp' && Array.isArray(sourceMeta.attachments)
    ? sourceMeta.attachments
    : []
  const consumed = attachments.filter(value => isPngCharacterCardAttachment(value)
    || isJsonCharacterCardAttachment(value) || isCharxCharacterCardAttachment(value)) as CharacterCardAttachmentRef[]
  return [...direct, ...consumed]
}

function validateImport(events: readonly SessionEvent[], resultEvent: SessionEvent<'tool/result'>): ActiveSessionCharacter {
  const meta = parseMeta(resultEvent.data.meta)
  const result = meta.result
  const card = parseCharacterCardJson(JSON.stringify(meta.raw))
  const call = resultEvent.sourceEventSeqs?.length === 1 ? events[resultEvent.sourceEventSeqs[0]!] : undefined
  if (call?.type !== 'tool/call' || call.data.name !== 'import_character_card'
    || call.seq >= resultEvent.seq
    || String(call.data.callId) !== String(resultEvent.data.message.content[0].toolCallId)) {
    throw new Error('import_character_card result does not cite its direct tool call')
  }
  let callArguments: unknown
  try {
    callArguments = JSON.parse(call.data.arguments)
  } catch {
    throw new Error('import_character_card source call has invalid JSON arguments')
  }
  if (typeof callArguments !== 'object' || callArguments === null || Array.isArray(callArguments)) {
    throw new Error('import_character_card source call has invalid arguments')
  }
  const args = callArguments as Record<string, unknown>
  const greetingIndex = args.greetingIndex ?? 0
  if (greetingIndex !== result.greetingIndex) {
    throw new Error('import_character_card greeting does not match its source call')
  }
  if (result.sourceEventSeq >= call.seq) throw new Error('import_character_card source attachment does not precede its tool call')
  const attachmentIndex = args.attachmentIndex ?? 0
  if (typeof attachmentIndex !== 'number' || !Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0) {
    throw new Error('import_character_card source call has an invalid attachmentIndex')
  }
  const attachment = sourceAttachments(events, result.sourceEventSeq)[attachmentIndex]
  if (attachment === undefined || String(attachment.attachmentId) !== result.sourceAttachmentId) {
    throw new Error('import_character_card source attachment is absent from its user message')
  }
  if (result.transport === 'png' && !isPngCharacterCardAttachment(attachment)) {
    throw new Error('import_character_card PNG transport does not match its source attachment')
  }
  if (result.transport === 'json' && !isJsonCharacterCardAttachment(attachment)) {
    throw new Error('import_character_card JSON transport does not match its source attachment')
  }
  if (result.transport === 'charx' && !isCharxCharacterCardAttachment(attachment)) {
    throw new Error('import_character_card CHARX transport does not match its source attachment')
  }
  const expectedGreeting = [card.firstMessage, ...card.alternateGreetings][result.greetingIndex]
  if (result.name !== card.name || result.cardVersion !== card.version
    || result.selectedGreeting !== expectedGreeting
    || JSON.stringify(result.degradations) !== JSON.stringify(card.degradations)) {
    throw new Error('import_character_card result summary does not match durable card metadata')
  }
  return { result, meta: { ...meta, raw: card.raw } }
}

/**
 * Find and validate the last successful character import in one Session.
 * @param events - complete chronological Session history.
 * @returns the active imported character, or undefined before the first import.
 */
export function readActiveSessionCharacter(events: readonly SessionEvent[]): ActiveSessionCharacter | undefined {
  let active: ActiveSessionCharacter | undefined
  for (const event of events) {
    if (event.type === 'agent-rp/character-card-seed') {
      const attachment = event.data.source.attachments[0]
      const meta = parseMeta(event.data.meta as unknown as JsonValue)
      const result = meta.result
      const card = parseCharacterCardJson(JSON.stringify(meta.raw))
      const expectedGreeting = [card.firstMessage, ...card.alternateGreetings][result.greetingIndex]
      const validTransport = result.transport === 'json'
        ? isJsonCharacterCardAttachment(attachment)
        : result.transport === 'charx'
          ? isCharxCharacterCardAttachment(attachment)
          : isPngCharacterCardAttachment(attachment)
      if (event.data.format !== 0 || event.data.source.attachmentConsumer !== 'dsh-agent-rp'
        || !validTransport || result.sourceEventSeq !== event.seq
        || result.sourceAttachmentId !== String(attachment.attachmentId)
        || result.name !== card.name || result.cardVersion !== card.version
        || result.selectedGreeting !== expectedGreeting
        || JSON.stringify(result.degradations) !== JSON.stringify(card.degradations)) {
        throw new Error('agent-rp/character-card-seed has invalid provenance')
      }
      active = { result, meta: { ...meta, raw: card.raw } }
      continue
    }
    if (event.type !== 'tool/result' || event.data.message.content[0].isError === true) continue
    const callId = String(event.data.message.content[0].toolCallId)
    const call = events.find(candidate => candidate.type === 'tool/call' && String(candidate.data.callId) === callId)
    if (call?.type !== 'tool/call' || call.data.name !== 'import_character_card') continue
    active = validateImport(events, event)
  }
  return active
}

/**
 * Build the canonical import summary associated with its source attachment.
 * @param card - parsed Character Card.
 * @param transport - transport and PNG metadata provenance for the selected card.
 * @param sourceEventSeq - exact user message carrying the attachment.
 * @param attachment - matching durable attachment reference.
 * @param greetingIndex - zero-based selected greeting, with zero naming `first_mes`.
 * @returns a compact canonical tool result.
 */
export function prepareCharacterImportResult(
  card: ImportedCharacterCard,
  transport: CharacterImportTransport,
  sourceEventSeq: number,
  attachment: CharacterCardAttachmentRef,
  greetingIndex: number,
  userName?: string,
  libraryId?: string,
): CharacterImportValue {
  if (!Number.isSafeInteger(greetingIndex) || greetingIndex < 0) throw new Error('greetingIndex must be a non-negative integer')
  const greetings = [card.firstMessage, ...card.alternateGreetings]
  const selectedGreeting = greetings[greetingIndex]
  if (selectedGreeting === undefined) throw new Error(`greetingIndex ${greetingIndex} is unavailable for this character card`)
  return {
    version: 0,
    name: card.name,
    cardVersion: card.version,
    sourceEventSeq,
    sourceAttachmentId: String(attachment.attachmentId),
    transport: transport.transport,
    ...(transport.transport === 'png' ? { metadataKeyword: transport.metadataKeyword } : {}),
    greetingIndex,
    selectedGreeting,
    ...(userName === undefined || userName.trim() === '' ? {} : { userName: userName.trim() }),
    ...(libraryId === undefined ? {} : { libraryId }),
    degradations: [...card.degradations],
    raw: card.raw,
  }
}
