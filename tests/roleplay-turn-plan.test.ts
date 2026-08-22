import assert from 'node:assert/strict'
import test from 'node:test'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { resolveConfig } from '../src/config.ts'
import { createEjsWorldInfoBooks, EjsTemplateEngine } from '../src/ejs-template.ts'
import { parseCharacterCardJson } from '../src/import/character-card.ts'
import { createCharacterCardSessionSeed } from '../src/import/character-card-seed.ts'
import { createPresetSessionSeed } from '../src/import/session-preset.ts'
import { parseSillyTavernChat } from '../src/import/sillytavern-chat.ts'
import { createSillyTavernChatSeed } from '../src/import/sillytavern-chat-seed.ts'
import type { ImportedSillyTavernPreset } from '../src/import/sillytavern-preset.ts'
import { parseWorldInfoJson } from '../src/import/world-info.ts'
import {
  appendWorldInfoLibrarySessionSeed,
  createWorldInfoLibrarySessionSeed,
} from '../src/import/world-info-seed.ts'
import { appendMvuState } from '../src/mvu.ts'
import {
  renderCharacterPrompt,
  renderImportedChatPrompt,
  renderImportedCharacterPrompt,
  roleplayVisibleDialogue,
  roleplayVisibleTranscript,
} from '../src/prompt.ts'
import { assembleSillyTavernPreset } from '../src/preset-prompt.ts'
import { prepareRoleplayTurn } from '../src/roleplay-turn-plan.ts'
import { resolveSessionRoleplayRuntime } from '../src/session-roleplay-runtime.ts'
import {
  appendTavernHelperState,
  applyTavernHelperMutation,
  initializeTavernHelperState,
  tavernInjectedScanText,
} from '../src/tavern-helper.ts'

const deployment = resolveConfig({ characterName: '岚' })

function attachment(id: string, name: string) {
  return {
    kind: 'file' as const,
    attachmentId: AttachmentId(`sha256:${id}`),
    bytes: 100,
    name,
    mediaType: 'application/json',
  }
}

function worldAsset(id: string, name: string, content: string) {
  const source = JSON.stringify({
    name,
    entries: {
      0: {
        uid: 0,
        key: [],
        keysecondary: [],
        content,
        constant: true,
        selective: false,
        order: 1,
        position: 0,
        disable: false,
      },
    },
  })
  return {
    upload: {
      id,
      name,
      entryCount: 1,
      degradations: [],
      defaultForNewSessions: false,
    },
    worldInfo: parseWorldInfoJson(source),
    filename: `${name}.json`,
    data: new TextEncoder().encode(source),
  }
}

function cardFixture() {
  return parseCharacterCardJson(JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '白露',
      description: '钟表匠',
      personality: '沉静',
      scenario: '修理铺打烊前',
      first_mes: '门还没锁。',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: 'fixture',
      character_version: '1',
      extensions: {},
      character_book: {
        name: '海城',
        recursive_scanning: false,
        extensions: {},
        entries: [
          {
            id: 1,
            keys: [],
            secondary_keys: [],
            content: '<%= getchatvar("weather") %>中的钟楼。',
            enabled: true,
            insertion_order: 1,
            constant: true,
            selective: false,
            position: 'before_char',
            name: '钟楼',
            use_regex: false,
            extensions: {},
          },
          {
            id: 2,
            comment: '[initvar]',
            keys: [],
            secondary_keys: [],
            content: '关系:\n  信任: 2',
            enabled: false,
            insertion_order: 2,
            constant: false,
            selective: false,
            position: 'after_char',
            use_regex: false,
            extensions: {},
          },
        ],
      },
    },
  }))
}

