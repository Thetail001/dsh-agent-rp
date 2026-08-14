/** Tavern slash-command subset understood by Agent RP frontend bridges. */

export type TavernSlashCommand =
  | { readonly kind: 'send'; readonly text: string }
  | { readonly kind: 'set-input'; readonly text: string; readonly trigger: boolean }
  | { readonly kind: 'trigger' }

/**
 * Parse the small slash-command subset used by imported Tavern interfaces.
 *
 * @param value - Raw command passed to Tavern Helper's `triggerSlash` API.
 * @returns The supported command, or `undefined` when Agent RP does not implement it.
 */
export function parseTavernSlashCommand(value: string): TavernSlashCommand | undefined {
  if (/^\/trigger\s*$/iu.test(value)) return { kind: 'trigger' }

  const piped = value.match(/^\/(send|setinput)\s+([\s\S]*?)\s*\|{1,2}\s*\/trigger\s*$/iu)
  if (piped?.[1] !== undefined && piped[2] !== undefined) {
    return piped[1].toLowerCase() === 'send'
      ? { kind: 'send', text: piped[2] }
      : { kind: 'set-input', text: piped[2], trigger: true }
  }

  const direct = value.match(/^\/(send|setinput)\s+([\s\S]*)$/iu)
  if (direct?.[1] === undefined || direct[2] === undefined) return undefined
  return direct[1].toLowerCase() === 'send'
    ? { kind: 'send', text: direct[2] }
    : { kind: 'set-input', text: direct[2], trigger: false }
}
