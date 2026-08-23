import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { zipSync } from 'fflate'
import { GeneratedImageLibrary } from '../src/generated-image-library.ts'
import { generateImage, testImageProvider } from '../src/image-generation-providers.ts'
import { imageCredentialRefName, parseImageGenerationRequest } from '../src/image-generation-protocol.ts'
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

test('keeps image provider credentials in independent Host slots', () => {
  assert.equal(imageCredentialRefName('openai'), 'DSH_AGENT_RP_IMAGE_API_KEY')
  assert.equal(imageCredentialRefName('dashscope'), 'DSH_AGENT_RP_DASHSCOPE_API_KEY')
  assert.equal(imageCredentialRefName('novelai'), 'DSH_AGENT_RP_NOVELAI_API_KEY')
  assert.equal(imageCredentialRefName('a1111'), 'DSH_AGENT_RP_A1111_API_KEY')
  assert.equal(imageCredentialRefName('comfyui'), 'DSH_AGENT_RP_COMFYUI_API_KEY')
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

test('submits a Qwen Image 3.0 request and saves its temporary image URL', async () => {
  const original = globalThis.fetch
  let submitted: {
    readonly url: string
    readonly authorization: string | null
    readonly body: Record<string, unknown>
  } | undefined
  const imageUrl = 'https://example.aliyuncs.com/generated/scene.png'
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === imageUrl) {
      return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })
    }
    submitted = {
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization'),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    }
    return new Response(JSON.stringify({
      output: { choices: [{ message: { content: [{ image: imageUrl }] } }] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const settings = {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'dashscope' as const,
      dashscope: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.dashscope,
        endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        size: '1024*1536' as const,
        negativePrompt: '模糊，变形',
      },
    }
    const stages: string[] = []
    const result = await generateImage(
      settings, 'dashscope-key', request.prompt, new AbortController().signal,
      (_progress, phase) => { stages.push(phase) },
    )
    assert.deepEqual(result.data, png)
    assert.equal(submitted?.url, settings.dashscope.endpoint)
    assert.equal(submitted?.authorization, 'Bearer dashscope-key')
    assert.deepEqual(submitted?.body, {
      model: 'qwen-image-3.0',
      input: { messages: [{ role: 'user', content: [{ text: request.prompt }] }] },
      parameters: {
        prompt_extend: true,
        prompt_extend_mode: 'direct',
        enable_thinking: true,
        n: 1,
        size: '1024*1536',
        negative_prompt: '模糊，变形',
        watermark: false,
      },
    })
    assert.deepEqual(stages, ['正在提交阿里云百炼图片任务', '正在保存百炼图片到本机'])
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

test('submits a NovelAI V4.5 request and extracts its zipped image', async () => {
  const original = globalThis.fetch
  let requested: { readonly authorization: string | null; readonly body: Record<string, unknown> } | undefined
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requested = {
      authorization: new Headers(init?.headers).get('authorization'),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    }
    return new Response(zipSync({ 'image_0.png': png }), {
      status: 200, headers: { 'content-type': 'application/zip' },
    })
  }) as typeof fetch
  try {
    const settings = {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'novelai' as const,
      novelai: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai,
        width: 1024,
        height: 1024,
        negativePrompt: '低清晰度',
      },
    }
    const stages: string[] = []
    const result = await generateImage(
      settings, 'novel-token', request.prompt, new AbortController().signal,
      (_progress, phase) => { stages.push(phase) },
    )
    assert.deepEqual(result.data, png)
    assert.equal(requested?.authorization, 'Bearer novel-token')
    assert.equal(requested?.body.model, 'nai-diffusion-4-5-full')
    assert.equal(requested?.body.input, request.prompt)
    assert.equal(requested?.body.action, 'generate')
    const parameters = requested?.body.parameters as Record<string, unknown>
    assert.equal(parameters.width, 1024)
    assert.equal(parameters.height, 1024)
    assert.equal(parameters.negative_prompt, '低清晰度')
    assert.deepEqual((parameters.v4_prompt as { readonly caption: unknown }).caption, {
      base_caption: request.prompt, char_captions: [],
    })
    assert.deepEqual(stages, ['正在提交 NovelAI V4.5 任务', '正在解压 NovelAI 图片'])
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

test('checks a DashScope workspace and model without generating an image', async () => {
  const original = globalThis.fetch
  let requested: { readonly url: string; readonly authorization: string | null } | undefined
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requested = { url: String(input), authorization: new Headers(init?.headers).get('authorization') }
    return new Response(JSON.stringify({
      success: true,
      output: { total: 1, page_no: 1, page_size: 1, models: [{ model: 'qwen-image-3.0' }] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const settings = {
      ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration,
      provider: 'dashscope' as const,
      dashscope: {
        ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration.dashscope,
        endpoint: 'https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      },
    }
    const result = await testImageProvider(settings, 'dashscope-key', new AbortController().signal)
    assert.deepEqual(result, {
      status: 'verified', detail: '百炼 API Key、地域和图片模型均可用；测试没有生成图片',
    })
    assert.deepEqual(requested, {
      url: 'https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/models?model=qwen-image-3.0&capabilities=IG&page_no=1&page_size=1&language=zh-CN',
      authorization: 'Bearer dashscope-key',
    })
  } finally {
    globalThis.fetch = original
  }
})

test('verifies a NovelAI token through subscription without spending Anlas', async () => {
  const original = globalThis.fetch
  let requested: { readonly url: string; readonly authorization: string | null } | undefined
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requested = { url: String(input), authorization: new Headers(init?.headers).get('authorization') }
    return new Response(JSON.stringify({ tier: 2 }), { status: 200 })
  }) as typeof fetch
  try {
    const settings = { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration, provider: 'novelai' as const }
    const result = await testImageProvider(settings, 'novel-token', new AbortController().signal)
    assert.deepEqual(result, {
      status: 'verified', detail: 'NovelAI Access Token 和订阅均可用；测试没有消耗 Anlas',
    })
    assert.deepEqual(requested, {
      url: 'https://api.novelai.net/user/subscription', authorization: 'Bearer novel-token',
    })
  } finally {
    globalThis.fetch = original
  }
})

test('reports actionable NovelAI authentication and quota failures', async () => {
  const original = globalThis.fetch
  try {
    const settings = { ...DEFAULT_AGENT_RP_SETTINGS.imageGeneration, provider: 'novelai' as const }
    globalThis.fetch = (async () => new Response('{"message":"Unauthorized"}', { status: 401 })) as typeof fetch
    await assert.rejects(
      testImageProvider(settings, 'expired-token', new AbortController().signal),
      /NovelAI Access Token 无效或已失效/u,
    )
    globalThis.fetch = (async () => new Response('{"message":"Payment Required"}', { status: 402 })) as typeof fetch
    await assert.rejects(
      generateImage(settings, 'valid-token', request.prompt, new AbortController().signal, () => {}),
      /NovelAI 订阅或 Anlas 额度不足/u,
    )
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
