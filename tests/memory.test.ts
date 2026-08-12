import assert from 'node:assert/strict'
import test from 'node:test'
import { CallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { validateJsonSchemaValue, valueSchemaSpecToJsonSchema } from '@deepseek-ai/dsh-tools'
import { MEMORY_VALUE_SCHEMA } from '../src/index.ts'
import {
  prepareAgentRpMemory,
  type AgentRpMemoryRecord,
  readAgentRpMemoryHistory,
} from '../src/memory.ts'
import { renderMemoryContext } from '../src/prompt.ts'

function appendRememberCall(session: Session, callId: string, args: object): number {
  return session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId(callId),
    name: 'remember',
    arguments: JSON.stringify(args),
  }).seq
}

function appendRememberResult(
  session: Session,
  callId: string,
  record: AgentRpMemoryRecord,
  callSeq: number,
): void {
  session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: [{ type: 'text', text: JSON.stringify(record) }],
      isError: false,
    }),
  }, {
    surfaceOp: 'append',
    sourceEventSeqs: [callSeq],
  })
}

test('persists one normalized memory and exposes it to the next prompt snapshot', () => {
  const session = Session.create(SessionId('agent-rp-memory'))
  const input = {
    kind: 'preference',
    subject: '  饮品  ',
    text: '  用户喝咖啡时不加糖  ',
  } as const
  const sourceEventSeq = appendRememberCall(session, 'remember-1', input)
  const record = prepareAgentRpMemory(session, 'remember-1', input)
  appendRememberResult(session, 'remember-1', record, sourceEventSeq)

  assert.deepEqual(record, {
    version: 0,
    id: `memory-${sourceEventSeq}`,
    kind: 'preference',
    subject: '饮品',
    text: '用户喝咖啡时不加糖',
    sourceEventSeq,
  })
  assert.deepEqual(validateJsonSchemaValue(valueSchemaSpecToJsonSchema(MEMORY_VALUE_SCHEMA), record), [])
  assert.deepEqual(readAgentRpMemoryHistory(session.events).active, [record])
  assert.match(renderMemoryContext(session.events), /用户喝咖啡时不加糖/u)
  assert.match(renderMemoryContext(session.events), new RegExp(`来源事件：#${sourceEventSeq}`, 'u'))
})

test('keeps correction history while only the replacement remains active', () => {
  const session = Session.create(SessionId('agent-rp-correction'))
  const oldInput = {
    kind: 'fact',
    subject: '住处',
    text: '用户住在杭州',
  } as const
  const oldCallSeq = appendRememberCall(session, 'remember-1', oldInput)
  const old = prepareAgentRpMemory(session, 'remember-1', oldInput)
  appendRememberResult(session, 'remember-1', old, oldCallSeq)
  const replacementInput = {
    kind: 'fact',
    subject: '住处',
    text: '用户已经搬到苏州',
    supersedes: old.id,
  } as const
  const replacementCallSeq = appendRememberCall(session, 'remember-2', replacementInput)
  const replacement = prepareAgentRpMemory(session, 'remember-2', replacementInput)
  appendRememberResult(session, 'remember-2', replacement, replacementCallSeq)

  const history = readAgentRpMemoryHistory(session.events)
  assert.deepEqual(history.all, [old, replacement])
  assert.deepEqual(history.active, [replacement])
  assert.doesNotMatch(renderMemoryContext(session.events), /杭州/u)
  assert.match(renderMemoryContext(session.events), /苏州/u)
})

test('rejects blank memory and invalid correction without appending state', () => {
  const session = Session.create(SessionId('agent-rp-invalid'))
  appendRememberCall(session, 'remember-1', {
    kind: 'fact',
    subject: '资料',
    text: '   ',
  })

  assert.throws(() => prepareAgentRpMemory(session, 'remember-1', {
    kind: 'fact',
    subject: '资料',
    text: '   ',
  }), /must contain non-whitespace/u)
  appendRememberCall(session, 'remember-2', {
    kind: 'fact',
    subject: '资料',
    text: '有效内容',
    supersedes: 'memory-999',
  })
  assert.throws(() => prepareAgentRpMemory(session, 'remember-2', {
    kind: 'fact',
    subject: '资料',
    text: '有效内容',
    supersedes: 'memory-999',
  }), /missing or inactive/u)
  assert.equal(readAgentRpMemoryHistory(session.events).all.length, 0)
})

test('rejects a source that is not the direct remember tool call', () => {
  const session = Session.create(SessionId('agent-rp-source'))
  session.append('tool/call', {
    turn: 1,
    step: 1,
    callId: CallId('other-1'),
    name: 'other',
    arguments: '{}',
  })

  assert.throws(() => prepareAgentRpMemory(session, 'other-1', {
    kind: 'fact',
    subject: '资料',
    text: '有效内容',
  }), /matching direct Session tool call/u)
})

test('rejects a durable record that diverges from its source call arguments', () => {
  const session = Session.create(SessionId('agent-rp-tampered-source'))
  const sourceEventSeq = appendRememberCall(session, 'remember-1', {
    kind: 'fact',
    subject: '称呼',
    text: '用户喜欢被叫作阿澄',
  })
  appendRememberResult(session, 'remember-1', {
    version: 0,
    id: `memory-${sourceEventSeq}` as never,
    kind: 'fact',
    subject: '称呼',
    text: '用户喜欢被叫作小澄',
    sourceEventSeq,
  }, sourceEventSeq)

  assert.throws(() => readAgentRpMemoryHistory(session.events), /does not match its source call arguments/u)
})
