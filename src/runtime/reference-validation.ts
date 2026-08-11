/** Shared reference validation for live proposals and durable replay. @module @deepseek-ai/dsh-roleplay/reference-validation */

import { RoleplayError } from './error.ts'
import type { RoleplayErrorCode } from './types.ts'

/**
 * Reject references that are unauthorized or repeated within one payload.
 * @param values - opaque ids supplied by the payload.
 * @param allowed - ids visible at the validating boundary.
 * @param label - diagnostic subject for one id.
 * @param code - boundary-specific stable error code.
 */
export function assertVisibleReferences(
  values: readonly string[],
  allowed: ReadonlySet<string>,
  label: string,
  code: RoleplayErrorCode,
): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new RoleplayError(`${label} ${JSON.stringify(value)} is not visible`, code)
    }
    if (seen.has(value)) {
      throw new RoleplayError(`${label} ${JSON.stringify(value)} is duplicated`, code)
    }
    seen.add(value)
  }
}
