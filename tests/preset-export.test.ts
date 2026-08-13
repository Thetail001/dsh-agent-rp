import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSillyTavernPresetJson } from '../src/import/sillytavern-preset.ts'
import { exportSillyTavernPresetJson } from '../src/preset-export.ts'

test('exports the supported current preset as a SillyTavern-compatible copy', () => {
  const source = parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{
      identifier: 'style', name: '文风', role: 'system', content: '克制', marker: false,
      system_prompt: true, forbid_overrides: false, injection_position: 1, injection_depth: 2, injection_order: 3,
    }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'style', enabled: true }] }],
    temperature: 0.9, openai_max_tokens: 4096, reasoning_effort: 'high', top_p: 0.95,
    wi_format: '<world>{0}</world>', scenario_format: '<scenario>{{scenario}}</scenario>',
    personality_format: '<personality>{{personality}}</personality>',
    extensions: {
      SPreset: { unsupported: true },
      tavern_helper: { unsupported: true },
      regex_scripts: [{
        scriptName: '显示', findRegex: '/x/gu', replaceString: 'y', trimStrings: [' '], placement: [2],
        disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 2,
        minDepth: 1, maxDepth: 5,
      }],
    },
  }), 'source.json')
  const json = exportSillyTavernPresetJson(source)
  const raw = JSON.parse(json) as { extensions: Record<string, unknown> }
  const replayed = parseSillyTavernPresetJson(json, 'copy.json')

  assert.deepEqual(replayed.prompts, source.prompts)
  assert.deepEqual(replayed.order, source.order)
  assert.deepEqual(replayed.generation, source.generation)
  assert.deepEqual(replayed.formats, source.formats)
  assert.deepEqual(replayed.regexScripts, source.regexScripts)
  assert.deepEqual(Object.keys(raw.extensions), ['regex_scripts'])
})
