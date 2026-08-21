import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from '../src/config.ts'
import { renderToolGuidance, withToolGuidance } from '../src/tool-guidance.ts'

test('renders framework, publisher, custom, and auto policy in one fixed block', () => {
  const config = resolveConfig({ toolGuidance: { custom: [
    { id: 'disabled', enabled: false, text: 'DO NOT SHOW' },
    { id: 'comfy', text: 'Use run_saved_workflow.' },
  ] } }).toolGuidance
  const guidance = renderToolGuidance(config)

  assert.match(guidance, /Agent RP 工具指导/u)
  assert.match(guidance, /当前场景、剧情进度、短期状态/u)
  assert.match(guidance, /不确定时保持原状/u)
  assert.doesNotMatch(guidance, /remember|supersedes/u)
  assert.match(guidance, /import_character_card/u)
  assert.match(guidance, /publish_roleplay_image/u)
  assert.match(guidance, /run_saved_workflow/u)
  assert.match(guidance, /图像策略：由你决定/u)
  assert.doesNotMatch(guidance, /DO NOT SHOW/u)
})

test('supports independent built-in guidance, Agent RP tools, and image modes', () => {
  const noFramework = renderToolGuidance(resolveConfig({ toolGuidance: {
    includeFramework: false,
    includeAgentRp: false,
    imageMode: 'always',
    custom: [],
  } }).toolGuidance)
  assert.doesNotMatch(noFramework, /remember|publish_roleplay_image/u)
  assert.match(noFramework, /图像策略：每个由用户普通对话触发/u)

  const never = renderToolGuidance(resolveConfig({ toolGuidance: {
    imageMode: 'never',
    custom: [{ id: 'draw', text: 'Use an image MCP.' }],
  } }).toolGuidance)
  assert.match(never, /图像策略：禁止/u)
  assert.doesNotMatch(never, /生成图片已经直接返回/u)
})

test('appends enabled guidance after any imported persona boundary', () => {
  const config = resolveConfig({ toolGuidance: {
    custom: [{ id: 'marker', text: 'CUSTOM_GUIDANCE_MARKER' }],
  } }).toolGuidance
  const prompt = withToolGuidance('IMPORTED_PRESET_SYSTEM', config)

  assert.ok(prompt.indexOf('IMPORTED_PRESET_SYSTEM') < prompt.indexOf('CUSTOM_GUIDANCE_MARKER'))
  assert.equal(withToolGuidance('persona', { ...config, enabled: false }), 'persona')
})
