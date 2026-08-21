/** Durable session-local World Info management records. */

/** Editable safe subset of one normalized lorebook entry. */
export interface WorldInfoEditableEntry {
  readonly name?: string
  readonly comment?: string
  readonly keys: readonly string[]
  readonly secondaryKeys: readonly string[]
  readonly content: string
  readonly enabled: boolean
  readonly insertionOrder: number
  readonly selective: boolean
  readonly constant: boolean
  readonly caseSensitive: boolean
  readonly matchWholeWords: boolean
  readonly secondaryLogic: 'and-any' | 'and-all' | 'not-any' | 'not-all'
  readonly scanDepth?: number
  readonly position: 'before_char' | 'after_char'
  readonly priority?: number
  readonly ignoreBudget: boolean
}

/** One entry override addressed within an immutable imported book. */
export interface WorldInfoEntryOverride {
  readonly bookId: string
  readonly entryIndex: number
  readonly deleted: boolean
  readonly entry?: WorldInfoEditableEntry
}

/** Complete session-local World Info overlay snapshot. */
export interface WorldInfoConfigurationState {
  readonly format: 0
  readonly revision: number
  readonly overrides: readonly WorldInfoEntryOverride[]
  /** Aggregate cap across every active book; omitted records use the current default. */
  readonly tokenBudget?: number
}

/** Browser mutation accepted by the World Info manager. */
export type WorldInfoConfigurationRequest =
  | { readonly operation: 'toggle'; readonly revision: number; readonly bookId: string; readonly entryIndex: number; readonly enabled: boolean }
  | { readonly operation: 'set-book-enabled'; readonly revision: number; readonly bookId: string; readonly enabled: boolean }
  | { readonly operation: 'reset-book'; readonly revision: number; readonly bookId: string }
  | { readonly operation: 'edit'; readonly revision: number; readonly bookId: string; readonly entryIndex: number; readonly entry: WorldInfoEditableEntry }
  | { readonly operation: 'delete'; readonly revision: number; readonly bookId: string; readonly entryIndex: number; readonly deleted: boolean }
  | { readonly operation: 'reset-entry'; readonly revision: number; readonly bookId: string; readonly entryIndex: number }
  | { readonly operation: 'reset-all'; readonly revision: number }
  | { readonly operation: 'set-budget'; readonly revision: number; readonly tokenBudget: number }
