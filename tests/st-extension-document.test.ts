import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compileStExtensionDocument,
  parseStExtensionHostMessage,
} from '../src/client/st-extension-document.ts'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { InstalledStExtensionEntry } from '../src/client/st-extension-registry.ts'
import { tavernPageSnapshot } from '../src/client/tavern-snapshot.ts'
import { agentRpProjectionDefinition } from '../src/projection.ts'

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
  const projection = agentRpProjectionDefinition.wire.view(agentRpProjectionDefinition.init())
  const source = compileStExtensionDocument({
    entries: [entry('extension.dangerous', [], dangerous)],
    nonce: 'nonce_1234567890_safe',
    sessionId: 'session-a',
    settings: { community: { enabled: true } },
    snapshot: tavernPageSnapshot(projection, SessionId('session-a')),
    token: 'token</script>',
  })

  assert.equal((source.match(/id="extensions_settings"/gu) ?? []).length, 1)
  assert.equal((source.match(/id="extensions_settings2"/gu) ?? []).length, 1)
  assert.equal(source.includes(dangerous), false)
  assert.equal(source.includes('</script><script>globalThis.injected'), false)
  assert.match(source, /\\u003c\/script>\\u003cscript>globalThis\.injected/u)
  assert.match(source, /\\u2028/u)
  assert.match(source, /script-src 'nonce-nonce_1234567890_safe' blob:/u)
  assert.match(source, /background:transparent;color:CanvasText;color-scheme:dark/u)
  assert.match(source, /URL\.createObjectURL\(new Blob/u)
  assert.match(source, /await import\(url\)/u)
  assert.match(source, /globalThis\.extension_settings=clone\(boot\.settings\)/u)
  assert.match(source, /globalThis\.saveSettingsDebounced=/u)
  assert.match(source, /context\.saveSettings=saveSettings/u)
  assert.match(source, /context\.saveSettingsDebounced=globalThis\.saveSettingsDebounced/u)
  assert.match(source, /globalThis\.__dshAgentRpSessionId=sessionId/u)
  assert.match(source, /globalThis\.SillyTavern=context/u)
  assert.match(source, /globalThis\.getContext=\(\)=>context/u)
  assert.match(source, /CHAT_CHANGED:'chat_id_changed'/u)
  assert.match(source, /MESSAGE_UPDATED:'message_updated'/u)
  assert.match(source, /GENERATION_STARTED:'generation_started'/u)
  assert.match(source, /applySnapshot\(message\.snapshot\)/u)
  assert.match(source, /message\.action==='page-sync'/u)
  assert.match(source, /dsh-agent-rp-session-change/u)
  assert.match(source, /style\?\.remove\(\)/u)
  assert.match(source, /catch\{return '无法读取扩展错误'\}/u)
  const program = source.match(/<script nonce="nonce_1234567890_safe">([\s\S]*)<\/script>/u)?.[1]
  assert.notEqual(program, undefined)
  assert.doesNotThrow(() => new Function(program!))
})

test('compiles dependency-aware isolated activation with terminal host reporting', () => {
  const source = compileStExtensionDocument({
    entries: [
      entry('extension.dependent', ['extension.base']),
      entry('extension.base'),
      entry('extension.missing', ['extension.absent']),
    ],
    nonce: 'nonce_1234567890_safe',
    sessionId: null,
    settings: {},
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
    sessionId: null,
    settings: {},
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
  assert.deepEqual(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'settings-save',
    settings: { community: { enabled: true } },
  }, 'current'), {
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'settings-save',
    settings: { community: { enabled: true } },
  })
  assert.equal(parseStExtensionHostMessage({
    source: 'dsh-agent-rp-st-extension-host',
    token: 'current',
    action: 'settings-save',
    settings: [],
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
