/** Browser client for Agent RP's stable model-free command endpoint. */

import {
  AGENT_RP_COMMAND_PATH,
  type AgentRpCommandResponse,
} from '../agent-rp-command-protocol.ts'

/** Execute one allowlisted Agent RP command without relying on DSH's evolving Client command API. */
export async function executeAgentRpCommand(sessionId: string, line: string): Promise<AgentRpCommandResponse> {
  const response = await fetch(AGENT_RP_COMMAND_PATH, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ format: 0, sessionId, line }),
  })
  const text = await response.text()
  let value: Partial<AgentRpCommandResponse> & { readonly error?: string }
  try {
    value = JSON.parse(text) as typeof value
  } catch {
    throw new Error(`Agent RP 命令响应无法识别（${response.status}）`)
  }
  if (!response.ok) throw new Error(value.error ?? `Agent RP 命令失败（${response.status}）`)
  if (value.format !== 0 || typeof value.matched !== 'boolean'
    || (value.matched && typeof value.commandId !== 'string')) {
    throw new Error('Agent RP 命令响应无效')
  }
  return value as AgentRpCommandResponse
}
