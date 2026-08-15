/** Synthetic benchmark for large Character Card V3 CHARX media collections. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { strToU8, zipSync } from 'fflate'
import { CharacterLibrary } from '../src/character-library.ts'
import {
  charxImageAssets,
  MAX_CHARX_ENTRIES,
  MAX_CHARX_UNCOMPRESSED_BYTES,
  parseCharx,
} from '../src/import/charx.ts'

interface Options {
  readonly images: number
  readonly imageKiB: number
  readonly repeats: number
}

interface Measurement {
  readonly medianMs: number
  readonly p95Ms: number
  readonly maximumHeapDeltaMiB: number
  readonly maximumArrayBufferDeltaMiB: number
  readonly maximumRssDeltaMiB: number
  readonly runs: number
}

const defaults: Options = { images: 2_000, imageKiB: 4, repeats: 3 }

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`)
  return parsed
}

function optionsFromArguments(args: readonly string[]): Options {
  const values = new Map<string, string>()
  const options = args[0] === '--' ? args.slice(1) : args
  const supported = new Set(['--images', '--image-kib', '--repeats'])
  for (let index = 0; index < options.length; index += 2) {
    const key = options[index]
    const value = options[index + 1]
    if (key === undefined || value === undefined || !key.startsWith('--')) {
      throw new Error('benchmark arguments must use --name value pairs')
    }
    if (!supported.has(key)) throw new Error(`unsupported benchmark argument ${key}`)
    values.set(key, value)
  }
  return {
    images: positiveInteger(values.get('--images'), defaults.images, '--images'),
    imageKiB: positiveInteger(values.get('--image-kib'), defaults.imageKiB, '--image-kib'),
    repeats: positiveInteger(values.get('--repeats'), defaults.repeats, '--repeats'),
  }
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

function memory(): { readonly heap: number; readonly arrayBuffers: number; readonly rss: number } {
  const usage = process.memoryUsage()
  return { heap: usage.heapUsed, arrayBuffers: usage.arrayBuffers, rss: usage.rss }
}

function positiveMiB(after: number, before: number): number {
  return Math.max(0, after - before) / (1024 * 1024)
}

async function measure(runs: number, action: () => void | Promise<void>): Promise<Measurement> {
  const durations: number[] = []
  const heapDeltas: number[] = []
  const arrayBufferDeltas: number[] = []
  const rssDeltas: number[] = []
  for (let run = 0; run < runs; run += 1) {
    const before = memory()
    const started = performance.now()
    await action()
    const after = memory()
    durations.push(performance.now() - started)
    heapDeltas.push(positiveMiB(after.heap, before.heap))
    arrayBufferDeltas.push(positiveMiB(after.arrayBuffers, before.arrayBuffers))
    rssDeltas.push(positiveMiB(after.rss, before.rss))
  }
  durations.sort((left, right) => left - right)
  return {
    medianMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maximumHeapDeltaMiB: Number(Math.max(...heapDeltas).toFixed(2)),
    maximumArrayBufferDeltaMiB: Number(Math.max(...arrayBufferDeltas).toFixed(2)),
    maximumRssDeltaMiB: Number(Math.max(...rssDeltas).toFixed(2)),
    runs,
  }
}

function syntheticArchive(options: Options): Uint8Array {
  if (options.images + 1 > MAX_CHARX_ENTRIES) {
    throw new Error(`--images must leave room for card.json within ${MAX_CHARX_ENTRIES} entries`)
  }
  const imageBytes = options.imageKiB * 1024
  const projectedBytes = options.images * imageBytes
  if (!Number.isSafeInteger(imageBytes) || projectedBytes >= MAX_CHARX_UNCOMPRESSED_BYTES) {
    throw new Error(`synthetic media must remain below ${MAX_CHARX_UNCOMPRESSED_BYTES} uncompressed bytes`)
  }
  const assets = Array.from({ length: options.images }, (_, index) => ({
    type: index === 0 ? 'icon' : index % 2 === 0 ? 'emotion' : 'background',
    uri: `embeded://assets/images/${index}.png`,
    name: index === 0 ? 'main' : `synthetic-${index}`,
    ext: 'png',
  }))
  const card = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Synthetic CHARX media card',
      description: 'Generated locally for a media-container benchmark.',
      personality: 'Deterministic and synthetic.',
      scenario: 'A local benchmark scene.',
      first_mes: 'Synthetic greeting.',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      group_only_greetings: [],
      tags: ['synthetic', 'benchmark'],
      creator: 'dsh-agent-rp synthetic benchmark',
      character_version: '1',
      extensions: {},
      assets,
    },
  }
  const files: Record<string, Uint8Array> = { 'card.json': strToU8(JSON.stringify(card)) }
  for (let index = 0; index < options.images; index += 1) {
    const bytes = new Uint8Array(imageBytes)
    bytes.set([0x89, 0x50, 0x4e, 0x47, index & 0xff])
    bytes.fill(index & 0xff, 5)
    files[`assets/images/${index}.png`] = bytes
  }
  return zipSync(files, { level: 0 })
}

const options = optionsFromArguments(process.argv.slice(2))
const archive = syntheticArchive(options)
const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-charx-benchmark-'))
let sink = 0

try {
  const manifest = await measure(options.repeats, () => {
    const charx = parseCharx(archive)
    sink += charx.entries.size + charxImageAssets(charx).length
  })
  const library = new CharacterLibrary({ root })
  const importCard = await measure(1, () => {
    sink += library.importFileWithOutcome({
      data: archive,
      filename: 'synthetic-media.charx',
      mediaType: 'application/zip',
    }).entry.imageAssetCount
  })
  const id = library.list()[0]?.id
  if (id === undefined) throw new Error('synthetic CHARX import did not create a library entry')

  const detailCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).get(id).imageAssets.length
  })
  const avatarCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).avatar(id)?.data.byteLength ?? 0
  })
  const lastImageCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).image(id, options.images - 1)?.data.byteLength ?? 0
  })

  process.stdout.write(`${JSON.stringify({
    benchmark: 'synthetic-charx-media-v1',
    node: process.version,
    limits: {
      archiveEntries: MAX_CHARX_ENTRIES,
      uncompressedBytes: MAX_CHARX_UNCOMPRESSED_BYTES,
    },
    input: {
      ...options,
      archiveBytes: archive.byteLength,
      archiveMiB: Number((archive.byteLength / (1024 * 1024)).toFixed(2)),
      uncompressedMediaMiB: Number((options.images * options.imageKiB / 1024).toFixed(2)),
    },
    measurements: { manifest, importCard, detailCold, avatarCold, lastImageCold },
    sink,
  }, null, 2)}\n`)
} finally {
  rmSync(root, { recursive: true, force: true })
}
