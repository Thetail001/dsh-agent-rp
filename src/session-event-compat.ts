/** Replay-safe admission for Agent RP records, on the official 0.2.1 plugin-record seam. */

import {
  appendPluginRecord,
  pluginRecordOf,
  type PluginRecordMap,
  type Session,
  type SessionEvent,
  type SessionSeq,
} from '@deepseek-ai/dsh-session'

/**
 * Complete private event vocabulary owned by Agent RP, in its original
 * unprefixed form. 0.1.x session logs carry these names verbatim; the official
 * V3→V4 format migration renames every unknown ignorable event to
 * `plugin:<name>`, which is the only form 0.2.1 runtimes read and write.
 * The unprefixed list remains the repair CLI's known-set for legacy logs.
 */
export const AGENT_RP_SESSION_EVENT_TYPES = [
  'agent-rp/act-model-request',
  'agent-rp/act-model-result',
  'agent-rp/character-card-seed',
  'agent-rp/experience-selection',
  'agent-rp/generation-state',
  'agent-rp/memory-seed',
  'agent-rp/mvu-state',
  'agent-rp/narrative-review-request',
  'agent-rp/narrative-review-result',
  'agent-rp/native-prompt-policy-seed',
  'agent-rp/persona-seed',
  'agent-rp/regex-pack-seed',
  'agent-rp/sillytavern-chat-import',
  'agent-rp/sillytavern-preset-seed',
  'agent-rp/staged-state-request',
  'agent-rp/staged-state-result',
  'agent-rp/state',
  'agent-rp/story-stage-request',
  'agent-rp/story-stage-result',
  'agent-rp/story-turn-brief',
  'agent-rp/story-turn-materialized',
  'agent-rp/story-web-search-request',
  'agent-rp/story-web-search-result',
  'agent-rp/story-workspace-selection',
  'agent-rp/tavern-generation-request',
  'agent-rp/tavern-generation-result',
  'agent-rp/tavern-message-annotation',
  'agent-rp/tavern-state',
  'agent-rp/tavern-state-attachment',
  'agent-rp/turn-mode',
  'agent-rp/turn-plan',
  'agent-rp/turn-presentation',
  'agent-rp/turn-settlement',
  'agent-rp/turn-worker-result',
  'agent-rp/world-info-library-seed',
] as const

export type AgentRpSessionEventType = typeof AGENT_RP_SESSION_EVENT_TYPES[number]

/**
 * Runtime record names in the 0.2.1 `plugin:` namespace. Identical to what the
 * official V3→V4 migration produces for legacy logs, so restored sessions and
 * fresh writes share one vocabulary.
 */
export type AgentRpSessionRecordType = `plugin:${AgentRpSessionEventType}`

/** One Agent RP record read back from the log, with its typed payload. */
export type AgentRpSessionEvent<T extends AgentRpSessionRecordType = AgentRpSessionRecordType> =
  Extract<SessionEvent, { type: T }>

/**
 * What {@link appendAgentRpSessionEvent} commits: the official seam returns
 * only the assigned seq, so callers get the seq plus the payload as logged.
 * A full event read back from the log is structurally assignable here.
 */
export type AgentRpAppendResult<T extends AgentRpSessionRecordType> = {
  readonly seq: SessionSeq
  readonly data: AgentRpSessionEvent<T>['data']
}

/**
 * 0.2.1 ships the replay-safe plugin-event seam in the official
 * `@deepseek-ai/dsh-session` (`appendPluginRecord`), so every supported Host
 * has it. The guard shape stays so call sites keep their defensive branches.
 */
export function hostSupportsAgentRpSessionEvents(): boolean {
  return true
}

/** Whether this Session can persist plugin-owned records without poisoning future replay. */
export function supportsAgentRpSessionEvents(_session: Session): boolean {
  return true
}

/**
 * Append one plugin-owned record through the official replay-safe seam.
 * The record enters the log marked `ignorable`, never joins the model-visible
 * surface, and survives fork/resume; a Host without Agent RP retains and skips
 * it. Returns the committed sequence number plus the payload as logged.
 */
export function appendAgentRpSessionEvent<T extends `plugin:agent-rp/${string}` & keyof PluginRecordMap>(
  session: Session,
  type: T,
  data: PluginRecordMap[T],
): { readonly seq: SessionSeq; readonly data: PluginRecordMap[T] } {
  return { seq: appendPluginRecord(session, type, data), data }
}

/**
 * Read one committed event as an Agent RP record of the given type.
 * Uses `pluginRecordOf` so only records that actually entered the `plugin:`
 * namespace (ignorable, grammar-checked) match.
 */
export function asAgentRpSessionEvent<T extends AgentRpSessionRecordType>(
  event: SessionEvent,
  type: T,
): AgentRpSessionEvent<T> | undefined {
  const record = pluginRecordOf(event)
  return record !== undefined && record.type === type
    ? event as AgentRpSessionEvent<T>
    : undefined
}
