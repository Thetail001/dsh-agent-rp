/** Provider adapters for user-triggered roleplay image generation. */

import { unzipSync } from 'fflate'
import type { ImageGenerationSettings } from './workspace-settings.ts'
import type { GeneratedImageAsset } from './generated-image-library.ts'
import type { ImageProviderTestResult } from './image-generation-protocol.ts'

const MAX_PROVIDER_IMAGE_BYTES = 32 * 1024 * 1024
const MAX_NOVELAI_ARCHIVE_BYTES = 40 * 1024 * 1024

/** Provider progress callback normalized to zero through one. */
export type ImageGenerationProgress = (progress: number, phase: string) => void

function endpoint(value: string, suffix: string): URL {
  const parsed = new URL(value)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('图片服务地址必须使用 http 或 https')
  if (parsed.username !== '' || parsed.password !== '') throw new Error('图片服务地址不能包含用户名或密码')
  if (parsed.hash !== '') throw new Error('图片服务地址不能包含片段')
  if (parsed.pathname === '/' || parsed.pathname === '') parsed.pathname = suffix
  return parsed
}

function serviceEndpoint(value: string, suffix: string): URL {
  const parsed = new URL(value)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('图片服务地址必须使用 http 或 https')
  if (parsed.username !== '' || parsed.password !== '') throw new Error('图片服务地址不能包含用户名或密码')
  if (parsed.hash !== '' || parsed.search !== '') throw new Error('图片服务地址不能包含查询参数或片段')
  parsed.pathname = `${parsed.pathname.replace(/\/+$/u, '')}${suffix}`
  return parsed
}

function providerError(provider: string, status: number, body: string): Error {
  let detail = body.trim().slice(0, 800)
  try {
    const parsed = JSON.parse(body) as {
      readonly error?: { readonly message?: unknown } | string
      readonly detail?: unknown
      readonly message?: unknown
    }
    const message = typeof parsed.error === 'string' ? parsed.error
      : typeof parsed.error?.message === 'string' ? parsed.error.message
        : typeof parsed.detail === 'string' ? parsed.detail
          : typeof parsed.message === 'string' ? parsed.message : undefined
    if (message !== undefined) detail = message.slice(0, 800)
  } catch {
    // The provider returned plain text; the bounded body is already safe to report.
  }
  return new Error(`${provider} 请求失败（${status}）${detail === '' ? '' : `：${detail}`}`)
}

function novelAiError(status: number, body: string): Error {
  if (status === 401) return new Error('NovelAI Access Token 无效或已失效')
  if (status === 402) return new Error('NovelAI 订阅或 Anlas 额度不足')
  if (status === 429) return new Error('NovelAI 请求过于频繁，请稍后再试')
  return providerError('NovelAI', status, body)
}

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // The connection check has already received the response; closing an absent body adds no result.
  }
}

