/** Durable SillyTavern preset replay from native tool events. */

import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import type { FileAttachmentRef } from './session-character.ts'
import type { ImportedSillyTavernPreset } from './sillytavern-preset.ts'
import { configurePreset, parsePresetConfigurationRequest } from '../preset-configuration-core.ts'

/** Compact result of importing one preset attachment. */
export interface PresetImportResult {
  readonly version: 0
  readonly name: string
  readonly sourceEventSeq: number
  readonly sourceAttachmentId: string
  readonly promptCount: number
  readonly enabledCount: number
  readonly regexScriptCount: number
}

/** Tool value before its normalized preset moves into presentation metadata. */
export interface PresetImportValue extends PresetImportResult {
  readonly preset: JsonValue
}

/** Replayable metadata for the active preset. */
export interface PresetImportMeta {
  readonly format: 0
  readonly result: PresetImportResult
  readonly preset: ImportedSillyTavernPreset
}

/** Active preset reconstructed from a Session log. */
export interface ActiveSessionPreset {
  readonly result: PresetImportResult
  /** Original imported defaults used by the manager's reset action. */
  readonly importedPreset: ImportedSillyTavernPreset
  /** Current edited manager state. */
  readonly preset: ImportedSillyTavernPreset
  readonly revision: number
}

/** Model-free preset activation retained in one forked roleplay Session. */
export interface PresetSeedRecord {
  readonly format: 0
  readonly source: {
    readonly attachmentConsumer: 'dsh-agent-rp'
    readonly attachments: readonly [FileAttachmentRef]
  }
  readonly result: PresetImportResult
  readonly preset: ImportedSillyTavernPreset
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Skippable preset activation whose source attachment remains inspectable. */
    'agent-rp/sillytavern-preset-seed': PresetSeedRecord
  }
}

function object(value: JsonValue | undefined, label: string): Record<string, JsonValue> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value
}

function parseMeta(value: JsonValue | undefined): PresetImportMeta {
  const meta = object(value, 'import_sillytavern_preset metadata')
  const result = object(meta.result, 'import_sillytavern_preset result')
  const preset = object(meta.preset, 'import_sillytavern_preset preset')
  if (meta.format !== 0 || result.version !== 0 || preset.format !== 0
    || typeof result.name !== 'string' || typeof result.sourceEventSeq !== 'number'
    || !Number.isSafeInteger(result.sourceEventSeq) || typeof result.sourceAttachmentId !== 'string'
    || typeof result.promptCount !== 'number' || !Number.isSafeInteger(result.promptCount)
    || typeof result.enabledCount !== 'number' || !Number.isSafeInteger(result.enabledCount)
    || typeof result.regexScriptCount !== 'number' || !Number.isSafeInteger(result.regexScriptCount)
    || !Array.isArray(preset.prompts) || !Array.isArray(preset.order)) {
    throw new Error('import_sillytavern_preset metadata has invalid fields')
  }
  return value as unknown as PresetImportMeta
}

/** Find the last successful preset import in one Session. */
export function readActiveSessionPreset(events: readonly SessionEvent[]): ActiveSessionPreset | undefined {
  let active: ActiveSessionPreset | undefined
  for (const event of events) {
    if (event.type === 'agent-rp/sillytavern-preset-seed') {
      active = {
        result: event.data.result,
        importedPreset: event.data.preset,
        preset: event.data.preset,
        revision: 0,
      }
      continue
    }
    if (event.type === 'command/run' && event.data.name === 'rp-preset-configure' && event.data.args !== undefined) {
      if (active === undefined) continue
      try {
        active = {
          ...active,
          preset: configurePreset(active, parsePresetConfigurationRequest(event.data.args)),
          revision: active.revision + 1,
        }
      } catch {
        // An invalid or stale command never changed the authoritative preset state.
      }
      continue
    }
    if (event.type !== 'tool/result' || event.data.message.content[0]?.isError === true) continue
    const callId = String(event.data.message.content[0]?.toolCallId)
    const call = events.find(candidate => candidate.type === 'tool/call' && String(candidate.data.callId) === callId)
    if (call?.type !== 'tool/call' || call.data.name !== 'import_sillytavern_preset') continue
    const meta = parseMeta(event.data.meta)
    active = {
      result: meta.result,
      importedPreset: meta.preset,
      preset: meta.preset,
      revision: 0,
    }
  }
  return active
}

/** Activate one preset by extending an existing native roleplay Session. */
export function createPresetSessionSeed(
  events: readonly SessionEvent[],
  preset: ImportedSillyTavernPreset,
  attachment: FileAttachmentRef,
): readonly SessionEvent[] {
  const prepared = preparePresetImportResult(preset, events.length, attachment)
  const { preset: _value, ...result } = prepared
  return [...structuredClone(events), {
    type: 'agent-rp/sillytavern-preset-seed',
    seq: events.length,
    time: Date.now(),
    data: {
      format: 0,
      source: { attachmentConsumer: 'dsh-agent-rp', attachments: [attachment] },
      result,
      preset,
    },
    ignorable: true,
  }]
}

/** Build the canonical import result for one normalized preset. */
export function preparePresetImportResult(
  preset: ImportedSillyTavernPreset,
  sourceEventSeq: number,
  attachment: FileAttachmentRef,
): PresetImportValue {
  const enabled = new Set(preset.order.filter(item => item.enabled).map(item => item.identifier))
  return {
    version: 0,
    name: preset.name,
    sourceEventSeq,
    sourceAttachmentId: String(attachment.attachmentId),
    promptCount: preset.prompts.length,
    enabledCount: preset.prompts.filter(item => enabled.has(item.identifier)).length,
    regexScriptCount: preset.extensionSummary.regexScriptCount,
    preset: structuredClone(preset) as unknown as JsonValue,
  }
}
