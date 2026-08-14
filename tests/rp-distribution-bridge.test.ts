import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CharacterLibrary } from '../src/character-library.ts'
import { PersonaLibrary } from '../src/persona-library.ts'
import { PresetLibrary } from '../src/preset-library.ts'
import { receiveRpDistributionAsset } from '../src/rp-distribution-bridge-http.ts'
import {
  exportRpDistributionChat,
  normalizeRpDistributionTarget,
  probeRpDistribution,
  readRpDistributionSource,
  transferToRpDistribution,
  type RpDistributionFetch,
} from '../src/rp-distribution-bridge.ts'
import { parseSillyTavernChat } from '../src/import/sillytavern-chat.ts'
import { WorldInfoLibrary } from '../src/world-info-library.ts'

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('limits RP distribution transfers to normalized loopback targets', () => {
  assert.equal(normalizeRpDistributionTarget('http://127.0.0.1:3092/'), 'http://127.0.0.1:3092')
  assert.equal(normalizeRpDistributionTarget('http://[::1]:3092'), 'http://[::1]:3092')
  assert.throws(() => normalizeRpDistributionTarget('https://example.com'), /这台电脑/u)
  assert.throws(() => normalizeRpDistributionTarget('http://user:secret@localhost:3092'), /这台电脑/u)
})

test('probes the real modular RP catalog response fields', async () => {
  const requested: string[] = []
  const fetcher: RpDistributionFetch = async (input) => {
    requested.push(input)
    if (input.endsWith('/catalog')) return json({
      schemaVersion: 1,
      generatedAt: 123,
      experiences: [{ id: 'rp-adaptive' }],
      components: [{ id: 'rp.character' }, { id: 'rp.prompt' }],
      capabilities: [{ id: 'rp.import.character' }],
    })
    if (input.endsWith('/library')) return json({
      schemaVersion: 1,
      characters: [{ id: 'character-1', name: '白露', savedAt: 1 }],
      personas: [{ id: 'persona-1', name: '宝宝', description: '', savedAt: 1 }],
      lorebooks: [{ id: 'lore-1', name: '海城', entryCount: 2, savedAt: 1 }],
    })
    return json({
      schemaVersion: 1,
      presets: [{ id: 'preset-1', name: 'V18', savedAt: 1 }],
    })
  }
  assert.deepEqual(await probeRpDistribution('http://localhost:3092/', fetcher), {
    target: 'http://localhost:3092',
    generatedAt: 123,
    experienceCount: 1,
    componentCount: 2,
    capabilityCount: 1,
    remoteAssets: {
      characters: [{ id: 'character-1', name: '白露' }],
      presets: [{ id: 'preset-1', name: 'V18' }],
      personas: [{ id: 'persona-1', name: '宝宝' }],
      worldInfos: [{ id: 'lore-1', name: '海城' }],
    },
  })
  assert.deepEqual(requested, [
    'http://localhost:3092/api/rp/v1/catalog',
    'http://localhost:3092/api/rp/v1/library',
    'http://localhost:3092/api/rp/v1/presets',
  ])
})

test('reads one retained modular RP source for the matching Agent RP library', async () => {
  const source = await readRpDistributionSource(
    'http://127.0.0.1:3092',
    'world-info',
    'lore/海城',
    async input => {
      assert.equal(input, 'http://127.0.0.1:3092/api/rp/v1/source?kind=lore&id=lore%2F%E6%B5%B7%E5%9F%8E')
      return json({
        schemaVersion: 1,
        kind: 'world-info',
        id: 'lore/海城',
        sourceId: '海城.json',
        source: '{"entries":{}}',
      })
    },
  )
  assert.deepEqual(source, {
    target: 'http://127.0.0.1:3092',
    kind: 'world-info',
    id: 'lore/海城',
    sourceId: '海城.json',
    source: '{"entries":{}}',
  })
})

test('explains when the modular RP runtime cannot export retained sources', async () => {
  await assert.rejects(
    readRpDistributionSource('http://localhost:3092', 'character', 'character-1', async () => json({}, 404)),
    /更新 dsh-rp-distribution/u,
  )
})

