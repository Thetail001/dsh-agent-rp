import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const testsRoot = resolve(root, 'tests')
const allTests = readdirSync(testsRoot)
  .filter(name => name.endsWith('.test.ts'))
  .sort()

const nonFocusedTests = new Set([
  'agent-rp-command-client.test.ts',
  'agent-rp-command-http.test.ts',
  'character-card-seed.test.ts',
  'character-library-http.test.ts',
  'character-world-binding.test.ts',
  'chat-migration.test.ts',
  'client-avatar.test.ts',
  'compat-smoke.test.ts',
  'external-window.test.ts',
  'host-http.test.ts',
  'native-back.test.ts',
  'native-share.test.ts',
  'projection-contract.test.ts',
  'roleplay-experience-request.test.ts',
  'roleplay-turn-health-client.test.ts',
  'roleplay-turn-health-http.test.ts',
  'roleplay-turn-health.test.ts',
  'runtime-diagnostic.test.ts',
  'session-launch.test.ts',
  'sidebar-slot-compat.test.ts',
  'sidebar-workbench-motion.test.ts',
  'theme-contrast.test.ts',
  'worldbook-character-context.test.ts',
])

const groups = {
  all: allTests,
  focused: allTests.filter(name => !nonFocusedTests.has(name)),
  'external-window': ['external-window.test.ts'],
  http: ['host-http.test.ts', 'agent-rp-command-http.test.ts', 'agent-rp-command-client.test.ts'],
  'character-delete': ['character-library-http.test.ts'],
  smoke: [
    'client-avatar.test.ts',
    'roleplay-experience-request.test.ts',
    'chat-migration.test.ts',
    'compat-smoke.test.ts',
    'browser-compat-diagnostic.test.ts',
    'native-back.test.ts',
    'native-share.test.ts',
    'projection-contract.test.ts',
    'runtime-diagnostic.test.ts',
    'sidebar-slot-compat.test.ts',
    'sidebar-workbench-motion.test.ts',
  ],
  'session-launch': ['session-launch.test.ts', 'character-world-binding.test.ts'],
  'turn-audit': ['roleplay-turn-audit.test.ts'],
  'turn-recovery': ['session-roleplay-turn-recovery.test.ts'],
  'provider-seam': ['provider-seam-integration.test.ts', 'roleplay-state-action.test.ts'],
}

const groupName = process.argv[2] ?? 'all'
const selected = groups[groupName]
if (selected === undefined) {
  throw new Error(`Unknown source test group ${JSON.stringify(groupName)}; expected ${Object.keys(groups).join(', ')}`)
}
for (const name of selected) {
  if (!allTests.includes(name)) throw new Error(`Source test group ${groupName} references missing test ${name}`)
}

const concurrency = process.env['AGENT_RP_TEST_CONCURRENCY'] ?? '4'
if (!/^[1-9][0-9]*$/u.test(concurrency)) {
  throw new Error('AGENT_RP_TEST_CONCURRENCY must be a positive integer')
}
const reporter = process.env['AGENT_RP_TEST_REPORTER'] ?? './scripts/concise-test-reporter.mjs'

process.stderr.write(`[source-tests] ${groupName}: ${String(selected.length)} files\n`)
const child = spawn(process.execPath, [
  '--import',
  'tsx/esm',
  '--test',
  `--test-concurrency=${concurrency}`,
  `--test-reporter=${reporter}`,
  ...selected.map(name => resolve(testsRoot, name)),
], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
})

child.once('error', (error) => {
  process.stderr.write(`[source-tests] failed to start: ${error.message}\n`)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  if (signal !== null) {
    process.stderr.write(`[source-tests] terminated by ${signal}\n`)
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? 1
})
