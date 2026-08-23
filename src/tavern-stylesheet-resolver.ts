/** Bounded Host-side resolution for player-approved Tavern stylesheet dependencies. */

import type {
  TavernScriptExecution,
  TavernStylesheetDependency,
} from './tavern-script-resolver.ts'

const MAX_STYLESHEET_BYTES = 512 * 1024
const MAX_STYLESHEET_TOTAL_BYTES = 1024 * 1024
const MAX_STYLESHEET_DEPENDENCIES = 16
const MAX_STYLESHEET_REDIRECTS = 3

export interface TavernStylesheetSource {
  readonly source: string
  readonly status: number
}

/** Injectable stylesheet reader used by the execution-plan cache and focused tests. */
export type TavernStylesheetSourceReader = (
  url: URL,
  signal: AbortSignal,
) => Promise<TavernStylesheetSource>

function httpsUrl(value: string, base?: URL): URL | undefined {
  try {
    const url = base === undefined ? new URL(value) : new URL(value, base)
    return url.protocol === 'https:' && url.username === '' && url.password === '' ? url : undefined
  } catch {
    return undefined
  }
}

async function responseText(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_STYLESHEET_BYTES) {
    throw new Error('远程样式超过 512 KiB')
  }
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > MAX_STYLESHEET_BYTES) throw new Error('远程样式超过 512 KiB')
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

/** Read one exact HTTPS stylesheet without permitting redirects to an unapproved origin. */
export async function readTavernStylesheetSource(url: URL, signal: AbortSignal): Promise<TavernStylesheetSource> {
  let current = url
  for (let redirects = 0; redirects <= MAX_STYLESHEET_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      headers: { accept: 'text/css,*/*;q=0.1' },
      redirect: 'manual',
      signal,
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      const next = location === null ? undefined : httpsUrl(location, current)
      if (next === undefined || next.origin !== url.origin || redirects === MAX_STYLESHEET_REDIRECTS) {
        throw new Error('远程样式重定向超出已授权来源')
      }
      current = next
      continue
    }
    return { source: await responseText(response), status: response.status }
  }
  throw new Error('远程样式重定向过多')
}

function cssUrls(source: string): readonly string[] {
  const urls: string[] = []
  for (const match of source.matchAll(/\burl\(\s*(?:(['"])(.*?)\1|([^\s)'";]+))\s*\)/giu)) {
    const value = (match[2] ?? match[3])?.trim()
    if (value !== undefined && value !== '') urls.push(value)
  }
  return urls
}

function importedStylesheets(source: string, base: URL): readonly URL[] {
  const urls: URL[] = []
  for (const match of source.matchAll(/@import\s+(?:url\(\s*)?(?:(['"])(.*?)\1|([^\s)'";]+))\s*\)?/giu)) {
    const url = httpsUrl((match[2] ?? match[3] ?? '').trim(), base)
    if (url !== undefined) urls.push(url)
  }
  return urls
}

function fontOrigins(source: string, base: URL): readonly string[] {
  const origins = new Set<string>()
  for (const block of source.matchAll(/@font-face\s*\{([\s\S]*?)\}/giu)) {
    for (const value of cssUrls(block[1] ?? '')) {
      const url = httpsUrl(value, base)
      if (url !== undefined) origins.add(url.origin)
    }
  }
  for (const value of cssUrls(source)) {
    const url = httpsUrl(value, base)
    if (url !== undefined && /\.(?:eot|otf|ttc|ttf|woff2?)(?:$|[?#])/iu.test(url.href)) origins.add(url.origin)
  }
  return [...origins].sort()
}

/** Resolve only exact stylesheet URLs whose origins the player has already approved. */
export async function resolveTavernStylesheetExecution(
  execution: TavernScriptExecution,
  approvedOrigins: readonly string[],
  signal: AbortSignal,
  read: TavernStylesheetSourceReader = readTavernStylesheetSource,
): Promise<TavernScriptExecution> {
  const approved = new Set(approvedOrigins)
  const styleOrigins = new Set(execution.remoteStyleOrigins ?? [])
  const fonts = new Set(execution.remoteFontOrigins ?? [])
  const dependencies = new Map<string, TavernStylesheetDependency>()
  const queued = [...new Set(execution.remoteStylesheetUrls ?? [])].flatMap(value => {
    const url = httpsUrl(value)
    return url === undefined ? [] : [url]
  })
  let totalBytes = 0
  for (let index = 0; index < queued.length; index += 1) {
    const url = queued[index]!
    styleOrigins.add(url.origin)
    if (!approved.has(url.origin) || dependencies.has(url.href)) continue
    if (dependencies.size >= MAX_STYLESHEET_DEPENDENCIES) throw new Error('远程样式依赖超过 16 个')
    const response = await read(url, signal)
    totalBytes += new TextEncoder().encode(response.source).byteLength
    if (totalBytes > MAX_STYLESHEET_TOTAL_BYTES) throw new Error('远程样式合计超过 1 MiB')
    dependencies.set(url.href, Object.freeze({ url: url.href, ...response }))
    if (response.status < 200 || response.status >= 300) continue
    for (const origin of fontOrigins(response.source, url)) fonts.add(origin)
    for (const imported of importedStylesheets(response.source, url)) {
      styleOrigins.add(imported.origin)
      if (!dependencies.has(imported.href) && !queued.some(candidate => candidate.href === imported.href)) {
        queued.push(imported)
      }
    }
  }
  return Object.freeze({
    ...execution,
    remoteStyleOrigins: Object.freeze([...styleOrigins].sort()),
    remoteFontOrigins: Object.freeze([...fonts].sort()),
    stylesheetDependencies: Object.freeze([...dependencies.values()].sort((left, right) => left.url.localeCompare(right.url))),
  })
}
