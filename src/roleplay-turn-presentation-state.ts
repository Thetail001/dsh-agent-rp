/** Compatibility reader for generic and earlier adapter-shaped presentation state. */

import {
  type RoleplayPresentedState,
  type RoleplayTurnPresentation,
} from './roleplay-turn-presentation-types.ts'

/** Normalize presentation events written before generic state selections were introduced. */
export function normalizeRoleplayTurnPresentation(
  presentation: RoleplayTurnPresentation,
): RoleplayTurnPresentation {
  const rawState: unknown = presentation.state
  if (Array.isArray(rawState)) return presentation
  const legacy = typeof rawState === 'object' && rawState !== null
    ? rawState as { readonly mvuStateSeq?: unknown; readonly tavernStateSeq?: unknown; readonly tavernStatus?: unknown }
    : {}
  const state: RoleplayPresentedState[] = []
  if (Number.isSafeInteger(legacy.mvuStateSeq) && (legacy.mvuStateSeq as number) >= 0) {
    state.push({
      id: 'state:mvu',
      status: presentation.trigger.kind === 'settlement' ? 'settled' : 'attached',
      eventSeq: legacy.mvuStateSeq as number,
    })
  }
  const tavernStatus = legacy.tavernStatus === 'settled' || legacy.tavernStatus === 'pending'
    || legacy.tavernStatus === 'attached' ? legacy.tavernStatus : 'absent'
  state.push({
    id: 'state:tavern-helper',
    status: tavernStatus,
    ...(Number.isSafeInteger(legacy.tavernStateSeq) && (legacy.tavernStateSeq as number) >= 0
      ? { eventSeq: legacy.tavernStateSeq as number }
      : {}),
  })
  const legacyTrigger = presentation.trigger as unknown as {
    readonly kind: string
    readonly eventSeq: number
  }
  const trigger = legacyTrigger.kind === 'tavern-mutation'
    ? {
        kind: 'module-update' as const,
        eventSeq: legacyTrigger.eventSeq,
        moduleId: 'adapter:tavern-helper',
      }
    : presentation.trigger
  return { ...presentation, trigger, state }
}

/** Find one source-neutral state selection in a presentation snapshot. */
export function roleplayPresentedState(
  presentation: RoleplayTurnPresentation | undefined,
  stateId: string,
): RoleplayPresentedState | undefined {
  return presentation === undefined
    ? undefined
    : normalizeRoleplayTurnPresentation(presentation).state.find(state => state.id === stateId)
}
