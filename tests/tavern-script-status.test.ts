import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  TavernScriptStatusList,
  type TavernScriptStatusEntry,
} from '../src/client/tavern-script-status.tsx'

test('shows one failed background script beside every ready Tavern script', () => {
  const entries: TavernScriptStatusEntry[] = [
    ...Array.from({ length: 6 }, (_, index) => ({
      key: `ready-${index}`,
      name: `正常脚本 ${index + 1}`,
      scope: index < 4 ? 'preset' as const : 'character' as const,
      phase: 'ready' as const,
    })),
    {
      key: 'failed-background',
      name: '后台变量脚本',
      scope: 'character',
      phase: 'load-error',
      error: '缺少已声明的模块入口',
    },
  ]

  const markup = renderToStaticMarkup(createElement(TavernScriptStatusList, { entries }))

  assert.match(markup, /<details open="" data-agent-rp-tavern-local-status/u)
  assert.match(markup, /运行状态 6\/7 · 1 个失败/u)
  assert.equal((markup.match(/data-agent-rp-tavern-local-phase="ready"/gu) ?? []).length, 6)
  assert.match(markup, /后台变量脚本/u)
  assert.match(markup, /角色 · 加载失败/u)
  assert.match(markup, /缺少已声明的模块入口/u)
})

test('bounds local errors without adding them to compatibility diagnostics', () => {
  const markup = renderToStaticMarkup(createElement(TavernScriptStatusList, { entries: [{
    key: 'failed', name: '脚本', scope: 'preset', phase: 'runtime-error', error: 'x'.repeat(2_100),
  }] }))

  assert.match(markup, /预设 · 运行失败/u)
  assert.match(markup, /x{2000}…/u)
  assert.doesNotMatch(markup, /x{2001}/u)
  assert.doesNotMatch(markup, /data-agent-rp-tavern-phase=/u)
})
