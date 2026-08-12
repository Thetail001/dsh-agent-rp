import assert from 'node:assert/strict'
import test from 'node:test'
import {
  Config,
  DEFAULT_CHARACTER_NAME,
  resolveConfig,
} from '../src/config.ts'

test('materializes one original character without a start command', () => {
  const config = Config({})

  assert.equal(config.characterName, DEFAULT_CHARACTER_NAME)
  assert.equal(config.mode, 'character')
  assert.match(config.persona ?? '', /旧书修复铺/u)
  assert.match(config.scenario ?? '', /下雨/u)
})

test('normalizes direct plugin configuration and rejects blank identity text', () => {
  const resolved = resolveConfig({
    characterName: '  小满  ',
    persona: '  克制而好奇  ',
    scenario: '  刚搬来的邻居敲响了门  ',
    relationship: '  还不熟悉  ',
  })

  assert.deepEqual(resolved, {
    mode: 'character',
    characterName: '小满',
    persona: '克制而好奇',
    scenario: '刚搬来的邻居敲响了门',
    relationship: '还不熟悉',
  })
  assert.throws(() => resolveConfig({ characterName: '   ' }), /characterName/u)
})
