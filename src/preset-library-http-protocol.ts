/** Browser-safe values for model-free preset library access. */

import type { TavernHelperLibrarySummary } from './import/types.ts'

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const PRESET_LIBRARY_PATH = '/api/agent-rp/presets'

/** Compact reusable preset shown before a roleplay Session exists. */
export interface PresetLibrarySummary {
  readonly id: string
  readonly name: string
  readonly promptCount: number
  readonly enabledCount: number
  readonly regexScriptCount: number
  readonly tavernHelper?: TavernHelperLibrarySummary
  readonly updatedAt: number
}

/** Reusable presets available to a new roleplay Session. */
export interface PresetLibraryListResponse {
  readonly format: 0
  readonly entries: readonly PresetLibrarySummary[]
}

/** Minimum result needed to activate a newly imported library preset. */
export interface PresetLibraryImportResponse {
  readonly format: 0
  readonly entry: { readonly id: string }
}

/** Disambiguate same-name presets without exposing prompt or script contents. */
export function presetLibraryOptionLabel(
  entry: PresetLibrarySummary,
  entries: readonly PresetLibrarySummary[],
): string {
  if (entries.filter(candidate => candidate.name === entry.name).length < 2) return entry.name
  const helper = entry.tavernHelper
  const missing = helper?.expectedScriptCount === undefined
    ? 0 : Math.max(0, helper.expectedScriptCount - helper.scriptCount)
  const state = missing > 0 ? `旧导入，缺 ${missing} 个 TH 脚本`
    : helper !== undefined && helper.scriptCount > 0
      ? `TH ${helper.enabledScriptCount}/${helper.scriptCount}` : '无 TH 脚本'
  const imported = new Date(entry.updatedAt).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return `${entry.name} · ${state} · ${imported}`
}
