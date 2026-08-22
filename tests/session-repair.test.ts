import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { constants, zstdCompressSync, type ZstdOptions } from 'node:zlib'
import { repairAgentRpSessionFile } from '../src/session-repair.ts'

const options: ZstdOptions = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

function frame(value: unknown): Buffer {
  const lines = (Array.isArray(value) ? value : [value]).map(item => JSON.stringify(item)).join('\n') + '\n'
  return zstdCompressSync(Buffer.from(lines), options)
}

test('repairs only known legacy events in a chosen multi-frame session and keeps a byte backup', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rp-session-repair-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'session.jsonl.zstd')
  const original = Buffer.concat([
    frame({ type: 'session', version: 0, id: 'fixture', createdAt: 1, delegationDepth: 0 }),
    frame([
      { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
      { type: 'agent-rp/turn-settlement', seq: 1, time: 2, data: { format: 0 } },
      { type: 'agent-rp/state', seq: 2, time: 3, data: { format: 0 }, ignorable: true },
    ]),
  ])
  await writeFile(path, original)

  const inspected = await repairAgentRpSessionFile(path)
  assert.equal(inspected.applied, false)
  assert.equal(inspected.repairedEvents, 1)
  assert.equal(inspected.alreadySafeEvents, 1)
  assert.deepEqual(await readFile(path), original)

  const repaired = await repairAgentRpSessionFile(path, { apply: true })
  assert.equal(repaired.applied, true)
  assert.equal(repaired.repairedEvents, 1)
  assert.ok(repaired.backupPath)
  assert.deepEqual(await readFile(repaired.backupPath), original)
  const verified = await repairAgentRpSessionFile(path)
  assert.equal(verified.repairedEvents, 0)
  assert.equal(verified.alreadySafeEvents, 2)
})

test('refuses unknown Agent RP events without changing the file', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rp-session-repair-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const path = join(directory, 'session.jsonl')
  const original = Buffer.from([
    JSON.stringify({ type: 'session', version: 0, id: 'fixture', createdAt: 1, delegationDepth: 0 }),
    JSON.stringify({ type: 'agent-rp/future-required-state', seq: 0, time: 1, data: {} }),
    '',
  ].join('\n'))
  await writeFile(path, original)

  await assert.rejects(repairAgentRpSessionFile(path, { apply: true }), /不认识的 Agent RP 事件/u)
  assert.deepEqual(await readFile(path), original)
})
