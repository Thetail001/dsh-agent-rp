import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  compileStoryCharacterContext,
  createStoryCharacterId,
  createStorySectionId,
  createStorySourceId,
  StoryWorkspaceStore,
} from '../src/story-workspace.ts'
import { searchStoryWorkspaceSources } from '../src/story-research.ts'

test('persists editable story documents and rejects stale whole-workspace writes', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-story-workspace-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const store = new StoryWorkspaceStore({ root })
  const created = store.create({ format: 0, name: ' 长夜 ' })
  const characterId = createStoryCharacterId()
  const sectionId = createStorySectionId()
  const sourceId = createStorySourceId()
  assert.deepEqual(created.manifest.pipeline, { maxParallel: 4 })
  const saved = store.save({
    format: 0,
    id: created.manifest.id,
    revision: created.manifest.revision,
    name: '长夜',
    pipeline: { maxParallel: 3, workerModel: { provider: 'fast', model: 'story' } },
    characters: [{ id: characterId, name: '小满', enabled: true }],
    sections: [{ id: sectionId, name: '正文', kind: 'prose', enabled: true }],
    sources: [{ id: sourceId, name: '原著摘录', kind: 'original', enabled: true }],
    documents: {
      outline: '先在车站重逢。',
      foreshadowing: '旧车票尚未揭晓。',
      proposals: '',
      history: '两人曾在冬天分别。',
      characters: [{ id: characterId, persona: '怕冷，谨慎。', knowledge: '她知道车票背面的字。' }],
      sections: [{ id: sectionId, content: '夜班车尚未到站。' }],
      sources: [{ id: sourceId, content: '原著中的车站终年落雪。' }],
    },
  })

  assert.equal(saved.manifest.revision, 1)
  assert.deepEqual(saved.manifest.pipeline, {
    maxParallel: 3,
    workerModel: { provider: 'fast', model: 'story' },
  })
  assert.deepEqual(new StoryWorkspaceStore({ root }).get(saved.manifest.id), saved)
  assert.equal(readFileSync(join(root, saved.manifest.id, 'outline.md'), 'utf8'), '先在车站重逢。')
  assert.throws(() => store.save({
    format: 0,
    id: created.manifest.id,
    revision: 0,
    name: '过期编辑',
    pipeline: saved.manifest.pipeline,
    characters: saved.manifest.characters,
    sections: saved.manifest.sections,
    sources: saved.manifest.sources,
    documents: saved.documents,
  }), /当前 revision 为 1/u)
})

test('compiles one character context without director or another character private knowledge', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-character-context-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const store = new StoryWorkspaceStore({ root })
  const created = store.create({ format: 0, name: '认知隔离' })
  const aliceId = createStoryCharacterId()
  const bobId = createStoryCharacterId()
  const workspace = store.save({
    format: 0,
    id: created.manifest.id,
    revision: 0,
    name: '认知隔离',
    pipeline: { maxParallel: 2 },
    characters: [
      { id: aliceId, name: '阿梨', enabled: true },
      { id: bobId, name: '柏舟', enabled: true },
    ],
    sections: [],
    sources: [],
    documents: {
      outline: '导演秘密：下一幕桥会断。',
      foreshadowing: '导演秘密：怀表是钥匙。',
      proposals: '',
      history: '所有人都看见雨停了。',
      characters: [
        { id: aliceId, persona: '阿梨遇事先观察。', knowledge: '阿梨私密：她认得旧徽章。' },
        { id: bobId, persona: '柏舟说话直接。', knowledge: '柏舟私密：他藏起了地图。' },
      ],
      sections: [],
      sources: [],
    },
  })

  const compiled = compileStoryCharacterContext(workspace, aliceId, {
    playerInput: '玩家问阿梨是否见过这枚徽章。',
  })

  assert.match(compiled.text, /阿梨私密：她认得旧徽章/u)
  assert.doesNotMatch(compiled.text, /所有人都看见雨停了/u)
  assert.doesNotMatch(compiled.text, /柏舟私密/u)
  assert.doesNotMatch(compiled.text, /桥会断/u)
  assert.doesNotMatch(compiled.text, /怀表是钥匙/u)
})

