/** Agent RP profile bundle and preset-scoped character runtime. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ScopeKey } from '@deepseek-ai/dsh-scope'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import {
  Config,
  resolveConfig,
  type Config as AgentRpConfig,
  type ResolvedConfig,
} from './config.ts'
import {
  AGENT_RP_MEMORY_KINDS,
  prepareAgentRpMemory,
} from './memory.ts'
import { parseCharacterCardJson, parseCharacterCardJsonBytes } from './import/character-card.ts'
import { createCharacterCardSessionSeed } from './import/character-card-seed.ts'
import { readCharacterCardPng } from './import/png.ts'
import {
  cardFromImportMeta,
  isJsonCharacterCardAttachment,
  isPngCharacterCardAttachment,
  prepareCharacterImportResult,
  readActiveSessionCharacter,
  type CharacterCardAttachmentRef,
  type CharacterImportMeta,
  type FileAttachmentRef,
} from './import/session-character.ts'
import { CHARACTER_IMPORT_DEGRADATIONS } from './import/types.ts'
import { WORLD_INFO_IMPORT_DEGRADATIONS } from './import/types.ts'
import { parseWorldInfoJsonBytes } from './import/world-info.ts'
import { parseSillyTavernChatBytes } from './import/sillytavern-chat.ts'
import { createSillyTavernMigrationSeed } from './import/sillytavern-migration-seed.ts'
import {
  createSillyTavernChatSeed,
  readSillyTavernChatIdentity,
  resolveSillyTavernChatIdentity,
} from './import/sillytavern-chat-seed.ts'
import {
  isJsonWorldInfoAttachment,
  prepareWorldInfoImportResult,
  readActiveSessionWorldInfos,
  type WorldInfoImportMeta,
} from './import/session-world-info.ts'
import {
  renderCharacterPrompt,
  renderImportedChatPrompt,
  renderImportedCharacterPrompt,
  renderImportedLorebook,
  renderImportedWorldInfos,
  renderMemoryContext,
  substituteCardMacros,
} from './prompt.ts'
import { installBundledAgentRpPreset } from './preset.ts'
import type {} from '@deepseek-ai/dsh-session-projection'
import { agentRpProjectionDefinition } from './projection.ts'

/** Cordis plugin identity. */
export const name = 'dsh-agent-rp'
export { Config }
/** Host services required by the profile bundle. */
export const inject = ['agents', 'apiProxy', 'attachments', 'systemPrompt', 'tools']

interface PromptAttachmentGateway {
  registerPromptAttachmentConsumer(
    name: string,
    consumer: (offer: {
      readonly agent: Agent
      readonly content: ReadonlyArray<
        | { readonly type: 'text'; readonly text: string }
        | { readonly type: 'image'; readonly mediaType: string; readonly name?: string }
        | { readonly type: 'file'; readonly name: string; readonly mediaType?: string }
      >
    }) => { readonly text: string } | undefined,
  ): () => void
  registerPromptSessionImporter(
    name: string,
    importer: {
      recognize(offer: {
        readonly agent: Agent
        readonly content: ReadonlyArray<
          | { readonly type: 'text'; readonly text: string }
          | { readonly type: 'image'; readonly mediaType: string; readonly name?: string }
          | { readonly type: 'file'; readonly name: string; readonly mediaType?: string }
        >
      }): boolean
      import(input: {
        readonly source: Agent
        readonly text: string
        readonly attachments: readonly PromptImportAttachment[]
        readFile(ref: FileAttachmentRef, signal?: AbortSignal): Promise<Uint8Array>
      }, signal?: AbortSignal): Promise<{ readonly seed: readonly SessionEvent[]; readonly title?: string }>
    },
  ): () => void
}

interface FileAttachmentReader {
  readFile(
    ref: FileAttachmentRef,
    signal?: AbortSignal,
  ): Promise<{ readonly ref: FileAttachmentRef; readonly data: Uint8Array }>
  readImage(
    ref: ImageAttachmentRef,
    signal?: AbortSignal,
  ): Promise<{ readonly ref: ImageAttachmentRef; readonly data: Uint8Array }>
}

type PromptImportAttachment = CharacterCardAttachmentRef | FileAttachmentRef

type PromptAttachmentPart = Parameters<Parameters<PromptAttachmentGateway['registerPromptAttachmentConsumer']>[1]>[0]['content'][number]

