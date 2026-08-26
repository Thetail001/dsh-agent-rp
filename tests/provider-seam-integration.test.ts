import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { installAgentPromptRegexStream } from '../src/prompt-regex-stream.ts'
import type { RoleplayTurnPromptPlan } from '../src/roleplay-turn-plan.ts'

const dshSourceRoot = resolve(
  process.env['DSH_SOURCE_ROOT'] ?? resolve(import.meta.dirname, '..', '..', 'dsh'),
)
const localAgentLoop = resolve(dshSourceRoot, 'packages/core/agent-loop/lib/index.js')
const unavailable = existsSync(localAgentLoop)
  ? false
  : `local DSH build is unavailable at ${localAgentLoop}`

function localModule(relativePath: string): string {
  return pathToFileURL(resolve(dshSourceRoot, relativePath)).href
}

function promptPlan(marker: string): RoleplayTurnPromptPlan {
  return {
    beforeHistory: [],
    afterHistory: [],
    inChat: [{ role: 'system', content: marker, depth: 0, order: 100 }],
    includeHistory: true,
    systemPromptText: '',
    transforms: {
      actorName: '测试角色',
      participantName: '用户',
      operations: [],
    },
    diagnostics: { enabledModules: 1, unsupportedMacros: 0, templateFailures: 0 },
  }
}

test('prepared prompt reaches the local DSH Agent Loop provider request', { skip: unavailable }, async () => {
  const [
    cordis,
    llm,
    session,
    systemPrompt,
    tools,
    agentRegistry,
    agentLoop,
  ] = await Promise.all([
    import(localModule('vendor/cordis/lib/index.js')),
    import(localModule('packages/llm/llm/lib/index.js')),
    import(localModule('packages/core/session/lib/index.js')),
    import(localModule('packages/core/system-prompt/lib/index.js')),
    import(localModule('packages/core/tools/lib/index.js')),
    import(localModule('packages/core/agent/lib/index.js')),
    import(localModule('packages/core/agent-loop/lib/index.js')),
  ])
  const requests: GenerateOptions[] = []
  class RecordingAdapter extends llm.LlmAdapter {
    resolveModel(provider: string, model: string): Promise<unknown> {
      return Promise.resolve({ provider, id: model, name: model })
    }

    async * stream(options: GenerateOptions): AsyncIterable<unknown> {
      requests.push(options)
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'ok' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'ok' } }
      yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }

  const ctx = new cordis.Context()
  try {
    await ctx.plugin(llm.default)
    await ctx.plugin(session.default)
    await ctx.plugin(systemPrompt.default)
    await ctx.plugin(tools.default)
    await ctx.plugin(agentRegistry.default)
    await ctx.plugin(agentLoop.default, { agents: [] })
    ctx.llm.registerAdapter(['recording'], new RecordingAdapter())
    const agent = ctx.agentLoop.create(session.SessionId('agent-rp-provider-capture'), {
      provider: 'recording',
      model: 'capture',
    })
    const marker = 'WOVEN_PROVIDER_CAPTURE_钥匙藏在钟下'
    installAgentPromptRegexStream(agent, () => promptPlan(marker))

    agent.followup(llm.createUserMessage({
      source: { kind: 'user' },
      content: [{ type: 'text', text: '钥匙在哪里？' }],
    }))
    await agent.whenIdle()

    assert.equal(requests.length, 1)
    const text = requests[0]?.messages.flatMap(message => message.content.flatMap(block =>
      block.type === 'text' ? [block.text] : [])).join('\n')
    assert.match(text ?? '', new RegExp(marker))
  } finally {
    await ctx.fiber.dispose()
  }
})
