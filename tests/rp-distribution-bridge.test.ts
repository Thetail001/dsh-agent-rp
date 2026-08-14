import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeRpDistributionTarget,
  probeRpDistribution,
  transferToRpDistribution,
  type RpDistributionFetch,
} from '../src/rp-distribution-bridge.ts'

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('limits RP distribution transfers to normalized loopback targets', () => {
  assert.equal(normalizeRpDistributionTarget('http://127.0.0.1:3092/'), 'http://127.0.0.1:3092')
  assert.equal(normalizeRpDistributionTarget('http://[::1]:3092'), 'http://[::1]:3092')
  assert.throws(() => normalizeRpDistributionTarget('https://example.com'), /这台电脑/u)
  assert.throws(() => normalizeRpDistributionTarget('http://user:secret@localhost:3092'), /这台电脑/u)
})

test('probes the real modular RP catalog response fields', async () => {
  let requested = ''
  const fetcher: RpDistributionFetch = async (input) => {
    requested = input
    return json({
      schemaVersion: 1,
      generatedAt: 123,
      experiences: [{ id: 'rp-adaptive' }],
      components: [{ id: 'rp.character' }, { id: 'rp.prompt' }],
      capabilities: [{ id: 'rp.import.character' }],
    })
  }
  assert.deepEqual(await probeRpDistribution('http://localhost:3092/', fetcher), {
    target: 'http://localhost:3092',
    generatedAt: 123,
    experienceCount: 1,
    componentCount: 2,
    capabilityCount: 1,
  })
  assert.equal(requested, 'http://localhost:3092/api/rp/v1/catalog')
})

test('preflights and saves one original character source through the published RP API', async () => {
  const calls: { readonly url: string; readonly body: unknown }[] = []
  const fetcher: RpDistributionFetch = async (input, init) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown
    calls.push({ url: input, body })
    if (input.endsWith('/import')) {
      return json({
        kind: 'character-card-json',
        result: {},
        lossReports: [{ path: '$', report: { items: [{ feature: 'tavern-helper' }, { feature: 'regex' }] } }],
      })
    }
    return json({ schemaVersion: 1, characters: [], personas: [], lorebooks: [], action: 'save', assetIds: ['character-1'] })
  }
  const result = await transferToRpDistribution('http://127.0.0.1:3092', {
    kind: 'character-card-json',
    source: '{"name":"白露"}',
    sourceId: '白露.json',
  }, fetcher)

  assert.deepEqual(result, {
    target: 'http://127.0.0.1:3092',
    savedIds: ['character-1'],
    compatibilityDifferenceCount: 2,
  })
  assert.deepEqual(calls, [{
    url: 'http://127.0.0.1:3092/api/rp/v1/import',
    body: { kind: 'character-card-json', source: '{"name":"白露"}', sourceId: '白露.json' },
  }, {
    url: 'http://127.0.0.1:3092/api/rp/v1/library',
    body: { action: 'save', kind: 'character-card-json', source: '{"name":"白露"}', sourceId: '白露.json' },
  }])
})

test('uses the dedicated preset library mutation after compatibility inspection', async () => {
  const bodies: unknown[] = []
  const fetcher: RpDistributionFetch = async (input, init) => {
    bodies.push(init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown)
    return input.endsWith('/import')
      ? json({ kind: 'preset', result: {}, lossReports: [] })
      : json({ schemaVersion: 1, presets: [], action: 'save', presetId: 'preset-1' })
  }
  const result = await transferToRpDistribution('http://localhost:3092', {
    kind: 'preset', source: '{"prompts":[],"prompt_order":[]}', sourceId: 'V18.json',
  }, fetcher)

  assert.deepEqual(result.savedIds, ['preset-1'])
  assert.deepEqual(bodies[1], {
    action: 'save', source: '{"prompts":[],"prompt_order":[]}', sourceId: 'V18.json',
  })
})