function modularPreset(): ImportedSillyTavernPreset {
  const prompts: ImportedSillyTavernPreset['prompts'] = [
    {
      identifier: 'main', name: '主提示', role: 'system',
      content: '主提示：<%= char %>/<%= getchatvar("weather") %>', marker: false,
      systemPrompt: true, forbidOverrides: false,
    },
    {
      identifier: 'worldInfoBefore', name: '世界前', role: 'system', content: '', marker: true,
      systemPrompt: true, forbidOverrides: false,
    },
    {
      identifier: 'in-chat', name: '深度提示', role: 'user', content: '预设深度注入', marker: false,
      systemPrompt: false, forbidOverrides: false, injectionPosition: 1, injectionDepth: 1, injectionOrder: 90,
    },
    {
      identifier: 'chatHistory', name: '历史', role: 'system', content: '', marker: true,
      systemPrompt: true, forbidOverrides: false,
    },
    {
      identifier: 'after', name: '历史后', role: 'assistant', content: '保持节奏', marker: false,
      systemPrompt: false, forbidOverrides: false,
    },
  ]
  return {
    format: 0,
    name: '潮汐预设',
    prompts,
    order: prompts.map(prompt => ({ identifier: prompt.identifier, enabled: true })),
    generation: { temperature: 0.72, maxTokens: 4096, reasoningEffort: 'medium', topP: 0.9 },
    continuation: { prefill: false, postfix: '\n', nudgePrompt: '请从 {{lastChatMessage}} 之后继续' },
    formats: { worldInfo: '<world>{0}</world>', scenario: '{0}', personality: '{0}' },
    regexScripts: [],
    extensionSummary: { regexScriptCount: 0, hasSPreset: false, hasTavernHelper: false },
  }
}

test('plans the minimal deployment character without changing its native prompt', () => {
  const session = Session.create(SessionId('turn-plan-native'))
  const resolved = resolveSessionRoleplayRuntime({
    session,
    deployment,
    memoryWriteAvailable: true,
  })
  const plan = prepareRoleplayTurn({ session, deployment, resolved })

  assert.equal(plan.format, 0)
  assert.deepEqual(plan.input, { sessionId: 'turn-plan-native', sessionSeq: 0, pendingMessageIds: [] })
  assert.equal(plan.prompt.systemPromptText, renderCharacterPrompt(deployment))
  assert.deepEqual(plan.prompt.beforeHistory, [])
  assert.deepEqual(plan.prompt.afterHistory, [])
  assert.deepEqual(plan.prompt.inChat, [])
  assert.equal(plan.prompt.includeHistory, true)
  assert.deepEqual(plan.world.resources, [])
  assert.deepEqual(plan.memory, { read: true, write: true })
})

test('keeps a standalone World Info launch actor-free and explains its activation', () => {
  const seed = createWorldInfoLibrarySessionSeed(worldAsset(
    'world-info-00000000000000000000000000000001',
    '天琴座',
    '星港仍在运转。',
  ))
  const session = Session.create(SessionId('turn-plan-scene'), seed)
  const resolved = resolveSessionRoleplayRuntime({ session, deployment })
  const plan = prepareRoleplayTurn({ session, deployment, resolved })

  assert.equal(plan.runtime.experience.mode, 'scene')
  assert.equal(plan.runtime.actor, undefined)
  assert.deepEqual(plan.world.experienceBeforeActor, ['星港仍在运转。'])
  assert.deepEqual(plan.world.actorBefore, [])
  assert.equal(plan.world.resources[0]?.entries[0]?.entryId, '0')
  assert.equal(plan.world.resources[0]?.entries[0]?.reason, 'active-constant')
  assert.match(plan.prompt.systemPromptText, /本会话由独立世界书启动/u)
  assert.match(plan.prompt.systemPromptText, /星港仍在运转/u)
})

test('continues an imported chat identity without falling back to the deployment actor', () => {
  const chat = parseSillyTavernChat([
    '{"user_name":"宝宝","character_name":"白露","chat_metadata":{}}',
    '{"name":"白露","mes":"门还没锁。","is_user":false,"is_system":false}',
    '{"name":"宝宝","mes":"那我进来啦。","is_user":true,"is_system":false}',
  ].join('\n'))
  const seed = createSillyTavernChatSeed(chat, {
    ...attachment('turn-plan-chat', '白露.jsonl'),
    mediaType: 'application/x-ndjson',
  })
  const session = Session.create(SessionId('turn-plan-chat'), seed)
  const resolved = resolveSessionRoleplayRuntime({ session, deployment })
  const plan = prepareRoleplayTurn({ session, deployment, resolved })

  assert.equal(plan.runtime.actor?.name, '白露')
  assert.equal(plan.runtime.actor?.adapter, 'sillytavern:chat')
  assert.equal(plan.prompt.systemPromptText, renderImportedChatPrompt('白露', '宝宝'))
  assert.doesNotMatch(plan.prompt.systemPromptText, /你是岚/u)
})

