import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import {Session, SessionId} from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { decodeGenerationState, encodeGenerationState, executeGenerationCommand } from '../src/generation.ts'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { createCharacterCardSessionSeed } from '../src/import/character-card-seed.ts'
import { readCurrentSessionMvuState } from '../src/mvu.ts'
import { hiddenReplyVersionSeqs } from '../src/generation-state-record.ts'
import { modelVisibleDialogue } from '../src/prompt.ts'
import { prepareRoleplayTurn } from '../src/roleplay-turn-plan.ts'
import { bindRoleplayExternalContext } from '../src/roleplay-turn-context.ts'
import {
  applyTavernHelperMutation,
  encodeTavernHelperState,
  encodeTavernHelperStateAttachment,
  initializeTavernHelperState,
  readTavernHelperState,
  type TavernHelperState,
} from '../src/tavern-helper.ts'
import {
  AGENT_RP_SESSION_EVENT_TYPES,
  appendAgentRpSessionEvent,
  supportsAgentRpSessionEvents,
} from '../src/session-event-compat.ts'
import { LEGACY_AGENT_RP_EVENT_TYPES } from '../src/session-repair.ts'
import { resolveSessionRoleplayRuntime } from '../src/session-roleplay-runtime.ts'
import {
  appendSessionRoleplayTurnPlan,
  replaySessionRoleplayTurnPlan,
} from '../src/session-roleplay-turn-plan.ts'
import { readRoleplayStates } from '../src/roleplay-state.ts'
import { executeRoleplayStateCommand } from '../src/roleplay-state-command.ts'

const state = {
  format: 0 as const,
  id: 'state:fixture',
  revision: 1,
  ownerModuleId: 'roleplay:fixture',
  writerModuleId: 'roleplay:fixture',
  value: { safe: true },
}

function appendAssistant(session: Session, turn: number, text: string) {
  return session.append('assistant/message', { stream: [],
    turn,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text }], source: { provider: 'fixture', model: 'fixture' },
    }),
  }, { surfaceOp: 'append' })
}

function publishedTavernState(
  session: Session,
  replySeq: number,
  marker: string,
): TavernHelperState {
  const initial = initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperVariables: {}, tavernHelperScripts: [],
  }, 'published-generation-card')
  return applyTavernHelperMutation(initial, {
    format: 0,
    scope: 'chat',
    variables: { marker },
    cause: { format: 0, sessionId: String(session.id), replySeq },
  })
}

function appendPublishedTavernAttachment(
  session: Session,
  commandId: CommandId,
  replySeq: number,
  state: TavernHelperState,
  active: boolean,
) {
  const cause = { format: 0 as const, sessionId: String(session.id), replySeq }
  session.append('command/run', {
    commandId, name: 'rp-tavern-variables', args: '{}', source: { kind: 'user' },
  })
  return session.append('command/done', {
    commandId,
    kind: 'success',
    text: encodeTavernHelperStateAttachment({ format: 0, cause, active, state }),
  })
}

function publishedMvuSession(id: string) {
  const card = parseCharacterCardJson(JSON.stringify({
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: '变量角色', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
      creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [],
      creator: 'fixture', character_version: '1.0', extensions: {},
      character_book: { recursive_scanning: false, extensions: {}, entries: [{
        id: 1, comment: '[initvar]', keys: [], content: '角色:\n  等级: 1', enabled: false,
        insertion_order: 1, constant: false, extensions: {},
      }] },
    },
  }))
  const seed = createCharacterCardSessionSeed(card, {
    kind: 'file', attachmentId: AttachmentId(`sha256:${id}`), bytes: 1,
    name: 'mvu.json', mediaType: 'application/json',
  }, 0, '')
  return { card, session: Session.create(SessionId(id), seed) }
}

