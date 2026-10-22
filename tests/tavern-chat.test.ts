import assert from 'node:assert/strict'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import {Session, SessionId} from '@deepseek-ai/dsh-session'
import { messageEditProjection } from '../src/message-edit.ts'
import { modelVisibleDialogue } from '../src/prompt.ts'
import { executeTavernChatMutation } from '../src/tavern-chat.ts'
import type { TavernChatMutationRequest } from '../src/tavern-helper.ts'

function createTranscript(...messages: readonly { readonly role: 'assistant' | 'user'; readonly text: string }[]): {
  readonly agent: Agent
  readonly session: Session
} {
  // 0.2.1：assistant 楼层的内容编辑是投影记录，派生消息与模型请求都读投影后的文本。
  const session = Session.create(
    SessionId(`tavern-chat-${crypto.randomUUID()}`),
    undefined,
    undefined,
    undefined,
    [messageEditProjection],
  )
  for (const message of messages) {
    if (message.role === 'user') {
      session.append('user/message', createUserMessage({
        content: [{ type: 'text', text: message.text }],
        source: { kind: 'user' },
      }), { surfaceOp: 'append' })
      continue
    }
    session.append('assistant/message', { stream: [],
      turn: 1,
      step: 1,
      message: createAssistantMessage({
        content: [{ type: 'text', text: message.text }],
        source: { provider: 'fixture', model: 'fixture' },
      }),
    }, { surfaceOp: 'append' })
  }
  return { session, agent: { session } as unknown as Agent }
}

function transcript(session: Session): readonly string[] {
  return session.deriveMessages().map(message => message.content
    .flatMap(block => block.type === 'text' ? [block.text] : []).join('\n'))
}

test('mutates the real Session transcript with Tavern Helper chat operations', () => {
  const { agent, session } = createTranscript(
    { role: 'user', text: '一' },
    { role: 'assistant', text: '二' },
    { role: 'user', text: '三' },
  )

  executeTavernChatMutation(agent, {
    format: 0,
    operation: 'set-chat-messages',
    messages: [{ message_id: 1, message: '二改' }],
  })
  assert.deepEqual(transcript(session), ['一', '二改', '三'])
  // 改动只落在投影层：assistant 事件本体仍是原文，派生消息按编辑记录重写。
  assert.equal(session.snapshotEvents().some(event => event.type === 'plugin:agent-rp/message-edit'), true)
  assert.deepEqual(session.snapshotEvents().flatMap(event => event.type === 'assistant/message'
    ? event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : [])
    : []), ['二'])

  // 0.2.1：表面不能缩小、重排或在中间插入；删除/移动/中间插入统一明确报错、不留部分修改
  //（隐藏前缀见下一个用例）。
  const refused: TavernChatMutationRequest[] = [
    { format: 0, operation: 'create-chat-messages', insertAt: 1, messages: [{ role: 'assistant', message: '插入' }] },
    { format: 0, operation: 'delete-chat-messages', messageIds: [2] },
    { format: 0, operation: 'rotate-chat-messages', begin: 0, middle: 1, end: 3 },
  ]
  const beforeRefused = session.seq
  for (const request of refused) {
    assert.throws(() => executeTavernChatMutation(agent, request),
      /当前 DSH 版本不支持删除、移动、隐藏或中间插入聊天楼层，仅支持末尾新增与内容编辑/u)
  }
  assert.equal(session.seq, beforeRefused)
  assert.deepEqual(transcript(session), ['一', '二改', '三'])

  // 末尾新增仍然是真实 append，脚本数据的落点不变。
  const result = executeTavernChatMutation(agent, {
    format: 0,
    operation: 'create-chat-messages',
    insertAt: 'end',
    messages: [{ role: 'assistant', message: '末尾', data: { mood: 'calm' } }],
  })
  assert.deepEqual(transcript(session), ['一', '二改', '三', '末尾'])
  assert.deepEqual(result.messageVariables, { mood: 'calm' })
})

