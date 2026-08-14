/** Host adapter for isolated Tavern Helper variable writes. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'
import { readActiveSessionPreset } from './import/session-preset.ts'
import { presetTavernHelperScripts } from './import/sillytavern-preset.ts'
import { executeTavernChatMutation } from './tavern-chat.ts'
import {
  applyTavernHelperMutation,
  encodeTavernHelperState,
  initializeTavernHelperPresetState,
  initializeTavernHelperState,
  parseTavernHelperMutationRequest,
  readTavernHelperState,
} from './tavern-helper.ts'

/** Validate and persist one script-authored variable replacement. */
export function executeTavernHelperMutation(invocation: {
  readonly agent: Agent
  readonly rawInput: string
}): { readonly kind: 'success'; readonly text: string } {
  const events = invocation.agent.session.events
  const active = readActiveSessionCharacter(events)
  if (active === undefined) throw new Error('this roleplay Session has no imported Character Card')
  const card = cardFromImportMeta(active.meta)
  const previous = readTavernHelperState(events)
  const characterState = initializeTavernHelperState(card.frontend, active.result.sourceAttachmentId, previous)
  const preset = readActiveSessionPreset(events)
  const initialized = preset === undefined
    ? characterState
    : initializeTavernHelperPresetState(
        characterState,
        presetTavernHelperScripts(preset.preset),
        preset.preset.tavernHelperVariables ?? {},
        preset.result.sourceAttachmentId,
      )
  const request = parseTavernHelperMutationRequest(invocation.rawInput)
  const chat = 'operation' in request && (request.operation === 'set-chat-messages'
    || request.operation === 'create-chat-messages' || request.operation === 'delete-chat-messages'
    || request.operation === 'rotate-chat-messages')
    ? executeTavernChatMutation(invocation.agent, request)
    : undefined
  const mutated = applyTavernHelperMutation(initialized, request)
  const next = chat?.messageVariables === undefined
    ? mutated
    : { ...mutated, scopes: { ...mutated.scopes, message: chat.messageVariables } }
  return { kind: 'success', text: encodeTavernHelperState(next) }
}
