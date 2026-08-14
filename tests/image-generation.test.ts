import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GeneratedImageLibrary } from '../src/generated-image-library.ts'
import { generateImage, testImageProvider } from '../src/image-generation-providers.ts'
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

test('checks OpenAI-compatible credentials without generating an image', async () => {
  const original = globalThis.fetch
  let requested: { readonly url: string; readonly method: string; readonly authorization?: string } | undefined
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    const authorization = headers.get('authorization')
    requested = {
      url: String(input), method: init?.method ?? 'GET',
      ...(authorization === null ? {} : { authorization }),
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const result = await testImageProvider(DEFAULT_AGENT_RP_SETTINGS.imageGeneration, 'test-key', new AbortController().signal)
    assert.deepEqual(result, { status: 'verified', detail: '图片服务和密钥均可用；测试没有生成图片' })
    assert.deepEqual(requested, {
      url: 'https://api.openai.com/v1/models', method: 'GET', authorization: 'Bearer test-key',
    })
  } finally {
    globalThis.fetch = original
  }
})

test('checks A1111 through its sampler catalog', async () => {
  const original = globalThis.fetch
  let requested: string | undefined
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested = String(input)
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const settings = { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration, provider: 'a1111' as const }
    const result = await testImageProvider(settings, undefined, new AbortController().signal)
    assert.equal(result.status, 'verified')
    assert.equal(requested, 'http://127.0.0.1:7860/sdapi/v1/samplers')
  } finally {
    globalThis.fetch = original
  }
})

test('checks ComfyUI without submitting its configured workflow', async () => {
  const original = globalThis.fetch
  let requested: string | undefined
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested = String(input)
    return new Response(JSON.stringify({ system: {} }), { status: 200 })
  }) as typeof fetch
  try {
    const settings = { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration, provider: 'comfyui' as const }
    const result = await testImageProvider(settings, undefined, new AbortController().signal)
    assert.deepEqual(result, { status: 'reachable', detail: 'ComfyUI 已连接；还需要粘贴“API 格式”的工作流' })
    assert.equal(requested, 'http://127.0.0.1:8188/system_stats')
  } finally {
    globalThis.fetch = original
  }
})

test('submits a parameterized ComfyUI workflow and downloads its output', async () => {
  const original = globalThis.fetch
  let submitted: Record<string, unknown> | undefined
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/prompt') {
      submitted = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ prompt_id: 'prompt-1' }), { status: 200 })
    }
    if (url.pathname === '/history/prompt-1') {
      return new Response(JSON.stringify({
        'prompt-1': {
          outputs: { 9: { images: [{ filename: 'scene.png', subfolder: 'agent-rp', type: 'output' }] } },
          status: { completed: true, status_str: 'success' },
        },
      }), { status: 200 })
    }
    assert.equal(url.pathname, '/view')
    assert.equal(url.searchParams.get('filename'), 'scene.png')
    assert.equal(url.searchParams.get('subfolder'), 'agent-rp')
    assert.equal(url.searchParams.get('type'), 'output')
    return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })
  }) as typeof fetch
  try {
    const settings = {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'comfyui' as const,
      comfyui: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui,
        width: 640,
        height: 896,
        negativePrompt: '模糊',
        workflow: JSON.stringify({
          1: { class_type: 'CLIPTextEncode', inputs: { text: '场景：{{prompt}}', negative: '{{negative_prompt}}' } },
          2: { class_type: 'EmptyLatentImage', inputs: { width: '{{width}}', height: '{{height}}', seed: '{{seed}}' } },
        }),
      },
    }
    const stages: string[] = []
    const result = await generateImage(
      settings, undefined, request.prompt, new AbortController().signal,
      (_progress, phase) => { stages.push(phase) },
    )
    assert.deepEqual(result.data, png)
    const workflow = submitted?.prompt as Record<string, { readonly inputs: Record<string, unknown> }>
    assert.equal(workflow['1']?.inputs.text, `场景：${request.prompt}`)
    assert.equal(workflow['1']?.inputs.negative, '模糊')
    assert.equal(workflow['2']?.inputs.width, 640)
    assert.equal(workflow['2']?.inputs.height, 896)
    assert.equal(typeof workflow['2']?.inputs.seed, 'number')
    assert.deepEqual(stages, ['正在提交 ComfyUI 工作流', 'ComfyUI 已接受任务', '正在保存 ComfyUI 图片'])
  } finally {
    globalThis.fetch = original
  }
})

test('describes an unreachable image service without exposing fetch internals', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
  try {
    const settings = { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration, provider: 'a1111' as const }
    await assert.rejects(
      testImageProvider(settings, undefined, new AbortController().signal),
      /A1111 \/ Forge 无法连接；请检查接口地址、网络或服务状态/u,
    )
  } finally {
    globalThis.fetch = original
  }
})
