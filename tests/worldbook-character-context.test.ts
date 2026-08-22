import assert from 'node:assert/strict'
import test from 'node:test'

import { Context } from '@deepseek-ai/cordis'
import { AgentRegistry, agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import type { CharacterImportMeta } from '../src/import/session-character.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { createScope } from '@deepseek-ai/dsh-scope'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import {
  coalesceWorldbookSnapshot,
  createWorldbookCharacterContextRegistry,
  installWorldbookSnapshotCoalescing,
  worldbookCharacterContext,
} from '../src/worldbook-character-context.ts'

function meta(raw: CharacterImportMeta['raw']): CharacterImportMeta {
  return {
    format: 0,
    result: {
      version: 0,
      name: '角色显示名',
      cardVersion: 3,
      sourceEventSeq: 1,
      sourceAttachmentId: 'fixture',
      transport: 'png',
      metadataKeyword: 'ccv3',
      greetingIndex: 0,
      selectedGreeting: '',
      degradations: [],
    },
    raw,
  }
}

test('projects the SillyTavern filename and deduplicated tags for character filters', () => {
  assert.deepEqual(worldbookCharacterContext(meta({
    spec: 'chara_card_v3',
    data: { tags: ['magic', ' magic ', 'science', 42] },
  }), 'Railgun.profile.png'), {
    name: 'Railgun.profile',
    tags: ['magic', 'science'],
  })
  assert.deepEqual(worldbookCharacterContext(meta({}), undefined), {
    name: '角色显示名', tags: [],
  })
})

test('unregisters only the matching live session contribution', () => {
  const registry = createWorldbookCharacterContextRegistry()
  const first = registry.register('session', () => ({ name: 'first', tags: [] }))
  const second = registry.register('session', () => ({ name: 'second', tags: ['active'] }))
  first()
  assert.deepEqual(registry.getCurrentCharacter('session'), { name: 'second', tags: ['active'] })
  second()
  assert.equal(registry.getCurrentCharacter('session'), undefined)
})

const worldbookMessage = (text: string) => createUserMessage({
  content: [{ type: 'text', text }],
  source: { kind: 'plugin', plugin: 'dsh-worldbook', form: 'instructions' },
})

test('publishes one external Worldbook evaluation as a snapshot', () => {
  const first = worldbookMessage('first')
  const second = worldbookMessage('second')
  const ordinary = createUserMessage({
    content: [{ type: 'text', text: 'ordinary' }],
    source: { kind: 'plugin', plugin: 'other', form: 'instructions' },
  })
  const result = coalesceWorldbookSnapshot([first, ordinary, second])

  assert.equal(result.length, 2)
  assert.deepEqual(result[0]?.content, [
    { type: 'text', text: 'first' },
    { type: 'text', text: 'second' },
  ])
  assert.deepEqual(result[0]?.source, {
    kind: 'plugin',
    plugin: 'dsh-worldbook',
    form: 'snapshot',
    sections: [
      { name: 'dsh-worldbook:1', text: 'first' },
      { name: 'dsh-worldbook:2', text: 'second' },
    ],
  })
  assert.equal(result[1], ordinary)
  const untouched = [ordinary]
  assert.equal(coalesceWorldbookSnapshot(untouched), untouched)
})

test('coalesces a Worldbook injector loaded after Agent RP', async (context) => {
  const root = new Context()
  await root.plugin(AgentRegistry)
  installWorldbookSnapshotCoalescing(root)
  root.on('agent/pre-step', async (_payload, next) => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    return {
      kind: 'enter',
      messages: [...decision.messages, worldbookMessage('first'), worldbookMessage('second')],
    }
  }, { global: true, prepend: true })

  const id = SessionId('worldbook-snapshot-order')
  const agent = { id, session: Session.create(id) } as Agent
  const scope = createScope(root, agent)
  Object.assign(agent, { ctx: scope.ctx })
  const unregister = root.agents.register(agent)
  const ordinary = createUserMessage({
    content: [{ type: 'text', text: 'ordinary' }],
    source: { kind: 'user' },
  })
  const decision = await agentEvents(root, agent).waterfall(
    'agent/pre-step',
    { messages: [ordinary], turn: 1, step: 1, signal: AbortSignal.timeout(5_000) },
    async () => ({ kind: 'enter', messages: [ordinary] }),
  )

  assert.equal(decision.kind, 'enter')
  if (decision.kind === 'enter') {
    assert.equal(decision.messages.length, 2)
    assert.equal(decision.messages[0], ordinary)
    assert.equal(decision.messages[1]?.source.kind, 'plugin')
    assert.equal(decision.messages[1]?.source.form, 'snapshot')
    assert.deepEqual(decision.messages[1]?.content, [
      { type: 'text', text: 'first' },
      { type: 'text', text: 'second' },
    ])
  }

  context.after(async () => {
    unregister()
    await scope.dispose()
    await root.fiber.dispose()
  })
})
