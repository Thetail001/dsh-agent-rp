import { writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { encode as encodeTextChunk } from 'png-chunk-text'

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(name, data) {
  const type = Buffer.from(name, 'ascii')
  const payload = Buffer.from(data)
  const output = Buffer.alloc(12 + payload.length)
  output.writeUInt32BE(payload.length, 0)
  type.copy(output, 4)
  payload.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([type, payload])), 8 + payload.length)
  return output
}

const card = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: '白露',
    nickname: '露露',
    description: '住在临海小城的钟表匠。',
    personality: '沉静，偶尔会开一个很轻的玩笑。',
    scenario: '傍晚的修理铺刚刚打烊。',
    first_mes: '门还没锁，你进来吧。',
    mes_example: '',
    creator_notes: 'Agent RP 本地互操作测试卡',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: ['今天来得很早。'],
    tags: ['fixture'],
    creator: 'Agent RP fixture',
    character_version: '1',
    extensions: { 'agent-rp/fixture': true },
    group_only_greetings: [],
    character_book: {
      extensions: {},
      entries: [{
        keys: ['旧钟楼'],
        content: '旧钟楼每天午夜停摆一分钟。',
        extensions: {},
        enabled: true,
        insertion_order: 10,
        use_regex: false,
      }],
    },
  },
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(1, 0)
ihdr.writeUInt32BE(1, 4)
ihdr[8] = 8
ihdr[9] = 2
const encoded = encodeTextChunk('ccv3', Buffer.from(JSON.stringify(card), 'utf8').toString('base64'))
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk(encoded.name, encoded.data),
  chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0]))),
  chunk('IEND', Buffer.alloc(0)),
])
await writeFile(new URL('./manual-character-card.png', import.meta.url), png)
