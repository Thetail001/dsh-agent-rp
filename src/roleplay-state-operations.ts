/** Shared validation for semantic Roleplay state operations. */

import { parseMvuStateOperation, type MvuStateOperation } from './mvu.ts'

export function parseRoleplayStateOperations(
  value: unknown,
  options: { readonly allowEmpty?: boolean } = {},
): readonly MvuStateOperation[] {
  const minimum = options.allowEmpty === true ? 0 : 1
  if (!Array.isArray(value) || value.length < minimum || value.length > 64) {
    throw new Error(`Roleplay state action requires between ${String(minimum)} and 64 operations`)
  }
  return value.map((operation) => {
    if (typeof operation !== 'object' || operation === null || Array.isArray(operation)
      || Object.keys(operation).some(key => !['op', 'path', 'from', 'to', 'value'].includes(key))) {
      throw new Error('Roleplay state action operation fields are invalid')
    }
    return parseMvuStateOperation(operation)
  })
}
