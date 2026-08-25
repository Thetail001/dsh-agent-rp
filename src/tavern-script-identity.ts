/** Stable Host-owned identities for Tavern Helper scripts. */

/** Script-tree namespace that owns one Tavern Helper script. */
export type TavernScriptScope = 'global' | 'preset' | 'character'

/** Build a collision-free Host key while preserving the script-authored id inside the iframe API. */
export function tavernScriptIdentity(scope: TavernScriptScope, scriptId: string): string {
  return JSON.stringify([scope, scriptId])
}

/** Parse a current Host key without accepting legacy unscoped ids. */
export function parseTavernScriptIdentity(value: string): {
  readonly scope: TavernScriptScope
  readonly scriptId: string
} | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed) || parsed.length !== 2
    || (parsed[0] !== 'global' && parsed[0] !== 'preset' && parsed[0] !== 'character')
    || typeof parsed[1] !== 'string' || parsed[1] === '') return undefined
  return { scope: parsed[0], scriptId: parsed[1] }
}

/** Build the Host-owned persistent-storage identity for one script installation. */
export function tavernScriptStorageIdentity(
  characterId: string,
  presetId: string | undefined,
  scope: TavernScriptScope,
  scriptId: string,
): string {
  return JSON.stringify([0, characterId, presetId ?? null, scope, scriptId])
}

/** Parse a current persistent-storage identity without accepting script-authored namespaces. */
export function parseTavernScriptStorageIdentity(value: string): {
  readonly characterId: string
  readonly presetId?: string
  readonly scope: TavernScriptScope
  readonly scriptId: string
} | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed) || parsed.length !== 5 || parsed[0] !== 0
    || typeof parsed[1] !== 'string' || parsed[1] === ''
    || (parsed[2] !== null && (typeof parsed[2] !== 'string' || parsed[2] === ''))
    || (parsed[3] !== 'global' && parsed[3] !== 'preset' && parsed[3] !== 'character')
    || typeof parsed[4] !== 'string' || parsed[4] === '') return undefined
  return {
    characterId: parsed[1],
    ...(parsed[2] === null ? {} : { presetId: parsed[2] }),
    scope: parsed[3],
    scriptId: parsed[4],
  }
}

/** Build the Host-owned identity for extension settings shared by one installed script tree. */
export function tavernExtensionSettingsIdentity(
  characterId: string,
  presetId: string | undefined,
  scope: TavernScriptScope,
): string {
  return JSON.stringify([0, characterId, presetId ?? null, scope])
}

/** Parse a current extension-settings identity without accepting script-authored identifiers. */
export function parseTavernExtensionSettingsIdentity(value: string): {
  readonly characterId: string
  readonly presetId?: string
  readonly scope: TavernScriptScope
} | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed) || parsed.length !== 4 || parsed[0] !== 0
    || typeof parsed[1] !== 'string' || parsed[1] === ''
    || (parsed[2] !== null && (typeof parsed[2] !== 'string' || parsed[2] === ''))
    || (parsed[3] !== 'global' && parsed[3] !== 'preset' && parsed[3] !== 'character')) return undefined
  return {
    characterId: parsed[1],
    ...(parsed[2] === null ? {} : { presetId: parsed[2] }),
    scope: parsed[3],
  }
}

/** Build the Host-owned settings identity shared by browser-installed ST extensions. */
export function installedStExtensionSettingsIdentity(): string {
  return JSON.stringify([1, 'installed-st-extensions'])
}

/** Parse only the current browser-installed ST extension settings identity. */
export function parseInstalledStExtensionSettingsIdentity(value: string): { readonly kind: 'installed' } | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed) || parsed.length !== 2
    || parsed[0] !== 1 || parsed[1] !== 'installed-st-extensions') return undefined
  return { kind: 'installed' }
}
