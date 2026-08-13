/** Same-origin creation of complete seeded Agent RP Sessions on public DSH. */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from './character-library.ts'
import type { AgentRpHttpServer } from './host-http.ts'
import { prepareAgentRpSession, parseAgentRpSessionLaunchRequest } from './session-launch.ts'
import { AGENT_RP_SESSION_PATH } from './session-launch-protocol.ts'
import { SillyTavernChatLibrary } from './sillytavern-chat-library.ts'

const MAX_REQUEST_BYTES = 32 * 1024

interface AgentPresetGateway {
  resolve(id?: string): Promise<{ readonly id: string }>
  mount(agentCtx: Context, id?: string): Promise<unknown>
}

interface WorkspaceGateway {
  list(): readonly {
    readonly id: string
    readonly sessionIds: readonly SessionId[]
    attachSession(sessionId: SessionId): Promise<void>
  }[]
}

interface SessionTitleGateway {
  rename(session: Agent['session'], title: string): unknown
}

interface SessionModelsGateway {
  sessions: {
    models(request: { readonly rpcId: string; readonly payload: { readonly sessionId: SessionId } }): Promise<{
      readonly result:
      | { readonly ok: true; readonly value: {
        readonly current: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string }
      } }
      | { readonly ok: false; readonly error: { readonly message: string } }
    }>
    selectModel(request: {
      readonly rpcId: string
      readonly payload: {
        readonly sessionId: SessionId
        readonly provider: string
        readonly model: string
        readonly reasoningEffort?: string
      }
    }): Promise<{
      readonly result:
      | { readonly ok: true; readonly value: unknown }
      | { readonly ok: false; readonly error: { readonly message: string } }
    }>
  }
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
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new Error('角色会话启动请求过大')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > MAX_REQUEST_BYTES) throw new Error('角色会话启动请求过大')
    chunks.push(data)
  }
  if (bytes === 0) throw new Error('角色会话启动请求为空')
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch (error: unknown) {
    throw new Error('角色会话启动请求不是有效 JSON', { cause: error })
  }
}

/** Create an Agent whose constructor sees the complete imported history. */
export async function launchAgentRpSession(
  ctx: Context,
  characters: CharacterLibrary,
  chats: SillyTavernChatLibrary,
  input: unknown,
): Promise<{ readonly sessionId: SessionId; readonly title: string; readonly seed: readonly SessionEvent[] }> {
  const request = parseAgentRpSessionLaunchRequest(input)
  const sourceId = SessionId(request.sourceSessionId)
  const agents = ctx.get('agents') as Context['agents'] | undefined
  if (agents === undefined) throw new Error('当前 Host 无法创建角色会话')
  const apiProxy = ctx.get('apiProxy') as SessionModelsGateway | undefined
  if (apiProxy === undefined) throw new Error('当前 Host 无法读取来源会话')
  const models = await apiProxy.sessions.models({
    rpcId: `agent-rp-launch-${randomUUID()}`,
    payload: { sessionId: sourceId },
  })
  if (!models.result.ok) throw new Error(models.result.error.message)
  const source = agents.get(sourceId)
  if (source === undefined) throw new Error('来源会话当前不可用')

  const presets = ctx.get('agentPresets') as AgentPresetGateway | undefined
  if (presets === undefined) throw new Error('当前 Host 无法挂载角色会话预设')
  const preset = await presets.resolve('agent-rp')
  const prepared = prepareAgentRpSession(characters, chats, request)
  const sessionId = SessionId(`session-${randomUUID()}`)
  const agentOptions: AgentOptions = {
    provider: models.result.value.current.provider,
    model: models.result.value.current.model,
  }
  const handle = await agents.create({
    sessionId,
    seed: prepared.seed,
    agentOptions,
    meta: {
      ...(source.session.header.cwd === undefined ? {} : { cwd: source.session.header.cwd }),
      agentPreset: preset.id,
    },
    setup: async agentCtx => { await presets.mount(agentCtx, preset.id) },
  })
  const selected = await apiProxy.sessions.selectModel({
    rpcId: `agent-rp-select-${randomUUID()}`,
    payload: {
      sessionId,
      provider: models.result.value.current.provider,
      model: models.result.value.current.model,
      ...(models.result.value.current.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: models.result.value.current.reasoningEffort }),
    },
  })
  if (!selected.result.ok) {
    await handle.dispose()
    throw new Error(selected.result.error.message)
  }

  const titles = ctx.get('sessionTitle') as SessionTitleGateway | undefined
  if (titles !== undefined) {
    try {
      titles.rename(handle.agent.session, prepared.title)
    } catch (error: unknown) {
      ctx.logger.warn(`agent-rp: Session ${JSON.stringify(sessionId)} title was not applied: ${String(error)}`)
    }
  }
  const workspaces = ctx.get('workspace') as WorkspaceGateway | undefined
  const workspace = workspaces?.list().find(item => item.sessionIds.includes(sourceId))
  if (workspace !== undefined) {
    try {
      await workspace.attachSession(sessionId)
    } catch (error: unknown) {
      ctx.logger.warn(`agent-rp: Session ${JSON.stringify(sessionId)} remains ungrouped: ${String(error)}`)
    }
  }
  return { sessionId, title: prepared.title, seed: prepared.seed }
}

/** Register the current-public-DSH bridge for seeded Session creation. */
export function installSessionLaunchHttp(
  routeCtx: Context,
  hostCtx: Context,
  characters: CharacterLibrary,
  chats: SillyTavernChatLibrary,
  server: AgentRpHttpServer,
): void {
  routeCtx.effect(() => server.register({
    kind: 'exact',
    path: AGENT_RP_SESSION_PATH,
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
        const result = await launchAgentRpSession(hostCtx, characters, chats, await readJson(request))
        json(response, 200, { format: 0, sessionId: result.sessionId, title: result.title })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: seeded Session launch HTTP')
}
