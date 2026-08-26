/** Browser-safe protocol for installed ST extension generation barriers. */

/** Same-origin long-poll and completion endpoint owned by Agent RP. */
export const ST_EXTENSION_GENERATION_PATH = '/api/agent-rp/st-extension-generation'

/** One Host generation request delivered to the selected browser extension host. */
export interface StExtensionGenerationRequest {
  readonly format: 0
  readonly requestId: string
  readonly sessionId: string
  readonly turn: number
}

/** Browser completion after generation interceptors and durable prompt writes settle. */
export interface StExtensionGenerationCompletion {
  readonly format: 0
  readonly operation: 'complete'
  readonly requestId: string
  readonly sessionId: string
  readonly clientId: string
  readonly outcome: 'applied' | 'failed'
  readonly error?: string
}

function boundedId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 512) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

/** Parse one Host request returned by the same-origin long poll. */
export function parseStExtensionGenerationRequest(value: unknown): StExtensionGenerationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('ST extension generation request must be an object')
  }
  const candidate = value as Readonly<Record<string, unknown>>
  if (candidate.format !== 0 || !Number.isSafeInteger(candidate.turn)
    || (candidate.turn as number) < 0) {
    throw new Error('ST extension generation request is invalid')
  }
  return {
    format: 0,
    requestId: boundedId(candidate.requestId, 'ST extension generation requestId'),
    sessionId: boundedId(candidate.sessionId, 'ST extension generation sessionId'),
    turn: candidate.turn as number,
  }
}

/** Parse one browser completion without accepting unknown outcome variants. */
export function parseStExtensionGenerationCompletion(value: unknown): StExtensionGenerationCompletion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('ST extension generation completion must be an object')
  }
  const candidate = value as Readonly<Record<string, unknown>>
  if (candidate.format !== 0 || candidate.operation !== 'complete'
    || (candidate.outcome !== 'applied' && candidate.outcome !== 'failed')) {
    throw new Error('ST extension generation completion is invalid')
  }
  if (candidate.error !== undefined && (typeof candidate.error !== 'string' || candidate.error.length > 8_000)) {
    throw new Error('ST extension generation completion error is invalid')
  }
  return {
    format: 0,
    operation: 'complete',
    requestId: boundedId(candidate.requestId, 'ST extension generation requestId'),
    sessionId: boundedId(candidate.sessionId, 'ST extension generation sessionId'),
    clientId: boundedId(candidate.clientId, 'ST extension generation clientId'),
    outcome: candidate.outcome,
    ...(candidate.error === undefined ? {} : { error: candidate.error }),
  }
}
