/** Built-in library adapters for the source-neutral Roleplay resource catalog. */

import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { CharacterLibrary } from './character-library.ts'
import { createCharacterCardSessionSeed } from './import/character-card-seed.ts'
import type { FileAttachmentRef } from './import/session-character.ts'
import { createPresetSessionSeed } from './import/session-preset.ts'
import { appendWorldInfoLibrarySessionSeed } from './import/world-info-seed.ts'
import type { PersonaLibrary } from './persona-library.ts'
import type { PresetLibrary, PresetLibraryEntry } from './preset-library.ts'
import { substituteCardMacros } from './prompt.ts'
import type {
  RoleplayResourceMaterializationInput,
  RoleplayResourceProvider,
} from './roleplay-resource-catalog.ts'
import type { RoleplayResourceDescriptor } from './roleplay-resource-catalog-protocol.ts'
import {
  characterLibraryRoleplayResourceId,
  presetLibraryRoleplayResourceId,
  worldInfoLibraryRoleplayResourceId,
} from './roleplay-resource-library-ids.ts'
import type {} from './session-persona.ts'
import type { WorldInfoLibrary } from './world-info-library.ts'

export {
  characterLibraryRoleplayResourceId,
  presetLibraryRoleplayResourceId,
  worldInfoLibraryRoleplayResourceId,
} from './roleplay-resource-library-ids.ts'

function available(
  value: Omit<RoleplayResourceDescriptor, 'availability'>,
): RoleplayResourceDescriptor {
  return { ...value, availability: 'available' }
}

function boundedPreview(value: string): { readonly preview: string; readonly truncated: boolean } {
  return { preview: value.slice(0, 2000), truncated: value.length > 2000 }
}

function libraryId(resourceId: string, prefix: string): string {
  if (!resourceId.startsWith(prefix) || resourceId.length === prefix.length) {
    throw new Error(`资源引用 ${JSON.stringify(resourceId)} 不属于当前资源库`)
  }
  return resourceId.slice(prefix.length)
}

function noVariant(input: RoleplayResourceMaterializationInput): void {
  if (input.selection.variant !== undefined) {
    throw new Error(`${input.descriptor.name} 不支持资源变体 ${JSON.stringify(input.selection.variant)}`)
  }
}

function greetingIndex(input: RoleplayResourceMaterializationInput): number {
  if (input.selection.variant === undefined) return 0
  const match = /^greeting:(0|[1-9][0-9]{0,5})$/u.exec(input.selection.variant)
  if (match === null) throw new Error('角色开场变体必须使用 greeting:<序号>')
  return Number(match[1])
}

function characterAttachment(
  characterId: string,
  transport: 'png' | 'json' | 'charx',
  bytes: number,
  originalFilename: string,
  mediaType: string,
): FileAttachmentRef {
  const extension = transport === 'png' ? 'png' : transport === 'charx' ? 'charx' : 'json'
  return {
    kind: 'file',
    attachmentId: AttachmentId(`library:${characterId}`),
    bytes,
    name: new RegExp(`\\.${extension}$`, 'iu').test(originalFilename)
      ? originalFilename
      : `character.${extension}`,
    mediaType,
  }
}

function presetAttachment(entry: PresetLibraryEntry): FileAttachmentRef {
  return {
    kind: 'file',
    attachmentId: AttachmentId(`library:${entry.id}`),
    bytes: Buffer.byteLength(JSON.stringify(entry.preset), 'utf8'),
    name: 'preset.json',
    mediaType: 'application/json',
  }
}

