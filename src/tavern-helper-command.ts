/** Host adapter for isolated Tavern Helper variable writes. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'
import { readActiveSessionPreset } from './import/session-preset.ts'
import { presetTavernHelperScripts } from './import/sillytavern-preset.ts'
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
  const next = applyTavernHelperMutation(initialized, parseTavernHelperMutationRequest(invocation.rawInput))
  return { kind: 'success', text: encodeTavernHelperState(next) }
}
