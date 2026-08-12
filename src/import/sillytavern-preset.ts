/** SillyTavern Chat Completion preset parsing without executing extension code. */

import type { JsonValue } from '@deepseek-ai/dsh-session'
import { parseRegexScript } from './regex-script.ts'
import type { ImportedRegexScript } from './types.ts'

/** Role assigned to one Prompt Manager entry. */
export type SillyTavernPresetRole = 'system' | 'user' | 'assistant'

/** One losslessly ordered Prompt Manager module. */
export interface SillyTavernPresetPrompt {
  readonly identifier: string
  readonly name: string
  readonly role: SillyTavernPresetRole
  readonly content: string
  readonly marker: boolean
  readonly systemPrompt: boolean
  readonly forbidOverrides: boolean
  readonly injectionPosition?: number
  readonly injectionDepth?: number
  readonly injectionOrder?: number
}

/** One module reference in the selected global prompt order. */
export interface SillyTavernPresetOrderEntry {
  readonly identifier: string
  readonly enabled: boolean
}

/** Generation settings whose original values remain inspectable after import. */
export interface SillyTavernPresetGeneration {
  readonly temperature?: number
  readonly maxTokens?: number
  readonly reasoningEffort?: string
  readonly topP?: number
  readonly topK?: number
  readonly topA?: number
  readonly minP?: number
  readonly frequencyPenalty?: number
  readonly presencePenalty?: number
  readonly repetitionPenalty?: number
}

/** Normalized executable portion of one Chat Completion preset. */
export interface ImportedSillyTavernPreset {
  readonly format: 0
  readonly name: string
  readonly prompts: readonly SillyTavernPresetPrompt[]
  readonly order: readonly SillyTavernPresetOrderEntry[]
  readonly generation: SillyTavernPresetGeneration
  readonly formats: {
    readonly worldInfo: string
    readonly scenario: string
    readonly personality: string
  }
  /** Preset-scoped scripts executed before character-scoped scripts. */
  readonly regexScripts: readonly ImportedRegexScript[]
  readonly extensionSummary: {
    readonly regexScriptCount: number
    readonly hasSPreset: boolean
    readonly hasTavernHelper: boolean
  }
}

