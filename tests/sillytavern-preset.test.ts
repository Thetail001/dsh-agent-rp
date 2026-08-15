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
      regex_scripts: Array.from({ length: 40 }, (_, index) => ({
        scriptName: `正则 ${index}`,
        findRegex: '/old/gu',
        replaceString: 'new',
        trimStrings: [],
        placement: [2],
        disabled: index >= 22,
        markdownOnly: true,
        promptOnly: false,
        runOnEdit: false,
        substituteRegex: 0,
        minDepth: null,
        maxDepth: null,
      })),
      SPreset: {
        MacroNest: true,
        ChatSquash: { enabled: false },
        RegexBinding: {
          enabled: false,
          regexes: Array.from({ length: 40 }, (_, index) => ({
            scriptName: `正则 ${index}`,
            findRegex: '/old/gu',
            replaceString: 'new',
            trimStrings: [],
            placement: [2],
            disabled: index >= 22,
            markdownOnly: true,
            promptOnly: false,
            runOnEdit: false,
            substituteRegex: 0,
            minDepth: null,
            maxDepth: null,
          })),
        },
      },
      tavern_helper: {
        variables: { presetTheme: 'fox' },
        legacy_ui: { theme: 'old' },
        scripts: [
          { id: 'preset-on', name: '预设脚本', content: 'eventOn("app_ready", () => {})', enabled: true, data: { runs: 1 } },
          { id: 'preset-off', name: '关闭脚本', content: '', enabled: false },
        ],
      },
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
  assert.deepEqual(preset.extensionCompatibility, {
    macroNestEnabled: true,
    chatSquashEnabled: false,
    regexBindingEnabled: false,
    regexBindingMatchesPresetScripts: true,
    tavernHelperScriptCount: 2,
    enabledTavernHelperScriptCount: 1,
    tavernHelperFormat: 'object',
    tavernHelperVariableCount: 1,
    tavernHelperIgnoredFieldCount: 1,
  })
  assert.equal(preset.regexScripts.length, 40)
  assert.equal(preset.regexScripts.filter(script => !script.disabled).length, 22)
  assert.deepEqual(preset.tavernHelperVariables, { presetTheme: 'fox' })
  assert.equal(preset.tavernHelperScripts?.length, 2)
  assert.deepEqual(preset.tavernHelperScripts?.[0], {
    id: 'preset-on', name: '预设脚本', content: 'eventOn("app_ready", () => {})', info: '', enabled: true,
    buttonEnabled: true, buttons: [], data: { runs: 1 },
  })
  assert.equal(preset.prompts.at(-1)?.content, `内容 ${moduleCount - 1}`)
})

test('normalizes the model role used by community presets to assistant', () => {
  const preset = parseSillyTavernPresetJson(JSON.stringify({
    prompts: [
      { identifier: 'main', name: '主提示', role: 'system', content: 'main', marker: true },
      { identifier: 'model-note', name: '模型提示', role: 'model', content: '保持角色语气' },
    ],
    prompt_order: [{ character_id: 100001, order: [
      { identifier: 'main', enabled: true },
      { identifier: 'model-note', enabled: false },
    ] }],
  }), 'community-model-role.json')

  assert.equal(preset.prompts[1]?.role, 'assistant')
  assert.equal(preset.order[1]?.enabled, false)
})

test('imports Tavern Helper preset extensions serialized as key-value entries', () => {
  const preset = parseSillyTavernPresetJson(JSON.stringify({
    prompts: [{ identifier: 'main', name: '主提示', role: 'system', content: 'main' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
    extensions: {
      tavern_helper: [
        ['scripts', [{ id: 'entry-script', name: '条目脚本', content: 'eventOn("app_ready", run)', enabled: true }]],
        ['variables', { presetTheme: 'entry-list' }],
        ['legacy_ui', { theme: 'old' }],
      ],
    },
  }), 'entry-list.json')

  assert.deepEqual(preset.tavernHelperVariables, { presetTheme: 'entry-list' })
  assert.equal(preset.tavernHelperScripts?.[0]?.id, 'entry-script')
  assert.deepEqual(preset.extensionCompatibility, {
    tavernHelperScriptCount: 1,
    enabledTavernHelperScriptCount: 1,
    tavernHelperFormat: 'entries',
    tavernHelperVariableCount: 1,
    tavernHelperIgnoredFieldCount: 1,
  })
})
