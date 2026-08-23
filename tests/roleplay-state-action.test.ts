import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { CommandId } from '@deepseek-ai/dsh-commands'
import {
  CallId,
  createAssistantMessage,
  createToolResultMessage,
  createUserMessage,
} from '@deepseek-ai/dsh-llm'
import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { createScope } from '@deepseek-ai/dsh-scope'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRegistry, { defineTool } from '@deepseek-ai/dsh-tools'
import { resolveConfig } from '../src/config.ts'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { createCharacterCardSessionSeed } from '../src/import/character-card-seed.ts'
import { installAgentRp } from '../src/index.ts'
import { readCurrentSessionMvuState } from '../src/mvu.ts'
import {
  collectRoleplayStateActionIntents,
  installRoleplayStateActionTool,
  ROLEPLAY_STATE_ACTION_TOOL,
} from '../src/roleplay-state-action.ts'
import {
  ensureDefaultRoleplayTurnMode,
  readRoleplayTurnMode,
} from '../src/roleplay-turn-mode.ts'
import { executeRoleplayTurnModeCommand } from '../src/roleplay-turn-mode-command.ts'
import { prepareRoleplayTurn, type RoleplayTurnPlan } from '../src/roleplay-turn-plan.ts'
import {
  readRoleplayTurnSettlements,
  type RoleplayTurnPlanReference,
} from '../src/roleplay-turn-settlement.ts'
import { resolveSessionRoleplayRuntime } from '../src/session-roleplay-runtime.ts'
import { recoverSessionRoleplayTurns } from '../src/session-roleplay-turn-recovery.ts'
import {
  appendSessionRoleplayTurnPlan,
} from '../src/session-roleplay-turn-plan.ts'
import { installIgnorableSessionEventFixture } from './session-event-fixture.ts'

installIgnorableSessionEventFixture()

const deployment = resolveConfig({ characterName: '状态行动测试角色' })

function mvuCard() {
  return parseCharacterCardJson(JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '白露',
      description: '钟表匠',
      personality: '沉静',
      scenario: '修理铺打烊前',
      first_mes: '门还没锁。',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: 'fixture',
      character_version: '1',
      extensions: {},
      character_book: {
        recursive_scanning: false,
        extensions: {},
        entries: [{
          id: 1,
          comment: '[initvar]',
          keys: [],
          content: '角色:\n  等级: 1\n  称号: 学徒',
          enabled: false,
          insertion_order: 1,
          constant: false,
          extensions: {},
        }, {
          id: 2,
          comment: '变量更新规则',
          keys: ['__mvu_rules__'],
          content: '变量更新规则：剧情推进时更新等级，旧格式要求回复末尾输出 <UpdateVariable>。',
          enabled: true,
          insertion_order: 2,
          constant: false,
          extensions: {},
        }],
      },
    },
  }))
}

function cardSession(id: string, mode: 'conversation' | 'agent') {
  const card = mvuCard()
  const seed = createCharacterCardSessionSeed(card, {
    kind: 'file',
    attachmentId: AttachmentId(`sha256:${id}`),
    bytes: 100,
    name: `${id}.json`,
    mediaType: 'application/json',
  }, 0, '')
  const session = Session.create(SessionId(id), seed)
  if (mode === 'agent') ensureDefaultRoleplayTurnMode(session, 'agent')
  return { card, session }
}

function beginTurn(session: Session): {
  readonly plan: RoleplayTurnPlan
  readonly reference: RoleplayTurnPlanReference
  readonly record: SessionEvent<'agent-rp/turn-plan'>
} {
  session.append('turn/start', { turn: 1 })
  const pending = createUserMessage({
    source: { kind: 'user' },
    content: [{ type: 'text', text: '今晚的修行让我进步了。' }],
  })
  const resolved = resolveSessionRoleplayRuntime({ session, deployment })
  const plan = prepareRoleplayTurn({ session, pendingMessages: [pending], deployment, resolved })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('user/message', pending, { surfaceOp: 'append' })
  const record = appendSessionRoleplayTurnPlan(session, 1, 1, plan)
  return { plan, reference: record.data.reference, record }
}

function appendActionCall(
  session: Session,
  callId: string,
  args: { readonly stateId: string; readonly operations: readonly object[] },
  text = '白露把修行笔记收好，终于跨过了原先的门槛。',
) {
  const argumentsText = JSON.stringify(args)
  const assistant = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: [{ type: 'text', text }, {
        type: 'tool-call',
        id: CallId(callId),
        name: ROLEPLAY_STATE_ACTION_TOOL,
        arguments: argumentsText,
      }],
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [] })
  const call = session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId(callId),
    name: ROLEPLAY_STATE_ACTION_TOOL,
    arguments: argumentsText,
  })
  return { assistant, call }
}

