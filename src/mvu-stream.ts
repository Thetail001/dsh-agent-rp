/** Host-side completion for Character Card replies that omit their MVU patch. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  BlockAssembler,
  createUserMessage,
  ReasoningEffortId,
  type GenerateOptions,
  type StreamChunk,
  type TokenUsage,
} from '@deepseek-ai/dsh-llm'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'
import {
  normalizeMvuSupplement,
  readCurrentMvuState,
  renderMvuUpdateInstructions,
} from './mvu.ts'

function textFromChunks(chunks: readonly StreamChunk[]): string {
  return chunks.flatMap(chunk => chunk.type === 'text-delta' ? [chunk.text] : []).join('')
}

function lastUserText(options: GenerateOptions): string {
  const message = options.messages.findLast(item => item.role === 'user')
  return message?.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n') ?? ''
}

function addUsage(left: TokenUsage | undefined, right: TokenUsage | undefined): TokenUsage | undefined {
  if (left === undefined) return right
  if (right === undefined) return left
  const optional = (key: 'cacheReadTokens' | 'cacheWriteTokens' | 'reasoningTokens') => {
    const value = (left[key] ?? 0) + (right[key] ?? 0)
    return value === 0 ? {} : { [key]: value }
  }
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    ...optional('cacheReadTokens'),
    ...optional('cacheWriteTokens'),
    ...optional('reasoningTokens'),
  }
}

async function requestSupplement(
  ctx: Context,
  options: GenerateOptions,
  current: JsonValue,
  rules: string,
  assistantReply: string,
): Promise<{ readonly text?: string; readonly usage?: TokenUsage }> {
  const assembler = new BlockAssembler()
  const request: GenerateOptions = {
    provider: options.provider,
    model: options.model,
    reasoningEffort: ReasoningEffortId('off'),
    messages: [createUserMessage({
      source: { kind: 'plugin', plugin: 'dsh-agent-rp' },
      content: [{
        type: 'text',
        text: [
          '<current_stat_data>',
          JSON.stringify(current),
          '</current_stat_data>',
          '<latest_user_message>',
          lastUserText(options),
          '</latest_user_message>',
          '<assistant_reply>',
          assistantReply,
          '</assistant_reply>',
          '<card_mvu_rules>',
          rules,
          '</card_mvu_rules>',
          'Return exactly one complete <UpdateVariable> block for the assistant reply. Follow the card rules and current state. Do not continue or rewrite the story. If no field changed, return a valid empty JSONPatch array.',
        ].join('\n'),
      }],
    })],
    maxTokens: 8192,
    temperature: 0,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  }
  for await (const chunk of ctx.llm.stream(request)) assembler.push(chunk)
  if (assembler.finish.kind === 'error' || assembler.finish.kind === 'aborted') return {}
  const text = assembler.blocks().flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  return { text, ...(assembler.usage === undefined ? {} : { usage: assembler.usage }) }
}

/** Install a stream wrapper that supplements only active MVU Character Card sessions. */
export function installMvuStreamCompletion(
  ctx: Context,
  agentForSession: (sessionId: string) => Agent | undefined,
): void {
  ctx.on('llm/stream', (options, next) => {
    const agent = options.sessionId === undefined ? undefined : agentForSession(String(options.sessionId))
    if (agent === undefined) return next()
    const active = readActiveSessionCharacter(agent.session.events)
    if (active === undefined) return next()
    const card = cardFromImportMeta(active.meta)
    const current = readCurrentMvuState(card, agent.session.events)
    if (current === undefined) return next()
    const rules = renderMvuUpdateInstructions(card, current.statData)
    if (rules === undefined) return next()

    return (async function* (): AsyncIterable<StreamChunk> {
      const observed: StreamChunk[] = []
      let usage: TokenUsage | undefined
      let finish: Extract<StreamChunk, { type: 'finish' }> | undefined
      let maxIndex = -1
      for await (const chunk of next()) {
        observed.push(chunk)
        if ('index' in chunk) maxIndex = Math.max(maxIndex, chunk.index)
        if (chunk.type === 'usage') usage = chunk.usage
        else if (chunk.type === 'finish') finish = chunk
        else yield chunk
      }
      const reply = textFromChunks(observed)
      if (finish?.reason.kind !== 'stop' || /<UpdateVariable(?:variable)?>/iu.test(reply)) {
        if (usage !== undefined) yield { type: 'usage', usage }
        if (finish !== undefined) yield finish
        return
      }
      try {
        const supplemental = await requestSupplement(ctx, options, current.statData, rules, reply)
        const normalized = supplemental.text === undefined
          ? undefined
          : normalizeMvuSupplement(current.statData, supplemental.text)
        if (normalized !== undefined) {
          const index = maxIndex + 1
          const text = `\n\n${normalized}`
          yield { type: 'block-start', index, blockType: 'text' }
          yield { type: 'text-delta', index, text }
          yield { type: 'block-end', index, block: { type: 'text', text } }
          usage = addUsage(usage, supplemental.usage)
          finish = { type: 'finish', reason: finish.reason }
        }
      } catch (error: unknown) {
        ctx.logger.warn(`agent-rp: MVU supplement failed: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (usage !== undefined) yield { type: 'usage', usage }
      if (finish !== undefined) yield finish
    })()
  }, { global: true })
}