function isCharacterCardOffer(part: PromptAttachmentPart): boolean {
  return part.type === 'image'
    ? part.mediaType === 'image/png'
    : part.type === 'file' && /\.json$/iu.test(part.name)
}

function isWorldInfoRequest(text: string): boolean {
  return /(?:世界书|世界信息|world\s*info|lorebook)/iu.test(text) && /(?:导入|加载|使用|接入)/u.test(text)
}

/** Recognize one explicit Character Card import without exposing attachment bytes to the model. */
export function claimAgentRpPrompt(
  agentRpActive: boolean,
  content: readonly PromptAttachmentPart[],
): { readonly text: string } | undefined {
  if (!agentRpActive) return undefined
  const attachments = content.filter(part => part.type !== 'text')
  const text = content.filter(part => part.type === 'text').map(part => part.text).join('\n')
  if (isWorldInfoRequest(text)) {
    const files = attachments.filter(part => part.type === 'file' && /\.json$/iu.test(part.name))
    return files.length === 1 ? { text } : undefined
  }
  const cards = attachments.filter(isCharacterCardOffer)
  if (cards.length !== 1 || !/(?:角色卡|character\s*card|导入|接管|切换角色)/iu.test(text)) return undefined
  return { text }
}

/** Recognize one standalone SillyTavern JSONL chat upload. */
export function isSillyTavernChatOffer(
  agentRpActive: boolean,
  content: readonly PromptAttachmentPart[],
): boolean {
  if (!agentRpActive) return false
  const attachments = content.filter(part => part.type !== 'text')
  return attachments.length === 1
    && attachments[0]?.type === 'file'
    && /\.jsonl$/iu.test(attachments[0].name)
}

/** Recognize one Character Card and one JSONL chat submitted together. */
export function isSillyTavernMigrationOffer(
  agentRpActive: boolean,
  content: readonly PromptAttachmentPart[],
): boolean {
  if (!agentRpActive) return false
  const attachments = content.filter(part => part.type !== 'text')
  return attachments.length === 2
    && attachments.filter(isCharacterCardOffer).length === 1
    && attachments.filter(part => part.type === 'file' && /\.jsonl$/iu.test(part.name)).length === 1
}

/** Recognize one explicitly selected standalone Character Card import. */
export function isCharacterCardSessionOffer(
  agentRpActive: boolean,
  content: readonly PromptAttachmentPart[],
): boolean {
  if (!agentRpActive) return false
  const text = content.filter(part => part.type === 'text').map(part => part.text).join('\n')
  const attachments = content.filter(part => part.type !== 'text')
  return /^请导入这张角色卡$/u.test(text.trim())
    && attachments.length === 1
    && attachments[0] !== undefined
    && isCharacterCardOffer(attachments[0])
}

/** Canonical output schema for one accepted `remember` call. */
export const MEMORY_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', required: true, const: 0 },
    id: { type: 'string', required: true },
    kind: { type: 'string', required: true, enum: AGENT_RP_MEMORY_KINDS },
    subject: { type: 'string', required: true },
    text: { type: 'string', required: true },
    sourceEventSeq: { type: 'integer', required: true },
    supersedes: { type: 'string' },
  },
} as const

/** Canonical output schema for one accepted Character Card import. */
export const CHARACTER_IMPORT_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', required: true, const: 0 },
    name: { type: 'string', required: true },
    cardVersion: { type: 'integer', required: true, enum: [1, 2, 3] },
    sourceEventSeq: { type: 'integer', required: true },
    sourceAttachmentId: { type: 'string', required: true },
    transport: { type: 'string', required: true, enum: ['png', 'json'] },
    metadataKeyword: { type: 'string', enum: ['ccv3', 'chara'] },
    greetingIndex: { type: 'integer', required: true },
    selectedGreeting: { type: 'string', required: true },
    userName: { type: 'string' },
    degradations: { type: 'array', required: true, items: { type: 'string', enum: CHARACTER_IMPORT_DEGRADATIONS } },
    raw: { type: 'json', required: true },
  },
} as const

/** Canonical output schema for one accepted standalone World Info import. */
export const WORLD_INFO_IMPORT_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', required: true, const: 0 },
    name: { type: 'string', required: true },
    sourceEventSeq: { type: 'integer', required: true },
    sourceAttachmentId: { type: 'string', required: true },
    entryCount: { type: 'integer', required: true },
    degradations: { type: 'array', required: true, items: { type: 'string', enum: WORLD_INFO_IMPORT_DEGRADATIONS } },
    raw: { type: 'json', required: true },
  },
} as const

