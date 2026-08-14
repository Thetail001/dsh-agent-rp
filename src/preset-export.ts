/** SillyTavern-compatible export of the preset behavior Agent RP currently owns. */

import type { ImportedSillyTavernPreset, SillyTavernPresetPrompt } from './import/sillytavern-preset.ts'
import type { ImportedRegexScript, ImportedTavernHelperScript } from './import/types.ts'

/** Normalized fields that can be represented by a standalone SillyTavern preset. */
export type ExportableSillyTavernPreset = Pick<
  ImportedSillyTavernPreset,
  'prompts' | 'order' | 'generation' | 'formats' | 'regexScripts' | 'tavernHelperScripts' | 'tavernHelperVariables'
>

function prompt(prompt: SillyTavernPresetPrompt): Record<string, unknown> {
  return {
    identifier: prompt.identifier,
    name: prompt.name,
    role: prompt.role,
    content: prompt.content,
    marker: prompt.marker,
    system_prompt: prompt.systemPrompt,
    forbid_overrides: prompt.forbidOverrides,
    ...(prompt.injectionPosition === undefined ? {} : { injection_position: prompt.injectionPosition }),
    ...(prompt.injectionDepth === undefined ? {} : { injection_depth: prompt.injectionDepth }),
    ...(prompt.injectionOrder === undefined ? {} : { injection_order: prompt.injectionOrder }),
  }
}

function regex(script: ImportedRegexScript): Record<string, unknown> {
  return {
    scriptName: script.scriptName,
    findRegex: script.findRegex,
    replaceString: script.replaceString,
    trimStrings: [...script.trimStrings],
    placement: [...script.placement],
    disabled: script.disabled,
    markdownOnly: script.markdownOnly,
    promptOnly: script.promptOnly,
    runOnEdit: script.runOnEdit,
    substituteRegex: script.substituteRegex,
    minDepth: script.minDepth,
    maxDepth: script.maxDepth,
  }
}

function helperScript(script: ImportedTavernHelperScript): Record<string, unknown> {
  return {
    type: 'script',
    id: script.id,
    name: script.name,
    content: script.content,
    info: script.info,
    enabled: script.enabled,
    button: {
      enabled: script.buttonEnabled,
      buttons: script.buttons.map(button => ({ ...button })),
    },
    data: structuredClone(script.data),
  }
}

/** Serialize the supported current configuration as a new SillyTavern preset JSON file. */
export function exportSillyTavernPresetJson(preset: ExportableSillyTavernPreset): string {
  const generation = preset.generation
  const helperScripts = preset.tavernHelperScripts ?? []
  const helperVariables = preset.tavernHelperVariables ?? {}
  const hasHelper = helperScripts.length > 0 || Object.keys(helperVariables).length > 0
  return `${JSON.stringify({
    prompts: preset.prompts.map(prompt),
    prompt_order: [{ character_id: 100001, order: preset.order.map(entry => ({ ...entry })) }],
    ...(generation.temperature === undefined ? {} : { temperature: generation.temperature }),
    ...(generation.maxTokens === undefined ? {} : { openai_max_tokens: generation.maxTokens }),
    ...(generation.reasoningEffort === undefined ? {} : { reasoning_effort: generation.reasoningEffort }),
    ...(generation.topP === undefined ? {} : { top_p: generation.topP }),
    ...(generation.topK === undefined ? {} : { top_k: generation.topK }),
    ...(generation.topA === undefined ? {} : { top_a: generation.topA }),
    ...(generation.minP === undefined ? {} : { min_p: generation.minP }),
    ...(generation.frequencyPenalty === undefined ? {} : { frequency_penalty: generation.frequencyPenalty }),
    ...(generation.presencePenalty === undefined ? {} : { presence_penalty: generation.presencePenalty }),
    ...(generation.repetitionPenalty === undefined ? {} : { repetition_penalty: generation.repetitionPenalty }),
    wi_format: preset.formats.worldInfo,
    scenario_format: preset.formats.scenario,
    personality_format: preset.formats.personality,
    extensions: {
      regex_scripts: preset.regexScripts.map(regex),
      ...(hasHelper ? {
        tavern_helper: {
          scripts: helperScripts.map(helperScript),
          variables: structuredClone(helperVariables),
        },
      } : {}),
    },
  }, null, 2)}\n`
}
