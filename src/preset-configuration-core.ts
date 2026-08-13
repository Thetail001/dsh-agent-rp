/** Pure validation and state transitions for session Prompt Manager changes. */

import type { ActiveSessionPreset } from './import/session-preset.ts'
import type { ImportedSillyTavernPreset, SillyTavernPresetGeneration } from './import/sillytavern-preset.ts'
import { presetRegexScripts } from './import/sillytavern-preset.ts'
import type { PresetConfigurationRequest } from './preset-configuration-types.ts'

const FORCE_TOGGLE_MARKERS = new Set([
  'charDescription',
  'charPersonality',
  'scenario',
  'personaDescription',
  'worldInfoBefore',
  'worldInfoAfter',
  'main',
  'chatHistory',
  'dialogueExamples',
])

/** Whether SillyTavern exposes the module's enable switch. */
export function canTogglePresetPrompt(preset: ImportedSillyTavernPreset, identifier: string): boolean {
  const prompt = preset.prompts.find(item => item.identifier === identifier)
  return prompt !== undefined && (!prompt.marker || FORCE_TOGGLE_MARKERS.has(identifier))
}

/** Whether one module owns literal text that can be edited by the Prompt Manager. */
export function canEditPresetPrompt(preset: ImportedSillyTavernPreset, identifier: string): boolean {
  const prompt = preset.prompts.find(item => item.identifier === identifier)
  return prompt !== undefined && !prompt.marker
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('revision must be a non-negative safe integer')
  return value as number
}

function index(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('index must be a non-negative safe integer')
  return value as number
}

function identifier(value: unknown, label = 'identifier'): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`)
  return value
}

function order(value: unknown): readonly { readonly identifier: string; readonly enabled: boolean }[] {
  if (!Array.isArray(value)) throw new Error('order must be an array')
  const seen = new Set<string>()
  return value.map((item, index) => {
    const record = object(item, `order[${index}]`)
    const id = identifier(record.identifier, `order[${index}].identifier`)
    if (seen.has(id)) throw new Error(`order repeats module ${JSON.stringify(id)}`)
    seen.add(id)
    if (typeof record.enabled !== 'boolean') throw new Error(`order[${index}].enabled must be a boolean`)
    return { identifier: id, enabled: record.enabled }
  })
}

function regex(value: unknown): readonly { readonly index: number; readonly disabled: boolean }[] {
  if (!Array.isArray(value)) throw new Error('regex must be an array')
  const seen = new Set<number>()
  return value.map((item, itemIndex) => {
    const record = object(item, `regex[${itemIndex}]`)
    const scriptIndex = index(record.index)
    if (seen.has(scriptIndex)) throw new Error(`regex repeats script index ${scriptIndex}`)
    seen.add(scriptIndex)
    if (typeof record.disabled !== 'boolean') throw new Error(`regex[${itemIndex}].disabled must be a boolean`)
    return { index: scriptIndex, disabled: record.disabled }
  })
}

function content(value: unknown): readonly { readonly identifier: string; readonly content: string }[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error('content must be an array')
  const seen = new Set<string>()
  return value.map((item, itemIndex) => {
    const record = object(item, `content[${itemIndex}]`)
    const id = identifier(record.identifier, `content[${itemIndex}].identifier`)
    if (seen.has(id)) throw new Error(`content repeats module ${JSON.stringify(id)}`)
    seen.add(id)
    if (typeof record.content !== 'string') throw new Error(`content[${itemIndex}].content must be a string`)
    return { identifier: id, content: record.content }
  })
}

function finiteOrNull(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number or null`)
  if (label === 'temperature' && (value < 0 || value > 2)) throw new Error('temperature must be between 0 and 2')
  return value
}

