/** Pure request and result adapter for deterministic World Info engines. */

import {
  inspectLorebooks,
  type InspectedLorebookCollection,
  type LorebookActivationOptions,
  type LorebookActivationReason,
  type LorebookCollectionItem,
} from './import/lorebook.ts'
import {
  NATIVE_WORLD_ENGINE_MANIFEST,
  resolveAgentRpCapabilityPlan,
  summarizeAgentRpCapabilityPlan,
} from './extension-capability.ts'

/** Native engine dependencies captured outside the immutable evaluation request. */
export type NativeWorldEngineOptions = Omit<LorebookActivationOptions, 'worldInfoBookId'>

/** Immutable input required for one World Info evaluation pass. */
export interface WorldEngineRequest {
  readonly format: 0
  readonly books: readonly LorebookCollectionItem[]
  readonly messages: readonly string[]
  readonly tokenBudget?: number
}

/** Complete replayable output from one World Info engine pass. */
export interface WorldEngineResult extends InspectedLorebookCollection {
  readonly format: 0
  readonly engine: 'native-v0'
}

/** One deterministic World Info implementation. */
export interface WorldEngine {
  readonly manifest: typeof NATIVE_WORLD_ENGINE_MANIFEST
  evaluate(request: WorldEngineRequest): WorldEngineResult
}

/** Content-free counts suitable for local acceptance reports. */
export interface WorldEngineDiagnostics {
  readonly engine: WorldEngineResult['engine']
  readonly books: number
  readonly entries: number
  readonly activeEntries: number
  readonly promptContributions: number
  readonly approximateTokens: number
  readonly tokenBudget?: number
  readonly reasons: Partial<Record<LorebookActivationReason, number>>
  readonly templateOutcomes: Readonly<Record<string, number>>
}

const nativeCapabilityPlan = resolveAgentRpCapabilityPlan(NATIVE_WORLD_ENGINE_MANIFEST)
const nativeCapabilitySummary = summarizeAgentRpCapabilityPlan(nativeCapabilityPlan)

/** Create the built-in engine with bounded regex and template services captured by its Host adapter. */
export function createNativeWorldEngine(options: NativeWorldEngineOptions = {}): WorldEngine {
  if (nativeCapabilitySummary.requiredUnavailable !== 0) {
    throw new Error('native World Info engine capabilities are unavailable')
  }
  return {
    manifest: NATIVE_WORLD_ENGINE_MANIFEST,
    evaluate(request) {
      return {
        format: 0,
        engine: 'native-v0',
        ...inspectLorebooks(request.books, request.messages, {
          ...options,
          ...(request.tokenBudget === undefined ? {} : { tokenBudget: request.tokenBudget }),
        }),
      }
    },
  }
}

/** Reduce a private engine result to stable counts without source ids, keys, messages, or prompt text. */
export function summarizeWorldEngineResult(result: WorldEngineResult): WorldEngineDiagnostics {
  const reasons: Partial<Record<LorebookActivationReason, number>> = {}
  const templateOutcomes: Record<string, number> = {}
  let entries = 0
  let activeEntries = 0
  for (const book of result.books) {
    for (const entry of book.inspected.entries) {
      entries += 1
      if (entry.active) activeEntries += 1
      reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1
      if (entry.template !== undefined) {
        templateOutcomes[entry.template] = (templateOutcomes[entry.template] ?? 0) + 1
      }
    }
  }
  return {
    engine: result.engine,
    books: result.books.length,
    entries,
    activeEntries,
    promptContributions: result.beforeCharacter.length + result.afterCharacter.length,
    approximateTokens: result.approximateTokens,
    ...(result.tokenBudget === undefined ? {} : { tokenBudget: result.tokenBudget }),
    reasons,
    templateOutcomes,
  }
}

export { NATIVE_WORLD_ENGINE_MANIFEST } from './extension-capability.ts'
