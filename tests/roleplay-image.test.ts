import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { CallId, createAssistantMessage, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { agentRpProjectionDefinition } from '../src/projection.ts'
import { GeneratedImageLibrary } from '../src/generated-image-library.ts'
import { isImageJobId } from '../src/image-generation-protocol.ts'
import {
  parsePublishedRoleplayImageMeta,
  preparePublishedRoleplayImage,
  PUBLISH_ROLEPLAY_IMAGE_TOOL,
} from '../src/roleplay-image.ts'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

const nativeImage: ImageAttachmentRef = {
  attachmentId: 'sha256:native-image' as never,
  mediaType: 'image/png',
  bytes: PNG.byteLength,
  width: 32,
  height: 24,
  name: 'native.png',
}

const gifImage: ImageAttachmentRef = { ...nativeImage, mediaType: 'image/gif', name: 'native.gif' }

function fakeStore(): AttachmentStore {
  return {
    imageLimits: {
      maxImageBytes: 1_000_000,
      maxImagesPerMessage: 4,
      maxMessageImageBytes: 4_000_000,
      maxImagePixels: 10_000_000,
      mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    async readImage(ref: ImageAttachmentRef) {
      return { ref, data: PNG }
    },
  } as unknown as AttachmentStore
}

/** A real library on a temp root: publication must round-trip through the asset store. */
async function temporaryLibrary(context: { after(fn: () => Promise<void> | void): void }) {
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-published-images-'))
  context.after(async () => { await rm(root, { recursive: true, force: true }) })
  return new GeneratedImageLibrary({ root })
}

function appendCall(session: Session, callId: string, name: string, turn = 1) {
  return session.append('tool/call', {
    turn,
    step: 1,
    callId: CallId(callId),
    name,
    arguments: '{}',
  })
}

function appendResult(
  session: Session,
  callId: string,
  content: Parameters<typeof createToolResultMessage>[0]['content'],
  callSeq: number,
  turn = 1,
) {
  return session.append('tool/result', {
    turn,
    step: 1,
    message: createToolResultMessage({ callId: CallId(callId), content, isError: false }),
  }, { surfaceOp: 'append', sourceEventSeqs: [callSeq] })
}

test('claims the latest unpublished native image returned earlier in the same turn', async (context) => {
  const library = await temporaryLibrary(context)
  const session = Session.create(SessionId('publish-native'))
  const generate = appendCall(session, 'generate-1', 'configured_image_mcp')
  const result = appendResult(session, 'generate-1', [{ type: 'image', attachment: nativeImage }], generate.seq)
  appendCall(session, 'publish-1', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  const value = await preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-1', {
    caption: '  窗边的雨夜  ',
  })

  assert.equal(value.sourceEventSeq, result.seq)
  assert.equal(value.sourceCallId, 'generate-1')
  assert.equal(value.caption, '窗边的雨夜')
  assert.equal(value.images.length, 1)
  const published = value.images[0]!
  assert.ok(isImageJobId(published.jobId))
  assert.equal(published.mediaType, 'image/png')
  assert.equal(published.bytes, PNG.byteLength)
  assert.equal(published.name, 'native.png')
  // The bytes must be retrievable through the same route `/rp-draw` output uses.
  assert.deepEqual(library.asset(published.jobId).data, PNG)
  assert.equal(library.get(published.jobId).provider, 'external')
})

test('publishes no image content into the model-visible result shape', async (context) => {
  const library = await temporaryLibrary(context)
  const session = Session.create(SessionId('publish-no-image-block'))
  const generate = appendCall(session, 'generate-1', 'configured_image_mcp')
  appendResult(session, 'generate-1', [{ type: 'image', attachment: nativeImage }], generate.seq)
  appendCall(session, 'publish-1', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  const value = await preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-1', {})
  // A text-only chat adapter rejects image content anywhere in the transcript, so the
  // published value must address bytes by job id and never carry an attachment reference.
  const serialized = JSON.stringify(value)
  assert.doesNotMatch(serialized, /attachmentId/u)
  assert.doesNotMatch(serialized, /"type":\s*"image"/u)
})

test('treats an empty path as omitted when a native image is available', async (context) => {
  const library = await temporaryLibrary(context)
  const session = Session.create(SessionId('publish-empty-path'))
  const generate = appendCall(session, 'generate-1', 'configured_image_mcp')
  const result = appendResult(session, 'generate-1', [{ type: 'image', attachment: nativeImage }], generate.seq)
  appendCall(session, 'publish-1', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  const value = await preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-1', { path: '' })
  assert.equal(value.sourceEventSeq, result.seq)
  assert.equal(value.images.length, 1)

  const secondCall = appendCall(session, 'generate-2', 'configured_image_mcp')
  const second = appendResult(session, 'generate-2', [{ type: 'image', attachment: nativeImage }], secondCall.seq)
  appendCall(session, 'publish-2', PUBLISH_ROLEPLAY_IMAGE_TOOL)
  const whitespace = await preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-2', { path: '   ' })
  assert.equal(whitespace.sourceEventSeq, second.seq)
  assert.equal(whitespace.images.length, 1)
  assert.notEqual(whitespace.images[0]?.jobId, value.images[0]?.jobId)
})

test('refuses a same-turn image the library cannot store and names the conversion', async (context) => {
  const library = await temporaryLibrary(context)
  const session = Session.create(SessionId('publish-gif'))
  const generate = appendCall(session, 'generate-gif', 'configured_image_mcp')
  appendResult(session, 'generate-gif', [{ type: 'image', attachment: gifImage }], generate.seq)
  appendCall(session, 'publish-gif', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-gif', {}),
    /image\/gif.*PNG, JPEG, or WebP/su,
  )
})

test('tells the model to materialize URL output before retrying publication', async (context) => {
  const library = await temporaryLibrary(context)
  const session = Session.create(SessionId('publish-url-guidance'))
  const generate = appendCall(session, 'generate-url', 'configured_image_mcp')
  appendResult(session, 'generate-url', [{ type: 'text', text: 'Image ready.\nDownload URL: https://example.com/image.png' }], generate.seq)
  appendCall(session, 'publish-url', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-url', { path: '' }),
    /download it into the Session workspace.*base64/su,
  )
})

test('rejects a URL passed as path with concrete shell guidance', async (context) => {
  const library = await temporaryLibrary(context)
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-publish-url-path-'))
  context.after(async () => { await rm(root, { recursive: true, force: true }) })
  const id = SessionId('publish-url-path')
  const session = Session.create(id, [], { version: 0, id, createdAt: 0, cwd: root })
  appendCall(session, 'publish-url-path', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-url-path', { path: 'https://example.com/image.png' }),
    /curl\/wget/u,
  )
})

test('accepts only a supported image downloaded inside the Session workspace', async (context) => {
  const library = await temporaryLibrary(context)
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-publish-'))
  const workspace = join(root, 'workspace')
  const outside = join(root, 'outside.png')
  await mkdir(workspace)
  await writeFile(join(workspace, 'comfy-output.png'), PNG)
  await writeFile(outside, PNG)
  context.after(async () => { await rm(root, { recursive: true, force: true }) })
  const id = SessionId('publish-workspace')
  const session = Session.create(id, [], { version: 0, id, createdAt: 0, cwd: workspace })
  appendCall(session, 'publish-path', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  const value = await preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent,
    'publish-path', { path: 'comfy-output.png' })
  const published = value.images[0]!
  assert.ok(isImageJobId(published.jobId))
  assert.equal(published.mediaType, 'image/png')
  assert.equal(published.name, 'comfy-output.png')
  assert.deepEqual(library.asset(published.jobId).data, PNG)

  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-path', { path: outside }),
    /inside the Session workspace/u,
  )
  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), library, { session } as Agent, 'publish-path', { path: 'https://example.com/x.png' }),
    /curl\/wget/u,
  )
})

