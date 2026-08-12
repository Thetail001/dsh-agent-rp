import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from '../src/config.ts'
import { renderCharacterPrompt, renderMemoryContext } from '../src/prompt.ts'

test('makes the top-level Agent the character and permits concise silence', () => {
  const prompt = renderCharacterPrompt(resolveConfig({ characterName: '小满' }))

  assert.match(prompt, /你是小满/u)
  assert.match(prompt, /不是旁白/u)
  assert.match(prompt, /短答、停顿或暂不追问/u)
  assert.match(prompt, /普通寒暄/u)
  assert.match(prompt, /先调用 remember/u)
  assert.match(prompt, /不存在的共同经历/u)
  assert.doesNotMatch(prompt, /狼人|主持人|子代理/u)
})

test('renders an explicit empty memory snapshot', () => {
  assert.equal(renderMemoryContext([]), '当前没有已记录的持久记忆。')
})
