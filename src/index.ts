/** Agent RP profile bundle and preset-scoped character runtime. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import { scopeOf, type ScopeKey } from '@deepseek-ai/dsh-scope'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import {
  Config,
  resolveConfig,
  type Config as AgentRpConfig,
  type ResolvedConfig,
} from './config.ts'
import {
  AGENT_RP_MEMORY_KINDS,
  prepareAgentRpMemory,
} from './memory.ts'
import { renderCharacterPrompt, renderMemoryContext } from './prompt.ts'
import { installBundledAgentRpPreset } from './preset.ts'

/** Cordis plugin identity. */
export const name = 'dsh-agent-rp'
export { Config }
/** Host services required by the profile bundle. */
export const inject = ['agents', 'systemPrompt', 'tools']

/** Canonical output schema for one accepted `remember` call. */
export const MEMORY_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', required: true, const: 0 },
    id: { type: 'string', required: true },
    kind: { type: 'string', required: true, enum: AGENT_RP_MEMORY_KINDS },
    subject: { type: 'string', required: true },
    text: { type: 'string', required: true },
    sourceEventSeq: { type: 'integer', required: true },
    supersedes: { type: 'string' },
  },
} as const

function rememberCall(subject: string, text: string): GenericCallView {
  return { card: 'generic', title: `记住：${subject}`, kind: 'other', rawInput: text }
}

/**
 * Attach one persistent character identity and memory tool to a top-level Agent.
 * @param agent - published top-level Agent whose scope owns every registration.
 * @param config - normalized character configuration.
 */
export function installAgentRp(ctx: Context, config: ResolvedConfig): void {
  const agentsByScope = new WeakMap<ScopeKey, Agent>()
  ctx.systemPrompt.section({
    name: 'deployment:persona',
    order: 0,
    text: renderCharacterPrompt(config),
    complete: true,
  })
  ctx.on('agent/created', ({ agent }) => {
    const scope = scopeOf(agent.ctx)
    if (scope !== undefined) agentsByScope.set(scope, agent)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    const scope = scopeOf(agent.ctx)
    if (scope !== undefined) agentsByScope.delete(scope)
  })
  ctx.systemPrompt.context({
    name: 'agent-rp:memory',
    order: 70,
    text: ({ scope }) => {
      if (scope === undefined) return ''
      const agent = agentsByScope.get(scope)
      return agent === undefined ? '' : renderMemoryContext(agent.session.events)
    },
  })
  ctx.systemPrompt.context({ name: 'sandbox:policy', order: 0, text: '' })
  ctx.systemPrompt.context({ name: 'approval:policy', order: 0, text: '' })
  ctx.tools.register(defineTool({
    name: 'remember',
    description: 'Persist one confirmed fact, promise, preference, relationship change, or shared event for later turns in this Session. Use supersedes only when correcting one currently active memory id.',
    parameters: {
      kind: {
        type: 'string',
        enum: AGENT_RP_MEMORY_KINDS,
        required: true,
        description: 'Why this information must remain available in later turns.',
      },
      subject: {
        type: 'string',
        required: true,
        description: 'Short stable topic used to distinguish this memory from unrelated records.',
      },
      text: {
        type: 'string',
        required: true,
        description: 'Concise confirmed information to remember without speculation or hidden reasoning.',
      },
      supersedes: {
        type: 'string',
        description: 'Active memory id replaced by this corrected record.',
      },
    },
    output: {
      schema: MEMORY_VALUE_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute(args, exec) {
      if (exec.agent === undefined) throw new Error('remember requires an Agent Session')
      if (exec.parent !== undefined) throw new Error('remember must be called directly by the character Agent')
      const record = prepareAgentRpMemory(exec.agent.session, String(exec.callId), args)
      return Promise.resolve(record)
    },
    presentCall: args => rememberCall(args.subject, args.text),
    isConcurrencySafe: () => false,
  }))
}

/**
 * Install the Agent RP profile behavior for every top-level Agent.
 * @param ctx - settled Web Host context.
 * @param config - character configuration for this profile.
 */
export function apply(ctx: Context, config: AgentRpConfig): void {
  const resolved = resolveConfig(config)
  if (resolved.mode === 'host') {
    installBundledAgentRpPreset()
    return
  }
  installAgentRp(ctx, resolved)
}
