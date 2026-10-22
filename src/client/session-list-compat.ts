/** Browser-only helpers for DSH Session-list compatibility. */

import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'

/**
 * Resolve the Session the browser currently shows.
 *
 * DSH 0.2.x removed `SessionListState.current`; the visible Session is now
 * identified by the `mainView` retain account that the renderer's Provider
 * holds, which is the same rule the official Workspace browser and the
 * `ui-session` main-source publisher use. Reading it from the list snapshot
 * keeps root-scope slots (which have no Session scope) in step with selection
 * changes, because retention changes arrive as ordinary list-snapshot updates.
 */
export function mainSessionId(list: SessionListState): SessionId | undefined {
  return Object.values(list.byId).find(summary => (summary.retainedBy.mainView ?? 0) > 0)?.id
}
