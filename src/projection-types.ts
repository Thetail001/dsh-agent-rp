/** Browser-safe Roleplay state computed from durable Session events. */

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
  readonly source: 'character-card' | 'sillytavern-chat' | 'preset'
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Current character identity and migration summary for one Roleplay Session. */
    agentRp: AgentRpProjection
  }
}
