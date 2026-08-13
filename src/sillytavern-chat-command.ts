/** Model-free SillyTavern history migration through a private Session command. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandId } from '@deepseek-ai/dsh-commands'
import { CharacterLibrary } from './character-library.ts'
import { encodeCharacterLibraryLaunch, prepareCharacterLibraryImportMeta } from './import/session-character.ts'
import { createSillyTavernChatSeed } from './import/sillytavern-chat-seed.ts'
import { SillyTavernChatLibrary } from './sillytavern-chat-library.ts'
import type { SillyTavernChatLaunchRequest } from './sillytavern-chat-protocol.ts'
import {
  encodeSillyTavernChatCommandRecord,
  type SillyTavernChatCommandRecord,
} from './sillytavern-chat-protocol.ts'

/** Validate a private browser-owned migration request. */
export function parseSillyTavernChatLaunchRequest(source: string): SillyTavernChatLaunchRequest {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('聊天迁移请求不是有效 JSON', { cause: error })
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('聊天迁移请求不是对象')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.importId !== 'string' || !/^chat-[a-f0-9]{32}$/u.test(record.importId)
    || (record.characterId !== undefined
      && (typeof record.characterId !== 'string' || !/^card-[a-f0-9]{32}$/u.test(record.characterId)))
    || Object.keys(record).some(key => key !== 'format' && key !== 'importId' && key !== 'characterId')) {
    throw new Error('聊天迁移请求字段无效')
  }
  return {
    format: 0,
    importId: record.importId,
    ...(typeof record.characterId === 'string' ? { characterId: record.characterId } : {}),
  }
}

function appendChatSeed(agent: Agent, seed: ReturnType<typeof createSillyTavernChatSeed>): number {
  let presentationSeq = agent.session.events.at(-1)?.seq ?? 0
  for (const event of seed) {
    switch (event.type) {
      case 'agent-rp/sillytavern-chat-import':
        break
      case 'turn/start':
      case 'step/start':
      case 'step/end':
      case 'turn/end':
        agent.session.append(event.type, event.data)
        break
      case 'user/message':
      case 'assistant/message':
        presentationSeq = agent.session.append(event.type, event.data, {
          surfaceOp: event.surfaceOp ?? 'append',
          ...(event.sourceEventSeqs === undefined ? {} : { sourceEventSeqs: event.sourceEventSeqs }),
        }).seq
        break
      default:
        throw new Error(`聊天迁移包含不支持的 Session 事件：${event.type}`)
    }
  }
  return presentationSeq
}

/** Append imported history and optionally activate a Character Card without invoking a model. */
export function executeSillyTavernChatCommand(
  chats: SillyTavernChatLibrary,
  characters: CharacterLibrary,
  invocation: { readonly commandId: CommandId; readonly agent: Agent; readonly rawInput: string },
): { readonly kind: 'success'; readonly text?: string; readonly sourceEventSeq: number } {
  const request = parseSillyTavernChatLaunchRequest(invocation.rawInput)
  const source = invocation.agent.session.events.at(-1)
  if (source?.type !== 'command/run' || source.data.name !== 'rp-chat-import'
    || String(source.data.commandId) !== String(invocation.commandId)) {
    throw new Error('聊天迁移命令不是当前 Session 事件')
  }
  if (invocation.agent.session.events.some(event => event.type === 'turn/start')) {
    throw new Error('聊天记录只能迁移到新会话')
  }
  const resolved = chats.resolve(request.importId)
  const chat: SillyTavernChatCommandRecord = {
    format: 0,
    importId: resolved.upload.id,
    name: resolved.upload.name,
    messageCount: resolved.upload.messageCount,
    ...(resolved.upload.characterName === undefined ? {} : { characterName: resolved.upload.characterName }),
    ...(resolved.upload.userName === undefined ? {} : { userName: resolved.upload.userName }),
  }
  const character = request.characterId === undefined ? undefined : characters.resolve(request.characterId)
  if (character?.detail.archived === true) throw new Error('请先恢复这个角色，再迁移聊天记录')
  const presentationSeq = appendChatSeed(
    invocation.agent,
    createSillyTavernChatSeed(resolved.chat, resolved.attachment),
  )
  if (request.characterId === undefined || character === undefined) return {
    kind: 'success',
    text: encodeSillyTavernChatCommandRecord(chat),
    sourceEventSeq: presentationSeq,
  }
  const meta = prepareCharacterLibraryImportMeta(
    character.card,
    character.transport,
    source.seq,
    request.characterId,
    0,
    resolved.upload.userName,
  )
  return {
    kind: 'success',
    text: encodeCharacterLibraryLaunch({ format: 0, libraryId: request.characterId, meta, chat }),
    sourceEventSeq: presentationSeq,
  }
}
