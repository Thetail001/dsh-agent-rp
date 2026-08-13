/** Browser-safe Roleplay state computed from durable Session events. */

import type { ImportedCharacterFrontend } from './import/types.ts'
import type { ImportedRegexScript } from './import/types.ts'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'

/** Current character identity and migration summary for one Roleplay Session. */
export interface AgentRpProjection {
  readonly characterName: string
  readonly description: string
  readonly personality: string
  readonly scenario: string
  readonly userName?: string
  readonly cardVersion?: 1 | 2 | 3
  readonly avatarAttachmentId?: string
  readonly importedMessageCount: number
  readonly worldInfoCount: number
  readonly frontend?: ImportedCharacterFrontend
  readonly mvu?: {
    readonly statData: JsonValue
    readonly updateCount: number
    readonly lastError?: string
  }
  readonly preset?: {
    readonly name: string
    readonly promptCount: number
    readonly enabledCount: number
    readonly revision: number
    readonly prompts: readonly {
      readonly identifier: string
      readonly name: string
      readonly role: 'system' | 'user' | 'assistant'
      readonly content: string
      readonly importedContent: string
      readonly contentModified: boolean
      readonly importedAttached: boolean
      readonly importedEnabled: boolean
      readonly importedPosition?: number
      readonly marker: boolean
      readonly systemPrompt: boolean
      readonly forbidOverrides: boolean
      readonly injectionPosition?: number
      readonly injectionDepth?: number
      readonly injectionOrder?: number
      readonly attached: boolean
      readonly enabled: boolean
      readonly toggleable: boolean
      readonly editable: boolean
    }[]
    readonly generation: {
      readonly temperature?: number
      readonly maxTokens?: number
      readonly reasoningEffort?: string
      readonly topP?: number
      readonly topK?: number
      readonly topA?: number
      readonly minP?: number
      readonly frequencyPenalty?: number
      readonly presencePenalty?: number
      readonly repetitionPenalty?: number
    }
    readonly formats: {
      readonly worldInfo: string
      readonly scenario: string
      readonly personality: string
    }
    readonly degradedRoleCount: number
    readonly regexScriptCount: number
    readonly regexScripts: readonly (ImportedRegexScript & { readonly index: number })[]
    readonly appliedGeneration: readonly string[]
    readonly preservedGeneration: readonly string[]
    readonly omittedExtensions: readonly string[]
  }
  readonly source: 'character-card' | 'sillytavern-chat' | 'preset'
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Current character identity and migration summary for one Roleplay Session. */
    agentRp: AgentRpProjection
  }
}
