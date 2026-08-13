/** Build complete Session seeds from Host-owned roleplay libraries. */

import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from './character-library.ts'
import { createCharacterCardSessionSeed } from './import/character-card-seed.ts'
import { createSillyTavernChatSeed, resolveSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import { createSillyTavernMigrationSeed } from './import/sillytavern-migration-seed.ts'
import type { FileAttachmentRef } from './import/session-character.ts'
import { substituteCardMacros } from './prompt.ts'
import { parseSessionPersona } from './session-persona.ts'
import type { AgentRpSessionLaunchRequest } from './session-launch-protocol.ts'
import { SillyTavernChatLibrary } from './sillytavern-chat-library.ts'

/** Complete seed and display metadata used to create one Agent. */
export interface PreparedAgentRpSession {
  readonly seed: readonly SessionEvent[]
  readonly title: string
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}不是对象`)
  return value as Record<string, unknown>
}

/** Validate one same-origin browser request without accepting filesystem paths. */
export function parseAgentRpSessionLaunchRequest(value: unknown): AgentRpSessionLaunchRequest {
  const record = object(value, '角色会话启动请求')
  const common = record.format === 0 && typeof record.sourceSessionId === 'string'
    && record.sourceSessionId.trim() !== '' && record.sourceSessionId.length <= 512
  if (!common) throw new Error('角色会话启动请求字段无效')
  if (record.kind === 'character') {
    if (typeof record.characterId !== 'string' || !/^card-[a-f0-9]{32}$/u.test(record.characterId)
      || typeof record.greetingIndex !== 'number' || !Number.isSafeInteger(record.greetingIndex)
      || record.greetingIndex < 0
      || Object.keys(record).some(key => !['format', 'sourceSessionId', 'kind', 'characterId', 'greetingIndex', 'persona'].includes(key))) {
      throw new Error('角色会话启动请求字段无效')
    }
    const persona = record.persona === undefined ? undefined : parseSessionPersona(record.persona)
    return {
      format: 0,
      sourceSessionId: record.sourceSessionId as string,
      kind: 'character',
      characterId: record.characterId,
      greetingIndex: record.greetingIndex,
      ...(persona === undefined ? {} : { persona }),
    }
  }
  if (record.kind === 'chat') {
    if (typeof record.importId !== 'string' || !/^chat-[a-f0-9]{32}$/u.test(record.importId)
      || (record.characterId !== undefined
        && (typeof record.characterId !== 'string' || !/^card-[a-f0-9]{32}$/u.test(record.characterId)))
      || Object.keys(record).some(key => !['format', 'sourceSessionId', 'kind', 'importId', 'characterId'].includes(key))) {
      throw new Error('聊天迁移启动请求字段无效')
    }
    return {
      format: 0,
      sourceSessionId: record.sourceSessionId as string,
      kind: 'chat',
      importId: record.importId,
      ...(typeof record.characterId === 'string' ? { characterId: record.characterId } : {}),
    }
  }
  throw new Error('角色会话启动类型无效')
}

function libraryAttachment(
  characterId: string,
  transport: 'png' | 'json' | 'charx',
  bytes: number,
  originalFilename: string,
  mediaType: string,
): FileAttachmentRef {
  const extension = transport === 'png' ? 'png' : transport === 'charx' ? 'charx' : 'json'
  const name = new RegExp(`\\.${extension}$`, 'iu').test(originalFilename)
    ? originalFilename
    : `character.${extension}`
  return {
    kind: 'file',
    attachmentId: AttachmentId(`library:${characterId}`),
    bytes,
    name,
    mediaType,
  }
}

/** Resolve one validated launch into a balanced seed before any Agent exists. */
export function prepareAgentRpSession(
  characters: CharacterLibrary,
  chats: SillyTavernChatLibrary,
  request: AgentRpSessionLaunchRequest,
): PreparedAgentRpSession {
  if (request.kind === 'character') {
    const resolved = characters.resolve(request.characterId)
    if (resolved.detail.archived) throw new Error('请先恢复这个角色，再开始对话')
    const selectedGreeting = resolved.detail.greetings[request.greetingIndex]
    if (selectedGreeting === undefined) throw new Error(`角色卡没有第 ${request.greetingIndex + 1} 条开场白`)
    const asset = characters.asset(request.characterId)
    const source = libraryAttachment(
      request.characterId,
      resolved.transport.transport,
      asset.data.byteLength,
      asset.originalFilename,
      asset.mediaType,
    )
    const userName = request.persona?.name
    return {
      seed: createCharacterCardSessionSeed(
        resolved.card,
        source,
        request.greetingIndex,
        substituteCardMacros(selectedGreeting, resolved.card, userName).trim(),
        resolved.transport,
        userName,
        request.persona,
        request.characterId,
      ),
      title: resolved.detail.displayName,
    }
  }

  const chat = chats.resolve(request.importId)
  if (request.characterId === undefined) {
    const identity = resolveSillyTavernChatIdentity(chat.chat)
    return {
      seed: createSillyTavernChatSeed(chat.chat, chat.attachment),
      title: identity.characterName?.trim() || chat.upload.name.replace(/\.jsonl$/iu, ''),
    }
  }
  const character = characters.resolve(request.characterId)
  if (character.detail.archived) throw new Error('请先恢复这个角色，再迁移聊天记录')
  const asset = characters.asset(request.characterId)
  const source = libraryAttachment(
    request.characterId,
    character.transport.transport,
    asset.data.byteLength,
    asset.originalFilename,
    asset.mediaType,
  )
  return {
    seed: createSillyTavernMigrationSeed(
      character.card,
      source,
      character.transport,
      chat.chat,
      chat.attachment,
      request.characterId,
    ),
    title: character.detail.displayName,
  }
}
