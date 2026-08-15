/** JSON payload carried by the Host's native command lifecycle. */

import type { ImportedSillyTavernPreset } from './import/sillytavern-preset.ts'
import type { PresetLibrarySummary } from './preset-library.ts'

const PREFIX = 'agent-rp:preset-library:v0:'

/** Preset library result persisted inside a native `command/done` event. */
export interface PresetLibraryCommandResult {
  readonly format: 0
  readonly operation: 'list' | 'select' | 'save' | 'rename' | 'delete'
  readonly entries: readonly PresetLibrarySummary[]
  readonly linkedLibraryId?: string
  readonly selected?: {
    readonly libraryId: string
    readonly name: string
    readonly preset: ImportedSillyTavernPreset
  }
}

/** Encode one private command result with a collision-resistant marker. */
export function encodePresetLibraryResult(result: PresetLibraryCommandResult): string {
  return `${PREFIX}${JSON.stringify(result)}`
}

/** Parse a marked library result, returning undefined for unrelated commands. */
export function parsePresetLibraryResult(text: string | undefined): PresetLibraryCommandResult | undefined {
  if (text === undefined || !text.startsWith(PREFIX)) return undefined
  let value: unknown
  try {
    value = JSON.parse(text.slice(PREFIX.length))
  } catch (error: unknown) {
    throw new Error('预设库命令结果不是有效 JSON', { cause: error })
  }
  const result = value as Partial<PresetLibraryCommandResult> | null
  if (result === null || typeof result !== 'object' || result.format !== 0
    || !['list', 'select', 'save', 'rename', 'delete'].includes(String(result.operation))
    || !Array.isArray(result.entries)
    || (result.linkedLibraryId !== undefined && typeof result.linkedLibraryId !== 'string')
    || (result.selected !== undefined && (typeof result.selected !== 'object' || result.selected === null
      || typeof result.selected.libraryId !== 'string' || typeof result.selected.name !== 'string'
      || typeof result.selected.preset !== 'object' || result.selected.preset === null))) {
    throw new Error('预设库命令结果包含无效字段')
  }
  return result as PresetLibraryCommandResult
}
