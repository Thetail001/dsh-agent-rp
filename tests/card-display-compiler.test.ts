import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compileCharacterDisplay,
  normalizeLegacyCardHtml,
} from '../src/card-display-compiler.ts'

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
