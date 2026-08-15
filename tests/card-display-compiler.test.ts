import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compileCharacterDisplay,
  normalizeLegacyCardHtml,
} from '../src/card-display-compiler.ts'
import { compileCardFrameDocument, compileCardFrames } from '../src/client/card-frame.ts'

test('removes model-defined wrappers and reports only safe tag metadata', () => {
  const source = '<scene>private sample prose</scene>'
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [{ kind: 'markdown', text: 'private sample prose' }])
  assert.deepEqual(compiled.diagnostics, [{
    code: 'unknown-wrapper-removed',
    count: 2,
    tags: ['scene'],
  }])
  assert.doesNotMatch(JSON.stringify(compiled.diagnostics), /private sample prose/u)
})

test('splits a leading block HTML wrapper from following prose', () => {
  const source = '<div class="scene">meta</div>\n\n正文'
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [
    { kind: 'inline-html', source: '<div class="scene">meta</div>' },
    { kind: 'markdown', text: '\n\n正文' },
  ])
  assert.deepEqual(compiled.diagnostics, [{ code: 'inline-html', count: 1 }])
})

test('preserves legacy center markup until the compatibility stage normalizes it', () => {
  const source = '<center class="portrait">name<br><img src="portrait.png"></center>'
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [{ kind: 'inline-html', source }])
  assert.deepEqual(normalizeLegacyCardHtml(source), {
    source: '<div data-agent-rp-center class="portrait">name<br><img src="portrait.png"></div>',
    diagnostics: [{ code: 'legacy-center-normalized', count: 1 }],
  })
})

test('keeps a leading style block in inline frontend source for sanitization', () => {
  const source = '<style>.card{display:grid}</style>\n<section class="card">content</section>'
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [{ kind: 'inline-html', source }])
  assert.deepEqual(compiled.diagnostics, [{ code: 'inline-html', count: 1 }])
})

test('distinguishes fenced frontend documents from inline HTML in source order', () => {
  const source = [
    'before',
    '```html',
    '<!doctype html><html><body>frame</body></html>',
    '```',
    'after <details><summary>state</summary>ready</details>',
  ].join('\n')
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [
    { kind: 'markdown', text: 'before\n' },
    { kind: 'html', source: '<!doctype html><html><body>frame</body></html>\n' },
    { kind: 'inline-html', source: 'after <details><summary>state</summary>ready</details>' },
  ])
  assert.deepEqual(compiled.diagnostics, [
    { code: 'frontend-document', count: 1 },
    { code: 'inline-html', count: 1 },
  ])
})

test('keeps application greetings isolated while redirecting only known Host facades', () => {
  const source = '<!doctype html><html><body><script>const context=top.SillyTavern.getContext();top.Mvu.getMvuData();parent.getChatMessages();parent.document.body;</script><img src="https://cdn.example.com/cover.webp"></body></html>'
  const frames = compileCardFrames(compileCharacterDisplay(`\`\`\`html\n${source}\n\`\`\``), {
    origin: 'http://127.0.0.1:3091',
  })
  const frame = frames.segments[0]
  assert.equal(frame?.kind, 'frame')
  if (frame?.kind !== 'frame') return
  assert.equal(frame.interactive, true)
  assert.deepEqual(frame.remoteOrigins, ['https://cdn.example.com'])
  assert.match(frame.srcDoc, /window\.SillyTavern\.getContext\(\)/u)
  assert.match(frame.srcDoc, /window\.Mvu\.getMvuData\(\)/u)
  assert.match(frame.srcDoc, /window\.getChatMessages\(\)/u)
  assert.match(frame.srcDoc, /parent\.document\.body/u)
})

test('allows only explicitly approved card resource origins in the frame CSP', () => {
  const source = '<!doctype html><html><body><script>fetch("https://app.example.com/view")</script></body></html>'
  const blocked = compileCardFrameDocument(source, { origin: 'http://127.0.0.1:3091' })
  const approved = compileCardFrameDocument(source, {
    origin: 'http://127.0.0.1:3091',
    character: {
      id: 'character-test', approvedRemoteResourceOrigins: ['https://app.example.com'],
      displayExtensions: [], imageAssets: [],
    } as never,
  })
  assert.match(blocked, /connect-src 'none'/u)
  assert.match(approved, /connect-src https:\/\/app\.example\.com/u)
})

test('recognizes a complete frontend document mislabeled as fenced text', () => {
  const source = [
    '```text',
    '<!doctype html><html><head><style>body{margin:0}</style></head><body>panel</body></html>',
    '```',
  ].join('\n')
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [{
    kind: 'html',
    source: '<!doctype html><html><head><style>body{margin:0}</style></head><body>panel</body></html>\n',
  }])
  assert.deepEqual(compiled.diagnostics, [{ code: 'frontend-document', count: 1 }])
})

test('keeps an ordinary HTML snippet in a fenced text sample inert', () => {
  const source = '```text\n<div>example markup</div>\n```'
  const compiled = compileCharacterDisplay(source)

  assert.deepEqual(compiled.segments, [{ kind: 'markdown', text: source }])
  assert.deepEqual(compiled.diagnostics, [])
})
