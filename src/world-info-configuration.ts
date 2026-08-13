/** Host adapter for session-owned World Info management. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'
import { readActiveSessionWorldInfos } from './import/session-world-info.ts'
import {
  configureWorldInfo,
  encodeWorldInfoConfiguration,
  parseWorldInfoConfigurationRequest,
  readWorldInfoConfiguration,
  type SessionLorebookSource,
} from './world-info-configuration-core.ts'

/** Resolve all imported books in their prompt order. */
export function readSessionLorebookSources(agent: Agent): readonly SessionLorebookSource[] {
  const active = readActiveSessionCharacter(agent.session.events)
  const card = active === undefined ? undefined : cardFromImportMeta(active.meta)
  return [
    ...(card?.lorebook === undefined || active === undefined ? [] : [{
      id: `character:${active.result.sourceAttachmentId}`,
      name: card.lorebook.name?.trim() || `${card.nickname?.trim() || card.name}的世界书`,
      source: 'character' as const,
      lorebook: card.lorebook,
      degradations: card.degradations.filter(value => value.startsWith('lorebook-')),
    }]),
    ...readActiveSessionWorldInfos(agent.session.events).map(value => ({
      id: `standalone:${value.result.sourceAttachmentId}`,
      name: value.result.name,
      source: 'standalone' as const,
      lorebook: value.worldInfo.lorebook,
      degradations: value.result.degradations,
    })),
  ]
}

/** Execute one World Info manager mutation and persist its complete overlay snapshot. */
export function executeWorldInfoConfiguration(invocation: {
  readonly agent: Agent
  readonly rawInput: string
}): { readonly kind: 'success'; readonly text: string } {
  const current = readWorldInfoConfiguration(invocation.agent.session.events)
  const next = configureWorldInfo(
    current,
    parseWorldInfoConfigurationRequest(invocation.rawInput),
    readSessionLorebookSources(invocation.agent),
  )
  return { kind: 'success', text: encodeWorldInfoConfiguration(next) }
}
