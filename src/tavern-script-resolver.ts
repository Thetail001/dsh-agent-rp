/** Static Tavern Helper dependency resolution shared by Host preflight and isolated browser runtimes. */

import { parse as parseModule } from 'es-module-lexer/js'

const tavernCompatibilityMarkerPattern = /^__[\p{L}\p{N}_-]{1,112}_loaded__$/u
const remoteCache = new Map<string, string>()
interface PendingRemoteSource {
  readonly controller: AbortController
  readonly promise: Promise<string>
  settled: boolean
  waiters: number
}
const pendingRemoteSources = new Map<string, PendingRemoteSource>()
const MAX_REMOTE_CACHE_ENTRIES = 32

/** Script origins trusted by the built-in jsDelivr bundle resolver. */
export const BUILT_IN_TAVERN_SCRIPT_ORIGINS = ['https://cdn.jsdelivr.net', 'https://testingcf.jsdelivr.net'] as const
const MAX_REMOTE_SCRIPT_BYTES = 2 * 1024 * 1024
const MAX_REMOTE_SCRIPTS_BYTES = 4 * 1024 * 1024

/** Browser execution plan for one isolated Tavern Helper script. */
export interface TavernScriptExecution {
  readonly source: string
  readonly mode: 'classic' | 'module'
  /** Classic leaf dependencies evaluated in isolated scopes before the entry script. */
  readonly inlineDependencies?: readonly string[]
  readonly preloads: readonly ('yaml' | 'zod')[]
  readonly needsDomPurify: boolean
  readonly needsFuse: boolean
  /** Literal readiness flags assigned by authorized dependency modules. */
  readonly compatibilityMarkers: readonly string[]
  /** Static HTTPS image origins declared by the entry script and inspected dependencies. */
  readonly remoteImageOrigins?: readonly string[]
  /** Static HTTPS frame origins declared by the entry script and inspected dependencies. */
  readonly remoteFrameOrigins?: readonly string[]
}

/** Signals that a valid HTTPS module origin needs player approval before loading. */
export class TavernScriptOriginApprovalError extends Error {
  /** Origin awaiting approval. */
  readonly origin: string

  constructor(origin: string) {
    super(`远程脚本来源需要授权：${origin}`)
    this.name = 'TavernScriptOriginApprovalError'
    this.origin = origin
  }
}

/** Validate the small boolean readiness-marker surface shared with card display frames. */
export function validatedTavernCompatibilityMarkers(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.flatMap(marker => typeof marker === 'string' && marker.length <= 128
    && tavernCompatibilityMarkerPattern.test(marker) ? [marker] : []))].sort().slice(0, 32)
}

function approvedOrigins(additional: readonly string[]): ReadonlySet<string> {
  return new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...additional].map(value => new URL(value).origin))
}

function approvedModuleUrl(specifier: string, origins: ReadonlySet<string>): URL {
  let parsed: URL
  try {
    parsed = new URL(specifier)
  } catch {
    throw new Error(`远程模块必须使用完整 HTTPS 地址：${specifier}`)
  }
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') {
    throw new Error(`远程模块必须使用完整 HTTPS 地址：${specifier}`)
  }
  if (!origins.has(parsed.origin)) throw new TavernScriptOriginApprovalError(parsed.origin)
  return parsed
}

function isMagVarUpdateBundle(url: URL): boolean {
  return BUILT_IN_TAVERN_SCRIPT_ORIGINS.includes(url.origin as typeof BUILT_IN_TAVERN_SCRIPT_ORIGINS[number])
    && /^\/gh\/MagicalAstrogy\/MagVarUpdate(?:@[^/]+)?\/artifact\/bundle\.js$/iu.test(url.pathname)
}

async function fetchRemoteSource(parsed: URL, signal: AbortSignal): Promise<string> {
  const response = await fetch(parsed.href, {
    cache: 'force-cache',
    credentials: 'omit',
    headers: { accept: 'text/javascript, application/javascript, text/plain' },
    referrerPolicy: 'no-referrer',
    signal,
  })
  if (!response.ok) throw new Error(`远程脚本读取失败（${response.status}）`)
  if (response.url !== '' && new URL(response.url).origin !== parsed.origin) {
    throw new Error('远程脚本不能重定向到另一个来源')
  }
  const length = Number(response.headers.get('content-length') ?? 0)
  if (Number.isFinite(length) && length > MAX_REMOTE_SCRIPT_BYTES) throw new Error('远程脚本超过 2 MiB')
  const source = await response.text()
  if (new TextEncoder().encode(source).byteLength > MAX_REMOTE_SCRIPT_BYTES) throw new Error('远程脚本超过 2 MiB')
  return source
}

