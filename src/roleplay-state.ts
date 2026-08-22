/** Durable native Roleplay state reconstructed from required Session events. */

import {
  snapshotJsonValue,
  type JsonValue,
  type Session,
  type SessionEvent,
} from '@deepseek-ai/dsh-session'

/** Native lifecycle module that owns all source-neutral Roleplay state namespaces. */
export const ROLEPLAY_STATE_MODULE_ID = 'roleplay:state'

/** One authoritative state revision written to the Session log. */
export interface RoleplayStateRecord {
  readonly format: 0
  readonly id: string
  readonly revision: number
  /** Module or explicit host action that produced this revision. */
  readonly writerModuleId: string
  readonly value: JsonValue
}

/** Current state plus the exact required event that established it. */
export interface RoleplayStateSnapshot extends RoleplayStateRecord {
  readonly eventSeq: number
}

/** Compare-and-set input for one explicit native state write. */
export interface WriteRoleplayStateInput {
  readonly id: string
  /** Zero creates a new namespace; later writes must match the current revision. */
  readonly expectedRevision: number
  readonly writerModuleId: string
  readonly value: JsonValue
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Required native Roleplay state; skipping it would change later model-visible input. */
    'agent-rp/state': RoleplayStateRecord
  }
}

const STATE_ID_PATTERN = /^state:[\p{L}\p{N}](?:[\p{L}\p{N}._:/-]{0,126}[\p{L}\p{N}])?$/u
const MODULE_ID_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}._:/-]{0,158}[\p{L}\p{N}])?$/u

function identifier(value: unknown, label: string, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`Roleplay ${label} is invalid: ${JSON.stringify(value)}`)
  }
  return value
}

function revision(value: unknown, allowZero: boolean): number {
  if (!Number.isSafeInteger(value) || (value as number) < (allowZero ? 0 : 1)) {
    throw new Error('Roleplay state revision is invalid')
  }
  return value as number
}

function stateValue(value: JsonValue): JsonValue {
  const snapshot = snapshotJsonValue(value)
  if (snapshot === undefined) throw new Error('Roleplay state value must be lossless JSON')
  return snapshot
}

/** Validate a borrowed durable record and detach its JSON value. */
export function parseRoleplayStateRecord(value: unknown): RoleplayStateRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Roleplay state record must be an object')
  }
  const record = value as Record<string, unknown>
  if (record.format !== 0
    || Object.keys(record).some(key => !['format', 'id', 'revision', 'writerModuleId', 'value'].includes(key))
    || !Object.prototype.hasOwnProperty.call(record, 'value')) {
    throw new Error('Roleplay state record fields are invalid')
  }
  return {
    format: 0,
    id: identifier(record.id, 'state id', STATE_ID_PATTERN),
    revision: revision(record.revision, false),
    writerModuleId: identifier(record.writerModuleId, 'state writer module id', MODULE_ID_PATTERN),
    value: stateValue(record.value as JsonValue),
  }
}

/** Fold the latest valid revision of every native state namespace. */
export function readRoleplayStates(
  events: readonly SessionEvent[],
  beforeSeq = Number.POSITIVE_INFINITY,
): readonly RoleplayStateSnapshot[] {
  const current = new Map<string, RoleplayStateSnapshot>()
  for (const event of events) {
    if (event.seq >= beforeSeq || event.type !== 'agent-rp/state') continue
    const record = parseRoleplayStateRecord(event.data)
    const previousRevision = current.get(record.id)?.revision ?? 0
    if (record.revision !== previousRevision + 1) {
      throw new Error(
        `Roleplay state ${record.id} revision is discontinuous: expected ${String(previousRevision + 1)}, received ${String(record.revision)}`,
      )
    }
    current.set(record.id, { ...record, eventSeq: event.seq })
  }
  return [...current.values()]
}

/** Append one conflict-checked state revision as required Session history. */
export function appendRoleplayState(
  session: Session,
  input: WriteRoleplayStateInput,
): RoleplayStateSnapshot {
  const id = identifier(input.id, 'state id', STATE_ID_PATTERN)
  const expectedRevision = revision(input.expectedRevision, true)
  const writerModuleId = identifier(input.writerModuleId, 'state writer module id', MODULE_ID_PATTERN)
  const current = readRoleplayStates(session.events).find(state => state.id === id)
  const currentRevision = current?.revision ?? 0
  if (expectedRevision !== currentRevision) {
    throw new Error(
      `Roleplay state ${id} revision conflict: expected ${String(expectedRevision)}, current ${String(currentRevision)}`,
    )
  }
  const record: RoleplayStateRecord = {
    format: 0,
    id,
    revision: currentRevision + 1,
    writerModuleId,
    value: stateValue(input.value),
  }
  const event = session.append('agent-rp/state', record)
  return { ...event.data, eventSeq: event.seq }
}

/** Provider-neutral, read-only state context for one exact prepared turn. */
export function renderRoleplayStateContext(states: readonly RoleplayStateSnapshot[]): string {
  if (states.length === 0) return ''
  const payload = states.map(state => ({
    id: state.id,
    revision: state.revision,
    value: state.value,
  }))
  return [
    '当前角色扮演状态（本轮开始时的只读事实快照）：',
    '<roleplay_state>',
    JSON.stringify(payload, undefined, 2),
    '</roleplay_state>',
  ].join('\n')
}
