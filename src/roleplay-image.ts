/** Publication boundary between arbitrary image tools and the Agent RP transcript. */

import { randomUUID } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {
  AttachmentStore,
  ImageAttachmentRef,
  ImageMediaType,
} from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import type { GeneratedImageLibrary } from './generated-image-library.ts'
import {
  isImageJobId,
  PUBLISHABLE_MEDIA_TYPES,
  publishableMediaType,
  type PublishableMediaType,
  type PublishedRoleplayImageRef,
} from './image-generation-protocol.ts'

export type { PublishedRoleplayImageRef } from './image-generation-protocol.ts'

/** Stable name exposed to the model. */
export const PUBLISH_ROLEPLAY_IMAGE_TOOL = 'publish_roleplay_image'

/** Model-facing arguments accepted by the publication tool. */
export interface PublishRoleplayImageArgs {
  readonly path?: string
  readonly caption?: string
}

/** Validated result persisted both as tool output and replay metadata. */
export interface PublishedRoleplayImageValue {
  readonly version: 0
  readonly sourceEventSeq: number
  readonly sourceCallId?: string
  readonly images: PublishedRoleplayImageRef[]
  readonly caption?: string
}

/** Tool-private replay payload. */
export interface PublishedRoleplayImageMeta extends PublishedRoleplayImageValue {
  readonly format: 0
}

/** Canonical output schema for one published image group. */
export const PUBLISHED_ROLEPLAY_IMAGE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', required: true, const: 0 },
    sourceEventSeq: { type: 'integer', required: true },
    sourceCallId: { type: 'string' },
    images: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          jobId: { type: 'string', required: true },
          mediaType: {
            type: 'string',
            required: true,
            enum: [...PUBLISHABLE_MEDIA_TYPES],
          },
          bytes: { type: 'integer', required: true },
          name: { type: 'string' },
        },
      },
    },
    caption: { type: 'string' },
  },
} as const

function normalizedCaption(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const caption = value.trim()
  if (caption === '') return undefined
  if (caption.length > 500) throw new TypeError('caption must contain at most 500 characters')
  return caption
}

function imagesFromContent(content: readonly ContentBlock[]): ImageAttachmentRef[] {
  return content.flatMap(block => {
    if (block.type === 'image') return [block.attachment]
    if (block.type === 'tool-result') return imagesFromContent(block.content)
    return []
  })
}

function inferredMediaType(data: Uint8Array): ImageMediaType | undefined {
  if (data.length >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
    && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a) return 'image/png'
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (data.length >= 6) {
    const signature = String.fromCharCode(...data.subarray(0, 6))
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif'
  }
  if (data.length >= 12
    && String.fromCharCode(...data.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...data.subarray(8, 12)) === 'WEBP') return 'image/webp'
  return undefined
}

function isInsideWorkspace(workspace: string, candidate: string): boolean {
  const path = relative(workspace, candidate)
  return path !== '' && path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    && !isAbsolute(path)
}

/**
 * Store one illustration in the generated-image library and address it by job id.
 *
 * The library is the same store `/rp-draw` writes to, so publication reuses the existing
 * same-origin asset route and the browser needs no attachment authorization.
 */
function storePublishedImage(
  library: GeneratedImageLibrary,
  data: Uint8Array,
  mediaType: PublishableMediaType,
  caption: string | undefined,
  name: string | undefined,
): PublishedRoleplayImageRef {
  const jobId = `image-${randomUUID()}`
  library.begin({
    format: 0,
    jobId,
    mode: 'scene',
    prompt: caption ?? name ?? '角色插图',
  }, 'external')
  library.complete(jobId, { data, mediaType })
  return {
    jobId,
    mediaType,
    bytes: data.byteLength,
    ...(name === undefined ? {} : { name }),
  }
}

