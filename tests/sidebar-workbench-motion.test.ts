import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/client/index.tsx', import.meta.url), 'utf8')

test('sidebar workbench declares entry motion and reduced-motion fallback', () => {
  assert.match(source, /\[data-agent-rp-action='open-workbench'\]:active \{ transform: scale\(\.94\); \}/u)
  assert.match(source, /@keyframes agent-rp-workbench-mask-in/u)
  assert.match(source, /@keyframes agent-rp-workbench-panel-in/u)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/u)
  assert.match(source, /data-agent-rp-workbench-dismiss/u)
  assert.match(source, /data-agent-rp-destination-icon/u)
})
