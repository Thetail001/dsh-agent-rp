/** Provider adapters for user-triggered roleplay image generation. */

import type { ImageGenerationSettings } from './workspace-settings.ts'
import type { GeneratedImageAsset } from './generated-image-library.ts'
import type { ImageProviderTestResult } from './image-generation-protocol.ts'

const MAX_PROVIDER_IMAGE_BYTES = 32 * 1024 * 1024

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

function providerError(provider: string, status: number, body: string): Error {
  let detail = body.trim().slice(0, 800)
  try {
    const parsed = JSON.parse(body) as { readonly error?: { readonly message?: unknown } | string; readonly detail?: unknown }
    const message = typeof parsed.error === 'string' ? parsed.error
      : typeof parsed.error?.message === 'string' ? parsed.error.message
        : typeof parsed.detail === 'string' ? parsed.detail : undefined
    if (message !== undefined) detail = message.slice(0, 800)
  } catch {
    // The provider returned plain text; the bounded body is already safe to report.
  }
  return new Error(`${provider} 请求失败（${status}）${detail === '' ? '' : `：${detail}`}`)
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
  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`
  const url = endpoint(settings.a1111.endpoint, '/sdapi/v1/samplers')
  url.pathname = url.pathname.replace(/\/sdapi\/v1\/txt2img$/u, '/sdapi/v1/samplers')
  const response = await fetchConnection('A1111 / Forge', url, { headers, signal })
  if (!response.ok) throw providerError('A1111 / Forge 连接测试', response.status, await response.text())
  await discard(response)
  return { status: 'verified', detail: 'A1111 / Forge 已连接；测试没有生成图片' }
}

function decodeBase64Image(value: string): GeneratedImageAsset {
  const payload = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/iu, '')
  const data = new Uint8Array(Buffer.from(payload, 'base64'))
  if (data.byteLength < 8 || data.byteLength > MAX_PROVIDER_IMAGE_BYTES) throw new Error('图片服务返回了无效大小的图片')
  let mediaType: GeneratedImageAsset['mediaType']
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) mediaType = 'image/png'
  else if (data[0] === 0xff && data[1] === 0xd8) mediaType = 'image/jpeg'
  else if (String.fromCharCode(...data.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...data.slice(8, 12)) === 'WEBP') mediaType = 'image/webp'
  else throw new Error('图片服务返回了不支持的图片格式')
  return { data, mediaType }
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

/** Generate one image through the configured provider. */
export function generateImage(
  settings: ImageGenerationSettings,
  apiKey: string | undefined,
  prompt: string,
  signal: AbortSignal,
  progress: ImageGenerationProgress,
): Promise<GeneratedImageAsset> {
  return settings.provider === 'openai'
    ? generateOpenAi(settings, apiKey, prompt, signal, progress)
    : generateA1111(settings, apiKey, prompt, signal, progress)
}
