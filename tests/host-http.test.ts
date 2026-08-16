import { strict as assert } from 'node:assert'
import type { IncomingMessage } from 'node:http'
import { Readable } from 'node:stream'
import test from 'node:test'
import {
  readBoundedRequestBody,
  readJsonRequest,
  trustedBrowserRequest,
} from '../src/host-http.ts'

function request(
  headers: IncomingMessage['headers'],
  chunks: readonly (string | Uint8Array)[] = [],
): IncomingMessage {
  return Object.assign(Readable.from(chunks), { headers }) as unknown as IncomingMessage
}

test('accepts only same-origin browser requests and the exact sandboxed image exception', () => {
  assert.equal(trustedBrowserRequest(request({ host: '127.0.0.1:3091' })), true)
  assert.equal(trustedBrowserRequest(request({
    host: '127.0.0.1:3091', origin: 'http://127.0.0.1:3091', 'sec-fetch-site': 'same-origin',
  })), true)
  assert.equal(trustedBrowserRequest(request({
    host: '127.0.0.1:3091', origin: 'https://example.com', 'sec-fetch-site': 'cross-site',
  })), false)
  const sandboxedImage = request({
    host: '127.0.0.1:3091',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-dest': 'image',
    'sec-fetch-mode': 'no-cors',
  })
  assert.equal(trustedBrowserRequest(sandboxedImage), false)
  assert.equal(trustedBrowserRequest(sandboxedImage, true), true)
  assert.equal(trustedBrowserRequest(request({
    host: '127.0.0.1:3091',
    origin: 'null',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-dest': 'image',
    'sec-fetch-mode': 'no-cors',
  }), true), false)
})

test('bounds declared and streamed request bodies and rejects empty input', async () => {
  const options = { limit: 4, emptyMessage: 'empty', tooLargeMessage: 'large' }
  await assert.rejects(readBoundedRequestBody(request({ 'content-length': '5' }), options), /large/u)
  await assert.rejects(readBoundedRequestBody(request({}, ['123', '45']), options), /large/u)
  await assert.rejects(readBoundedRequestBody(request({}), options), /empty/u)
  assert.equal((await readBoundedRequestBody(request({}, ['1234']), options)).toString('utf8'), '1234')
})

test('reports stable JSON decoding failures after bounded body validation', async () => {
  const options = {
    limit: 16,
    emptyMessage: 'empty',
    tooLargeMessage: 'large',
    invalidMessage: 'invalid',
  }
  assert.deepEqual(await readJsonRequest(request({}, ['{"ok":true}']), options), { ok: true })
  await assert.rejects(readJsonRequest(request({}, ['{']), options), /invalid/u)
})