async function mounted(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRegistry)
  installRoleplayStateActionTool(ctx)
  return ctx
}

async function executeAndAppend(
  ctx: Context,
  agent: Agent,
  callId: string,
  callSeq: number,
  args: { readonly stateId: string; readonly operations: readonly object[] },
  sourceEventSeqs: readonly number[] = [callSeq],
) {
  const result = await ctx.tools.execute({
    callId: CallId(callId),
    name: ROLEPLAY_STATE_ACTION_TOOL,
    arguments: args,
    agent,
    signal: new AbortController().signal,
  })
  assert.equal(result.isError, false)
  if (result.isError) throw new Error('state action unexpectedly failed')
  const event = agent.session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: result.content,
      isError: false,
    }),
    ...(result.meta === undefined ? {} : { meta: result.meta }),
  }, { surfaceOp: 'append', sourceEventSeqs: [...sourceEventSeqs] })
  return { event, result }
}

test('opens the Agent state tool before same-step prompt assembly and does not migrate resumed logs', async (context) => {
  const root = new Context()
  await root.plugin(SystemPrompt)
  await root.plugin(ToolRegistry)
  await root.plugin(AgentRegistry)
  root.provide('commands' as never, { register: () => () => {} } as never)
  root.provide('attachments' as never, {} as never)
  const presetKey = {}
  const preset = createScope(root, presetKey)
  const characterLibraryRoot = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-state-action-'))
  let installed = false
  let agentParentCtx: Context | undefined
  await preset.ctx.plugin({
    inject: ['systemPrompt', 'tools'],
    apply(pluginCtx: Context) {
      pluginCtx.tools.register(defineTool({
        name: 'bash',
        description: 'High-authority fixture that must stay hidden from roleplay Agents.',
        parameters: {},
        output: {
          schema: { type: 'string' },
          render: (_args, value) => [{ type: 'text', text: value }],
        },
        execute: () => Promise.resolve('unexpected'),
      }))
      installAgentRp(pluginCtx, deployment, { characterLibraryRoot })
      agentParentCtx = pluginCtx
      installed = true
    },
  })
  assert.equal(installed, true)
  assert.ok(agentParentCtx)

  const native = cardSession('state-action-same-step-schema', 'agent')
  const nativeAgent = { id: native.session.id, session: native.session } as Agent
  const nativeScope = createScope(agentParentCtx, nativeAgent, { parent: presetKey })
  Object.assign(nativeAgent, { ctx: nativeScope.ctx })
  const disposeNative = root.agents.register(nativeAgent)

  const before = await root.systemPrompt.assemble({ scope: nativeAgent })
  assert.equal(before.tools.some(tool => tool.name === ROLEPLAY_STATE_ACTION_TOOL), false)
  assert.equal(before.tools.some(tool => tool.name === 'bash'), false)
  native.session.append('turn/start', { turn: 1 })
  const pending = createUserMessage({
    source: { kind: 'user' },
    content: [{ type: 'text', text: '今晚的修行让我进步了。' }],
  })
  agentEvents(root, nativeAgent).emit('agent/inbox/claimed', { message: pending, turn: 1 })
  const sameStep = await root.systemPrompt.assemble({ scope: nativeAgent })
  assert.equal(sameStep.tools.some(tool => tool.name === ROLEPLAY_STATE_ACTION_TOOL), true)
  assert.equal(sameStep.tools.some(tool => tool.name === 'bash'), false)

  const rawInput = JSON.stringify({ mode: 'conversation', format: 0 })
  const commandId = CommandId('turn-mode-user-selection')
  native.session.append('command/run', {
    commandId,
    name: 'rp-turn-mode',
    args: rawInput,
    source: { kind: 'user' },
  })
  executeRoleplayTurnModeCommand({ commandId, agent: nativeAgent, rawInput })
  assert.equal(readRoleplayTurnMode(Session.create(native.session.id, native.session.events).events), 'conversation')
  native.session.append('turn/start', { turn: 2 })
  agentEvents(root, nativeAgent).emit('agent/inbox/claimed', {
    message: createUserMessage({
      source: { kind: 'user' },
      content: [{ type: 'text', text: '继续聊，不进行 Agent 结算。' }],
    }),
    turn: 2,
  })
  const dialogueStep = await root.systemPrompt.assemble({ scope: nativeAgent })
  assert.equal(dialogueStep.tools.some(tool => tool.name === ROLEPLAY_STATE_ACTION_TOOL), false)

  const resumedSession = Session.create(SessionId('state-action-resumed-default'))
  const resumedAgent = { id: resumedSession.id, session: resumedSession } as Agent
  const resumedScope = createScope(agentParentCtx, resumedAgent, { parent: presetKey })
  Object.assign(resumedAgent, { ctx: resumedScope.ctx })
  const disposeResumed = root.agents.register(resumedAgent)
  agentEvents(root, resumedAgent).emit('agent/session-start', { source: 'resume' })
  assert.equal(readRoleplayTurnMode(resumedSession.events), 'conversation')

  const freshSession = Session.create(SessionId('state-action-fresh-default'))
  const freshAgent = { id: freshSession.id, session: freshSession } as Agent
  const freshScope = createScope(agentParentCtx, freshAgent, { parent: presetKey })
  Object.assign(freshAgent, { ctx: freshScope.ctx })
  const disposeFresh = root.agents.register(freshAgent)
  agentEvents(root, freshAgent).emit('agent/session-start', { source: 'startup' })
  assert.equal(readRoleplayTurnMode(freshSession.events), 'agent')

  context.after(async () => {
    disposeFresh()
    disposeResumed()
    disposeNative()
    await freshScope.dispose()
    await resumedScope.dispose()
    await nativeScope.dispose()
    await preset.dispose()
    await root.fiber.dispose()
    rmSync(characterLibraryRoot, { recursive: true, force: true })
  })
})

