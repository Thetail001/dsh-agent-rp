import assert from 'node:assert/strict'
import test from 'node:test'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { ImportedCharacterCard, ImportedRegexScript } from '../src/import/types.ts'
import { roleplayVisibleDialogue, roleplayVisibleTranscript } from '../src/prompt.ts'
import { applyPromptRegexSurface } from '../src/prompt-regex-stream.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'

const script = (placement: number, findRegex: string, replaceString: string): ImportedRegexScript => ({
  scriptName: `${placement}:${findRegex}`,
  findRegex,
  replaceString,
  trimStrings: [],
  placement: [placement],
  disabled: false,
  markdownOnly: false,
  promptOnly: true,
  runOnEdit: false,
  substituteRegex: 0,
  minDepth: null,
  maxDepth: null,
})

function card(regexScripts: readonly ImportedRegexScript[]): ImportedCharacterCard {
  return {
    format: 0,
    version: 3,
    specVersion: '3.0',
    name: '测试角色',
    description: '',
    personality: '',
    scenario: '',
    firstMessage: '',
    messageExample: '',
    alternateGreetings: [],
    systemPrompt: '',
    postHistoryInstructions: '',
    frontend: { regexScripts, tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {} },
    degradations: [],
    raw: {},
  }
}

function textHistory(session: Session): string[] {
  return session.deriveMessages().flatMap(message =>
    message.content.flatMap(block => block.type === 'text' ? [block.text] : []))
}

function openConversation(): Session {
  const session = Session.create(SessionId('prompt-regex'))
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('user/message', createUserMessage({
    source: { kind: 'user' }, content: [{ type: 'text', text: 'secret one' }],
  }), { surfaceOp: 'append' })
  session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      source: { provider: 'mock', model: 'mock' },
      content: [{ type: 'text', text: 'old answer' }],
    }),
  }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  session.append('turn/start', { turn: 2 })
  session.append('step/start', { turn: 2, step: 1 })
  session.append('user/message', createUserMessage({
    source: { kind: 'user' }, content: [{ type: 'text', text: 'secret two' }],
  }), { surfaceOp: 'append' })
  return session
}

test('logs prompt-only replacements while the visible projection keeps append-origin text', () => {
  const session = openConversation()
  const active = card([
    script(1, '/secret/gu', 'masked'),
    script(2, '/old/gu', 'prior'),
  ])

  const first = applyPromptRegexSurface(session, active, '用户')
  assert.equal(first?.replacementCount, 3)
  assert.deepEqual(textHistory(session), ['masked one', 'prior answer', 'masked two'])
  assert.deepEqual(roleplayVisibleDialogue(session), ['secret one', 'old answer', 'secret two'])
  assert.deepEqual(roleplayVisibleTranscript(session), [
    { role: 'user', content: 'secret one' },
    { role: 'assistant', content: 'old answer' },
    { role: 'user', content: 'secret two' },
  ])
  assert.deepEqual(first?.scripts.map(item => [item.outcome, item.affectedMessages]), [
    ['applied', 2],
    ['applied', 1],
  ])

  const second = applyPromptRegexSurface(session, active, '用户')
  assert.equal(second?.replacementCount, 0)
  assert.deepEqual(textHistory(session), ['masked one', 'prior answer', 'masked two'])
  assert.equal(session.events.some(event => String(event.type) === 'agent-rp/prompt-regex-trace'), false)

  const reopened = Session.create(SessionId('prompt-regex-reopened'), session.events)
  assert.deepEqual(textHistory(reopened), ['masked one', 'prior answer', 'masked two'])

  let state = agentRpProjectionDefinition.init()
  for (const event of reopened.events) state = agentRpProjectionDefinition.apply(state, event)
  assert.deepEqual(state.surface.map(message => message.text), ['secret one', 'old answer', 'secret two'])
  const projection = agentRpProjectionDefinition.wire.view(state)
  assert.deepEqual(projection.promptRegex, second)

  const restored = applyPromptRegexSurface(session, card([]), '用户')
  assert.equal(restored?.replacementCount, 3)
  assert.deepEqual(textHistory(session), ['secret one', 'old answer', 'secret two'])
})
