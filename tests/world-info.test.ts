import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { activateLorebook } from '../src/import/lorebook.ts'
import { parseWorldInfoJson, parseWorldInfoJsonBytes } from '../src/import/world-info.ts'

function world(entries: object): string {
  return JSON.stringify({ name: '海城', entries, extensions: { 'fixture/unknown': true } })
}

test('imports a standalone SillyTavern World Info literal-key subset losslessly', () => {
  const json = world({
    10: {
      uid: 10,
      key: [],
      keysecondary: [],
      content: '海城终年多雾。',
      constant: true,
      selective: false,
      order: 20,
      position: 0,
      disable: false,
    },
    20: {
      uid: 20,
      key: ['钟楼'],
      keysecondary: ['午夜', '停摆'],
      content: '旧钟楼每天午夜停摆一分钟。',
      constant: false,
      selective: true,
      selectiveLogic: 3,
      order: 10,
      position: 1,
      disable: false,
      scanDepth: 2,
      caseSensitive: false,
      matchWholeWords: false,
    },
  })
  const book = parseWorldInfoJson(json)

  assert.equal(book.name, '海城')
  assert.deepEqual(book.degradations, [])
  assert.deepEqual((book.raw as { extensions: object }).extensions, { 'fixture/unknown': true })
  assert.deepEqual(activateLorebook(book.lorebook, ['钟楼在午夜停摆。']), {
    beforeCharacter: ['海城终年多雾。'],
    afterCharacter: ['旧钟楼每天午夜停摆一分钟。'],
  })
})

test('keeps the manual standalone World Info fixture importable', () => {
  const worldInfo = parseWorldInfoJsonBytes(readFileSync('tests/fixtures/manual-world-info.json'))

  assert.equal(worldInfo.name, '海城')
  assert.equal(worldInfo.lorebook.entries.length, 2)
  assert.deepEqual((worldInfo.raw as { extensions: object }).extensions, { 'fixture/book': true })
})

test('preserves but does not execute advanced World Info behavior', () => {
  const book = parseWorldInfoJson(world({
    regex: {
      key: ['/秘密/i'],
      keysecondary: [],
      content: '正则不应执行。',
      order: 1,
      position: 0,
    },
    decorated: {
      key: ['港口'],
      keysecondary: [],
      content: '@@depth 2\n装饰器不应执行。',
      order: 2,
      position: 1,
    },
    probability: {
      key: ['蓝灯'],
      keysecondary: [],
      content: '概率条目不应随机执行。',
      order: 3,
      position: 1,
      useProbability: true,
      probability: 50,
    },
    vector: {
      key: ['潮汐'],
      keysecondary: [],
      content: '向量条目不应执行。',
      order: 4,
      position: 1,
      vectorized: true,
    },
    timed: {
      key: ['船票'],
      keysecondary: [],
      content: '定时状态不应执行。',
      order: 5,
      position: 1,
      sticky: 2,
    },
    depth: {
      key: ['旧港'],
      keysecondary: [],
      content: '高级位置不应执行。',
      order: 6,
      position: 4,
    },
  }))

  assert.deepEqual(book.degradations, [
    'entry-decorators',
    'entry-probability',
    'entry-regex',
    'entry-unsupported-position',
    'timed-effects',
    'vector-matching',
  ])
  assert.deepEqual(activateLorebook(book.lorebook, ['秘密 港口 蓝灯 潮汐 船票 旧港']), {
    beforeCharacter: [],
    afterCharacter: [],
  })
})

test('decodes standalone World Info as strict UTF-8 and rejects malformed entries', () => {
  const json = world({ 1: { key: [], content: '常驻', constant: true, order: 1, position: 0 } })

  assert.equal(parseWorldInfoJsonBytes(Buffer.from(`\uFEFF${json}`, 'utf8')).name, '海城')
  assert.throws(() => parseWorldInfoJsonBytes(Uint8Array.from([0xc3, 0x28])), /valid UTF-8/u)
  assert.throws(() => parseWorldInfoJson('{}'), /entries must be an object or array/u)
  assert.throws(() => parseWorldInfoJson(world({ bad: { key: 'not an array' } })), /entries.bad.key/u)
})

test('supports negative secondary logic and whole-word matching', () => {
  const book = parseWorldInfoJson(world({
    notAny: {
      key: ['港'],
      keysecondary: ['封航'],
      content: '港口仍然开放。',
      selective: true,
      selectiveLogic: 2,
      order: 1,
      position: 1,
      matchWholeWords: true,
    },
  }))

  assert.deepEqual(activateLorebook(book.lorebook, ['港口没有封航']), { beforeCharacter: [], afterCharacter: [] })
  assert.deepEqual(activateLorebook(book.lorebook, ['港 仍然开放']), { beforeCharacter: [], afterCharacter: ['港口仍然开放。'] })
})

test('keeps phrase keys literal when whole-word matching is enabled', () => {
  const book = parseWorldInfoJson(world({
    phrase: {
      key: ['old clock'],
      keysecondary: [],
      content: 'The old clock is imported.',
      order: 1,
      position: 1,
      matchWholeWords: true,
    },
  }))

  assert.deepEqual(activateLorebook(book.lorebook, ['an old clockmaker']), {
    beforeCharacter: [],
    afterCharacter: ['The old clock is imported.'],
  })
})