test('refuses an unsafe fallback without changing a published-host Session', () => {
  const session = Session.create(SessionId('published-host-without-plugin-events'))
  // 0.2.1 的官方 Session 恒带 replay-safe 插件记录 seam，不再有「缺少能力」的 Host 分支；
  // 旧降级实现（surface replace）反而被平台禁止。
  assert.equal(supportsAgentRpSessionEvents(session), true)
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '保留这一条。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const reply = appendAssistant(session, 1, '被覆盖的回复')
  const beforeEvents = structuredClone(session.snapshotEvents())
  const beforeSurface = [...session.surface.nodes]

  // 不安全的回退：assistant/message 禁带 sourceEventSeqs，而 replace 必须引用全部被遮蔽节点。
  // 平台在提交前拒绝，日志与表面都不留半截修改。
  assert.throws(() => session.append('assistant/message', { stream: [],
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '替换回复' }], source: { provider: 'fixture', model: 'fixture' },
    }),
  }, {
    surfaceOp: { op: 'replace', startSeq: reply.seq, endSeq: reply.seq },
  }), /surface replace: sourceEventSeqs must include every shadowed surface node/u)
  assert.deepEqual(session.snapshotEvents(), beforeEvents)
  assert.deepEqual(session.surface.nodes, beforeSurface)

  // 安全路径：插件记录以可忽略事件 append 进日志，不进表面，重放后逐字节一致。
  const written = appendAgentRpSessionEvent(session, 'plugin:agent-rp/state', state)
  const committed = session.snapshotEvents()[Number(written.seq)]
  assert.equal(committed?.ignorable, true)
  assert.equal(committed?.type, 'plugin:agent-rp/state')
  assert.deepEqual(committed?.data, state)
  assert.deepEqual(session.surface.nodes, beforeSurface)
  assert.equal(session.deriveMessages().length, 2)
  const reopened = Session.create(SessionId('published-host-without-plugin-events-replay'), session.snapshotEvents())
  assert.deepEqual(reopened.snapshotEvents()[Number(written.seq)], committed)
})

test('keeps the repair vocabulary identical to the writable private vocabulary', () => {
  assert.deepEqual([...LEGACY_AGENT_RP_EVENT_TYPES], [...AGENT_RP_SESSION_EVENT_TYPES])
})

test('persists a player state revision through command/done on the published Host', () => {
  const session = Session.create(SessionId('published-host-command-state'))
  const agent = { session } as Agent
  const commandId = CommandId('published-host-state-command')
  const rawInput = JSON.stringify({
    format: 0, operation: 'set', id: 'state:scene', expectedRevision: 0, value: { weather: '雨' },
  })
  session.append('command/run', {
    commandId, name: 'rp-state', args: rawInput, source: { kind: 'user' },
  })

  const result = executeRoleplayStateCommand({ commandId, agent, rawInput })
  // 0.2.1：命令结果只报写入事件 seq，状态本体以 plugin:agent-rp/state 落进日志。
  assert.equal(result.text, undefined)
  assert.equal(result.sourceEventSeq, 1)
  session.append('command/done', { commandId, ...result })

  assert.equal(session.snapshotEvents().some(event => event.type === 'plugin:agent-rp/state'), true)
  const committed = session.snapshotEvents()[Number(result.sourceEventSeq)]
  assert.equal(committed?.ignorable, true)
  assert.equal(committed?.type, 'plugin:agent-rp/state')
  assert.deepEqual(readRoleplayStates(session.snapshotEvents()), [{
    format: 0,
    id: 'state:scene',
    revision: 1,
    ownerModuleId: 'roleplay:user',
    writerModuleId: 'roleplay:user',
    sourceEventSeq: 0,
    value: { weather: '雨' },
    eventSeq: 1,
  }])
  const reopened = Session.create(SessionId('published-host-command-state-replay'), session.snapshotEvents())
  assert.deepEqual(readRoleplayStates(reopened.snapshotEvents()), readRoleplayStates(session.snapshotEvents()))
})

