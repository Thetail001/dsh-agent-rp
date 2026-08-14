import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GeneratedImageLibrary } from '../src/generated-image-library.ts'
import { generateImage } from '../src/image-generation-providers.ts'
import { parseImageGenerationRequest } from '../src/image-generation-protocol.ts'
import { DEFAULT_AGENT_RP_SETTINGS } from '../src/workspace-settings.ts'

const request = {
  format: 0 as const,
  jobId: 'image-12345678-1234-4123-8123-123456789abc',
  mode: 'scene' as const,
  prompt: '雨夜书店里的两个人',
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

test('validates image command requests and persists a completed asset', (t) => {
  assert.deepEqual(parseImageGenerationRequest(JSON.stringify(request)), request)
  assert.throws(() => parseImageGenerationRequest({ ...request, prompt: ' ' }))
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-generated-image-'))
  t.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new GeneratedImageLibrary({ root })
  assert.equal(library.begin(request, 'openai').status, 'queued')
  assert.equal(library.progress(request.jobId, .4, '正在绘制').progress, .4)
  const completed = library.complete(request.jobId, { data: png, mediaType: 'image/png' })
  assert.equal(completed.status, 'completed')
  assert.deepEqual(library.asset(request.jobId).data, png)
})

test('reads a base64 image from an OpenAI-compatible response', async () => {
  const original = globalThis.fetch
  let submitted: unknown
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    submitted = JSON.parse(String(init?.body)) as unknown
    return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(png).toString('base64') }] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const stages: string[] = []
    const result = await generateImage(
      DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      'test-key',
      request.prompt,
      new AbortController().signal,
      (_progress, phase) => { stages.push(phase) },
    )
    assert.deepEqual(result.data, png)
    assert.deepEqual(submitted, {
      model: 'gpt-image-1', prompt: request.prompt, n: 1, size: '1024x1024',
    })
    assert.deepEqual(stages, ['正在连接 OpenAI Images', '正在接收图片'])
  } finally {
    globalThis.fetch = original
  }
})

test('submits configured dimensions to A1111 or Forge', async () => {
  const original = globalThis.fetch
  let submitted: Record<string, unknown> | undefined
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).endsWith('/sdapi/v1/txt2img')) submitted = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({ images: [Buffer.from(png).toString('base64')] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const settings = {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'a1111' as const,
      a1111: { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111, width: 640, height: 896 },
    }
    const result = await generateImage(settings, undefined, request.prompt, new AbortController().signal, () => {})
    assert.deepEqual(result.data, png)
    assert.equal(submitted?.width, 640)
    assert.equal(submitted?.height, 896)
    assert.equal(submitted?.prompt, request.prompt)
  } finally {
    globalThis.fetch = original
  }
})
