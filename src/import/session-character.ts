/** Durable imported-character replay from native tool events. */

import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from './character-card.ts'
import { CHARACTER_IMPORT_DEGRADATIONS } from './types.ts'
import type { CharacterCardPngPayload, CharacterImportDegradation, ImportedCharacterCard } from './types.ts'

/** Model-facing canonical value for one completed import. */
export interface CharacterImportResult {
  readonly version: 0
  readonly name: string
  readonly cardVersion: 1 | 2 | 3
  readonly sourceEventSeq: number
  readonly sourceAttachmentId: string
  readonly metadataKeyword: CharacterCardPngPayload['keyword']
  readonly greetingIndex: number
  readonly selectedGreeting: string
  readonly degradations: Array<ImportedCharacterCard['degradations'][number]>
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
  if (record.version !== 0 || typeof record.name !== 'string'
    || (record.cardVersion !== 1 && record.cardVersion !== 2 && record.cardVersion !== 3)
    || typeof record.sourceEventSeq !== 'number' || !Number.isSafeInteger(record.sourceEventSeq)
    || typeof record.sourceAttachmentId !== 'string'
    || (record.metadataKeyword !== 'ccv3' && record.metadataKeyword !== 'chara')
    || typeof record.greetingIndex !== 'number' || !Number.isSafeInteger(record.greetingIndex) || record.greetingIndex < 0
    || typeof record.selectedGreeting !== 'string'
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

function sourceImage(events: readonly SessionEvent[], sourceEventSeq: number, attachmentId: string): ImageAttachmentRef {
  const source = events[sourceEventSeq]
  if (source?.type !== 'user/message' || source.seq !== sourceEventSeq) {
    throw new Error('import_character_card sourceEventSeq does not reference a user message')
  }
  const images = source.data.content.filter(block => block.type === 'image')
  if (images.length > 0) {
    const image = images.find(block => String(block.attachment.attachmentId) === attachmentId)
    if (image === undefined) throw new Error('import_character_card source attachment is absent from its user message')
    return image.attachment
  }
  const sourceMeta = source.data.source.kind === 'user'
    ? source.data.source as unknown as Record<string, JsonValue>
    : undefined
  if (sourceMeta === undefined) throw new Error('import_character_card source attachment metadata is invalid')
  const attachments = sourceMeta.attachmentConsumer === 'dsh-agent-rp' && Array.isArray(sourceMeta.attachments)
    ? sourceMeta.attachments
    : []
  const image = attachments.find(value => typeof value === 'object' && value !== null && !Array.isArray(value)
    && String((value as Record<string, JsonValue>).attachmentId) === attachmentId)
  if (image === undefined) {
    throw new Error('import_character_card source attachment metadata is invalid')
  }
  return image as unknown as ImageAttachmentRef
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
  if (result.sourceEventSeq >= call.seq) throw new Error('import_character_card source image does not precede its tool call')
  const image = sourceImage(events, result.sourceEventSeq, result.sourceAttachmentId)
  if (image.mediaType !== 'image/png') throw new Error('import_character_card source must remain a PNG')
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
    if (event.type !== 'tool/result' || event.data.message.content[0].isError === true) continue
    const callId = String(event.data.message.content[0].toolCallId)
    const call = events.find(candidate => candidate.type === 'tool/call' && String(candidate.data.callId) === callId)
    if (call?.type !== 'tool/call' || call.data.name !== 'import_character_card') continue
    active = validateImport(events, event)
  }
  return active
}

/**
 * Build the canonical import summary associated with its source image.
 * @param card - parsed Character Card.
 * @param payload - PNG metadata transport that selected the card.
 * @param sourceEventSeq - exact user message carrying the image.
 * @param image - matching durable image reference.
 * @param greetingIndex - zero-based selected greeting, with zero naming `first_mes`.
 * @returns a compact canonical tool result.
 */
export function prepareCharacterImportResult(
  card: ImportedCharacterCard,
  payload: CharacterCardPngPayload,
  sourceEventSeq: number,
  image: ImageAttachmentRef,
  greetingIndex: number,
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
    sourceAttachmentId: String(image.attachmentId),
    metadataKeyword: payload.keyword,
    greetingIndex,
    selectedGreeting,
    degradations: [...card.degradations],
    raw: card.raw,
  }
}