test('continues and switches MVU reply checkpoints through command/done on the published Host', async () => {
  const { card, session } = publishedMvuSession('published-host-mvu-versions')
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '提升等级。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const originalText = '第一段<UpdateVariable><JSONPatch>[{"op":"delta","path":"/角色/等级","value":1}]</JSONPatch></UpdateVariable>'
  const original = appendAssistant(session, 1, originalText)
  const agent = {
    session,
    status: 'idle',
    inbox: { nextTurn: [], nextStep: [] },
    followup(message: ReturnType<typeof createUserMessage>) {
      session.append('user/message', message, { surfaceOp: 'append' })
      appendAssistant(
        session,
        2,
        '第二段<UpdateVariable><JSONPatch>[{"op":"delta","path":"/角色/等级","value":2}]</JSONPatch></UpdateVariable>',
      )
    },
    whenIdle: async () => {},
    cancel: () => {},
  } as unknown as Agent

  const continueId = CommandId('published-host-mvu-continue')
  session.append('command/run', { commandId: continueId, name: 'rp-generation', source: { kind: 'user' } })
  const continued = await executeGenerationCommand({
    agent,
    rawInput: JSON.stringify({ operation: 'continue', replySeq: original.seq }),
    signal: new AbortController().signal,
  })
  session.append('command/done', { commandId: continueId, ...continued })
  const continuedState = decodeGenerationState(continued.text)
  assert.deepEqual(continuedState?.mvu, {
    statData: { 角色: { 等级: 4 } }, updateCount: 2,
  })
  // 0.2.1：选中版本的 MVU 快照以 plugin 记录落盘，提示词与状态折叠都读它。
  assert.deepEqual(session.snapshotEvents()
    .filter(event => event.type === 'plugin:agent-rp/mvu-state')
    .map(event => event.data), [{ statData: { 角色: { 等级: 4 } }, updateCount: 2 }])
  // 非选中版本按账本从模型可见历史中剔除：续写前的那一版和中间产物都不进入请求。
  const continuedHidden = continuedState === undefined ? [] : continuedState.assistantSeqs
    .filter(seq => seq !== continuedState.selectedVersionSeq)
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())].sort((left, right) => left - right),
    [...continuedHidden].sort((left, right) => left - right))
  assert.deepEqual(modelVisibleDialogue(session).filter(text => text.includes('UpdateVariable')).length, 1)
  assert.deepEqual(readCurrentSessionMvuState(card, session), {
    statData: { 角色: { 等级: 4 } }, updateCount: 2,
  })

  const selectId = CommandId('published-host-mvu-select-original')
  session.append('command/run', { commandId: selectId, name: 'rp-generation', source: { kind: 'user' } })
  const selected = await executeGenerationCommand({
    agent,
    rawInput: JSON.stringify({ operation: 'select', replySeq: original.seq, versionIndex: 0 }),
    signal: new AbortController().signal,
  })
  session.append('command/done', { commandId: selectId, ...selected })
  const selectedState = decodeGenerationState(selected.text)
  assert.equal(selectedState?.selectedVersionSeq, original.seq)
  assert.deepEqual(session.snapshotEvents()
    .filter(event => event.type === 'plugin:agent-rp/mvu-state')
    .map(event => event.data).at(-1), { statData: { 角色: { 等级: 2 } }, updateCount: 1 })
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())].sort((left, right) => left - right),
    (selectedState?.assistantSeqs ?? []).filter(seq => seq !== selectedState?.selectedVersionSeq)
      .sort((left, right) => left - right))
  assert.deepEqual(modelVisibleDialogue(session), ['提升等级。', originalText])
  assert.deepEqual(readCurrentSessionMvuState(card, session), {
    statData: { 角色: { 等级: 2 } }, updateCount: 1,
  })

  const reopened = Session.create(session.id, session.snapshotEvents())
  assert.deepEqual(readCurrentSessionMvuState(card, reopened), readCurrentSessionMvuState(card, session))
})

