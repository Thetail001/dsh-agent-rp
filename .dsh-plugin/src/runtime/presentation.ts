/** Replay-safe player presentation derived only from accepted roleplay commits. @module @deepseek-ai/dsh-roleplay/presentation */

import { deepFreeze } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { validateRoleplayHistory } from './log.ts'
import type { RoleplayNarrationEntry } from './types.ts'

/**
 * Project a Session prefix into committed player narration without retaining draft or world-transition fields.
 * @param events - complete Session prefix in durable order.
 * @returns immutable entries keyed by their canonical Storyworld revision.
 * @throws {RoleplayError} when the roleplay history is invalid.
 */
export function projectRoleplayNarration(events: readonly SessionEvent[]): readonly RoleplayNarrationEntry[] {
  validateRoleplayHistory(events)
  return deepFreeze(events.flatMap((event) => {
    if (event.type !== 'user/message' || event.data.source.kind !== 'roleplay') return []
    const { revision, narration } = event.data.source.commit
    return [{ revision, text: narration }]
  }))
}