function openAiModelsEndpoint(value: string): URL {
  const url = endpoint(value, '/v1/images/generations')
  if (/\/images\/generations\/?$/u.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/images\/generations\/?$/u, '/models')
  } else {
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/models`
  }
  url.search = ''
  return url
}

function dashscopeModelsEndpoint(value: string, model: string): URL {
  const url = endpoint(value, '/api/v1/services/aigc/multimodal-generation/generation')
  url.pathname = '/api/v1/models'
  url.search = ''
  url.searchParams.set('model', model)
  url.searchParams.set('capabilities', 'IG')
  url.searchParams.set('page_no', '1')
  url.searchParams.set('page_size', '1')
  url.searchParams.set('language', 'zh-CN')
  return url
}

async function fetchConnection(provider: string, url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (reason) {
    if (init.signal?.aborted === true) throw new Error(`${provider} 连接超时（12 秒）`, { cause: reason })
    throw new Error(`${provider} 无法连接；请检查接口地址、网络或服务状态`, { cause: reason })
  }
}

/** Check one configured provider without submitting an image generation job. */
export async function testImageProvider(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  signal: AbortSignal,
): Promise<ImageProviderTestResult> {
  if (settings.provider === 'openai') {
    if (apiKey === undefined) throw new Error('请先保存图片服务密钥')
    const response = await fetchConnection('图片服务', openAiModelsEndpoint(settings.openai.endpoint), {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' }, signal,
    })
    if (response.status === 404 || response.status === 405) {
      await discard(response)
      return { status: 'reachable', detail: '图片服务可以连接，但没有提供模型列表；密钥权限尚未验证' }
    }
    if (!response.ok) throw providerError('图片服务连接测试', response.status, await response.text())
    await discard(response)
    return { status: 'verified', detail: '图片服务和密钥均可用；测试没有生成图片' }
  }
  if (settings.provider === 'dashscope') {
    if (apiKey === undefined) throw new Error('请先保存阿里云百炼 API Key')
    const value = settings.dashscope
    const response = await fetchConnection(
      '阿里云百炼',
      dashscopeModelsEndpoint(value.endpoint, value.model),
      { headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' }, signal },
    )
    if (response.status === 404 || response.status === 405) {
      await discard(response)
      return { status: 'reachable', detail: '百炼服务可以连接，但此域名没有提供模型列表；密钥与地域尚未验证' }
    }
    const body = await response.text()
    if (!response.ok) throw providerError('百炼连接测试', response.status, body)
    let models: unknown
    try {
      models = (JSON.parse(body) as { readonly output?: { readonly models?: unknown } }).output?.models
    } catch {
      return { status: 'reachable', detail: '百炼服务可以连接，但模型列表格式无法识别；测试没有生成图片' }
    }
    if (!Array.isArray(models)) {
      return { status: 'reachable', detail: '百炼服务可以连接，但模型列表格式无法识别；测试没有生成图片' }
    }
    if (!models.some(item => typeof item === 'object' && item !== null
      && (item as { readonly model?: unknown }).model === value.model)) {
      return { status: 'reachable', detail: `API Key 可以连接，但当前地域没有返回模型 ${value.model}` }
    }
    return { status: 'verified', detail: '百炼 API Key、地域和图片模型均可用；测试没有生成图片' }
  }
  if (settings.provider === 'novelai') {
    if (apiKey === undefined) throw new Error('请先保存 NovelAI Access Token')
    const generateUrl = endpoint(settings.novelai.endpoint, '/ai/generate-image')
    const headers = { authorization: `Bearer ${apiKey}`, accept: 'application/json' }
    if (generateUrl.hostname.toLowerCase() === 'image.novelai.net') {
      const response = await fetchConnection('NovelAI', new URL('https://api.novelai.net/user/subscription'), {
        headers, signal,
      })
      if (!response.ok) throw novelAiError(response.status, await response.text())
      await discard(response)
      return { status: 'verified', detail: 'NovelAI Access Token 和订阅均可用；测试没有消耗 Anlas' }
    }
    const response = await fetchConnection('NovelAI', new URL('/', generateUrl), { headers, signal })
    await discard(response)
    return { status: 'reachable', detail: '自定义 NovelAI 服务可以连接；订阅与 Token 权限尚未验证' }
  }
  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`
  if (settings.provider === 'comfyui') {
    const response = await fetchConnection('ComfyUI', serviceEndpoint(settings.comfyui.endpoint, '/system_stats'), {
      headers, signal,
    })
    if (!response.ok) throw providerError('ComfyUI 连接测试', response.status, await response.text())
    await discard(response)
    if (settings.comfyui.workflow.trim() === '') {
      return { status: 'reachable', detail: 'ComfyUI 已连接；还需要粘贴“API 格式”的工作流' }
    }
    renderComfyWorkflow(settings, '连接测试')
    return { status: 'verified', detail: 'ComfyUI 和 API 工作流均可用；测试没有提交绘图任务' }
  }
  const url = endpoint(settings.a1111.endpoint, '/sdapi/v1/samplers')
  url.pathname = url.pathname.replace(/\/sdapi\/v1\/txt2img$/u, '/sdapi/v1/samplers')
  const response = await fetchConnection('A1111 / Forge', url, { headers, signal })
  if (!response.ok) throw providerError('A1111 / Forge 连接测试', response.status, await response.text())
  await discard(response)
  return { status: 'verified', detail: 'A1111 / Forge 已连接；测试没有生成图片' }
}

function decodeImageBytes(data: Uint8Array): GeneratedImageAsset {
  if (data.byteLength < 8 || data.byteLength > MAX_PROVIDER_IMAGE_BYTES) throw new Error('图片服务返回了无效大小的图片')
  let mediaType: GeneratedImageAsset['mediaType']
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) mediaType = 'image/png'
  else if (data[0] === 0xff && data[1] === 0xd8) mediaType = 'image/jpeg'
  else if (String.fromCharCode(...data.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...data.slice(8, 12)) === 'WEBP') mediaType = 'image/webp'
  else throw new Error('图片服务返回了不支持的图片格式')
  return { data, mediaType }
}

