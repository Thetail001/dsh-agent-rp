/** Tavern Helper preflight adapters for the built-in Character and preset libraries. */

import type { CharacterLibrary } from './character-library.ts'
import type { PresetLibrary } from './preset-library.ts'
import {
  CHARACTER_LIBRARY_ROLEPLAY_PROVIDER_ID,
  PRESET_LIBRARY_ROLEPLAY_PROVIDER_ID,
} from './roleplay-resource-library-ids.ts'
import type { TavernResourcePreflightContributor } from './tavern-resource-preflight.ts'

function libraryId(resourceId: string, prefix: string): string {
  if (!resourceId.startsWith(prefix) || resourceId.length === prefix.length) {
    throw new Error(`资源引用 ${JSON.stringify(resourceId)} 不属于当前资源库`)
  }
  return resourceId.slice(prefix.length)
}

/** Keep source-format ids and library reads inside the current Tavern input adapters. */
export function tavernResourceLibraryPreflightContributors(libraries: {
  readonly characters: CharacterLibrary
  readonly presets: PresetLibrary
}): readonly TavernResourcePreflightContributor[] {
  return [{
    providerId: CHARACTER_LIBRARY_ROLEPLAY_PROVIDER_ID,
    resolve: input => {
      const ownerId = libraryId(input.selection.id, 'character:library:')
      return {
        scope: 'character',
        ownerId,
        scripts: libraries.characters.resolve(ownerId).card.frontend.tavernHelperScripts,
      }
    },
  }, {
    providerId: PRESET_LIBRARY_ROLEPLAY_PROVIDER_ID,
    resolve: input => {
      const ownerId = libraryId(input.selection.id, 'preset:library:')
      return {
        scope: 'preset',
        ownerId,
        scripts: libraries.presets.get(ownerId).preset.tavernHelperScripts ?? [],
      }
    },
  }]
}
