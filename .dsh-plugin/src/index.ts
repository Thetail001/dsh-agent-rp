/** Host half of the local single-package Roleplay delivery probe. */

import { randomInt } from 'node:crypto'
import type { Context } from 'cordis'
import type { AgentSetup } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-setup'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import RoleplayService from './runtime/index.ts'
import type { RoleplayActorId } from './runtime/index.ts'
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

/**
 * Install the generic runtime and register standard Werewolf setup for Web-owned Agents.
 * Headless compositions receive the runtime without a scenario because they omit the application setup registry.
 * @param ctx - settled Web Host context.
 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(RoleplayService)
  const roleplay = ctx.get('roleplay')
  if (roleplay === undefined) throw new Error('portable Roleplay probe loaded without its bundled runtime')
  for (const resolver of STANDARD_WEREWOLF_RESOLVERS) {
    ctx.effect(() => roleplay.registerResolver(resolver))
  }
  ctx.effect(() => roleplay.registerPresenter(STANDARD_WEREWOLF_PRESENTER))

  ctx.inject(['agentSetups', 'roleplay', 'subagents'], (webCtx) => {
    let previousHumanActorId: RoleplayActorId | undefined
    const compose: AgentSetup = (agentCtx) => {
      const parent = agentCtx.agent
      if (parent === undefined) throw new Error('portable standard Werewolf setup requires an Agent scope')
      const recordedSeed = parent.session.events.find(event => event.type === 'rp/seed')
      const recordedObserver = parent.session.events.find(event => event.type === 'rp/observer')
      const humanActorId = recordedObserver?.type === 'rp/observer'
        ? humanActorForObserver(recordedObserver.data.observerId)
        : humanActorForSession(String(parent.id), previousHumanActorId)
      previousHumanActorId = humanActorId
      const seed = recordedSeed?.type === 'rp/seed'
        ? recordedSeed.data
        : createShuffledStandardWerewolfSeed(upperExclusive => randomInt(upperExclusive))
      const setup = webCtx.roleplay.setup({
        observerId: observerOf(humanActorId),
        seed,
        applicationOnly: true,
      })
      agentCtx.tools.restrict({ allow: [] })
      agentCtx.systemPrompt.section({
        name: 'deployment:persona',
        order: 0,
        text: APPLICATION_HANDOFF_INSTRUCTION,
      })
      installStandardWerewolfCoordinator(agentCtx, webCtx.subagents, 'spawn', {
        decisionTimeoutMs: DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS,
        applicationOnly: true,
        humanActorId,
      })
      return setup(agentCtx)
    }
    webCtx.effect(
      () => webCtx.agentSetups.register(compose),
      'portable Roleplay: pre-publication standard Werewolf setup',
    )
  })
}
