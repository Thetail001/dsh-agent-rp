/** Provider-neutral Agent tool guidance retained across workspace settings and model turns. */

/** Whether image tools must stay idle, may be chosen, or should be attempted each RP turn. */
export type AgentRpImageMode = 'never' | 'auto' | 'always'

/** One deployment-owned instruction for an installed MCP or other tool provider. */
export interface ToolGuidanceEntryConfig {
  readonly id: string
  readonly enabled: boolean
  readonly text: string
}

/** Normalized settings compatible with Thetail's public tool-guidance format. */
export interface ResolvedToolGuidanceConfig {
  readonly enabled: boolean
  readonly includeFramework: boolean
  readonly includeAgentRp: boolean
  readonly imageMode: AgentRpImageMode
  readonly custom: readonly ToolGuidanceEntryConfig[]
}

/** Neutral defaults expose the publication seam without assuming one image provider. */
export const DEFAULT_TOOL_GUIDANCE: ResolvedToolGuidanceConfig = {
  enabled: true,
  includeFramework: true,
  includeAgentRp: true,
  imageMode: 'auto',
  custom: [],
}

function requiredText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string' || value.length > max) throw new TypeError(`${field} is invalid`)
  const normalized = value.trim()
  if (normalized === '') throw new TypeError(`${field} must contain non-whitespace text`)
  return normalized
}

/** Validate persisted guidance while accepting settings written by Thetail's fork verbatim. */
export function normalizeToolGuidanceConfig(value: unknown): ResolvedToolGuidanceConfig {
  if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new TypeError('toolGuidance must be an object')
  }
  const source = value === undefined ? {} : value as Record<string, unknown>
  const bool = (field: 'enabled' | 'includeFramework' | 'includeAgentRp'): boolean => {
    const candidate = source[field]
    if (candidate === undefined) return DEFAULT_TOOL_GUIDANCE[field]
    if (typeof candidate !== 'boolean') throw new TypeError(`toolGuidance.${field} is invalid`)
    return candidate
  }
  const imageMode = source.imageMode ?? DEFAULT_TOOL_GUIDANCE.imageMode
  if (imageMode !== 'never' && imageMode !== 'auto' && imageMode !== 'always') {
    throw new TypeError('toolGuidance.imageMode is invalid')
  }
  const customSource = source.custom ?? DEFAULT_TOOL_GUIDANCE.custom
  if (!Array.isArray(customSource) || customSource.length > 32) {
    throw new TypeError('toolGuidance.custom is invalid')
  }
  const custom = customSource.map((value, index): ToolGuidanceEntryConfig => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`toolGuidance.custom[${index}] is invalid`)
    }
    const entry = value as Record<string, unknown>
    if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
      throw new TypeError(`toolGuidance.custom[${index}].enabled is invalid`)
    }
    return {
      id: requiredText(entry.id, 80, `toolGuidance.custom[${index}].id`),
      enabled: entry.enabled ?? true,
      text: requiredText(entry.text, 12_000, `toolGuidance.custom[${index}].text`),
    }
  })
  if (new Set(custom.map(entry => entry.id)).size !== custom.length) {
    throw new TypeError('toolGuidance custom entry ids must be unique')
  }
  return {
    enabled: bool('enabled'),
    includeFramework: bool('includeFramework'),
    includeAgentRp: bool('includeAgentRp'),
    imageMode,
    custom,
  }
}
