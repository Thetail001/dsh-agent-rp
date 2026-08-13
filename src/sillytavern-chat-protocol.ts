/** Browser-safe values for model-free SillyTavern chat migration. */

/** Same-origin upload endpoint served by the Agent RP Host plugin. */
export const SILLYTAVERN_CHAT_PATH = '/api/agent-rp/sillytavern-chats'

/** Browser-safe description of one retained JSONL source. */
export interface SillyTavernChatUpload {
  readonly id: string
  readonly name: string
  readonly bytes: number
  readonly messageCount: number
  readonly characterName?: string
  readonly userName?: string
}

/** Durable summary stored in the native command result for Session replay. */
export interface SillyTavernChatCommandRecord {
  readonly format: 0
  readonly importId: string
  readonly name: string
  readonly messageCount: number
  readonly characterName?: string
  readonly userName?: string
}

const SILLYTAVERN_CHAT_RESULT_PREFIX = 'agent-rp-sillytavern-chat-v0:'

/** Validate one chat summary recovered from a command result. */
export function parseSillyTavernChatCommandRecord(value: unknown): SillyTavernChatCommandRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('聊天迁移结果不是对象')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.importId !== 'string' || !/^chat-[a-f0-9]{32}$/u.test(record.importId)
    || typeof record.name !== 'string' || record.name.trim() === '' || !/\.jsonl$/iu.test(record.name)
    || typeof record.messageCount !== 'number' || !Number.isSafeInteger(record.messageCount) || record.messageCount < 0
    || (record.characterName !== undefined && (typeof record.characterName !== 'string' || record.characterName.trim() === ''))
    || (record.userName !== undefined && (typeof record.userName !== 'string' || record.userName.trim() === ''))
    || Object.keys(record).some(key => !['format', 'importId', 'name', 'messageCount', 'characterName', 'userName'].includes(key))) {
    throw new Error('聊天迁移结果字段无效')
  }
  return {
    format: 0,
    importId: record.importId,
    name: record.name,
    messageCount: record.messageCount,
    ...(typeof record.characterName === 'string' ? { characterName: record.characterName } : {}),
    ...(typeof record.userName === 'string' ? { userName: record.userName } : {}),
  }
}

/** Serialize a chat-only migration result into the native command event. */
export function encodeSillyTavernChatCommandRecord(record: SillyTavernChatCommandRecord): string {
  return `${SILLYTAVERN_CHAT_RESULT_PREFIX}${JSON.stringify(record)}`
}

/** Decode a chat-only migration result, declining unrelated command output. */
export function decodeSillyTavernChatCommandRecord(source: string | undefined): SillyTavernChatCommandRecord | undefined {
  if (source?.startsWith(SILLYTAVERN_CHAT_RESULT_PREFIX) !== true) return undefined
  let value: unknown
  try {
    value = JSON.parse(source.slice(SILLYTAVERN_CHAT_RESULT_PREFIX.length))
  } catch (error: unknown) {
    throw new Error('聊天迁移结果不是有效 JSON', { cause: error })
  }
  return parseSillyTavernChatCommandRecord(value)
}

/** Private command input that consumes one Host-owned JSONL upload. */
export interface SillyTavernChatLaunchRequest {
  readonly format: 0
  readonly importId: string
  readonly characterId?: string
}

/** Successful browser upload response. */
export interface SillyTavernChatUploadResponse {
  readonly format: 0
  readonly upload: SillyTavernChatUpload
}
