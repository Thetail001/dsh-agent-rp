/** Stable SillyTavern identity macro substitution shared by Host and browser views. */

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
