/** Browser-side assembly of current library choices into source-neutral experience requests. */

import type { SessionPersonaSnapshot } from '../persona-library-protocol.ts'
import {
  characterLibraryRoleplayResourceId,
  presetLibraryRoleplayResourceId,
  worldInfoLibraryRoleplayResourceId,
} from '../roleplay-resource-library-ids.ts'
import type { RoleplayExperienceSessionLaunchRequest } from '../session-launch-protocol.ts'

export function characterExperienceLaunchRequest(input: {
  readonly sourceSessionId: string
  readonly characterId: string
  readonly greetingIndex: number
  readonly persona?: SessionPersonaSnapshot
  readonly presetId?: string
  readonly worldInfoIds: readonly string[]
}): RoleplayExperienceSessionLaunchRequest {
  if (!Number.isSafeInteger(input.greetingIndex) || input.greetingIndex < 0) {
    throw new Error('角色开场序号无效')
  }
  return {
    format: 0,
    sourceSessionId: input.sourceSessionId,
    kind: 'experience',
    mode: 'character',
    actor: {
      kind: 'actor',
      id: characterLibraryRoleplayResourceId(input.characterId),
      variant: `greeting:${input.greetingIndex}`,
    },
    ...(input.persona === undefined
      ? {}
      : { participant: { kind: 'persona' as const, id: input.persona.id } }),
    worlds: input.worldInfoIds.map(id => ({
      kind: 'world' as const,
      id: worldInfoLibraryRoleplayResourceId(id),
    })),
    ...(input.presetId === undefined
      ? {}
      : { promptPolicy: { kind: 'prompt-policy' as const, id: presetLibraryRoleplayResourceId(input.presetId) } }),
  }
}

export function sceneExperienceLaunchRequest(input: {
  readonly sourceSessionId: string
  readonly primaryWorldInfoId: string
  readonly persona?: SessionPersonaSnapshot
  readonly presetId?: string
  readonly supportingWorldInfoIds: readonly string[]
}): RoleplayExperienceSessionLaunchRequest {
  return {
    format: 0,
    sourceSessionId: input.sourceSessionId,
    kind: 'experience',
    mode: 'scene',
    ...(input.persona === undefined
      ? {}
      : { participant: { kind: 'persona' as const, id: input.persona.id } }),
    worlds: [input.primaryWorldInfoId, ...input.supportingWorldInfoIds].map(id => ({
      kind: 'world' as const,
      id: worldInfoLibraryRoleplayResourceId(id),
    })),
    ...(input.presetId === undefined
      ? {}
      : { promptPolicy: { kind: 'prompt-policy' as const, id: presetLibraryRoleplayResourceId(input.presetId) } }),
  }
}