test('switches Tavern reply branches through command/done on the published Host', async () => {
  const session = Session.create(SessionId('published-host-tavern-versions'))
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '选择一条路线。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const original = appendAssistant(session, 1, '第一条路线')
  const originalState = publishedTavernState(session, original.seq, 'original')
  const originalAttachment = appendPublishedTavernAttachment(
    session, CommandId('published-tavern-original'), original.seq, originalState, false,
  )
  const alternative = appendAssistant(session, 2, '第二条路线')
  const alternativeState = publishedTavernState(session, alternative.seq, 'alternative')
  const alternativeAttachment = appendPublishedTavernAttachment(
    session, CommandId('published-tavern-alternative'), alternative.seq, alternativeState, false,
  )
  // 0.2.1 禁 surface replace：两个版本都正常 append，选中关系只由账本表达。
  const groupId = '00000000-0000-4000-8000-000000000201'
  const seedId = CommandId('published-tavern-generation-seed')
  session.append('command/run', { commandId: seedId, name: 'rp-generation', source: { kind: 'user' } })
  session.append('command/done', {
    commandId: seedId,
    kind: 'success',
    text: encodeGenerationState({
      format: 0,
      groupId,
      operation: 'regenerate',
      originSeq: original.seq,
      anchorSeq: original.seq,
      assistantSeqs: [original.seq, alternative.seq],
      versions: [
        { seq: original.seq, text: '第一条路线', tavernStateSeq: originalAttachment.seq },
        { seq: alternative.seq, text: '第二条路线', tavernStateSeq: alternativeAttachment.seq },
      ],
      selectedVersionSeq: alternative.seq,
      surfaceSeq: alternative.seq,
      tavern: alternativeState,
    }),
  })
  assert.deepEqual(readTavernHelperState(session.snapshotEvents())?.scopes.chat, { marker: 'alternative' })
  // 两个版本都在表面上，账本隐藏未选中的分支；模型可见历史只剩选中版本。
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())], [original.seq])
  assert.deepEqual(modelVisibleDialogue(session), ['选择一条路线。', '第二条路线'])

  const agent = { session } as Agent
  const originalSelectId = CommandId('published-tavern-select-original')
  session.append('command/run', {
    commandId: originalSelectId, name: 'rp-generation', source: { kind: 'user' },
  })
  const selectedOriginal = await executeGenerationCommand({
    agent,
    rawInput: JSON.stringify({ operation: 'select', replySeq: original.seq, versionIndex: 0 }),
    signal: new AbortController().signal,
  })
  session.append('command/done', { commandId: originalSelectId, ...selectedOriginal })
  assert.deepEqual(session.snapshotEvents()
    .filter(event => event.type === 'plugin:agent-rp/tavern-state')
    .map(event => event.data.scopes.chat), [{ marker: 'original' }])
  assert.deepEqual(readTavernHelperState(session.snapshotEvents())?.scopes.chat, { marker: 'original' })
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())], [alternative.seq])
  assert.deepEqual(modelVisibleDialogue(session), ['选择一条路线。', '第一条路线'])
  assert.deepEqual(readTavernHelperState(Session.create(session.id, session.snapshotEvents()).snapshotEvents())?.scopes.chat,
    { marker: 'original' })

  const alternativeSelectId = CommandId('published-tavern-select-alternative')
  session.append('command/run', {
    commandId: alternativeSelectId, name: 'rp-generation', source: { kind: 'user' },
  })
  const selectedAlternative = await executeGenerationCommand({
    agent,
    rawInput: JSON.stringify({ operation: 'select', replySeq: original.seq, versionIndex: 1 }),
    signal: new AbortController().signal,
  })
  session.append('command/done', { commandId: alternativeSelectId, ...selectedAlternative })
  assert.deepEqual(readTavernHelperState(session.snapshotEvents())?.scopes.chat, { marker: 'alternative' })
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())], [original.seq])
  assert.deepEqual(modelVisibleDialogue(session), ['选择一条路线。', '第二条路线'])
  assert.deepEqual(readTavernHelperState(Session.create(session.id, session.snapshotEvents()).snapshotEvents())?.scopes.chat,
    { marker: 'alternative' })
})

