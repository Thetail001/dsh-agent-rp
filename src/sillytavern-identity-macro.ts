/** Stable SillyTavern identity macro substitution shared by Host and browser views. */

import type { JsonValue } from '@deepseek-ai/dsh-session/types'

/** Character and player names available to identity macros. */
export interface SillyTavernIdentityMacroValues {
  readonly characterName: string
  readonly userName?: string
}

/**
 * Replace SillyTavern's brace and legacy tag identity aliases.
 * @param value - card, preset, or regex-owned text.
 * @param identity - active character and optional player identity.
 * @param transform - optional escaping applied independently to each substituted name.
 * @returns text with every supported identity alias resolved.
 */
export function substituteSillyTavernIdentityMacros(
  value: string,
  identity: SillyTavernIdentityMacroValues,
  transform: (replacement: string) => string = replacement => replacement,
): string {
  return value
    .replace(/\{\{char\}\}|<char>|<bot>/giu, transform(identity.characterName))
    .replace(/\{\{user\}\}|<user>/giu, transform(identity.userName?.trim() || '用户'))
}

/**
 * Resolve identity aliases in a JSON projection without mutating stored state.
 * @param value - persisted state projected into a prompt or browser view.
 * @param identity - active character and optional player identity.
 * @returns a JSON value whose string leaves contain the current identities.
 */
export function projectSillyTavernIdentityMacros(
  value: JsonValue,
  identity: SillyTavernIdentityMacroValues,
): JsonValue {
  if (typeof value === 'string') return substituteSillyTavernIdentityMacros(value, identity)
  if (Array.isArray(value)) return value.map(item => projectSillyTavernIdentityMacros(item, identity))
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    projectSillyTavernIdentityMacros(item, identity),
  ]))
}
