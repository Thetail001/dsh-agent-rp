/**
 * One-time migration for roleplay images published before they were addressed by
 * generated-image-library job id.
 *
 * Early `publish_roleplay_image` results carried a native `image` block plus attachment-shaped
 * replay metadata. That block sits in the model-visible transcript, so a text-only chat adapter
 * rejects every later turn of the session (the DeepSeek adapter fails with UNSUPPORTED_CONTENT).
 * This script rewrites affected sessions in place:
 *
 *   1. copies each published attachment's bytes into the generated-image library as an
 *      `external` job, so the browser can still fetch the illustration;
 *   2. rewrites the tool-result metadata to the job-id shape the current projection accepts;
 *   3. strips the `image` blocks out of the stored tool-result content.
 *
 * Usage (stop the Oh-DSH instance owning the data root first):
 *   node <built>/migrate-published-roleplay-images.mjs <dataRoot> [--apply]
 *
 * Without `--apply` it only reports what it would change.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GeneratedImageLibrary } from '../src/generated-image-library.ts'
import { publishableMediaType } from '../src/image-generation-protocol.ts'

interface LegacyImage {
  readonly attachmentId: string
  readonly mediaType: string
  readonly bytes: number
  readonly name?: string
}

function isLegacyImage(value: unknown): value is LegacyImage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.attachmentId === 'string' && record.attachmentId.startsWith('sha256:')
    && typeof record.mediaType === 'string' && typeof record.bytes === 'number'
}

function legacyPublishMeta(meta: unknown): readonly LegacyImage[] | undefined {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return undefined
  const record = meta as Record<string, unknown>
  if (record.format !== 0 || record.version !== 0 || !Array.isArray(record.images)) return undefined
  // An empty group is already ignored by the projection, so leave those sessions untouched.
  if (record.images.length === 0) return undefined
  return record.images.every(isLegacyImage) ? record.images as readonly LegacyImage[] : undefined
}

/** Drop every image block, including ones nested in tool-result content. */
function withoutImages(content: unknown): { readonly content: unknown; readonly removed: number } {
  if (!Array.isArray(content)) return { content, removed: 0 }
  let removed = 0
  const kept: unknown[] = []
  for (const block of content) {
    if (typeof block !== 'object' || block === null) { kept.push(block); continue }
    const record = block as Record<string, unknown>
    if (record.type === 'image') { removed += 1; continue }
    if (record.type === 'tool-result') {
      const nested = withoutImages(record.content)
      removed += nested.removed
      kept.push({ ...record, content: nested.content })
      continue
    }
    kept.push(block)
  }
  return { content: kept, removed }
}

function attachmentPath(dataRoot: string, attachmentId: string): string {
  const digest = attachmentId.slice('sha256:'.length)
  return join(dataRoot, 'attachments', 'v1', 'objects', digest.slice(0, 2), digest)
}

const [dataRootArgument, ...flags] = process.argv.slice(2)
if (dataRootArgument === undefined) {
  console.error('usage: migrate-published-roleplay-images <dataRoot> [--apply]')
  process.exit(2)
}
const dataRoot = dataRootArgument
const apply = flags.includes('--apply')
const library = new GeneratedImageLibrary({ root: join(dataRoot, 'agent-rp', 'generated-images') })
const sessionsRoot = join(dataRoot, 'sessions')

let scanned = 0
let changedSessions = 0
let migratedImages = 0

for (const workspace of readdirSync(sessionsRoot)) {
  const workspaceRoot = join(sessionsRoot, workspace)
  for (const sessionDirectory of readdirSync(workspaceRoot)) {
    const file = join(workspaceRoot, sessionDirectory, 'session.jsonl.zstd')
    if (!existsSync(file)) continue
    scanned += 1
    // zstd session logs are appended as concatenated frames; the CLI decodes all of them.
    const text = execFileSync('zstd', ['-dc', file], { maxBuffer: 512 * 1024 * 1024 }).toString('utf8')
    // The persistence layer requires the FIRST frame to hold exactly the one header line
    // (`assertZstdHeaderFrame`), so the header must be split out and recompressed on its own.
    const headerEnd = text.indexOf('\n')
    if (headerEnd < 0) throw new Error(`${sessionDirectory}: session log has no header line`)
    const header = text.slice(0, headerEnd + 1)
    const body = text.slice(headerEnd + 1)
    const lines = body.split('\n')
    let sessionChanged = false
    const rewritten = lines.map(line => {
      if (line.trim() === '') return line
      let event: Record<string, unknown>
      try { event = JSON.parse(line) as Record<string, unknown> } catch { return line }
      if (event.type !== 'tool/result') return line
      const data = event.data as Record<string, unknown> | undefined
      if (data === undefined) return line
      const legacy = legacyPublishMeta(data.meta)
      if (legacy === undefined) return line

      const images = legacy.map(image => {
        const mediaType = publishableMediaType(image.mediaType)
        if (mediaType === undefined) {
          throw new Error(`${sessionDirectory}: ${image.mediaType} cannot be stored in the image library`)
        }
        const source = attachmentPath(dataRoot, image.attachmentId)
        if (!existsSync(source)) {
          throw new Error(`${sessionDirectory}: attachment object is missing: ${source}`)
        }
        const bytes = new Uint8Array(readFileSync(source))
        const caption = typeof (data.meta as Record<string, unknown>).caption === 'string'
          ? (data.meta as Record<string, unknown>).caption as string
          : undefined
        const jobId = `image-${crypto.randomUUID()}`
        if (apply) {
          library.begin({ format: 0, jobId, mode: 'scene', prompt: caption ?? image.name ?? '角色插图' }, 'external')
          library.complete(jobId, { data: bytes, mediaType })
        }
        migratedImages += 1
        return { jobId, mediaType, bytes: bytes.byteLength, ...(image.name === undefined ? {} : { name: image.name }) }
      })

      const message = data.message as Record<string, unknown> | undefined
      const stripped = message === undefined ? undefined : withoutImages(message.content)
      sessionChanged = true
      const nextEvent = {
        ...event,
        data: {
          ...data,
          meta: { ...(data.meta as Record<string, unknown>), images },
          ...(message === undefined || stripped === undefined
            ? {}
            : { message: { ...message, content: stripped.content } }),
        },
      }
      return JSON.stringify(nextEvent)
    })

    if (!sessionChanged) continue
    changedSessions += 1
    console.log(`${apply ? 'rewriting' : 'would rewrite'} ${sessionDirectory}`)
    if (!apply) continue
    const compress = (plaintext: string): Buffer => execFileSync('zstd', ['-q', '-c'], {
      input: Buffer.from(plaintext, 'utf8'),
      maxBuffer: 512 * 1024 * 1024,
    })
    // Two frames: the lone header line, then the whole rewritten body. Later appends add
    // further frames, exactly as the runtime does.
    const output = Buffer.concat([compress(header), compress(rewritten.join('\n'))])
    const staging = `${file}.migrate.tmp`
    writeFileSync(staging, output)
    try {
      renameSync(staging, file)
    } finally {
      rmSync(staging, { force: true })
    }
  }
}

console.log(`scanned ${scanned} sessions; ${apply ? 'migrated' : 'would migrate'} ${migratedImages} image(s) across ${changedSessions} session(s)`)
