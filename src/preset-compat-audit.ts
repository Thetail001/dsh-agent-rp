/** Content-free compatibility facts for one private SillyTavern preset. */

import { performance } from 'node:perf_hooks'
import {
  parseSillyTavernPresetBytes,
  type SillyTavernPresetExtensionCompatibility,
  type SillyTavernPresetGeneration,
} from './import/sillytavern-preset.ts'

const GENERATION_FIELDS = [
  'temperature',
  'maxTokens',
  'reasoningEffort',
  'topP',
  'topK',
  'topA',
  'minP',
  'frequencyPenalty',
  'presencePenalty',
  'repetitionPenalty',
] as const satisfies readonly (keyof SillyTavernPresetGeneration)[]

/** Content-free result returned by the private preset audit. */
export interface SillyTavernPresetCompatibilityAudit {
  readonly audit: 'private-sillytavern-preset-compat-v1'
  readonly fileBytes: number
  readonly parseDurationMs: number
  readonly prompts: {
    readonly modules: number
    readonly orderEntries: number
    readonly attachedModules: number
    readonly detachedModules: number
    readonly duplicateOrderEntries: number
    readonly enabledOrderEntries: number
    readonly disabledOrderEntries: number
    readonly markers: number
    readonly systemPrompts: number
    readonly forbidOverrides: number
    readonly injections: number
    readonly ejsTemplates: number
    readonly roles: {
      readonly system: number
      readonly user: number
      readonly assistant: number
    }
  }
  readonly formats: {
    readonly worldInfoOverride: boolean
    readonly scenarioOverride: boolean
    readonly personalityOverride: boolean
  }
  readonly generationFields: readonly (typeof GENERATION_FIELDS)[number][]
  readonly regex: {
    readonly scripts: number
    readonly enabledScripts: number
  }
  readonly tavernHelper: {
    readonly scripts: number
    readonly enabledScripts: number
    readonly variables: number
  }
  readonly extensions: {
    readonly hasSPreset: boolean
    readonly hasTavernHelper: boolean
    readonly compatibility?: SillyTavernPresetExtensionCompatibility
  }
}

function roundedDuration(started: number): number {
  return Number((performance.now() - started).toFixed(2))
}

/** Audit private preset bytes without returning names, prompt text, expressions, script source, or settings values. */
export function auditSillyTavernPresetCompatibility(
  bytes: Uint8Array,
): SillyTavernPresetCompatibilityAudit {
  const started = performance.now()
  const preset = parseSillyTavernPresetBytes(bytes)
  const parseDurationMs = roundedDuration(started)
  const orderedIdentifiers = new Set(preset.order.map(entry => entry.identifier))
  const helperScripts = preset.tavernHelperScripts ?? []
  const roleCounts = {
    system: preset.prompts.filter(prompt => prompt.role === 'system').length,
    user: preset.prompts.filter(prompt => prompt.role === 'user').length,
    assistant: preset.prompts.filter(prompt => prompt.role === 'assistant').length,
  }

  return {
    audit: 'private-sillytavern-preset-compat-v1',
    fileBytes: bytes.byteLength,
    parseDurationMs,
    prompts: {
      modules: preset.prompts.length,
      orderEntries: preset.order.length,
      attachedModules: orderedIdentifiers.size,
      detachedModules: preset.prompts.filter(prompt => !orderedIdentifiers.has(prompt.identifier)).length,
      duplicateOrderEntries: preset.order.length - orderedIdentifiers.size,
      enabledOrderEntries: preset.order.filter(entry => entry.enabled).length,
      disabledOrderEntries: preset.order.filter(entry => !entry.enabled).length,
      markers: preset.prompts.filter(prompt => prompt.marker).length,
      systemPrompts: preset.prompts.filter(prompt => prompt.systemPrompt).length,
      forbidOverrides: preset.prompts.filter(prompt => prompt.forbidOverrides).length,
      injections: preset.prompts.filter(prompt => prompt.injectionPosition !== undefined).length,
      ejsTemplates: preset.prompts.filter(prompt => prompt.content.includes('<%')).length,
      roles: roleCounts,
    },
    formats: {
      worldInfoOverride: preset.formats.worldInfo !== '{0}',
      scenarioOverride: preset.formats.scenario !== '{{scenario}}',
      personalityOverride: preset.formats.personality !== '{{personality}}',
    },
    generationFields: GENERATION_FIELDS.filter(field => preset.generation[field] !== undefined),
    regex: {
      scripts: preset.regexScripts.length,
      enabledScripts: preset.regexScripts.filter(script => !script.disabled).length,
    },
    tavernHelper: {
      scripts: helperScripts.length,
      enabledScripts: helperScripts.filter(script => script.enabled).length,
      variables: Object.keys(preset.tavernHelperVariables ?? {}).length,
    },
    extensions: {
      hasSPreset: preset.extensionSummary.hasSPreset,
      hasTavernHelper: preset.extensionSummary.hasTavernHelper,
      ...(preset.extensionCompatibility === undefined
        ? {} : { compatibility: preset.extensionCompatibility }),
    },
  }
}
