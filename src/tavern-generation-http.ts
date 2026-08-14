/** Same-origin auxiliary generation for user-approved Tavern Helper scripts. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  BlockAssembler,
  createMessage,
  createUserMessage,
  type GenerateOptions,
  type Message,
} from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { renderContextSnapshot, renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import type { AgentRpHttpServer } from './host-http.ts'
import { readActiveSessionPreset } from './import/session-preset.ts'
import {
  TAVERN_GENERATION_PATH,
  type TavernGenerationRequest,
  type TavernGenerationResponse,
} from './tavern-generation-protocol.ts'

const MAX_REQUEST_BYTES = 512 * 1024
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_TEXT_CHARS = 256 * 1024
const MAX_ORDERED_PROMPTS = 256

type TavernPrompt = { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }

interface ParsedCustomApiConfig {
  readonly apiurl: string
  readonly key?: string
  readonly model?: string
  readonly maxTokens?: number
  readonly temperature?: number
  readonly topP?: number
  readonly frequencyPenalty?: number
  readonly presencePenalty?: number
}

interface ParsedGenerationConfig {
  readonly userInput: string
  readonly shouldStream: boolean
  readonly maxChatHistory?: number
  readonly maxTokens?: number
  readonly temperature?: number
  readonly customApi?: ParsedCustomApiConfig
  readonly orderedPrompts?: readonly (string | TavernPrompt)[]
  readonly injects: readonly TavernPrompt[]
  readonly overrideSystem: readonly string[]
  readonly overrideHistory?: readonly TavernPrompt[]
}

function trustedBrowserRequest(request: IncomingMessage): boolean {
  const host = request.headers.host
  if (host === undefined || host.trim() === '' || request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(body)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new Error('酒馆脚本生成请求过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_REQUEST_BYTES) throw new Error('酒馆脚本生成请求过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('酒馆脚本生成请求为空')
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch (error: unknown) {
    throw new Error('酒馆脚本生成请求不是有效 JSON', { cause: error })
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}必须是对象`)
  return value as Record<string, unknown>
}

function boundedText(value: unknown, label: string, fallback = ''): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string') throw new Error(`${label}必须是文本`)
  if (value.length > MAX_TEXT_CHARS) throw new Error(`${label}过长`)
  return value
}

function prompt(value: unknown, label: string): TavernPrompt {
  const record = object(value, label)
  if (record.role !== 'system' && record.role !== 'user' && record.role !== 'assistant') {
    throw new Error(`${label}的 role 无效`)
  }
  return { role: record.role, content: boundedText(record.content, `${label}的 content`) }
}

function promptList(value: unknown, label: string): readonly TavernPrompt[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > MAX_ORDERED_PROMPTS) throw new Error(`${label}无效`)
  return value.map((item, index) => prompt(item, `${label}[${index}]`))
}

function optionalInteger(value: unknown, label: string, maximum: number): number | undefined {
  if (value === undefined || value === 'all') return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${label}无效`)
  }
  return value
}

function optionalNumber(value: unknown, label: string, minimum: number, maximum: number): number | undefined {
  if (value === undefined || value === 'same_as_preset' || value === 'unset') return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}无效`)
  }
  return value
}

function optionalText(value: unknown, label: string, maximum: number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length > maximum) throw new Error(`${label}无效`)
  const result = value.trim()
  return result === '' ? undefined : result
}

function parseCustomApi(value: unknown): ParsedCustomApiConfig {
  const custom = object(value, 'custom_api')
  const proxyPreset = optionalText(custom.proxy_preset, 'custom_api.proxy_preset', 512)
  if (proxyPreset !== undefined) throw new Error('DSH 无法读取酒馆代理预设；请在脚本中填写 API 地址')
  const apiurl = optionalText(custom.apiurl, 'custom_api.apiurl', 2_048)
  if (apiurl === undefined) throw new Error('custom_api.apiurl 不能为空')
  tavernChatCompletionsEndpoint(apiurl)
  const key = optionalText(custom.key, 'custom_api.key', 8_192)
  const model = optionalText(custom.model, 'custom_api.model', 512)
  const source = (optionalText(custom.source, 'custom_api.source', 64) ?? 'openai').toLowerCase()
  if (!['custom', 'deepseek', 'mistralai', 'moonshot', 'openai', 'openrouter', 'xai'].includes(source)) {
    throw new Error(`custom_api.source ${JSON.stringify(source)} 不是 OpenAI-compatible 来源`)
  }
  if (custom.custom_include_body !== undefined || custom.custom_exclude_body !== undefined
    || custom.custom_include_headers !== undefined) {
    throw new Error('自定义请求体或请求头覆盖尚未开放')
  }
  if (custom.top_k !== undefined && custom.top_k !== 'same_as_preset' && custom.top_k !== 'unset') {
    throw new Error('custom_api.top_k 尚未开放')
  }
  const maxTokens = optionalNumber(custom.max_tokens, 'custom_api.max_tokens', 1, 65_536)
  const temperature = optionalNumber(custom.temperature, 'custom_api.temperature', 0, 2)
  const topP = optionalNumber(custom.top_p, 'custom_api.top_p', 0, 1)
  const frequencyPenalty = optionalNumber(custom.frequency_penalty, 'custom_api.frequency_penalty', -2, 2)
  const presencePenalty = optionalNumber(custom.presence_penalty, 'custom_api.presence_penalty', -2, 2)
  return {
    apiurl,
    ...(key === undefined ? {} : { key }),
    ...(model === undefined ? {} : { model }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(temperature === undefined ? {} : { temperature }),
    ...(topP === undefined ? {} : { topP }),
    ...(frequencyPenalty === undefined ? {} : { frequencyPenalty }),
    ...(presencePenalty === undefined ? {} : { presencePenalty }),
  }
}

function parseConfig(value: unknown): ParsedGenerationConfig {
  const config = object(value, '酒馆脚本生成配置')
  if (config.tools !== undefined || config.tool_choice !== undefined) throw new Error('酒馆脚本工具调用尚未开放')
  if (config.json_schema !== undefined) throw new Error('酒馆脚本结构化输出尚未开放')
  const orderedPrompts = config.ordered_prompts
  let parsedOrder: (string | TavernPrompt)[] | undefined
  if (orderedPrompts !== undefined) {
    if (!Array.isArray(orderedPrompts) || orderedPrompts.length > MAX_ORDERED_PROMPTS) {
      throw new Error('ordered_prompts 无效')
    }
    parsedOrder = orderedPrompts.map((item, index) => typeof item === 'string'
      ? boundedText(item, `ordered_prompts[${index}]`, '')
      : prompt(item, `ordered_prompts[${index}]`))
  }
  const overrides = config.overrides === undefined ? undefined : object(config.overrides, 'overrides')
  const overrideSystem: string[] = []
  for (const key of ['world_info_before', 'persona_description', 'char_description', 'char_personality', 'scenario',
    'world_info_after', 'dialogue_examples'] as const) {
    if (overrides?.[key] === undefined) continue
    const text = boundedText(overrides[key], `overrides.${key}`)
    overrideSystem.push(`[Tavern Helper override: ${key}]\n${text === '' ? '(empty)' : text}`)
  }
  const overrideChat = overrides?.chat_history === undefined ? undefined : object(overrides.chat_history, 'overrides.chat_history')
  const maxChatHistory = optionalInteger(config.max_chat_history, 'max_chat_history', 20_000)
  const maxTokens = optionalNumber(config.max_tokens, 'max_tokens', 1, 65_536)
  const temperature = optionalNumber(config.temperature, 'temperature', 0, 2)
  const customApi = config.custom_api === undefined ? undefined : parseCustomApi(config.custom_api)
  return {
    userInput: boundedText(config.user_input, 'user_input'),
    shouldStream: config.should_stream === true,
    ...(maxChatHistory === undefined ? {} : { maxChatHistory }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(temperature === undefined ? {} : { temperature }),
    ...(customApi === undefined ? {} : { customApi }),
    ...(parsedOrder === undefined ? {} : { orderedPrompts: parsedOrder }),
    injects: promptList(config.injects, 'injects'),
    overrideSystem,
    ...(overrideChat?.prompts === undefined ? {} : { overrideHistory: promptList(overrideChat.prompts, 'overrides.chat_history.prompts') }),
  }
}

/** Resolve a Tavern Helper API address to its OpenAI-compatible chat-completions endpoint. */
export function tavernChatCompletionsEndpoint(value: string): URL {
  let result: URL
  try {
    result = new URL(value.trim())
  } catch (error: unknown) {
    throw new Error('API 地址无效', { cause: error })
  }
  if (result.protocol !== 'http:' && result.protocol !== 'https:') throw new Error('API 地址只支持 HTTP 或 HTTPS')
  if (result.username !== '' || result.password !== '') throw new Error('API 地址不能包含账号或密码')
  result.hash = ''
  result.search = ''
  if (/\/models\/?$/u.test(result.pathname)) {
    result.pathname = result.pathname.replace(/\/models\/?$/u, '/chat/completions')
  } else if (!/\/chat\/completions\/?$/u.test(result.pathname)) {
    result.pathname = `${result.pathname.replace(/\/$/u, '')}/chat/completions`
  }
  return result
}

