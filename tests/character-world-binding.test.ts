import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { CharacterLibrary } from '../src/character-library.ts'
import { CharacterWorldBindingStore } from '../src/character-world-binding-store.ts'
import { resolveConfig } from '../src/config.ts'
import { parseCharacterCardJsonBytes } from '../src/import/character-card.ts'
import { prepareAgentRpSession } from '../src/session-launch.ts'
import { PresetLibrary } from '../src/preset-library.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'
import { resolveSessionRoleplayRuntime } from '../src/session-roleplay-runtime.ts'
import { SillyTavernChatLibrary } from '../src/sillytavern-chat-library.ts'
import { readSessionLorebookSourcesFromEvents } from '../src/world-info-configuration.ts'
import { WorldInfoLibrary } from '../src/world-info-library.ts'

function integratedLibraries(context: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-world-binding-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const bindings = new CharacterWorldBindingStore({ root: join(root, 'bindings') })
  const worlds = new WorldInfoLibrary({ root: join(root, 'worlds'), bindings })
  const characters = new CharacterLibrary({
    root: join(root, 'characters'),
    worldInfoLibrary: worlds,
    worldBindings: bindings,
  })
  return { root, bindings, worlds, characters }
}

function characterBytes(name = '白露', withBook = true): Uint8Array {
  const raw = JSON.parse(readFileSync('tests/fixtures/manual-character-card.json', 'utf8')) as Record<string, unknown>
  const data = raw.data as Record<string, unknown>
  data.name = name
  if (withBook) {
    data.character_book = {
      name: '海城', scan_depth: 6, token_budget: 2048, recursive_scanning: true, extensions: {}, entries: [{
        id: 7,
        name: '钟楼',
        comment: '钟楼设定',
        keys: ['午夜'],
        secondary_keys: [],
        content: '钟楼每天午夜停摆。',
        enabled: true,
        insertion_order: 10,
        selective: false,
        constant: false,
        case_sensitive: false,
        match_whole_words: false,
        position: 'after_char',
        extensions: {},
      }],
    }
  } else delete data.character_book
  return new TextEncoder().encode(JSON.stringify(raw))
}

function characterBytesWithMvu(): Uint8Array {
  const raw = JSON.parse(new TextDecoder().decode(characterBytes())) as Record<string, unknown>
  const data = raw.data as Record<string, unknown>
  const book = data.character_book as { entries: object[] }
  book.entries.push({
    id: 8,
    comment: '[initvar] 初始变量',
    keys: [],
    secondary_keys: [],
    content: '角色:\n  等级: 1',
    enabled: false,
    insertion_order: 20,
    selective: false,
    constant: false,
    case_sensitive: false,
    match_whole_words: false,
    position: 'after_char',
    extensions: {},
  })
  return new TextEncoder().encode(JSON.stringify(raw))
}

test('splits an embedded book into a reusable world and persists its relationship', context => {
  const { bindings, worlds, characters } = integratedLibraries(context)
  const bytes = characterBytes()
  const sourceCard = parseCharacterCardJsonBytes(bytes)
  const character = characters.importFile({ data: bytes, filename: '白露.json', mediaType: 'application/json' })
  const binding = bindings.get(character.id)
  const primary = binding?.primary
  assert.equal(primary?.provenance, 'embedded-import')
  assert.equal(worlds.list().length, 1)
  assert.equal(worlds.list()[0]?.id, primary?.worldInfoId)
  const splitWorld = worlds.resolve(primary!.worldInfoId).worldInfo
  assert.equal(splitWorld.name, sourceCard.lorebook?.name)
  const { name: _name, ...expectedLorebook } = sourceCard.lorebook!
  assert.deepEqual(splitWorld.lorebook, expectedLorebook)
  assert.deepEqual(characters.asset(character.id).data, bytes)
  assert.deepEqual(parseCharacterCardJsonBytes(characters.exportModified(character.id).data).lorebook, sourceCard.lorebook)
  assert.throws(() => worlds.remove(primary!.worldInfoId), /角色绑定/u)

  characters.archive(character.id)
  characters.deleteArchived(character.id)
  assert.equal(bindings.get(character.id), undefined)
  assert.equal(worlds.remove(primary!.worldInfoId).id, primary!.worldInfoId)
})