test('preserves native card prompt ordering across experience and actor worlds', async () => {
  const card = cardFixture()
  let seed = createCharacterCardSessionSeed(
    card,
    attachment('turn-plan-native-card', '白露.json'),
    0,
    card.firstMessage,
    { transport: 'json' },
    '小满',
    { id: 'persona-00000000-0000-4000-8000-000000000010', name: '小满', description: '刚到海城的旅人。' },
  )
  seed = appendWorldInfoLibrarySessionSeed(seed, worldAsset(
    'world-info-00000000000000000000000000000002',
    '海城天气',
    '海城今晚有雾。',
  ))
  const session = Session.create(SessionId('turn-plan-native-card'), seed)
  const state = applyTavernHelperMutation(initializeTavernHelperState({
    regexScripts: [], tavernHelperScriptNames: [], tavernHelperScripts: [], tavernHelperVariables: {},
  }, 'turn-plan-native-card'), {
    format: 0, scope: 'chat', variables: { weather: '浓雾' },
  })
  appendTavernHelperState(session, state)
  appendMvuState(session, { statData: { 关系: { 信任: 3 } }, updateCount: 1 })
  const engine = await EjsTemplateEngine.create()
  const resolved = resolveSessionRoleplayRuntime({ session, deployment, templateEngineAvailable: true })
  const plan = prepareRoleplayTurn({ session, deployment, resolved, templateEngine: engine })
  const expected = renderImportedCharacterPrompt(
    resolved.card!,
    [...plan.world.experienceBeforeActor, ...plan.world.actorBefore],
    [...plan.world.actorAfter, ...plan.world.experienceAfterActor],
    '小满',
    resolved.mvu?.statData,
    '刚到海城的旅人。',
    {
      regexEngine: engine,
      renderTemplate: engine.createRenderer({
        characterName: '白露', userName: '小满', messages: roleplayVisibleDialogue(session),
        transcript: roleplayVisibleTranscript(session), variableScopes: state.scopes,
        statData: resolved.mvu!.statData,
        worldInfoBooks: createEjsWorldInfoBooks(resolved.lorebooks.map(({ source, configured }) => ({
          id: source.id, name: source.name, lorebook: configured,
        }))),
      }),
    },
  )

  assert.deepEqual(plan.world.experienceBeforeActor, ['海城今晚有雾。'])
  assert.deepEqual(plan.world.actorBefore, ['浓雾中的钟楼。'])
  assert.equal(plan.prompt.systemPromptText, expected)
  assert.match(plan.prompt.systemPromptText, /海城今晚有雾。[\s\S]*浓雾中的钟楼。[\s\S]*角色描述：钟表匠/u)
  assert.deepEqual(plan.stateReads.map(stateRead => [stateRead.id, stateRead.revision]), [
    ['state:mvu', 1], ['state:tavern-helper', state.revision],
  ])
})

