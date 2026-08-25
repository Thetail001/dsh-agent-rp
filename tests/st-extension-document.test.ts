import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compileStExtensionDocument,
  parseStExtensionHostMessage,
} from '../src/client/st-extension-document.ts'
import type { InstalledStExtensionEntry } from '../src/client/st-extension-registry.ts'

function entry(
  id: string,
  dependencies: readonly string[] = [],
  source = `globalThis[${JSON.stringify(id)}] = true`,
): InstalledStExtensionEntry {
  return Object.freeze({
    id,
    displayName: id,
    loadingOrder: 0,
    dependencies: Object.freeze([...dependencies]),
    source,
  })
}

test('builds one shared settings document and transports extension source without HTML termination', () => {
  const dangerous = 'globalThis.loaded = "</script><script>globalThis.injected = true</script>\u2028"'
  const source = compileStExtensionDocument({
    entries: [entry('extension.dangerous', [], dangerous)],
    nonce: 'nonce_1234567890_safe',
    token: 'token</script>',
  })

  assert.equal((source.match(/id="extensions_settings"/gu) ?? []).length, 1)
  assert.equal((source.match(/id="extensions_settings2"/gu) ?? []).length, 1)
  assert.equal(source.includes(dangerous), false)
  assert.equal(source.includes('</script><script>globalThis.injected'), false)
  assert.match(source, /\\u003c\/script>\\u003cscript>globalThis\.injected/u)
  assert.match(source, /\\u2028/u)
  assert.match(source, /script-src 'nonce-nonce_1234567890_safe' blob:/u)
  assert.match(source, /URL\.createObjectURL\(new Blob/u)
  assert.match(source, /await import\(url\)/u)
  assert.match(source, /style\?\.remove\(\)/u)
  assert.match(source, /catch\{return '无法读取扩展错误'\}/u)
})

test('compiles dependency-aware isolated activation with terminal host reporting', () => {
  const source = compileStExtensionDocument({
    entries: [
      entry('extension.dependent', ['extension.base']),
      entry('extension.base'),
      entry('extension.missing', ['extension.absent']),
    ],
    nonce: 'nonce_1234567890_safe',
    token: 'host-token',
  })

  assert.match(source, /entry\.dependencies\.some\(id=>!loaded\.has\(id\)\)/u)
  assert.match(source, /await run\(entry\)/u)
  assert.match(source, /if\(progressed\)continue/u)
  assert.match(source, /扩展依赖存在循环/u)
  assert.match(source, /status:'failed'/u)
  assert.match(source, /status:'loaded'/u)
  assert.match(source, /post\('host-state',\{status:'ready'/u)
})

test('rejects a nonce that could escape the CSP attribute', () => {
  assert.throws(() => compileStExtensionDocument({
    entries: [],
    nonce: 'bad\" nonce',
    token: 'token',
  }), /nonce is invalid/u)
})

test('accepts only bounded lifecycle reports for the current frame token', () => {
  assert.deepEqual(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'host-state',
    status: 'ready',
    loaded: ['extension.a'],
    failed: ['extension.b'],
  }, 'current'), {
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'host-state',
    status: 'ready',
    loaded: ['extension.a'],
    failed: ['extension.b'],
  })
  assert.equal(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'stale',
    action: 'settings-surface',
    hasContent: true,
  }, 'current'), undefined)
  assert.equal(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'extension-state',
    extensionId: 'extension.a',
    status: 'failed',
    error: '',
  }, 'current'), undefined)
  assert.equal(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'host-state',
    status: 'ready',
    loaded: ['extension.a'],
    failed: ['extension.a'],
  }, 'current'), undefined)
})
