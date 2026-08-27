/** Public records for editable Agent RP story workspaces. */

/** Same-origin collection endpoint for local story workspaces. */
export const STORY_WORKSPACES_PATH = '/api/agent-rp/story-workspaces'

/** Editable role assigned to one ordered prose section. */
export type StorySectionKind = 'prose' | 'character' | 'history'

/** Provenance assigned to one local research source. */
export type StorySourceKind = 'original' | 'reference' | 'research' | 'web'

/** One character whose private context is compiled independently. */
export interface StoryWorkspaceCharacter {
  readonly id: string
  readonly name: string
  readonly enabled: boolean
}

/** One ordered output or reference section. */
export interface StoryWorkspaceSection {
  readonly id: string
  readonly name: string
  readonly kind: StorySectionKind
  readonly enabled: boolean
}

/** One local source available to research and director Workers. */
export interface StoryWorkspaceSource {
  readonly id: string
  readonly name: string
  readonly kind: StorySourceKind
  readonly enabled: boolean
}

/** Structure and optimistic-concurrency revision for one story workspace. */
export interface StoryWorkspaceManifest {
  readonly format: 0
  readonly id: string
  readonly name: string
  readonly revision: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly characters: readonly StoryWorkspaceCharacter[]
  readonly sections: readonly StoryWorkspaceSection[]
  readonly sources: readonly StoryWorkspaceSource[]
}

/** Editable Markdown owned by one character. */
export interface StoryCharacterDocuments {
  readonly id: string
  readonly persona: string
  readonly knowledge: string
}

/** Editable Markdown owned by one ordered section. */
export interface StorySectionDocument {
  readonly id: string
  readonly content: string
}

/** Editable Markdown owned by one research source. */
export interface StorySourceDocument {
  readonly id: string
  readonly content: string
}

/** Complete user-editable content of one story workspace. */
export interface StoryWorkspaceDocuments {
  readonly outline: string
  readonly foreshadowing: string
  readonly proposals: string
  readonly history: string
  readonly characters: readonly StoryCharacterDocuments[]
  readonly sections: readonly StorySectionDocument[]
  readonly sources: readonly StorySourceDocument[]
}

/** One completed visible turn materialized into editable story documents. */
export interface StoryTurnMaterialization {
  readonly key: string
  readonly heading: string
  readonly history: string
  readonly observations: readonly {
    readonly characterId: string
    readonly text: string
  }[]
  readonly proposals: string
}

/** Coherent workspace value returned by local storage and HTTP reads. */
export interface StoryWorkspaceSnapshot {
  readonly manifest: StoryWorkspaceManifest
  readonly documents: StoryWorkspaceDocuments
}

/** Lightweight workspace list item. */
export interface StoryWorkspaceSummary {
  readonly id: string
  readonly name: string
  readonly revision: number
  readonly updatedAt: number
  readonly characterCount: number
}

/** Request to create an empty story workspace. */
export interface StoryWorkspaceCreateRequest {
  readonly format: 0
  readonly name: string
}

/** Whole-workspace edit guarded by the last observed revision. */
export interface StoryWorkspaceSaveRequest {
  readonly format: 0
  readonly id: string
  readonly revision: number
  readonly name: string
  readonly characters: readonly StoryWorkspaceCharacter[]
  readonly sections: readonly StoryWorkspaceSection[]
  readonly sources: readonly StoryWorkspaceSource[]
  readonly documents: StoryWorkspaceDocuments
}
