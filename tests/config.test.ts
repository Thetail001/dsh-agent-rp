import assert from 'node:assert/strict'
import test from 'node:test'
import {
  Config,
  DEFAULT_CHARACTER_NAME,
  DEFAULT_TOOL_GUIDANCE,
  resolveConfig,
} from '../src/config.ts'

test('materializes one original character without a start command', () => {
  const config = Config({})

  assert.equal(config.characterName, DEFAULT_CHARACTER_NAME)
  assert.equal(config.mode, 'character')
  assert.match(config.persona ?? '', /旧书修复铺/u)
  assert.match(config.scenario ?? '', /下雨/u)
  assert.deepEqual(config.toolGuidance, DEFAULT_TOOL_GUIDANCE)
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
    toolGuidance: DEFAULT_TOOL_GUIDANCE,
  })
  assert.throws(() => resolveConfig({ characterName: '   ' }), /characterName/u)
})

test('normalizes tool guidance entries and rejects duplicate ids', () => {
  const resolved = resolveConfig({
    toolGuidance: {
      includeFramework: false,
      imageMode: 'always',
      custom: [{ id: ' comfy ', text: ' use the configured MCP ' }],
    },
  })

  assert.deepEqual(resolved.toolGuidance, {
    enabled: true,
    includeFramework: false,
    includeAgentRp: true,
    imageMode: 'always',
    custom: [{ id: 'comfy', enabled: true, text: 'use the configured MCP' }],
  })
  assert.throws(() => resolveConfig({ toolGuidance: { custom: [
    { id: 'same', text: 'one' }, { id: 'same', text: 'two' },
  ] } }), /unique/u)
})