function rememberCall(subject: string, text: string): GenericCallView {
  return { card: 'generic', title: `记住：${subject}`, kind: 'other', rawInput: text }
}

function isCharacterCardAttachment(value: unknown): value is CharacterCardAttachmentRef {
  return isPngCharacterCardAttachment(value) || isJsonCharacterCardAttachment(value)
}

function latestConsumedAttachments(agent: Agent): { eventSeq: number; attachments: FileAttachmentRef[] } {
  for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
    const event = agent.session.events[index]
    if (event?.type !== 'user/message' || event.data.source.kind !== 'user') continue
    const source = event.data.source as unknown as { attachmentConsumer?: unknown; attachments?: unknown }
    const attachments = source.attachmentConsumer === 'dsh-agent-rp' && Array.isArray(source.attachments)
      ? source.attachments.filter(isJsonWorldInfoAttachment)
      : []
    if (attachments.length === 0) throw new Error('当前消息没有可导入的 JSON 文件')
    return { eventSeq: event.seq, attachments }
  }
  throw new Error('没有找到导入请求；请在同一条消息中附上 JSON 文件')
}

function latestUserAttachments(agent: Agent): { eventSeq: number; attachments: CharacterCardAttachmentRef[] } {
  for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
    const event = agent.session.events[index]
    if (event?.type !== 'user/message' || event.data.source.kind !== 'user') continue
    const direct = event.data.content.flatMap(block => block.type === 'image' ? [block.attachment] : [])
    const source = event.data.source as unknown as {
      attachmentConsumer?: unknown
      attachments?: unknown
    }
    const consumed = source.attachmentConsumer === 'dsh-agent-rp' && Array.isArray(source.attachments)
      ? source.attachments.filter(isCharacterCardAttachment)
      : []
    const attachments = [...direct.filter(isCharacterCardAttachment), ...consumed]
    if (attachments.length === 0) throw new Error('当前消息没有可导入的角色卡；请附上 Character Card PNG 或 JSON')
    return { eventSeq: event.seq, attachments }
  }
  throw new Error('没有找到导入请求；请在同一条消息中附上 Character Card PNG 或 JSON')
}

function importedCharacter(agentsByScope: WeakMap<ScopeKey, Agent>, scope: ScopeKey | undefined) {
  if (scope === undefined) return undefined
  const agent = agentsByScope.get(scope)
  return agent === undefined ? undefined : readActiveSessionCharacter(agent.session.events)
}

/**
 * Attach one persistent character identity and memory tool to a top-level Agent.
 * @param agent - published top-level Agent whose scope owns every registration.
 * @param config - normalized character configuration.
 */
