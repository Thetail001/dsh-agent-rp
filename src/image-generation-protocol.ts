/** Browser-safe protocol for local roleplay image generation. */

/** Same-origin route serving image jobs, assets, and credential state. */
export const AGENT_RP_IMAGE_PATH = '/api/agent-rp/images'

/** Credential reference used by image providers that accept a bearer key. */
export const AGENT_RP_IMAGE_API_KEY_REF = 'DSH_AGENT_RP_IMAGE_API_KEY'

/** Provider-specific credential references keep unrelated image services isolated. */
export const AGENT_RP_IMAGE_CREDENTIAL_REFS = {
  openai: AGENT_RP_IMAGE_API_KEY_REF,
  novelai: 'DSH_AGENT_RP_NOVELAI_API_KEY',
  a1111: 'DSH_AGENT_RP_A1111_API_KEY',
  comfyui: 'DSH_AGENT_RP_COMFYUI_API_KEY',
} as const

/** Image provider names shared by settings, jobs, and credential routes. */
export type ImageGenerationProvider = keyof typeof AGENT_RP_IMAGE_CREDENTIAL_REFS

/** Resolve the credential slot owned by one image provider. */
export function imageCredentialRefName(provider: ImageGenerationProvider): string {
  return AGENT_RP_IMAGE_CREDENTIAL_REFS[provider]
}

/** Supported image generation intents. */
export const IMAGE_GENERATION_MODES = ['scene', 'portrait', 'avatar', 'custom'] as const

/** Image generation intent selected by the user. */
export type ImageGenerationMode = typeof IMAGE_GENERATION_MODES[number]

/** One durable image request recorded in the conversation command. */
export interface ImageGenerationRequest {
  readonly format: 0
  readonly jobId: string
  readonly mode: ImageGenerationMode
  readonly prompt: string
}

/** Lifecycle state persisted outside the model-visible transcript. */
export type GeneratedImageJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

/** Browser-safe metadata for one generated image job. */
export interface GeneratedImageJob {
  readonly format: 0
  readonly id: string
  readonly request: ImageGenerationRequest
  readonly provider: ImageGenerationProvider
  readonly status: GeneratedImageJobStatus
  readonly progress: number
  readonly phase: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly image?: {
    readonly mediaType: 'image/png' | 'image/jpeg' | 'image/webp'
    readonly bytes: number
  }
  readonly error?: string
}

/** Credential facts safe to return to the browser. */
export interface ImageCredentialInfo {
  readonly configured: boolean
  readonly source?: string
  readonly writable: boolean
}

/** Non-billing connection check returned by the configured image service. */
export interface ImageProviderTestResult {
  readonly status: 'verified' | 'reachable'
  readonly detail: string
}

const JOB_ID_PATTERN = /^image-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const COMMAND_RECORD_PREFIX = 'dsh-agent-rp:image:v0:'

/** Validate one opaque browser-minted image job id. */
export function isImageJobId(value: string): boolean {
  return JOB_ID_PATTERN.test(value)
}

/** Parse and validate one command request. */
export function parseImageGenerationRequest(value: string | unknown): ImageGenerationRequest {
  const parsed = typeof value === 'string' ? JSON.parse(value.trim()) as unknown : value
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('图片生成请求不是对象')
  }
  const record = parsed as Record<string, unknown>
  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : ''
  if (record.format !== 0 || typeof record.jobId !== 'string' || !isImageJobId(record.jobId)
    || typeof record.mode !== 'string' || !IMAGE_GENERATION_MODES.includes(record.mode as ImageGenerationMode)
    || prompt.length < 1 || prompt.length > 8_000) {
    throw new Error('图片生成请求字段无效')
  }
  return { format: 0, jobId: record.jobId, mode: record.mode as ImageGenerationMode, prompt }
}

/** Encode the compact success record stored by `/rp-draw`. */
export function encodeImageGenerationRecord(job: GeneratedImageJob): string {
  return `${COMMAND_RECORD_PREFIX}${JSON.stringify({ format: 0, jobId: job.id })}`
}

/** Decode a settled `/rp-draw` result without exposing image bytes to the transcript. */
export function decodeImageGenerationRecord(value: string | undefined): { readonly jobId: string } | undefined {
  if (value === undefined || !value.startsWith(COMMAND_RECORD_PREFIX)) return undefined
  try {
    const record = JSON.parse(value.slice(COMMAND_RECORD_PREFIX.length)) as Record<string, unknown>
    return record.format === 0 && typeof record.jobId === 'string' && isImageJobId(record.jobId)
      ? { jobId: record.jobId }
      : undefined
  } catch {
    return undefined
  }
}

/** Build the same-origin URL for job metadata. */
export function generatedImageJobUrl(jobId: string): string {
  return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}`
}

/** Build the same-origin URL for one immutable generated asset. */
export function generatedImageAssetUrl(jobId: string, download = false): string {
  return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}/asset${download ? '?download=1' : ''}`
}
