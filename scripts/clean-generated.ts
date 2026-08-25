/** Remove reproducible repository-local test and inspection artifacts. */

import { readdir, rm } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const exactGeneratedNames = new Set([
  '.audit-dist',
  '.check-lore',
  '.preset-smoke',
  '.runtime',
  '.smoke-dist',
])

/** Report whether one repository-root entry is a reproducible generated artifact. */
export function isGeneratedArtifactName(name: string): boolean {
  return exactGeneratedNames.has(name)
    || name.startsWith('.benchmark-')
    || name.startsWith('.diagnose-')
    || name.startsWith('.inspect-')
    || name.startsWith('.probe-')
    || name.startsWith('.runtime-')
    || name.startsWith('.test-')
    || name.endsWith('.tgz')
}

/** Report whether one root entry belongs to the explicitly disposable scratch area. */
export function isScratchArtifactName(name: string): boolean {
  return name === '.tmp' || name.startsWith('.tmp-')
}

/** Options for one repository-root cleanup pass. */
export interface CleanGeneratedArtifactsOptions {
  /** List exact targets without removing them. */
  readonly dryRun?: boolean
  /** Include retained `.tmp` and `.tmp-*` scratch entries. */
  readonly scratch?: boolean
}

/** Remove matched root entries without descending into preserved directories to discover targets. */
export async function cleanGeneratedArtifacts(
  root: string,
  options: CleanGeneratedArtifactsOptions = {},
): Promise<readonly string[]> {
  const resolvedRoot = resolve(root)
  const entries = await readdir(resolvedRoot, { withFileTypes: true })
  const targets = entries.map(entry => entry.name)
    .filter(name => isGeneratedArtifactName(name) || (options.scratch === true && isScratchArtifactName(name)))
    .sort()
  for (const name of targets) {
    const target = resolve(resolvedRoot, name)
    if (!target.startsWith(`${resolvedRoot}${sep}`)) throw new Error(`Generated artifact escaped repository root: ${name}`)
    if (options.dryRun !== true) await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
  return targets
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(scriptPath)) {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.some(arg => arg !== '--dry-run' && arg !== '--scratch')) {
    throw new Error('Usage: pnpm clean:generated [-- --dry-run] [--scratch]')
  }
  const dryRun = args.includes('--dry-run')
  const scratch = args.includes('--scratch')
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const targets = await cleanGeneratedArtifacts(root, { dryRun, scratch })
  if (targets.length === 0) {
    process.stdout.write('No generated artifacts found.\n')
  } else {
    process.stdout.write(`${dryRun ? 'Would remove' : 'Removed'} ${targets.length} generated artifact(s):\n`)
    process.stdout.write(`${targets.map(name => `- ${name}`).join('\n')}\n`)
  }
}
