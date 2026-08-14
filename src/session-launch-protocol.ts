/** Browser-safe requests for creating a seeded Agent RP Session. */

import type { SessionPersonaSnapshot } from './persona-library-protocol.ts'

/** Same-origin endpoint that creates one complete roleplay Session. */
export const AGENT_RP_SESSION_PATH = '/api/agent-rp/sessions'

/** Start a new Session from one reusable Character Card. */
export interface CharacterSessionLaunchRequest {
  readonly format: 0
  readonly sourceSessionId: string
  readonly kind: 'character'
  readonly characterId: string
  readonly greetingIndex: number
  readonly persona?: SessionPersonaSnapshot
  readonly presetId?: string
}

/** Start a new Session from one retained SillyTavern JSONL import. */
export interface ChatSessionLaunchRequest {
  readonly format: 0
  readonly sourceSessionId: string
  readonly kind: 'chat'
  readonly importId: string
  readonly characterId?: string
  readonly presetId?: string
}

/** Start a child Session immediately before one completed user turn. */
export interface RewriteSessionLaunchRequest {
  readonly format: 0
  readonly sourceSessionId: string
  readonly kind: 'rewrite'
  readonly turn: number
  readonly text: string
}

/** Complete model-free Session launch accepted by the Agent RP Host. */
export type AgentRpSessionLaunchRequest =
  | CharacterSessionLaunchRequest
  | ChatSessionLaunchRequest
  | RewriteSessionLaunchRequest

/** Library-backed launch request that does not depend on an existing RP transcript. */
export type LibrarySessionLaunchRequest = CharacterSessionLaunchRequest | ChatSessionLaunchRequest

/** Successful launch result returned after the Agent is published. */
export interface AgentRpSessionLaunchResponse {
  readonly format: 0
  readonly sessionId: string
  readonly title: string
}
