/** Durable Agent RP memory reconstructed from native tool events. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { JsonValue, Session, SessionEvent } from '@deepseek-ai/dsh-session'

/** Stable identity of one memory record inside a Session. */
export type AgentRpMemoryId = Branded<'AgentRpMemoryId'>

/** Supported reasons for retaining information across turns. */
export const AGENT_RP_MEMORY_KINDS = [
  'fact',
  'promise',
  'relationship',
  'preference',
  'event',
] as const

/** Semantic class of one durable memory. */
export type AgentRpMemoryKind = typeof AGENT_RP_MEMORY_KINDS[number]

/** One successful `remember` result; corrections supersede rather than rewrite history. */
export interface AgentRpMemoryRecord {
  readonly version: 0
  readonly id: AgentRpMemoryId
  readonly kind: AgentRpMemoryKind
  readonly subject: string
  readonly text: string
  /** Exact direct `remember` tool call that created this record. */
  readonly sourceEventSeq: number
  /** Earlier active record replaced by this correction. */
  readonly supersedes?: AgentRpMemoryId
}

/** Input accepted after the model-facing tool schema has validated primitive types. */
export interface AgentRpMemoryInput {
  readonly kind: AgentRpMemoryKind
  readonly subject: string
  readonly text: string
  readonly supersedes?: string
}

/** Validated chronological and active views of one Session's memory log. */
export interface AgentRpMemoryHistory {
  readonly all: readonly AgentRpMemoryRecord[]
  readonly active: readonly AgentRpMemoryRecord[]
}

const SUBJECT_MAX_LENGTH = 120
const TEXT_MAX_LENGTH = 1_000
const MEMORY_ID_PATTERN = /^memory-(0|[1-9]\d*)$/u

/** Brand a validated memory id at the Session boundary. */
export function AgentRpMemoryId(value: string): AgentRpMemoryId {
  if (!MEMORY_ID_PATTERN.test(value)) throw new Error(`invalid Agent RP memory id ${JSON.stringify(value)}`)
  return value as AgentRpMemoryId
}

function normalizeText(value: string, field: string, maximum: number): string {
  const normalized = value.trim()
  if (normalized.length === 0) throw new Error(`Agent RP memory ${field} must contain non-whitespace text`)
  if (normalized.length > maximum) throw new Error(`Agent RP memory ${field} exceeds ${maximum} characters`)
  return normalized
}

function sourceCall(events: readonly SessionEvent[], record: AgentRpMemoryRecord): SessionEvent<'tool/call'> {
  if (!Number.isSafeInteger(record.sourceEventSeq) || record.sourceEventSeq < 0) {
    throw new Error('Agent RP memory sourceEventSeq must be a non-negative safe integer')
  }
  const source = events[record.sourceEventSeq]
  if (source?.type !== 'tool/call' || source.seq !== record.sourceEventSeq || source.data.name !== 'remember') {
    throw new Error(`Agent RP memory ${record.id} does not reference its direct remember tool call`)
  }
  return source
}

