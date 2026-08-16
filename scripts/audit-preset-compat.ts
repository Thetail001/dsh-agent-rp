/** Private-safe CLI for inspecting one local SillyTavern preset. */

import { readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { auditSillyTavernPresetCompatibility } from '../src/preset-compat-audit.ts'

const MAX_PRESET_BYTES = 64 * 1024 * 1024

type AuditFailure = 'invalid-arguments' | 'unsupported-transport' | 'read-error' | 'file-too-large' | 'invalid-preset'

function fail(failure: AuditFailure): void {
  process.stdout.write(`${JSON.stringify({
    audit: 'private-sillytavern-preset-compat-v1',
    ok: false,
    failure,
  }, null, 2)}\n`)
  process.exitCode = 1
}

const inputs = process.argv.slice(2).filter(argument => argument !== '--')
const input = inputs[0]
if (input === undefined || inputs.length !== 1) {
  fail('invalid-arguments')
} else if (extname(input).toLocaleLowerCase() !== '.json') {
  fail('unsupported-transport')
} else {
  let bytes: Uint8Array | undefined
  try {
    if (statSync(input).size > MAX_PRESET_BYTES) fail('file-too-large')
    else bytes = readFileSync(input)
  } catch {
    fail('read-error')
  }
  if (bytes !== undefined) {
    try {
      process.stdout.write(`${JSON.stringify(auditSillyTavernPresetCompatibility(bytes), null, 2)}\n`)
    } catch {
      fail('invalid-preset')
    }
  }
}
