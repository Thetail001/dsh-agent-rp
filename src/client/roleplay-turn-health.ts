/** Same-origin client for content-free Host turn lifecycle health. */

import {
  AGENT_RP_TURN_HEALTH_PATH,
  parseAgentRpTurnHealthDiagnostic,
  type AgentRpTurnHealthDiagnostic,
} from '../roleplay-turn-health-protocol.ts'

/** Read one mounted Roleplay Session without sending or receiving content-bearing fields. */
export async function loadAgentRpTurnHealth(
  sessionId: string,
  signal?: AbortSignal,
): Promise<AgentRpTurnHealthDiagnostic> {
  const response = await fetch(`${AGENT_RP_TURN_HEALTH_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: { accept: 'application/json' },
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) throw new Error(`Agent RP turn health request failed (${String(response.status)})`)
  let value: unknown
  try {
    value = await response.json()
  } catch (error: unknown) {
    throw new Error('Agent RP turn health response is not valid JSON', { cause: error })
  }
  return parseAgentRpTurnHealthDiagnostic(value)
}
