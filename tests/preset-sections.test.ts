import assert from 'node:assert/strict'
import test from 'node:test'
import { presetDividerTitle, projectPresetPromptSections } from '../src/preset-sections.ts'

test('recognizes author-defined preset dividers without changing their prompt entries', () => {
  assert.equal(presetDividerTitle('----📝文风要求(选一)————'), '📝文风要求(选一)')
  assert.equal(presetDividerTitle('ordinary prompt'), undefined)

  const prompts = [
    { identifier: 'main', name: 'Main Prompt', attached: true, enabled: true },
    { identifier: 'style-heading', name: '----文风要求————', attached: true, enabled: false },
    { identifier: 'style-a', name: '克制', attached: true, enabled: true },
    { identifier: 'style-b', name: '明快', attached: true, enabled: false },
    { identifier: 'custom', name: '我的提示', attached: true, enabled: true, imported: false },
    { identifier: 'extra', name: '额外模块', attached: false, enabled: false },
  ] as const

  const sections = projectPresetPromptSections(prompts)
  assert.deepEqual(sections.map(section => ({
    key: section.key,
    title: section.title,
    enabledCount: section.enabledCount,
    identifiers: section.prompts.map(prompt => prompt.identifier),
  })), [
    { key: 'base', title: '基础提示', enabledCount: 1, identifiers: ['main'] },
    { key: 'section:style-heading', title: '文风要求', enabledCount: 1, identifiers: ['style-heading', 'style-a', 'style-b'] },
    { key: 'custom', title: '自定义模块', enabledCount: 1, identifiers: ['custom'] },
  ])
})

test('keeps catalog modules out of active-order presentation groups', () => {
  const sections = projectPresetPromptSections([
    { identifier: 'active', name: '当前模块', attached: true, enabled: true },
    { identifier: 'choice-a', name: '备选文风 A', attached: false, enabled: false },
    { identifier: 'choice-b', name: '备选文风 B', attached: false, enabled: false },
  ])

  assert.deepEqual(sections.map(section => section.prompts.map(prompt => prompt.identifier)), [['active']])
})
