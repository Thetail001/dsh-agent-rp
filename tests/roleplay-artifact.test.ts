import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { AttachmentId, type ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { CallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, type JsonValue } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRegistry from '@deepseek-ai/dsh-tools'
import {
  installRoleplayArtifactCapability,
  readRoleplayArtifactStageRecord,
  readStagedRoleplayArtifacts,
  ROLEPLAY_ARTIFACT_STAGE_TOOL,
} from '../src/roleplay-artifact.ts'

const IMAGE: ImageAttachmentRef = {
  attachmentId: AttachmentId('sha256:roleplay-artifact-fixture'),
  mediaType: 'image/png',
  bytes: 68,
  width: 1,
  height: 1,
  name: 'scene.png',
}

function openSession(id: string): { readonly session: Session; readonly agent: Agent } {
  const session = Session.create(SessionId(id))
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  return { session, agent: { session } as Agent }
}

function appendCall(session: Session, callId: string, name: string, args: unknown): number {
  return session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId(callId),
    name,
    arguments: JSON.stringify(args),
  }).seq
}

function appendResult(
  session: Session,
  callId: string,
  callSeq: number,
  meta: JsonValue | undefined,
): number {
  return session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: [{ type: 'text', text: 'ok' }],
      isError: false,
    }),
    ...(meta === undefined ? {} : { meta }),
  }, { surfaceOp: 'append', sourceEventSeqs: [callSeq] }).seq
}

async function mounted(): Promise<Context> {
  const ctx = new Context()
  ctx.provide('attachments' as never, {
    readImage: (ref: ImageAttachmentRef) => Promise.resolve({ ref, data: new Uint8Array(IMAGE.bytes) }),
  } as never)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRegistry)
  installRoleplayArtifactCapability(ctx)
  return ctx
}

test('stages one explicit same-turn durable artifact and replays its provenance', async (context) => {
  const ctx = await mounted()
  context.after(async () => { await ctx.fiber.dispose() })
  const { session, agent } = openSession('stage-artifact')
  const sourceCallSeq = appendCall(session, 'image-1', 'generate_image', { prompt: '雨夜钟楼' })
  const sourceResultSeq = appendResult(session, 'image-1', sourceCallSeq, {
    format: 'dsh.tool-artifacts',
    version: 0,
    artifacts: [{ type: 'image', attachment: IMAGE }],
  } as unknown as JsonValue)
  const stageCallSeq = appendCall(session, 'stage-1', ROLEPLAY_ARTIFACT_STAGE_TOOL, {
    artifactId: String(IMAGE.attachmentId),
    caption: '雨落在钟楼外。',
  })

  const result = await ctx.tools.execute({
    callId: CallId('stage-1'),
    name: ROLEPLAY_ARTIFACT_STAGE_TOOL,
    arguments: { artifactId: String(IMAGE.attachmentId), caption: '  雨落在钟楼外。  ' },
    agent,
    signal: new AbortController().signal,
  })

  assert.equal(result.isError, false)
  if (result.isError) throw new Error('staging unexpectedly failed')
  const record = readRoleplayArtifactStageRecord(result.meta)
  assert.deepEqual(record, {
    format: 'agent-rp.staged-artifact',
    version: 0,
    artifact: { type: 'image', attachment: IMAGE },
    sourceResultSeq,
    sourceCallId: 'image-1',
    sourceToolName: 'generate_image',
    caption: '雨落在钟楼外。',
  })
  const stageResultSeq = appendResult(session, 'stage-1', stageCallSeq, result.meta)
  assert.deepEqual(readStagedRoleplayArtifacts(session.events, 1, stageResultSeq + 1), [record])
})

test('rejects paths, old-turn ids, and unrecorded artifacts instead of guessing', async (context) => {
  const ctx = await mounted()
  context.after(async () => { await ctx.fiber.dispose() })
  const { session, agent } = openSession('reject-artifact')
  appendCall(session, 'stage-path', ROLEPLAY_ARTIFACT_STAGE_TOOL, { artifactId: 'C:\\scene.png' })
  const pathResult = await ctx.tools.execute({
    callId: CallId('stage-path'),
    name: ROLEPLAY_ARTIFACT_STAGE_TOOL,
    arguments: { artifactId: 'C:\\scene.png' },
    agent,
    signal: new AbortController().signal,
  })
  assert.equal(pathResult.isError, true)

  appendCall(session, 'stage-missing', ROLEPLAY_ARTIFACT_STAGE_TOOL, { artifactId: 'sha256:missing' })
  const missing = await ctx.tools.execute({
    callId: CallId('stage-missing'),
    name: ROLEPLAY_ARTIFACT_STAGE_TOOL,
    arguments: { artifactId: 'sha256:missing' },
    agent,
    signal: new AbortController().signal,
  })
  assert.equal(missing.isError, true)
  assert.match(missing.content[0]?.type === 'text' ? missing.content[0].text : '', /not available/u)
})
