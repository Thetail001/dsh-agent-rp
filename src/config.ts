/** Configurable identity and scene for one persistent Agent RP character. */

import z from '@deepseek-ai/schemastery'

/** Runtime placement of one bundle row. */
export type AgentRpMode = 'host' | 'character'

/** Default original character used by the local preview profile. */
export const DEFAULT_CHARACTER_NAME = '岚'
/** Default character traits; deployments may replace this text without changing the runtime. */
export const DEFAULT_PERSONA = '二十七岁，经营一家傍晚开门的旧书修复铺。观察敏锐，话不多，熟悉之后会显出一点促狭；不卖弄知识，也不急着把每句话说成结论。'
/** Default opening situation for a fresh conversation. */
export const DEFAULT_SCENARIO = '一个下雨的傍晚，用户在修复铺打烊前走了进来。你们见过几次，还没有熟到无话不谈。'
/** Default relationship state before durable conversation memories accumulate. */
export const DEFAULT_RELATIONSHIP = '你对用户有克制的熟悉感，愿意认真听对方说话；关系怎样变化，由后续对话决定。'

/** Deployment-owned Agent RP character configuration. */
export interface Config {
  /** Host installs the bundled preset; character contributes its scoped runtime. */
  mode?: AgentRpMode
  /** Name the Agent uses as its own identity. */
  characterName?: string
  /** Stable identity, temperament, knowledge, and behavioral boundaries. */
  persona?: string
  /** Situation in which a fresh Session begins. */
  scenario?: string
  /** Initial relationship before Session-owned memories modify it. */
  relationship?: string
}

/** Loader schema for the Agent RP character configuration. */
export const Config: z<Config> = z.object({
  mode: z.union(['host', 'character']).default('character'),
  characterName: z.string().min(1).max(80).default(DEFAULT_CHARACTER_NAME),
  persona: z.string().min(1).max(4_000).default(DEFAULT_PERSONA),
  scenario: z.string().min(1).max(4_000).default(DEFAULT_SCENARIO),
  relationship: z.string().min(1).max(2_000).default(DEFAULT_RELATIONSHIP),
})

/** Fully materialized, normalized Agent RP configuration. */
export interface ResolvedConfig {
  readonly mode: AgentRpMode
  readonly characterName: string
  readonly persona: string
  readonly scenario: string
  readonly relationship: string
}

function requiredText(value: string | undefined, fallback: string, field: string): string {
  const normalized = (value ?? fallback).trim()
  if (normalized.length === 0) throw new TypeError(`${field} must contain non-whitespace text`)
  return normalized
}

/**
 * Normalize configuration even when the plugin is mounted without Loader validation.
 * @param config - loader-provided or direct plugin configuration.
 * @returns complete character configuration.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  return {
    mode: config.mode ?? 'character',
    characterName: requiredText(config.characterName, DEFAULT_CHARACTER_NAME, 'characterName'),
    persona: requiredText(config.persona, DEFAULT_PERSONA, 'persona'),
    scenario: requiredText(config.scenario, DEFAULT_SCENARIO, 'scenario'),
    relationship: requiredText(config.relationship, DEFAULT_RELATIONSHIP, 'relationship'),
  }
}
