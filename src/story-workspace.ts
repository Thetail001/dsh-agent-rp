/** File-backed story workspaces and character-specific context compilation. */

import { randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type {
  StoryCharacterDocuments,
  StorySectionDocument,
  StorySectionKind,
  StorySourceDocument,
  StorySourceKind,
  StoryPipelineSettings,
  StoryWorkspaceCharacter,
  StoryWorkspaceCreateRequest,
  StoryWorkspaceDocuments,
  StoryWorkspaceManifest,
  StoryWorkspaceSaveRequest,
  StoryWorkspaceSection,
  StoryWorkspaceSnapshot,
  StoryWorkspaceSource,
  StoryWorkspaceSummary,
  StoryTurnMaterialization,
} from './story-workspace-protocol.ts'

const WORKSPACE_ID_PATTERN = /^story-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const CHARACTER_ID_PATTERN = /^character-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const SECTION_ID_PATTERN = /^section-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const SOURCE_ID_PATTERN = /^source-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const MAX_WORKSPACE_BYTES = 16 * 1024 * 1024
const SECTION_KINDS = new Set<StorySectionKind>(['prose', 'character', 'history'])
const SOURCE_KINDS = new Set<StorySourceKind>(['original', 'reference', 'research', 'web'])
const DEFAULT_STORY_PIPELINE: StoryPipelineSettings = { maxParallel: 4 }

interface StoredStoryWorkspaceManifest extends StoryWorkspaceManifest {}

/** Filesystem override used by focused checks and portable deployments. */
export interface StoryWorkspaceStoreOptions {
  readonly root?: string
}

/** Public facts from the current scene that every participating character may observe. */
export interface StoryPublicSceneContext {
  readonly playerInput: string
}

/** Exact private input compiled for one character Worker. */
export interface StoryCharacterContext {
  readonly workspaceId: string
  readonly characterId: string
  readonly characterName: string
  readonly persona: string
  readonly privateKnowledge: string
  readonly playerInput: string
  readonly text: string
}

function cleanName(value: string, subject: string): string {
  const result = value.trim()
  if (result === '' || result.length > 120) throw new Error(`${subject}名称应为 1 至 120 个字符`)
  return result
}

function cleanDocument(value: string, subject: string): string {
  if (Buffer.byteLength(value, 'utf8') > MAX_DOCUMENT_BYTES) {
    throw new Error(`${subject}不能超过 ${String(MAX_DOCUMENT_BYTES)} 字节`)
  }
  return value.replace(/\r\n?/gu, '\n')
}

function assertId(id: string, pattern: RegExp, subject: string): void {
  if (!pattern.test(id)) throw new Error(`${subject} id 无效`)
}

function assertUnique(ids: readonly string[], subject: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${subject} id 重复`)
}

function normalizeCharacters(value: readonly StoryWorkspaceCharacter[]): readonly StoryWorkspaceCharacter[] {
  const result = value.map(character => {
    assertId(character.id, CHARACTER_ID_PATTERN, '人物')
    if (typeof character.enabled !== 'boolean') throw new Error('人物开关无效')
    return { id: character.id, name: cleanName(character.name, '人物'), enabled: character.enabled }
  })
  assertUnique(result.map(character => character.id), '人物')
  return result
}

function normalizeSections(value: readonly StoryWorkspaceSection[]): readonly StoryWorkspaceSection[] {
  const result = value.map(section => {
    assertId(section.id, SECTION_ID_PATTERN, '分区')
    if (!SECTION_KINDS.has(section.kind) || typeof section.enabled !== 'boolean') throw new Error('分区字段无效')
    return { id: section.id, name: cleanName(section.name, '分区'), kind: section.kind, enabled: section.enabled }
  })
  assertUnique(result.map(section => section.id), '分区')
  return result
}

function normalizeSources(value: readonly StoryWorkspaceSource[]): readonly StoryWorkspaceSource[] {
  const result = value.map(source => {
    assertId(source.id, SOURCE_ID_PATTERN, '资料')
    if (!SOURCE_KINDS.has(source.kind) || typeof source.enabled !== 'boolean') throw new Error('资料字段无效')
    return { id: source.id, name: cleanName(source.name, '资料'), kind: source.kind, enabled: source.enabled }
  })
  assertUnique(result.map(source => source.id), '资料')
  return result
}

function normalizePipeline(value: unknown): StoryPipelineSettings {
  if (value === undefined) return DEFAULT_STORY_PIPELINE
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('故事流水线设置不是对象')
  const record = value as Record<string, unknown>
  if (!Number.isSafeInteger(record.maxParallel) || (record.maxParallel as number) < 1
    || (record.maxParallel as number) > 8
    || Object.keys(record).some(key => key !== 'maxParallel' && key !== 'workerModel')) {
    throw new Error('故事流水线并发数应为 1 至 8')
  }
  if (record.workerModel === undefined) return { maxParallel: record.maxParallel as number }
  if (typeof record.workerModel !== 'object' || record.workerModel === null || Array.isArray(record.workerModel)) {
    throw new Error('故事 Worker 模型路由不是对象')
  }
  const route = record.workerModel as Record<string, unknown>
  if (typeof route.provider !== 'string' || typeof route.model !== 'string'
    || Object.keys(route).some(key => key !== 'provider' && key !== 'model')) {
    throw new Error('故事 Worker 模型路由字段无效')
  }
  const provider = route.provider.trim()
  const model = route.model.trim()
  if (provider === '' && model === '') return { maxParallel: record.maxParallel as number }
  if (provider === '' || model === '' || provider.length > 200 || model.length > 200) {
    throw new Error('故事 Worker provider 与 model 必须同时填写且不超过 200 个字符')
  }
  return { maxParallel: record.maxParallel as number, workerModel: { provider, model } }
}

function normalizeCharacterDocuments(
  value: readonly StoryCharacterDocuments[],
  characters: readonly StoryWorkspaceCharacter[],
): readonly StoryCharacterDocuments[] {
  assertUnique(value.map(document => document.id), '人物文档')
  const byId = new Map(value.map(document => [document.id, document]))
  if (byId.size !== characters.length || characters.some(character => !byId.has(character.id))) {
    throw new Error('人物文档必须与人物清单一一对应')
  }
  return characters.map(character => {
    const document = byId.get(character.id)!
    return {
      id: character.id,
      persona: cleanDocument(document.persona, '人物 Persona'),
      knowledge: cleanDocument(document.knowledge, '人物私有知识'),
    }
  })
}

function normalizeSectionDocuments(
  value: readonly StorySectionDocument[],
  sections: readonly StoryWorkspaceSection[],
): readonly StorySectionDocument[] {
  assertUnique(value.map(document => document.id), '分区文档')
  const byId = new Map(value.map(document => [document.id, document]))
  if (byId.size !== sections.length || sections.some(section => !byId.has(section.id))) {
    throw new Error('分区文档必须与分区清单一一对应')
  }
  return sections.map(section => ({ id: section.id, content: cleanDocument(byId.get(section.id)!.content, '分区正文') }))
}

function normalizeSourceDocuments(
  value: readonly StorySourceDocument[],
  sources: readonly StoryWorkspaceSource[],
): readonly StorySourceDocument[] {
  assertUnique(value.map(document => document.id), '资料文档')
  const byId = new Map(value.map(document => [document.id, document]))
  if (byId.size !== sources.length || sources.some(source => !byId.has(source.id))) {
    throw new Error('资料文档必须与资料清单一一对应')
  }
  return sources.map(source => ({ id: source.id, content: cleanDocument(byId.get(source.id)!.content, '资料正文') }))
}

function normalizeDocuments(
  value: StoryWorkspaceDocuments,
  characters: readonly StoryWorkspaceCharacter[],
  sections: readonly StoryWorkspaceSection[],
  sources: readonly StoryWorkspaceSource[],
): StoryWorkspaceDocuments {
  const result = {
    outline: cleanDocument(value.outline, '剧情大纲'),
    foreshadowing: cleanDocument(value.foreshadowing, '剧情伏笔'),
    proposals: cleanDocument(value.proposals, '待审剧情提案'),
    history: cleanDocument(value.history, '公开历史'),
    characters: normalizeCharacterDocuments(value.characters, characters),
    sections: normalizeSectionDocuments(value.sections, sections),
    sources: normalizeSourceDocuments(value.sources, sources),
  }
  const bytes = [result.outline, result.foreshadowing, result.proposals, result.history]
    .concat(result.characters.flatMap(document => [document.persona, document.knowledge]))
    .concat(result.sections.map(document => document.content))
    .concat(result.sources.map(document => document.content))
    .reduce((total, document) => total + Buffer.byteLength(document, 'utf8'), 0)
  if (bytes > MAX_WORKSPACE_BYTES) throw new Error(`故事工作区不能超过 ${String(MAX_WORKSPACE_BYTES)} 字节`)
  return result
}

function parseManifest(value: unknown): StoredStoryWorkspaceManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('故事工作区清单不是对象')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.id !== 'string' || typeof record.name !== 'string'
    || typeof record.revision !== 'number' || !Number.isSafeInteger(record.revision) || record.revision < 0
    || typeof record.createdAt !== 'number' || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0
    || typeof record.updatedAt !== 'number' || !Number.isSafeInteger(record.updatedAt) || record.updatedAt < record.createdAt
    || !Array.isArray(record.characters) || !Array.isArray(record.sections) || !Array.isArray(record.sources)) {
    throw new Error('故事工作区清单字段无效')
  }
  assertId(record.id, WORKSPACE_ID_PATTERN, '故事工作区')
  return {
    format: 0,
    id: record.id,
    name: cleanName(record.name, '故事工作区'),
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    pipeline: normalizePipeline(record.pipeline),
    characters: normalizeCharacters(record.characters as StoryWorkspaceCharacter[]),
    sections: normalizeSections(record.sections as StoryWorkspaceSection[]),
    sources: normalizeSources(record.sources as StoryWorkspaceSource[]),
  }
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const staging = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    writeFileSync(staging, content, { encoding: 'utf8', mode: 0o600 })
    renameSync(staging, path)
  } finally {
    rmSync(staging, { force: true })
  }
}

function readMarkdown(path: string): string {
  try {
    return readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
  } catch (error: unknown) {
    throw new Error(`无法读取故事文档 ${JSON.stringify(path)}`, { cause: error })
  }
}

function readOptionalMarkdown(path: string): string {
  return existsSync(path) ? readMarkdown(path) : ''
}

function appendMaterializedEntry(current: string, marker: string, heading: string, content: string): string {
  if (current.includes(marker) || content.trim() === '') return current
  return [current.trimEnd(), marker, `## ${heading}`, content.trim()].filter(Boolean).join('\n\n') + '\n'
}

/** Generate an opaque character id suitable for a manifest edit. */
export function createStoryCharacterId(): string {
  return `character-${randomUUID()}`
}

/** Generate an opaque output-section id suitable for a manifest edit. */
export function createStorySectionId(): string {
  return `section-${randomUUID()}`
}

/** Generate an opaque source id suitable for a manifest edit. */
export function createStorySourceId(): string {
  return `source-${randomUUID()}`
}

/** Local workspace store whose accepted ids cannot escape its configured root. */
export class StoryWorkspaceStore {
  readonly root: string

  constructor(options: StoryWorkspaceStoreOptions = {}) {
    this.root = resolve(options.root ?? dshHomePath('agent-rp', 'story-workspaces'))
  }

  /** List valid workspaces newest first. */
  list(): readonly StoryWorkspaceSummary[] {
    if (!existsSync(this.root)) return []
    return readdirSync(this.root, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && WORKSPACE_ID_PATTERN.test(entry.name))
      .map(entry => this.readManifest(entry.name))
      .sort((left, right) => right.updatedAt - left.updatedAt || left.name.localeCompare(right.name))
      .map(manifest => ({
        id: manifest.id,
        name: manifest.name,
        revision: manifest.revision,
        updatedAt: manifest.updatedAt,
        characterCount: manifest.characters.length,
      }))
  }

  /** Create one empty editable workspace. */
  create(request: StoryWorkspaceCreateRequest): StoryWorkspaceSnapshot {
    if (request.format !== 0) throw new Error('故事工作区创建请求版本无效')
    const id = `story-${randomUUID()}`
    const now = Date.now()
    const manifest: StoryWorkspaceManifest = {
      format: 0,
      id,
      name: cleanName(request.name, '故事工作区'),
      revision: 0,
      createdAt: now,
      updatedAt: now,
      pipeline: DEFAULT_STORY_PIPELINE,
      characters: [],
      sections: [],
      sources: [],
    }
    const documents: StoryWorkspaceDocuments = {
      outline: '',
      foreshadowing: '',
      proposals: '',
      history: '',
      characters: [],
      sections: [],
      sources: [],
    }
    this.writeSnapshot(manifest, documents)
    return { manifest, documents }
  }

  /** Read one complete workspace at its current revision. */
  get(id: string): StoryWorkspaceSnapshot {
    const manifest = this.readManifest(id)
    const root = this.workspacePath(id)
    return {
      manifest,
      documents: {
        outline: readMarkdown(join(root, 'outline.md')),
        foreshadowing: readMarkdown(join(root, 'foreshadowing.md')),
        proposals: readOptionalMarkdown(join(root, 'proposals.md')),
        history: readMarkdown(join(root, 'history.md')),
        characters: manifest.characters.map(character => ({
          id: character.id,
          persona: readMarkdown(join(root, 'characters', character.id, 'persona.md')),
          knowledge: readMarkdown(join(root, 'characters', character.id, 'knowledge.md')),
        })),
        sections: manifest.sections.map(section => ({
          id: section.id,
          content: readMarkdown(join(root, 'sections', `${section.id}.md`)),
        })),
        sources: manifest.sources.map(source => ({
          id: source.id,
          content: readMarkdown(join(root, 'sources', `${source.id}.md`)),
        })),
      },
    }
  }

  /** Replace all editable fields when the caller still owns the observed revision. */
  save(request: StoryWorkspaceSaveRequest): StoryWorkspaceSnapshot {
    if (request.format !== 0) throw new Error('故事工作区保存请求版本无效')
    const current = this.readManifest(request.id)
    if (!Number.isSafeInteger(request.revision) || request.revision < 0 || request.revision !== current.revision) {
      throw new Error(`故事工作区已更新；当前 revision 为 ${String(current.revision)}`)
    }
    const characters = normalizeCharacters(request.characters)
    const sections = normalizeSections(request.sections)
    const sources = normalizeSources(request.sources)
    const pipeline = normalizePipeline(request.pipeline)
    const documents = normalizeDocuments(request.documents, characters, sections, sources)
    const manifest: StoryWorkspaceManifest = {
      format: 0,
      id: current.id,
      name: cleanName(request.name, '故事工作区'),
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: Math.max(Date.now(), current.updatedAt + 1),
      pipeline,
      characters,
      sections,
      sources,
    }
    this.writeSnapshot(manifest, documents)
    this.removeUnreferenced(current, manifest)
    return this.get(request.id)
  }

  /** Idempotently append one completed turn while preserving newer user edits. */
  materializeTurn(id: string, materialization: StoryTurnMaterialization): StoryWorkspaceSnapshot {
    if (!/^[A-Za-z0-9:_-]{1,240}$/u.test(materialization.key)) throw new Error('故事回合沉淀 key 无效')
    const current = this.get(id)
    const marker = `<!-- agent-rp:story-turn:${materialization.key} -->`
    const observations = new Map(materialization.observations.map(observation => [observation.characterId, observation.text]))
    const documents: StoryWorkspaceDocuments = {
      ...current.documents,
      history: appendMaterializedEntry(
        current.documents.history,
        marker,
        materialization.heading,
        cleanDocument(materialization.history, '回合公开历史'),
      ),
      proposals: appendMaterializedEntry(
        current.documents.proposals,
        marker,
        materialization.heading,
        cleanDocument(materialization.proposals, '回合待审提案'),
      ),
      characters: current.documents.characters.map(character => ({
        ...character,
        knowledge: appendMaterializedEntry(
          character.knowledge,
          marker,
          materialization.heading,
          cleanDocument(observations.get(character.id) ?? '', '人物观察记录'),
        ),
      })),
    }
    const unchanged = documents.history === current.documents.history
      && documents.proposals === current.documents.proposals
      && documents.characters.every((character, index) =>
        character.knowledge === current.documents.characters[index]?.knowledge)
    if (unchanged) return current
    return this.save({
      format: 0,
      id: current.manifest.id,
      revision: current.manifest.revision,
      name: current.manifest.name,
      pipeline: current.manifest.pipeline,
      characters: current.manifest.characters,
      sections: current.manifest.sections,
      sources: current.manifest.sources,
      documents,
    })
  }

  /** Remove one workspace and every local document it owns. */
  remove(id: string): StoryWorkspaceSummary {
    const snapshot = this.get(id)
    rmSync(this.workspacePath(id), { recursive: true })
    return {
      id: snapshot.manifest.id,
      name: snapshot.manifest.name,
      revision: snapshot.manifest.revision,
      updatedAt: snapshot.manifest.updatedAt,
      characterCount: snapshot.manifest.characters.length,
    }
  }

  private workspacePath(id: string): string {
    assertId(id, WORKSPACE_ID_PATTERN, '故事工作区')
    return join(this.root, id)
  }

  private manifestPath(id: string): string {
    return join(this.workspacePath(id), 'manifest.json')
  }

  private readManifest(id: string): StoredStoryWorkspaceManifest {
    assertId(id, WORKSPACE_ID_PATTERN, '故事工作区')
    try {
      return parseManifest(JSON.parse(readFileSync(this.manifestPath(id), 'utf8')))
    } catch (error: unknown) {
      throw new Error(`无法读取故事工作区 ${JSON.stringify(id)}`, { cause: error })
    }
  }

  private writeSnapshot(manifest: StoryWorkspaceManifest, documents: StoryWorkspaceDocuments): void {
    const root = this.workspacePath(manifest.id)
    atomicWrite(join(root, 'outline.md'), documents.outline)
    atomicWrite(join(root, 'foreshadowing.md'), documents.foreshadowing)
    atomicWrite(join(root, 'proposals.md'), documents.proposals)
    atomicWrite(join(root, 'history.md'), documents.history)
    for (const character of documents.characters) {
      atomicWrite(join(root, 'characters', character.id, 'persona.md'), character.persona)
      atomicWrite(join(root, 'characters', character.id, 'knowledge.md'), character.knowledge)
    }
    for (const section of documents.sections) {
      atomicWrite(join(root, 'sections', `${section.id}.md`), section.content)
    }
    for (const source of documents.sources) {
      atomicWrite(join(root, 'sources', `${source.id}.md`), source.content)
    }
    atomicWrite(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  }

  private removeUnreferenced(before: StoryWorkspaceManifest, after: StoryWorkspaceManifest): void {
    const root = this.workspacePath(after.id)
    const characterIds = new Set(after.characters.map(character => character.id))
    for (const character of before.characters) {
      if (!characterIds.has(character.id)) rmSync(join(root, 'characters', character.id), { recursive: true, force: true })
    }
    const sectionIds = new Set(after.sections.map(section => section.id))
    for (const section of before.sections) {
      if (!sectionIds.has(section.id)) rmSync(join(root, 'sections', `${section.id}.md`), { force: true })
    }
    const sourceIds = new Set(after.sources.map(source => source.id))
    for (const source of before.sources) {
      if (!sourceIds.has(source.id)) rmSync(join(root, 'sources', `${source.id}.md`), { force: true })
    }
  }
}

/** Compile a character Worker input without director-only or other-character documents. */
export function compileStoryCharacterContext(
  workspace: StoryWorkspaceSnapshot,
  characterId: string,
  scene: StoryPublicSceneContext,
): StoryCharacterContext {
  const character = workspace.manifest.characters.find(candidate => candidate.id === characterId)
  const documents = workspace.documents.characters.find(candidate => candidate.id === characterId)
  if (character === undefined || documents === undefined || !character.enabled) {
    throw new Error(`故事工作区中没有启用的人物 ${JSON.stringify(characterId)}`)
  }
  const playerInput = cleanDocument(scene.playerInput, '本轮玩家输入')
  const text = [
    `# 人物：${character.name}`,
    '## Persona',
    documents.persona,
    '## 仅该人物可知的事实',
    documents.knowledge,
    '## 本轮玩家输入',
    playerInput,
    '只能依据以上材料决定该人物此刻相信什么、注意到什么和采取什么行动。不得假设其他人物的私有知识，也不得读取未来大纲或伏笔。',
  ].join('\n\n')
  return {
    workspaceId: workspace.manifest.id,
    characterId,
    characterName: character.name,
    persona: documents.persona,
    privateKnowledge: documents.knowledge,
    playerInput,
    text,
  }
}
