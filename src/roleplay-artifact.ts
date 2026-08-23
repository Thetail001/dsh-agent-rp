/** Durable tool-artifact discovery and explicit Roleplay staging. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { JsonValue, Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const ROLEPLAY_ARTIFACT_STAGE_TOOL = 'stage_roleplay_artifact'
export const TOOL_ARTIFACT_PRESENTATION_FORMAT = 'dsh.tool-artifacts'
export const ROLEPLAY_ARTIFACT_STAGE_FORMAT = 'agent-rp.staged-artifact'

const IMAGE_MEDIA_TYPES = new Set<ImageMediaType>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

/** One provider-neutral image persisted by DSH rather than embedded in model history. */
export interface RoleplayToolImageArtifact {
  readonly type: 'image'
  readonly attachment: ImageAttachmentRef
}

/** The DSH-owned replay envelope currently emitted in `tool/result.data.meta`. */
export interface ToolArtifactPresentationMeta {
  readonly format: typeof TOOL_ARTIFACT_PRESENTATION_FORMAT
  readonly version: 0
  readonly artifacts: readonly RoleplayToolImageArtifact[]
  readonly data?: JsonValue
}

/** Explicit, replayable decision to place one earlier tool artifact on the RP stage. */
export interface RoleplayArtifactStageRecord {
  readonly format: typeof ROLEPLAY_ARTIFACT_STAGE_FORMAT
  readonly version: 0
  readonly artifact: RoleplayToolImageArtifact
  readonly sourceResultSeq: number
  readonly sourceCallId: string
  readonly sourceToolName: string
  readonly caption?: string
}

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function imageAttachment(value: unknown): ImageAttachmentRef | undefined {
  const record = plainRecord(value)
  if (record === undefined
    || typeof record.attachmentId !== 'string' || record.attachmentId === ''
    || typeof record.mediaType !== 'string' || !IMAGE_MEDIA_TYPES.has(record.mediaType as ImageMediaType)
    || typeof record.bytes !== 'number' || !Number.isSafeInteger(record.bytes) || record.bytes <= 0
    || typeof record.width !== 'number' || !Number.isSafeInteger(record.width) || record.width <= 0
    || typeof record.height !== 'number' || !Number.isSafeInteger(record.height) || record.height <= 0
    || (record.name !== undefined && typeof record.name !== 'string')) return undefined
  return value as ImageAttachmentRef
}

function imageArtifact(value: unknown): RoleplayToolImageArtifact | undefined {
  const record = plainRecord(value)
  const attachment = record?.type === 'image' ? imageAttachment(record.attachment) : undefined
  return attachment === undefined ? undefined : { type: 'image', attachment }
}

/** Read the DSH artifact envelope without depending on a not-yet-published package export. */
export function readToolArtifactPresentationMeta(
  value: JsonValue | undefined,
): ToolArtifactPresentationMeta | undefined {
  const record = plainRecord(value)
  if (record?.format !== TOOL_ARTIFACT_PRESENTATION_FORMAT || record.version !== 0
    || !Array.isArray(record.artifacts) || record.artifacts.length === 0) return undefined
  const artifacts = record.artifacts.map(imageArtifact)
  if (artifacts.some(artifact => artifact === undefined)) return undefined
  return {
    format: TOOL_ARTIFACT_PRESENTATION_FORMAT,
    version: 0,
    artifacts: artifacts as RoleplayToolImageArtifact[],
    ...(record.data === undefined ? {} : { data: record.data as JsonValue }),
  }
}

/** Validate one replayed stage decision before it reaches presentation state. */
export function readRoleplayArtifactStageRecord(
  value: JsonValue | undefined,
): RoleplayArtifactStageRecord | undefined {
  const record = plainRecord(value)
  const artifact = imageArtifact(record?.artifact)
  if (record?.format !== ROLEPLAY_ARTIFACT_STAGE_FORMAT || record.version !== 0
    || artifact === undefined
    || typeof record.sourceResultSeq !== 'number' || !Number.isSafeInteger(record.sourceResultSeq)
    || record.sourceResultSeq < 0
    || typeof record.sourceCallId !== 'string' || record.sourceCallId === ''
    || typeof record.sourceToolName !== 'string' || record.sourceToolName === ''
    || (record.caption !== undefined && (typeof record.caption !== 'string'
      || record.caption === '' || record.caption.length > 500))) return undefined
  return {
    format: ROLEPLAY_ARTIFACT_STAGE_FORMAT,
    version: 0,
    artifact,
    sourceResultSeq: record.sourceResultSeq,
    sourceCallId: record.sourceCallId,
    sourceToolName: record.sourceToolName,
    ...(record.caption === undefined ? {} : { caption: record.caption }),
  }
}