function cacheRemoteSource(href: string, source: string): string {
  remoteCache.delete(href)
  remoteCache.set(href, source)
  while (remoteCache.size > MAX_REMOTE_CACHE_ENTRIES) remoteCache.delete(remoteCache.keys().next().value!)
  return source
}

function startRemoteSource(parsed: URL): PendingRemoteSource {
  const controller = new AbortController()
  const pending: PendingRemoteSource = {
    controller,
    promise: fetchRemoteSource(parsed, controller.signal).then(source => cacheRemoteSource(parsed.href, source)),
    settled: false,
    waiters: 0,
  }
  pendingRemoteSources.set(parsed.href, pending)
  const settle = (): void => {
    pending.settled = true
    if (pendingRemoteSources.get(parsed.href) === pending) pendingRemoteSources.delete(parsed.href)
  }
  void pending.promise.then(settle, settle)
  return pending
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('This operation was aborted', 'AbortError')
}

function waitForRemoteSource(href: string, pending: PendingRemoteSource, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(abortReason(signal))
  pending.waiters += 1
  return new Promise<string>((resolve, reject) => {
    let waiting = true
    const finish = (complete: () => void): void => {
      if (!waiting) return
      waiting = false
      signal.removeEventListener('abort', onAbort)
      pending.waiters -= 1
      if (pending.waiters === 0 && !pending.settled) {
        if (pendingRemoteSources.get(href) === pending) pendingRemoteSources.delete(href)
        pending.controller.abort()
      }
      complete()
    }
    const onAbort = (): void => { finish(() => { reject(abortReason(signal)) }) }
    signal.addEventListener('abort', onAbort, { once: true })
    void pending.promise.then(
      source => { finish(() => { resolve(source) }) },
      reason => { finish(() => { reject(reason) }) },
    )
  })
}

async function remoteSource(url: URL, signal: AbortSignal): Promise<string> {
  const parsed = new URL(url)
  const cached = remoteCache.get(parsed.href)
  if (cached !== undefined) return cached
  if (signal.aborted) throw abortReason(signal)
  const pending = pendingRemoteSources.get(parsed.href) ?? startRemoteSource(parsed)
  return waitForRemoteSource(parsed.href, pending, signal)
}

function removeSourceRanges(source: string, ranges: readonly { readonly start: number; readonly end: number }[]): string {
  let result = source
  for (const range of [...ranges].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, range.start)}${result.slice(range.end)}`
  }
  return result.trim()
}

const trueCompatibilityMarkerAssignmentPattern = /(?:\bwindow\b(?:\s*\.\s*(?:parent|top))?|\(\s*window\s*\.\s*(?:parent|top)\s*\|\|\s*window\s*\))\s*(?:\.\s*(__[\p{L}\p{N}_-]{1,112}_loaded__)|\[\s*(['"])(__[\p{L}\p{N}_-]{1,112}_loaded__)\2\s*\])\s*=\s*true\b/gu

/** Find literal Window readiness assignments without executing dependency source. */
export function declaredTavernCompatibilityMarkers(source: string): readonly string[] {
  return validatedTavernCompatibilityMarkers([...source.matchAll(trueCompatibilityMarkerAssignmentPattern)]
    .map(match => match[1] ?? match[3]))
}

/** Find literal HTTPS image origins without executing script source. */
export function declaredTavernImageOrigins(source: string): readonly string[] {
  const origins = new Set<string>()
  for (const match of source.matchAll(/https:\/\/[^\s"'<>`\\)]+/giu)) {
    try {
      const url = new URL(match[0].replace(/[),.;]+$/u, ''))
      if (url.protocol === 'https:' && /\.(?:avif|gif|jpe?g|png|svg|webp)$/iu.test(url.pathname)) origins.add(url.origin)
    } catch {
      // Template fragments and URL-like script text are not static browser resources.
    }
  }
  return [...origins].sort()
}

