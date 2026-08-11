/** Host half of the local single-package Roleplay delivery probe. */

import type { Context } from 'cordis'
import RoleplayService from './runtime/index.ts'
import { STANDARD_WEREWOLF_PRESENTER } from './werewolf/werewolf-presentation.ts'
import { STANDARD_WEREWOLF_RESOLVERS } from './werewolf/werewolf-resolvers.ts'

/** Cordis plugin identity. */
export const name = 'dsh-roleplay-portable-spike'
/** Base Host services required by the bundled runtime. */
export const inject = ['systemPrompt', 'tools']

/**
 * Install the generic Roleplay runtime and standard Werewolf presentation data.
 * This probe deliberately does not create, resume, or convert any Agent.
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
}
