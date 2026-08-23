import type { IncomingMessage, ServerResponse } from 'node:http'

/** Options for one bounded HTTP request body. */
export interface BoundedRequestBodyOptions {
  /** Maximum accepted body size in bytes. */
  readonly limit: number
  /** Error reported when the body is empty. */
  readonly emptyMessage: string
  /** Error reported when the declared or streamed body exceeds {@link limit}. */
  readonly tooLargeMessage: string
}

/** Options for one bounded JSON request body. */
export interface JsonRequestBodyOptions extends BoundedRequestBodyOptions {
  /** Error reported when the bounded body is not valid JSON. */
  readonly invalidMessage: string
}

/** HTTP route registry shared by the public and current DSH Web hosts. */
export interface AgentRpHttpServer {
  register(route: {
    readonly kind: 'exact' | 'prefix'
    readonly path: string
    readonly handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

/**
 * Check that a browser request belongs to the current Host origin.
 *
 * Sandboxed card images are the sole cross-site exception: opaque-origin
 * frames send them as credential-free `no-cors` image requests.
 */
function loopbackHostname(value: string): boolean {
  return value === 'localhost' || value === '127.0.0.1' || value === '[::1]'
}

function loopbackAliasOrigin(request: IncomingMessage): string | undefined {
  const host = request.headers.host
  const origin = request.headers.origin
  if (host === undefined || origin === undefined) return undefined
  try {
    const source = new URL(origin)
    const target = new URL(`http://${host}`)
    if (source.protocol !== 'http:' || !loopbackHostname(source.hostname) || !loopbackHostname(target.hostname)) {
      return undefined
    }
    return source.port === target.port ? source.origin : undefined
  } catch {
    return undefined
  }
}

/** Return the exact loopback-alias Origin that may be echoed by a narrow CORS surface. */
export function trustedLoopbackAliasOrigin(request: IncomingMessage): string | undefined {
  const origin = loopbackAliasOrigin(request)
  if (origin === undefined || new URL(origin).host === request.headers.host) return undefined
  return origin
}

export function trustedBrowserRequest(
  request: IncomingMessage,
  sandboxedImage = false,
  allowLoopbackAlias = false,
): boolean {
  const host = request.headers.host
  if (host === undefined || host.trim() === '') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') {
    if (allowLoopbackAlias && loopbackAliasOrigin(request) !== undefined) return true
    return sandboxedImage && request.headers['sec-fetch-dest'] === 'image'
      && request.headers['sec-fetch-mode'] === 'no-cors' && request.headers.origin === undefined
  }
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
      || allowLoopbackAlias && loopbackAliasOrigin(request) !== undefined
  } catch {
    return false
  }
}

/** Write one non-cacheable UTF-8 JSON response. */
export function jsonResponse(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(body)
}

/** Read one non-empty request body without trusting `content-length`. */
export async function readBoundedRequestBody(
  request: IncomingMessage,
  options: BoundedRequestBodyOptions,
): Promise<Buffer> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > options.limit) throw new Error(options.tooLargeMessage)
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array)
    bytes += data.byteLength
    if (bytes > options.limit) throw new Error(options.tooLargeMessage)
    chunks.push(data)
  }
  if (bytes === 0) throw new Error(options.emptyMessage)
  return Buffer.concat(chunks)
}

/** Read and decode one bounded non-empty JSON request body. */
export async function readJsonRequest(
  request: IncomingMessage,
  options: JsonRequestBodyOptions,
): Promise<unknown> {
  const body = await readBoundedRequestBody(request, options)
  try {
    return JSON.parse(body.toString('utf8')) as unknown
  } catch (error: unknown) {
    throw new Error(options.invalidMessage, { cause: error })
  }
}