test('anchors durable publication metadata to the final text reply at turn end', () => {
  const session = Session.create(SessionId('publish-projection'))
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  const call = appendCall(session, 'publish-projection', PUBLISH_ROLEPLAY_IMAGE_TOOL)
  const publishedRef = {
    jobId: 'image-6f1d2c34-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    mediaType: 'image/png' as const,
    bytes: 128,
    name: 'scene.png',
  }
  const meta = {
    format: 0 as const,
    version: 0 as const,
    sourceEventSeq: call.seq,
    images: [publishedRef],
    caption: '雨夜',
  }
  const result = session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId('publish-projection'),
      content: [{ type: 'text', text: 'published' }],
      isError: false,
    }),
    meta: meta as never,
  }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  const reply = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: [{ type: 'text', text: '她把画递到你面前。' }],
    }),
  }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

  let state = agentRpProjectionDefinition.init()
  for (const event of session.events) state = agentRpProjectionDefinition.apply(state, event)
  const projection = agentRpProjectionDefinition.view(state)
  assert.deepEqual(projection.publishedImages, [{
    id: `published-roleplay-image-${result.seq}`,
    replySeq: reply.seq,
    publishResultSeq: result.seq,
    sourceEventSeq: call.seq,
    images: [publishedRef],
    caption: '雨夜',
  }])
  assert.deepEqual(parsePublishedRoleplayImageMeta(meta as never), meta)
})

test('rejects replay metadata that still carries attachment-shaped images', () => {
  const legacy = {
    format: 0,
    version: 0,
    sourceEventSeq: 1,
    images: [{
      attachmentId: 'sha256:legacy',
      mediaType: 'image/png',
      bytes: 128,
      width: 32,
      height: 24,
    }],
  }
  assert.equal(parsePublishedRoleplayImageMeta(legacy as never), undefined)
})
