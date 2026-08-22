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
  normalizeChoiceSupplement,
  normalizeMvuSupplement,
  readCurrentSessionMvuState,
  renderChoiceInstructions,
  renderMvuUpdateInstructions,
} from './mvu.ts'
import type { RoleplayTurnPlan } from './roleplay-turn-plan.ts'

/** A prepared turn explicitly opts MVU into settlement only through its runtime modules and state reads. */
export function roleplayMvuSettlementEnabled(plan: RoleplayTurnPlan | undefined): boolean {
  if (plan === undefined) return true
  return plan.runtime.modules.some(module => module.id === 'adapter:mvu' && module.phases.includes('settle'))
    && plan.stateReads.some(state => state.id === 'state:mvu')
}

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
  mvuRules: string | undefined,
  choiceRules: string | undefined,
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
          mvuRules ?? 'Not requested.',
          '</card_mvu_rules>',
          '<card_choice_rules>',
          choiceRules ?? 'Not requested.',
          '</card_choice_rules>',
          'Complete only the requested missing structures. If card_mvu_rules is requested, return one complete <UpdateVariable> block; use an empty JSONPatch array when no field changed. If card_choice_rules is requested, return exactly one complete set of <①> through <⑩> tags. Follow the corresponding card rules. Do not continue, summarize, or rewrite the story. Do not add headings or code fences.',
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
  planForAgent: (agent: Agent) => RoleplayTurnPlan | undefined = () => undefined,
): void {
  ctx.on('llm/stream', (options, next) => {
    const agent = options.sessionId === undefined ? undefined : agentForSession(String(options.sessionId))
    if (agent === undefined) return next()
    if (!roleplayMvuSettlementEnabled(planForAgent(agent))) return next()
    const active = readActiveSessionCharacter(agent.session.events)
    if (active === undefined) return next()
    const card = cardFromImportMeta(active.meta)
    const current = readCurrentSessionMvuState(card, agent.session)
    if (current === undefined) return next()
    const mvuRules = renderMvuUpdateInstructions(card, current.statData)
    const choiceRules = renderChoiceInstructions(card)
    if (mvuRules === undefined && choiceRules === undefined) return next()

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
      const missingMvu = mvuRules !== undefined && !/<UpdateVariable(?:variable)?>/iu.test(reply)
      const missingChoices = choiceRules !== undefined && normalizeChoiceSupplement(reply) === undefined
      if (finish?.reason.kind !== 'stop' || (!missingMvu && !missingChoices)) {
        if (usage !== undefined) yield { type: 'usage', usage }
        if (finish !== undefined) yield finish
        return
      }
      try {
        const supplemental = await requestSupplement(
          ctx,
          options,
          current.statData,
          missingMvu ? mvuRules : undefined,
          missingChoices ? choiceRules : undefined,
          reply,
        )
        const additions = supplemental.text === undefined ? [] : [
          ...(missingMvu ? [normalizeMvuSupplement(current.statData, supplemental.text)] : []),
          ...(missingChoices ? [normalizeChoiceSupplement(supplemental.text)] : []),
        ].filter((value): value is string => value !== undefined)
        if (additions.length > 0) {
          const index = maxIndex + 1
          const text = `\n\n${additions.join('\n\n')}`
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
