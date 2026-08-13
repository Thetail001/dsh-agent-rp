/** Workspace preferences for new Agent RP entry points. */

/** Same-origin Host route for Agent RP workspace preferences. */
export const AGENT_RP_WORKSPACE_SETTINGS_PATH = '/api/agent-rp/settings'

/** Field selecting whether every workspace or an allowlist shows RP entry points. */
export const AGENT_RP_WORKSPACE_MODE_FIELD = 'workspaceMode'

/** Field containing workspace ids enabled in selected-workspace mode. */
export const AGENT_RP_WORKSPACE_IDS_FIELD = 'workspaceIds'

/** Supported workspace visibility modes. */
export const AGENT_RP_WORKSPACE_MODES = ['all', 'selected'] as const

/** Workspace visibility mode for new Agent RP entry points. */
export type AgentRpWorkspaceMode = typeof AGENT_RP_WORKSPACE_MODES[number]

/** Persisted Agent RP settings. */
export interface AgentRpSettings {
  /** Whether entry points appear everywhere or only in selected workspaces. */
  readonly workspaceMode: AgentRpWorkspaceMode
  /** Stable DSH workspace ids enabled by selected-workspace mode. */
  readonly workspaceIds: string[]
}

/** Default settings preserve the existing all-workspace behavior. */
export const DEFAULT_AGENT_RP_SETTINGS: AgentRpSettings = {
  workspaceMode: 'all',
  workspaceIds: [],
}

/**
 * Validate one persisted or wire settings value.
 * @param value - untrusted JSON value.
 * @returns normalized settings with duplicate ids removed.
 */
export function normalizeAgentRpSettings(value: unknown): AgentRpSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agent RP 设置不是对象')
  }
  const record = value as Record<string, unknown>
  const workspaceMode = record.workspaceMode
  const workspaceIds = record.workspaceIds
  if ((workspaceMode !== 'all' && workspaceMode !== 'selected') || !Array.isArray(workspaceIds)
    || workspaceIds.length > 1_000 || workspaceIds.some(id => typeof id !== 'string'
      || id.trim() !== id || id === '' || id.length > 256)) {
    throw new Error('Agent RP 工作区设置字段无效')
  }
  return { workspaceMode, workspaceIds: [...new Set(workspaceIds as string[])] }
}

/**
 * Decide whether a workspace may show a new Agent RP entry point.
 * @param settings - resolved Host settings, or undefined before they are available.
 * @param workspaceId - workspace owning the current Session, when registered.
 * @returns whether the entry point should be visible.
 */
export function allowsAgentRpEntry(
  settings: AgentRpSettings | undefined,
  workspaceId: string | undefined,
): boolean {
  const resolved = settings ?? DEFAULT_AGENT_RP_SETTINGS
  return resolved.workspaceMode === 'all'
    || (workspaceId !== undefined && resolved.workspaceIds.includes(workspaceId))
}
