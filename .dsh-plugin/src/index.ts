/** Host half of the local single-package Roleplay delivery probe. */

import { randomInt } from 'node:crypto'
import type { Context } from 'cordis'
import type { AgentSetup } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-setup'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import RoleplayService from './runtime/index.ts'
import type { RoleplayActorId, RoleplaySeed } from './runtime/index.ts'
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
  standardWerewolfRoleIn,
  standardWerewolfRoleLabel,
} from './werewolf/werewolf.ts'

/** Cordis plugin identity. */
export const name = 'dsh-roleplay-portable-spike'
/** Base Host services required by the bundled runtime. */
export const inject = ['systemPrompt', 'tools']

function persona(humanSeat: RoleplayActorId, seed: RoleplaySeed): string {
  const number = /^seat-(\d+)$/u.exec(humanSeat)?.[1]
  if (number === undefined) throw new Error(`invalid standard Werewolf human seat ${JSON.stringify(humanSeat)}`)
  const role = standardWerewolfRoleLabel(standardWerewolfRoleIn(seed, humanSeat))
  return `你负责主持一局标准十二人狼人杀。真人玩家是 ${number} 号，身份是${role}。
每次玩家输入只推进一个连贯阶段；绝不能替真人编造、替换或补全行动。
夜间、警长报名和警长投票由专用阶段协调器处理；真人拥有主动技能时，只能采用页面明确提交的选择。
其他非真人行动来自全新的 Character 咨询。
只提交 resolver 接受的行动，只叙述真人观察者可见的事实，并使用自然的简体中文。`
}

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
        proposalProvider: 'spawn',
        maxCorrectionAttempts: 1,
      })
      agentCtx.tools.restrict({ allow: [] })
      agentCtx.systemPrompt.section({
        name: 'deployment:persona',
        order: 0,
        text: persona(humanActorId, seed),
      })
      installStandardWerewolfCoordinator(agentCtx, webCtx.subagents, 'spawn', {
        decisionTimeoutMs: DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS,
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
