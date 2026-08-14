import assert from 'node:assert/strict'
import test from 'node:test'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { executeTavernChatMutation } from '../src/tavern-chat.ts'

function createTranscript(...messages: readonly { readonly role: 'assistant' | 'user'; readonly text: string }[]): {
  readonly agent: Agent
  readonly session: Session
} {
  const session = Session.create(SessionId(`tavern-chat-${crypto.randomUUID()}`))
  for (const message of messages) {
    if (message.role === 'user') {
      session.append('user/message', createUserMessage({
        content: [{ type: 'text', text: message.text }],
        source: { kind: 'user' },
      }), { surfaceOp: 'append' })
      continue
    }
    session.append('assistant/message', {
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

  executeTavernChatMutation(agent, {
    format: 0,
    operation: 'create-chat-messages',
    insertAt: 1,
    messages: [{ role: 'assistant', message: '插入' }],
  })
  assert.deepEqual(transcript(session), ['一', '插入', '二改', '三'])

  executeTavernChatMutation(agent, {
    format: 0,
    operation: 'delete-chat-messages',
    messageIds: [2],
  })
  assert.deepEqual(transcript(session), ['一', '插入', '三'])

  executeTavernChatMutation(agent, {
    format: 0,
    operation: 'rotate-chat-messages',
    begin: 0,
    middle: 1,
    end: 3,
  })
  assert.deepEqual(transcript(session), ['插入', '三', '一'])

  const result = executeTavernChatMutation(agent, {
    format: 0,
    operation: 'create-chat-messages',
    insertAt: 'end',
    messages: [{ role: 'assistant', message: '末尾', data: { mood: 'calm' } }],
  })
  assert.deepEqual(transcript(session), ['插入', '三', '一', '末尾'])
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