async function saveWorkspaceImage(
  store: AttachmentStore,
  library: GeneratedImageLibrary,
  agent: Agent,
  path: string,
  caption: string | undefined,
  signal?: AbortSignal,
): Promise<PublishedRoleplayImageRef> {
  const workspacePath = agent.session.header.cwd
  if (workspacePath === undefined) {
    throw new Error('publish_roleplay_image(path) requires this Session to have a workspace cwd. Use the available shell tool to materialize the image inside the current workspace, then pass that workspace path.')
  }
  const requested = path.trim()
  // Defensive: the only caller already normalizes an all-whitespace `path` to "omitted",
  // so this is unreachable through the tool. Kept so a future caller cannot skip the check.
  if (requested === '') throw new TypeError('path must contain non-whitespace text')
  if (requested.length > 4_000) throw new TypeError('path is too long')
  if (/^[a-z][a-z\d+.-]*:\/\//iu.test(requested)) {
    throw new Error('path must be a local file inside the Session workspace, not a URL. Use the available shell tool (curl/wget) to download the URL into the workspace, then pass the resulting file path.')
  }
  signal?.throwIfAborted()
  const workspace = await realpath(workspacePath)
  const candidate = await realpath(resolve(workspace, requested))
  if (!isInsideWorkspace(workspace, candidate)) {
    throw new Error(`path must resolve to a file inside the Session workspace (${workspace}). Move or copy the file there with the available shell tool, then pass that path.`)
  }
  const file = await stat(candidate)
  if (!file.isFile()) throw new Error('path must resolve to a regular image file. Check the path with the shell tool and pass the actual downloaded or decoded image file.')
  if (file.size > store.imageLimits.maxImageBytes) {
    throw new Error(`image exceeds the configured ${store.imageLimits.maxImageBytes}-byte limit`)
  }
  const data = await readFile(candidate, { signal })
  const detected = inferredMediaType(data)
  if (detected === undefined) throw new Error('path is not a supported PNG, JPEG, WebP, or GIF image. Re-download or convert the file with the shell tool, then pass the resulting path.')
  if (!store.imageLimits.mediaTypes.includes(detected)) {
    throw new Error(`${detected} images are disabled by the attachment policy`)
  }
  const mediaType = publishableMediaType(detected)
  if (mediaType === undefined) {
    throw new Error(`${detected} cannot be published as a roleplay illustration. Convert the file to PNG, JPEG, or WebP with the available shell tool, then pass the converted workspace path.`)
  }
  return storePublishedImage(library, data, mediaType, caption, basename(candidate))
}

/** Copy one same-turn native tool image out of attachment storage into the library. */
async function adoptNativeToolImage(
  store: AttachmentStore,
  library: GeneratedImageLibrary,
  ref: ImageAttachmentRef,
  caption: string | undefined,
  signal?: AbortSignal,
): Promise<PublishedRoleplayImageRef> {
  const mediaType = publishableMediaType(ref.mediaType)
  if (mediaType === undefined) {
    throw new Error(`the image returned by the earlier tool is ${ref.mediaType}, which cannot be published as a roleplay illustration. Save it into the Session workspace as PNG, JPEG, or WebP with the available shell tool, then call publish_roleplay_image with that path.`)
  }
  const stored = await store.readImage(ref, signal)
  return storePublishedImage(library, stored.data, mediaType, caption, ref.name)
}

function currentPublisherCall(agent: Agent, callId: string): Extract<SessionEvent, { type: 'tool/call' }> {
  for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
    const event = agent.session.events[index]
    if (event?.type === 'tool/call' && String(event.data.callId) === callId
      && event.data.name === PUBLISH_ROLEPLAY_IMAGE_TOOL) return event
  }
  throw new Error('publish_roleplay_image call is absent from the current Session')
}

function alreadyPublishedSourceSeqs(events: readonly SessionEvent[]): ReadonlySet<number> {
  const result = new Set<number>()
  for (const event of events) {
    if (event.type !== 'tool/result') continue
    const meta = parsePublishedRoleplayImageMeta(event.data.meta)
    if (meta !== undefined) result.add(meta.sourceEventSeq)
  }
  return result
}

function latestSameTurnToolImages(
  agent: Agent,
  currentCall: Extract<SessionEvent, { type: 'tool/call' }>,
): { readonly eventSeq: number; readonly callId: string; readonly images: readonly ImageAttachmentRef[] } | undefined {
  const used = alreadyPublishedSourceSeqs(agent.session.events)
  for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
    const event = agent.session.events[index]
    if (event === undefined || event.seq >= currentCall.seq || event.type !== 'tool/result'
      || event.data.turn !== currentCall.data.turn || event.data.message.content[0]?.isError === true
      || used.has(event.seq)) continue
    const images = imagesFromContent(event.data.message.content)
    if (images.length === 0) continue
    return {
      eventSeq: event.seq,
      callId: String(event.data.message.content[0].toolCallId),
      images,
    }
  }
  return undefined
}

