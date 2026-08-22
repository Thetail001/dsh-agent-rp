/** Replay-safe admission for Agent RP events owned outside the DSH repository. */

import type {
  Session,
  SessionEvent,
  SessionEventMap,
  SessionEventType,
} from '@deepseek-ai/dsh-session'

interface IgnorableSession extends Session {
  appendIgnorable<T extends SessionEventType>(
    type: T,
    data: SessionEventMap[T],
  ): SessionEvent<T> & { readonly ignorable: true }
}

/** Whether this Host can persist plugin-owned events without poisoning future replay. */
export function supportsAgentRpSessionEvents(session: Session): session is IgnorableSession {
  return typeof (session as Partial<IgnorableSession>).appendIgnorable === 'function'
}

/**
 * Append one plugin-owned record only through the Host's replay-safe event seam.
 * `ignorable` lets a Host without Agent RP skip its private vocabulary; the
 * event remains in the log and Agent RP still folds it when the plugin exists.
 */
export function appendAgentRpSessionEvent<T extends SessionEventType>(
  session: Session,
  type: T,
  data: SessionEventMap[T],
): SessionEvent<T> & { readonly ignorable: true } {
  if (!String(type).startsWith('agent-rp/')) {
    throw new Error(`Agent RP cannot own Session event ${JSON.stringify(type)}`)
  }
  if (!supportsAgentRpSessionEvents(session)) {
    throw new Error('当前 DSH Host 缺少安全的插件事件写入能力；已拒绝写入，避免重启后会话无法加载')
  }
  return session.appendIgnorable(type, data)
}
