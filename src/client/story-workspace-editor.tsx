/** Minimal browser editor for local story workspaces and Session selection. */

import { useEffect, useState } from 'react'
import {
  STORY_WORKSPACES_PATH,
  type StorySectionKind,
  type StorySourceKind,
  type StoryWorkspaceSnapshot,
  type StoryWorkspaceSummary,
} from '../story-workspace-protocol.ts'
import { executeAgentRpCommand } from './agent-rp-command.ts'

interface StoryWorkspaceEditorProps {
  readonly accent: string
  readonly sessionId?: string
  readonly onClose: () => void
}

interface StoryWorkspaceResponse {
  readonly format?: number
  readonly workspace?: StoryWorkspaceSnapshot
  readonly workspaces?: readonly StoryWorkspaceSummary[]
  readonly error?: string
}

const fieldStyle = {
  background: 'var(--dsw-alias-bg-layer-1, #292a2e)',
  border: '1px solid var(--dsw-alias-border-l2, #45464c)',
  borderRadius: '8px',
  boxSizing: 'border-box',
  color: 'inherit',
  font: 'inherit',
  fontSize: '12px',
  padding: '8px 9px',
  width: '100%',
} as const

const secondaryButton = {
  background: 'transparent',
  border: '1px solid var(--dsw-alias-border-l2, #4a4a50)',
  borderRadius: '8px',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: '11px',
  padding: '7px 10px',
} as const

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

async function storyRequest(path = '', init?: RequestInit): Promise<StoryWorkspaceResponse> {
  const response = await fetch(`${STORY_WORKSPACES_PATH}${path}`, init ?? { headers: { accept: 'application/json' } })
  const text = await response.text()
  let value: StoryWorkspaceResponse
  try {
    value = JSON.parse(text) as StoryWorkspaceResponse
  } catch {
    throw new Error(`故事工作区响应无法识别（${response.status}）`)
  }
  if (!response.ok) throw new Error(value.error ?? `故事工作区请求失败（${response.status}）`)
  if (value.format !== 0) throw new Error('故事工作区响应版本无效')
  return value
}

async function listWorkspaces(): Promise<readonly StoryWorkspaceSummary[]> {
  const value = await storyRequest()
  if (!Array.isArray(value.workspaces)) throw new Error('故事工作区列表响应无效')
  return value.workspaces
}

async function readWorkspace(id: string): Promise<StoryWorkspaceSnapshot> {
  const value = await storyRequest(`/${encodeURIComponent(id)}`)
  if (value.workspace === undefined) throw new Error('故事工作区读取响应无效')
  return value.workspace
}

async function createWorkspace(name: string): Promise<StoryWorkspaceSnapshot> {
  const value = await storyRequest('', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ format: 0, name }),
  })
  if (value.workspace === undefined) throw new Error('故事工作区创建响应无效')
  return value.workspace
}

async function saveWorkspace(workspace: StoryWorkspaceSnapshot): Promise<StoryWorkspaceSnapshot> {
  const { manifest, documents } = workspace
  const value = await storyRequest(`/${encodeURIComponent(manifest.id)}`, {
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      format: 0,
      id: manifest.id,
      revision: manifest.revision,
      name: manifest.name,
      characters: manifest.characters,
      sections: manifest.sections,
      sources: manifest.sources,
      documents,
    }),
  })
  if (value.workspace === undefined) throw new Error('故事工作区保存响应无效')
  return value.workspace
}

