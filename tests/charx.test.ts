import assert from 'node:assert/strict'
import test from 'node:test'
import { strToU8, zipSync } from 'fflate'
import {
  charxAvatar,
  charxImageAssets,
  normalizeCharxPath,
  parseCharx,
  readCharxImageAsset,
} from '../src/import/charx.ts'

function card(version = '3.0'): object {
  return {
    spec: 'chara_card_v3',
    spec_version: version,
    data: {
      name: '海棠',
      nickname: '棠棠',
      description: '住在海边的画师',
      personality: '坦率',
      scenario: '雨后的画室',
      first_mes: '你来了。',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: ['今天想画什么？'],
      group_only_greetings: [],
      tags: [],
      creator: 'fixture',
      character_version: '1',
      extensions: {},
      assets: [{ type: 'icon', uri: 'embeded://assets/icon/images/main.png', name: 'main', ext: 'png' }],
    },
  }
}

test('imports Character Card V3 and embedded files from a bounded CHARX archive', () => {
  const archive = zipSync({
    'card.json': strToU8(JSON.stringify(card())),
    'assets/icon/images/main.png': Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
  })
  const imported = parseCharx(archive)

  assert.equal(imported.card.name, '海棠')
  assert.equal(imported.card.nickname, '棠棠')
  assert.deepEqual(imported.entries.get('assets/icon/images/main.png'), {
    path: 'assets/icon/images/main.png', bytes: 4,
  })
  assert.deepEqual(charxAvatar(imported), {
    index: 0, type: 'icon', name: 'main', path: 'assets/icon/images/main.png', mediaType: 'image/png',
  })
  assert.deepEqual(readCharxImageAsset(imported, charxImageAssets(imported)[0]!),
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))
})

test('indexes large media collections without inflating every image', () => {
  const assets = Array.from({ length: 600 }, (_, index) => ({
    type: index === 0 ? 'icon' : 'emotion',
    uri: `embeded://assets/images/${index}.png`,
    name: index === 0 ? 'main' : `image-${index}`,
    ext: 'png',
  }))
  const raw = card() as { data: Record<string, unknown> }
  raw.data.assets = assets
  const files = Object.fromEntries(assets.map((_, index) => [
    `assets/images/${index}.png`, Uint8Array.of(0x89, 0x50, index & 0xff),
  ]))
  const imported = parseCharx(zipSync({ 'card.json': strToU8(JSON.stringify(raw)), ...files }))

  assert.equal(imported.entries.size, 601)
  assert.equal(charxImageAssets(imported).length, 600)
  assert.deepEqual(readCharxImageAsset(imported, charxImageAssets(imported)[599]!),
    Uint8Array.of(0x89, 0x50, 599 & 0xff))
})

test('rejects missing root card data and unsafe archive paths', () => {
  assert.throws(() => parseCharx(zipSync({ 'nested/card.json': strToU8(JSON.stringify(card())) })), /card\.json at the archive root/u)
  assert.throws(() => parseCharx(zipSync({
    'card.json': strToU8(JSON.stringify(card())),
    '../escape.png': Uint8Array.of(1),
  })), /unsafe archive path/u)
  assert.throws(() => normalizeCharxPath('assets//main.png'), /unsafe archive path/u)
  assert.throws(() => normalizeCharxPath('/assets/main.png'), /invalid archive path/u)
})
