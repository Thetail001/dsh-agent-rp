import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CharacterLibrary } from '../src/character-library.ts'
import { parseCharacterCardJsonBytes } from '../src/import/character-card.ts'

test('keeps one exact reusable Character Card asset with selectable greetings', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-library-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const data = new Uint8Array(readFileSync('tests/fixtures/manual-character-card.json'))
  const card = parseCharacterCardJsonBytes(data)
  const library = new CharacterLibrary({ root })

  const first = library.import({
    data,
    filename: '白露.json',
    mediaType: 'application/json',
    card,
    transport: { transport: 'json' },
  })
  const duplicate = library.import({
    data,
    filename: 'renamed.json',
    mediaType: 'application/json',
    card,
    transport: { transport: 'json' },
  })

  assert.equal(duplicate.id, first.id)
  assert.deepEqual(library.list(), [{
    id: first.id,
    name: '白露',
    displayName: '白露',
    cardVersion: 2,
    greetingCount: 2,
    worldInfoCount: 0,
    avatarAvailable: false,
    transport: 'json',
    updatedAt: first.updatedAt,
  }])
  assert.deepEqual(library.get(first.id).greetings, [
    '门还没锁，你进来吧。',
    '今天来得很早。',
  ])
  assert.deepEqual(library.asset(first.id).data, data)
})
