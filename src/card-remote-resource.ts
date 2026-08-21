/** Shared discovery and validation for isolated Character Card network resources. */

import {
  CHARACTER_REMOTE_RESOURCE_TYPES,
  type CharacterRemoteResourceApproval,
  type CharacterRemoteResourceType,
} from './character-library-protocol.ts'

const httpsUrlPattern = /https:\/\/[^\s"'<>`\\)]+/giu

/** Return whether a value names one supported Character Card resource class. */
export function isCharacterRemoteResourceType(value: unknown): value is CharacterRemoteResourceType {
  return typeof value === 'string' && (CHARACTER_REMOTE_RESOURCE_TYPES as readonly string[]).includes(value)
}

/** Normalize a public HTTPS URL to the origin persisted in a resource approval. */
export function characterRemoteResourceOrigin(value: string): string {
  if (value.length > 2_048) throw new Error('角色卡外部资源地址过长')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    throw new Error('角色卡外部资源必须使用公开 HTTPS 来源')
  }
  return url.origin
}

function urls(value: string): readonly string[] {
  const origins = new Set<string>()
  for (const match of value.matchAll(httpsUrlPattern)) {
    try {
      origins.add(characterRemoteResourceOrigin(match[0].replace(/[),.;]+$/u, '')))
    } catch {
      // URL-like card text is not a usable browser resource.
    }
  }
  return [...origins]
}

function addMatches(
  approvals: Map<string, CharacterRemoteResourceApproval>,
  source: string,
  pattern: RegExp,
  type: CharacterRemoteResourceType,
): void {
  for (const match of source.matchAll(pattern)) {
    for (const origin of urls(match[0])) approvals.set(`${type}\u0000${origin}`, { origin, type })
  }
}

function addCssMatches(
  approvals: Map<string, CharacterRemoteResourceApproval>,
  source: string,
): void {
  const fontRanges = [...source.matchAll(/@font-face\b[\s\S]*?\}/giu)].map(match => ({
    start: match.index ?? -1,
    end: (match.index ?? -1) + match[0].length,
  }))
  const importRanges = [...source.matchAll(/@import\s+(?:url\(\s*)?["']?https:\/\/[^;\n]+/giu)].map(match => ({
    start: match.index ?? -1,
    end: (match.index ?? -1) + match[0].length,
  }))
  for (const match of source.matchAll(/url\(\s*(?:"[^"]+"|'[^']+'|[^\s)]+)\s*\)/giu)) {
    const index = match.index ?? -1
    if (importRanges.some(range => index >= range.start && index < range.end)) continue
    const type: CharacterRemoteResourceType = fontRanges.some(range => index >= range.start && index < range.end)
      ? 'font' : 'image'
    for (const origin of urls(match[0])) approvals.set(`${type}\u0000${origin}`, { origin, type })
  }
}

/** Find statically declared HTTPS resources without treating prose URLs as executable requests. */
export function cardRemoteResourceRequirements(source: string): readonly CharacterRemoteResourceApproval[] {
  const approvals = new Map<string, CharacterRemoteResourceApproval>()
  addMatches(approvals, source, /<script\b[^>]*\bsrc\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'script')
  addMatches(approvals, source, /<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*stylesheet[^"]*"|'[^']*stylesheet[^']*'|[^\s>]*stylesheet[^\s>]*))[^>]*\bhref\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'style')
  addMatches(approvals, source, /<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*(?:icon|apple-touch-icon)[^"]*"|'[^']*(?:icon|apple-touch-icon)[^']*'|[^\s>]*(?:icon|apple-touch-icon)[^\s>]*))[^>]*\bhref\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'image')
  addMatches(approvals, source, /<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*preload[^"]*"|'[^']*preload[^']*'|[^\s>]*preload[^\s>]*))(?=[^>]*\bas\s*=\s*(?:"font"|'font'|font))[^>]*\bhref\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'font')
  addMatches(approvals, source, /<link\b(?=[^>]*\brel\s*=\s*(?:"[^"]*preload[^"]*"|'[^']*preload[^']*'|[^\s>]*preload[^\s>]*))(?=[^>]*\bas\s*=\s*(?:"image"|'image'|image))[^>]*\bhref\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'image')
  addMatches(approvals, source, /<(?:img|input)\b[^>]*\b(?:src|srcset)\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'image')
  addMatches(approvals, source, /<source\b[^>]*\bsrcset\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'image')
  addMatches(approvals, source, /<(?:video)\b[^>]*\bposter\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'image')
  addMatches(approvals, source, /<(?:audio|video)\b[^>]*\bsrc\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'media')
  addMatches(approvals, source, /<source\b[^>]*\bsrc\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'media')
  addMatches(approvals, source, /<iframe\b[^>]*\bsrc\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>/giu, 'frame')
  addMatches(approvals, source, /\b(?:fetch\s*\(|new\s+(?:WebSocket|EventSource)\s*\(|\.open\s*\(\s*["'][A-Z]+["']\s*,)[^;\n)]*https:\/\/[^\s"'<>`\\)]+/giu, 'connect')
  addMatches(approvals, source, /\bimport\s*\(\s*["']https:\/\/[^"']+["']\s*\)/giu, 'script')
  addMatches(approvals, source, /\bimport\s+(?:[^;\n]*?\s+from\s+)?["']https:\/\/[^"']+["']/giu, 'script')
  addMatches(approvals, source, /@import\s+(?:url\(\s*)?["']?https:\/\/[^\s"')]+/giu, 'style')
  for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)) addCssMatches(approvals, match[1] ?? '')
  for (const match of source.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)) {
    addCssMatches(approvals, match[1] ?? match[2] ?? '')
  }
  return [...approvals.values()].sort((left, right) =>
    left.origin.localeCompare(right.origin) || left.type.localeCompare(right.type))
}

/** Return a stable key for one origin-and-class approval. */
export function cardRemoteResourceApprovalKey(value: CharacterRemoteResourceApproval): string {
  return `${value.type}\u0000${value.origin}`
}
