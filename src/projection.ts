/** Incremental browser projection of the active Roleplay identity. */

import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from './import/character-card.ts'
import type { CharacterImportMeta } from './import/session-character.ts'
import { readSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import type { WorldInfoImportMeta } from './import/session-world-info.ts'
import type { AgentRpProjection } from './projection-types.ts'

export type { AgentRpProjection } from './projection-types.ts'

const projectionSchema = {
  parse(value: unknown): AgentRpProjection {
    const record = value as Partial<Record<keyof AgentRpProjection, unknown>> | null
    const validCardVersion = record?.cardVersion === undefined
      || record.cardVersion === 1 || record.cardVersion === 2 || record.cardVersion === 3
    const validSource = record?.source === 'character-card'
      || record?.source === 'sillytavern-chat' || record?.source === 'preset'
    if (record === null || typeof record !== 'object'
      || typeof record.characterName !== 'string'
      || typeof record.description !== 'string'
      || typeof record.personality !== 'string'
      || typeof record.scenario !== 'string'
      || (record.userName !== undefined && typeof record.userName !== 'string')
      || !validCardVersion
      || (record.avatarAttachmentId !== undefined && typeof record.avatarAttachmentId !== 'string')
      || typeof record.importedMessageCount !== 'number' || !Number.isSafeInteger(record.importedMessageCount)
      || record.importedMessageCount < 0
      || typeof record.worldInfoCount !== 'number' || !Number.isSafeInteger(record.worldInfoCount)
      || record.worldInfoCount < 0
      || !validSource) throw new Error('invalid agentRp projection')
    return value as AgentRpProjection
  },
}

type ImportCall = 'character-card' | 'world-info'

interface AgentRpProjectionState {
  readonly character: Omit<AgentRpProjection, 'worldInfoCount'>
  readonly cardWorldInfoCount: number
  readonly standaloneWorldInfos: Readonly<Record<string, number>>
  readonly calls: Readonly<Record<string, ImportCall>>
}

const INITIAL_CHARACTER: AgentRpProjectionState['character'] = {
  characterName: '角色会话',
  description: '',
  personality: '',
  scenario: '',
  importedMessageCount: 0,
  source: 'preset',
}

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function cardProjection(
  previous: AgentRpProjectionState['character'],
  meta: CharacterImportMeta,
): { readonly character: AgentRpProjectionState['character']; readonly lorebookEntries: number } {
  const card = parseCharacterCardJson(JSON.stringify(meta.raw))
  const result = meta.result
  return {
    character: {
      characterName: card.nickname?.trim() || card.name,
      description: card.description.trim(),
      personality: card.personality.trim(),
      scenario: card.scenario.trim(),
      ...(result.userName === undefined ? {} : { userName: result.userName }),
      cardVersion: result.cardVersion,
      ...(result.transport === 'png' ? { avatarAttachmentId: result.sourceAttachmentId } : {}),
      importedMessageCount: previous.importedMessageCount,
      source: 'character-card',
    },
    lorebookEntries: card.lorebook?.entries.length ?? 0,
  }
}

function toolCallId(event: Extract<SessionEvent, { type: 'tool/result' }>): string | undefined {
  const first = event.data.message.content[0]
  return first === undefined ? undefined : String(first.toolCallId)
}

function toolFailed(event: Extract<SessionEvent, { type: 'tool/result' }>): boolean {
  return event.data.message.content[0]?.isError === true
}

function parseCharacterMeta(value: JsonValue | undefined): CharacterImportMeta | undefined {
  const meta = jsonObject(value)
  const result = jsonObject(meta?.result)
  if (meta?.format !== 0 || result?.version !== 0 || meta.raw === undefined
    || typeof result.name !== 'string'
    || (result.cardVersion !== 1 && result.cardVersion !== 2 && result.cardVersion !== 3)
    || typeof result.sourceAttachmentId !== 'string'
    || (result.transport !== 'png' && result.transport !== 'json')) return undefined
  return value as unknown as CharacterImportMeta
}

function parseWorldInfoMeta(value: JsonValue | undefined): WorldInfoImportMeta | undefined {
  const meta = jsonObject(value)
  const result = jsonObject(meta?.result)
  if (meta?.format !== 0 || result?.version !== 0 || meta.raw === undefined
    || typeof result.sourceAttachmentId !== 'string'
    || typeof result.entryCount !== 'number' || !Number.isSafeInteger(result.entryCount)
    || result.entryCount < 0) return undefined
  return value as unknown as WorldInfoImportMeta
}

function withoutCall(
  calls: Readonly<Record<string, ImportCall>>,
  callId: string,
): Readonly<Record<string, ImportCall>> {
  return Object.fromEntries(Object.entries(calls).filter(([id]) => id !== callId))
}

/** Projection definition shared by every Agent RP Session. */
export const agentRpProjectionDefinition: ProjectionDefinition<'agentRp', AgentRpProjectionState> = {
  key: 'agentRp',
  schema: projectionSchema as never,
  init: () => ({
    character: INITIAL_CHARACTER,
    cardWorldInfoCount: 0,
    standaloneWorldInfos: {},
    calls: {},
  }),
  apply(state, event) {
    if (event.type === 'agent-rp/sillytavern-chat-import') {
      const identity = readSillyTavernChatIdentity([event])
      return {
        ...state,
        character: {
          ...state.character,
          ...(state.character.source === 'preset' && identity !== undefined
            ? { characterName: identity.characterName, source: 'sillytavern-chat' as const }
            : {}),
          ...(identity?.userName === undefined ? {} : { userName: identity.userName }),
          importedMessageCount: event.data.messages.length,
        },
      }
    }
    if (event.type === 'agent-rp/character-card-seed') {
      const projected = cardProjection(state.character, event.data.meta)
      return { ...state, character: projected.character, cardWorldInfoCount: projected.lorebookEntries }
    }
    if (event.type === 'tool/call') {
      const kind = event.data.name === 'import_character_card'
        ? 'character-card'
        : event.data.name === 'import_world_info' ? 'world-info' : undefined
      return kind === undefined
        ? state
        : { ...state, calls: { ...state.calls, [String(event.data.callId)]: kind } }
    }
    if (event.type !== 'tool/result') return state
    const callId = toolCallId(event)
    if (callId === undefined) return state
    const kind = state.calls[callId]
    if (kind === undefined) return state
    const calls = withoutCall(state.calls, callId)
    if (toolFailed(event)) return { ...state, calls }
    if (kind === 'character-card') {
      const meta = parseCharacterMeta(event.data.meta)
      if (meta === undefined) return { ...state, calls }
      const projected = cardProjection(state.character, meta)
      return {
        ...state,
        calls,
        character: projected.character,
        cardWorldInfoCount: projected.lorebookEntries,
      }
    }
    const meta = parseWorldInfoMeta(event.data.meta)
    return meta === undefined
      ? { ...state, calls }
      : {
          ...state,
          calls,
          standaloneWorldInfos: {
            ...state.standaloneWorldInfos,
            [meta.result.sourceAttachmentId]: meta.result.entryCount,
          },
        }
  },
  view: state => ({
    ...state.character,
    worldInfoCount: state.cardWorldInfoCount
      + Object.values(state.standaloneWorldInfos).reduce((total, count) => total + count, 0),
  }),
  stateVersion: 0,
}
