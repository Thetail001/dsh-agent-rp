import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWorkspacePath, sameWorkspacePath } from '../src/session-launch-http.ts'

test('normalizes trailing path separators', () => {
  assert.equal(normalizeWorkspacePath('/workspace/'), normalizeWorkspacePath('/workspace'))
  assert.equal(sameWorkspacePath('/workspace/', '/workspace'), true)
  assert.equal(sameWorkspacePath('/workspace', '/workspace/'), true)
})

test('treats repeated leading separators as the posix root', () => {
  assert.equal(sameWorkspacePath('/', '//'), true)
})

test('normalizes windows drive paths with mixed separators and case', () => {
  assert.equal(normalizeWorkspacePath('C:\\Workspace\\'), normalizeWorkspacePath('c:/workspace'))
  assert.equal(sameWorkspacePath('C:\\Workspace\\', 'c:/workspace'), true)
})

test('treats drive roots as equivalent regardless of separator', () => {
  assert.equal(sameWorkspacePath('C:\\', 'C:/'), true)
})

test('normalizes unc share paths', () => {
  assert.equal(normalizeWorkspacePath('\\\\Server\\Share\\'), normalizeWorkspacePath('\\\\server\\share'))
  assert.equal(sameWorkspacePath('\\\\Server\\Share\\', '\\\\server\\share'), true)
})

test('keeps posix paths case-sensitive when the host path namespace does', {
  skip: process.platform === 'win32',
}, () => {
  assert.equal(sameWorkspacePath('/Workspace', '/workspace'), false)
})

test('empty paths never match', () => {
  assert.equal(sameWorkspacePath('', '/'), false)
  assert.equal(sameWorkspacePath('', ''), false)
})
