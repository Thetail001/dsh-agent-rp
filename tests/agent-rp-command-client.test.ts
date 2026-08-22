import assert from 'node:assert/strict'
import test from 'node:test'
import { AGENT_RP_COMMAND_PATH } from '../src/agent-rp-command-protocol.ts'
import { executeAgentRpCommand } from '../src/client/agent-rp-command.ts'

test('posts Agent RP commands to the plugin-owned endpoint', async context => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  let request: { readonly input: string | URL | Request; readonly init: RequestInit | undefined } | undefined
  globalThis.fetch = (input, init) => {
    request = { input, init }
    return Promise.resolve(new Response(JSON.stringify({
      format: 0,
      matched: true,
      commandId: 'command-client-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
  }
  assert.deepEqual(await executeAgentRpCommand('session-client', '/rp-state {}'), {
    format: 0,
    matched: true,
    commandId: 'command-client-1',
  })
  assert.equal(request?.input, AGENT_RP_COMMAND_PATH)
  assert.equal(request?.init?.method, 'POST')
  assert.deepEqual(JSON.parse(String(request?.init?.body)), {
    format: 0,
    sessionId: 'session-client',
    line: '/rp-state {}',
  })
})

test('reports Host and malformed command responses without exposing request contents', async context => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify({ error: '角色会话当前不可用' }), { status: 400 }))
  await assert.rejects(executeAgentRpCommand('session-client', '/rp-memory private'), /角色会话当前不可用/u)
  globalThis.fetch = () => Promise.resolve(new Response('<html>broken</html>', { status: 502 }))
  await assert.rejects(executeAgentRpCommand('session-client', '/rp-memory private'), /响应无法识别/u)
})
