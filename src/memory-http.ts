/** Same-origin read route for one Roleplay Session's active memory. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { AgentRpHttpServer } from './host-http.ts'
import { readAgentRpMemoryHistory } from './memory.ts'
import { AGENT_RP_MEMORY_PATH, type AgentRpMemoryResponse } from './memory-protocol.ts'

interface AgentRegistryGateway {
  get(sessionId: SessionId): Agent | undefined
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
            source: agent.session.events[memory.sourceEventSeq]?.type === 'command/run' ? 'user' : 'character',
          })),
        }
        json(response, 200, value)
      } catch (error: unknown) {
        json(response, 400, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'agent-rp: memory HTTP')
}