/** Find static HTTPS iframe origins without executing script source. */
export function declaredTavernFrameOrigins(source: string): readonly string[] {
  if (!/(?:<iframe\b|createElement\(\s*['"]iframe['"]\s*\))/iu.test(source)) return []
  const origins = new Set<string>()
  const literals = new Map<string, string>()
  const add = (value: string): void => {
    try {
      const url = new URL(value.replace(/[),.;]+$/u, ''))
      if (url.protocol === 'https:' && url.username === '' && url.password === '') origins.add(url.origin)
    } catch {
      // Template fragments and URL-like script text are not static browser resources.
    }
  }
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*=\s*(['"])(https:\/\/[^\s"'<>`\\)]+)\2/giu)) {
    literals.set(match[1]!, match[3]!)
  }
  for (const match of source.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(['"])(https:\/\/[^\s"'<>`\\)]+)\1/giu)) {
    add(match[2]!)
  }
  for (const match of source.matchAll(/(?:\.\s*src\s*=|\.\s*(?:setAttribute|attr)\(\s*['"]src['"]\s*,)\s*(?:(['"])(https:\/\/[^\s"'<>`\\)]+)\1|([\p{L}_$][\p{L}\p{N}_$]*))/giu)) {
    const value = match[2] ?? literals.get(match[3]!)
    if (value !== undefined) add(value)
  }
  return [...origins].sort()
}

/** Resolve and authorize one card script while preserving ESM module boundaries. */
export async function resolveTavernScriptExecution(
  content: string,
  signal: AbortSignal,
  additionalOrigins: readonly string[] = [],
): Promise<TavernScriptExecution> {
  const origins = approvedOrigins(additionalOrigins)
  const [imports] = parseModule(content)
  const urls: URL[] = []
  const adapterRanges: { readonly start: number; readonly end: number }[] = []
  const remoteImports: { readonly url: URL; readonly start: number; readonly end: number; readonly sideEffect: boolean }[] = []
  for (const imported of imports) {
    if (imported.d === -2) continue
    if (imported.n === undefined) throw new Error('远程模块的动态 import 必须使用固定 HTTPS 地址')
    const url = approvedModuleUrl(imported.n, origins)
    if (isMagVarUpdateBundle(url)) {
      const statement = content.slice(imported.ss, imported.se)
      if (imported.d !== -1 || !/^\s*import\s*['"]/u.test(statement)) {
        throw new Error('MagVarUpdate 宿主适配仅支持副作用导入')
      }
      let end = imported.se
      while (content[end] === ' ' || content[end] === '\t') end += 1
      if (content[end] === ';') end += 1
      adapterRanges.push({ start: imported.ss, end })
      continue
    }
    urls.push(url)
    let end = imported.se
    while (content[end] === ' ' || content[end] === '\t') end += 1
    if (content[end] === ';') end += 1
    remoteImports.push({
      url, start: imported.ss, end,
      sideEffect: imported.d === -1 && /^\s*import\s*['"]/u.test(content.slice(imported.ss, imported.se)),
    })
  }
  const uniqueUrls = [...new Map(urls.map(url => [url.href, url])).values()]
  const sources = await Promise.all(uniqueUrls.map(url => remoteSource(url, signal)))
  const sourceByUrl = new Map(uniqueUrls.map((url, index) => [url.href, sources[index]!]))
  const inlineDependencies: string[] = []
  for (const url of uniqueUrls) {
    const occurrences = remoteImports.filter(item => item.url.href === url.href)
    const dependency = sourceByUrl.get(url.href)!
    const [dependencyImports, , , dependencyHasModuleSyntax] = parseModule(dependency)
    if (occurrences.length === 0 || occurrences.some(item => !item.sideEffect)
      || dependencyImports.length > 0 || dependencyHasModuleSyntax) continue
    adapterRanges.push(...occurrences.map(item => ({ start: item.start, end: item.end })))
    inlineDependencies.push(dependency)
  }
  const total = sources.reduce((size, source) => size + new TextEncoder().encode(source).byteLength, 0)
  if (total > MAX_REMOTE_SCRIPTS_BYTES) throw new Error('远程脚本合计超过 4 MiB')
  const source = removeSourceRanges(content, adapterRanges)
  const [, , , hasModuleSyntax] = parseModule(source)
  const dependencySource = [source, ...sources].join('\n')
  const preloads: ('yaml' | 'zod')[] = []
  if (/\bYAML\.(?:parse|parseDocument|stringify)\b/u.test(dependencySource)) preloads.push('yaml')
  if (/\bz\.(?:any|array|boolean|coerce|discriminatedUnion|enum|intersection|lazy|literal|nullable|number|object|optional|preprocess|record|string|tuple|union|unknown)\b/u.test(dependencySource)) preloads.push('zod')
  return {
    source,
    mode: hasModuleSyntax ? 'module' : 'classic',
    inlineDependencies,
    preloads,
    needsDomPurify: /\bDOMPurify\b/u.test(dependencySource),
    needsFuse: /\bFuse\b/u.test(dependencySource),
    compatibilityMarkers: declaredTavernCompatibilityMarkers(dependencySource),
    remoteImageOrigins: declaredTavernImageOrigins(dependencySource),
    remoteFrameOrigins: declaredTavernFrameOrigins(dependencySource),
  }
}
