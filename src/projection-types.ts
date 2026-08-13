/** Browser-safe Roleplay state computed from durable Session events. */

import type { ImportedCharacterFrontend } from './import/types.ts'
import type { ImportedRegexScript } from './import/types.ts'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import type { SessionPersonaSnapshot } from './persona-library-protocol.ts'

/** Current character identity and migration summary for one Roleplay Session. */
export interface AgentRpProjection {
  /** Character name used by the prompt and card macros. */
  readonly characterName: string
  /** Lossless card title when the card supplies a shorter runtime nickname. */
  readonly originalCharacterName?: string
  readonly description: string
  readonly personality: string
  readonly scenario: string
  readonly userName?: string
  readonly persona?: SessionPersonaSnapshot
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
  /** Persistent alternatives for Roleplay replies that have been regenerated or continued. */
  readonly generations: readonly {
    readonly groupId: string
    readonly anchorSeq: number
    readonly selectedVersionSeq: number
    readonly assistantSeqs: readonly number[]
    readonly versions: readonly {
      readonly seq: number
      readonly text: string
    }[]
  }[]
  /** Stable transcript anchor of the model-visible final Roleplay reply. */
  readonly currentReplySeq?: number
  readonly preset?: {
    readonly libraryId?: string
    readonly name: string
    readonly promptCount: number
    readonly enabledCount: number
    readonly revision: number
    readonly prompts: readonly {
      readonly identifier: string
      readonly name: string
      readonly importedName: string
      readonly role: 'system' | 'user' | 'assistant'
      readonly importedRole: 'system' | 'user' | 'assistant'
      readonly content: string
      readonly importedContent: string
      readonly imported: boolean
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
      readonly importedInjectionPosition?: number
      readonly importedInjectionDepth?: number
      readonly importedInjectionOrder?: number
      readonly attached: boolean
      readonly enabled: boolean
      readonly toggleable: boolean
      readonly editable: boolean
      readonly deletable: boolean
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
    readonly preservedInChatCount: number
    readonly regexScriptCount: number
    readonly enabledRegexScriptCount: number
    readonly activeDisplayRegexCount: number
    readonly preservedPromptRegexCount: number
    readonly regexScripts: readonly (ImportedRegexScript & { readonly index: number })[]
    readonly appliedGeneration: readonly string[]
    readonly preservedGeneration: readonly string[]
    readonly omittedExtensions: readonly string[]
    readonly extensionStatus: readonly {
      readonly name: string
      readonly detail: string
      readonly state: 'active' | 'inactive' | 'unsupported'
    }[]
  }
  readonly presetLibrary: readonly {
    readonly id: string
    readonly name: string
    readonly promptCount: number
    readonly enabledCount: number
    readonly regexScriptCount: number
    readonly updatedAt: number
  }[]
  /** Last Host-recorded request header, used only by the local compatibility inspector. */
  readonly lastRequest?: {
    readonly eventSeq: number
    readonly time: number
    readonly presetName?: string
    readonly presetRevision?: number
    readonly system: string
    readonly config: {
      readonly provider: string
      readonly model: string
      readonly reasoningEffort?: string
      readonly temperature?: number
      readonly maxTokens?: number
      readonly stop?: readonly string[]
    }
    readonly toolNames: readonly string[]
  }
  readonly source: 'character-card' | 'sillytavern-chat' | 'preset'
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Current character identity and migration summary for one Roleplay Session. */
    agentRp: AgentRpProjection
  }
}
