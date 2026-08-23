/** Character-library adapter for the source-neutral actor revision capability. */

import {
  type CharacterLibrary,
} from './character-library.ts'
import type { CharacterLibraryEditableContent } from './character-library-protocol.ts'
import {
  RoleplayActorRevisionConflictError,
  type RoleplayActorDefinition,
  type RoleplayActorRevisionChanges,
  type RoleplayActorRevisionProvider,
  type RoleplayActorRevisionSnapshot,
} from './roleplay-actor-revision.ts'

const PREFIX = 'character:library:'
const LIBRARY_ID = /^card-[a-f0-9]{32}$/u

function libraryId(actorId: string): string | undefined {
  if (!actorId.startsWith(PREFIX)) return undefined
  const id = actorId.slice(PREFIX.length)
  return LIBRARY_ID.test(id) ? id : undefined
}

function definition(content: CharacterLibraryEditableContent): RoleplayActorDefinition {
  return {
    name: content.name,
    description: content.description,
    personality: content.personality,
    scenario: content.scenario,
    exampleDialogue: content.messageExample,
    openings: [content.firstMessage, ...content.alternateGreetings],
  }
}

function snapshot(
  actorId: string,
  content: CharacterLibraryEditableContent,
  revision: number,
): RoleplayActorRevisionSnapshot {
  return {
    actor: { kind: 'actor', id: actorId },
    revision: String(revision),
    definition: definition(content),
  }
}

function applyChanges(
  content: CharacterLibraryEditableContent,
  changes: RoleplayActorRevisionChanges,
): CharacterLibraryEditableContent {
  const openings = changes.openings?.after ?? [content.firstMessage, ...content.alternateGreetings]
  return {
    name: changes.name?.after ?? content.name,
    description: changes.description?.after ?? content.description,
    personality: changes.personality?.after ?? content.personality,
    scenario: changes.scenario?.after ?? content.scenario,
    messageExample: changes.exampleDialogue?.after ?? content.messageExample,
    firstMessage: openings[0]!,
    alternateGreetings: openings.slice(1),
  }
}

/** Reuse CharacterLibrary's reversible overlay and optimistic revision instead of rewriting imports. */
export function characterLibraryActorRevisionProvider(
  library: CharacterLibrary,
): RoleplayActorRevisionProvider {
  const inspect = (actor: { readonly kind: 'actor'; readonly id: string }): RoleplayActorRevisionSnapshot | undefined => {
    const id = libraryId(actor.id)
    if (id === undefined) return undefined
    const detail = library.get(id)
    if (detail.archived) throw new Error('当前角色已移到收纳箱，请先恢复后再编辑')
    return snapshot(actor.id, detail.content, detail.localRevision)
  }
  return {
    id: 'agent-rp:character-library-revisions',
    inspect,
    revise(input) {
      const id = libraryId(input.actor.id)
      if (id === undefined) throw new Error('角色资源不属于本机角色库')
      const current = library.get(id)
      if (String(current.localRevision) !== input.expectedRevision) {
        throw new RoleplayActorRevisionConflictError(snapshot(input.actor.id, current.content, current.localRevision))
      }
      try {
        const revised = library.updateContent(
          id,
          applyChanges(current.content, input.changes),
          current.localRevision,
        )
        return snapshot(input.actor.id, revised.content, revised.localRevision)
      } catch (error: unknown) {
        if (error instanceof Error && /角色设定已在别处改变/u.test(error.message)) {
          const latest = library.get(id)
          throw new RoleplayActorRevisionConflictError(snapshot(input.actor.id, latest.content, latest.localRevision))
        }
        throw error
      }
    },
  }
}
