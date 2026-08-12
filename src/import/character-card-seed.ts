/** Model-free Character Card JSON import into a native roleplay Session. */
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import {
  prepareCharacterImportResult,
  type CharacterImportMeta,
  type FileAttachmentRef,
} from './session-character.ts'
import type { ImportedCharacterCard } from './types.ts'

/** Durable provenance for one Character Card used to seed a new Session. */
export interface CharacterCardSeedRecord {
  readonly format: 0
  readonly source: {
    readonly attachmentConsumer: 'dsh-agent-rp'
    readonly attachments: readonly [FileAttachmentRef]
  }
  readonly meta: CharacterImportMeta
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Skippable model-free Character Card import that activates the preserved card. */
    'agent-rp/character-card-seed': CharacterCardSeedRecord
  }
}

type SessionSeedEvent = SessionEvent extends infer Event
  ? Event extends SessionEvent ? Omit<Event, 'seq'> : never
  : never

/**
 * Build a native Session that activates one Character Card and opens with its selected greeting.
 * @param card - parsed lossless Character Card.
 * @param attachment - Host-stored original JSON file.
 * @param greetingIndex - selected first or alternate greeting.
 * @param renderedGreeting - selected greeting after stable identity macro substitution.
 * @returns validated immutable Session seed.
 */
export function createCharacterCardSessionSeed(
  card: ImportedCharacterCard,
  attachment: FileAttachmentRef,
  greetingIndex: number,
  renderedGreeting: string,
): readonly SessionEvent[] {
  const value = prepareCharacterImportResult(
    card,
    { transport: 'json' },
    0,
    attachment,
    greetingIndex,
  )
  const { raw, ...result } = value
  const meta: CharacterImportMeta = { format: 0, result, raw }
  const time = Date.now()
  const events: SessionEvent[] = [{
    type: 'agent-rp/character-card-seed',
    seq: 0,
    time,
    data: {
      format: 0,
      source: { attachmentConsumer: 'dsh-agent-rp', attachments: [attachment] },
      meta,
    },
    ignorable: true,
  }]
  if (renderedGreeting.trim() !== '') {
    const push = (event: SessionSeedEvent): void => {
      events.push({ ...event, seq: events.length } as SessionEvent)
    }
    push({ type: 'turn/start', time: time + 1, data: { turn: 1 } })
    push({ type: 'step/start', time: time + 1, data: { turn: 1, step: 1 } })
    push({
      type: 'assistant/message',
      time: time + 1,
      data: {
        turn: 1,
        step: 1,
        message: createAssistantMessage({
          content: [{ type: 'text', text: renderedGreeting }],
          source: { provider: 'agent-rp-import', model: 'character-card' },
        }),
      },
      surfaceOp: 'append',
    })
    push({ type: 'step/end', time: time + 1, data: { turn: 1, step: 1 } })
    push({ type: 'turn/end', time: time + 1, data: { turn: 1, reason: { kind: 'completed' } } })
  }
  return Object.freeze(Session.create(SessionId('agent-rp-character-card-import-validation'), events).events.slice(0, events.length))
}
