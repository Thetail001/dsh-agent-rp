/** Neutral, lossless Character Card import vocabulary. */

import type { JsonValue } from '@deepseek-ai/dsh-session'

/** Character Card generation selected at the import boundary. */
export type CharacterCardVersion = 1 | 2 | 3

/** One feature preserved from a card but deliberately not executed. */
export const CHARACTER_IMPORT_DEGRADATIONS = [
  'character-assets',
  'future-card-version',
  'group-greetings',
  'lorebook-decorators',
  'lorebook-regex',
  'lorebook-recursion',
  'remote-assets',
] as const

/** One feature preserved from a card but deliberately not executed. */
export type CharacterImportDegradation = typeof CHARACTER_IMPORT_DEGRADATIONS[number]

/** Supported runtime behavior of one lorebook entry. */
export interface ImportedLorebookEntry {
  readonly keys: readonly string[]
  readonly secondaryKeys: readonly string[]
  readonly content: string
  readonly enabled: boolean
  readonly insertionOrder: number
  readonly selective: boolean
  readonly constant: boolean
  readonly caseSensitive: boolean
  readonly position: 'before_char' | 'after_char'
  readonly priority?: number
  /** V3 regex entries remain exportable but never activate. */
  readonly useRegex: boolean
  /** Decorated content remains exportable but never activates. */
  readonly hasDecorators: boolean
}

/** Character-specific lorebook normalized for deterministic activation. */
export interface ImportedLorebook {
  readonly name?: string
  readonly scanDepth?: number
  readonly tokenBudget?: number
  readonly recursiveScanning: boolean
  readonly entries: readonly ImportedLorebookEntry[]
}

/** Canonical imported card persisted with the native tool result. */
export interface ImportedCharacterCard {
  readonly format: 0
  readonly version: CharacterCardVersion
  readonly specVersion: string
  readonly name: string
  readonly nickname?: string
  readonly description: string
  readonly personality: string
  readonly scenario: string
  readonly firstMessage: string
  readonly messageExample: string
  readonly alternateGreetings: readonly string[]
  readonly systemPrompt: string
  readonly postHistoryInstructions: string
  readonly lorebook?: ImportedLorebook
  readonly degradations: readonly CharacterImportDegradation[]
  /** Exact parsed JSON, including unknown fields and extension namespaces. */
  readonly raw: JsonValue
}

/** Result of decoding one PNG transport before card validation. */
export interface CharacterCardPngPayload {
  readonly keyword: 'ccv3' | 'chara'
  readonly json: string
}
