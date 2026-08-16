import assert from 'node:assert/strict'
import test from 'node:test'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import {
  decodeGenerationState,
  encodeGenerationState,
  executeGenerationCommand,
  parseGenerationRequest,
  readGenerationGroups,
} from '../src/generation.ts'
import { CommandId } from '@deepseek-ai/dsh-commands'
import { executeTavernTrigger } from '../src/tavern-trigger.ts'

function appendAssistant(session: Session, turn: number, text: string, surfaceOp: 'append' | { op: 'replace'; start: number; end: number } = 'append') {
  const sourceEventSeqs = surfaceOp === 'append' ? [] : [...session.surface.nodes]
  return session.append('assistant/message', {
    turn,
    step: 1,
    message: createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 'fixture', model: 'fixture' } }),
  }, { surfaceOp, sourceEventSeqs })
}

test('parses only the three private reply-version operations', () => {
  assert.deepEqual(parseGenerationRequest('{"operation":"regenerate","replySeq":4}'), { operation: 'regenerate', replySeq: 4 })
  assert.deepEqual(parseGenerationRequest('{"operation":"continue","replySeq":4}'), { operation: 'continue', replySeq: 4 })
  assert.deepEqual(parseGenerationRequest('{"operation":"select","replySeq":4,"versionIndex":1}'), { operation: 'select', replySeq: 4, versionIndex: 1 })
  assert.throws(() => parseGenerationRequest('{"operation":"select","replySeq":4,"versionIndex":-1}'), /版本序号无效/)
  assert.throws(() => parseGenerationRequest('{"operation":"regenerate","replySeq":4,"extra":true}'), /未知字段/)
})

test('folds latest selectable reply group snapshots across replacement events', () => {
  const session = Session.create(SessionId('generation-fold'))
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '你好' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  const original = appendAssistant(session, 1, '第一版')
  const generated = appendAssistant(session, 2, '第二版')
  const replacement = appendAssistant(session, 2, '第二版', { op: 'replace', start: 0, end: generated.seq })
  const groupId = '00000000-0000-4000-8000-000000000001'
  const firstState = {
    format: 0,
    groupId,
    operation: 'regenerate',
    originSeq: original.seq,
    anchorSeq: original.seq,
    assistantSeqs: [original.seq, generated.seq],
    versions: [{ seq: original.seq, text: '第一版' }, { seq: generated.seq, text: '第二版' }],
    selectedVersionSeq: generated.seq,
    surfaceSeq: replacement.seq,
  } as const
  session.append('command/done', { commandId: CommandId('generation-1'), kind: 'success', text: encodeGenerationState(firstState) })
  const restored = appendAssistant(session, 1, '第一版', { op: 'replace', start: replacement.seq, end: replacement.seq })
  const selectedState = {
    format: 0,
    groupId,
    operation: 'select',
    originSeq: original.seq,
    anchorSeq: original.seq,
    assistantSeqs: [original.seq, generated.seq],
    versions: [{ seq: original.seq, text: '第一版' }, { seq: generated.seq, text: '第二版' }],
    selectedVersionSeq: original.seq,
    surfaceSeq: restored.seq,
  } as const
  session.append('command/done', { commandId: CommandId('generation-2'), kind: 'success', text: encodeGenerationState(selectedState) })

  const [group] = readGenerationGroups(session.events)
  assert.equal(group?.selectedVersionSeq, original.seq)
  assert.equal(group?.surfaceSeq, restored.seq)
  assert.deepEqual(session.deriveMessages().map(message => message.content[0]?.type === 'text' ? message.content[0].text : ''), ['第一版'])
})

