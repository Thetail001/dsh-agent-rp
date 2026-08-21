/** File-backed preferences for Agent RP entry points. */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  DEFAULT_AGENT_RP_SETTINGS,
  normalizeAgentRpSettings,
  type AgentRpSettings,
} from './workspace-settings.ts'

/** Filesystem override used by focused checks and portable deployments. */
export interface WorkspaceSettingsStoreOptions {
  readonly path?: string
}

/** Small atomic settings file owned by the plugin. */
export class WorkspaceSettingsStore {
  readonly path: string

  constructor(options: WorkspaceSettingsStoreOptions = {}) {
    this.path = resolve(options.path ?? dshHomePath('agent-rp', 'settings.json'))
  }

  /** Read current settings, using the all-workspace default before the first write. */
  get(): AgentRpSettings {
    if (!existsSync(this.path)) return {
      ...DEFAULT_AGENT_RP_SETTINGS,
      workspaceIds: [],
      workspaceExcludedIds: [],
    }
    try {
      return normalizeAgentRpSettings(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取 Agent RP 设置 ${JSON.stringify(this.path)}`, { cause: error })
    }
  }

  /** Validate and atomically replace current settings. */
  set(input: unknown): AgentRpSettings {
    const settings = normalizeAgentRpSettings(input)
    const parent = dirname(this.path)
    mkdirSync(parent, { recursive: true, mode: 0o700 })
    const staging = `${this.path}.${process.pid}.${randomUUID()}.tmp`
    try {
      writeFileSync(staging, `${JSON.stringify({ format: 0, ...settings }, null, 2)}\n`, {
        encoding: 'utf8', mode: 0o600,
      })
      renameSync(staging, this.path)
    } finally {
      rmSync(staging, { force: true })
    }
    return settings
  }
}
