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
const MAX_TEXT_CHARS = 256 * 1024
const MAX_ORDERED_PROMPTS = 256

type TavernPrompt = { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }

interface ParsedGenerationConfig {
  readonly userInput: string
  readonly shouldStream: boolean
  readonly maxChatHistory?: number
  readonly maxTokens?: number
  readonly temperature?: number
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

function parseConfig(value: unknown): ParsedGenerationConfig {
  const config = object(value, '酒馆脚本生成配置')
  if (config.custom_api !== undefined) throw new Error('脚本自带 API 地址或密钥不会被使用；请改用 DSH 当前模型')
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
  return {
    userInput: boundedText(config.user_input, 'user_input'),
    shouldStream: config.should_stream === true,
    ...(maxChatHistory === undefined ? {} : { maxChatHistory }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(temperature === undefined ? {} : { temperature }),
    ...(parsedOrder === undefined ? {} : { orderedPrompts: parsedOrder }),
    injects: promptList(config.injects, 'injects'),
    overrideSystem,
    ...(overrideChat?.prompts === undefined ? {} : { overrideHistory: promptList(overrideChat.prompts, 'overrides.chat_history.prompts') }),
  }
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
  return config.maxChatHistory === undefined ? history : history.slice(-config.maxChatHistory)
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
  const provider = agent.options.provider
  const model = agent.options.model
  if (provider === undefined || model === undefined) throw new Error('当前角色会话还没有可用模型')
  const assembly = await ctx.systemPrompt.assemble({ scope: agent, agent, signal })
  const input = orderedInput(
    mode,
    config,
    renderPrompt(assembly),
    renderContextSnapshot(assembly),
    dialogueHistory(agent, config),
  )
  if (input.messages.length === 0) throw new Error('酒馆脚本没有提供可生成的提示词')
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