function decodeBase64Image(value: string): GeneratedImageAsset {
  const payload = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/iu, '')
  return decodeImageBytes(new Uint8Array(Buffer.from(payload, 'base64')))
}

function extractNovelAiImage(archive: Uint8Array): GeneratedImageAsset {
  let selected = false
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(archive, {
      filter: file => {
        if (selected || !/\.(?:png|jpe?g|webp)$/iu.test(file.name)) return false
        if (file.originalSize < 8 || file.originalSize > MAX_PROVIDER_IMAGE_BYTES) {
          throw new Error('NovelAI 返回的图片大小无效')
        }
        selected = true
        return true
      },
    })
  } catch (error) {
    if (error instanceof Error && /NovelAI/u.test(error.message)) throw error
    throw new Error('NovelAI 返回的 ZIP 无法解压', { cause: error })
  }
  const image = Object.values(files)[0]
  if (image === undefined) throw new Error('NovelAI 返回的 ZIP 中没有可用图片')
  return decodeImageBytes(image)
}

async function readRemoteImage(url: string, signal: AbortSignal): Promise<GeneratedImageAsset> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('图片服务返回了不支持的下载地址')
  const response = await fetch(parsed, { signal })
  if (!response.ok) throw providerError('图片下载', response.status, await response.text())
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_PROVIDER_IMAGE_BYTES) throw new Error('图片服务返回的图片过大')
  return decodeBase64Image(Buffer.from(await response.arrayBuffer()).toString('base64'))
}

async function generateOpenAi(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  if (apiKey === undefined) throw new Error('请先在 Agent RP 设置中填写图片服务密钥')
  progress(0.08, '正在连接 OpenAI Images')
  const response = await fetch(endpoint(settings.openai.endpoint, '/v1/images/generations'), {
    method: 'POST', signal,
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: settings.openai.model, prompt, n: 1, size: settings.openai.size }),
  })
  const body = await response.text()
  if (!response.ok) throw providerError('OpenAI Images', response.status, body)
  progress(0.9, '正在接收图片')
  let value: { readonly data?: readonly { readonly b64_json?: unknown; readonly url?: unknown }[] }
  try {
    value = JSON.parse(body) as typeof value
  } catch {
    throw new Error('OpenAI Images 返回了无法识别的结果')
  }
  const image = value.data?.[0]
  if (typeof image?.b64_json === 'string') return decodeBase64Image(image.b64_json)
  if (typeof image?.url === 'string') return readRemoteImage(image.url, signal)
  throw new Error('OpenAI Images 没有返回图片')
}

async function generateDashscope(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  if (apiKey === undefined) throw new Error('请先在 Agent RP 设置中填写阿里云百炼 API Key')
  const value = settings.dashscope
  const parameters = {
    prompt_extend: value.promptExtend,
    prompt_extend_mode: value.promptExtendMode,
    enable_thinking: value.enableThinking,
    n: 1,
    ...(value.size === 'auto' ? {} : { size: value.size }),
    ...(value.negativePrompt.trim() === '' ? {} : { negative_prompt: value.negativePrompt }),
    watermark: value.watermark,
  }
  progress(0.08, '正在提交阿里云百炼图片任务')
  const response = await fetchConnection('阿里云百炼', endpoint(
    value.endpoint,
    '/api/v1/services/aigc/multimodal-generation/generation',
  ), {
    method: 'POST', signal,
    headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: value.model,
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters,
    }),
  })
  const body = await response.text()
  if (!response.ok) throw providerError('阿里云百炼图片生成', response.status, body)
  let parsed: { readonly output?: { readonly choices?: readonly unknown[] } }
  try {
    parsed = JSON.parse(body) as typeof parsed
  } catch {
    throw new Error('阿里云百炼返回了无法识别的结果')
  }
  const choices = parsed.output?.choices
  if (!Array.isArray(choices)) throw new Error('阿里云百炼没有返回图片')
  for (const choice of choices) {
    if (typeof choice !== 'object' || choice === null) continue
    const message = (choice as { readonly message?: unknown }).message
    if (typeof message !== 'object' || message === null) continue
    const content = (message as { readonly content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const item of content) {
      if (typeof item !== 'object' || item === null) continue
      const image = (item as { readonly image?: unknown }).image
      if (typeof image !== 'string') continue
      progress(0.9, '正在保存百炼图片到本机')
      return readRemoteImage(image, signal)
    }
  }
  throw new Error('阿里云百炼没有返回图片')
}

