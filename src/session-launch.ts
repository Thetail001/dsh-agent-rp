/** Build complete Session seeds from Host-owned roleplay libraries. */

import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from './character-library.ts'
import { createCharacterCardSessionSeed } from './import/character-card-seed.ts'
import { createPresetSessionSeed } from './import/session-preset.ts'
import { createSillyTavernChatSeed, resolveSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import { createSillyTavernMigrationSeed } from './import/sillytavern-migration-seed.ts'
import { readActiveSessionCharacter, type FileAttachmentRef } from './import/session-character.ts'
import type { PresetLibrary, PresetLibraryEntry } from './preset-library.ts'
import { substituteCardMacros } from './prompt.ts'
import { parseSessionPersona } from './session-persona.ts'
import type { AgentRpSessionLaunchRequest, LibrarySessionLaunchRequest } from './session-launch-protocol.ts'
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
      || (record.presetId !== undefined
        && (typeof record.presetId !== 'string' || !/^[a-z0-9-]{8,80}$/u.test(record.presetId)))
      || (record.memory !== undefined && record.memory !== 'copy-active')
      || Object.keys(record).some(key => !['format', 'sourceSessionId', 'kind', 'characterId', 'greetingIndex', 'persona', 'presetId', 'memory'].includes(key))) {
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
      ...(typeof record.presetId === 'string' ? { presetId: record.presetId } : {}),
      ...(record.memory === 'copy-active' ? { memory: 'copy-active' as const } : {}),
    }
  }
  if (record.kind === 'chat') {
    if (typeof record.importId !== 'string' || !/^chat-[a-f0-9]{32}$/u.test(record.importId)
      || (record.characterId !== undefined
        && (typeof record.characterId !== 'string' || !/^card-[a-f0-9]{32}$/u.test(record.characterId)))
      || (record.presetId !== undefined
        && (typeof record.presetId !== 'string' || !/^[a-z0-9-]{8,80}$/u.test(record.presetId)))
      || Object.keys(record).some(key => !['format', 'sourceSessionId', 'kind', 'importId', 'characterId', 'presetId'].includes(key))) {
      throw new Error('聊天迁移启动请求字段无效')
    }
    return {
      format: 0,
      sourceSessionId: record.sourceSessionId as string,
      kind: 'chat',
      importId: record.importId,
      ...(typeof record.characterId === 'string' ? { characterId: record.characterId } : {}),
      ...(typeof record.presetId === 'string' ? { presetId: record.presetId } : {}),
    }
  }
  if (record.kind === 'rewrite') {
    if (typeof record.turn !== 'number' || !Number.isSafeInteger(record.turn) || record.turn < 1
      || typeof record.text !== 'string' || record.text.trim() === '' || record.text.length > 8_000
      || Object.keys(record).some(key => !['format', 'sourceSessionId', 'kind', 'turn', 'text'].includes(key))) {
      throw new Error('改写会话请求字段无效')
    }
    return {
      format: 0,
      sourceSessionId: record.sourceSessionId as string,
      kind: 'rewrite',
      turn: record.turn,
      text: record.text,
    }
  }
  throw new Error('角色会话启动类型无效')
}

function presetAttachment(entry: PresetLibraryEntry): FileAttachmentRef {
  return {
    kind: 'file',
    attachmentId: AttachmentId(`library:${entry.id}`),
    bytes: Buffer.byteLength(JSON.stringify(entry.preset), 'utf8'),
    name: 'preset.json',
    mediaType: 'application/json',
  }
}

function seedWithPreset(
  seed: readonly SessionEvent[],
  presets: PresetLibrary,
  presetId: string | undefined,
): readonly SessionEvent[] {
  if (presetId === undefined) return seed
  const entry = presets.get(presetId)
  return createPresetSessionSeed(seed, entry.preset, presetAttachment(entry), entry.id)
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
  presets: PresetLibrary,
  request: LibrarySessionLaunchRequest,
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
    const characterSeed = createCharacterCardSessionSeed(
        resolved.card,
        source,
        request.greetingIndex,
        substituteCardMacros(selectedGreeting, resolved.card, userName).trim(),
        resolved.transport,
        userName,
        request.persona,
        request.characterId,
      )
    return {
      seed: seedWithPreset(characterSeed, presets, request.presetId),
      title: resolved.detail.displayName,
    }
  }

  const chat = chats.resolve(request.importId)
  if (request.characterId === undefined) {
    const identity = resolveSillyTavernChatIdentity(chat.chat)
    return {
      seed: seedWithPreset(createSillyTavernChatSeed(chat.chat, chat.attachment), presets, request.presetId),
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
  const migrationSeed = createSillyTavernMigrationSeed(
      character.card,
      source,
      character.transport,
      chat.chat,
      chat.attachment,
      request.characterId,
    )
  return {
    seed: seedWithPreset(migrationSeed, presets, request.presetId),
    title: character.detail.displayName,
  }
}

/** Cut one completed user turn from an Agent RP transcript without changing its source. */
export function prepareAgentRpRewriteSession(
  session: Pick<Session, 'events'>,
  turn: number,
  sourceTitle?: string,
): PreparedAgentRpSession {
  if (!Number.isSafeInteger(turn) || turn < 1) throw new Error('改写轮次无效')
  const start = session.events.find(event => event.type === 'turn/start' && event.data.turn === turn)
  if (start === undefined) throw new Error(`第 ${turn} 轮不存在`)
  const end = session.events.find(event => event.seq > start.seq && event.type === 'turn/end' && event.data.turn === turn)
  if (end === undefined) throw new Error(`第 ${turn} 轮尚未完成，请等待回复结束`)
  const userMessage = session.events.find(event => event.seq > start.seq && event.seq < end.seq && event.type === 'user/message')
  if (userMessage === undefined) throw new Error('这一轮没有可改写的用户消息')
  const seed = session.events.slice(0, start.seq)
  const characterName = readActiveSessionCharacter(seed)?.result.name
  const title = sourceTitle?.trim() || characterName?.trim() || '角色对话'
  return { seed, title: `${title} · 改写` }
}
