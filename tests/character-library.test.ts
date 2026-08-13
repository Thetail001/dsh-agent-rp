import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { strToU8, zipSync } from 'fflate'
import { CharacterLibrary } from '../src/character-library.ts'
import { parseCharacterCardJsonBytes } from '../src/import/character-card.ts'
import { parseCharx } from '../src/import/charx.ts'

test('keeps one exact reusable Character Card asset with selectable greetings', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-library-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const data = new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json'))
  const card = parseCharacterCardJsonBytes(data)
  const library = new CharacterLibrary({ root })

  const first = library.import({
    data,
    filename: '白露.json',
    mediaType: 'application/json',
    card,
    transport: { transport: 'json' },
  })
  const duplicate = library.import({
    data,
    filename: 'renamed.json',
    mediaType: 'application/json',
    card,
    transport: { transport: 'json' },
  })

  assert.equal(duplicate.id, first.id)
  assert.deepEqual(library.list(), [{
    id: first.id,
    name: '白露',
    displayName: '白露',
    originalFilename: '白露.json',
    cardVersion: 2,
    greetingCount: 2,
    worldInfoCount: 0,
    avatarAvailable: false,
    imageAssetCount: 0,
    archived: false,
    transport: 'json',
    importedAt: first.importedAt,
    updatedAt: first.updatedAt,
  }])
  assert.deepEqual(library.get(first.id).greetings, [
    '门还没锁，你进来吧。',
    '今天来得很早。',
  ])
  assert.deepEqual(library.asset(first.id).data, data)

  assert.equal(library.archive(first.id).archived, true)
  assert.deepEqual(library.list(), [])
  assert.deepEqual(library.list('archived').map(entry => entry.id), [first.id])
  assert.deepEqual(library.asset(first.id).data, data)

  assert.equal(library.restore(first.id).archived, false)
  assert.deepEqual(library.list().map(entry => entry.id), [first.id])
  assert.deepEqual(library.list('archived'), [])
  assert.deepEqual(library.asset(first.id).data, data)

  assert.equal(library.archive(first.id).archived, true)
  const browserImport = library.importFile({ data, filename: '白露.json', mediaType: 'application/json' })
  assert.equal(browserImport.id, first.id)
  assert.equal(browserImport.archived, false)

  const png = new Uint8Array(readFileSync('tests/fixtures/manual-character-card.png'))
  const pngImport = library.importFile({ data: png, filename: '白露.png', mediaType: 'image/png' })
  assert.equal(pngImport.transport, 'png')
  assert.deepEqual(library.asset(pngImport.id).data, png)
})

test('keeps the original CHARX archive reusable', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-library-charx-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const raw = JSON.parse(readFileSync('tests/fixtures/manual-character-card.json', 'utf8')) as Record<string, unknown>
  const data = raw.data as Record<string, unknown>
  raw.spec = 'chara_card_v3'
  raw.spec_version = '3.0'
  data.group_only_greetings = []
  data.assets = [
    { type: 'icon', uri: 'embeded://assets/icon/images/main.png', name: 'main', ext: 'png' },
    { type: 'background', uri: 'embeded://assets/background/images/rain.webp', name: 'rain', ext: 'webp' },
    { type: 'emotion', uri: 'embeded://assets/emotion/images/smile.png', name: 'smile', ext: 'png' },
  ]
  const avatar = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])
  const background = Uint8Array.from([0x52, 0x49, 0x46, 0x46])
  const emotion = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x01])
  const archive = zipSync({
    'card.json': strToU8(JSON.stringify(raw)),
    'assets/icon/images/main.png': avatar,
    'assets/background/images/rain.webp': background,
    'assets/emotion/images/smile.png': emotion,
  })
  const library = new CharacterLibrary({ root })
  const imported = library.import({
    data: archive,
    filename: '白露.charx',
    mediaType: 'application/zip',
    card: parseCharx(archive).card,
    transport: { transport: 'charx' },
  })

  assert.equal(library.importFile({ data: archive, filename: '白露.charx' }).id, imported.id)

  assert.equal(imported.transport, 'charx')
  assert.equal(imported.avatarAvailable, true)
  assert.deepEqual(library.avatar(imported.id), { mediaType: 'image/png', data: avatar })
  assert.equal(imported.imageAssetCount, 3)
  assert.deepEqual(imported.imageAssets, [
    { index: 0, type: 'icon', name: 'main', mediaType: 'image/png', sourceUri: 'embeded://assets/icon/images/main.png' },
    { index: 1, type: 'background', name: 'rain', mediaType: 'image/webp', sourceUri: 'embeded://assets/background/images/rain.webp' },
    { index: 2, type: 'emotion', name: 'smile', mediaType: 'image/png', sourceUri: 'embeded://assets/emotion/images/smile.png' },
  ])
  assert.deepEqual(library.image(imported.id, 0), {
    index: 0, type: 'icon', name: 'main', mediaType: 'image/png',
    sourceUri: 'embeded://assets/icon/images/main.png', data: avatar,
  })
  assert.deepEqual(library.image(imported.id, 1)?.data, background)
  assert.deepEqual(library.image(imported.id, 2)?.data, emotion)
  assert.equal(library.image(imported.id, 3), undefined)
  assert.deepEqual(library.asset(imported.id).data, archive)
})
