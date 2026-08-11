/** Stable roleplay errors shared by replay, setup, and the model-facing tool. */

import { HarnessError } from '@deepseek-ai/dsh-llm'
import type { RoleplayErrorCode } from './types.ts'

/** A machine-routable roleplay contract failure. */
export class RoleplayError extends HarnessError {
  constructor(message: string, code: RoleplayErrorCode, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'RoleplayError'
  }
}