test('compiles modular prompts, EJS, MVU, generation, and script injections into one plan', async () => {
  const card = cardFixture()
  const persona = {
    id: 'persona-00000000-0000-4000-8000-000000000020',
    name: '小满',
    description: '刚到海城的旅人。',
  }
  let seed = createCharacterCardSessionSeed(
    card,
    attachment('turn-plan-modular-card', '白露.json'),
    0,
    card.firstMessage,
    { transport: 'json' },
    persona.name,
    persona,
  )
  seed = appendWorldInfoLibrarySessionSeed(seed, worldAsset(
    'world-info-00000000000000000000000000000003',
    '海城天气',
    '海城今晚有雾。',
  ))
  const preset = modularPreset()
  seed = createPresetSessionSeed(seed, preset, attachment('turn-plan-preset', '潮汐预设.json'))
  const session = Session.create(SessionId('turn-plan-modular'), seed)
  const frontend = {
    regexScripts: [],
    tavernHelperScriptNames: ['状态同步'],
    tavernHelperVariables: {},
    tavernHelperScripts: [{
      id: 'state', name: '状态同步', content: '', info: '', enabled: true,
      buttonEnabled: false, buttons: [], data: {},
    }],
  }
  let state = initializeTavernHelperState(frontend, 'turn-plan-modular-card')
  state = applyTavernHelperMutation(state, {
    format: 0, scope: 'chat', variables: { weather: '浓雾' },
  })
  state = applyTavernHelperMutation(state, {
    format: 0,
    operation: 'replace-script-injections',
    scriptScope: 'character',
    scriptId: 'state',
    prompts: [{
      id: 'next-request', position: 'in_chat', depth: 0, role: 'system',
      content: '脚本本轮注入', shouldScan: true, once: false,
    }],
  })
  appendTavernHelperState(session, state)
  appendMvuState(session, { statData: { 关系: { 信任: 4 } }, updateCount: 2 })
  const pending = createUserMessage({
    source: { kind: 'user' },
    content: [{ type: 'text', text: '钟楼怎么了？' }],
  })
  const engine = await EjsTemplateEngine.create()
  const resolved = resolveSessionRoleplayRuntime({
    session,
    deployment,
    memoryWriteAvailable: true,
    templateEngineAvailable: true,
  })
  const plan = prepareRoleplayTurn({
    session,
    pendingMessages: [pending],
    deployment,
    resolved,
    templateEngine: engine,
  })
  const books = resolved.lorebooks.map(({ source, configured }) => ({
    id: source.id, name: source.name, lorebook: configured,
  }))
  const direct = assembleSillyTavernPreset(preset, {
    card: resolved.card!,
    userName: persona.name,
    userPersona: persona.description,
    worldInfoBefore: [...plan.world.experienceBeforeActor, ...plan.world.actorBefore],
    worldInfoAfter: [...plan.world.actorAfter, ...plan.world.experienceAfterActor],
    session,
    pendingMessages: [pending],
    mvuEnabled: true,
    renderTemplate: engine.createRenderer({
      characterName: '白露',
      userName: persona.name,
      messages: [...roleplayVisibleDialogue(session, [pending]), ...tavernInjectedScanText(state)],
      transcript: roleplayVisibleTranscript(session, [pending]),
      variableScopes: state.scopes,
      statData: resolved.mvu!.statData,
      worldInfoBooks: createEjsWorldInfoBooks(books),
    }),
  })

  assert.equal(plan.prompt.systemPromptText, '')
  assert.deepEqual(plan.prompt.beforeHistory, direct.beforeHistory)
  assert.deepEqual(plan.prompt.afterHistory, direct.afterHistory)
  assert.deepEqual(plan.prompt.continuation, direct.continuation)
  assert.deepEqual(plan.prompt.inChat.slice(0, direct.inChat.length), direct.inChat)
  assert.deepEqual(plan.prompt.inChat.at(-1), {
    role: 'system', content: '脚本本轮注入', depth: 0, order: 100,
  })
  assert.match(plan.prompt.beforeHistory.map(item => item.content).join('\n'), /主提示：白露\/浓雾/u)
  assert.match(plan.prompt.beforeHistory.map(item => item.content).join('\n'), /海城今晚有雾。[\s\S]*浓雾中的钟楼/u)
  assert.match(plan.prompt.afterHistory.map(item => item.content).join('\n'), /UpdateVariable/u)
  assert.deepEqual(plan.generation, preset.generation)
  assert.deepEqual(plan.input.pendingMessageIds, [String(pending.id)])
  assert.equal(plan.runtime.participant?.id, persona.id)
  assert.equal(plan.runtime.memory.write, true)
  assert.ok(plan.prepare.modules.some(module => module.moduleId === 'adapter:prompt-modules'
    && module.outcome === 'applied'))
})
