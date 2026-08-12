/** Convert a parsed SillyTavern chat into validated DSH Session history. */

import {
  createAssistantMessage,
  createUserMessage,
} from '@deepseek-ai/dsh-llm'
import {
  Session,
  SessionId,
  type JsonValue,
  type SessionEvent,
} from '@deepseek-ai/dsh-session'
import type { FileAttachmentRef } from './session-character.ts'
import type { ImportedSillyTavernChat, ImportedSillyTavernChatMessage } from './types.ts'

/** Durable import metadata that points back to the original JSONL attachment. */
export interface SillyTavernChatImportRecord {
  readonly format: 0
  readonly source: {
    readonly attachmentConsumer: 'dsh-agent-rp'
    readonly attachments: readonly [FileAttachmentRef]
  }
  readonly header: JsonValue
  readonly messages: readonly {
    readonly line: number
    readonly kind: ImportedSillyTavernChatMessage['kind']
    readonly name?: string
    readonly swipes: readonly string[]
    readonly swipeId?: number
    readonly extra?: JsonValue
  }[]
}

/** Character identity recovered from one imported SillyTavern chat header. */
export interface SillyTavernChatIdentity {
  readonly characterName: string
  readonly userName?: string
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Skippable SillyTavern provenance; the original file remains authoritative. */
    'agent-rp/sillytavern-chat-import': SillyTavernChatImportRecord
  }
}

type SessionSeedEvent = SessionEvent extends infer Event
  ? Event extends SessionEvent ? Omit<Event, 'seq'> : never
  : never

function eventTime(message: ImportedSillyTavernChatMessage, fallback: number): number {
  if (typeof message.raw !== 'object' || message.raw === null || Array.isArray(message.raw)) return fallback
  const date = message.raw.send_date
  if (typeof date === 'number' && Number.isSafeInteger(date) && date >= 0) return date
  if (typeof date !== 'string') return fallback
  const parsed = Date.parse(date)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function metadata(chat: ImportedSillyTavernChat, attachment: FileAttachmentRef): SillyTavernChatImportRecord {
  return {
    format: 0,
    source: { attachmentConsumer: 'dsh-agent-rp', attachments: [attachment] },
    header: chat.header.raw,
    messages: chat.messages.map(message => ({
      line: message.line,
      kind: message.kind,
      ...(message.name === undefined ? {} : { name: message.name }),
      swipes: message.swipes,
      ...(message.swipeId === undefined ? {} : { swipeId: message.swipeId }),
      ...(message.extra === undefined ? {} : { extra: message.extra }),
    })),
  }
}

/**
 * Read the latest usable character identity attached to an imported chat Session.
 * @param events - current Session history.
 * @returns imported character and optional user names, when the chat header names a character.
 */
export function readSillyTavernChatIdentity(
  events: readonly SessionEvent[],
): SillyTavernChatIdentity | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'agent-rp/sillytavern-chat-import') continue
    const header = event.data.header
    if (typeof header !== 'object' || header === null || Array.isArray(header)) return undefined
    const characterName = typeof header.character_name === 'string' ? header.character_name.trim() : ''
    if (characterName === '') return undefined
    const userName = typeof header.user_name === 'string' ? header.user_name.trim() : ''
    return {
      characterName,
      ...(userName === '' ? {} : { userName }),
    }
  }
  return undefined
}

function appendMessageEvents(
  events: SessionEvent[],
  message: ImportedSillyTavernChatMessage,
  turn: number,
  time: number,
): void {
  const push = (event: SessionSeedEvent): void => {
    events.push({ ...event, seq: events.length } as SessionEvent)
  }
  push({ type: 'turn/start', time, data: { turn } })
  push({ type: 'step/start', time, data: { turn, step: 1 } })
  if (message.kind === 'assistant') {
    push({
      type: 'assistant/message',
      time,
      data: {
        turn,
        step: 1,
        message: createAssistantMessage({
          content: [{ type: 'text', text: message.text }],
          source: { provider: 'sillytavern-import', model: 'history' },
        }),
      },
      surfaceOp: 'append',
    })
  } else {
    push({
      type: 'user/message',
      time,
      data: createUserMessage({
        content: [{ type: 'text', text: message.text }],
        source: message.kind === 'user'
          ? { kind: 'user' }
          : { kind: 'plugin', plugin: 'dsh-agent-rp', form: 'recall' },
      }),
      surfaceOp: 'append',
    })
  }
  push({ type: 'step/end', time, data: { turn, step: 1 } })
  push({ type: 'turn/end', time, data: { turn, reason: { kind: 'completed' } } })
}

/**
 * Build a balanced Session seed from one parsed SillyTavern chat.
 * @param chat - validated lossless JSONL projection.
 * @param attachment - Host-stored original JSONL file owned by the imported Session.
 * @returns a frozen seed accepted by the native Session constructor.
 */
export function createSillyTavernChatSeed(
  chat: ImportedSillyTavernChat,
  attachment: FileAttachmentRef,
): readonly SessionEvent[] {
  if (!/\.jsonl$/iu.test(attachment.name)) throw new Error('SillyTavern chat source must be a .jsonl file')
  const events: SessionEvent[] = [{
    type: 'agent-rp/sillytavern-chat-import',
    seq: 0,
    time: Date.now(),
    data: metadata(chat, attachment),
    ignorable: true,
  }]
  let turn = 0
  let fallbackTime = events[0]!.time
  for (const message of chat.messages) {
    if (message.kind === 'system' || message.text.length === 0) continue
    turn += 1
    fallbackTime += 1
    appendMessageEvents(events, message, turn, eventTime(message, fallbackTime))
  }
  const validated = Session.create(SessionId('agent-rp-sillytavern-import-validation'), events)
  return Object.freeze(validated.events.slice(0, events.length))
}
