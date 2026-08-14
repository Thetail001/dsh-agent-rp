/** Browser-safe request and response values for isolated Tavern Helper generation. */

/** Same-origin endpoint used by approved Tavern Helper scripts. */
export const TAVERN_GENERATION_PATH = '/api/dsh-agent-rp/tavern/generate'

/** Same-origin endpoint used to query one user-approved OpenAI-compatible API. */
export const TAVERN_MODEL_LIST_PATH = '/api/dsh-agent-rp/tavern/models'

/** One auxiliary model request made by a sandboxed script. */
export interface TavernGenerationRequest {
  readonly format: 0
  readonly sessionId: string
  readonly mode: 'preset' | 'raw'
  readonly config: Readonly<Record<string, unknown>>
}

/** Text returned to the sandbox without adding a visible chat message. */
export interface TavernGenerationResponse {
  readonly format: 0
  readonly text: string
}

/** One model-list request forwarded for an isolated Tavern Helper script. */
export interface TavernModelListRequest {
  readonly format: 0
  readonly apiurl: string
  readonly key?: string
}

/** Normalized model identifiers returned to an isolated script. */
export interface TavernModelListResponse {
  readonly format: 0
  readonly models: readonly string[]
}
