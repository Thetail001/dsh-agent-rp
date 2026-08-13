/** Durable Persona snapshot selected for one Roleplay Session. */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionPersonaSnapshot } from './persona-library-protocol.ts'

/** Session event carrying a Persona snapshot independently from the Character Card. */
export interface PersonaSeedRecord {
  readonly format: 0
  readonly persona: SessionPersonaSnapshot
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Skippable player Persona selected when a Roleplay Session is created. */
    'agent-rp/persona-seed': PersonaSeedRecord
  }
}

/** Validate and normalize one Session-owned Persona snapshot. */
export function parseSessionPersona(value: unknown): SessionPersonaSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Persona 快照不是对象')
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (typeof record.id !== 'string' || !/^persona-[0-9a-f-]+$/u.test(record.id)
    || typeof record.name !== 'string' || record.name.trim() === '' || record.name.trim().length > 120
    || typeof record.description !== 'string' || record.description.trim().length > 12_000
    || keys.some(key => key !== 'id' && key !== 'name' && key !== 'description')) {
    throw new Error('Persona 快照字段无效')
  }
  return {
    id: record.id,
    name: record.name.trim(),
    description: record.description.trim(),
  }
}

/** Return the latest Persona snapshot explicitly selected for one Session. */
export function readSessionPersona(events: readonly SessionEvent[]): SessionPersonaSnapshot | undefined {
  let active: SessionPersonaSnapshot | undefined
  for (const event of events) {
    if (event.type !== 'agent-rp/persona-seed') continue
    if (event.data.format !== 0) throw new Error('Persona Session 事件格式不受支持')
    active = parseSessionPersona(event.data.persona)
  }
  return active
}
