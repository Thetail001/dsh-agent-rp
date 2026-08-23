/** Same-origin creation of complete seeded Agent RP Sessions on public DSH. */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from './character-library.ts'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import {
  prepareAgentRpRewriteSession,
  prepareAgentRpSession,
  parseAgentRpSessionLaunchRequest,
} from './session-launch.ts'
import { AGENT_RP_SESSION_PATH } from './session-launch-protocol.ts'
import type { PresetLibrary } from './preset-library.ts'
import { SillyTavernChatLibrary } from './sillytavern-chat-library.ts'
import { WorldInfoLibrary } from './world-info-library.ts'
import { appendAgentRpMemorySeed, readAgentRpMemoryHistory } from './memory.ts'
import { readActiveSessionCharacter } from './import/session-character.ts'
import type { RoleplayResourceCatalog } from './roleplay-resource-catalog.ts'

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
  get(session: Agent['session']): { readonly title: string } | undefined
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

async function readJson(request: IncomingMessage): Promise<unknown> {
  return readJsonRequest(request, {
    limit: MAX_REQUEST_BYTES,
    emptyMessage: '角色会话启动请求为空',
    tooLargeMessage: '角色会话启动请求过大',
    invalidMessage: '角色会话启动请求不是有效 JSON',
  })
}

/** Create an Agent whose constructor sees the complete imported history. */
export async function launchAgentRpSession(
  ctx: Context,
  characters: CharacterLibrary,
  chats: SillyTavernChatLibrary,
  presetLibrary: PresetLibrary,
  worldInfos: WorldInfoLibrary,
  input: unknown,
  resources?: RoleplayResourceCatalog,
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

  const agentPresets = ctx.get('agentPresets') as AgentPresetGateway | undefined
  if (agentPresets === undefined) throw new Error('当前 Host 无法挂载角色会话预设')
  const preset = await agentPresets.resolve('agent-rp')
  const titles = ctx.get('sessionTitle') as SessionTitleGateway | undefined
  if (request.kind === 'rewrite') {
    if (source.session.header.agentPreset !== 'agent-rp') throw new Error('只能改写 Agent RP 角色会话')
    if (source.status !== 'idle' || source.inbox.hasPending) throw new Error('请等待当前回复完成后再改写')
  }
  let prepared = request.kind === 'rewrite'
    ? prepareAgentRpRewriteSession(source.session, request.turn, titles?.get(source.session)?.title)
    : prepareAgentRpSession(characters, chats, presetLibrary, worldInfos, request, resources)
  if (request.kind === 'character' && request.memory === 'copy-active') {
    if (source.session.header.agentPreset !== 'agent-rp') throw new Error('只能从角色会话继承记忆')
    if (source.status !== 'idle' || source.inbox.hasPending) throw new Error('请等待当前回复完成后再继承记忆')
    const sourceCharacter = readActiveSessionCharacter(source.session.events)
    if (sourceCharacter?.result.libraryId !== request.characterId) throw new Error('只能把记忆带给同一个角色')
    const memory = readAgentRpMemoryHistory(source.session.events).active
    prepared = {
      ...prepared,
      seed: appendAgentRpMemorySeed(prepared.seed, memory, String(source.id)),
    }
  }
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
      ...(request.kind === 'rewrite' ? { parentSession: source.id, seedLength: prepared.seed.length } : {}),
      agentPreset: preset.id,
    },
    setup: async agentCtx => { await agentPresets.mount(agentCtx, preset.id) },
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
  if (request.kind === 'rewrite') {
    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: request.text }],
      source: { kind: 'user' },
    }))
  }
  return { sessionId, title: prepared.title, seed: prepared.seed }
}

/** Register the current-public-DSH bridge for seeded Session creation. */
export function installSessionLaunchHttp(
  routeCtx: Context,
  hostCtx: Context,
  characters: CharacterLibrary,
  chats: SillyTavernChatLibrary,
  presets: PresetLibrary,
  worldInfos: WorldInfoLibrary,
  resources: RoleplayResourceCatalog,
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
        const result = await launchAgentRpSession(
          hostCtx,
          characters,
          chats,
          presets,
          worldInfos,
          await readJson(request),
          resources,
        )
        json(response, 200, { format: 0, sessionId: result.sessionId, title: result.title })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      }
    },
  }), 'agent-rp: seeded Session launch HTTP')
}
