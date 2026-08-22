import assert from 'node:assert/strict'
import test from 'node:test'

import type { CharacterImportMeta } from '../src/import/session-character.ts'
import {
  createWorldbookCharacterContextRegistry,
  worldbookCharacterContext,
} from '../src/worldbook-character-context.ts'

function meta(raw: CharacterImportMeta['raw']): CharacterImportMeta {
  return {
    format: 0,
    result: {
      version: 0,
      name: '角色显示名',
      cardVersion: 3,
      sourceEventSeq: 1,
      sourceAttachmentId: 'fixture',
      transport: 'png',
      metadataKeyword: 'ccv3',
      greetingIndex: 0,
      selectedGreeting: '',
      degradations: [],
    },
    raw,
  }
}

test('projects the SillyTavern filename and deduplicated tags for character filters', () => {
  assert.deepEqual(worldbookCharacterContext(meta({
    spec: 'chara_card_v3',
    data: { tags: ['magic', ' magic ', 'science', 42] },
  }), 'Railgun.profile.png'), {
    name: 'Railgun.profile',
    tags: ['magic', 'science'],
  })
  assert.deepEqual(worldbookCharacterContext(meta({}), undefined), {
    name: '角色显示名', tags: [],
  })
})

test('unregisters only the matching live session contribution', () => {
  const registry = createWorldbookCharacterContextRegistry()
  const first = registry.register('session', () => ({ name: 'first', tags: [] }))
  const second = registry.register('session', () => ({ name: 'second', tags: ['active'] }))
  first()
  assert.deepEqual(registry.getCurrentCharacter('session'), { name: 'second', tags: ['active'] })
  second()
  assert.equal(registry.getCurrentCharacter('session'), undefined)
})