async function generateNovelAi(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  if (apiKey === undefined) throw new Error('请先在 Agent RP 设置中填写 NovelAI Access Token')
  const value = settings.novelai
  const seed = Math.floor(Math.random() * 4_294_967_296)
  const parameters = {
    params_version: 3,
    width: value.width,
    height: value.height,
    scale: value.scale,
    sampler: value.sampler,
    steps: value.steps,
    n_samples: 1,
    ucPreset: 3,
    qualityToggle: value.quality,
    sm: value.smea,
    sm_dyn: value.smea && value.smeaDyn,
    dynamic_thresholding: false,
    controlnet_strength: 1,
    legacy: false,
    legacy_uc: false,
    add_original_image: false,
    cfg_rescale: value.cfgRescale,
    noise_schedule: value.noiseSchedule,
    legacy_v3_extend: false,
    prefer_brownian: true,
    deliberate_euler_ancestral_bug: false,
    negative_prompt: value.negativePrompt,
    seed,
    characterPrompts: [],
    reference_image_multiple: [],
    reference_information_extracted_multiple: [],
    reference_strength_multiple: [],
    v4_prompt: {
      caption: { base_caption: prompt, char_captions: [] },
      use_coords: false,
      use_order: true,
    },
    v4_negative_prompt: {
      caption: { base_caption: value.negativePrompt, char_captions: [] },
      legacy_uc: false,
    },
  }
  progress(0.08, '正在提交 NovelAI V4.5 任务')
  const response = await fetchConnection('NovelAI', endpoint(value.endpoint, '/ai/generate-image'), {
    method: 'POST', signal,
    headers: { authorization: `Bearer ${apiKey}`, accept: 'application/zip', 'content-type': 'application/json' },
    body: JSON.stringify({
      input: prompt,
      model: value.model,
      action: 'generate',
      parameters,
      use_new_shared_trial: true,
    }),
  })
  if (!response.ok) throw novelAiError(response.status, await response.text())
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_NOVELAI_ARCHIVE_BYTES) throw new Error('NovelAI 返回的 ZIP 过大')
  progress(0.9, '正在解压 NovelAI 图片')
  const archive = new Uint8Array(await response.arrayBuffer())
  if (archive.byteLength < 22 || archive.byteLength > MAX_NOVELAI_ARCHIVE_BYTES) {
    throw new Error('NovelAI 返回了无效大小的 ZIP')
  }
  return extractNovelAiImage(archive)
}

async function pollA1111Progress(
  base: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
  settled: () => boolean,
): Promise<void> {
  const url = endpoint(base, '/sdapi/v1/progress')
  url.pathname = url.pathname.replace(/\/sdapi\/v1\/txt2img$/u, '/sdapi/v1/progress')
  while (!settled() && !signal.aborted) {
    await new Promise<void>(resolve => { setTimeout(resolve, 1_200).unref() })
    if (settled() || signal.aborted) return
    try {
      const response = await fetch(url, { headers, signal })
      if (!response.ok) continue
      const value = await response.json() as { readonly progress?: unknown }
      if (typeof value.progress === 'number' && Number.isFinite(value.progress)) {
        progress(0.08 + Math.max(0, Math.min(1, value.progress)) * 0.84, 'Stable Diffusion 正在绘制')
      }
    } catch (error: unknown) {
      if (signal.aborted) return
    }
  }
}

async function interruptA1111(base: string, headers: Record<string, string>): Promise<void> {
  try {
    const url = endpoint(base, '/sdapi/v1/interrupt')
    url.pathname = url.pathname.replace(/\/sdapi\/v1\/txt2img$/u, '/sdapi/v1/interrupt')
    await fetch(url, { method: 'POST', headers })
  } catch {
    // Cancellation is already local; an unavailable optional interrupt endpoint adds no further action.
  }
}