function sourceArguments(call: SessionEvent<'tool/call'>): AgentRpMemoryInput {
  let parsed: unknown
  try {
    parsed = JSON.parse(call.data.arguments)
  } catch {
    throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid JSON arguments`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid arguments`)
  }
  const input = parsed as Record<string, unknown>
  if (typeof input.kind !== 'string' || !AGENT_RP_MEMORY_KINDS.includes(input.kind as AgentRpMemoryKind)
    || typeof input.subject !== 'string' || typeof input.text !== 'string'
    || (input.supersedes !== undefined && typeof input.supersedes !== 'string')) {
    throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid arguments`)
  }
  return {
    kind: input.kind as AgentRpMemoryKind,
    subject: input.subject,
    text: input.text,
    ...(input.supersedes === undefined ? {} : { supersedes: input.supersedes }),
  }
}

function canonicalRecord(value: JsonValue, call: SessionEvent<'tool/call'>): AgentRpMemoryRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`remember result for call ${call.data.callId} has invalid canonical value`)
  }
  const record = value as Record<string, JsonValue>
  if (record.version !== 0 || typeof record.id !== 'string'
    || typeof record.kind !== 'string' || !AGENT_RP_MEMORY_KINDS.includes(record.kind as AgentRpMemoryKind)
    || typeof record.subject !== 'string' || typeof record.text !== 'string'
    || !Number.isSafeInteger(record.sourceEventSeq)
    || (record.supersedes !== undefined && typeof record.supersedes !== 'string')) {
    throw new Error(`remember result for call ${call.data.callId} has invalid canonical value`)
  }
  return {
    version: 0,
    id: AgentRpMemoryId(record.id),
    kind: record.kind as AgentRpMemoryKind,
    subject: record.subject,
    text: record.text,
    sourceEventSeq: record.sourceEventSeq as number,
    ...(record.supersedes === undefined ? {} : { supersedes: AgentRpMemoryId(record.supersedes) }),
  }
}

function parseCanonicalResult(
  result: SessionEvent<'tool/result'>,
  call: SessionEvent<'tool/call'>,
): JsonValue {
  const block = result.data.message.content[0]
  if (String(block.toolCallId) !== String(call.data.callId)
    || String(result.data.message.source.callId) !== String(call.data.callId)) {
    throw new Error(`remember result for call ${call.data.callId} has inconsistent call identity`)
  }
  if (result.sourceEventSeqs?.length !== 1 || result.sourceEventSeqs[0] !== call.seq) {
    throw new Error(`remember result for call ${call.data.callId} does not cite its direct tool call`)
  }
  if (block.content.length !== 1 || block.content[0]?.type !== 'text') {
    throw new Error(`remember result for call ${call.data.callId} has invalid canonical content`)
  }
  try {
    return JSON.parse(block.content[0].text) as JsonValue
  } catch {
    throw new Error(`remember result for call ${call.data.callId} has invalid canonical JSON`)
  }
}

function successfulRememberResults(events: readonly SessionEvent[]): Map<string, SessionEvent<'tool/result'>> {
  const rememberCallIds = new Set(events.flatMap(event => event.type === 'tool/call'
    && event.data.name === 'remember' ? [String(event.data.callId)] : []))
  const results = new Map<string, SessionEvent<'tool/result'>>()
  for (const event of events) {
    if (event.type !== 'tool/result') continue
    const block = event.data.message.content[0]
    if (block.isError === true || event.data.error !== undefined) continue
    const callId = String(block.toolCallId)
    if (!rememberCallIds.has(callId)) continue
    if (results.has(callId)) throw new Error(`tool call ${callId} has multiple successful results`)
    results.set(callId, event)
  }
  return results
}

function validateRecord(
  events: readonly SessionEvent[],
  call: SessionEvent<'tool/call'>,
  result: SessionEvent<'tool/result'>,
  active: Map<AgentRpMemoryId, AgentRpMemoryRecord>,
): AgentRpMemoryRecord {
  const record = canonicalRecord(parseCanonicalResult(result, call), call)
  const id = record.id
  sourceCall(events, record)
  const input = sourceArguments(call)
  if (record.sourceEventSeq !== call.seq || call.seq >= result.seq || id !== `memory-${call.seq}`) {
    throw new Error(`Agent RP memory ${record.id} has invalid source ordering or identity`)
  }
  normalizeText(record.subject, 'subject', SUBJECT_MAX_LENGTH)
  normalizeText(record.text, 'text', TEXT_MAX_LENGTH)
  if (record.subject !== record.subject.trim() || record.text !== record.text.trim()) {
    throw new Error(`Agent RP memory ${record.id} text is not normalized`)
  }
  if (record.kind !== input.kind
    || record.subject !== input.subject.trim()
    || record.text !== input.text.trim()
    || record.supersedes !== input.supersedes) {
    throw new Error(`Agent RP memory ${record.id} does not match its source call arguments`)
  }
  if (record.supersedes !== undefined) {
    const superseded = AgentRpMemoryId(record.supersedes)
    if (!active.delete(superseded)) {
      throw new Error(`Agent RP memory ${record.id} supersedes a missing or inactive record`)
    }
  }
  active.set(id, record)
  return record
}

/**
 * Replay and validate all Agent RP memory records in one Session log.
 * @param events - complete chronological Session history.
 * @returns immutable chronological and currently active record lists.
 */
export function readAgentRpMemoryHistory(events: readonly SessionEvent[]): AgentRpMemoryHistory {
  const all: AgentRpMemoryRecord[] = []
  const active = new Map<AgentRpMemoryId, AgentRpMemoryRecord>()
  const results = successfulRememberResults(events)
  for (const event of events) {
    if (event.type !== 'tool/call' || event.data.name !== 'remember') continue
    const result = results.get(String(event.data.callId))
    if (result === undefined) continue
    all.push(validateRecord(events, event, result, active))
  }
  return { all: Object.freeze(all), active: Object.freeze([...active.values()]) }
}

function findRememberCall(session: Session, callId: string): SessionEvent<'tool/call'> {
  const call = session.events.findLast(event => event.type === 'tool/call' && event.data.callId === callId)
  if (call?.type !== 'tool/call' || call.data.name !== 'remember') {
    throw new Error('remember execution has no matching direct Session tool call')
  }
  return call
}

/**
 * Prepare one normalized result for the current direct `remember` tool call.
 * @param session - Session that owns both source call and durable memory.
 * @param callId - execution call id recorded by the Agent loop.
 * @param input - model-selected memory content and optional correction target.
 * @returns the canonical record that the Agent loop persists as the tool result.
 */
export function prepareAgentRpMemory(
  session: Session,
  callId: string,
  input: AgentRpMemoryInput,
): AgentRpMemoryRecord {
  const history = readAgentRpMemoryHistory(session.events)
  const call = findRememberCall(session, callId)
  const sourceInput = sourceArguments(call)
  if (sourceInput.kind !== input.kind
    || sourceInput.subject !== input.subject
    || sourceInput.text !== input.text
    || sourceInput.supersedes !== input.supersedes) {
    throw new Error('remember execution arguments do not match its Session tool call')
  }
  const supersedes = input.supersedes === undefined ? undefined : AgentRpMemoryId(input.supersedes)
  if (supersedes !== undefined && !history.active.some(record => record.id === supersedes)) {
    throw new Error(`cannot supersede missing or inactive Agent RP memory ${JSON.stringify(supersedes)}`)
  }
  return {
    version: 0,
    id: AgentRpMemoryId(`memory-${call.seq}`),
    kind: input.kind,
    subject: normalizeText(input.subject, 'subject', SUBJECT_MAX_LENGTH),
    text: normalizeText(input.text, 'text', TEXT_MAX_LENGTH),
    sourceEventSeq: call.seq,
    ...(supersedes === undefined ? {} : { supersedes }),
  }
}
