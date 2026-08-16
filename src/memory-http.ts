/** Same-origin read route for one Roleplay Session's active memory. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  jsonResponse as json,
  trustedBrowserRequest,
  type AgentRpHttpServer,
} from './host-http.ts'
import { readAgentRpMemoryHistory } from './memory.ts'
import { AGENT_RP_MEMORY_PATH, type AgentRpMemoryResponse } from './memory-protocol.ts'

interface AgentRegistryGateway {
  get(sessionId: SessionId): Agent | undefined
}

/** Register a local-only active-memory inspector for Agent RP Sessions. */
export function installAgentRpMemoryHttp(routeCtx: Context, hostCtx: Context, server: AgentRpHttpServer): void {
  routeCtx.effect(() => server.register({
    kind: 'exact',
    path: AGENT_RP_MEMORY_PATH,
    handler(request, response) {
      if (!trustedBrowserRequest(request)) {
        json(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method !== 'GET') {
        response.setHeader('allow', 'GET')
        json(response, 405, { error: 'method not allowed' })
        return
      }
      try {
        const url = new URL(request.url ?? '/', 'http://agent-rp.local')
        const sourceSessionId = url.searchParams.get('sessionId')?.trim()
        if (sourceSessionId === undefined || sourceSessionId === '' || sourceSessionId.length > 512) {
          throw new Error('角色会话编号无效')
        }
        const agent = (hostCtx.get('agents') as AgentRegistryGateway | undefined)?.get(SessionId(sourceSessionId))
        if (agent === undefined || agent.session.header.agentPreset !== 'agent-rp') throw new Error('角色会话当前不可用')
        const history = readAgentRpMemoryHistory(agent.session.events)
        const value: AgentRpMemoryResponse = {
          format: 0,
          memories: history.active.map(memory => ({
            id: memory.id,
            kind: memory.kind,
            subject: memory.subject,
            text: memory.text,
            source: agent.session.events[memory.sourceEventSeq]?.type === 'command/run'
              ? 'user'
              : agent.session.events[memory.sourceEventSeq]?.type === 'agent-rp/memory-seed' ? 'inherited' : 'character',
          })),
        }
        json(response, 200, value)
      } catch (error: unknown) {
        json(response, 400, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'agent-rp: memory HTTP')
}