test('rejects unsafe Tavern regeneration before changing a published-host Session', async () => {
  const session = Session.create(SessionId('published-host-tavern-regenerate'))
  const baseline = initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperVariables: { marker: 'baseline' },
    tavernHelperScripts: [],
  }, 'published-regeneration-card')
  const stateId = CommandId('published-tavern-baseline')
  session.append('command/run', { commandId: stateId, name: 'rp-tavern-state', source: { kind: 'user' } })
  session.append('command/done', {
    commandId: stateId, kind: 'success', text: encodeTavernHelperState(baseline),
  })
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '重新回答。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const originalText = '保留到安全切换开始。'
  const original = appendAssistant(session, 1, originalText)
  const beforeEvents = structuredClone(session.snapshotEvents())
  const beforeSurface = [...session.surface.nodes]

  // 0.2.1 平台禁 surface replace：状态化回复的旧「安全回退」实现在提交前就被拒绝，
  // 日志与表面都不留半截修改；重新生成因此改走 append + 账本。
  assert.throws(() => session.append('assistant/message', { stream: [],
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: '' }], source: { provider: 'fixture', model: 'fixture' },
    }),
  }, {
    surfaceOp: { op: 'replace', startSeq: original.seq, endSeq: original.seq },
  }), /surface replace: sourceEventSeqs must include every shadowed surface node/u)
  assert.deepEqual(session.snapshotEvents(), beforeEvents)
  assert.deepEqual(session.surface.nodes, beforeSurface)

  let followedUp = 0
  let requestDialogue: readonly string[] = []
  let requestCharacterScope: unknown
  const agent = {
    session,
    status: 'idle',
    inbox: { nextTurn: [], nextStep: [] },
    followup(message: ReturnType<typeof createUserMessage>) {
      followedUp += 1
      session.append('user/message', message, { surfaceOp: 'append' })
      // 生成请求发出时：被否决的楼层不在模型可见历史里，脚本状态回到生成前基线。
      requestDialogue = modelVisibleDialogue(session)
      requestCharacterScope = readTavernHelperState(session.snapshotEvents())?.scopes.character
      appendAssistant(session, 2, '安全切换后的新回复')
    },
    whenIdle: async () => {},
    cancel: () => {},
  } as unknown as Agent

  const regenerateId = CommandId('published-tavern-regenerate')
  session.append('command/run', { commandId: regenerateId, name: 'rp-generation', source: { kind: 'user' } })
  const regenerated = await executeGenerationCommand({
    agent,
    rawInput: JSON.stringify({ operation: 'regenerate', replySeq: original.seq }),
    signal: new AbortController().signal,
  })
  session.append('command/done', { commandId: regenerateId, ...regenerated })

  assert.equal(followedUp, 1)
  assert.deepEqual(requestDialogue, ['重新回答。'])
  assert.deepEqual(requestCharacterScope, { marker: 'baseline' })
  const regeneratedState = decodeGenerationState(regenerated.text)
  assert.equal(regeneratedState?.operation, 'regenerate')
  assert.equal(regeneratedState?.selectedVersionSeq, regenerated.sourceEventSeq)
  assert.deepEqual(regeneratedState?.versions.map(version => version.text), [originalText, '安全切换后的新回复'])
  // 日志只 append：被否决的回复仍在原始日志里，但被账本隐藏、不进入模型请求。
  assert.equal(session.deriveMessages().some(message => message.content.some(block =>
    block.type === 'text' && block.text === originalText)), true)
  assert.deepEqual([...hiddenReplyVersionSeqs(session.snapshotEvents())], [original.seq])
  assert.deepEqual(modelVisibleDialogue(session), ['重新回答。', '安全切换后的新回复'])
  // 表面节点只增不减：被否决的楼层没有被替换或移除。
  assert.equal(beforeSurface.every(seq => session.surface.nodes.includes(seq)), true)

  const reopened = Session.create(session.id, session.snapshotEvents())
  assert.deepEqual(modelVisibleDialogue(reopened), modelVisibleDialogue(session))
  assert.deepEqual(readTavernHelperState(reopened.snapshotEvents())?.scopes.character, { marker: 'baseline' })
})