type OpenAiPrompt = { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }

function modelMessageText(message: Message): string {
  return message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function openAiPrompts(input: { readonly system?: string; readonly messages: readonly Message[] }): readonly OpenAiPrompt[] {
  return [
    ...(input.system === undefined ? [] : [{ role: 'system' as const, content: input.system }]),
    ...input.messages.flatMap(message => message.role === 'user' || message.role === 'assistant'
      ? [{ role: message.role, content: modelMessageText(message) }]
      : []),
  ]
}

function responseError(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const error = (value as Record<string, unknown>).error
  if (typeof error === 'string') return error.slice(0, 1_024)
  if (typeof error !== 'object' || error === null || Array.isArray(error)) return undefined
  const message = (error as Record<string, unknown>).message
  return typeof message === 'string' ? message.slice(0, 1_024) : undefined
}

function responseText(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('自定义模型返回了无法识别的结果')
  }
  const choices = (value as Record<string, unknown>).choices
  if (!Array.isArray(choices) || choices.length === 0) throw new Error('自定义模型返回了无法识别的结果')
  const choice = choices[0]
  if (typeof choice !== 'object' || choice === null || Array.isArray(choice)) {
    throw new Error('自定义模型返回了无法识别的结果')
  }
  const record = choice as Record<string, unknown>
  const message = typeof record.message === 'object' && record.message !== null && !Array.isArray(record.message)
    ? record.message as Record<string, unknown>
    : undefined
  const content = message?.content ?? record.text
  if (typeof content === 'string' && content !== '') return content
  if (Array.isArray(content)) {
    const text = content.flatMap(item => {
      if (typeof item === 'string') return [item]
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
      const part = item as Record<string, unknown>
      return typeof part.text === 'string' ? [part.text] : []
    }).join('')
    if (text !== '') return text
  }
  throw new Error('自定义模型没有返回文本')
}

