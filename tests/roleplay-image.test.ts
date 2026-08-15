import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { AttachmentStore, ImageAttachmentRef, SaveImageAttachment } from '@deepseek-ai/dsh-attachment'
import { CallId, createAssistantMessage, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { agentRpProjectionDefinition } from '../src/projection.ts'
import {
  parsePublishedRoleplayImageMeta,
  preparePublishedRoleplayImage,
  PUBLISH_ROLEPLAY_IMAGE_TOOL,
} from '../src/roleplay-image.ts'

const nativeImage: ImageAttachmentRef = {
  attachmentId: 'sha256:native-image' as never,
  mediaType: 'image/png',
  bytes: 128,
  width: 32,
  height: 24,
  name: 'native.png',
}

function fakeStore(onSave?: (input: SaveImageAttachment) => void): AttachmentStore {
  return {
    imageLimits: {
      maxImageBytes: 1_000_000,
      maxImagesPerMessage: 4,
      maxMessageImageBytes: 4_000_000,
      maxImagePixels: 10_000_000,
      mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    },
    async saveImage(input: SaveImageAttachment) {
      onSave?.(input)
      return {
        attachmentId: 'sha256:saved-image' as never,
        mediaType: input.mediaType,
        bytes: input.data.byteLength,
        width: 1,
        height: 1,
        ...(input.name === undefined ? {} : { name: input.name }),
      }
    },
  } as unknown as AttachmentStore
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

test('claims the latest unpublished native image returned earlier in the same turn', async () => {
  const session = Session.create(SessionId('publish-native'))
  const generate = appendCall(session, 'generate-1', 'configured_image_mcp')
  const result = appendResult(session, 'generate-1', [{ type: 'image', attachment: nativeImage }], generate.seq)
  appendCall(session, 'publish-1', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  const value = await preparePublishedRoleplayImage(fakeStore(), { session } as Agent, 'publish-1', {
    caption: '  窗边的雨夜  ',
  })

  assert.equal(value.sourceEventSeq, result.seq)
  assert.equal(value.sourceCallId, 'generate-1')
  assert.deepEqual(value.images, [nativeImage])
  assert.equal(value.caption, '窗边的雨夜')
})

test('requires URL output to be downloaded before publication', async () => {
  const session = Session.create(SessionId('publish-url'))
  const generate = appendCall(session, 'generate-url', 'configured_image_mcp')
  appendResult(session, 'generate-url', [{ type: 'text', text: 'https://signed.example/image.png' }], generate.seq)
  appendCall(session, 'publish-url', PUBLISH_ROLEPLAY_IMAGE_TOOL)

  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), { session } as Agent, 'publish-url', {}),
    /download it into the Session workspace/u,
  )
})

test('accepts only a supported image downloaded inside the Session workspace', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-publish-'))
  const workspace = join(root, 'workspace')
  const outside = join(root, 'outside.png')
  await mkdir(workspace)
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
  await writeFile(join(workspace, 'comfy-output.png'), png)
  await writeFile(outside, png)
  context.after(async () => { await rm(root, { recursive: true, force: true }) })
  const id = SessionId('publish-workspace')
  const session = Session.create(id, [], { version: 0, id, createdAt: 0, cwd: workspace })
  appendCall(session, 'publish-path', PUBLISH_ROLEPLAY_IMAGE_TOOL)
  let saved: SaveImageAttachment | undefined

  const value = await preparePublishedRoleplayImage(fakeStore(input => { saved = input }), { session } as Agent,
    'publish-path', { path: 'comfy-output.png' })
  assert.equal(saved?.mediaType, 'image/png')
  assert.equal(saved?.name, 'comfy-output.png')
  assert.equal(value.images[0]?.attachmentId, 'sha256:saved-image')
  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), { session } as Agent, 'publish-path', { path: outside }),
    /inside the Session workspace/u,
  )
  await assert.rejects(
    preparePublishedRoleplayImage(fakeStore(), { session } as Agent, 'publish-path', { path: 'https://example.com/x.png' }),
    /not a URL/u,
  )
})

test('anchors durable publication metadata to the final text reply at turn end', () => {
  const session = Session.create(SessionId('publish-projection'))
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  const call = appendCall(session, 'publish-projection', PUBLISH_ROLEPLAY_IMAGE_TOOL)
  const meta = {
    format: 0 as const,
    version: 0 as const,
    sourceEventSeq: call.seq,
    images: [nativeImage],
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
    images: [nativeImage],
    caption: '雨夜',
  }])
  assert.deepEqual(parsePublishedRoleplayImageMeta(meta as never), meta)
})