function resultCallId(event: Extract<SessionEvent, { readonly type: 'tool/result' }>): string | undefined {
  const first = event.data.message.content[0]
  return first === undefined ? undefined : String(first.toolCallId)
}

function resultFailed(event: Extract<SessionEvent, { readonly type: 'tool/result' }>): boolean {
  return event.data.message.content[0]?.isError === true
}

function currentStageCall(
  session: Session,
  callId: string,
): Extract<SessionEvent, { readonly type: 'tool/call' }> {
  const event = session.events.findLast(candidate => candidate.type === 'tool/call'
    && String(candidate.data.callId) === callId)
  if (event?.type !== 'tool/call' || event.data.name !== ROLEPLAY_ARTIFACT_STAGE_TOOL) {
    throw new Error('stage_roleplay_artifact has no matching durable tool call')
  }
  return event
}

function sourceToolName(events: readonly SessionEvent[], callId: string, beforeSeq: number): string | undefined {
  const call = events.findLast(event => event.seq < beforeSeq && event.type === 'tool/call'
    && String(event.data.callId) === callId)
  return call?.type === 'tool/call' ? call.data.name : undefined
}

function referencedArtifact(
  session: Session,
  call: Extract<SessionEvent, { readonly type: 'tool/call' }>,
  artifactId: string,
): RoleplayArtifactStageRecord {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
    if (event === undefined || event.seq >= call.seq || event.type !== 'tool/result'
      || event.data.turn !== call.data.turn || resultFailed(event)) continue
    const meta = readToolArtifactPresentationMeta(event.data.meta)
    const artifact = meta?.artifacts.find(candidate => String(candidate.attachment.attachmentId) === artifactId)
    if (artifact === undefined) continue
    const callId = resultCallId(event)
    const toolName = callId === undefined ? undefined : sourceToolName(session.events, callId, event.seq)
    if (callId === undefined || toolName === undefined) continue
    return {
      format: ROLEPLAY_ARTIFACT_STAGE_FORMAT,
      version: 0,
      artifact,
      sourceResultSeq: event.seq,
      sourceCallId: callId,
      sourceToolName: toolName,
    }
  }
  throw new Error(`artifact ${JSON.stringify(artifactId)} is not available from an earlier tool result in this turn`)
}

function boundedArtifactId(value: string): string {
  if (value === '' || value.length > 512 || value.trim() !== value
    || /[\s\\/]/u.test(value) || value.includes('://') || value.startsWith('data:')) {
    throw new Error('artifactId must be a stable id, not a URL, path, or inline payload')
  }
  return value
}

function boundedCaption(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const caption = value.trim()
  if (caption === '' || caption.length > 500) throw new Error('caption must contain 1 to 500 characters')
  return caption
}

export const ROLEPLAY_ARTIFACT_STAGE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    format: { type: 'string', required: true, const: ROLEPLAY_ARTIFACT_STAGE_FORMAT },
    version: { type: 'integer', required: true, const: 0 },
    artifact: {
      type: 'object',
      required: true,
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'image' },
        attachment: {
          type: 'object',
          required: true,
          additionalProperties: false,
          properties: {
            attachmentId: { type: 'string', required: true },
            mediaType: { type: 'string', required: true, enum: [...IMAGE_MEDIA_TYPES] },
            bytes: { type: 'integer', required: true },
            width: { type: 'integer', required: true },
            height: { type: 'integer', required: true },
            name: { type: 'string' },
            originalDimensions: {
              type: 'object',
              additionalProperties: false,
              properties: {
                width: { type: 'integer', required: true },
                height: { type: 'integer', required: true },
              },
            },
          },
        },
      },
    },
    sourceResultSeq: { type: 'integer', required: true },
    sourceCallId: { type: 'string', required: true },
    sourceToolName: { type: 'string', required: true },
    caption: { type: 'string' },
  },
} as const

