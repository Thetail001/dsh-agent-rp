/** Host half of the local single-package Roleplay delivery probe. */

import { randomInt } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import RoleplayService from './runtime/index.ts'
import type { RoleplayActorId } from './runtime/index.ts'
import { registerRoleplaySessionEventTypes } from './runtime/session-event-vocabulary.ts'
import {
  DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS,
  installStandardWerewolfCoordinator,
} from './werewolf/werewolf-coordinator.ts'
import { STANDARD_WEREWOLF_PRESENTER } from './werewolf/werewolf-presentation.ts'
import { STANDARD_WEREWOLF_RESOLVERS } from './werewolf/werewolf-resolvers.ts'
import {
  createShuffledStandardWerewolfSeed,
  humanActorForObserver,
  humanActorForSession,
  observerOf,
} from './werewolf/werewolf.ts'

/** Cordis plugin identity. */
export const name = 'dsh-roleplay-portable-spike'
/** Base Host services required by the bundled runtime. */
export const inject = ['systemPrompt', 'tools']

const APPLICATION_HANDOFF_INSTRUCTION = '这是由“角色扮演”页面驱动的标准十二人狼人杀。普通对话不得推进对局、调用游戏工具或询问玩家行动。收到开局消息时，只回复“对局已创建，请切换到角色扮演页面。”，然后结束本轮。'
const ROLEPLAY_SESSION_NOTICE = '狼人杀对局已创建'
const STRUCTURED_DECISION_MAX_TOKENS = 2_048
const PUBLIC_DISCUSSION_MAX_TOKENS = 2_048

/** Runtime budgets for the portable Roleplay benchmark. */
export interface Config {
  /** Full wall-clock window for one asynchronous decision wave. */
  decisionTimeoutMs?: number
  /** Output-token cap for constrained choices such as targets and ballots. */
  decisionMaxTokens?: number
  /** Adapter-owned effort for constrained choices. */
  decisionReasoningEffort?: string
  /** Output-token cap for public table speech. */
  discussionMaxTokens?: number
  /** Adapter-owned effort for public table speech. */
  discussionReasoningEffort?: string
}

/** Loader schema for portable Roleplay decision budgets. */
export const Config: z<Config> = z.object({
  decisionTimeoutMs: z.number().step(1).min(1).max(2_147_483_647)
    .default(DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS),
  decisionMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
    .default(STRUCTURED_DECISION_MAX_TOKENS),
  decisionReasoningEffort: z.string().default('off'),
  discussionMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
    .default(PUBLIC_DISCUSSION_MAX_TOKENS),
  discussionReasoningEffort: z.string().default('high'),
})

function reasoningEffortId(value: string): ReasoningEffortId {
  return value as ReasoningEffortId
}

/**
 * Install the generic runtime and attach standard Werewolf to top-level Agents.
 * @param ctx - settled Web Host context.
 */
export async function apply(ctx: Context, config: Config): Promise<void> {
  ctx.effect(() => registerRoleplaySessionEventTypes(KNOWN_SESSION_EVENT_TYPES))
  await ctx.plugin(RoleplayService)
  const roleplay = ctx.get('roleplay')
  if (roleplay === undefined) throw new Error('portable Roleplay probe loaded without its bundled runtime')
  for (const resolver of STANDARD_WEREWOLF_RESOLVERS) {
    ctx.effect(() => roleplay.registerResolver(resolver))
  }
  ctx.effect(() => roleplay.registerPresenter(STANDARD_WEREWOLF_PRESENTER))

  ctx.inject(['agents', 'roleplay', 'subagents'], (webCtx) => {
    let previousHumanActorId: RoleplayActorId | undefined
    webCtx.on('agent/created', ({ agent }) => {
      if (agent.session.header.origin === 'subagent') return
      const recordedSeed = agent.session.events.find(event => event.type === 'rp/seed')
      const recordedObserver = agent.session.events.find(event => event.type === 'rp/observer')
      const humanActorId = recordedObserver?.type === 'rp/observer'
        ? humanActorForObserver(recordedObserver.data.observerId)
        : humanActorForSession(String(agent.id), previousHumanActorId)
      previousHumanActorId = humanActorId
      const seed = recordedSeed?.type === 'rp/seed'
        ? recordedSeed.data
        : createShuffledStandardWerewolfSeed(upperExclusive => randomInt(upperExclusive))
      const setup = webCtx.roleplay.setup({
        observerId: observerOf(humanActorId),
        seed,
        applicationOnly: true,
      })
      agent.ctx.tools.restrict({ allow: [] })
      agent.ctx.systemPrompt.section({
        name: 'deployment:persona',
        order: 0,
        text: APPLICATION_HANDOFF_INSTRUCTION,
      })
      installStandardWerewolfCoordinator(agent.ctx, webCtx.subagents, 'spawn', {
        decisionTimeoutMs: config.decisionTimeoutMs ?? DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS,
        decisionMaxTokens: config.decisionMaxTokens ?? STRUCTURED_DECISION_MAX_TOKENS,
        decisionReasoningEffort: reasoningEffortId(config.decisionReasoningEffort ?? 'off'),
        discussionMaxTokens: config.discussionMaxTokens ?? PUBLIC_DISCUSSION_MAX_TOKENS,
        discussionReasoningEffort: reasoningEffortId(config.discussionReasoningEffort ?? 'high'),
        applicationOnly: true,
        humanActorId,
      })
      const commit = setup(agent.ctx)
      if (commit instanceof Promise) {
        throw new Error('portable standard Werewolf setup must remain synchronous')
      }
      commit?.commit()
      if (agent.session.surface.nodes.length === 0) {
        agent.session.append('user/message', createUserMessage({
          content: [{ type: 'text', text: ROLEPLAY_SESSION_NOTICE }],
          source: {
            kind: 'plugin',
            plugin: name,
            form: 'notice',
            summary: ROLEPLAY_SESSION_NOTICE,
          },
        }), { surfaceOp: 'append' })
      }
    })
  })
}