test('applies one semantic action after turn end and keeps its narrative message as the final reply', async (context) => {
  const ctx = await mounted()
  context.after(async () => { await ctx.fiber.dispose() })
  const { card, session } = cardSession('state-action-success', 'agent')
  const { plan, reference } = beginTurn(session)
  assert.equal(plan.act.strategy, 'agent')
  assert.deepEqual(plan.act.responseRepairs, [])
  assert.equal(plan.act.stateActions[0]?.tool, ROLEPLAY_STATE_ACTION_TOOL)
  assert.match(plan.prompt.systemPromptText, /不要在正文中输出 <UpdateVariable>/u)
  const args = {
    stateId: 'state:mvu',
    operations: [{ op: 'delta', path: '/角色/等级', value: 2 }],
  }
  const { assistant, call } = appendActionCall(session, 'state-action-success-call', args)
  const { event, result } = await executeAndAppend(ctx, { session } as Agent, 'state-action-success-call', call.seq, args)
  assert.equal(result.concludesTurn, true)
  session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'fixture', model: 'fixture' },
      content: [],
    }),
  }, { surfaceOp: 'append', sourceEventSeqs: [event.seq] })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  const restarted = Session.create(session.id, session.events)
  assert.equal(restarted.events.at(-1)?.type, 'session/end-seed')

  assert.deepEqual(collectRoleplayStateActionIntents({
    events: restarted.events,
    sessionId: String(restarted.id),
    turn: 1,
    plans: [reference],
  }).map(item => item.resultEventSeq), [event.seq])
  assert.deepEqual(recoverSessionRoleplayTurns({ session: restarted, deployment }), {
    settlements: 1,
    presentations: 1,
    turns: [1],
  })
  assert.deepEqual(readCurrentSessionMvuState(card, restarted), {
    statData: { 角色: { 等级: 3, 称号: '学徒' } },
    updateCount: 1,
    source: { kind: 'agent-action', turn: 1, resultEventSeqs: [event.seq] },
  })
  const actionState = restarted.events.findLast(event => event.type === 'agent-rp/mvu-state')
  assert.equal(actionState?.type, 'agent-rp/mvu-state')
  if (actionState?.type === 'agent-rp/mvu-state') {
    assert.deepEqual(actionState.data.source, {
      kind: 'agent-action',
      turn: 1,
      resultEventSeqs: [event.seq],
    })
  }
  const settlement = readRoleplayTurnSettlements(restarted.events)[0]
  assert.equal(settlement?.reply?.eventSeq, assistant.seq)
  assert.deepEqual(settlement?.state, [{
    id: 'state:mvu', beforeRevision: 0, afterRevision: 1, outcome: 'updated',
  }])
  assert.deepEqual(settlement?.settle.modules.find(module => module.moduleId === 'adapter:mvu'), {
    moduleId: 'adapter:mvu', outcome: 'applied', changes: 1,
  })
  assert.deepEqual(recoverSessionRoleplayTurns({ session: restarted, deployment }), {
    settlements: 0,
    presentations: 0,
    turns: [],
  })
  assert.equal(restarted.events.filter(candidate => candidate.type === 'agent-rp/mvu-state').length, 1)
})
