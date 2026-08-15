/** SillyTavern-compatible character regex execution for prompt and display views. */

import type { ImportedCharacterFrontend, ImportedRegexScript } from './import/types.ts'

/** Message-source field identifying a logged model-only prompt-regex replacement. */
export const PROMPT_REGEX_SOURCE_MARKER = 'dshAgentRpPromptRegex'

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
  | { readonly kind: 'inline-html'; readonly source: string }

/** Why one regex script did or did not affect a prompt message. */
export type PromptRegexOutcome =
  | 'applied'
  | 'disabled'
  | 'display-only'
  | 'placement'
  | 'depth'
  | 'invalid'
  | 'no-match'

/** Prompt rendering result with one non-sensitive outcome per ordered script. */
export interface PromptRegexTrace {
  readonly text: string
  readonly scripts: readonly {
    readonly index: number
    readonly scriptName: string
    readonly outcome: PromptRegexOutcome
  }[]
}

/** Non-sensitive result of the latest model-facing regex pass. */
export interface PromptRegexTraceRecord {
  readonly format: 0
  readonly turn: number
  readonly step: number
  readonly messageCount: number
  readonly replacementCount: number
  readonly scripts: readonly {
    readonly source: 'preset' | 'character'
    readonly index: number
    readonly scriptName: string
    readonly outcome: PromptRegexOutcome
    readonly affectedMessages: number
  }[]
}

/** Metadata carried by the latest model-only surface replacement. */
export interface PromptRegexSourceMarker {
  readonly format: 0
  readonly originalSeq: number
  readonly trace?: PromptRegexTraceRecord
}

const PROMPT_REGEX_OUTCOMES = new Set<PromptRegexOutcome>([
  'applied',
  'disabled',
  'display-only',
  'placement',
  'depth',
  'invalid',
  'no-match',
])

function promptRegexTraceRecord(value: unknown): PromptRegexTraceRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (record.format !== 0
    || typeof record.turn !== 'number' || !Number.isSafeInteger(record.turn) || record.turn < 0
    || typeof record.step !== 'number' || !Number.isSafeInteger(record.step) || record.step < 0
    || typeof record.messageCount !== 'number' || !Number.isSafeInteger(record.messageCount) || record.messageCount < 0
    || typeof record.replacementCount !== 'number' || !Number.isSafeInteger(record.replacementCount) || record.replacementCount < 0
    || !Array.isArray(record.scripts)) return undefined
  const scripts: PromptRegexTraceRecord['scripts'][number][] = []
  for (const value of record.scripts) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const script = value as Record<string, unknown>
    if ((script.source !== 'preset' && script.source !== 'character')
      || typeof script.index !== 'number' || !Number.isSafeInteger(script.index) || script.index < 0
      || typeof script.scriptName !== 'string'
      || typeof script.outcome !== 'string' || !PROMPT_REGEX_OUTCOMES.has(script.outcome as PromptRegexOutcome)
      || typeof script.affectedMessages !== 'number' || !Number.isSafeInteger(script.affectedMessages)
      || script.affectedMessages < 0) return undefined
    scripts.push({
      source: script.source,
      index: script.index,
      scriptName: script.scriptName,
      outcome: script.outcome as PromptRegexOutcome,
      affectedMessages: script.affectedMessages,
    })
  }
  return {
    format: 0,
    turn: record.turn,
    step: record.step,
    messageCount: record.messageCount,
    replacementCount: record.replacementCount,
    scripts,
  }
}

/** Read model-only replacement metadata without trusting durable source fields. */
export function readPromptRegexSourceMarker(value: unknown): PromptRegexSourceMarker | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.originalSeq !== 'number'
    || !Number.isSafeInteger(record.originalSeq) || record.originalSeq < 0) return undefined
  const trace = promptRegexTraceRecord(record.trace)
  return { format: 0, originalSeq: record.originalSeq, ...(trace === undefined ? {} : { trace }) }
}

interface SourceLine {
  readonly start: number
  readonly end: number
  readonly text: string
}

const HTML_DISPLAY_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo',
  'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em',
  'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input',
  'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta',
  'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture',
  'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search', 'section',
  'select', 'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
  'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
])

function stripUnknownTagsOutsideCode(value: string): string {
  let result = ''
  let cursor = 0
  let codeTicks = 0
  while (cursor < value.length) {
    if (value[cursor] === '`') {
      let end = cursor + 1
      while (value[end] === '`') end += 1
      const ticks = end - cursor
      if (codeTicks === 0) codeTicks = ticks
      else if (ticks === codeTicks) codeTicks = 0
      result += value.slice(cursor, end)
      cursor = end
      continue
    }
    if (codeTicks === 0 && value[cursor] === '<') {
      const tag = value.slice(cursor).match(/^<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?\s*\/?>/u)
      const name = tag?.[1]?.toLowerCase()
      if (tag?.[0] !== undefined && name !== undefined && !HTML_DISPLAY_TAGS.has(name)) {
        cursor += tag[0].length
        continue
      }
    }
    result += value[cursor]
    cursor += 1
  }
  return result
}

