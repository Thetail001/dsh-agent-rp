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

  assert.equal(library.importWithOutcome({
    data,
    filename: 'another-name.json',
    mediaType: 'application/json',
    card,
    transport: { transport: 'json' },
  }).outcome, 'existing')

  assert.equal(duplicate.id, first.id)
  assert.equal(JSON.parse(readFileSync(join(root, `${first.id}.meta.json`), 'utf8')).index.format, 0)
  assert.deepEqual(library.list(), [{
    id: first.id,
    name: '白露',
    displayName: '白露',
    originalFilename: '白露.json',
    cardVersion: 2,
    greetingCount: 2,
    worldInfoCount: 0,
    regexScriptCount: 0,
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
  const browserImport = library.importFileWithOutcome({ data, filename: '白露.json', mediaType: 'application/json' })
  assert.equal(browserImport.entry.id, first.id)
  assert.equal(browserImport.entry.archived, false)
  assert.equal(browserImport.outcome, 'restored')

  const png = new Uint8Array(readFileSync('tests/fixtures/manual-character-card.png'))
  const pngImport = library.importFile({ data: png, filename: '白露.png', mediaType: 'image/png' })
  assert.equal(pngImport.transport, 'png')
  assert.deepEqual(library.asset(pngImport.id).data, png)
})

test('returns safe Tavern Helper and degradation diagnostics with library entries', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-library-diagnostics-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const raw = JSON.parse(readFileSync('tests/fixtures/manual-character-card.json', 'utf8')) as Record<string, unknown>
  const cardData = raw.data as Record<string, unknown>
  cardData.group_only_greetings = ['群聊开场不会执行']
  cardData.first_mes = '<标题>开场</标题>'
  cardData.character_book = {
    name: '海城',
    entries: [{
      id: 7, name: '钟楼', keys: ['午夜'], secondary_keys: [], content: '钟楼每天午夜停摆。',
      enabled: true, insertion_order: 10, selective: false, constant: false,
      case_sensitive: false, match_whole_words: false, position: 'after_char', extensions: {},
    }],
  }
  const extensions = cardData.extensions as Record<string, unknown>
  extensions.regex_scripts = [{
    scriptName: '开场界面', findRegex: '/^<标题>(.*?)<\\/标题>$/su', replaceString: '```html\n<h1>$1</h1>\n```',
    trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false,
    runOnEdit: false, substituteRegex: 0, minDepth: null, maxDepth: null,
  }]
  extensions.tavern_helper = [
    ['scripts', [{ id: 'status', name: '状态', content: 'secret script', enabled: true },
      { id: 'off', name: '关闭', content: 'secret script', enabled: false }]],
    ['variables', { privateValue: 'not exposed' }],
    ['legacy_ui', { hidden: true }],
  ]
  const data = new TextEncoder().encode(JSON.stringify(raw))
  const library = new CharacterLibrary({ root })
  const imported = library.importFileWithOutcome({ data, filename: 'diagnostics.json', mediaType: 'application/json' })

  assert.deepEqual(imported.entry.tavernHelper, {
    format: 'entries', scriptCount: 2, enabledScriptCount: 1, variableCount: 1, ignoredFieldCount: 1,
  })
  assert.deepEqual(imported.entry.degradations, ['group-greetings'])
  assert.deepEqual(imported.entry.regexScripts, [{
    index: 0,
    scriptName: '开场界面',
    enabled: true,
    state: 'active',
    placement: [2],
    unsupportedPlacement: [],
    display: true,
    prompt: false,
    runOnEdit: false,
    minDepth: null,
    maxDepth: null,
  }])
  assert.equal(imported.entry.greetings[0], '<标题>开场</标题>')
  assert.equal(imported.entry.renderedGreetings[0], '```html\n<h1>开场</h1>\n```')
  assert.deepEqual(imported.entry.worldInfo, {
    name: '海城',
    entries: [{
      sourceId: '7', name: '钟楼', keys: ['午夜'], secondaryKeys: [], content: '钟楼每天午夜停摆。',
      enabled: true, constant: false, selective: false, useRegex: false,
    }],
  })
  assert.deepEqual(library.worldInfoPage(imported.entry.id, 0, 1), {
    name: '海城',
    offset: 0,
    total: 1,
    entries: [{
      sourceId: '7', name: '钟楼', keys: ['午夜'], secondaryKeys: [], content: '钟楼每天午夜停摆。',
      enabled: true, constant: false, selective: false, useRegex: false,
    }],
  })
  assert.deepEqual(library.worldInfoPage(imported.entry.id, 1, 1)?.entries, [])
  assert.equal(library.overview(imported.entry.id).worldInfo, undefined)
  assert.equal(library.overview(imported.entry.id).worldInfoCount, 1)
  assert.deepEqual(library.list()[0]?.tavernHelper, imported.entry.tavernHelper)
  assert.equal(JSON.stringify(imported.entry).includes('secret script'), false)
  assert.equal(JSON.stringify(imported.entry).includes('not exposed'), false)
  assert.equal(JSON.stringify(imported.entry).includes('findRegex'), false)
  assert.equal(JSON.stringify(imported.entry).includes('replaceString'), false)
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

test('keeps local wording fixes and standalone display regexes beside the original card', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-overlay-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const raw = JSON.parse(readFileSync('tests/fixtures/manual-character-card.json', 'utf8')) as Record<string, unknown>
  const cardData = raw.data as Record<string, unknown>
  cardData.first_mes = '<角色图片><img>角色图image.png</img></角色图片>\n门还没锁。'
  const extensions = cardData.extensions as Record<string, unknown>
  const replacement = '<center><img src=https://cdn.example.com/$1 width=50% /></center>'
  extensions.regex_scripts = [{
    scriptName: '旧图片规则',
    findRegex: '<(?:illustration|img)>.*[^A-Za-z0-9\\.\\s<\\/>]+(.*?)<\\/(?:illustration|img)>/g',
    replaceString: replacement,
    trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false,
    runOnEdit: true, substituteRegex: 0, minDepth: null, maxDepth: null,
  }]
  const data = new TextEncoder().encode(JSON.stringify(raw))
  const library = new CharacterLibrary({ root })
  const imported = library.importFile({ data, filename: 'overlay.json', mediaType: 'application/json' })
  assert.deepEqual(imported.remoteResourceOrigins, ['https://cdn.example.com'])
  assert.deepEqual(imported.approvedRemoteResourceOrigins, [])

  const approved = library.setRemoteResourceOriginApproved(imported.id, 'https://cdn.example.com', true)
  assert.deepEqual(approved.approvedRemoteResourceOrigins, ['https://cdn.example.com'])
  assert.deepEqual(library.get(imported.id).approvedRemoteResourceOrigins, ['https://cdn.example.com'])
  assert.deepEqual(library.setRemoteResourceOriginApproved(imported.id, 'https://cdn.example.com', false)
    .approvedRemoteResourceOrigins, [])
  assert.throws(() => library.setRemoteResourceOriginApproved(imported.id, 'https://other.example.com', true),
    /没有引用/u)

  const corrected = library.replaceText(imported.id, '门还没锁', '门已经打开')
  assert.equal(corrected.localCorrectionCount, 1)
  assert.match(corrected.greetings[0]!, /门已经打开/u)
  assert.deepEqual(library.asset(imported.id).data, data)

  const extension = new TextEncoder().encode(JSON.stringify({
    scriptName: '插图 DLC',
    findRegex: '/<(?:illustration|img)>.*[^A-Za-z0-9\\.\\s<\\/>]+(.*?)<\\/(?:illustration|img)>/g',
    replaceString: replacement,
    trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false,
    runOnEdit: true,
  }))
  assert.throws(() => library.importDisplayExtension(imported.id, {
    data: extension, filename: '插图.json', approvedImageOrigins: [],
  }), /确认.*外部图片域名/u)
  const extended = library.importDisplayExtension(imported.id, {
    data: extension, filename: '插图.json', approvedImageOrigins: ['https://cdn.example.com'],
  })
  assert.equal(extended.displayExtensions.length, 1)
  assert.deepEqual(extended.displayExtensions[0]?.remoteImageOrigins, ['https://cdn.example.com'])
  assert.deepEqual(extended.displayExtensions[0]?.replacedCardRegexNames, ['旧图片规则'])
  assert.match(extended.renderedGreetings[0]!, /<img src=https:\/\/cdn\.example\.com\/image\.png/u)
  assert.doesNotMatch(extended.renderedGreetings[0]!, /角色图片/u)
  assert.deepEqual(library.asset(imported.id).data, data)

  const extensionId = extended.displayExtensions[0]!.id
  assert.equal(library.setDisplayExtensionEnabled(imported.id, extensionId, false).displayExtensions[0]?.enabled, false)
  assert.equal(library.setDisplayExtensionEnabled(imported.id, extensionId, true).displayExtensions[0]?.enabled, true)
  assert.equal(library.removeDisplayExtension(imported.id, extensionId).displayExtensions.length, 0)
  assert.deepEqual(library.asset(imported.id).data, data)
})