test('materializes one turn into global history and only explicitly observed character knowledge', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-story-materialization-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const store = new StoryWorkspaceStore({ root })
  const created = store.create({ format: 0, name: '回合沉淀' })
  const aliceId = createStoryCharacterId()
  const bobId = createStoryCharacterId()
  const workspace = store.save({
    format: 0,
    id: created.manifest.id,
    revision: 0,
    name: '回合沉淀',
    pipeline: { maxParallel: 2 },
    characters: [
      { id: aliceId, name: '阿梨', enabled: true },
      { id: bobId, name: '柏舟', enabled: true },
    ],
    sections: [],
    sources: [],
    documents: {
      outline: '保持原大纲。',
      foreshadowing: '保持原伏笔。',
      proposals: '',
      history: '',
      characters: [
        { id: aliceId, persona: '谨慎。', knowledge: '认得徽章。' },
        { id: bobId, persona: '直接。', knowledge: '藏起车票。' },
      ],
      sections: [],
      sources: [],
    },
  })

  const materialized = store.materializeTurn(workspace.manifest.id, {
    key: 'session-1:turn-1',
    heading: '回合 1',
    history: '阿梨在门廊举起徽章。',
    observations: [{ characterId: aliceId, text: '阿梨看见门廊外已经停雨。' }],
    proposals: '### 伏笔提案\n\n- 后续可以回收徽章来历。',
  })

  assert.equal(materialized.manifest.revision, workspace.manifest.revision + 1)
  assert.match(materialized.documents.history, /阿梨在门廊举起徽章/u)
  assert.match(materialized.documents.proposals, /后续可以回收徽章来历/u)
  assert.equal(materialized.documents.outline, '保持原大纲。')
  assert.equal(materialized.documents.foreshadowing, '保持原伏笔。')
  assert.match(materialized.documents.characters.find(character => character.id === aliceId)!.knowledge, /门廊外已经停雨/u)
  assert.doesNotMatch(materialized.documents.characters.find(character => character.id === bobId)!.knowledge, /门廊外已经停雨/u)

  const replayed = store.materializeTurn(workspace.manifest.id, {
    key: 'session-1:turn-1',
    heading: '回合 1',
    history: '不应重复追加。',
    observations: [{ characterId: aliceId, text: '不应重复追加。' }],
    proposals: '不应重复追加。',
  })
  assert.equal(replayed.manifest.revision, materialized.manifest.revision)
  assert.doesNotMatch(replayed.documents.history, /不应重复追加/u)
})

test('opaque ids prevent workspace and child paths from escaping the configured root', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-story-paths-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const store = new StoryWorkspaceStore({ root })

  assert.throws(() => store.get('../outside'), /id 无效/u)
  assert.equal(existsSync(join(root, '..', 'outside')), false)
})

test('retrieves the most relevant bounded original excerpts before model research', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-agent-rp-story-search-'))
  context.after(() => { rmSync(root, { recursive: true, force: true }) })
  const store = new StoryWorkspaceStore({ root })
  const created = store.create({ format: 0, name: '原著检索' })
  const firstId = createStorySourceId()
  const secondId = createStorySourceId()
  const workspace = store.save({
    format: 0,
    id: created.manifest.id,
    revision: 0,
    name: '原著检索',
    pipeline: { maxParallel: 2 },
    characters: [],
    sections: [],
    sources: [
      { id: firstId, name: '第一卷', kind: 'original', enabled: true },
      { id: secondId, name: '第二卷', kind: 'original', enabled: true },
    ],
    documents: {
      outline: '', foreshadowing: '', proposals: '', history: '', characters: [], sections: [],
      sources: [
        { id: firstId, content: '春日的集市很热闹。\n\n旧钟楼在午夜敲了十二下。' },
        { id: secondId, content: '雪原尽头的车站没有售票员。\n\n阿梨把旧车票藏进怀表。' },
      ],
    },
  })

  const result = searchStoryWorkspaceSources(workspace, '阿梨手里的怀表和车票', 80)
  assert.match(result, /第二卷/u)
  assert.match(result, /旧车票藏进怀表/u)
  assert.equal(result.length <= 80, true)
})