test('regenerates without exposing the rejected reply to the replacement request', async () => {
  const session = Session.create(SessionId('generation-isolated-regenerate'))
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '请描述没有状态栏的房间。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const original = appendAssistant(session, 1, '有问题的回复\n<状态栏>仍然显示</状态栏>')
  let requestTranscript: readonly string[] = []
  const agent = {
    session,
    status: 'idle',
    inbox: { hasPending: false },
    followup(message: ReturnType<typeof createUserMessage>) {
      session.append('user/message', message, { surfaceOp: 'append' })
      requestTranscript = session.deriveMessages().map(item => item.content.flatMap(block =>
        block.type === 'text' ? [block.text] : []).join('\n'))
      appendAssistant(session, 2, '房间里只有安静的灯光。')
    },
    whenIdle: async () => {},
    cancel: () => {},
  }

  const result = await executeGenerationCommand({
    agent: agent as never,
    rawInput: JSON.stringify({ operation: 'regenerate', replySeq: original.seq }),
    signal: new AbortController().signal,
  })
  const state = decodeGenerationState(result.text)

  assert.equal(requestTranscript.some(text => text.includes('有问题的回复') || text.includes('<状态栏>')), false)
  assert.deepEqual(session.deriveMessages().map(message => message.content.flatMap(block =>
    block.type === 'text' ? [block.text] : []).join('\n')), [
    '请描述没有状态栏的房间。',
    '房间里只有安静的灯光。',
  ])
  assert.deepEqual(state?.versions.map(version => version.text), [
    '有问题的回复\n<状态栏>仍然显示</状态栏>',
    '房间里只有安静的灯光。',
  ])
})

test('restores the selected reply when isolated regeneration produces no replacement', async () => {
  const session = Session.create(SessionId('generation-isolated-regenerate-failure'))
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '继续。' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  const original = appendAssistant(session, 1, '保留这一版。')
  const agent = {
    session,
    status: 'idle',
    inbox: { hasPending: false },
    followup(message: ReturnType<typeof createUserMessage>) {
      session.append('user/message', message, { surfaceOp: 'append' })
    },
    whenIdle: async () => {},
    cancel: () => {},
  }

  await assert.rejects(executeGenerationCommand({
    agent: agent as never,
    rawInput: JSON.stringify({ operation: 'regenerate', replySeq: original.seq }),
    signal: new AbortController().signal,
  }), /模型没有生成可用的角色回复/u)

  assert.deepEqual(session.deriveMessages().map(message => message.content.flatMap(block =>
    block.type === 'text' ? [block.text] : []).join('\n')), ['继续。', '保留这一版。'])
})

test('triggers one reply after a Tavern script appends a user message', async () => {
  const session = Session.create(SessionId('tavern-trigger'))
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: '延续当前剧情' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  let triggerText: string | undefined
  const agent = {
    session,
    status: 'idle',
    inbox: { hasPending: false },
    followup(message: ReturnType<typeof createUserMessage>) {
      triggerText = message.content[0]?.type === 'text' ? message.content[0].text : undefined
      appendAssistant(session, 2, '角色继续回应')
    },
    whenIdle: async () => {},
    cancel: () => {},
  }
  const result = await executeTavernTrigger({
    agent: agent as never, rawInput: '', signal: new AbortController().signal,
  })

  assert.equal(triggerText, 'Respond to the latest user-authored roleplay message. Output only the in-character response.')
  assert.deepEqual(JSON.parse(result.text), { format: 0, assistantSeq: 1 })
  assert.deepEqual(session.deriveMessages().map(message => message.content[0]?.type === 'text' ? message.content[0].text : ''), [
    '延续当前剧情', '角色继续回应',
  ])
})

test('refuses a bare Tavern trigger without a latest user message', async () => {
  const session = Session.create(SessionId('tavern-trigger-without-user'))
  appendAssistant(session, 1, '角色上一条回复')
  await assert.rejects(executeTavernTrigger({
    agent: {
      session, status: 'idle', inbox: { hasPending: false }, followup: () => {}, whenIdle: async () => {}, cancel: () => {},
    } as never,
    rawInput: '', signal: new AbortController().signal,
  }), /需要先添加一条用户消息/u)
})
