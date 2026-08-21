/** Resolve the same stable permission owner that the migrated Session will project at runtime. */

import { DEFAULT_AGENT_RP_CHARACTER_NAME } from '../projection-types.ts'

export function chatMigrationPermissionOwnerId(input: {
  readonly characterId?: string
  readonly chatCharacterName?: string
}): string {
  const characterId = input.characterId?.trim()
  if (characterId !== undefined && characterId !== '') return characterId
  const characterName = input.chatCharacterName?.trim()
  return characterName === undefined || characterName === '' ? DEFAULT_AGENT_RP_CHARACTER_NAME : characterName
}
