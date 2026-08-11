/**
 * Browser Roleplay view: renders one host-computed observer-safe projection
 * and sends only presenter-supplied prompts, commands, or explicit player text.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { EngineStoreHandle, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatStoreState, IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useEffect } from 'react'
import type {} from '../runtime/client.ts'
import { RoleplayView } from './RoleplayView.tsx'

/** Shared conversation-store action used to make Roleplay the initial view. */
interface RoleplayDefaultViewProps {
  readonly actions: {
    setView: (view: string) => void
  }
}

/** Narrow action declaration needed from the conversation package's shared store. */
// The rc.2 client runtime does not re-export its ActionsDecl constraint; this
// erased index reproduces that boundary while the named action stays exact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RoleplayViewStoreActions = Record<string, (draft: ChatStoreState, ...params: any[]) => void> & {
  setView: (draft: ChatStoreState, view: string) => void
}

/** Select Roleplay once when a Session first exposes its conversation chrome. */
function RoleplayDefaultView({ actions }: RoleplayDefaultViewProps): null {
  useEffect(() => {
    actions.setView('roleplay')
  }, [actions])
  return null
}

/** Player-input face bound to the session-scoped conversation service. */
export interface RoleplayViewInjected {
  /**
   * Open a fresh game through the shared Workspace flow, then archive the superseded Session.
   * @returns completion after the Workspace-owned transition is requested and the old Session is hidden recoverably.
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

/** Root services required before the deferred Roleplay view registration can be installed. */
export const inject = ['slots', 'sessions', 'workspaces']

/**
 * Register the generic Roleplay view before ordinary chat in the tab order.
 * @param ctx - browser root context.
 */
export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.view', function* () {
    const conversationSession = ctx.slots.entries('conversation.session')[0]
    if (conversationSession?.store === undefined || typeof conversationSession.store === 'function') {
      throw new Error('ui-roleplay: conversation Session shared store unavailable')
    }
    const conversationStore = conversationSession.store as EngineStoreHandle<
      ChatStoreState,
      RoleplayViewStoreActions
    >

    yield ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'roleplay-default-view',
      order: -100,
      store: conversationStore,
    }, RoleplayDefaultView))

    yield ctx.slots.register({
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
            const workspace = ctx.workspaces.list.getSnapshot().items
              .find(candidate => candidate.sessionIds.includes(sessionId))
            if (workspace === undefined) {
              ctx.workspaces.startSession()
              await ctx.workspaces.archiveSession(sessionId)
              return
            }
            const nextSessionId = await ctx.workspaces.connectWorkspace(workspace.workspaceId)
            ctx.sessions.open(nextSessionId)
            await ctx.workspaces.archiveSession(sessionId)
          },
          sendPrompt: prompt => conversation.send(prompt),
          runCommand: async (line) => {
            const result = await session.command(line)
            if (!result.ok) {
              throw new Error(result.error.message)
            }
            if (!result.value.matched) {
              throw new Error('当前行动已失效，请刷新页面后重试。')
            }
          },
        }
      },
    }, RoleplayView)
  })
}