async function generateA1111(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`
  const url = endpoint(settings.a1111.endpoint, '/sdapi/v1/txt2img')
  const body = {
    prompt,
    negative_prompt: settings.a1111.negativePrompt,
    width: settings.a1111.width,
    height: settings.a1111.height,
    steps: settings.a1111.steps,
    cfg_scale: settings.a1111.cfgScale,
    ...(settings.a1111.sampler.trim() === '' ? {} : { sampler_name: settings.a1111.sampler }),
    ...(settings.a1111.model.trim() === '' ? {} : {
      override_settings: { sd_model_checkpoint: settings.a1111.model },
      override_settings_restore_afterwards: true,
    }),
  }
  progress(0.06, '正在提交 Stable Diffusion 任务')
  let settled = false
  const polling = pollA1111Progress(settings.a1111.endpoint, headers, signal, progress, () => settled)
  void polling
  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal })
    const text = await response.text()
    if (!response.ok) throw providerError('A1111 / Forge', response.status, text)
    let value: { readonly images?: readonly unknown[] }
    try {
      value = JSON.parse(text) as typeof value
    } catch {
      throw new Error('A1111 / Forge 返回了无法识别的结果')
    }
    const image = value.images?.[0]
    if (typeof image !== 'string') throw new Error('A1111 / Forge 没有返回图片')
    progress(0.94, '正在保存图片')
    return decodeBase64Image(image)
  } catch (error: unknown) {
    if (signal.aborted) await interruptA1111(settings.a1111.endpoint, headers)
    throw error
  } finally {
    settled = true
  }
}

interface ComfyOutputImage {
  readonly filename: string
  readonly subfolder: string
  readonly type: string
}

function renderComfyWorkflow(settings: ImageGenerationSettings, prompt: string): Readonly<Record<string, unknown>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(settings.comfyui.workflow)
  } catch (error) {
    throw new Error('ComfyUI API 工作流不是有效的 JSON', { cause: error })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('ComfyUI API 工作流必须是节点对象')
  }
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  const replacements = new Map<string, string | number>([
    ['{{prompt}}', prompt],
    ['{{negative_prompt}}', settings.comfyui.negativePrompt],
    ['{{width}}', settings.comfyui.width],
    ['{{height}}', settings.comfyui.height],
    ['{{seed}}', seed],
  ])
  let promptUses = 0
  const replace = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const exact = replacements.get(value)
      if (exact !== undefined) {
        if (value === '{{prompt}}') promptUses += 1
        return exact
      }
      let result = value
      for (const [token, replacement] of replacements) {
        if (result.includes(token)) {
          if (token === '{{prompt}}') promptUses += 1
          result = result.replaceAll(token, () => String(replacement))
        }
      }
      return result
    }
    if (Array.isArray(value)) return value.map(replace)
    if (typeof value !== 'object' || value === null) return value
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]))
  }
  const workflow = replace(parsed) as Readonly<Record<string, unknown>>
  if (promptUses === 0) throw new Error('ComfyUI API 工作流中没有 {{prompt}} 占位符')
  return workflow
}

function comfyOutput(record: unknown): ComfyOutputImage | undefined {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return undefined
  const outputs = (record as Record<string, unknown>).outputs
  if (typeof outputs !== 'object' || outputs === null || Array.isArray(outputs)) return undefined
  for (const output of Object.values(outputs)) {
    if (typeof output !== 'object' || output === null || Array.isArray(output)) continue
    const images = (output as Record<string, unknown>).images
    if (!Array.isArray(images)) continue
    for (const image of images) {
      if (typeof image !== 'object' || image === null || Array.isArray(image)) continue
      const value = image as Record<string, unknown>
      if (typeof value.filename === 'string' && typeof value.subfolder === 'string' && typeof value.type === 'string') {
        return { filename: value.filename, subfolder: value.subfolder, type: value.type }
      }
    }
  }
  return undefined
}

function comfyFailure(record: unknown): string | undefined {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return undefined
  const status = (record as Record<string, unknown>).status
  if (typeof status !== 'object' || status === null || Array.isArray(status)) return undefined
  const value = status as Record<string, unknown>
  if (value.status_str !== 'error' && value.completed !== false) return undefined
  const detail = JSON.stringify(value.messages ?? value.status_str).slice(0, 800)
  return detail === '' ? '工作流执行失败' : detail
}

async function wait(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const completed = (): void => {
      signal.removeEventListener('abort', aborted)
      resolve()
    }
    const timer = setTimeout(completed, ms)
    timer.unref()
    const aborted = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', aborted)
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'))
    }
    if (signal.aborted) aborted()
    else signal.addEventListener('abort', aborted, { once: true })
  })
}

async function cancelComfyJob(endpointValue: string, headers: Record<string, string>, promptId: string): Promise<void> {
  try {
    const response = await fetch(serviceEndpoint(endpointValue, `/api/jobs/${encodeURIComponent(promptId)}/cancel`), {
      method: 'POST', headers,
    })
    if (response.ok) return
    await discard(response)
  } catch {
    // Older ComfyUI builds do not expose targeted job cancellation.
  }
  try {
    await fetch(serviceEndpoint(endpointValue, '/queue'), {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ delete: [promptId] }),
    })
  } catch {
    // The local command is already cancelled; an unavailable queue adds no further action.
  }
}

async function generateComfyUi(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  const workflow = renderComfyWorkflow(settings, prompt)
  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`
  progress(0.05, '正在提交 ComfyUI 工作流')
  const response = await fetchConnection('ComfyUI', serviceEndpoint(settings.comfyui.endpoint, '/prompt'), {
    method: 'POST', signal,
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: crypto.randomUUID() }),
  })
  const body = await response.text()
  if (!response.ok) throw providerError('ComfyUI', response.status, body)
  let submitted: { readonly prompt_id?: unknown }
  try {
    submitted = JSON.parse(body) as typeof submitted
  } catch {
    throw new Error('ComfyUI 返回了无法识别的任务结果')
  }
  if (typeof submitted.prompt_id !== 'string' || submitted.prompt_id === '') {
    throw new Error('ComfyUI 没有返回 prompt_id')
  }
  const promptId = submitted.prompt_id
  progress(0.12, 'ComfyUI 已接受任务')
  try {
    for (let attempt = 0; ; attempt += 1) {
      const historyResponse = await fetchConnection(
        'ComfyUI',
        serviceEndpoint(settings.comfyui.endpoint, `/history/${encodeURIComponent(promptId)}`),
        { headers, signal },
      )
      if (!historyResponse.ok) throw providerError('ComfyUI 历史查询', historyResponse.status, await historyResponse.text())
      const history = await historyResponse.json() as Record<string, unknown>
      const record = history[promptId]
      if (record !== undefined) {
        const failure = comfyFailure(record)
        if (failure !== undefined) throw new Error(`ComfyUI 工作流执行失败：${failure}`)
        const output = comfyOutput(record)
        if (output === undefined) throw new Error('ComfyUI 工作流已结束，但没有返回图片输出')
        progress(0.94, '正在保存 ComfyUI 图片')
        const url = serviceEndpoint(settings.comfyui.endpoint, '/view')
        url.searchParams.set('filename', output.filename)
        url.searchParams.set('subfolder', output.subfolder)
        url.searchParams.set('type', output.type)
        const imageResponse = await fetchConnection('ComfyUI 图片', url, { headers, signal })
        if (!imageResponse.ok) throw providerError('ComfyUI 图片下载', imageResponse.status, await imageResponse.text())
        const declared = Number(imageResponse.headers.get('content-length'))
        if (Number.isFinite(declared) && declared > MAX_PROVIDER_IMAGE_BYTES) throw new Error('ComfyUI 返回的图片过大')
        return decodeBase64Image(Buffer.from(await imageResponse.arrayBuffer()).toString('base64'))
      }
      progress(Math.min(0.88, 0.15 + attempt * 0.025), 'ComfyUI 正在绘制')
      await wait(1_000, signal)
    }
  } catch (error) {
    if (signal.aborted) await cancelComfyJob(settings.comfyui.endpoint, headers, promptId)
    throw error
  }
}

/** Generate one image through the configured provider. */
export function generateImage(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  if (settings.provider === 'openai') return generateOpenAi(settings, apiKey, prompt, signal, progress)
  if (settings.provider === 'dashscope') return generateDashscope(settings, apiKey, prompt, signal, progress)
  if (settings.provider === 'novelai') return generateNovelAi(settings, apiKey, prompt, signal, progress)
  if (settings.provider === 'comfyui') return generateComfyUi(settings, apiKey, prompt, signal, progress)
  return generateA1111(settings, apiKey, prompt, signal, progress)
}
