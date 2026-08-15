/** Synthetic compatibility benchmark for large, extension-heavy Character Cards. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { CharacterLibrary } from '../src/character-library.ts'
import { EjsTemplateEngine } from '../src/ejs-template.ts'
import { AI_OUTPUT_PLACEMENT, renderCharacterDisplay } from '../src/frontend-regex.ts'
import { createCharacterCardSessionSeed } from '../src/import/character-card-seed.ts'
import { MAX_CHARACTER_CARD_JSON_BYTES, parseCharacterCardJsonBytes } from '../src/import/character-card.ts'
import { createAgentRpProjectionDefinition } from '../src/projection.ts'

interface Options {
  readonly jsonMiB: number
  readonly worldInfoEntries: number
  readonly assetReferences: number
  readonly regexScripts: number
  readonly ejsTemplates: number
  readonly repeats: number
}

interface Measurement {
  readonly medianMs: number
  readonly p95Ms: number
  readonly maximumHeapDeltaMiB: number
  readonly runs: number
}

const defaults: Options = {
  jsonMiB: 6,
  worldInfoEntries: 320,
  assetReferences: 2_000,
  regexScripts: 24,
  ejsTemplates: 128,
  repeats: 3,
}

function positiveNumber(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number`)
  return parsed
}

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  const parsed = positiveNumber(value, fallback, label)
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} must be a positive integer`)
  return parsed
}

function optionsFromArguments(args: readonly string[]): Options {
  const values = new Map<string, string>()
  const options = args[0] === '--' ? args.slice(1) : args
  const supported = new Set(['--json-mib', '--world-info', '--asset-refs', '--regex', '--ejs', '--repeats'])
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
    jsonMiB: positiveNumber(values.get('--json-mib'), defaults.jsonMiB, '--json-mib'),
    worldInfoEntries: positiveInteger(values.get('--world-info'), defaults.worldInfoEntries, '--world-info'),
    assetReferences: positiveInteger(values.get('--asset-refs'), defaults.assetReferences, '--asset-refs'),
    regexScripts: positiveInteger(values.get('--regex'), defaults.regexScripts, '--regex'),
    ejsTemplates: positiveInteger(values.get('--ejs'), defaults.ejsTemplates, '--ejs'),
    repeats: positiveInteger(values.get('--repeats'), defaults.repeats, '--repeats'),
  }
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

async function measure(runs: number, action: () => void | Promise<void>): Promise<Measurement> {
  const durations: number[] = []
  const heapDeltas: number[] = []
  for (let run = 0; run < runs; run += 1) {
    const before = process.memoryUsage().heapUsed
    const started = performance.now()
    await action()
    durations.push(performance.now() - started)
    heapDeltas.push(Math.max(0, process.memoryUsage().heapUsed - before) / (1024 * 1024))
  }
  durations.sort((left, right) => left - right)
  return {
    medianMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maximumHeapDeltaMiB: Number(Math.max(...heapDeltas).toFixed(2)),
    runs,
  }
}

function syntheticCard(options: Options): Uint8Array {
  const panels = Array.from({ length: options.regexScripts }, (_, index) =>
    `<panel-${index}>Synthetic panel ${index}</panel-${index}>`).join('\n')
  const entries = Array.from({ length: options.worldInfoEntries }, (_, index) => ({
    id: index,
    name: `Synthetic entry ${index}`,
    keys: [`synthetic-${index}`, `topic-${index % 32}`],
    secondary_keys: [],
    content: `Synthetic lore ${index}: <%= char %> / <%= getvar("state.phase", 0) %>.`,
    enabled: true,
    insertion_order: index,
    selective: index % 5 !== 0,
    constant: index % 5 === 0,
    case_sensitive: false,
    match_whole_words: false,
    use_regex: false,
    position: index % 2 === 0 ? 'before_char' : 'after_char',
    priority: options.worldInfoEntries - index,
    extensions: {},
  }))
  const raw = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Synthetic compatibility card',
      nickname: 'Synthetic card',
      description: 'A generated benchmark identity with <%= getvar("state.phase", 0) %> phases.',
      personality: 'Deterministic and synthetic.',
      scenario: 'A local benchmark scene.',
      first_mes: panels,
      mes_example: '<START>\n{{char}}: Synthetic example.',
      creator_notes: '',
      system_prompt: 'Keep phase <%= getvar("state.phase", 0) %> consistent.',
      post_history_instructions: 'Return <UpdateVariable><%= JSON.stringify(stat_data) %></UpdateVariable>.',
      alternate_greetings: [panels],
      group_only_greetings: [],
      tags: ['synthetic', 'benchmark'],
      creator: 'dsh-agent-rp synthetic benchmark',
      character_version: '1',
      extensions: {
        regex_scripts: Array.from({ length: options.regexScripts }, (_, index) => ({
          id: `synthetic-regex-${index}`,
          scriptName: `Synthetic panel ${index}`,
          findRegex: `/<panel-${index}>([\\s\\S]*?)<\\/panel-${index}>/g`,
          replaceString: `<section class="synthetic-panel"><strong>Panel ${index}</strong><p>$1</p></section>`,
          trimStrings: [],
          placement: [2],
          disabled: false,
          markdownOnly: true,
          promptOnly: false,
          runOnEdit: false,
          substituteRegex: 0,
          minDepth: null,
          maxDepth: null,
        })),
        tavern_helper: [
          ['scripts', Array.from({ length: 16 }, (_, index) => ({
            id: `synthetic-script-${index}`,
            name: `Synthetic script ${index}`,
            content: `// inert synthetic script ${index}`,
            enabled: true,
          }))],
          ['variables', { stat_data: { phase: 1, score: 0 }, state: { phase: 1 } }],
        ],
      },
      assets: Array.from({ length: options.assetReferences }, (_, index) => ({
        type: index === 0 ? 'icon' : 'emotion',
        uri: `https://assets.invalid/synthetic/${index}.webp`,
        name: `synthetic-${index}`,
        ext: 'webp',
      })),
      character_book: {
        name: 'Synthetic stress lorebook',
        scan_depth: 8,
        token_budget: 4_096,
        recursive_scanning: false,
        extensions: {},
        entries,
      },
    },
  }
  const targetBytes = Math.floor(options.jsonMiB * 1024 * 1024)
  const beforePadding = Buffer.byteLength(JSON.stringify(raw), 'utf8')
  if (targetBytes > beforePadding) raw.data.creator_notes = 'x'.repeat(targetBytes - beforePadding)
  return new TextEncoder().encode(JSON.stringify(raw))
}

const options = optionsFromArguments(process.argv.slice(2))
const source = syntheticCard(options)
const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-compat-benchmark-'))
let sink = 0

try {
  let card = parseCharacterCardJsonBytes(source)
  const parse = await measure(options.repeats, () => {
    card = parseCharacterCardJsonBytes(source)
    sink += card.lorebook?.entries.length ?? 0
  })

  const library = new CharacterLibrary({ root })
  const importCard = await measure(1, () => {
    const result = library.importFileWithOutcome({
      data: source,
      filename: 'synthetic-heavy-card.json',
      mediaType: 'application/json',
    })
    sink += result.entry.worldInfoCount
  })
  const id = library.list()[0]?.id
  if (id === undefined) throw new Error('synthetic import did not create a library entry')

  const listCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).list().length
  })
  const detailCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).get(id).greetings.length
  })
  const resolveCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).resolve(id).card.assets?.length ?? 0
  })
  const assetCold = await measure(options.repeats, () => {
    sink += new CharacterLibrary({ root }).asset(id).data.byteLength
  })
  const display = await measure(options.repeats, () => {
    sink += renderCharacterDisplay(card.firstMessage, card, AI_OUTPUT_PLACEMENT, 0).length
  })

  const attachment = {
    kind: 'file' as const,
    attachmentId: AttachmentId(`library:${id}`),
    bytes: source.byteLength,
    name: 'synthetic-heavy-card.json',
    mediaType: 'application/json',
  }
  const seed = createCharacterCardSessionSeed(
    card,
    attachment,
    0,
    card.firstMessage,
    { transport: 'json' },
    'Synthetic user',
    undefined,
    id,
  )
  const projectionDefinition = createAgentRpProjectionDefinition()
  const projection = await measure(options.repeats, () => {
    let state = projectionDefinition.init()
    for (const event of seed) state = projectionDefinition.apply(state, event)
    sink += projectionDefinition.view(state).worldInfoCount
  })

  let engine: EjsTemplateEngine | undefined
  const ejsInitialization = await measure(1, async () => {
    engine = await EjsTemplateEngine.create()
  })
  if (engine === undefined) throw new Error('EJS engine did not initialize')
  const ejsBatch = await measure(options.repeats, () => {
    for (let index = 0; index < options.ejsTemplates; index += 1) {
      const result = engine!.render(
        '<% for (let i = 0; i < 8; i += 1) { %><%= char %>:<%= getvar("state.phase", 0) %>;<% } %>',
        {
          characterName: card.name,
          userName: 'Synthetic user',
          messages: ['Synthetic message'],
          variableScopes: { chat: { state: { phase: 1 } } },
          statData: { phase: 1, score: 0 },
        },
      )
      if (!result.ok) throw new Error(`synthetic EJS template failed with ${result.kind}`)
      sink += result.text.length
    }
  })

  process.stdout.write(`${JSON.stringify({
    benchmark: 'synthetic-heavy-character-card-v1',
    node: process.version,
    limits: { decodedCharacterJsonBytes: MAX_CHARACTER_CARD_JSON_BYTES },
    input: {
      ...options,
      actualJsonBytes: source.byteLength,
      actualJsonMiB: Number((source.byteLength / (1024 * 1024)).toFixed(2)),
    },
    measurements: {
      parse,
      importCard,
      listCold,
      detailCold,
      resolveCold,
      assetCold,
      display,
      projection,
      ejsInitialization,
      ejsBatch,
    },
    sink,
  }, null, 2)}\n`)
} finally {
  rmSync(root, { recursive: true, force: true })
}
