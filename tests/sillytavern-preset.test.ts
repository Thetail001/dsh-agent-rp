import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'

test('imports every Prompt Manager module without dropping disabled entries', () => {
  const moduleCount = 217
  const prompts = Array.from({ length: moduleCount }, (_, index) => ({
    identifier: `module-${index}`,
    name: `模块 ${index}`,
    role: index === 61 ? 'assistant' : 'system',
    content: `内容 ${index}`,
    marker: false,
    system_prompt: index !== 61,
    injection_position: 0,
    injection_depth: 4,
    injection_order: 100,
  }))
  const order = prompts.slice(0, 212).map((prompt, index) => ({
    identifier: prompt.identifier,
    enabled: index < 62,
  }))
  const preset = parseSillyTavernPresetJson(JSON.stringify({
    prompts,
    prompt_order: [{ character_id: 100001, order }],
    temperature: 1,
    openai_max_tokens: 65_535,
    reasoning_effort: 'low',
    top_p: 0.88,
    top_k: 40,
    extensions: {
      regex_scripts: Array.from({ length: 40 }, () => ({})),
      SPreset: {},
      tavern_helper: {},
    },
  }), 'V18.json')

  assert.equal(preset.name, 'V18')
  assert.equal(preset.prompts.length, moduleCount)
  assert.equal(preset.order.length, 212)
  assert.equal(preset.order.filter(entry => entry.enabled).length, 62)
  assert.equal(preset.prompts.filter(prompt => prompt.role === 'assistant').length, 1)
  assert.deepEqual(preset.generation, {
    temperature: 1,
    maxTokens: 65_535,
    reasoningEffort: 'low',
    topP: 0.88,
    topK: 40,
  })
  assert.deepEqual(preset.extensionSummary, {
    regexScriptCount: 40,
    hasSPreset: true,
    hasTavernHelper: true,
  })
  assert.equal(preset.prompts.at(-1)?.content, `内容 ${moduleCount - 1}`)
})