/** Install the provider-neutral bridge from durable DSH artifacts to RP stage intent. */
export function installRoleplayArtifactCapability(ctx: Context): void {
  ctx.effect(() => ctx.tools.register(defineTool({
    name: ROLEPLAY_ARTIFACT_STAGE_TOOL,
    description: 'Place one durable artifact from an earlier tool result in this turn onto the roleplay stage. Pass the exact artifact id shown by the producing tool. This chooses presentation only: it does not generate, download, or modify the artifact.',
    parameters: {
      artifactId: {
        type: 'string',
        required: true,
        description: 'Exact stable artifact id from an earlier tool result in this turn; never a URL, path, or base64 payload.',
      },
      caption: {
        type: 'string',
        description: 'Optional short player-facing caption. Omit when the image should stand on its own.',
      },
    },
    output: {
      schema: ROLEPLAY_ARTIFACT_STAGE_VALUE_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: value.caption === undefined
          ? `Staged artifact ${String(value.artifact.attachment.attachmentId)} for this roleplay turn.`
          : `Staged artifact ${String(value.artifact.attachment.attachmentId)} for this roleplay turn with caption: ${value.caption}`,
      }],
      presentationMeta: (_args, value) => value as unknown as JsonValue,
    },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('stage_roleplay_artifact requires an Agent Session')
      if (exec.parent !== undefined) {
        throw new Error('stage_roleplay_artifact must be a top-level tool call so its stage decision is replayable')
      }
      const artifactId = boundedArtifactId(args.artifactId)
      const caption = boundedCaption(args.caption)
      const call = currentStageCall(exec.agent.session, String(exec.callId))
      const staged = referencedArtifact(exec.agent.session, call, artifactId)
      const stored = await ctx.attachments.readImage(staged.artifact.attachment, exec.signal)
      if (String(stored.ref.attachmentId) !== artifactId) {
        throw new Error('stored artifact identity changed during verification')
      }
      return { ...staged, ...(caption === undefined ? {} : { caption }) }
    },
    presentCall: () => ({ card: 'generic', title: '加入 RP 舞台', kind: 'other' }),
    presentResult: (_args, result) => ({
      card: 'generic',
      title: result.isError ? '舞台产物加入失败' : '已加入 RP 舞台',
    }),
    isConcurrencySafe: () => false,
  })), 'agent-rp: stage durable tool artifacts')
}

/** Read every validated stage decision in one turn before a durable boundary. */
export function readStagedRoleplayArtifacts(
  events: readonly SessionEvent[],
  turn: number,
  beforeSeq = Number.POSITIVE_INFINITY,
): readonly RoleplayArtifactStageRecord[] {
  const staged: RoleplayArtifactStageRecord[] = []
  const calls = new Map<string, Extract<SessionEvent, { readonly type: 'tool/call' }>>()
  const results = new Map<number, Extract<SessionEvent, { readonly type: 'tool/result' }>>()
  for (const event of events) {
    if (event.seq >= beforeSeq) continue
    if (event.type === 'tool/call') {
      calls.set(String(event.data.callId), event)
      continue
    }
    if (event.type !== 'tool/result') continue
    if (event.data.turn !== turn || resultFailed(event)) {
      results.set(event.seq, event)
      continue
    }
    const stageCallId = resultCallId(event)
    const stageCall = stageCallId === undefined ? undefined : calls.get(stageCallId)
    if (stageCall?.data.name !== ROLEPLAY_ARTIFACT_STAGE_TOOL) {
      results.set(event.seq, event)
      continue
    }
    const record = readRoleplayArtifactStageRecord(event.data.meta)
    const source = record === undefined ? undefined : results.get(record.sourceResultSeq)
    const sourceMeta = source === undefined ? undefined : readToolArtifactPresentationMeta(source.data.meta)
    const sourceCall = record === undefined ? undefined : calls.get(record.sourceCallId)
    if (record === undefined || source === undefined || record.sourceResultSeq >= event.seq
      || source.data.turn !== turn || resultFailed(source)
      || resultCallId(source) !== record.sourceCallId
      || sourceCall?.data.name !== record.sourceToolName
      || !sourceMeta?.artifacts.some(candidate =>
        String(candidate.attachment.attachmentId) === String(record.artifact.attachment.attachmentId))) {
      results.set(event.seq, event)
      continue
    }
    staged.push(record)
    results.set(event.seq, event)
  }
  return staged
}

/** Minimal Agent shape documented for capability tests and embedders. */
export type RoleplayArtifactAgent = Pick<Agent, 'session'>
