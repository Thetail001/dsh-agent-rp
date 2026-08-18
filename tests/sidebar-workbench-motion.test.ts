import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
const resourceCenterSource = readFileSync(new URL('../src/client/resource-center.tsx', import.meta.url), 'utf8')

test('sidebar workbench declares entry motion and reduced-motion fallback', () => {
  assert.match(source, /\[data-agent-rp-action='open-workbench'\]:active \{ transform: scale\(\.94\); \}/u)
  assert.match(source, /@keyframes agent-rp-workbench-mask-in/u)
  assert.match(source, /@keyframes agent-rp-workbench-panel-in/u)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/u)
  assert.match(source, /data-agent-rp-workbench-dismiss/u)
  assert.match(source, /data-agent-rp-destination-icon/u)
  assert.match(source, /ctx\.slots\.inject\('sidebar\.destinations'/u)
  assert.match(source, /ctx\.slots\.inject\('sidebar\.footer\.action'/u)
  assert.match(source, /ctx\.slots\.spec\('sidebar\.destinations'\)/u)
  assert.match(source, /data-agent-rp-sidebar-slot="footer-action"/u)
  assert.match(source, /onClickCapture=\{update\}/u)
})

test('sidebar workbench owns current-workspace access while global settings stay advanced', () => {
  assert.match(source, /data-agent-rp-workspace-access/u)
  assert.match(source, /data-agent-rp-action="toggle-workspace-access"/u)
  assert.match(source, /当前工作区可直接在侧栏工作台切换/u)
  assert.match(source, /工作区入口范围（高级）/u)
})

test('roleplay launch keeps collection management secondary to choosing a character', () => {
  assert.match(source, /data-agent-rp-character-launcher/u)
  assert.match(source, /aria-label="开始角色对话"/u)
  assert.match(source, /data-agent-rp-character-toolbar/u)
  assert.match(source, /open-character-archive/u)
  assert.match(source, /data-agent-rp-action="import-character"/u)
  assert.doesNotMatch(source, /aria-label="角色库分区"/u)
})

test('sidebar exposes one resource-center drilldown for peer resource types', () => {
  assert.match(source, /data-agent-rp-action="open-resource-center"/u)
  assert.match(source, /角色、世界书、预设与 Persona/u)
  assert.doesNotMatch(source, />内容层级</u)
  assert.match(resourceCenterSource, /data-agent-rp-surface="resource-center"/u)
  assert.match(resourceCenterSource, /aria-label="Agent RP 资源中心"/u)
  assert.match(resourceCenterSource, /\['characters', 'world-info', 'presets', 'personas'\]/u)
  assert.match(resourceCenterSource, /角色卡与收藏状态/u)
  assert.match(resourceCenterSource, /独立世界书来源/u)
  assert.match(resourceCenterSource, /可复用的对话预设/u)
  assert.match(resourceCenterSource, /玩家身份与人物设定/u)
})