test('writes and exactly replays a prepared turn with a local newer DSH Host', async (t) => {
  const dshRoot = process.env['DSH_SOURCE_DIR'] ?? resolve(process.cwd(), '..', 'dsh')
  const entry = resolve(dshRoot, 'packages', 'core', 'session', 'lib', 'index.js')
  if (!existsSync(entry)) {
    t.skip('local DSH session build is unavailable; set DSH_SOURCE_DIR to enable this matrix leg')
    return
  }

  const local = await import(pathToFileURL(entry).href)
  const session = local.Session.create(local.SessionId('agent-rp-new-host-write'))
  assert.equal(supportsAgentRpSessionEvents(session as Session), true)

  const written = appendAgentRpSessionEvent(session as Session, 'plugin:agent-rp/state', state)
  assert.deepEqual(written.data, state)
  const committed = session.snapshotEvents()[Number(written.seq)]
  assert.equal(committed?.ignorable, true)
  assert.equal(committed?.type, 'plugin:agent-rp/state')

  const reopened = local.Session.create(
    local.SessionId('agent-rp-new-host-replay'),
    structuredClone(session.snapshotEvents()),
  )
  assert.deepEqual(reopened.snapshotEvents()[0], committed)

  const turnSession = local.Session.create(local.SessionId('agent-rp-new-host-turn')) as Session
  turnSession.append('turn/start', { turn: 1 })
  const message = createUserMessage({
    content: [{ type: 'text', text: '这段正文只用于准备计划，不应进入收据。' }],
    source: { kind: 'user' },
  })
  const deployment = resolveConfig({ characterName: '候选 Host 兼容角色' })
  const resolved = resolveSessionRoleplayRuntime({
    session: turnSession,
    deployment,
    memoryWriteAvailable: true,
  })
  const plan = prepareRoleplayTurn({
    session: turnSession,
    pendingMessages: [message],
    deployment,
    resolved,
  })
  const staleExternal = createUserMessage({
    content: [{ type: 'text', text: '候选 Host 应覆盖的旧世界上下文。' }],
    source: {
      kind: 'plugin', plugin: 'dsh-worldbook', form: 'snapshot', channel: 'candidate-host',
      sections: [{ name: 'candidate-host', text: '候选 Host 应覆盖的旧世界上下文。' }],
    },
  })
  turnSession.append('step/start', { turn: 1, step: 1 })
  turnSession.append('user/message', message, { surfaceOp: 'append' })
  const staleExternalEvent = turnSession.append('user/message', staleExternal, { surfaceOp: 'append' })
  const external = createUserMessage({
    content: [{ type: 'text', text: '候选 Host 外部世界上下文，不应进入收据。' }],
    source: {
      kind: 'plugin', plugin: 'dsh-worldbook', form: 'snapshot', channel: 'candidate-host',
      sections: [{ name: 'candidate-host', text: '候选 Host 外部世界上下文，不应进入收据。' }],
    },
  })
  const externalEvent = turnSession.append('user/message', external, { surfaceOp: 'append' })
  const dispatchedPlan = bindRoleplayExternalContext({
    plan, events: turnSession.snapshotEvents(), visibleMessages: turnSession.deriveMessages(), turn: 1, step: 1,
  })
  const receipt = appendSessionRoleplayTurnPlan(turnSession, 1, 1, dispatchedPlan)
  assert.equal(receipt.ignorable, true)
  assert.equal(receipt.type, 'plugin:agent-rp/turn-plan')
  const candidateContextReads = receipt.data.reference.receipt?.recall?.contextReads ?? []
  assert.equal(candidateContextReads.some(read => read.eventSeq === externalEvent.seq), true)
  const supportsSnapshotChannels = (turnSession.constructor as {
    readonly contextSnapshotChannels?: unknown
  }).contextSnapshotChannels === 1
  assert.equal(candidateContextReads.some(read => read.eventSeq === staleExternalEvent.seq), !supportsSnapshotChannels)
  assert.doesNotMatch(JSON.stringify(receipt), /这段正文|候选 Host 兼容角色|外部世界上下文/u)

  const turnReopened = local.Session.create(
    local.SessionId('agent-rp-new-host-turn'),
    structuredClone(turnSession.snapshotEvents()),
  ) as Session
  const reopenedReceipt = turnReopened.snapshotEvents()[receipt.seq]
  assert.equal(reopenedReceipt?.type, 'plugin:agent-rp/turn-plan')
  if (reopenedReceipt?.type !== 'plugin:agent-rp/turn-plan') throw new Error('turn receipt was not replayed')
  assert.deepEqual(replaySessionRoleplayTurnPlan({
    session: turnReopened,
    record: reopenedReceipt,
    deployment,
  }), dispatchedPlan)
  assert.throws(() => replaySessionRoleplayTurnPlan({
    session: turnReopened,
    record: reopenedReceipt,
    deployment: resolveConfig({ characterName: '漂移后的候选角色' }),
  }), /content digest/u)
})
