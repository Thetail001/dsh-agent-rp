/** Browser-safe protocol for changing one Roleplay Session's Persona. */

import {
  parseSessionPersonaSnapshot,
  type SessionPersonaSnapshot,
} from './persona-library-protocol.ts'

const RESULT_PREFIX = 'agent-rp-persona-v0:'

/** Private command input selecting a Persona snapshot or clearing it. */
export interface PersonaCommandRequest {
  readonly format: 0
  readonly persona?: SessionPersonaSnapshot
}

/** Durable Persona selection stored in the native command log. */
export interface PersonaCommandRecord extends PersonaCommandRequest {
  readonly sourceEventSeq: number
  readonly fallbackUserName?: string
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}不是对象`)
  return value as Record<string, unknown>
}

/** Validate one private Persona command request. */
export function parsePersonaCommandRequest(source: string): PersonaCommandRequest {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('Persona 请求不是有效 JSON', { cause: error })
  }
  const record = object(value, 'Persona 请求')
  if (record.format !== 0 || Object.keys(record).some(key => key !== 'format' && key !== 'persona')) {
    throw new Error('Persona 请求字段无效')
  }
  const persona = record.persona === undefined ? undefined : parseSessionPersonaSnapshot(record.persona)
  return { format: 0, ...(persona === undefined ? {} : { persona }) }
}

/** Serialize one Persona selection into a Session command result. */
export function encodePersonaCommandRecord(record: PersonaCommandRecord): string {
  return `${RESULT_PREFIX}${JSON.stringify(record)}`
}

/** Decode one Persona command result while declining unrelated output. */
export function decodePersonaCommandRecord(source: string | undefined): PersonaCommandRecord | undefined {
  if (source?.startsWith(RESULT_PREFIX) !== true) return undefined
  let value: unknown
  try {
    value = JSON.parse(source.slice(RESULT_PREFIX.length))
  } catch (error: unknown) {
    throw new Error('Persona 结果不是有效 JSON', { cause: error })
  }
  const record = object(value, 'Persona 结果')
  if (record.format !== 0 || typeof record.sourceEventSeq !== 'number'
    || !Number.isSafeInteger(record.sourceEventSeq) || record.sourceEventSeq < 0
    || (record.fallbackUserName !== undefined
      && (typeof record.fallbackUserName !== 'string' || record.fallbackUserName.trim() === ''))
    || Object.keys(record).some(key => !['format', 'sourceEventSeq', 'persona', 'fallbackUserName'].includes(key))) {
    throw new Error('Persona 结果字段无效')
  }
  const persona = record.persona === undefined ? undefined : parseSessionPersonaSnapshot(record.persona)
  const fallbackUserName = typeof record.fallbackUserName === 'string' ? record.fallbackUserName.trim() : undefined
  return {
    format: 0,
    sourceEventSeq: record.sourceEventSeq,
    ...(persona === undefined ? {} : { persona }),
    ...(fallbackUserName === undefined ? {} : { fallbackUserName }),
  }
}
