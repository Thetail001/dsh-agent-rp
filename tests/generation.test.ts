import assert from 'node:assert/strict'
import test from 'node:test'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { encodeGenerationState, parseGenerationRequest, readGenerationGroups } from '../src/generation.ts'
import { CommandId } from '@deepseek-ai/dsh-commands'

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
