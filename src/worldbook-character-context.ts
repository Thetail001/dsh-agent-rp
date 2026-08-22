/** Small host gateway exposing the active Agent RP character to Worldbook plugins. */

import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm'
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

function isWorldbookInstruction(message: UserMessage): boolean {
  return message.source.kind === 'plugin' && message.source.plugin === 'dsh-worldbook'
}

/**
 * Publish one external Worldbook evaluation as a current-state snapshot.
 * Snapshot-aware DSH hosts supersede the previous evaluation during durable
 * request reconstruction; older hosts retain the same content and ordering.
 */
export function coalesceWorldbookSnapshot(messages: UserMessage[]): UserMessage[] {
  const indexes = messages.flatMap((message, index) => isWorldbookInstruction(message) ? [index] : [])
  if (indexes.length === 0) return messages
  const worldbookMessages = indexes.map(index => messages[index]!)
  const snapshot = createUserMessage({
    content: worldbookMessages.flatMap(message => message.content),
    source: {
      kind: 'plugin',
      plugin: 'dsh-worldbook',
      form: 'snapshot',
      sections: worldbookMessages.map((message, index) => ({
        name: `dsh-worldbook:${index + 1}`,
        text: message.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n'),
      })),
    },
  })
  const first = indexes[0]!
  const indexSet = new Set(indexes)
  return messages.flatMap((message, index) => index === first
    ? [snapshot]
    : indexSet.has(index) ? [] : [message])
}

/**
 * Install the snapshot adapter after each Agent's shared injectors exist.
 * Agent-scoped prepend keeps this adapter outside independently loaded
 * Worldbook waterfalls, regardless of profile bundle order.
 */
export function installWorldbookSnapshotCoalescing(ctx: Context): void {
  ctx.on('agent/created', ({ agent }) => {
    agent.ctx.on('agent/pre-step', async (_payload, next) => {
      const decision = await next()
      if (decision.kind === 'reject') return decision
      const snapshot = coalesceWorldbookSnapshot(decision.messages)
      return snapshot === decision.messages ? decision : { ...decision, messages: snapshot }
    }, { prepend: true })
  }, { global: true })
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