async function customGeneration(
  input: { readonly system?: string; readonly messages: readonly Message[] },
  custom: ParsedCustomApiConfig,
  fallbackModel: string | undefined,
  signal: AbortSignal,
): Promise<string> {
  const model = custom.model ?? fallbackModel
  if (model === undefined || model.trim() === '') throw new Error('custom_api.model 不能为空')
  const endpoint = tavernChatCompletionsEndpoint(custom.apiurl)
  const body = JSON.stringify({
    model,
    messages: openAiPrompts(input),
    stream: false,
    ...(custom.maxTokens === undefined ? {} : { max_tokens: custom.maxTokens }),
    ...(custom.temperature === undefined ? {} : { temperature: custom.temperature }),
    ...(custom.topP === undefined ? {} : { top_p: custom.topP }),
    ...(custom.frequencyPenalty === undefined ? {} : { frequency_penalty: custom.frequencyPenalty }),
    ...(custom.presencePenalty === undefined ? {} : { presence_penalty: custom.presencePenalty }),
  })
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(custom.key === undefined ? {} : { authorization: `Bearer ${custom.key}` }),
      },
      body,
      signal,
    })
  } catch (error: unknown) {
    throw new Error(signal.aborted ? '自定义模型生成已取消或超时' : '无法连接自定义模型服务', { cause: error })
  }
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error('自定义模型返回内容过大')
  }
  const responseBody = await response.text()
  if (Buffer.byteLength(responseBody, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('自定义模型返回内容过大')
  let value: unknown
  try {
    value = JSON.parse(responseBody) as unknown
  } catch (error: unknown) {
    if (!response.ok) throw new Error(`自定义模型请求失败（${response.status}）`, { cause: error })
    throw new Error('自定义模型返回了无法识别的结果', { cause: error })
  }
  if (!response.ok) {
    const detail = responseError(value)
    throw new Error(`自定义模型请求失败（${response.status}）${detail === undefined ? '' : `：${detail}`}`)
  }
  return responseText(value)
}

function parseRequest(value: unknown): { readonly sessionId: SessionId; readonly mode: 'preset' | 'raw'; readonly config: ParsedGenerationConfig } {
  const request = object(value, '酒馆脚本生成请求')
  if (request.format !== 0 || typeof request.sessionId !== 'string'
    || (request.mode !== 'preset' && request.mode !== 'raw')) throw new Error('酒馆脚本生成请求无效')
  return { sessionId: SessionId(request.sessionId), mode: request.mode, config: parseConfig(request.config) }
}

function scriptMessage(item: TavernPrompt): Message {
  return createMessage({
    role: item.role,
    source: { kind: 'plugin', plugin: 'dsh-agent-rp-tavern-helper' },
    content: [{ type: 'text', text: item.content }],
  })
}

function userInput(text: string): Message {
  return createUserMessage({
    source: { kind: 'plugin', plugin: 'dsh-agent-rp-tavern-helper' },
    content: [{ type: 'text', text }],
  })
}

function dialogueHistory(agent: Agent, config: ParsedGenerationConfig): readonly Message[] {
  const imported = config.overrideHistory?.map(scriptMessage)
  const history = imported ?? agent.session.deriveMessages().filter(message =>
    (message.role === 'user' || message.role === 'assistant')
    && (message.source.kind === 'user' || message.source.kind === 'model'))
  if (config.maxChatHistory === undefined) return history
  return config.maxChatHistory === 0 ? [] : history.slice(-config.maxChatHistory)
}

function orderedInput(
  mode: 'preset' | 'raw',
  config: ParsedGenerationConfig,
  system: string,
  context: string,
  history: readonly Message[],
): { readonly system?: string; readonly messages: readonly Message[] } {
  const systemParts: string[] = []
  const messages: Message[] = []
  const includeBase = (): void => {
    if (system !== '' && !systemParts.includes(system)) systemParts.push(system)
  }
  const includeContext = (): void => {
    if (context !== '') messages.push(userInput(context))
  }
  if (mode === 'preset' || config.orderedPrompts === undefined) {
    includeBase()
    systemParts.push(...config.overrideSystem)
    messages.push(...history)
    includeContext()
    messages.push(...config.injects.filter(item => item.role !== 'system').map(scriptMessage))
    systemParts.push(...config.injects.filter(item => item.role === 'system').map(item => item.content))
    if (config.userInput !== '') messages.push(userInput(config.userInput))
  } else {
    for (const item of config.orderedPrompts) {
      if (typeof item !== 'string') {
        if (item.role === 'system') systemParts.push(item.content)
        else messages.push(scriptMessage(item))
      } else if (item.toLowerCase() === 'chat_history') {
        messages.push(...history)
      } else if (item.toLowerCase() === 'user_input') {
        if (config.userInput !== '') messages.push(userInput(config.userInput))
      } else {
        includeBase()
      }
    }
    systemParts.push(...config.overrideSystem)
    systemParts.push(...config.injects.filter(item => item.role === 'system').map(item => item.content))
    messages.push(...config.injects.filter(item => item.role !== 'system').map(scriptMessage))
    if (systemParts.includes(system)) includeContext()
  }
  const renderedSystem = systemParts.filter(Boolean).join('\n\n')
  return { ...(renderedSystem === '' ? {} : { system: renderedSystem }), messages }
}

async function generate(ctx: Context, agent: Agent, mode: 'preset' | 'raw', config: ParsedGenerationConfig, signal: AbortSignal): Promise<string> {
  const assembly = await ctx.systemPrompt.assemble({ scope: agent, agent, signal })
  const input = orderedInput(
    mode,
    config,
    renderPrompt(assembly),
    renderContextSnapshot(assembly),
    dialogueHistory(agent, config),
  )
  if (input.messages.length === 0) throw new Error('酒馆脚本没有提供可生成的提示词')
  if (config.customApi !== undefined) return customGeneration(input, config.customApi, agent.options.model, signal)
  const provider = agent.options.provider
  const model = agent.options.model
  if (provider === undefined || model === undefined) throw new Error('当前角色会话还没有可用模型')
  const presetGeneration = readActiveSessionPreset(agent.session.events)?.preset.generation
  const temperature = config.temperature ?? presetGeneration?.temperature
  const maxTokens = config.maxTokens ?? presetGeneration?.maxTokens ?? agent.options.maxTokens
  const options: GenerateOptions = {
    provider,
    model,
    messages: [...input.messages],
    ...(input.system === undefined ? {} : { system: input.system }),
    ...(temperature === undefined ? {} : { temperature }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    signal,
  }
  const assembler = new BlockAssembler()
  for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
  if (assembler.finish.kind === 'error') throw new Error(assembler.finish.failure.message)
  if (assembler.finish.kind === 'aborted') throw new Error('酒馆脚本生成已取消')
  const text = assembler.blocks().flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  if (text === '') throw new Error('模型没有返回文本')
  return text
}

/** Run one script generation without mutating the visible roleplay transcript. */
export async function runTavernGeneration(
  ctx: Context,
  input: TavernGenerationRequest | unknown,
): Promise<TavernGenerationResponse> {
  const request = parseRequest(input)
  const agents = ctx.get('agents') as Context['agents'] | undefined
  if (agents === undefined) throw new Error('当前 Host 无法读取角色会话')
  const agent = agents.get(request.sessionId)
  if (agent === undefined) throw new Error('当前角色会话不可用')
  const text = await agent.runMaintenance(async maintenanceSignal => {
    const signal = AbortSignal.any([maintenanceSignal, AbortSignal.timeout(180_000)])
    return generate(ctx, agent, request.mode, request.config, signal)
  })
  return { format: 0, text }
}

/** Register the current-public-DSH bridge for Tavern Helper generation. */
export function installTavernGenerationHttp(ctx: Context, server: AgentRpHttpServer): void {
  ctx.effect(() => server.register({
    kind: 'exact',
    path: TAVERN_GENERATION_PATH,
    async handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'POST')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        json(response, 200, await runTavernGeneration(ctx, await readJson(request)))
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /正在|idle|maintenance/iu.test(message) ? 409 : /过大|过长/iu.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: Tavern Helper generation HTTP')
}