const PUBLISH_NO_SOURCE_GUIDANCE = 'No image can be published yet. No same-turn tool returned a native image attachment and no workspace path was provided. Do not retry this exact call. If a previous tool returned a URL, download it into the Session workspace with the available shell tool (curl/wget); if it returned base64, decode it into a workspace file with the shell tool; if it returned a file path or file attachment, move/copy that file into the Session workspace. Then call publish_roleplay_image again with the real workspace path. If you cannot produce such a file, stop calling this tool and continue the roleplay reply without an image.'

/** Validate and retain either a same-turn native tool image or one downloaded workspace file. */
export async function preparePublishedRoleplayImage(
  store: AttachmentStore,
  library: GeneratedImageLibrary,
  agent: Agent,
  callId: string,
  args: PublishRoleplayImageArgs,
  signal?: AbortSignal,
): Promise<PublishedRoleplayImageValue> {
  const currentCall = currentPublisherCall(agent, callId)
  const caption = normalizedCaption(args.caption)
  // An all-whitespace `path` is treated as omitted: models that mean "reuse this turn's
  // native attachment" often send "" instead of dropping the field.
  const requestedPath = typeof args.path === 'string' && args.path.trim() === '' ? undefined : args.path
  if (requestedPath !== undefined) {
    const image = await saveWorkspaceImage(store, library, agent, requestedPath, caption, signal)
    return {
      version: 0,
      sourceEventSeq: currentCall.seq,
      images: [image],
      ...(caption === undefined ? {} : { caption }),
    }
  }
  const native = latestSameTurnToolImages(agent, currentCall)
  if (native === undefined) {
    throw new Error(PUBLISH_NO_SOURCE_GUIDANCE)
  }
  if (native.images.length > store.imageLimits.maxImagesPerMessage) {
    throw new Error(`image tool returned ${native.images.length} images; at most ${store.imageLimits.maxImagesPerMessage} may be published together`)
  }
  const images: PublishedRoleplayImageRef[] = []
  for (const ref of native.images) {
    images.push(await adoptNativeToolImage(store, library, ref, caption, signal))
  }
  return {
    version: 0,
    sourceEventSeq: native.eventSeq,
    sourceCallId: native.callId,
    images,
    ...(caption === undefined ? {} : { caption }),
  }
}

function imageRef(value: JsonValue): PublishedRoleplayImageRef | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, JsonValue>
  if (typeof record.jobId !== 'string' || !isImageJobId(record.jobId)
    || typeof record.mediaType !== 'string' || publishableMediaType(record.mediaType) === undefined
    || typeof record.bytes !== 'number' || !Number.isSafeInteger(record.bytes) || record.bytes <= 0
    || (record.name !== undefined && typeof record.name !== 'string')) return undefined
  return value as unknown as PublishedRoleplayImageRef
}

/** Parse replay metadata without trusting arbitrary tool-result JSON. */
export function parsePublishedRoleplayImageMeta(value: JsonValue | undefined): PublishedRoleplayImageMeta | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, JsonValue>
  if (record.format !== 0 || record.version !== 0
    || typeof record.sourceEventSeq !== 'number' || !Number.isSafeInteger(record.sourceEventSeq)
    || record.sourceEventSeq < 0
    || (record.sourceCallId !== undefined && typeof record.sourceCallId !== 'string')
    || (record.caption !== undefined && (typeof record.caption !== 'string' || record.caption.length > 500))
    || !Array.isArray(record.images) || record.images.length === 0) return undefined
  const images = record.images.map(imageRef)
  if (images.some(image => image === undefined)) return undefined
  return {
    format: 0,
    version: 0,
    sourceEventSeq: record.sourceEventSeq,
    ...(record.sourceCallId === undefined ? {} : { sourceCallId: record.sourceCallId as string }),
    images: images as PublishedRoleplayImageRef[],
    ...(record.caption === undefined ? {} : { caption: record.caption as string }),
  }
}
