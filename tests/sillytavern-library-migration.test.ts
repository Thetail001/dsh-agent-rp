import assert from 'node:assert/strict'
import { test } from 'node:test'
import { zipSync } from 'fflate'
import {
  collectSillyTavernMigrationSources,
  prepareSillyTavernMigration,
  scanSillyTavernMigration,
  type SillyTavernMigrationExistingResources,
  type SillyTavernMigrationSource,
} from '../src/client/sillytavern-library-migration.ts'

const emptyLibrary: SillyTavernMigrationExistingResources = { characters: [], worldInfoIds: [] }

function browserFile(name: string, source: string | Uint8Array, path?: string): File {
  const file = new File([typeof source === 'string' ? source : Uint8Array.from(source).buffer], name)
  if (path !== undefined) Object.defineProperty(file, 'webkitRelativePath', { value: path })
  return file
}

async function digest(source: string): Promise<string> {
  const value = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

test('discovers official SillyTavern user directories without reading unrelated settings', async () => {
  const files = [
    browserFile('Alice.png', 'card', 'default-user/characters/Alice.png'),
    browserFile('city.json', JSON.stringify({ entries: [] }), 'default-user/worlds/city.json'),
    browserFile('balanced.json', JSON.stringify({ prompts: [], prompt_order: [] }), 'default-user/OpenAI Settings/balanced.json'),
    browserFile('first.jsonl', '{"mes":"hello"}\n', 'default-user/chats/Alice/first.jsonl'),
    browserFile('me.png', 'avatar', 'default-user/User Avatars/me.png'),
    browserFile('settings.json', '{"api_key":"must-not-be-read"}', 'default-user/settings.json'),
  ]

  const scan = await prepareSillyTavernMigration(files, emptyLibrary)
  assert.deepEqual(scan.assets.map(asset => [asset.kind, asset.name]), [
    ['character', 'Alice.png'],
    ['world-info', 'city.json'],
    ['preset', 'balanced.json'],
  ])
  assert.deepEqual(scan.deferred.map(entry => [entry.kind, entry.characterName]), [
    ['chat', 'Alice'],
    ['persona', undefined],
  ])
  assert.equal(scan.ignoredCount, 1)
  assert.equal(scan.issues.length, 0)
})

test('previews a zipped SillyTavern library while leaving chats compressed', async () => {
  const archive = browserFile('default-user.zip', zipSync({
    'default-user/characters/Alice.png': new TextEncoder().encode('card'),
    'default-user/worlds/city.json': new TextEncoder().encode(JSON.stringify({ entries: {} })),
    'default-user/chats/Alice/one.jsonl': new TextEncoder().encode('{"mes":"hello"}\n'),
    'default-user/group chats/team.jsonl': new TextEncoder().encode('{"mes":"hello"}\n'),
    'default-user/extensions/plugin/cache.json': new TextEncoder().encode('{"ignored":true}'),
  }))

  const sources = await collectSillyTavernMigrationSources([archive])
  const chatSource = sources.find(source => source.path.endsWith('one.jsonl'))
  assert.equal(chatSource?.file, undefined)
  const scan = await scanSillyTavernMigration(sources, emptyLibrary)
  assert.equal(scan.assets.length, 2)
  assert.deepEqual(scan.deferred.map(entry => entry.kind), ['chat', 'group-chat'])
  assert.equal(scan.ignoredCount, 1)
})

test('marks exact Host and same-batch duplicates before import', async () => {
  const content = 'same-card-bytes'
  const hash = await digest(content)
  const sources: SillyTavernMigrationSource[] = [
    { path: 'characters/A.png', bytes: content.length, file: browserFile('A.png', content) },
    { path: 'characters/B.png', bytes: content.length, file: browserFile('B.png', content) },
  ]
  const scan = await scanSillyTavernMigration(sources, {
    characters: [{ id: `card-${hash.slice(0, 32)}`, archived: false }],
    worldInfoIds: [],
  })

  assert.equal(scan.assets[0]?.state, 'already-imported')
  assert.equal(scan.assets[0]?.selectedByDefault, false)
  assert.equal(scan.assets[1]?.state, 'duplicate')
  assert.equal(scan.assets[1]?.selectedByDefault, false)
})

test('keeps an archived exact character selected so import can restore it', async () => {
  const content = 'archived-card-bytes'
  const hash = await digest(content)
  const scan = await scanSillyTavernMigration([
    { path: 'characters/A.png', bytes: content.length, file: browserFile('A.png', content) },
  ], {
    characters: [{ id: `card-${hash.slice(0, 32)}`, archived: true }],
    worldInfoIds: [],
  })

  assert.equal(scan.assets[0]?.state, 'ready')
  assert.equal(scan.assets[0]?.selectedByDefault, true)
  assert.match(scan.assets[0]?.note ?? '', /恢复/u)
})

test('classifies standalone JSON exports by inert stable fields', async () => {
  const character = JSON.stringify({
    name: 'Alice', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
  })
  const scan = await prepareSillyTavernMigration([
    browserFile('character.json', character),
    browserFile('world.json', JSON.stringify({ entries: [] })),
    browserFile('preset.json', JSON.stringify({ prompts: [], prompt_order: [] })),
    browserFile('unknown.json', JSON.stringify({ options: [] })),
  ], emptyLibrary)

  assert.deepEqual(scan.assets.map(asset => asset.kind), ['character', 'world-info', 'preset'])
  assert.equal(scan.issues.length, 1)
  assert.equal(scan.issues[0]?.path, 'unknown.json')
})

test('never reads ignored settings or oversized candidates', async () => {
  const unreadable = {
    name: 'unreadable', size: 1,
    arrayBuffer: async () => { throw new Error('must not read bytes') },
    text: async () => { throw new Error('must not read text') },
  } as unknown as File
  const scan = await scanSillyTavernMigration([
    { path: 'default-user/settings.json', bytes: 1, file: unreadable },
    { path: 'default-user/worlds/oversized.json', bytes: 2 * 1024 * 1024 + 1, file: unreadable },
  ], emptyLibrary)

  assert.equal(scan.ignoredCount, 1)
  assert.equal(scan.assets[0]?.state, 'too-large')
  assert.equal(scan.assets[0]?.selectedByDefault, false)
})
