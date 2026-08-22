/** Small host gateway exposing the active Agent RP character to Worldbook plugins. */

import type { CharacterImportMeta } from './import/session-character.ts'

export const WORLDBOOK_CHARACTER_CONTEXT_KEY = 'worldbook.characterContext'

export interface WorldbookCharacterContext {
  readonly name: string
  readonly tags: readonly string[]
}

type CharacterResolver = () => WorldbookCharacterContext | undefined

export interface WorldbookCharacterContextRegistry {
  getCurrentCharacter(sessionId: string): WorldbookCharacterContext | undefined
  register(sessionId: string, resolve: CharacterResolver): () => void
}

/** Multiple preset-scoped Agent instances contribute through one host-visible provider. */
export function createWorldbookCharacterContextRegistry(): WorldbookCharacterContextRegistry {
  const sessions = new Map<string, { readonly token: symbol; readonly resolve: CharacterResolver }>()
  return {
    getCurrentCharacter(sessionId) {
      return sessions.get(sessionId)?.resolve()
    },
    register(sessionId, resolve) {
      const token = Symbol(sessionId)
      sessions.set(sessionId, { token, resolve })
      return () => {
        if (sessions.get(sessionId)?.token === token) sessions.delete(sessionId)
      }
    },
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
}

function cardTags(meta: CharacterImportMeta): readonly string[] {
  const root = record(meta.raw)
  const data = record(root?.data) ?? root
  return Array.isArray(data?.tags)
    ? [...new Set(data.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '')
      .map(tag => tag.trim()))]
    : []
}

/** Build the Worldbook character-filter identity without exposing card content. */
export function worldbookCharacterContext(
  meta: CharacterImportMeta,
  originalFilename?: string,
): WorldbookCharacterContext {
  const filename = originalFilename?.trim().replace(/\.(?:png|json|charx)$/iu, '')
  return {
    name: filename === undefined || filename === '' ? meta.result.name : filename,
    tags: cardTags(meta),
  }
}
