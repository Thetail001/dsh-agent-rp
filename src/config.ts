/** Loader-owned decision budgets for the portable Roleplay benchmark. */

import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_PUBLIC_DISCUSSION_ATTEMPT_LIMIT,
  DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS,
} from './werewolf/werewolf-constants.ts'

/** Default output-token cap for constrained Character decisions. */
export const STRUCTURED_DECISION_MAX_TOKENS = 2_048
/** Default output-token cap for public table speech. */
export const PUBLIC_DISCUSSION_MAX_TOKENS = 2_048
/** Default adapter-owned effort for constrained Character decisions. */
export const DEFAULT_DECISION_REASONING_EFFORT = 'off'
/** Default adapter-owned effort for public table speech. */
export const DEFAULT_DISCUSSION_REASONING_EFFORT = 'high'

type DeepSeekReasoningEffort = 'off' | 'high' | 'max'

/** Runtime budgets for the portable Roleplay benchmark. */
export interface Config {
  /** Full wall-clock window for one asynchronous decision wave. */
  decisionTimeoutMs?: number
  /** Output-token cap for constrained choices such as targets and ballots. */
  decisionMaxTokens?: number
  /** Adapter-owned effort for constrained choices. */
  decisionReasoningEffort?: DeepSeekReasoningEffort
  /** Output-token cap for public table speech. */
  discussionMaxTokens?: number
  /** Adapter-owned effort for public table speech. */
  discussionReasoningEffort?: DeepSeekReasoningEffort
  /** Maximum model attempts before one invalid public turn falls back to passing. */
  discussionAttemptLimit?: number
}

/** Loader schema for portable Roleplay decision budgets. */
export const Config: z<Config> = z.object({
  decisionTimeoutMs: z.number().step(1).min(1).max(2_147_483_647)
    .default(DEFAULT_STANDARD_WEREWOLF_DECISION_TIMEOUT_MS),
  decisionMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
    .default(STRUCTURED_DECISION_MAX_TOKENS),
  decisionReasoningEffort: z.union(['off', 'high', 'max'])
    .default(DEFAULT_DECISION_REASONING_EFFORT),
  discussionMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
    .default(PUBLIC_DISCUSSION_MAX_TOKENS),
  discussionReasoningEffort: z.union(['off', 'high', 'max'])
    .default(DEFAULT_DISCUSSION_REASONING_EFFORT),
  discussionAttemptLimit: z.number().step(1).min(1).max(5)
    .default(DEFAULT_PUBLIC_DISCUSSION_ATTEMPT_LIMIT),
})