test('rejects unrepresentable transcript changes before appending Session events', () => {
  const { agent, session } = createTranscript(
    { role: 'user', text: '一' },
    { role: 'assistant', text: '二' },
  )
  const originalSeq = session.seq

  assert.throws(() => executeTavernChatMutation(agent, {
    format: 0,
    operation: 'create-chat-messages',
    insertAt: 0,
    messages: [{ role: 'user', message: '插入', data: { shouldNotPersist: true } }],
  }), /仅支持为追加到末尾/)
  assert.equal(session.seq, originalSeq)
  assert.deepEqual(transcript(session), ['一', '二'])

  assert.throws(() => executeTavernChatMutation(agent, {
    format: 0,
    operation: 'create-chat-messages',
    insertAt: 'end',
    messages: [{ role: 'assistant', message: '不应追加', swipes_data: [{}, {}] }],
  }), /不能保存多个回复页的变量/)
  assert.equal(session.seq, originalSeq)
  assert.deepEqual(transcript(session), ['一', '二'])

  assert.throws(() => executeTavernChatMutation(agent, {
    format: 0,
    operation: 'set-chat-messages',
    messages: [
      { message_id: 0, message: '不应写入' },
      { message_id: 1, swipes: ['甲', '乙'] },
    ],
  }), /不能由脚本创建多个回复页/)
  assert.equal(session.seq, originalSeq)
  assert.deepEqual(transcript(session), ['一', '二'])

  assert.throws(() => executeTavernChatMutation(agent, {
    format: 0,
    operation: 'delete-chat-messages',
    messageIds: [0, 1],
  }), /不能删除.*全部聊天楼层/)
  assert.equal(session.seq, originalSeq)
  assert.deepEqual(transcript(session), ['一', '二'])
})

// 0.2.1 起隐藏/恢复楼层被平台禁止：用例由「隐藏前缀」改为「明确拒绝 + 仍可用的投影与末尾新增」。
test('rejects hiding a retained transcript prefix while content edits and end appends stay usable', () => {
  const { agent, session } = createTranscript(
    { role: 'user', text: '旧问题' },
    { role: 'assistant', text: '旧回复' },
    { role: 'user', text: '总结请求' },
    { role: 'assistant', text: '压缩后的总结' },
  )
  const beforeSeq = session.seq
  const beforeTranscript = transcript(session)
  const beforeNodes = [...session.surface.nodes]

  // 0.2.1：隐藏前缀曾靠 surface replace 缩小表面实现，平台禁止后降级为明确报错。
  assert.throws(() => executeTavernChatMutation(agent, {
    format: 0, operation: 'set-chat-hidden', start: 0, end: 1, hidden: true,
  }), /当前 DSH 版本不支持删除、移动、隐藏或中间插入聊天楼层，仅支持末尾新增与内容编辑/u)
  assert.equal(session.seq, beforeSeq)
  assert.deepEqual(transcript(session), beforeTranscript)

  // 正向：末尾新增仍然 append 到真实表面。
  executeTavernChatMutation(agent, {
    format: 0, operation: 'create-chat-messages', insertAt: 'end',
    messages: [{ role: 'assistant', message: '总结后续' }],
  })
  assert.deepEqual(transcript(session), [...beforeTranscript, '总结后续'])

  // 正向：内容编辑走投影，模型可见历史立刻反映编辑后文本，原始日志保留原文。
  executeTavernChatMutation(agent, {
    format: 0,
    operation: 'set-chat-messages',
    messages: [{ message_id: 3, message: '压缩后的总结（修订）' }],
  })
  assert.deepEqual(transcript(session), ['旧问题', '旧回复', '总结请求', '压缩后的总结（修订）', '总结后续'])
  assert.deepEqual(modelVisibleDialogue(session),
    ['旧问题', '旧回复', '总结请求', '压缩后的总结（修订）', '总结后续'])
  assert.deepEqual(session.snapshotEvents().flatMap(event => event.type === 'assistant/message'
    ? event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : [])
    : []), ['旧回复', '压缩后的总结', '总结后续'])

  // 表面只增不减：历史完整性由平台保证，脚本不能再把楼层移出表面。
  assert.equal(beforeNodes.every(seq => session.surface.nodes.includes(seq)), true)
})
