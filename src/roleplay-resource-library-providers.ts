/** Built-in library adapters for the source-neutral Roleplay resource catalog. */

import type { CharacterLibrary } from './character-library.ts'
import type { PersonaLibrary } from './persona-library.ts'
import type { PresetLibrary } from './preset-library.ts'
import type { RoleplayResourceProvider } from './roleplay-resource-catalog.ts'
import type { RoleplayResourceDescriptor } from './roleplay-resource-catalog-protocol.ts'
import type { WorldInfoLibrary } from './world-info-library.ts'

/** Exact opaque actor reference written by a library-backed Character Session seed. */
export function characterLibraryRoleplayResourceId(libraryId: string): string {
  return `character:library:${libraryId}`
}

/** Exact opaque prompt-policy reference written by a library-backed preset seed. */
export function presetLibraryRoleplayResourceId(libraryId: string): string {
  return `preset:library:${libraryId}`
}

/** Exact opaque world reference written by a library-backed World Info seed. */
export function worldInfoLibraryRoleplayResourceId(libraryId: string): string {
  return `standalone:library:${libraryId}`
}

function available(
  value: Omit<RoleplayResourceDescriptor, 'availability'>,
): RoleplayResourceDescriptor {
  return { ...value, availability: 'available' }
}

/** Publish the four current Host libraries without exposing any imported payload. */
export function roleplayLibraryResourceProviders(input: {
  readonly characters: CharacterLibrary
  readonly personas: PersonaLibrary
  readonly presets: PresetLibrary
  readonly worldInfos: WorldInfoLibrary
}): readonly RoleplayResourceProvider[] {
  return [{
    id: 'agent-rp:character-library',
    list: () => [
      ...input.characters.list('active'),
      ...input.characters.list('archived'),
    ].map(entry => ({
      id: characterLibraryRoleplayResourceId(entry.id),
      kind: 'actor' as const,
      name: entry.displayName,
      availability: entry.archived ? 'archived' as const : 'available' as const,
      updatedAt: entry.updatedAt,
    })),
  }, {
    id: 'agent-rp:persona-library',
    list: () => input.personas.list().map(entry => available({
      id: entry.id,
      kind: 'persona',
      name: entry.name,
      updatedAt: entry.updatedAt,
    })),
  }, {
    id: 'agent-rp:preset-library',
    list: () => input.presets.list().map(entry => available({
      id: presetLibraryRoleplayResourceId(entry.id),
      kind: 'prompt-policy',
      name: entry.name,
      updatedAt: entry.updatedAt,
    })),
  }, {
    id: 'agent-rp:world-info-library',
    list: () => input.worldInfos.list().map(entry => available({
      id: worldInfoLibraryRoleplayResourceId(entry.id),
      kind: 'world',
      name: entry.name,
    })),
  }]
}
