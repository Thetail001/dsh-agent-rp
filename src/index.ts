/** Agent RP profile bundle and preset-scoped character runtime. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-attachment'
import type { ScopeKey } from '@deepseek-ai/dsh-scope'
import type { UserMessage } from '@deepseek-ai/dsh-session'
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
import {
  renderCharacterPrompt,
  renderImportedCharacterPrompt,
  renderImportedLorebook,
  renderMemoryContext,
} from './prompt.ts'
import { installBundledAgentRpPreset } from './preset.ts'

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
}

interface FileAttachmentReader {
  readFile(
    ref: FileAttachmentRef,
    signal?: AbortSignal,
  ): Promise<{ readonly ref: FileAttachmentRef; readonly data: Uint8Array }>
}

type PromptAttachmentPart = Parameters<Parameters<PromptAttachmentGateway['registerPromptAttachmentConsumer']>[1]>[0]['content'][number]

function isCharacterCardOffer(part: PromptAttachmentPart): boolean {
  return part.type === 'image'
    ? part.mediaType === 'image/png'
    : part.type === 'file' && /\.json$/iu.test(part.name)
}

/** Recognize one explicit Character Card import without exposing attachment bytes to the model. */
export function claimCharacterCardPrompt(
  agentRpActive: boolean,
  content: readonly PromptAttachmentPart[],
): { readonly text: string } | undefined {
  if (!agentRpActive) return undefined
  const attachments = content.filter(part => part.type !== 'text')
  const cards = attachments.filter(isCharacterCardOffer)
  const text = content.filter(part => part.type === 'text').map(part => part.text).join('\n')
  if (cards.length !== 1 || !/(?:角色卡|character\s*card|导入|接管|切换角色)/iu.test(text)) return undefined
  return { text }
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
    degradations: { type: 'array', required: true, items: { type: 'string', enum: CHARACTER_IMPORT_DEGRADATIONS } },
    raw: { type: 'json', required: true },
  },
} as const

function rememberCall(subject: string, text: string): GenericCallView {
  return { card: 'generic', title: `记住：${subject}`, kind: 'other', rawInput: text }
}

function isCharacterCardAttachment(value: unknown): value is CharacterCardAttachmentRef {
  return isPngCharacterCardAttachment(value) || isJsonCharacterCardAttachment(value)
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
    claimCharacterCardPrompt(agentsByScope.get(agent) === agent, content)
  )), 'agent-rp: prompt attachment consumer')
  ctx.systemPrompt.section({
    name: 'deployment:persona',
    order: 0,
    text: ({ scope }) => {
      const agent = scope === undefined ? undefined : agentsByScope.get(scope)
      const pendingMessages = agent === undefined ? [] : pendingMessagesByAgent.get(agent) ?? []
      if (agent !== undefined) pendingMessagesByAgent.delete(agent)
      const active = importedCharacter(agentsByScope, scope)
      if (agent === undefined || active === undefined) return renderCharacterPrompt(config)
      const card = cardFromImportMeta(active.meta)
      const lore = renderImportedLorebook(card, agent.session, pendingMessages)
      return renderImportedCharacterPrompt(card, lore.beforeCharacter, lore.afterCharacter)
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
            : `立即以新角色发送这段开场白，不解释导入过程：\n${value.selectedGreeting}`,
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
        return prepareCharacterImportResult(card, { transport: 'json' }, direct.eventSeq, stored.ref, args.greetingIndex ?? 0)
      }
      const stored = await ctx.attachments.readImage(attachment, exec.signal)
      const payload = readCharacterCardPng(stored.data)
      const card = parseCharacterCardJson(payload.json)
      return prepareCharacterImportResult(card, {
        transport: 'png',
        metadataKeyword: payload.keyword,
      }, direct.eventSeq, stored.ref, args.greetingIndex ?? 0)
    },
    presentCall: () => ({ card: 'generic', title: '导入角色卡', kind: 'read' }),
    presentResult: (_args, result) => ({
      card: 'generic',
      title: result.isError ? '角色卡导入失败' : '角色卡已导入',
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
    installBundledAgentRpPreset()
    return
  }
  installAgentRp(ctx, resolved)
}
