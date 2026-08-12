import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { CharacterCardAttachmentRef, FileAttachmentRef } from '../src/import/session-character.ts'
import { readActiveSessionCharacter } from '../src/import/session-character.ts'
import { resolveConfig } from '../src/config.ts'
import { installAgentRp, isCharacterCardSessionOffer, isSillyTavernChatOffer } from '../src/index.ts'
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
      | { type: 'file'; name: string; mediaType?: string }
    >
  }) => { text: string } | undefined>()
  const importers = new Map<string, {
    recognize(offer: {
      agent: Agent
      content: ReadonlyArray<
        | { type: 'text'; text: string }
        | { type: 'image'; mediaType: string; name?: string }
        | { type: 'file'; name: string; mediaType?: string }
      >
    }): boolean
    import(input: {
      source: Agent
      text: string
      attachments: readonly CharacterCardAttachmentRef[]
      readFile(ref: FileAttachmentRef, signal?: AbortSignal): Promise<Uint8Array>
    }, signal?: AbortSignal): Promise<{ seed: readonly SessionEvent[]; title?: string }>
  }>()
  root.provide('apiProxy' as never, {
    registerPromptAttachmentConsumer(name: string, consumer: (typeof claims extends Map<string, infer T> ? T : never)) {
      claims.set(name, consumer)
      return () => { claims.delete(name) }
    },
    registerPromptSessionImporter(name: string, importer: (typeof importers extends Map<string, infer T> ? T : never)) {
      importers.set(name, importer)
      return () => { importers.delete(name) }
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
  const chatImporter = importers.get('dsh-agent-rp:sillytavern-chat')
  const cardImporter = importers.get('dsh-agent-rp:character-card')
  assert.ok(consumer)
  assert.ok(chatImporter)
  assert.ok(cardImporter)

  const joinedAgent = {
    id: SessionId('joined-character'),
    session: Session.create(SessionId('joined-character')),
  } as Agent
  const siblingAgent = {
    id: SessionId('sibling-agent'),
    session: Session.create(SessionId('sibling-agent')),
  } as Agent
  const laterJoinedAgent = {
    id: SessionId('later-joined-character'),
    session: Session.create(SessionId('later-joined-character')),
  } as Agent
  const joined = createScope(root, joinedAgent, { parent: presetKey })
  const laterJoined = createScope(root, laterJoinedAgent, { parent: presetKey })
  const sibling = createScope(root, siblingAgent)
  Object.assign(joinedAgent, { ctx: joined.ctx })
  Object.assign(laterJoinedAgent, { ctx: laterJoined.ctx })
  Object.assign(siblingAgent, { ctx: sibling.ctx })
  const disposeJoined = root.agents.register(joinedAgent)
  const disposeLaterJoined = root.agents.register(laterJoinedAgent)
  const disposeSibling = root.agents.register(siblingAgent)
  const content = [
    { type: 'text' as const, text: '导入这张角色卡' },
    { type: 'image' as const, mediaType: 'image/png', name: 'card.png' },
  ]
  assert.deepEqual(consumer({ agent: joinedAgent, content }), { text: '导入这张角色卡' })
  assert.equal(consumer({ agent: siblingAgent, content }), undefined)
  assert.deepEqual(consumer({ agent: joinedAgent, content: [
    { type: 'text', text: '导入这张角色卡' },
    { type: 'file', name: 'card.json', mediaType: 'application/json' },
  ] }), { text: '导入这张角色卡' })
  assert.equal(chatImporter.recognize({
    agent: joinedAgent,
    content: [{ type: 'file', name: 'history.jsonl', mediaType: 'application/jsonl' }],
  }), true)
  assert.equal(chatImporter.recognize({
    agent: siblingAgent,
    content: [{ type: 'file', name: 'history.jsonl' }],
  }), false)
  assert.equal(chatImporter.recognize({
    agent: laterJoinedAgent,
    content: [{ type: 'file', name: 'history.jsonl' }],
  }), true)
  const chatBytes = readFileSync('tests/fixtures/manual-sillytavern-chat.jsonl')
  const chatRef = {
    kind: 'file' as const,
    attachmentId: 'sha256:chat' as never,
    bytes: chatBytes.byteLength,
    name: 'history.jsonl',
    mediaType: 'application/x-ndjson',
  }
  const imported = await chatImporter.import({
    source: joinedAgent,
    text: '',
    attachments: [chatRef],
    readFile: async (ref) => {
      assert.equal(ref, chatRef)
      return chatBytes
    },
  })
  assert.equal(imported.title, '白露')
  assert.deepEqual(Session.create(SessionId('imported-chat'), imported.seed).deriveMessages()
    .map(message => message.content[0]?.type === 'text' ? message.content[0].text : undefined), [
      '门还没锁。',
      '那我进来啦。',
      '窗外响起整点钟声。',
    ])
  const cardBytes = readFileSync('tests/fixtures/manual-character-card.json')
  const cardRef = {
    kind: 'file' as const,
    attachmentId: 'sha256:card' as never,
    bytes: cardBytes.byteLength,
    name: '白露.json',
    mediaType: 'application/json',
  }
  const importedCard = await cardImporter.import({
    source: joinedAgent,
    text: '请导入这张角色卡',
    attachments: [cardRef],
    readFile: async () => cardBytes,
  })
  assert.equal(importedCard.title, '白露')
  assert.equal(readActiveSessionCharacter(importedCard.seed)?.result.name, '白露')

  context.after(async () => {
    disposeSibling()
    disposeLaterJoined()
    disposeJoined()
    await joined.dispose()
    await laterJoined.dispose()
    await sibling.dispose()
    await preset.dispose()
    await root.fiber.dispose()
  })
})

test('recognizes one explicitly selected Character Card JSON import', () => {
  const selected = [
    { type: 'text' as const, text: '请导入这张角色卡' },
    { type: 'file' as const, name: '白露.json', mediaType: 'application/json' },
  ]
  assert.equal(isCharacterCardSessionOffer(true, selected), true)
  assert.equal(isCharacterCardSessionOffer(false, selected), false)
  assert.equal(isCharacterCardSessionOffer(true, [
    { type: 'text', text: '请导入这本世界书' },
    { type: 'file', name: '白露.json' },
  ]), false)
})

test('recognizes exactly one JSONL attachment without requiring command text', () => {
  assert.equal(isSillyTavernChatOffer(true, [{ type: 'file', name: 'history.jsonl' }]), true)
  assert.equal(isSillyTavernChatOffer(true, [
    { type: 'text', text: '' },
    { type: 'file', name: 'HISTORY.JSONL' },
  ]), true)
  assert.equal(isSillyTavernChatOffer(true, [
    { type: 'file', name: 'one.jsonl' },
    { type: 'file', name: 'two.jsonl' },
  ]), false)
  assert.equal(isSillyTavernChatOffer(true, [{ type: 'file', name: 'history.json' }]), false)
  assert.equal(isSillyTavernChatOffer(false, [{ type: 'file', name: 'history.jsonl' }]), false)
})