/** Read preset scripts from the current normalized shape or a pre-regex session snapshot. */
export function presetRegexScripts(preset: ImportedSillyTavernPreset): readonly ImportedRegexScript[] {
  return preset.regexScripts ?? []
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function optionalFinite(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`)
  return value
}

function prompt(value: unknown, index: number): SillyTavernPresetPrompt {
  const record = object(value, `prompts[${index}]`)
  const identifier = text(record.identifier).trim()
  if (identifier === '') throw new Error(`prompts[${index}].identifier must be non-empty`)
  const role = record.role ?? 'system'
  if (role !== 'system' && role !== 'user' && role !== 'assistant') {
    throw new Error(`prompts[${index}].role is unsupported`)
  }
  return {
    identifier,
    name: text(record.name, identifier),
    role,
    content: text(record.content),
    marker: record.marker === true,
    systemPrompt: record.system_prompt === true,
    forbidOverrides: record.forbid_overrides === true,
    ...optionalFinite(record.injection_position, `prompts[${index}].injection_position`) === undefined
      ? {} : { injectionPosition: record.injection_position as number },
    ...optionalFinite(record.injection_depth, `prompts[${index}].injection_depth`) === undefined
      ? {} : { injectionDepth: record.injection_depth as number },
    ...optionalFinite(record.injection_order, `prompts[${index}].injection_order`) === undefined
      ? {} : { injectionOrder: record.injection_order as number },
  }
}

function selectedOrder(value: unknown): SillyTavernPresetOrderEntry[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('prompt_order must contain at least one order')
  const rows = value.map((entry, index) => object(entry, `prompt_order[${index}]`))
  const selected = rows.find(row => String(row.character_id) === '100001') ?? rows[0]!
  if (!Array.isArray(selected.order)) throw new Error('selected prompt_order row must contain an order array')
  return selected.order.map((entry, index) => {
    const record = object(entry, `prompt_order.order[${index}]`)
    const identifier = text(record.identifier).trim()
    if (identifier === '') throw new Error(`prompt_order.order[${index}].identifier must be non-empty`)
    return { identifier, enabled: record.enabled === true }
  })
}

/** Whether parsed JSON has the structural signature of a Chat Completion preset. */
export function isSillyTavernPresetJson(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.prompts) && Array.isArray(record.prompt_order)
}

/** Parse all Prompt Manager modules while retaining extension capability counts. */
export function parseSillyTavernPresetJson(source: string, fileName = 'SillyTavern preset'): ImportedSillyTavernPreset {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('SillyTavern preset is not valid JSON', { cause: error })
  }
  if (!isSillyTavernPresetJson(value)) throw new Error('JSON is not a SillyTavern Chat Completion preset')
  const record = object(value, 'preset')
  const prompts = (record.prompts as unknown[]).map(prompt)
  const seen = new Set<string>()
  for (const item of prompts) {
    if (seen.has(item.identifier)) throw new Error(`preset repeats prompt identifier ${JSON.stringify(item.identifier)}`)
    seen.add(item.identifier)
  }
  const order = selectedOrder(record.prompt_order)
  for (const item of order) {
    if (!seen.has(item.identifier)) throw new Error(`prompt_order references missing prompt ${JSON.stringify(item.identifier)}`)
  }
  const extensions = record.extensions === undefined ? {} : object(record.extensions, 'extensions')
  const rawRegex = extensions.regex_scripts
  const regexScripts = rawRegex === undefined
    ? []
    : (() => {
        if (!Array.isArray(rawRegex)) throw new Error('extensions.regex_scripts must be an array')
        return rawRegex.map((value, index) => parseRegexScript(value as JsonValue, `extensions.regex_scripts[${index}]`))
      })()
  return {
    format: 0,
    name: fileName.replace(/\.json$/iu, '').trim() || 'SillyTavern preset',
    prompts,
    order,
    generation: {
      ...optionalFinite(record.temperature, 'temperature') === undefined ? {} : { temperature: record.temperature as number },
      ...optionalFinite(record.openai_max_tokens, 'openai_max_tokens') === undefined ? {} : { maxTokens: record.openai_max_tokens as number },
      ...typeof record.reasoning_effort === 'string' ? { reasoningEffort: record.reasoning_effort } : {},
      ...optionalFinite(record.top_p, 'top_p') === undefined ? {} : { topP: record.top_p as number },
      ...optionalFinite(record.top_k, 'top_k') === undefined ? {} : { topK: record.top_k as number },
      ...optionalFinite(record.top_a, 'top_a') === undefined ? {} : { topA: record.top_a as number },
      ...optionalFinite(record.min_p, 'min_p') === undefined ? {} : { minP: record.min_p as number },
      ...optionalFinite(record.frequency_penalty, 'frequency_penalty') === undefined ? {} : { frequencyPenalty: record.frequency_penalty as number },
      ...optionalFinite(record.presence_penalty, 'presence_penalty') === undefined ? {} : { presencePenalty: record.presence_penalty as number },
      ...optionalFinite(record.repetition_penalty, 'repetition_penalty') === undefined ? {} : { repetitionPenalty: record.repetition_penalty as number },
    },
    formats: {
      worldInfo: text(record.wi_format, '{0}'),
      scenario: text(record.scenario_format, '{{scenario}}'),
      personality: text(record.personality_format, '{{personality}}'),
    },
    regexScripts,
    extensionSummary: {
      regexScriptCount: regexScripts.length,
      hasSPreset: extensions.SPreset !== undefined && extensions.SPreset !== null,
      hasTavernHelper: extensions.tavern_helper !== undefined && extensions.tavern_helper !== null,
    },
  }
}

/** Parse UTF-8 preset bytes with strict decoding. */
export function parseSillyTavernPresetBytes(bytes: Uint8Array, fileName?: string): ImportedSillyTavernPreset {
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error: unknown) {
    throw new Error('SillyTavern preset must be UTF-8 JSON', { cause: error })
  }
  return parseSillyTavernPresetJson(source, fileName)
}

/** Convert a normalized preset to durable JSON without retaining executable extension payloads. */
export function presetJson(preset: ImportedSillyTavernPreset): JsonValue {
  return structuredClone(preset) as unknown as JsonValue
}