async function deleteWorkspace(id: string): Promise<void> {
  await storyRequest(`/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { accept: 'application/json' } })
}

function MarkdownField({ label, value, rows = 6, onChange }: {
  readonly label: string
  readonly value: string
  readonly rows?: number
  readonly onChange: (value: string) => void
}) {
  return <label style={{ display: 'grid', fontSize: '12px', gap: '6px' }}>
    <strong>{label}</strong>
    <textarea value={value} rows={rows} onChange={event => { onChange(event.target.value) }}
      style={{ ...fieldStyle, lineHeight: 1.55, resize: 'vertical' }} />
  </label>
}

/** Full-screen editor kept deliberately close to the Markdown storage model. */
export function StoryWorkspaceEditor({ accent, sessionId, onClose }: StoryWorkspaceEditorProps) {
  const [items, setItems] = useState<readonly StoryWorkspaceSummary[]>([])
  const [workspace, setWorkspace] = useState<StoryWorkspaceSnapshot>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [deleteArmed, setDeleteArmed] = useState(false)

  const reloadList = async (preferredId?: string | null): Promise<void> => {
    const next = await listWorkspaces()
    setItems(next)
    const id = preferredId === null ? next[0]?.id : preferredId ?? workspace?.manifest.id ?? next[0]?.id
    if (id === undefined) setWorkspace(undefined)
    else setWorkspace(await readWorkspace(id))
  }
  useEffect(() => {
    let active = true
    setLoading(true)
    void listWorkspaces().then(async next => {
      const selected = next[0] === undefined ? undefined : await readWorkspace(next[0].id)
      if (!active) return
      setItems(next)
      setWorkspace(selected)
    }).catch(reason => {
      if (active) setError(errorMessage(reason))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const update = (transform: (current: StoryWorkspaceSnapshot) => StoryWorkspaceSnapshot): void => {
    setWorkspace(current => current === undefined ? undefined : transform(current))
    setNotice(undefined)
    setError(undefined)
    setDeleteArmed(false)
  }
  const createNew = (): void => {
    setSaving(true)
    setError(undefined)
    void createWorkspace(`故事工程 ${items.length + 1}`).then(async created => {
      await reloadList(created.manifest.id)
      setNotice('已创建故事工程')
    }).catch(reason => { setError(errorMessage(reason)) }).finally(() => { setSaving(false) })
  }
  const save = (): void => {
    if (workspace === undefined) return
    setSaving(true)
    setError(undefined)
    void saveWorkspace(workspace).then(async saved => {
      await reloadList(saved.manifest.id)
      setNotice(`已保存 revision ${saved.manifest.revision}`)
    }).catch(reason => { setError(errorMessage(reason)) }).finally(() => { setSaving(false) })
  }
  const remove = (): void => {
    if (workspace === undefined) return
    if (!deleteArmed) {
      setDeleteArmed(true)
      return
    }
    setSaving(true)
    void deleteWorkspace(workspace.manifest.id).then(async () => {
      setWorkspace(undefined)
      await reloadList(null)
      setNotice('故事工程已删除')
    }).catch(reason => { setError(errorMessage(reason)) }).finally(() => { setSaving(false) })
  }
  const selectForSession = (workspaceId: string | null): void => {
    if (sessionId === undefined) return
    setSaving(true)
    setError(undefined)
    void executeAgentRpCommand(sessionId, `/rp-story-workspace ${JSON.stringify({ format: 0, workspaceId })}`)
      .then(result => {
        if (!result.matched) throw new Error('当前角色会话没有故事工作区命令')
        setNotice(workspaceId === null ? '当前会话已停用故事流水线' : '当前会话已启用这个故事工程')
      }).catch(reason => { setError(errorMessage(reason)) }).finally(() => { setSaving(false) })
  }

  const narrow = typeof window !== 'undefined' && window.innerWidth < 760
  return <div role="dialog" aria-modal="true" aria-label="故事工程" style={{
    background: 'var(--dsw-alias-bg-layer-1, #191a1d)', color: 'var(--dsw-alias-label-primary, #f4f4f5)',
    display: 'flex', flexDirection: 'column', inset: 0, position: 'fixed', zIndex: 1320,
  }}>
    <header style={{ alignItems: 'center', borderBottom: '1px solid var(--dsw-alias-border-l2, #3c3d42)', display: 'flex', gap: '12px', padding: '13px 16px' }}>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', fontSize: '16px' }}>故事工程</strong>
        <span style={{ fontSize: '11px', opacity: .52 }}>人物私有认知、剧情大纲、伏笔、历史、正文分区与原著资料</span>
      </div>
      <button type="button" disabled={saving} onClick={createNew} style={secondaryButton}>新建</button>
      <button type="button" aria-label="关闭故事工程" onClick={onClose} style={{ ...secondaryButton, fontSize: '18px', padding: '3px 10px' }}>×</button>
    </header>
    <div style={{ display: 'grid', flex: 1, gridTemplateColumns: narrow ? '1fr' : '240px minmax(0, 1fr)', minHeight: 0 }}>
      <aside style={{ borderRight: narrow ? 0 : '1px solid var(--dsw-alias-border-l2, #35363b)', maxHeight: narrow ? '180px' : undefined, overflowY: 'auto', padding: '12px' }}>
        {loading ? <p style={{ fontSize: '12px', opacity: .6 }}>读取中…</p>
          : items.length === 0 ? <p style={{ fontSize: '12px', lineHeight: 1.6, opacity: .6 }}>还没有故事工程。点“新建”即可从空白 Markdown 开始。</p>
            : items.map(item => <button type="button" key={item.id} disabled={saving}
              onClick={() => {
                setError(undefined)
                setNotice(undefined)
                void readWorkspace(item.id).then(setWorkspace, reason => { setError(errorMessage(reason)) })
              }} style={{
                background: workspace?.manifest.id === item.id ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'transparent',
                border: workspace?.manifest.id === item.id ? `1px solid color-mix(in srgb, ${accent} 42%, transparent)` : '1px solid transparent',
                borderRadius: '9px', color: 'inherit', cursor: 'pointer', display: 'block', font: 'inherit', marginBottom: '5px',
                padding: '9px', textAlign: 'left', width: '100%',
              }}>
              <strong style={{ display: 'block', fontSize: '12px' }}>{item.name}</strong>
              <span style={{ display: 'block', fontSize: '10px', marginTop: '3px', opacity: .48 }}>revision {item.revision} · {item.characterCount} 人物</span>
            </button>)}
      </aside>
      <main style={{ minHeight: 0, overflowY: 'auto', padding: narrow ? '14px' : '20px 24px 48px' }}>
        {error !== undefined && <p role="alert" style={{ color: 'var(--dsw-alias-state-danger, #e26773)', fontSize: '12px' }}>{error}</p>}
        {notice !== undefined && <p role="status" style={{ color: accent, fontSize: '12px' }}>{notice}</p>}
        {workspace !== undefined && <div style={{ display: 'grid', gap: '18px', margin: '0 auto', maxWidth: '980px' }}>
          <section style={{ alignItems: 'end', display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
            <label style={{ display: 'grid', flex: '1 1 260px', fontSize: '12px', gap: '6px' }}>工程名称
              <input value={workspace.manifest.name} onChange={event => { update(current => ({
                ...current, manifest: { ...current.manifest, name: event.target.value },
              })) }} style={fieldStyle} />
            </label>
            <button type="button" disabled={saving} onClick={save} style={{ ...secondaryButton, background: accent, borderColor: accent, color: '#fff' }}>{saving ? '处理中…' : '保存全部'}</button>
            <button type="button" disabled={saving} onClick={remove} style={secondaryButton}>{deleteArmed ? '确认删除' : '删除工程'}</button>
          </section>
          <section style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button type="button" disabled={sessionId === undefined || saving} onClick={() => { selectForSession(workspace.manifest.id) }} style={secondaryButton}>用于当前会话</button>
            <button type="button" disabled={sessionId === undefined || saving} onClick={() => { selectForSession(null) }} style={secondaryButton}>当前会话停用</button>
            {sessionId === undefined && <span style={{ alignSelf: 'center', fontSize: '11px', opacity: .5 }}>打开一个 Agent RP 角色会话后可启用流水线</span>}
          </section>
          <MarkdownField label="剧情大纲（仅导演可见）" value={workspace.documents.outline} onChange={value => { update(current => ({
            ...current, documents: { ...current.documents, outline: value },
          })) }} />
          <MarkdownField label="伏笔（仅导演可见）" value={workspace.documents.foreshadowing} onChange={value => { update(current => ({
            ...current, documents: { ...current.documents, foreshadowing: value },
          })) }} />
          <MarkdownField label="公开历史（所有人物可见）" value={workspace.documents.history} onChange={value => { update(current => ({
            ...current, documents: { ...current.documents, history: value },
          })) }} />

          <section>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '14px', margin: 0 }}>人物与私有认知</h2>
              <button type="button" onClick={() => {
                const id = `character-${crypto.randomUUID()}`
                update(current => ({
                  ...current,
                  manifest: { ...current.manifest, characters: [...current.manifest.characters, { id, name: `人物 ${current.manifest.characters.length + 1}`, enabled: true }] },
                  documents: { ...current.documents, characters: [...current.documents.characters, { id, persona: '', knowledge: '' }] },
                }))
              }} style={secondaryButton}>添加人物</button>
            </div>
            <div style={{ display: 'grid', gap: '12px', marginTop: '10px' }}>
              {workspace.manifest.characters.map(character => {
                const documents = workspace.documents.characters.find(candidate => candidate.id === character.id)!
                return <article key={character.id} style={{ background: 'var(--dsw-alias-bg-layer-2, #222327)', border: '1px solid var(--dsw-alias-border-l2, #3e3f45)', borderRadius: '11px', padding: '12px' }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                    <input value={character.name} aria-label="人物名称" onChange={event => { update(current => ({
                      ...current, manifest: { ...current.manifest, characters: current.manifest.characters.map(item => item.id === character.id ? { ...item, name: event.target.value } : item) },
                    })) }} style={{ ...fieldStyle, flex: 1 }} />
                    <label style={{ fontSize: '11px', whiteSpace: 'nowrap' }}><input type="checkbox" checked={character.enabled} onChange={event => { update(current => ({
                      ...current, manifest: { ...current.manifest, characters: current.manifest.characters.map(item => item.id === character.id ? { ...item, enabled: event.target.checked } : item) },
                    })) }} /> 启用</label>
                    <button type="button" onClick={() => { update(current => ({
                      ...current,
                      manifest: { ...current.manifest, characters: current.manifest.characters.filter(item => item.id !== character.id) },
                      documents: { ...current.documents, characters: current.documents.characters.filter(item => item.id !== character.id) },
                    })) }} style={secondaryButton}>移除</button>
                  </div>
                  <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', marginTop: '10px' }}>
                    <MarkdownField label="Persona" rows={5} value={documents.persona} onChange={value => { update(current => ({
                      ...current, documents: { ...current.documents, characters: current.documents.characters.map(item => item.id === character.id ? { ...item, persona: value } : item) },
                    })) }} />
                    <MarkdownField label="私有知识（只有此人物 Worker 可见）" rows={5} value={documents.knowledge} onChange={value => { update(current => ({
                      ...current, documents: { ...current.documents, characters: current.documents.characters.map(item => item.id === character.id ? { ...item, knowledge: value } : item) },
                    })) }} />
                  </div>
                </article>
              })}
            </div>
          </section>

          <section>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '14px', margin: 0 }}>正文分区</h2>
              <button type="button" onClick={() => {
                const id = `section-${crypto.randomUUID()}`
                update(current => ({
                  ...current,
                  manifest: { ...current.manifest, sections: [...current.manifest.sections, { id, name: `正文 ${current.manifest.sections.length + 1}`, kind: 'prose', enabled: true }] },
                  documents: { ...current.documents, sections: [...current.documents.sections, { id, content: '' }] },
                }))
              }} style={secondaryButton}>添加分区</button>
            </div>
            <div style={{ display: 'grid', gap: '12px', marginTop: '10px' }}>
              {workspace.manifest.sections.map(section => {
                const document = workspace.documents.sections.find(candidate => candidate.id === section.id)!
                return <article key={section.id} style={{ background: 'var(--dsw-alias-bg-layer-2, #222327)', borderRadius: '11px', padding: '12px' }}>
                  <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: narrow ? '1fr' : 'minmax(160px, 1fr) 140px auto auto' }}>
                    <input value={section.name} aria-label="分区名称" onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sections: current.manifest.sections.map(item => item.id === section.id ? { ...item, name: event.target.value } : item) } })) }} style={fieldStyle} />
                    <select aria-label="分区类型" value={section.kind} onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sections: current.manifest.sections.map(item => item.id === section.id ? { ...item, kind: event.target.value as StorySectionKind } : item) } })) }} style={fieldStyle}>
                      <option value="prose">正文</option><option value="character">人物</option><option value="history">历史</option>
                    </select>
                    <label style={{ alignSelf: 'center', fontSize: '11px' }}><input type="checkbox" checked={section.enabled} onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sections: current.manifest.sections.map(item => item.id === section.id ? { ...item, enabled: event.target.checked } : item) } })) }} /> 启用</label>
                    <button type="button" onClick={() => { update(current => ({ ...current, manifest: { ...current.manifest, sections: current.manifest.sections.filter(item => item.id !== section.id) }, documents: { ...current.documents, sections: current.documents.sections.filter(item => item.id !== section.id) } })) }} style={secondaryButton}>移除</button>
                  </div>
                  <div style={{ marginTop: '9px' }}><MarkdownField label="分区约束或既有正文" rows={4} value={document.content} onChange={value => { update(current => ({ ...current, documents: { ...current.documents, sections: current.documents.sections.map(item => item.id === section.id ? { ...item, content: value } : item) } })) }} /></div>
                </article>
              })}
            </div>
          </section>

          <section>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '14px', margin: 0 }}>原著与研究资料</h2>
              <button type="button" onClick={() => {
                const id = `source-${crypto.randomUUID()}`
                update(current => ({
                  ...current,
                  manifest: { ...current.manifest, sources: [...current.manifest.sources, { id, name: `资料 ${current.manifest.sources.length + 1}`, kind: 'original', enabled: true }] },
                  documents: { ...current.documents, sources: [...current.documents.sources, { id, content: '' }] },
                }))
              }} style={secondaryButton}>添加资料</button>
            </div>
            <div style={{ display: 'grid', gap: '12px', marginTop: '10px' }}>
              {workspace.manifest.sources.map(source => {
                const document = workspace.documents.sources.find(candidate => candidate.id === source.id)!
                return <article key={source.id} style={{ background: 'var(--dsw-alias-bg-layer-2, #222327)', borderRadius: '11px', padding: '12px' }}>
                  <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: narrow ? '1fr' : 'minmax(160px, 1fr) 140px auto auto' }}>
                    <input value={source.name} aria-label="资料名称" onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sources: current.manifest.sources.map(item => item.id === source.id ? { ...item, name: event.target.value } : item) } })) }} style={fieldStyle} />
                    <select aria-label="资料类型" value={source.kind} onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sources: current.manifest.sources.map(item => item.id === source.id ? { ...item, kind: event.target.value as StorySourceKind } : item) } })) }} style={fieldStyle}>
                      <option value="original">原著</option><option value="reference">参考</option><option value="research">研究</option><option value="web">网络查询</option>
                    </select>
                    <label style={{ alignSelf: 'center', fontSize: '11px' }}><input type="checkbox" checked={source.enabled} onChange={event => { update(current => ({ ...current, manifest: { ...current.manifest, sources: current.manifest.sources.map(item => item.id === source.id ? { ...item, enabled: event.target.checked } : item) } })) }} /> 启用</label>
                    <button type="button" onClick={() => { update(current => ({ ...current, manifest: { ...current.manifest, sources: current.manifest.sources.filter(item => item.id !== source.id) }, documents: { ...current.documents, sources: current.documents.sources.filter(item => item.id !== source.id) } })) }} style={secondaryButton}>移除</button>
                  </div>
                  <div style={{ marginTop: '9px' }}><MarkdownField label="Markdown 原文或摘录" rows={6} value={document.content} onChange={value => { update(current => ({ ...current, documents: { ...current.documents, sources: current.documents.sources.map(item => item.id === source.id ? { ...item, content: value } : item) } })) }} /></div>
                </article>
              })}
            </div>
          </section>
        </div>}
      </main>
    </div>
  </div>
}