test('copies all four retained source kinds through the native Agent RP libraries', async () => {
  const root = mkdtempSync(join(tmpdir(), 'agent-rp-distribution-receive-'))
  try {
    const characters = new CharacterLibrary({ root: join(root, 'characters') })
    const presets = new PresetLibrary({ root: join(root, 'presets') })
    const personas = new PersonaLibrary({ root: join(root, 'personas') })
    const worldInfos = new WorldInfoLibrary({ root: join(root, 'world-info') })
    const sources = new Map<string, { readonly kind: string; readonly sourceId: string; readonly source: string }>([
      ['character-1', {
        kind: 'character-card-json', sourceId: '白露.json',
        source: readFileSync('tests/fixtures/manual-character-card.json', 'utf8'),
      }],
      ['preset-1', {
        kind: 'preset', sourceId: 'V18.json', source: JSON.stringify({
          prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: '留在角色中。' }],
          prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
        }),
      }],
      ['persona-1', {
        kind: 'persona', sourceId: '宝宝.json',
        source: JSON.stringify({ name: '宝宝', description: '来修钟的访客。' }),
      }],
      ['lore-1', {
        kind: 'world-info', sourceId: '海城.json',
        source: readFileSync('tests/fixtures/manual-world-info.json', 'utf8'),
      }],
    ])
    const fetcher: RpDistributionFetch = async (input) => {
      const url = new URL(input)
      const id = url.searchParams.get('id') ?? ''
      const source = sources.get(id)
      assert.ok(source)
      return json({ schemaVersion: 1, id, ...source })
    }
    const receive = (kind: 'character' | 'preset' | 'persona' | 'world-info', id: string) =>
      receiveRpDistributionAsset(
        { format: 0, operation: 'import-asset', target: 'http://127.0.0.1:3092', kind, id },
        characters,
        presets,
        personas,
        worldInfos,
        fetcher,
      )

    await assert.doesNotReject(receive('character', 'character-1'))
    await assert.doesNotReject(receive('preset', 'preset-1'))
    await assert.doesNotReject(receive('persona', 'persona-1'))
    await assert.doesNotReject(receive('world-info', 'lore-1'))
    assert.deepEqual(characters.list().map(entry => entry.displayName), ['白露'])
    assert.deepEqual(presets.list().map(entry => entry.name), ['V18'])
    assert.deepEqual(personas.list().map(entry => entry.name), ['宝宝'])
    assert.deepEqual(worldInfos.list().map(entry => entry.name), ['海城'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('preflights and saves one original character source through the published RP API', async () => {
  const calls: { readonly url: string; readonly body: unknown }[] = []
  const fetcher: RpDistributionFetch = async (input, init) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown
    calls.push({ url: input, body })
    if (input.endsWith('/import')) {
      return json({
        kind: 'character-card-json',
        result: {},
        lossReports: [{ path: '$', report: { items: [{ feature: 'tavern-helper' }, { feature: 'regex' }] } }],
      })
    }
    return json({ schemaVersion: 1, characters: [], personas: [], lorebooks: [], action: 'save', assetIds: ['character-1'] })
  }
  const result = await transferToRpDistribution('http://127.0.0.1:3092', {
    kind: 'character-card-json',
    source: '{"name":"白露"}',
    sourceId: '白露.json',
  }, fetcher)

  assert.deepEqual(result, {
    target: 'http://127.0.0.1:3092',
    savedIds: ['character-1'],
    compatibilityDifferenceCount: 2,
  })
  assert.deepEqual(calls, [{
    url: 'http://127.0.0.1:3092/api/rp/v1/import',
    body: { kind: 'character-card-json', source: '{"name":"白露"}', sourceId: '白露.json' },
  }, {
    url: 'http://127.0.0.1:3092/api/rp/v1/library',
    body: { action: 'save', kind: 'character-card-json', source: '{"name":"白露"}', sourceId: '白露.json' },
  }])
})

test('uses the dedicated preset library mutation after compatibility inspection', async () => {
  const bodies: unknown[] = []
  const fetcher: RpDistributionFetch = async (input, init) => {
    bodies.push(init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown)
    return input.endsWith('/import')
      ? json({ kind: 'preset', result: {}, lossReports: [] })
      : json({ schemaVersion: 1, presets: [], action: 'save', presetId: 'preset-1' })
  }
  const result = await transferToRpDistribution('http://localhost:3092', {
    kind: 'preset', source: '{"prompts":[],"prompt_order":[]}', sourceId: 'V18.json',
  }, fetcher)

  assert.deepEqual(result.savedIds, ['preset-1'])
  assert.deepEqual(bodies[1], {
    action: 'save', source: '{"prompts":[],"prompt_order":[]}', sourceId: 'V18.json',
  })
})

test('exports one live modular RP timeline as a directly reusable chat', async () => {
  const fetcher: RpDistributionFetch = async (input, init) => {
    if (input.endsWith('/timeline')) {
      assert.deepEqual(JSON.parse(String(init?.body)), { sessionId: 'session-rp-1' })
      return json({
        sessionId: 'session-rp-1',
        events: [],
        projection: {
          history: [{
            turnId: 'turn-1',
            input: { text: '门外是谁？' },
            assistantMessage: '是我。',
            committedAt: Date.UTC(2026, 7, 14, 12),
          }],
        },
      })
    }
    assert.equal(input, 'http://127.0.0.1:3092/api/rp/v1/library?sessionId=session-rp-1')
    return json({
      schemaVersion: 1,
      sessionId: 'session-rp-1',
      characters: [{ id: 'character-1', name: '白露', savedAt: 1 }],
      personas: [{ id: 'persona-1', name: '宝宝', description: '', savedAt: 1 }],
      lorebooks: [],
      active: {
        snapshotHash: 'a'.repeat(64),
        characterIds: ['character-1'],
        personaIds: ['persona-1'],
        lorebookIds: [],
      },
    })
  }
  const exported = await exportRpDistributionChat('http://127.0.0.1:3092', 'session-rp-1', fetcher)
  const chat = parseSillyTavernChat(exported.source)

  assert.equal(exported.filename, '白露-session-rp-1.jsonl')
  assert.equal(exported.messageCount, 2)
  assert.equal(chat.header.characterName, '白露')
  assert.equal(chat.header.userName, '宝宝')
  assert.deepEqual(chat.messages.map(message => [message.kind, message.name, message.text]), [
    ['user', '宝宝', '门外是谁？'],
    ['assistant', '白露', '是我。'],
  ])
  assert.deepEqual(chat.header.chatMetadata, {
    imported_from: 'dsh-rp-distribution',
    source_session_id: 'session-rp-1',
  })
})