/** Publish the four current Host libraries without exposing any imported payload. */
export function roleplayLibraryResourceProviders(libraries: {
  readonly characters: CharacterLibrary
  readonly personas: PersonaLibrary
  readonly presets: PresetLibrary
  readonly worldInfos: WorldInfoLibrary
}): readonly RoleplayResourceProvider[] {
  return [{
    id: 'agent-rp:character-library',
    list: () => [
      ...libraries.characters.list('active'),
      ...libraries.characters.list('archived'),
    ].map(entry => ({
      id: characterLibraryRoleplayResourceId(entry.id),
      kind: 'actor' as const,
      name: entry.displayName,
      availability: entry.archived ? 'archived' as const : 'available' as const,
      updatedAt: entry.updatedAt,
    })),
    inspect: descriptor => {
      const resolved = libraries.characters.resolve(libraryId(descriptor.id, 'character:library:'))
      return {
        kind: 'actor',
        openings: resolved.detail.greetings.slice(0, 1024).map((greeting, index) => ({
          id: `greeting:${index}`,
          label: index === 0 ? '默认开场' : `备选开场 ${index}`,
          ...boundedPreview(resolved.detail.renderedGreetings[index] ?? greeting),
        })),
      }
    },
    materialize: input => {
      if (input.events.length !== 0) throw new Error('角色资源必须是体验中的第一个日志快照')
      const id = libraryId(input.selection.id, 'character:library:')
      const resolved = libraries.characters.resolve(id)
      if (resolved.detail.archived) throw new Error('请先恢复这个角色，再开始体验')
      const index = greetingIndex(input)
      const greeting = resolved.detail.greetings[index]
      if (greeting === undefined) throw new Error(`角色卡没有第 ${index + 1} 条开场白`)
      const source = characterAttachment(
        id,
        resolved.transport.transport,
        resolved.source.bytes,
        resolved.source.originalFilename,
        resolved.source.mediaType,
      )
      return {
        events: createCharacterCardSessionSeed(
          resolved.card,
          source,
          index,
          substituteCardMacros(greeting, resolved.card, input.context.participantName).trim(),
          resolved.transport,
          input.context.participantName,
          undefined,
          id,
        ),
        title: resolved.detail.displayName,
      }
    },
  }, {
    id: 'agent-rp:persona-library',
    list: () => libraries.personas.list().map(entry => available({
      id: entry.id,
      kind: 'persona',
      name: entry.name,
      updatedAt: entry.updatedAt,
    })),
    inspect: descriptor => ({
      kind: 'persona',
      description: libraries.personas.get(descriptor.id).description,
    }),
    materialize: input => {
      noVariant(input)
      const persona = libraries.personas.get(input.selection.id)
      return {
        events: [...structuredClone(input.events), {
          type: 'agent-rp/persona-seed' as const,
          seq: input.events.length,
          time: Date.now(),
          data: {
            format: 0 as const,
            persona: { id: persona.id, name: persona.name, description: persona.description },
          },
          ignorable: true,
        }],
      }
    },
  }, {
    id: 'agent-rp:preset-library',
    list: () => libraries.presets.list().map(entry => available({
      id: presetLibraryRoleplayResourceId(entry.id),
      kind: 'prompt-policy',
      name: entry.name,
      updatedAt: entry.updatedAt,
    })),
    inspect: descriptor => {
      const preset = libraries.presets.get(libraryId(descriptor.id, 'preset:library:'))
      return {
        kind: 'prompt-policy',
        moduleCount: preset.promptCount,
        enabledModuleCount: preset.enabledCount,
      }
    },
    materialize: input => {
      noVariant(input)
      const preset = libraries.presets.get(libraryId(input.selection.id, 'preset:library:'))
      return {
        events: createPresetSessionSeed(input.events, preset.preset, presetAttachment(preset), preset.id),
      }
    },
  }, {
    id: 'agent-rp:world-info-library',
    list: () => libraries.worldInfos.list().map(entry => available({
      id: worldInfoLibraryRoleplayResourceId(entry.id),
      kind: 'world',
      name: entry.name,
    })),
    inspect: descriptor => ({
      kind: 'world',
      entryCount: libraries.worldInfos.resolve(
        libraryId(descriptor.id, 'standalone:library:'),
      ).upload.entryCount,
    }),
    materialize: input => {
      noVariant(input)
      const world = libraries.worldInfos.asset(libraryId(input.selection.id, 'standalone:library:'))
      return {
        events: appendWorldInfoLibrarySessionSeed(input.events, world),
        title: world.upload.name,
      }
    },
  }]
}
