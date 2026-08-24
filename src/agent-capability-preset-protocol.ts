/** Browser-safe discovery contract for DSH Agent presets that retain Agent RP. */

/** Same-origin list of Agent capability compositions usable by new RP Sessions. */
export const AGENT_RP_CAPABILITY_PRESETS_PATH = '/api/agent-rp/agent-capability-presets'

/** Stable id convention for user-authored derivatives of the managed preset. */
export function isAgentRpCapabilityPresetId(value: unknown): value is string {
  return typeof value === 'string' && /^agent-rp(?:-[a-z0-9][a-z0-9-]*)?$/u.test(value)
}

/** One DSH Agent preset whose composition includes the Agent RP character runtime. */
export interface AgentRpCapabilityPresetSummary {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly trust: 'system' | 'user'
  readonly managed: boolean
}

export interface AgentRpCapabilityPresetListResponse {
  readonly format: 0
  readonly entries: readonly AgentRpCapabilityPresetSummary[]
}
