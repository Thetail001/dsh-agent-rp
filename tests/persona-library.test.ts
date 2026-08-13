import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { PersonaLibrary } from '../src/persona-library.ts'

test('creates, updates, and removes reusable Persona entries without changing their id', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-persona-library-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const library = new PersonaLibrary({ root })

  const created = library.save({ format: 0, name: ' 小满 ', description: ' 怕冷，喜欢旧书。 ' })
  const updated = library.save({ format: 0, id: created.id, name: '小满', description: '喜欢旧书。' })

  assert.equal(updated.id, created.id)
  assert.equal(updated.name, '小满')
  assert.equal(updated.description, '喜欢旧书。')
  assert.deepEqual(library.list(), [updated])
  assert.deepEqual(library.remove(updated.id), updated)
  assert.deepEqual(library.list(), [])
  assert.throws(() => { library.get(updated.id) }, /无法读取 Persona 文件/u)
})
