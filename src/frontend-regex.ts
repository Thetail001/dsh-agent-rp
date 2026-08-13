/** SillyTavern-compatible character regex execution for prompt and display views. */

import type { ImportedCharacterFrontend, ImportedRegexScript } from './import/types.ts'

/** Minimal identity needed by a character-owned regex script. */
export interface RegexCharacter {
  readonly name: string
  readonly nickname?: string
  readonly frontend: ImportedCharacterFrontend
}

/** One ordered piece of a display-regex result. */
export type CharacterDisplaySegment =
  | { readonly kind: 'markdown'; readonly text: string }
  | { readonly kind: 'html'; readonly source: string }

interface SourceLine {
  readonly start: number
  readonly end: number
  readonly text: string
}

function sourceLines(value: string): SourceLine[] {
  const lines: SourceLine[] = []
  const pattern = /[^\r\n]*(?:\r\n|\r|\n|$)/gu
  for (const match of value.matchAll(pattern)) {
    const text = match[0]
    const start = match.index
    if (text === '' && start === value.length) break
    lines.push({ start, end: start + text.length, text })
  }
  return lines
}

function isFrontendDocument(info: string, source: string): boolean {
  const language = info.trim().split(/\s+/u)[0]?.toLowerCase()
  if (language !== undefined && language !== '') return language === 'html'
  return /<!doctype\s+html\b|<html(?:\s|>)|<head(?:\s|>)|<body(?:\s|>)/iu.test(source)
}

function appendMarkdown(segments: CharacterDisplaySegment[], text: string): void {
  if (text === '') return
  const previous = segments.at(-1)
  if (previous?.kind === 'markdown') {
    segments[segments.length - 1] = { kind: 'markdown', text: previous.text + text }
    return
  }
  segments.push({ kind: 'markdown', text })
}

/**
 * Split a display-regex result into native Markdown and isolated HTML documents.
 * Only fenced frontend documents become executable surfaces; ordinary inline
 * HTML remains part of the Markdown message.
 */
export function splitCharacterDisplay(value: string): CharacterDisplaySegment[] {
  const lines = sourceLines(value)
  const segments: CharacterDisplaySegment[] = []
  let cursor = 0
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue
    const opening = line.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*([^\r\n]*?)[ \t]*(?:\r\n|\r|\n|$)$/u)
    if (opening === null) continue
    const marker = opening[1]
    if (marker === undefined) continue
    let closingIndex: number | undefined
    for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
      const closing = lines[candidate]?.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u)
      const closingMarker = closing?.[1]
      if (closingMarker !== undefined && closingMarker[0] === marker[0] && closingMarker.length >= marker.length) {
        closingIndex = candidate
        break
      }
    }
    if (closingIndex === undefined) break
    const closing = lines[closingIndex]
    if (closing === undefined) break
    const source = value.slice(line.end, closing.start)
    if (isFrontendDocument(opening[2] ?? '', source)) {
      appendMarkdown(segments, value.slice(cursor, line.start))
      segments.push({ kind: 'html', source })
      cursor = closing.end
    }
    index = closingIndex
  }
  appendMarkdown(segments, value.slice(cursor))
  return segments
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
