/** SillyTavern-compatible character regex execution for prompt and display views. */

import type { ImportedCharacterFrontend, ImportedRegexScript } from './import/types.ts'

/** Minimal identity needed by a character-owned regex script. */
export interface RegexCharacter {
  readonly name: string
  readonly nickname?: string
  readonly frontend: ImportedCharacterFrontend
}

function substituteCardMacros(
  value: string,
  card: RegexCharacter,
  userName = '用户',
  transform: (replacement: string) => string = replacement => replacement,
): string {
  const name = card.nickname?.trim() || card.name
  return value
    .replace(/\{\{char\}\}|<char>|<bot>/giu, transform(name))
    .replace(/\{\{user\}\}|<user>/giu, transform(userName))
}

/** SillyTavern regex placement for a human-authored message. */
export const USER_INPUT_PLACEMENT = 1
/** SillyTavern regex placement for a character-authored message. */
export const AI_OUTPUT_PLACEMENT = 2

function compileRegex(value: string): RegExp | undefined {
  try {
    const literal = value.match(/^\/([\s\S]*)\/([a-z]*)$/iu)
    if (literal === null) return new RegExp(value)
    const flags = literal[2] ?? ''
    if (flags !== '' && !/^(?!.*?(.).*?\1)[dgimsuvy]+$/u.test(flags)) return new RegExp(value)
    return new RegExp(literal[1] ?? '', flags)
  } catch (_invalidRegex) {
    return undefined
  }
}

function escapeRegexMacro(value: string): string {
  return value.replace(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gu, character => {
    switch (character) {
      case '\n': return '\\n'
      case '\r': return '\\r'
      case '\t': return '\\t'
      case '\v': return '\\v'
      case '\f': return '\\f'
      case '\0': return '\\0'
      default: return `\\${character}`
    }
  })
}

function substitutedFindRegex(script: ImportedRegexScript, card: RegexCharacter, userName?: string): string {
  switch (Number(script.substituteRegex)) {
    case 1: return substituteCardMacros(script.findRegex, card, userName)
    case 2: return substituteCardMacros(script.findRegex, card, userName, escapeRegexMacro)
    default: return script.findRegex
  }
}

function inDepth(script: ImportedRegexScript, depth: number | undefined): boolean {
  if (depth === undefined) return true
  if (script.minDepth !== null && script.minDepth >= -1 && depth < script.minDepth) return false
  return script.maxDepth === null || script.maxDepth < 0 || depth <= script.maxDepth
}

function filterMatch(value: string, trimStrings: readonly string[], card: RegexCharacter, userName?: string): string {
  return trimStrings.reduce((text, trim) => text.replaceAll(substituteCardMacros(trim, card, userName), ''), value)
}

function applyScript(
  raw: string,
  script: ImportedRegexScript,
  card: RegexCharacter,
  userName?: string,
): string {
  const find = compileRegex(substitutedFindRegex(script, card, userName))
  if (find === undefined || script.findRegex === '' || raw === '') return raw
  return raw.replace(find, (...args: unknown[]) => {
    const groups = typeof args.at(-1) === 'object' && args.at(-1) !== null
      ? args.at(-1) as Record<string, string | undefined>
      : undefined
    const replacement = script.replaceString.replace(/\{\{match\}\}/giu, '$0').replace(
      /\$(\d+)|\$<([^>]+)>/gu,
      (_token, numeric: string | undefined, named: string | undefined) => {
        const match = numeric === undefined ? groups?.[named ?? ''] : args[Number(numeric)]
        return typeof match === 'string' ? filterMatch(match, script.trimStrings, card, userName) : ''
      },
    )
    return substituteCardMacros(replacement, card, userName)
  })
}

function runScripts(
  raw: string,
  card: RegexCharacter,
  placement: number,
  view: 'display' | 'prompt',
  depth?: number,
  userName?: string,
  presetScripts: readonly ImportedRegexScript[] = [],
): string {
  return [...presetScripts, ...card.frontend.regexScripts].reduce((text, script) => {
    if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text
    const selected = view === 'display'
      ? script.markdownOnly
      : script.promptOnly
    return selected ? applyScript(text, script, card, userName) : text
  }, raw)
}

/** Apply character display-only scripts without executing their HTML. */
export function renderCharacterDisplay(
  raw: string,
  card: RegexCharacter,
  placement: number,
  depth?: number,
  userName?: string,
  presetScripts?: readonly ImportedRegexScript[],
): string {
  return runScripts(raw, card, placement, 'display', depth, userName, presetScripts)
}

/** Apply character prompt-only scripts before model context leaves the roleplay boundary. */
export function renderCharacterPromptView(
  raw: string,
  card: RegexCharacter,
  placement: number,
  depth?: number,
  userName?: string,
  presetScripts?: readonly ImportedRegexScript[],
): string {
  return runScripts(raw, card, placement, 'prompt', depth, userName, presetScripts)
}

/** Remove a single outer Markdown HTML fence emitted by card display scripts. */
export function unwrapHtmlFence(value: string): string {
  const match = value.trim().match(/^```html\s*([\s\S]*?)\s*```$/iu)
  return match?.[1] ?? value
}
