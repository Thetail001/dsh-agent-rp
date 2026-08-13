/** Browser-safe values shared by the local Persona library and Roleplay UI. */

/** Same-origin endpoint served by the Agent RP Host plugin. */
export const PERSONA_LIBRARY_PATH = '/api/agent-rp/personas'

/** Reusable player identity stored outside Character Cards and Sessions. */
export interface PersonaLibraryEntry {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly updatedAt: number
}

/** Fields accepted when creating or editing one reusable Persona. */
export interface PersonaLibrarySaveRequest {
  readonly format: 0
  readonly id?: string
  readonly name: string
  readonly description: string
}

/** Immutable Persona snapshot selected for one new Roleplay Session. */
export interface SessionPersonaSnapshot {
  readonly id: string
  readonly name: string
  readonly description: string
}
