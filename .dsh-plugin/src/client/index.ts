/**
 * Browser Roleplay view: renders one host-computed observer-safe projection
 * and sends only presenter-supplied prompts, commands, or explicit player text.
 */
import type { Context } from 'cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '../runtime/client.ts'
import { RoleplayView } from './RoleplayView.tsx'

/** Player-input face bound to the session-scoped conversation service. */
export interface RoleplayViewInjected {
  /**
   * Create and open a fresh Session, then archive the superseded source Session.
   * @returns completion after the new Session is opened and the old one is hidden recoverably.
   */
  startScene: () => Promise<void>
  /**
   * Queue one exact presenter-owned or explicit player prompt.
   * @param prompt - presenter-supplied or explicit player text.
   * @returns completion after host admission.
   */
  sendPrompt: (prompt: string) => Promise<void>
  /**
   * Execute one exact presenter-owned slash command without a model turn.
   * @param line - complete presenter-supplied command line.
   * @returns completion after command settlement.
   * @throws a player-safe retry diagnostic when Host admission fails or the action expired.
   */
  runCommand: (line: string) => Promise<void>
}

/** Required services: slot ownership, session and Workspace addressing, and prompt admission. */
export const inject = ['slots', 'sessions', 'workspaces', 'conversation']

/**
 * Register the generic Roleplay view before ordinary chat in the tab order.
 * @param ctx - browser root context.
 */
export function apply(ctx: Context): void {
  ctx.slots.register({
    name: 'conversation.view',
    id: 'roleplay',
    order: -10,
    label: '角色扮演',
    inject: (sessionId: SessionId): RoleplayViewInjected => {
      const scoped = ctx.sessions.scope(sessionId)
      if (scoped === undefined) {
        throw new Error(`ui-roleplay: session ${JSON.stringify(sessionId)} resolved no scope`)
      }
      const conversation: IConversation | undefined = scoped.get('conversation')
      if (conversation === undefined) {
        throw new Error('ui-roleplay: conversation service unavailable through the session scope')
      }
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-roleplay: session ${JSON.stringify(sessionId)} resolved no binding`)
      }
      return {
        startScene: async () => {
          await ctx.workspaces.startFreshSession()
          await ctx.workspaces.archiveSession(sessionId)
        },
        sendPrompt: prompt => conversation.send(prompt),
        runCommand: async (line) => {
          const result = await session.command(line)
          if (!result.ok) {
            throw new Error('本轮未完成，请重试')
          }
          if (!result.value.matched) {
            throw new Error('当前行动已失效，请刷新页面后重试。')
          }
        },
      }
    },
  }, RoleplayView)
}
