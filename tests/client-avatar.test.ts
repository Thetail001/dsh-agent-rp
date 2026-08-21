import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRoleplayAvatarSource } from '../src/client/avatar-source.ts'

test('waits for positive library metadata before requesting an optional avatar', () => {
  assert.deepEqual(resolveRoleplayAvatarSource({ libraryId: 'card-a' }), { kind: 'fallback' })
  assert.deepEqual(resolveRoleplayAvatarSource({ libraryId: 'card-a', libraryAvatarAvailable: false }), {
    kind: 'fallback',
  })
  assert.deepEqual(resolveRoleplayAvatarSource({ libraryId: 'card-a', libraryAvatarAvailable: true }), {
    kind: 'library', id: 'card-a',
  })
})

test('keeps explicit images ahead of library and legacy attachment sources', () => {
  assert.deepEqual(resolveRoleplayAvatarSource({
    imageUrl: '/expression/1', libraryId: 'card-a', libraryAvatarAvailable: false, attachmentId: 'attachment-a',
  }), { kind: 'direct', url: '/expression/1' })
  assert.deepEqual(resolveRoleplayAvatarSource({ attachmentId: 'attachment-a' }), {
    kind: 'attachment', id: 'attachment-a',
  })
})
