/** Durable in-place content edits over existing dialogue messages, applied at derivation time. */

import type { Context } from '@deepseek-ai/cordis'
import { freezeMessage, type ContentBlock, type Message } from '@deepseek-ai/dsh-llm'
import {
  SessionSeq,
  type Session,
  type SessionEvent,
  type SessionMessageProjection,
} from '@deepseek-ai/dsh-session'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'

/**
 * One tavern-script content edit batch keyed by target event seq.
 * 0.2.1 移除了 assistant/message 的 surface replace：assistant 禁带
 * sourceEventSeqs，而 replace 又必须引用全部被覆盖节点，数学上不可能。
 * 楼层内容编辑因此改走 messageProjection——日志本体不动，派生消息层生效。
 * 宿主聊天列表直接读事件日志，仍会显示编辑前文本（平台限制）；
 * RP 客户端投影与模型请求都读派生消息，看到编辑后文本。
 */
export interface MessageEditRecord {
  readonly format: 0
  readonly edits: readonly {
    readonly seq: number
    readonly content: readonly ContentBlock[]
  }[]
}

declare module '@deepseek-ai/dsh-session' {
  interface PluginRecordMap {
    /** In-place tavern floor edits rewriting existing messages at derivation time. */
    'plugin:agent-rp/message-edit': MessageEditRecord
  }
  /** 镜像进 SessionEventMap 仅为读路径判别收窄；写入只走 appendPluginRecord。 */
  interface SessionEventMap {
    /** In-place tavern floor edits rewriting existing messages at derivation time. */
    'plugin:agent-rp/message-edit': MessageEditRecord
  }
}

/**
 * Pure interpreter turning message-edit records into derived-message rewrites.
 * Rebuilt from the durable original events (never from earlier projections),
 * so replay after restart or fork produces the same derived history.
 */
export const messageEditProjection: SessionMessageProjection<'plugin:agent-rp/message-edit'> = {
  type: 'plugin:agent-rp/message-edit',
  project(event, context) {
    const updates = new Map<SessionSeq, Message>()
    const base = Number(context.baseSeq)
    for (const edit of event.data.edits) {
      const original = context.events[edit.seq - base]
      if (original === undefined) {
        // Fork/restore 的重放窗口不含目标事件时，该节点也不在本窗口的表面上。
        if (edit.seq < base) continue
        throw new Error('楼层编辑记录引用了不存在的对话消息')
      }
      const message = original.type === 'user/message' ? original.data
        : original.type === 'assistant/message' ? original.data.message
          : undefined
      if (message === undefined) throw new Error('楼层编辑记录引用了不存在的对话消息')
      updates.set(SessionSeq(edit.seq), freezeMessage({
        ...message,
        content: edit.content,
      } as Message))
    }
    return updates
  },
}

/**
 * Register the message-edit projection for all future session create/restore/fork.
 *
 * A real Host always provides the Session store; a minimal host (or a preview
 * harness) may not, and without Sessions there is nothing to project anyway, so
 * a missing service skips registration instead of failing plugin load.
 */
export function registerMessageEditProjection(ctx: Context): void {
  ctx.get('sessions')?.registerMessageProjection(messageEditProjection)
}

/**
 * Latest edited content per target seq from the durable log.
 * prompt-regex 以它为改写基线（正则作用于编辑后文本），
 * prompt.ts 以它为 pre-regex 还原（lorebook 扫描编辑后文本）。
 */
export function messageEditContents(events: readonly SessionEvent[]): ReadonlyMap<number, readonly ContentBlock[]> {
  const edits = new Map<number, readonly ContentBlock[]>()
  for (const event of events) {
    if (event.type !== 'plugin:agent-rp/message-edit') continue
    for (const edit of event.data.edits) edits.set(edit.seq, edit.content)
  }
  return edits
}

/** Append one single-floor content edit as a projection record. */
export function appendMessageEdit(session: Session, seq: number, content: readonly ContentBlock[]): void {
  appendAgentRpSessionEvent(session, 'plugin:agent-rp/message-edit', { format: 0, edits: [{ seq, content }] })
}
