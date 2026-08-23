import assert from 'node:assert/strict'
import test from 'node:test'
import { AGENT_RP_TURN_HEALTH_PATH } from '../src/roleplay-turn-health-protocol.ts'
import { loadAgentRpTurnHealth } from '../src/client/roleplay-turn-health.ts'

test('loads content-free turn health from the plugin-owned endpoint', async context => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  let requested: string | URL | Request | undefined
  globalThis.fetch = input => {
    requested = input
    return Promise.resolve(new Response(JSON.stringify({
      format: 0,
      status: 'ready',
      health: {
        audit: 'agent-rp-turn-health-v0', turns: 0,
        statuses: { open: 0, awaitingSettlement: 0, awaitingPresentation: 0, complete: 0 },
      },
    }), { status: 200 }))
  }
  const value = await loadAgentRpTurnHealth('private session')
  assert.equal(value.status, 'ready')
  assert.equal(requested, `${AGENT_RP_TURN_HEALTH_PATH}?sessionId=private%20session`)
})

test('rejects Host failures and malformed values without echoing response content', async context => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = () => Promise.resolve(new Response('private server detail', { status: 500 }))
  await assert.rejects(loadAgentRpTurnHealth('private session'), /request failed \(500\)/u)
  globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify({
    format: 0, status: 'ready', health: { privatePrompt: 'must not pass' },
  }), { status: 200 }))
  await assert.rejects(loadAgentRpTurnHealth('private session'), /invalid Agent RP turn health/u)
})
