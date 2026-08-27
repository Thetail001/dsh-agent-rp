import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { StoryWorkspaceSnapshot } from '../src/story-workspace-protocol.ts'
import { runStoryTurnPipeline } from '../src/story-turn-pipeline.ts'
import { installIgnorableSessionEventFixture } from './session-event-fixture.ts'

installIgnorableSessionEventFixture()

const aliceId = 'character-00000000-0000-4000-8000-000000000001'
const bobId = 'character-00000000-0000-4000-8000-000000000002'
const sectionId = 'section-00000000-0000-4000-8000-000000000001'
const sourceId = 'source-00000000-0000-4000-8000-000000000001'

function workspace(): StoryWorkspaceSnapshot {
  return {
    manifest: {
      format: 0,
      id: 'story-00000000-0000-4000-8000-000000000001',
      name: '隔离流水线',
      revision: 3,
      createdAt: 1,
      updatedAt: 2,
      characters: [
        { id: aliceId, name: '阿梨', enabled: true },
        { id: bobId, name: '柏舟', enabled: true },
      ],
      sections: [{ id: sectionId, name: '正文', kind: 'prose', enabled: true }],
      sources: [{ id: sourceId, name: '检索原著设定', kind: 'web', enabled: true }],
    },
    documents: {
      outline: '导演知道下一幕会停电。',
      foreshadowing: '怀表将在第三幕打开。',
      history: '两人都看见雨停了。',
      characters: [
        { id: aliceId, persona: '阿梨谨慎。', knowledge: '阿梨知道徽章的主人。' },
        { id: bobId, persona: '柏舟果断。', knowledge: '柏舟藏起了车票。' },
      ],
      sections: [{ id: sectionId, content: '保持第三人称。' }],
      sources: [{ id: sourceId, content: '只查询作品官方设定与原著章节' }],
    },
  }
}

test('runs logged story stages while keeping each character request privately scoped', async () => {
  const session = Session.create(SessionId('story-turn-pipeline'))
  session.append('request/header', {
    reason: 'initial',
    header: { config: { provider: 'fixture', model: 'fixture', maxTokens: 8_192 } },
  })
  const characterBodies: string[] = []
  let researchBody = ''
  let webQuery = ''
  let calls = 0
  const fake = {
    get(name: string) {
      if (name !== 'web') return undefined
      return {
        async search(request: { readonly query: string }) {
          webQuery = request.query
          return {
            sources: [{ url: 'https://example.test/original', title: '原著资料', snippet: '徽章属于旧车站。' }],
            truncated: false,
          }
        },
      }
    },
    sessions: { flush: async () => true },
    llm: {
      stream(options: { readonly system?: string; readonly messages: readonly unknown[] }) {
        calls += 1
        const system = options.system ?? ''
        const body = JSON.stringify(options.messages)
        let text: string
        if (system.includes('剧情研究 Worker')) {
          researchBody = body
          text = '研究简报'
        }
        else if (system.includes('指定人物认知')) {
          characterBodies.push(body)
          text = body.includes('阿梨知道徽章') ? '阿梨先观察徽章。' : '柏舟避开车票话题。'
        } else if (system.includes('剧情导演 Worker')) text = '导演方案'
        else if (system.includes('分区的正文 Worker')) text = '尚显重复的粗稿。尚显重复的粗稿。'
        else text = '雨停后，阿梨看向徽章，柏舟移开视线。'
        return (async function* () {
          yield { type: 'block-start', index: 0, blockType: 'text' }
          yield { type: 'text-delta', index: 0, text }
          yield { type: 'block-end', index: 0, block: { type: 'text', text } }
          yield { type: 'finish', reason: { kind: 'stop' } }
        })()
      },
    },
  } as unknown as Context
  const agent = {
    id: session.id,
    options: { provider: 'fixture', model: 'fixture', maxTokens: 8_192 },
    session,
  } as Agent
  const message = createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: '玩家举起徽章。' }] })
  const input = {
    ctx: fake,
    agent,
    workspace: workspace(),
    turn: 1,
    step: 1,
    messages: [message],
    signal: new AbortController().signal,
  }

  const result = await runStoryTurnPipeline(input)

  assert.equal(calls, 6)
  assert.equal(characterBodies.length, 2)
  assert.match(webQuery, /官方设定与原著章节/u)
  assert.match(webQuery, /玩家举起徽章/u)
  assert.match(researchBody, /徽章属于旧车站/u)
  assert.match(characterBodies[0]!, /阿梨知道徽章/u)
  assert.doesNotMatch(characterBodies[0]!, /柏舟藏起了车票|下一幕会停电|第三幕打开/u)
  assert.match(characterBodies[1]!, /柏舟藏起了车票/u)
  assert.doesNotMatch(characterBodies[1]!, /阿梨知道徽章|下一幕会停电|第三幕打开/u)
  assert.match(result.finalDraft, /阿梨看向徽章/u)
  assert.match(result.modelContext, /阿梨看向徽章/u)
  assert.doesNotMatch(result.modelContext, /导演方案|下一幕会停电|第三幕打开/u)
  assert.equal(session.events.filter(event => event.type === 'agent-rp/story-stage-request').length, 6)
  assert.equal(session.events.filter(event => event.type === 'agent-rp/story-stage-result').length, 6)
  assert.equal(session.events.filter(event => event.type === 'agent-rp/story-turn-brief').length, 1)
  assert.equal(session.events.filter(event => event.type === 'agent-rp/story-web-search-request').length, 1)
  assert.equal(session.events.filter(event => event.type === 'agent-rp/story-web-search-result').length, 1)
  assert.equal(session.events.every(event => !event.type.startsWith('agent-rp/story-') || event.ignorable === true), true)

  assert.deepEqual(await runStoryTurnPipeline(input), result)
  assert.equal(calls, 6)
})
