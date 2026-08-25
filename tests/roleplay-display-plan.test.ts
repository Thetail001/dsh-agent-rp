import assert from 'node:assert/strict'
import test from 'node:test'
import type { ImportedCharacterFrontend, ImportedRegexScript } from '../src/import/types.ts'
import {
  createRoleplayDisplayPlanner,
  ROLEPLAY_STATUS_PLACEHOLDER,
  type RoleplayDisplayMessage,
  type RoleplayDisplayProjection,
} from '../src/roleplay-display-plan.ts'

const messages: readonly RoleplayDisplayMessage[] = [
  { messageId: 0, seq: 10, role: 'user', text: '藤子', isHidden: false },
  { messageId: 1, seq: 20, role: 'assistant', text: '原回复', isHidden: false },
  { messageId: 2, seq: 21, role: 'assistant', text: '备选回复', isHidden: false },
]

const projection: RoleplayDisplayProjection = {
  characterName: '角色',
  userName: '用户',
  tavern: { messages },
  generations: [],
}

const frontend: ImportedCharacterFrontend = {
  regexScripts: [],
  tavernHelperScriptNames: [],
  tavernHelperScripts: [],
  tavernHelperVariables: {},
}

function displayScript(partial: Partial<ImportedRegexScript> = {}): ImportedRegexScript {
  return {
    scriptName: '着色',
    findRegex: '/藤子/g',
    replaceString: '<span style="color:#d9b36c">$&</span>',
    trimStrings: [],
    placement: [1],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
    ...partial,
  }
}

test('leaves rows on the Host renderer when immersive display work is absent', () => {
  const planner = createRoleplayDisplayPlanner({ projection, frontend, immersive: true, overrides: new Map() })
  assert.deepEqual(planner.user({ seq: 10 }), { kind: 'host' })
  assert.deepEqual(planner.assistant({ finalSeq: 20, blockText: '原回复' }), { kind: 'host' })
})

test('plans user display regexes without reading a rendered DSH row', () => {
  const planner = createRoleplayDisplayPlanner({
    projection,
    frontend: { ...frontend, regexScripts: [displayScript()] },
    immersive: true,
    overrides: new Map(),
  })
  const plan = planner.user({ seq: 10 })
  assert.equal(plan.kind, 'render')
  if (plan.kind !== 'render') return
  assert.equal(plan.source, 'display-regex')
  assert.deepEqual(plan.compilation.segments, [{
    kind: 'inline-html', source: '<span style="color:#d9b36c">藤子</span>',
  }])
})

test('keeps display regexes inactive in debug view while honoring explicit script overrides', () => {
  const planner = createRoleplayDisplayPlanner({
    projection,
    frontend: { ...frontend, regexScripts: [displayScript()] },
    immersive: false,
    overrides: new Map([[0, '<!doctype html><html><body>脚本展示</body></html>']]),
  })
  const plan = planner.user({ seq: 10 })
  assert.equal(plan.kind, 'render')
  if (plan.kind !== 'render') return
  assert.equal(plan.source, 'override')
  assert.deepEqual(plan.compilation.segments, [{
    kind: 'html', source: '<!doctype html><html><body>脚本展示</body></html>',
  }])
})

test('selects one generation at the stable anchor and hides its superseded rows', () => {
  const withGeneration: RoleplayDisplayProjection = {
    ...projection,
    generations: [{
      anchorSeq: 20,
      selectedVersionSeq: 21,
      assistantSeqs: [20, 21],
      versions: [{ seq: 20, text: '原回复' }, { seq: 21, text: `备选${ROLEPLAY_STATUS_PLACEHOLDER}回复` }],
    }],
  }
  const planner = createRoleplayDisplayPlanner({
    projection: withGeneration, immersive: true, overrides: new Map(),
  })
  assert.deepEqual(planner.assistant({ finalSeq: 21, blockText: '备选回复' }), {
    kind: 'hidden', reason: 'unselected-generation',
  })
  const plan = planner.assistant({ finalSeq: 20, blockText: '原回复' })
  assert.equal(plan.kind, 'render')
  if (plan.kind !== 'render') return
  assert.equal(plan.source, 'selected-generation')
  assert.deepEqual(plan.compilation.segments, [{ kind: 'markdown', text: '备选回复' }])
})

test('uses an aligned imported message when its durable seq cannot identify the visible row', () => {
  const planner = createRoleplayDisplayPlanner({
    projection,
    frontend: { ...frontend, regexScripts: [displayScript({ placement: [2] })] },
    immersive: true,
    overrides: new Map(),
  })
  const aligned: RoleplayDisplayMessage = {
    messageId: 99, seq: 999, role: 'assistant', text: '藤子', isHidden: false,
  }
  const plan = planner.assistant({ blockText: 'Host 文本', alignedMessage: aligned })
  assert.equal(plan.kind, 'render')
  if (plan.kind !== 'render') return
  assert.deepEqual(plan.compilation.segments, [{
    kind: 'inline-html', source: '<span style="color:#d9b36c">藤子</span>',
  }])
})
