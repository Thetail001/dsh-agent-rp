import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  cleanGeneratedArtifacts, isGeneratedArtifactName, isScratchArtifactName,
} from '../scripts/clean-generated.ts'

test('classifies reproducible root artifacts without matching retained workspace data', () => {
  for (const name of [
    '.audit-dist', '.benchmark-dist', '.diagnose-dist', '.inspect-regex-dist', '.probe-runtime-v2',
    '.runtime', '.runtime-web-3091.err.log', '.test-dist', '.test-card-frame', 'package.tgz',
  ]) assert.equal(isGeneratedArtifactName(name), true, name)
  for (const name of [
    '.git', '.tmp', '.tmp-phone-events', 'docs', 'lib', 'node_modules', 'package.json', 'references',
  ]) assert.equal(isGeneratedArtifactName(name), false, name)
  for (const name of ['.tmp', '.tmp-phone-events']) assert.equal(isScratchArtifactName(name), true, name)
  for (const name of ['.temp', '.test-dist', 'tmp']) assert.equal(isScratchArtifactName(name), false, name)
})

test('removes only matched root entries and supports a non-mutating preview', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-clean-'))
  t.after(async () => { await rm(root, { recursive: true, force: true }) })
  await mkdir(join(root, '.test-dist'))
  await writeFile(join(root, '.test-dist', 'output.js'), 'generated')
  await mkdir(join(root, '.tmp', 'references'), { recursive: true })
  await writeFile(join(root, '.tmp', 'references', 'keep.txt'), 'reference')

  assert.deepEqual(await cleanGeneratedArtifacts(root, { dryRun: true }), ['.test-dist'])
  assert.equal(await readFile(join(root, '.test-dist', 'output.js'), 'utf8'), 'generated')
  assert.deepEqual(await cleanGeneratedArtifacts(root), ['.test-dist'])
  await assert.rejects(readFile(join(root, '.test-dist', 'output.js'), 'utf8'))
  assert.equal(await readFile(join(root, '.tmp', 'references', 'keep.txt'), 'utf8'), 'reference')
})

test('removes scratch only when explicitly requested without following directory links', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-rp-clean-scratch-'))
  const external = await mkdtemp(join(tmpdir(), 'agent-rp-clean-external-'))
  t.after(async () => {
    await rm(root, { recursive: true, force: true })
    await rm(external, { recursive: true, force: true })
  })
  await mkdir(join(root, '.tmp', 'references'), { recursive: true })
  await writeFile(join(root, '.tmp', 'references', 'remove.txt'), 'scratch')
  await mkdir(join(root, '.tmp-phone-events'))
  await writeFile(join(root, '.tmp-phone-events', 'remove.txt'), 'scratch')
  await writeFile(join(external, 'keep.txt'), 'external')
  await symlink(external, join(root, '.tmp', 'linked-workspace'), process.platform === 'win32' ? 'junction' : 'dir')

  assert.deepEqual(await cleanGeneratedArtifacts(root, { dryRun: true, scratch: true }), [
    '.tmp', '.tmp-phone-events',
  ])
  assert.equal(await readFile(join(root, '.tmp', 'references', 'remove.txt'), 'utf8'), 'scratch')
  assert.deepEqual(await cleanGeneratedArtifacts(root, { scratch: true }), ['.tmp', '.tmp-phone-events'])
  await assert.rejects(readFile(join(root, '.tmp', 'references', 'remove.txt'), 'utf8'))
  assert.equal(await readFile(join(external, 'keep.txt'), 'utf8'), 'external')
})