function integerOrNull(value: unknown, label: string): number | null {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive safe integer or null`)
  return value as number
}

function effortOrNull(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim() === '') throw new Error('reasoningEffort must be a non-empty string or null')
  return value.trim()
}

function generation(value: unknown): Extract<PresetConfigurationRequest, { operation: 'replace' }>['generation'] {
  const record = object(value, 'generation')
  return {
    ...record.temperature === undefined ? {} : { temperature: finiteOrNull(record.temperature, 'temperature') },
    ...record.maxTokens === undefined ? {} : { maxTokens: integerOrNull(record.maxTokens, 'maxTokens') },
    ...record.reasoningEffort === undefined ? {} : { reasoningEffort: effortOrNull(record.reasoningEffort) },
  }
}

/** Decode the private command payload at the Host boundary. */
export function parsePresetConfigurationRequest(source: string): PresetConfigurationRequest {
  let parsed: unknown
  try {
    parsed = JSON.parse(source.trim())
  } catch (error: unknown) {
    throw new Error('preset configuration must be valid JSON', { cause: error })
  }
  const value = object(parsed, 'preset configuration')
  const common = { revision: revision(value.revision) }
  switch (value.operation) {
    case 'replace':
      return {
        operation: 'replace',
        ...common,
        order: order(value.order),
        content: content(value.content),
        generation: generation(value.generation),
        regex: regex(value.regex),
      }
    case 'toggle': {
      if (typeof value.enabled !== 'boolean') throw new Error('enabled must be a boolean')
      return { operation: 'toggle', ...common, identifier: identifier(value.identifier), enabled: value.enabled }
    }
    case 'move':
      return {
        operation: 'move',
        ...common,
        identifier: identifier(value.identifier),
        ...value.before === undefined ? {} : { before: identifier(value.before, 'before') },
      }
    case 'generation': {
      const result: Extract<PresetConfigurationRequest, { operation: 'generation' }> = {
        operation: 'generation',
        ...common,
        ...value.temperature === undefined ? {} : { temperature: finiteOrNull(value.temperature, 'temperature') },
        ...value.maxTokens === undefined ? {} : { maxTokens: integerOrNull(value.maxTokens, 'maxTokens') },
        ...value.reasoningEffort === undefined ? {} : { reasoningEffort: effortOrNull(value.reasoningEffort) },
      }
      if (result.temperature === undefined && result.maxTokens === undefined && result.reasoningEffort === undefined) {
        throw new Error('generation requires at least one setting')
      }
      return result
    }
    case 'reset':
      return { operation: 'reset', ...common }
    default:
      throw new Error(`unknown preset configuration operation ${JSON.stringify(value.operation)}`)
  }
}

function withGeneration(
  current: SillyTavernPresetGeneration,
  request: Extract<PresetConfigurationRequest, { operation: 'generation' }>,
): SillyTavernPresetGeneration {
  const next = { ...current } as Record<string, unknown>
  for (const [key, value] of [
    ['temperature', request.temperature],
    ['maxTokens', request.maxTokens],
    ['reasoningEffort', request.reasoningEffort],
  ] as const) {
    if (value === undefined) continue
    if (value === null) delete next[key]
    else next[key] = value
  }
  return next as SillyTavernPresetGeneration
}

/** Apply one validated manager mutation to an imported preset snapshot. */
export function configurePreset(
  active: ActiveSessionPreset,
  request: PresetConfigurationRequest,
): ImportedSillyTavernPreset {
  if (request.revision !== active.revision) {
    throw new Error(`preset configuration changed; expected revision ${active.revision}, received ${request.revision}`)
  }
  if (request.operation === 'reset') return structuredClone(active.importedPreset)
  if (request.operation === 'replace') {
    const prompts = new Set(active.preset.prompts.map(item => item.identifier))
    for (const entry of request.order) {
      if (!prompts.has(entry.identifier)) throw new Error(`preset has no module ${JSON.stringify(entry.identifier)}`)
      if (entry.enabled && !canTogglePresetPrompt(active.preset, entry.identifier)) {
        const current = active.preset.order.find(item => item.identifier === entry.identifier)?.enabled ?? false
        if (!current) throw new Error(`preset module ${JSON.stringify(entry.identifier)} cannot be enabled`)
      }
    }
    const contentById = new Map(request.content.map(entry => [entry.identifier, entry.content]))
    for (const identifier of contentById.keys()) {
      if (!prompts.has(identifier)) throw new Error(`preset has no module ${JSON.stringify(identifier)}`)
      if (!canEditPresetPrompt(active.preset, identifier)) {
        throw new Error(`preset module ${JSON.stringify(identifier)} has no editable content`)
      }
    }
    const scripts = presetRegexScripts(active.preset)
    if (request.regex.length !== scripts.length
      || request.regex.some(entry => entry.index >= scripts.length)) {
      throw new Error('preset regex configuration does not match the active script set')
    }
    const disabledByIndex = new Map(request.regex.map(entry => [entry.index, entry.disabled]))
    return {
      ...structuredClone(active.preset),
      prompts: active.preset.prompts.map(prompt => contentById.has(prompt.identifier)
        ? { ...prompt, content: contentById.get(prompt.identifier)! }
        : { ...prompt }),
      order: request.order.map(item => ({ ...item })),
      generation: withGeneration(active.preset.generation, {
        operation: 'generation',
        revision: request.revision,
        ...request.generation,
      }),
      regexScripts: scripts.map((script, index) => ({ ...script, disabled: disabledByIndex.get(index) ?? script.disabled })),
    }
  }
  if (request.operation === 'generation') {
    return { ...structuredClone(active.preset), generation: withGeneration(active.preset.generation, request) }
  }
  const prompt = active.preset.prompts.find(item => item.identifier === request.identifier)
  if (prompt === undefined) throw new Error(`preset has no module ${JSON.stringify(request.identifier)}`)
  const nextOrder = active.preset.order.map(item => ({ ...item }))
  const index = nextOrder.findIndex(item => item.identifier === request.identifier)
  if (request.operation === 'toggle') {
    if (!canTogglePresetPrompt(active.preset, request.identifier)) {
      throw new Error(`preset module ${JSON.stringify(request.identifier)} has no configurable switch`)
    }
    if (index === -1) nextOrder.push({ identifier: request.identifier, enabled: request.enabled })
    else nextOrder[index] = { ...nextOrder[index]!, enabled: request.enabled }
    return { ...structuredClone(active.preset), order: nextOrder }
  }
  if (request.before === request.identifier) return structuredClone(active.preset)
  if (request.before !== undefined && !nextOrder.some(item => item.identifier === request.before)) {
    throw new Error(`preset order has no destination ${JSON.stringify(request.before)}`)
  }
  const entry = index === -1 ? { identifier: request.identifier, enabled: false } : nextOrder.splice(index, 1)[0]!
  const destination = request.before === undefined
    ? nextOrder.length
    : nextOrder.findIndex(item => item.identifier === request.before)
  nextOrder.splice(destination, 0, entry)
  return { ...structuredClone(active.preset), order: nextOrder }
}
