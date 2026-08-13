/** Host-owned SillyTavern chat sources used by model-free migration. */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { FileAttachmentRef } from './import/session-character.ts'
import { parseSillyTavernChatBytes } from './import/sillytavern-chat.ts'
import { resolveSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import type { ImportedSillyTavernChat } from './import/types.ts'
import type { SillyTavernChatUpload } from './sillytavern-chat-protocol.ts'

const ID_PATTERN = /^chat-[a-f0-9]{32}$/u

/** Maximum accepted JSONL source size. */
export const MAX_SILLYTAVERN_CHAT_BYTES = 64 * 1024 * 1024

/** Parsed Host-only source behind one opaque upload id. */
export interface ResolvedSillyTavernChatUpload {
  readonly upload: SillyTavernChatUpload
  readonly chat: ImportedSillyTavernChat
  readonly attachment: FileAttachmentRef
}

/** Content-addressed store for original JSONL bytes. */
export class SillyTavernChatLibrary {
  readonly root: string

  constructor(options: { readonly root?: string } = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'chat-imports'))
  }

  /** Validate and retain one browser-selected JSONL file. */
  importFile(input: { readonly data: Uint8Array; readonly filename: string }): SillyTavernChatUpload {
    const name = basename(input.filename.trim()).slice(0, 240)
    if (name === '' || !/\.jsonl$/iu.test(name)) throw new Error('请选择 SillyTavern 导出的 JSONL 聊天记录')
    if (input.data.byteLength === 0) throw new Error('聊天记录文件为空')
    if (input.data.byteLength > MAX_SILLYTAVERN_CHAT_BYTES) throw new Error('聊天记录文件过大')
    const chat = parseSillyTavernChatBytes(input.data)
    const id = `chat-${createHash('sha256').update(input.data).digest('hex').slice(0, 32)}`
    mkdirSync(this.root, { recursive: true })
    const dataPath = join(this.root, `${id}.jsonl`)
    const namePath = join(this.root, `${id}.name`)
    if (!existsSync(dataPath)) writeFileSync(dataPath, input.data, { flag: 'wx' })
    if (!existsSync(namePath)) writeFileSync(namePath, name, { encoding: 'utf8', flag: 'wx' })
    return this.describe(id, name, input.data.byteLength, chat)
  }

  /** Resolve one validated source without accepting paths from the browser. */
  resolve(id: string): ResolvedSillyTavernChatUpload {
    if (!ID_PATTERN.test(id)) throw new Error('聊天迁移编号无效')
    const dataPath = join(this.root, `${id}.jsonl`)
    const namePath = join(this.root, `${id}.name`)
    if (!existsSync(dataPath) || !existsSync(namePath)) throw new Error('这份聊天记录已不可用，请重新选择 JSONL 文件')
    const data = new Uint8Array(readFileSync(dataPath))
    const name = readFileSync(namePath, 'utf8').trim()
    if (name === '' || !/\.jsonl$/iu.test(name) || data.byteLength > MAX_SILLYTAVERN_CHAT_BYTES) {
      throw new Error('已保存的聊天记录来源无效')
    }
    const chat = parseSillyTavernChatBytes(data)
    const upload = this.describe(id, name, data.byteLength, chat)
    return {
      upload,
      chat,
      attachment: {
        kind: 'file',
        attachmentId: AttachmentId(`agent-rp:${id}`),
        bytes: data.byteLength,
        name,
        mediaType: 'application/x-ndjson',
      },
    }
  }

  private describe(id: string, name: string, bytes: number, chat: ImportedSillyTavernChat): SillyTavernChatUpload {
    const identity = resolveSillyTavernChatIdentity(chat)
    return {
      id,
      name,
      bytes,
      messageCount: chat.messages.length,
      ...(identity.characterName === undefined ? {} : { characterName: identity.characterName }),
      ...(identity.userName === undefined ? {} : { userName: identity.userName }),
    }
  }
}
