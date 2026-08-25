/** Content-order checks used to decide whether a Roleplay tool owes another model step. */

import type { SessionEvent } from '@deepseek-ai/dsh-session'

/** Whether one exact tool call follows non-empty visible text in its assistant message. */
export function roleplayToolCallFollowsVisibleReply(
  events: readonly SessionEvent[],
  callId: string,
): boolean {
  const call = events.findLast(event => event.type === 'tool/call'
    && String(event.data.callId) === callId)
  if (call?.type !== 'tool/call') return false
  const assistant = events.findLast(event => event.seq < call.seq
    && event.type === 'assistant/message'
    && event.data.turn === call.data.turn
    && event.data.step === call.data.step
    && event.data.message.content.some(block => block.type === 'tool-call'
      && String(block.id) === callId))
  const content = assistant?.type === 'assistant/message' ? assistant.data.message.content : []
  const callIndex = content.findIndex(block => block.type === 'tool-call' && String(block.id) === callId)
  return callIndex > 0 && content.slice(0, callIndex)
    .some(block => block.type === 'text' && block.text.trim() !== '')
}
