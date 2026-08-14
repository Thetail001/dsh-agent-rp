/** Browser-safe request and response values for isolated Tavern Helper generation. */

/** Same-origin endpoint used by approved Tavern Helper scripts. */
export const TAVERN_GENERATION_PATH = '/api/dsh-agent-rp/tavern/generate'

/** Same-origin endpoint used to inspect the prompts assembled for one script generation. */
export const TAVERN_PROMPT_PREVIEW_PATH = '/api/dsh-agent-rp/tavern/prompt'

/** Same-origin endpoint used to query one user-approved OpenAI-compatible API. */
export const TAVERN_MODEL_LIST_PATH = '/api/dsh-agent-rp/tavern/models'

/** One text prompt exposed to a sandboxed Tavern Helper script. */
export interface TavernPrompt {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

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

/** Prompts assembled without contacting a model or changing the visible transcript. */
export interface TavernPromptPreviewResponse {
  readonly format: 0
  readonly prompts: readonly TavernPrompt[]
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
