/** Content-free failure counts for the native World Info evaluator. */

import type { LorebookActivationReason } from './import/lorebook.ts'

/** Failure categories that indicate an entry could not complete normal World Info evaluation. */
export interface WorldEngineFailureCounts {
  readonly regexRuntimeUnavailable: number
  readonly regexInvalid: number
  readonly regexExecutionLimit: number
  readonly regexResourceLimit: number
  readonly decoratorUnsupported: number
  readonly templateUnsupported: number
  readonly templateError: number
}

/** Count evaluation failures without retaining entry names, keys, content, expressions, or error details. */
export function summarizeWorldEngineFailures(
  reasons: readonly LorebookActivationReason[],
): WorldEngineFailureCounts {
  const counts = {
    regexRuntimeUnavailable: 0,
    regexInvalid: 0,
    regexExecutionLimit: 0,
    regexResourceLimit: 0,
    decoratorUnsupported: 0,
    templateUnsupported: 0,
    templateError: 0,
  }
  for (const reason of reasons) {
    switch (reason) {
      case 'regex-runtime-unavailable': counts.regexRuntimeUnavailable += 1; break
      case 'regex-invalid': counts.regexInvalid += 1; break
      case 'regex-execution-limit': counts.regexExecutionLimit += 1; break
      case 'regex-resource-limit': counts.regexResourceLimit += 1; break
      case 'decorator-unsupported': counts.decoratorUnsupported += 1; break
      case 'template-unsupported': counts.templateUnsupported += 1; break
      case 'template-error': counts.templateError += 1; break
    }
  }
  return counts
}

/** Return the aggregate failure count from a content-free summary. */
export function worldEngineFailureTotal(counts: WorldEngineFailureCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}
