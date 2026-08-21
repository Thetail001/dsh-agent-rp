import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { auditSillyTavernPresetCompatibility } from '../src/preset-compat-audit.ts'

test('reports only structural compatibility facts for a fixed preset fixture', () => {
  const report = auditSillyTavernPresetCompatibility(readFileSync(resolve(
    'tests/fixtures/manual-sillytavern-preset.json',
  )))

  assert.equal(report.audit, 'private-sillytavern-preset-compat-v1')
  assert.ok(report.fileBytes > 0)
  assert.ok(report.parseDurationMs >= 0)
  assert.deepEqual(report.prompts, {
    modules: 4,
    orderEntries: 3,
    attachedModules: 3,
    detachedModules: 1,
    duplicateOrderEntries: 0,
    enabledOrderEntries: 2,
    disabledOrderEntries: 1,
    markers: 1,
    systemPrompts: 2,
    forbidOverrides: 1,
    injections: 1,
    ejsTemplates: 1,
    roles: { system: 2, user: 1, assistant: 1 },
  })
  assert.deepEqual(report.formats, {
    worldInfoOverride: true,
    scenarioOverride: false,
    personalityOverride: false,
  })
  assert.deepEqual(report.generationFields, ['temperature', 'maxTokens'])
  assert.deepEqual(report.regex, { scripts: 2, enabledScripts: 1 })
  assert.deepEqual(report.tavernHelper, { scripts: 2, enabledScripts: 1, variables: 2 })
  assert.deepEqual(report.extensions, {
    hasSPreset: true,
    hasTavernHelper: true,
    compatibility: {
      macroNestEnabled: true,
      chatSquashEnabled: false,
      tavernHelperScriptCount: 2,
      enabledTavernHelperScriptCount: 1,
      tavernHelperFormat: 'object',
      tavernHelperVariableCount: 2,
      tavernHelperIgnoredFieldCount: 1,
    },
  })
  assert.doesNotMatch(JSON.stringify(report), /Main|fixture|eventOn|Synthetic/u)
})
