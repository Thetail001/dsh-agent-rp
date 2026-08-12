import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { installAgentRp } from '../src/index.ts'
import { installBundledAgentRpPreset } from '../src/preset.ts'

const SOURCE = resolve('preset')

function temporaryRoot(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-agent-rp-preset-'))
}

test('installs one idempotent managed preset', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))

  assert.equal(installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }), 'created')
  assert.equal(installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }), 'unchanged')
  assert.match(readFileSync(join(root, 'agent-rp', 'agent.cordis.yml'), 'utf8'), /mode: character/u)
  assert.match(readFileSync(join(root, 'agent-rp', 'preset.yml'), 'utf8'), /角色会话/u)
})

test('refuses to replace a locally edited managed preset', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))
  installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE })
  writeFileSync(join(root, 'agent-rp', 'preset.yml'), 'name: 我的角色\n', 'utf8')

  assert.throws(
    () => installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }),
    /edited locally/u,
  )
})

test('refuses to claim an existing user preset with the reserved id', (context) => {
  const root = temporaryRoot()
  context.after(() => rmSync(root, { recursive: true, force: true }))
  const target = join(root, 'agent-rp')
  mkdirSync(target)
  writeFileSync(join(target, 'agent.cordis.yml'), '[]\n', 'utf8')
  assert.throws(
    () => installBundledAgentRpPreset({ presetRoot: root, sourceDir: SOURCE }),
    /not managed/u,
  )
})

test('claims character-card images for every Agent joined to the preset, including Agents joined after publication', async (context) => {
  const root = new Context()
  await root.plugin(AgentRegistry)
  const presetKey = {}
  const preset = createScope(root, presetKey)
  const claims = new Map<string, (offer: {
    agent: Agent
    content: ReadonlyArray<
      | { type: 'text'; text: string }
      | { type: 'image'; mediaType: string; name?: string }
    >
  }) => { text: string } | undefined>()
  root.provide('apiProxy' as never, {
    registerPromptAttachmentConsumer(name: string, consumer: (typeof claims extends Map<string, infer T> ? T : never)) {
      claims.set(name, consumer)
      return () => { claims.delete(name) }
    },
  } as never)
  root.provide('systemPrompt' as never, {
    section: () => () => {},
    context: () => () => {},
  } as never)
  root.provide('tools' as never, { register: () => () => {} } as never)
  root.provide('attachments' as never, {} as never)
  installAgentRp(preset.ctx, resolveConfig({ mode: 'character' }))
  const consumer = claims.get('dsh-agent-rp')
  assert.ok(consumer)

  const joinedAgent = {
    id: SessionId('joined-character'),
    session: Session.create(SessionId('joined-character')),
  } as Agent
  const siblingAgent = {
    id: SessionId('sibling-agent'),
    session: Session.create(SessionId('sibling-agent')),
  } as Agent
  const joined = createScope(root, joinedAgent, { parent: presetKey })
  const sibling = createScope(root, siblingAgent)
  Object.assign(joinedAgent, { ctx: joined.ctx })
  Object.assign(siblingAgent, { ctx: sibling.ctx })
  const disposeJoined = root.agents.register(joinedAgent)
  const disposeSibling = root.agents.register(siblingAgent)
  const content = [
    { type: 'text' as const, text: '导入这张角色卡' },
    { type: 'image' as const, mediaType: 'image/png', name: 'card.png' },
  ]
  assert.deepEqual(consumer({ agent: joinedAgent, content }), { text: '导入这张角色卡' })
  assert.equal(consumer({ agent: siblingAgent, content }), undefined)

  context.after(async () => {
    disposeSibling()
    disposeJoined()
    await joined.dispose()
    await sibling.dispose()
    await preset.dispose()
    await root.fiber.dispose()
  })
})