function hasDisplayHtmlOutsideCode(value: string): boolean {
  let cursor = 0
  let codeTicks = 0
  while (cursor < value.length) {
    if (value[cursor] === '`') {
      let end = cursor + 1
      while (value[end] === '`') end += 1
      const ticks = end - cursor
      if (codeTicks === 0) codeTicks = ticks
      else if (ticks === codeTicks) codeTicks = 0
      cursor = end
      continue
    }
    if (codeTicks === 0 && value[cursor] === '<') {
      const tag = value.slice(cursor).match(/^<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?\s*\/?>/u)
      const name = tag?.[1]?.toLowerCase()
      if (name !== undefined && HTML_DISPLAY_TAGS.has(name)) return true
    }
    cursor += 1
  }
  return false
}

/**
 * Match SillyTavern's Markdown display for model-defined wrapper elements.
 * Unknown HTML-like tags are discarded there while their text remains. Code
 * examples and fenced blocks keep their source spelling.
 */
export function normalizeSillyTavernMarkdown(value: string): string {
  let fence: { readonly marker: string; readonly length: number } | undefined
  return sourceLines(value).map(line => {
    const candidate = line.text.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1]
    if (candidate !== undefined) {
      if (fence === undefined) {
        fence = { marker: candidate[0] ?? '', length: candidate.length }
      } else if (candidate[0] === fence.marker && candidate.length >= fence.length
        && /^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u.test(line.text)) {
        fence = undefined
      }
      return line.text
    }
    return fence === undefined ? stripUnknownTagsOutsideCode(line.text) : line.text
  }).join('')
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
  const normalized = normalizeSillyTavernMarkdown(text)
  if (normalized === '') return
  if (hasDisplayHtmlOutsideCode(normalized)) {
    segments.push({ kind: 'inline-html', source: normalized })
    return
  }
  const previous = segments.at(-1)
  if (previous?.kind === 'markdown') {
    segments[segments.length - 1] = { kind: 'markdown', text: previous.text + normalized }
    return
  }
  segments.push({ kind: 'markdown', text: normalized })
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
  return applyScriptWithOutcome(raw, script, card, userName).text
}

function applyScriptWithOutcome(
  raw: string,
  script: ImportedRegexScript,
  card: RegexCharacter,
  userName?: string,
): { readonly text: string; readonly outcome: 'applied' | 'invalid' | 'no-match' } {
  const find = compileRegex(substitutedFindRegex(script, card, userName))
  if (find === undefined || script.findRegex === '') return { text: raw, outcome: 'invalid' }
  if (raw === '') return { text: raw, outcome: 'no-match' }
  let matched = false
  const text = raw.replace(find, (...args: unknown[]) => {
    matched = true
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
  return { text, outcome: matched ? 'applied' : 'no-match' }
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
  const scripts = [...presetScripts, ...card.frontend.regexScripts]
  const normalized = scripts.reduce((text, script) => {
    if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text
    return !script.markdownOnly && !script.promptOnly ? applyScript(text, script, card, userName) : text
  }, raw)
  return scripts.reduce((text, script) => {
    if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text
    return (view === 'display' ? script.markdownOnly : script.promptOnly)
      ? applyScript(text, script, card, userName)
      : text
  }, normalized)
}

function stripDisplayOnlyCharacterMediaFields(value: string): string {
  return value.replace(/<角色图片(?:\s[^<>]*?)?>[\s\S]*?<\/角色图片\s*>/giu, '')
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
  return stripDisplayOnlyCharacterMediaFields(runScripts(raw, card, placement, 'display', depth, userName, presetScripts))
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

/** Render the prompt view and explain each script without exposing its expression or replacement. */
export function traceCharacterPromptView(
  raw: string,
  card: RegexCharacter,
  placement: number,
  depth?: number,
  userName?: string,
  presetScripts: readonly ImportedRegexScript[] = [],
): PromptRegexTrace {
  const scripts = [...presetScripts, ...card.frontend.regexScripts]
  const outcomes = new Map<number, PromptRegexOutcome>()
  let text = raw
  for (const [index, script] of scripts.entries()) {
    if (script.disabled) outcomes.set(index, 'disabled')
    else if (!script.placement.includes(placement)) outcomes.set(index, 'placement')
    else if (!inDepth(script, depth)) outcomes.set(index, 'depth')
    else if (script.markdownOnly || script.promptOnly) {
      if (script.markdownOnly && !script.promptOnly) outcomes.set(index, 'display-only')
    } else {
      const result = applyScriptWithOutcome(text, script, card, userName)
      text = result.text
      outcomes.set(index, result.outcome)
    }
  }
  for (const [index, script] of scripts.entries()) {
    if (outcomes.has(index)) continue
    if (!script.promptOnly) {
      outcomes.set(index, 'display-only')
      continue
    }
    const result = applyScriptWithOutcome(text, script, card, userName)
    text = result.text
    outcomes.set(index, result.outcome)
  }
  return {
    text,
    scripts: scripts.map((script, index) => ({
      index,
      scriptName: script.scriptName,
      outcome: outcomes.get(index) ?? 'no-match',
    })),
  }
}

/** Remove a single outer Markdown HTML fence emitted by card display scripts. */
export function unwrapHtmlFence(value: string): string {
  const match = value.trim().match(/^```html\s*([\s\S]*?)\s*```$/iu)
  return match?.[1] ?? value
}
