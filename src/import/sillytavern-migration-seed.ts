/** One-shot SillyTavern character and chat migration. */

import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { createCharacterCardSessionSeed } from './character-card-seed.ts'
import { createSillyTavernChatSeed, resolveSillyTavernChatIdentity } from './sillytavern-chat-seed.ts'
import type {
  CharacterCardAttachmentRef,
  CharacterImportTransport,
  FileAttachmentRef,
} from './session-character.ts'
import type { ImportedCharacterCard, ImportedSillyTavernChat } from './types.ts'

/**
 * Build one Session from a Character Card JSON and its SillyTavern chat export.
 * @param card - parsed Character Card identity.
 * @param cardAttachment - stored card JSON or PNG.
 * @param cardTransport - decoded card transport metadata.
 * @param chat - parsed SillyTavern chat history.
 * @param chatAttachment - stored chat JSONL.
 * @returns one validated seed with imported history and active card identity.
 */
export function createSillyTavernMigrationSeed(
  card: ImportedCharacterCard,
  cardAttachment: CharacterCardAttachmentRef,
  cardTransport: CharacterImportTransport,
  chat: ImportedSillyTavernChat,
  chatAttachment: FileAttachmentRef,
): readonly SessionEvent[] {
  const events = [...createSillyTavernChatSeed(chat, chatAttachment)]
  const cardEvent = createCharacterCardSessionSeed(
    card,
    cardAttachment,
    0,
    '',
    cardTransport,
    resolveSillyTavernChatIdentity(chat).userName,
  )[0]
  if (cardEvent?.type !== 'agent-rp/character-card-seed') throw new Error('Character Card seed is missing')
  const seq = events.length
  events.push({
    ...cardEvent,
    seq,
    time: Math.max(Date.now(), events.at(-1)?.time ?? 0),
    data: {
      ...cardEvent.data,
      meta: {
        ...cardEvent.data.meta,
        result: { ...cardEvent.data.meta.result, sourceEventSeq: seq },
      },
    },
  })
  const validated = Session.create(SessionId('agent-rp-sillytavern-migration-validation'), events)
  return Object.freeze(validated.events.slice(0, events.length))
}
