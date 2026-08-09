/** Shared validation for the model-facing roleplay commit protocol. @module @deepseek-ai/dsh-roleplay/protocol */

import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { RoleplayError } from './error.ts'

function invalidRoleplayCommitResponse(): never {
  throw new RoleplayError(
    'a committing assistant message must contain exactly one roleplay_commit call, made directly, '
      + 'and no other visible content',
    'ROLEPLAY_INVALID_RESPONSE',
  )
}

/**
 * Require one direct commit call while permitting provider reasoning that is not player-visible.
 * @param blocks - complete assistant response content.
 * @param callId - causal tool call id that must occur exactly once.
 * @param toolName - commit tool name that must match the causal call.
 */
export function assertRoleplayCommitResponse(
  blocks: readonly ContentBlock[],
  callId: string,
  toolName: string,
): void {
  let matchingCall = false
  for (const block of blocks) {
    if (block.type === 'reasoning') continue
    if (block.type === 'tool-call'
      && !matchingCall
      && block.id === callId
      && block.name === toolName) {
      matchingCall = true
      continue
    }
    invalidRoleplayCommitResponse()
  }
  if (!matchingCall) invalidRoleplayCommitResponse()
}
