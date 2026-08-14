/** Browser-safe request and response values for isolated Tavern Helper generation. */

/** Same-origin endpoint used by approved Tavern Helper scripts. */
export const TAVERN_GENERATION_PATH = '/api/dsh-agent-rp/tavern/generate'

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