test('reuses equal embedded books while keeping one relationship per character', context => {
  const { bindings, worlds, characters } = integratedLibraries(context)
  const firstRaw = JSON.parse(new TextDecoder().decode(characterBytes())) as Record<string, unknown>
  const secondRaw = structuredClone(firstRaw)
  const secondData = secondRaw.data as Record<string, unknown>
  secondData.name = '白露的镜像角色'
  const first = characters.importFile({
    data: new TextEncoder().encode(JSON.stringify(firstRaw)), filename: 'first.json', mediaType: 'application/json',
  })
  const second = characters.importFile({
    data: new TextEncoder().encode(JSON.stringify(secondRaw)), filename: 'second.json', mediaType: 'application/json',
  })
  assert.notEqual(first.id, second.id)
  assert.equal(bindings.get(first.id)?.primary?.worldInfoId, bindings.get(second.id)?.primary?.worldInfoId)
  assert.equal(worlds.list().length, 1)
  assert.deepEqual(bindings.referencingCharacters(bindings.get(first.id)!.primary!.worldInfoId), [first.id, second.id].sort())
})

test('migrates old cards once and records cards without embedded books', context => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-world-migration-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const characterRoot = join(root, 'characters')
  const legacy = new CharacterLibrary({ root: characterRoot })
  const withBook = legacy.importFile({
    data: characterBytes(),
    filename: 'legacy.json', mediaType: 'application/json',
  })
  const withoutBook = legacy.importFile({
    data: characterBytes('没有世界书的白露', false),
    filename: 'plain.json', mediaType: 'application/json',
  })

  const bindings = new CharacterWorldBindingStore({ root: join(root, 'bindings') })
  const worlds = new WorldInfoLibrary({ root: join(root, 'worlds'), bindings })
  const migrated = new CharacterLibrary({ root: characterRoot, worldInfoLibrary: worlds, worldBindings: bindings })
  assert.equal(migrated.migrateEmbeddedWorldInfos(), 2)
  assert.equal(migrated.migrateEmbeddedWorldInfos(), 0)
  assert.notEqual(bindings.get(withBook.id)?.primary, null)
  assert.equal(bindings.get(withoutBook.id)?.primary, null)
})

test('materializes one actor world through launch, runtime, projection, and current export', context => {
  const { root, worlds, characters } = integratedLibraries(context)
  const bytes = characterBytesWithMvu()
  const character = characters.importFile({
    data: bytes,
    filename: 'character.json', mediaType: 'application/json',
  })
  const primary = characters.worldBinding(character.id)?.primary?.worldInfoId
  assert.ok(primary)
  const prepared = prepareAgentRpSession(
    characters,
    new SillyTavernChatLibrary({ root: join(root, 'chats') }),
    new PresetLibrary({ root: join(root, 'presets') }),
    worlds,
    {
      format: 0,
      sourceSessionId: 'source',
      kind: 'character',
      characterId: character.id,
      greetingIndex: 0,
      worldInfoIds: [primary],
    },
  )
  const worldSeeds = prepared.seed.filter(event => event.type === 'agent-rp/world-info-library-seed')
  assert.equal(worldSeeds.length, 1)
  assert.equal(worldSeeds[0]?.data.worldInfoLibraryId, primary)
  assert.equal(worldSeeds[0]?.data.placement, 'actor')
  assert.equal(worldSeeds[0]?.data.purpose, 'character-binding')

  const session = Session.create(SessionId('character-world-binding-runtime'), prepared.seed)
  const sources = readSessionLorebookSourcesFromEvents(session.events)
  assert.equal(sources.length, 1)
  assert.equal(sources[0]?.source, 'character')
  assert.equal(sources[0]?.id, `character:library:${primary}`)

  const runtime = resolveSessionRoleplayRuntime({
    session,
    deployment: resolveConfig({ characterName: 'fallback' }),
  })
  assert.equal(runtime.card?.lorebook, undefined)
  assert.equal(runtime.lorebooks.length, 1)
  assert.equal(runtime.lorebooks[0]?.source.source, 'character')
  assert.deepEqual(runtime.mvu?.statData, { 角色: { 等级: 1 } })

  let projectionState = agentRpProjectionDefinition.init()
  for (const event of session.events) projectionState = agentRpProjectionDefinition.apply(projectionState, event)
  const projection = agentRpProjectionDefinition.wire.view(projectionState)
  assert.equal(projection.worldInfo.books.length, 1)
  assert.equal(projection.worldInfo.books[0]?.source, 'character')
  assert.deepEqual(projection.mvu?.statData, { 角色: { 等级: 1 } })

  assert.deepEqual(characters.asset(character.id).data, bytes)
  const exported = JSON.parse(new TextDecoder().decode(characters.exportModified(character.id).data)) as {
    data: { character_book: { entries: readonly Record<string, unknown>[] } }
  }
  assert.equal(typeof exported.data.character_book.entries[0]?.insertion_order, 'number')
  assert.deepEqual(
    parseCharacterCardJsonBytes(characters.exportModified(character.id).data).lorebook,
    parseCharacterCardJsonBytes(bytes).lorebook,
  )
})