export function installAgentRp(ctx: Context, config: ResolvedConfig): void {
  const agentsByScope = new WeakMap<ScopeKey, Agent>()
  const pendingMessagesByAgent = new WeakMap<Agent, UserMessage[]>()
  const gateway = (ctx as Context & { apiProxy: PromptAttachmentGateway }).apiProxy
  ctx.effect(() => gateway.registerPromptAttachmentConsumer('dsh-agent-rp', ({ agent, content }) => (
    claimAgentRpPrompt(agentsByScope.get(agent) === agent, content)
  )), 'agent-rp: prompt attachment consumer')
  ctx.effect(() => gateway.registerPromptSessionImporter('dsh-agent-rp:sillytavern-migration', {
    recognize: ({ agent, content }) => isSillyTavernMigrationOffer(agentsByScope.get(agent) === agent, content),
    async import(input, signal) {
      const cardAttachment = input.attachments.find(attachment =>
        isJsonCharacterCardAttachment(attachment) || isPngCharacterCardAttachment(attachment))
      const chatAttachment = input.attachments.find((attachment): attachment is FileAttachmentRef =>
        'kind' in attachment && attachment.kind === 'file' && /\.jsonl$/iu.test(attachment.name))
      if (cardAttachment === undefined || chatAttachment === undefined) {
        throw new Error('SillyTavern migration requires one Character Card PNG or JSON and one chat JSONL')
      }
      const reader = ctx.attachments as unknown as FileAttachmentReader
      const [storedCard, chatBytes] = await Promise.all([
        isJsonCharacterCardAttachment(cardAttachment)
          ? input.readFile(cardAttachment, signal).then(data => ({ ref: cardAttachment, data }))
          : reader.readImage(cardAttachment, signal),
        input.readFile(chatAttachment, signal),
      ])
      const payload = isJsonCharacterCardAttachment(storedCard.ref)
        ? undefined
        : readCharacterCardPng(storedCard.data)
      const card = payload === undefined
        ? parseCharacterCardJsonBytes(storedCard.data)
        : parseCharacterCardJson(payload.json)
      const transport = payload === undefined
        ? { transport: 'json' as const }
        : { transport: 'png' as const, metadataKeyword: payload.keyword }
      const chat = parseSillyTavernChatBytes(chatBytes)
      return {
        seed: createSillyTavernMigrationSeed(card, storedCard.ref, transport, chat, chatAttachment),
        title: card.nickname?.trim() || card.name,
      }
    },
  }), 'agent-rp: SillyTavern migration importer')
  ctx.effect(() => gateway.registerPromptSessionImporter('dsh-agent-rp:sillytavern-chat', {
    recognize: ({ agent, content }) => isSillyTavernChatOffer(agentsByScope.get(agent) === agent, content),
    async import(input, signal) {
      if (input.attachments.length !== 1) throw new Error('SillyTavern chat import requires exactly one file')
      const attachment = input.attachments[0]
      if (attachment === undefined || !('kind' in attachment) || attachment.kind !== 'file'
        || !/\.jsonl$/iu.test(attachment.name)) {
        throw new Error('SillyTavern chat import requires one .jsonl file')
      }
      const chat = parseSillyTavernChatBytes(await input.readFile(attachment, signal))
      const title = resolveSillyTavernChatIdentity(chat).characterName
      return {
        seed: createSillyTavernChatSeed(chat, attachment),
        ...(title === undefined || title === '' ? {} : { title }),
      }
    },
  }), 'agent-rp: SillyTavern chat importer')
  ctx.effect(() => gateway.registerPromptSessionImporter('dsh-agent-rp:character-card', {
    recognize: ({ agent, content }) => isCharacterCardSessionOffer(agentsByScope.get(agent) === agent, content),
    async import(input, signal) {
      if (input.attachments.length !== 1) throw new Error('Character Card import requires exactly one file')
      const attachment = input.attachments[0]
      if (attachment === undefined
        || (!isJsonCharacterCardAttachment(attachment) && !isPngCharacterCardAttachment(attachment))) {
        throw new Error('Character Card import requires one PNG or JSON card')
      }
      const reader = ctx.attachments as unknown as FileAttachmentReader
      const stored = isJsonCharacterCardAttachment(attachment)
        ? { ref: attachment, data: await input.readFile(attachment, signal) }
        : await reader.readImage(attachment, signal)
      const payload = isJsonCharacterCardAttachment(stored.ref) ? undefined : readCharacterCardPng(stored.data)
      const card = payload === undefined
        ? parseCharacterCardJsonBytes(stored.data)
        : parseCharacterCardJson(payload.json)
      const greeting = substituteCardMacros(card.firstMessage, card)
      return {
        seed: createCharacterCardSessionSeed(card, stored.ref, 0, greeting, payload === undefined
          ? { transport: 'json' }
          : { transport: 'png', metadataKeyword: payload.keyword }),
        title: card.nickname?.trim() || card.name,
      }
    },
  }), 'agent-rp: Character Card importer')
  ctx.systemPrompt.section({
    name: 'deployment:persona',
    order: 0,
    text: ({ scope }) => {
      const agent = scope === undefined ? undefined : agentsByScope.get(scope)
      const pendingMessages = agent === undefined ? [] : pendingMessagesByAgent.get(agent) ?? []
      if (agent !== undefined) pendingMessagesByAgent.delete(agent)
      const active = importedCharacter(agentsByScope, scope)
      if (agent === undefined) return renderCharacterPrompt(config)
      const worldInfos = readActiveSessionWorldInfos(agent.session.events).map(imported => imported.worldInfo)
      const standaloneLore = renderImportedWorldInfos(worldInfos, agent.session, pendingMessages)
      if (active === undefined) {
        const importedChat = readSillyTavernChatIdentity(agent.session.events)
        if (importedChat !== undefined) {
          return [
            ...standaloneLore.beforeCharacter,
            renderImportedChatPrompt(importedChat.characterName, importedChat.userName),
            ...standaloneLore.afterCharacter,
          ].join('\n\n')
        }
        return renderCharacterPrompt(config, standaloneLore.beforeCharacter, standaloneLore.afterCharacter)
      }
      const card = cardFromImportMeta(active.meta)
      const characterLore = renderImportedLorebook(card, agent.session, pendingMessages)
      return renderImportedCharacterPrompt(
        card,
        [...standaloneLore.beforeCharacter, ...characterLore.beforeCharacter],
        [...characterLore.afterCharacter, ...standaloneLore.afterCharacter],
        readSillyTavernChatIdentity(agent.session.events)?.userName,
      )
    },
    complete: true,
  })
  ctx.on('agent/created', ({ agent }) => {
    agentsByScope.set(agent, agent)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    agentsByScope.delete(agent)
    pendingMessagesByAgent.delete(agent)
  })
  ctx.on('agent/inbox/claimed', ({ agent, message }) => {
    if (agentsByScope.get(agent) !== agent) return
    const pending = pendingMessagesByAgent.get(agent)
    if (pending === undefined) pendingMessagesByAgent.set(agent, [message])
    else pending.push(message)
  })
  ctx.systemPrompt.context({
    name: 'agent-rp:memory',
    order: 70,
    text: ({ scope }) => {
      if (scope === undefined) return ''
      const agent = agentsByScope.get(scope)
      return agent === undefined ? '' : renderMemoryContext(agent.session.events)
    },
  })
  ctx.systemPrompt.context({ name: 'sandbox:policy', order: 0, text: '' })
  ctx.systemPrompt.context({ name: 'approval:policy', order: 0, text: '' })
  ctx.tools.register(defineTool({
    name: 'remember',
    description: 'Persist one confirmed fact, promise, preference, relationship change, or shared event for later turns in this Session. Use supersedes only when correcting one currently active memory id.',
    parameters: {
      kind: {
        type: 'string',
        enum: AGENT_RP_MEMORY_KINDS,
        required: true,
        description: 'Why this information must remain available in later turns.',
      },
      subject: {
        type: 'string',
        required: true,
        description: 'Short stable topic used to distinguish this memory from unrelated records.',
      },
      text: {
        type: 'string',
        required: true,
        description: 'Concise confirmed information to remember without speculation or hidden reasoning.',
      },
      supersedes: {
        type: 'string',
        description: 'Active memory id replaced by this corrected record.',
      },
    },
    output: {
      schema: MEMORY_VALUE_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute(args, exec) {
      if (exec.agent === undefined) throw new Error('remember requires an Agent Session')
      if (exec.parent !== undefined) throw new Error('remember must be called directly by the character Agent')
      const record = prepareAgentRpMemory(exec.agent.session, String(exec.callId), args)
      return Promise.resolve(record)
    },
    presentCall: args => rememberCall(args.subject, args.text),
    isConcurrencySafe: () => false,
  }))
  ctx.tools.register(defineTool({
    name: 'import_character_card',
    description: 'Import a SillyTavern Character Card V1, V2, or V3 from a PNG or JSON attachment in the latest user message, then make that character active for this Session. Omit attachmentIndex unless the message has multiple recognized cards. greetingIndex 0 selects first_mes; later indexes select alternate_greetings.',
    parameters: {
      attachmentIndex: {
        type: 'integer',
        description: 'Zero-based Character Card attachment index in the latest user message. Omit when it contains exactly one card.',
      },
      greetingIndex: {
        type: 'integer',
        description: 'Zero selects first_mes; one and above select alternate_greetings. Defaults to zero.',
      },
    },
    output: {
      schema: CHARACTER_IMPORT_VALUE_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: [
          `已导入 ${value.name}（Character Card V${value.cardVersion}）`,
          value.selectedGreeting.trim().length === 0
            ? '角色卡没有开场白；直接以新角色自然回应。'
            : `立即以新角色发送这段开场白，不解释导入过程：\n${substituteCardMacros(
              value.selectedGreeting,
              parseCharacterCardJson(JSON.stringify(value.raw)),
              value.userName,
            )}`,
          value.degradations.length === 0 ? '未发现需要降级的能力。' : `未启用：${value.degradations.join('、')}`,
        ].join('\n'),
      }],
      presentationMeta: (_args, value) => {
        const { raw, ...result } = value
        const meta: CharacterImportMeta = { format: 0, result, raw }
        return meta as unknown as import('@deepseek-ai/dsh-session').JsonValue
      },
    },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('import_character_card requires an Agent Session')
      if (exec.parent !== undefined) throw new Error('import_character_card must be called directly by the character Agent')
      const direct = latestUserAttachments(exec.agent)
      const attachmentIndex = args.attachmentIndex ?? 0
      const attachments = direct.attachments
      if (!Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= attachments.length) {
        throw new Error(`attachmentIndex ${attachmentIndex} is unavailable; the current import source contains ${attachments.length} Character Card attachment(s)`)
      }
      const attachment = attachments[attachmentIndex]!
      if (isJsonCharacterCardAttachment(attachment)) {
        const reader = ctx.attachments as unknown as FileAttachmentReader
        const stored = await reader.readFile(attachment, exec.signal)
        const card = parseCharacterCardJsonBytes(stored.data)
        return prepareCharacterImportResult(
          card,
          { transport: 'json' },
          direct.eventSeq,
          stored.ref,
          args.greetingIndex ?? 0,
          readSillyTavernChatIdentity(exec.agent.session.events)?.userName,
        )
      }
      const stored = await ctx.attachments.readImage(attachment, exec.signal)
      const payload = readCharacterCardPng(stored.data)
      const card = parseCharacterCardJson(payload.json)
      return prepareCharacterImportResult(card, {
        transport: 'png',
        metadataKeyword: payload.keyword,
      }, direct.eventSeq, stored.ref, args.greetingIndex ?? 0,
      readSillyTavernChatIdentity(exec.agent.session.events)?.userName)
    },
    presentCall: () => ({ card: 'generic', title: '导入角色卡', kind: 'read' }),
    presentResult: (_args, result) => ({
      card: 'generic',
      title: result.isError ? '角色卡导入失败' : '角色卡已导入',
    }),
    isConcurrencySafe: () => false,
  }))
  ctx.tools.register(defineTool({
    name: 'import_world_info',
    description: 'Import one standalone SillyTavern World Info / lorebook JSON attachment from the latest user message and keep it active in this Session. Omit attachmentIndex unless the message contains multiple JSON files.',
    parameters: {
      attachmentIndex: {
        type: 'integer',
        description: 'Zero-based JSON attachment index in the latest user message. Omit when it contains exactly one file.',
      },
    },
    output: {
      schema: WORLD_INFO_IMPORT_VALUE_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: [
          `已导入世界书 ${value.name}（${value.entryCount} 个条目）`,
          value.degradations.length === 0 ? '未发现需要降级的能力。' : `未启用：${value.degradations.join('、')}`,
          '从下一次回应开始使用已激活的设定，不解释导入过程。',
        ].join('\n'),
      }],
      presentationMeta: (_args, value) => {
        const { raw, ...result } = value
        const meta: WorldInfoImportMeta = { format: 0, result, raw }
        return meta as unknown as import('@deepseek-ai/dsh-session').JsonValue
      },
    },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('import_world_info requires an Agent Session')
      if (exec.parent !== undefined) throw new Error('import_world_info must be called directly by the character Agent')
      const direct = latestConsumedAttachments(exec.agent)
      const attachmentIndex = args.attachmentIndex ?? 0
      if (!Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= direct.attachments.length) {
        throw new Error(`attachmentIndex ${attachmentIndex} is unavailable; the current import source contains ${direct.attachments.length} JSON attachment(s)`)
      }
      const reader = ctx.attachments as unknown as FileAttachmentReader
      const stored = await reader.readFile(direct.attachments[attachmentIndex]!, exec.signal)
      const worldInfo = parseWorldInfoJsonBytes(stored.data)
      return prepareWorldInfoImportResult(worldInfo, direct.eventSeq, stored.ref)
    },
    presentCall: () => ({ card: 'generic', title: '导入世界书', kind: 'read' }),
    presentResult: (_args, result) => ({
      card: 'generic',
      title: result.isError ? '世界书导入失败' : '世界书已导入',
    }),
    isConcurrencySafe: () => false,
  }))
}

/**
 * Install the Agent RP profile behavior for every top-level Agent.
 * @param ctx - settled Web Host context.
 * @param config - character configuration for this profile.
 */
export function apply(ctx: Context, config: AgentRpConfig): void {
  const resolved = resolveConfig(config)
  if (resolved.mode === 'host') {
    ctx.inject(['sessionProjections'], projectionCtx => {
      projectionCtx.sessionProjections.register(agentRpProjectionDefinition)
    })
    installBundledAgentRpPreset()
    return
  }
  installAgentRp(ctx, resolved)
}
