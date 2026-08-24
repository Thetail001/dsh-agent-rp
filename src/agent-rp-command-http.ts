/** Same-origin execution route for Agent RP's model-free Session commands. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  AGENT_RP_COMMAND_PATH,
  parseAgentRpCommandRequest,
  type AgentRpCommandResponse,
} from './agent-rp-command-protocol.ts'
import {
  jsonResponse as json,
  readJsonRequest,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import {
  agentHasAgentRpRuntime,
  resolveAgentRpCapabilityPreset,
  type AgentPresetGateway,
} from './agent-capability-preset.ts'

const MAX_COMMAND_BYTES = 4 * 1024 * 1024

interface AgentRegistryGateway {
  get(sessionId: SessionId): Agent | undefined
  resume(options: {
    readonly resumeSessionId: SessionId
    readonly signal?: AbortSignal
    readonly setup?: (agentCtx: Context) => unknown | Promise<unknown>
  }): Promise<{ readonly agent: Agent }>
}

interface SessionPersistenceGateway {
  inspect(sessionId: SessionId): Promise<{ readonly meta: { readonly agentPreset?: string } }>
}

interface CommandExecution {
  readonly commandId: unknown
}

interface CommandGateway {
  readonly execute: ((agent: Agent, line: string, signal: AbortSignal) => Promise<CommandExecution | undefined>)
    | ((agent: Agent, line: string, images: readonly unknown[], signal: AbortSignal) => Promise<CommandExecution | undefined>)
}

function assertAgentRpAgent(presets: AgentPresetGateway, agent: Agent | undefined): Agent {
  if (!agentHasAgentRpRuntime(presets, agent)) {
    throw new Error('角色会话当前不可用')
  }
  return agent
}

function createAgentResolver(hostCtx: Context): (sessionId: SessionId, signal: AbortSignal) => Promise<Agent> {
  const resumptions = new Map<string, Promise<Agent>>()
  return async (sessionId, signal) => {
    const agents = hostCtx.get('agents') as AgentRegistryGateway | undefined
    if (agents === undefined) throw new Error('当前 Host 无法访问角色会话')
    const presets = hostCtx.get('agentPresets') as AgentPresetGateway | undefined
    if (presets === undefined) throw new Error('当前 Host 无法访问角色会话预设')
    const live = agents.get(sessionId)
    if (live !== undefined) return assertAgentRpAgent(presets, live)

    const key = String(sessionId)
    let resumption = resumptions.get(key)
    if (resumption === undefined) {
      resumption = (async () => {
        const persistence = hostCtx.get('sessionPersistence') as SessionPersistenceGateway | undefined
        if (persistence === undefined || presets === undefined) throw new Error('当前 Host 无法恢复角色会话')
        const inspected = await persistence.inspect(sessionId)
        if (inspected.meta.agentPreset === undefined) throw new Error('该会话没有记录 Agent 能力预设')
        const preset = await resolveAgentRpCapabilityPreset(presets, inspected.meta.agentPreset)
        try {
          const handle = await agents.resume({
            resumeSessionId: sessionId,
            signal,
            setup: agentCtx => presets.mount(agentCtx, preset.id),
          })
          return assertAgentRpAgent(presets, handle.agent)
        } catch (error: unknown) {
          const raced = agents.get(sessionId)
          if (raced !== undefined) return assertAgentRpAgent(presets, raced)
          throw error
        }
      })().finally(() => { resumptions.delete(key) })
      resumptions.set(key, resumption)
    }
    return resumption
  }
}

async function executeCommand(
  gateway: CommandGateway,
  agent: Agent,
  line: string,
  signal: AbortSignal,
): Promise<CommandExecution | undefined> {
  if (gateway.execute.length >= 4) {
    const execute = gateway.execute as (
      agent: Agent,
      line: string,
      images: readonly unknown[],
      signal: AbortSignal,
    ) => Promise<CommandExecution | undefined>
    return execute.call(gateway, agent, line, [], signal)
  }
  const execute = gateway.execute as (
    agent: Agent,
    line: string,
    signal: AbortSignal,
  ) => Promise<CommandExecution | undefined>
  return execute.call(gateway, agent, line, signal)
}

/** Register the stable Agent RP command endpoint across DSH command API revisions. */
export function installAgentRpCommandHttp(routeCtx: Context, hostCtx: Context, server: AgentRpHttpServer): void {
  const resolveAgent = createAgentResolver(hostCtx)
  routeCtx.effect(() => server.register({
    kind: 'exact',
    path: AGENT_RP_COMMAND_PATH,
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
      const controller = new AbortController()
      const abort = (): void => { controller.abort(new Error('Agent RP 命令请求已中断')) }
      request.once('aborted', abort)
      try {
        const input = parseAgentRpCommandRequest(await readJsonRequest(request, {
          limit: MAX_COMMAND_BYTES,
          emptyMessage: 'Agent RP 命令请求为空',
          tooLargeMessage: 'Agent RP 命令请求过大',
          invalidMessage: 'Agent RP 命令请求不是有效 JSON',
        }))
        const commands = hostCtx.get('commands') as CommandGateway | undefined
        if (commands === undefined) throw new Error('当前 Host 未启用命令执行器')
        const agent = await resolveAgent(SessionId(input.sessionId), controller.signal)
        const execution = await executeCommand(commands, agent, input.line, controller.signal)
        const value: AgentRpCommandResponse = execution === undefined
          ? { format: 0, matched: false }
          : { format: 0, matched: true, commandId: String(execution.commandId) }
        json(response, 200, value)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        json(response, /过大/u.test(message) ? 413 : 400, { error: message })
      } finally {
        request.off('aborted', abort)
      }
    },
  }), 'agent-rp: command HTTP')
}
