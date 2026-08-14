/** Model-free user correction and removal of persistent Roleplay memory. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandId } from '@deepseek-ai/dsh-commands'
import {
  encodeAgentRpMemoryCommandRecord,
  parseAgentRpMemoryCommandRequest,
  readAgentRpMemoryHistory,
} from './memory.ts'

/** Apply one private memory-manager request without invoking the character model. */
export function executeAgentRpMemoryCommand(invocation: {
  readonly commandId: CommandId
  readonly agent: Agent
  readonly rawInput: string
}): { readonly kind: 'success'; readonly text: string } {
  const request = parseAgentRpMemoryCommandRequest(invocation.rawInput)
  const source = invocation.agent.session.events.at(-1)
  if (source?.type !== 'command/run' || source.data.name !== 'rp-memory'
    || String(source.data.commandId) !== String(invocation.commandId)) {
    throw new Error('记忆操作命令不是当前 Session 事件')
  }
  const history = readAgentRpMemoryHistory(invocation.agent.session.events)
  if (!history.active.some(record => record.id === request.id)) {
    throw new Error('这条记忆已经被纠正或忘记，请刷新后再试')
  }
  return {
    kind: 'success',
    text: encodeAgentRpMemoryCommandRecord({ ...request, sourceEventSeq: source.seq }),
  }
}
