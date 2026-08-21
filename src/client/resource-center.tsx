/** Task-oriented library for reusable Agent RP resources. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CharacterLibraryCollection,
  CharacterLibraryDetail,
  CharacterLibraryImportResult,
  CharacterLibrarySummary,
} from '../character-library-protocol.ts'
import type { PersonaLibraryEntry, PersonaLibrarySaveRequest } from '../persona-library-protocol.ts'
import type { PresetLibrarySummary } from '../preset-library-http-protocol.ts'
import type { WorldInfoLibraryUpload } from '../world-info-library-protocol.ts'
import { classifySillyTavernJsonFile } from './import-hint.ts'

type ResourceSection = 'characters' | 'world-info' | 'presets' | 'personas'

interface ResourceCenterProps {
  readonly accent: string
  readonly narrow: boolean
  readonly initialSection?: ResourceSection
  readonly listCharacters: (collection?: CharacterLibraryCollection) => Promise<readonly CharacterLibrarySummary[]>
  readonly setCharacterArchived: (id: string, archived: boolean) => Promise<CharacterLibraryDetail>
  readonly importCharacterFile: (file: File) => Promise<CharacterLibraryImportResult>
  readonly listWorldInfos: () => Promise<readonly WorldInfoLibraryUpload[]>
  readonly importWorldInfoFile: (file: File) => Promise<WorldInfoLibraryUpload>
  readonly listPresets: () => Promise<readonly PresetLibrarySummary[]>
  readonly importPresetFile: (file: File) => Promise<PresetLibrarySummary>
  readonly renamePreset: (id: string, name: string) => Promise<PresetLibrarySummary>
  readonly listPersonas: () => Promise<readonly PersonaLibraryEntry[]>
  readonly savePersona: (request: PersonaLibrarySaveRequest) => Promise<PersonaLibraryEntry>
  readonly deletePersona: (id: string) => Promise<PersonaLibraryEntry>
  readonly onStartWorldInfo?: (entry: WorldInfoLibraryUpload) => Promise<void>
  readonly onClose: () => void
}

const secondaryButtonStyle = {
  background: 'transparent',
  border: '1px solid var(--dsw-alias-border-l2, #444)',
  borderRadius: '8px',
  color: 'inherit',
  font: 'inherit',
  fontSize: '11px',
  padding: '6px 9px',
  whiteSpace: 'nowrap',
} as const

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function sectionName(section: ResourceSection): string {
  if (section === 'characters') return '角色'
  if (section === 'world-info') return '世界书'
  if (section === 'presets') return '预设'
  return '身份'
}

/** Manage reusable resources without tying them to one Character Card or Session. */
export function RoleplayResourceCenter({
  accent, narrow, initialSection = 'characters',
  listCharacters, setCharacterArchived, importCharacterFile,
  listWorldInfos, importWorldInfoFile,
  listPresets, importPresetFile, renamePreset,
  listPersonas, savePersona, deletePersona,
  onStartWorldInfo,
  onClose,
}: ResourceCenterProps) {
  const [section, setSection] = useState<ResourceSection>(initialSection)
  const [query, setQuery] = useState('')
  const [characters, setCharacters] = useState<readonly CharacterLibrarySummary[]>()
  const [worldInfos, setWorldInfos] = useState<readonly WorldInfoLibraryUpload[]>()
  const [presets, setPresets] = useState<readonly PresetLibrarySummary[]>()
  const [personas, setPersonas] = useState<readonly PersonaLibraryEntry[]>()
  const [loadErrors, setLoadErrors] = useState<Partial<Record<ResourceSection, string>>>({})
  const [busy, setBusy] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [error, setError] = useState<string>()
  const [personaDraft, setPersonaDraft] = useState<{ readonly id?: string; readonly name: string; readonly description: string }>()
  const [presetDraft, setPresetDraft] = useState<{ readonly id: string; readonly name: string }>()
  const [confirmingPersonaId, setConfirmingPersonaId] = useState<string>()
  const characterInputRef = useRef<HTMLInputElement | null>(null)
  const worldInfoInputRef = useRef<HTMLInputElement | null>(null)
  const presetInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let current = true
    const failed = (target: ResourceSection) => (reason: unknown): void => {
      if (!current) return
      setLoadErrors(value => ({ ...value, [target]: message(reason) }))
      if (target === 'characters') setCharacters([])
      else if (target === 'world-info') setWorldInfos([])
      else if (target === 'presets') setPresets([])
      else setPersonas([])
    }
    void Promise.all([listCharacters('active'), listCharacters('archived')]).then(([active, archived]) => {
      if (current) setCharacters([...active, ...archived])
    }, failed('characters'))
    void listWorldInfos().then(value => { if (current) setWorldInfos(value) }, failed('world-info'))
    void listPresets().then(value => { if (current) setPresets(value) }, failed('presets'))
    void listPersonas().then(value => { if (current) setPersonas(value) }, failed('personas'))
    return () => { current = false }
  }, [listCharacters, listPersonas, listPresets, listWorldInfos])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = (...values: readonly string[]): boolean => normalizedQuery === ''
    || values.some(value => value.toLocaleLowerCase().includes(normalizedQuery))
  const visibleCharacters = useMemo(() => (characters ?? []).filter(entry =>
    matches(entry.displayName, entry.name, entry.originalFilename)), [characters, normalizedQuery])
  const visibleWorldInfos = useMemo(() => (worldInfos ?? []).filter(entry => matches(entry.name)), [worldInfos, normalizedQuery])
  const visiblePresets = useMemo(() => (presets ?? []).filter(entry => matches(entry.name)), [presets, normalizedQuery])
  const visiblePersonas = useMemo(() => (personas ?? []).filter(entry => matches(entry.name, entry.description)), [personas, normalizedQuery])

  const startAction = (key: string): void => {
    setBusy(key)
    setError(undefined)
    setNotice(undefined)
  }
  const finishAction = (): void => { setBusy(undefined) }
  const importCharacter = (file: File): void => {
    startAction('import-character')
    void importCharacterFile(file).then(result => {
      setCharacters(value => [result.entry, ...(value ?? []).filter(entry => entry.id !== result.entry.id)])
      setNotice(result.outcome === 'created' ? `已加入角色「${result.entry.displayName}」`
        : result.outcome === 'restored' ? `已恢复角色「${result.entry.displayName}」`
          : `角色「${result.entry.displayName}」已经在资源中心`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const importWorldInfo = (file: File): void => {
    startAction('import-world-info')
    void importWorldInfoFile(file).then(entry => {
      setWorldInfos(value => [entry, ...(value ?? []).filter(item => item.id !== entry.id)])
      setNotice(`已加入世界书「${entry.name}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const importPreset = (file: File): void => {
    startAction('import-preset')
    void importPresetFile(file).then(entry => {
      setPresets(value => [entry, ...(value ?? []).filter(item => item.id !== entry.id)])
      setNotice(`已加入预设「${entry.name}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const startWorldInfo = (entry: WorldInfoLibraryUpload): void => {
    if (onStartWorldInfo === undefined) return
    startAction(`start-world-info:${entry.id}`)
    void onStartWorldInfo(entry).then(onClose, reason => {
      setError(message(reason))
    }).finally(finishAction)
  }
  const importResource = (file: File, fallback: Exclude<ResourceSection, 'personas'>): void => {
    if (!/\.json$/iu.test(file.name)) {
      if (fallback === 'characters') importCharacter(file)
      else setError('这里只接受 JSON 资源')
      return
    }
    startAction('classify-resource')
    void classifySillyTavernJsonFile(file).then(kind => {
      if (kind === 'character-card') {
        setSection('characters')
        importCharacter(file)
      } else if (kind === 'world-info') {
        setSection('world-info')
        importWorldInfo(file)
      } else if (kind === 'preset') {
        setSection('presets')
        importPreset(file)
      } else {
        finishAction()
        setError('无法识别这份 JSON；请选择角色卡、SillyTavern 世界书或 Chat Completion 预设')
      }
    }, reason => {
      finishAction()
      setError(message(reason))
    })
  }
  const toggleCharacterArchive = (entry: CharacterLibrarySummary): void => {
    startAction(`character:${entry.id}`)
    void setCharacterArchived(entry.id, !entry.archived).then(updated => {
      setCharacters(value => (value ?? []).map(item => item.id === updated.id ? updated : item))
      setNotice(`${updated.archived ? '已收起' : '已恢复'}角色「${updated.displayName}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const savePresetName = (): void => {
    if (presetDraft === undefined || presetDraft.name.trim() === '') return
    startAction(`preset:${presetDraft.id}`)
    void renamePreset(presetDraft.id, presetDraft.name).then(entry => {
      setPresets(value => (value ?? []).map(item => item.id === entry.id ? entry : item))
      setPresetDraft(undefined)
      setNotice(`预设已改名为「${entry.name}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const savePersonaDraft = (): void => {
    if (personaDraft === undefined || personaDraft.name.trim() === '') return
    startAction(personaDraft.id === undefined ? 'persona:new' : `persona:${personaDraft.id}`)
    void savePersona({ format: 0, ...personaDraft }).then(entry => {
      setPersonas(value => [entry, ...(value ?? []).filter(item => item.id !== entry.id)])
      setPersonaDraft(undefined)
      setNotice(`已保存身份「${entry.name}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }
  const removePersona = (entry: PersonaLibraryEntry): void => {
    if (confirmingPersonaId !== entry.id) {
      setConfirmingPersonaId(entry.id)
      return
    }
    startAction(`persona:${entry.id}`)
    void deletePersona(entry.id).then(() => {
      setPersonas(value => (value ?? []).filter(item => item.id !== entry.id))
      setConfirmingPersonaId(undefined)
      setNotice(`已移除身份「${entry.name}」`)
    }).catch(reason => { setError(message(reason)) }).finally(finishAction)
  }

  const counts: Record<ResourceSection, number | undefined> = {
    characters: characters?.length,
    'world-info': worldInfos?.length,
    presets: presets?.length,
    personas: personas?.length,
  }
  const sections: readonly ResourceSection[] = ['characters', 'world-info', 'presets', 'personas']
  const loading = counts[section] === undefined
  const empty = section === 'characters' ? visibleCharacters.length === 0
    : section === 'world-info' ? visibleWorldInfos.length === 0
      : section === 'presets' ? visiblePresets.length === 0 : visiblePersonas.length === 0
  const canImport = section !== 'personas'
  const importLabel = section === 'characters' ? '导入角色卡' : section === 'world-info' ? '导入世界书' : '导入预设'
  const importBusy = busy === (section === 'characters' ? 'import-character'
    : section === 'world-info' ? 'import-world-info' : 'import-preset')

  const triggerImport = (): void => {
    if (section === 'characters') characterInputRef.current?.click()
    else if (section === 'world-info') worldInfoInputRef.current?.click()
    else if (section === 'presets') presetInputRef.current?.click()
  }
  const rowStyle = {
    alignItems: 'center', borderTop: '1px solid var(--dsw-alias-border-l2, #39393c)',
    display: 'flex', gap: '12px', padding: '11px 12px',
  } as const
  const actionStyle = (active = true) => ({
    ...secondaryButtonStyle,
    cursor: active ? 'pointer' : 'default',
    opacity: active ? 1 : .48,
  })

  return <div data-agent-rp-dialog data-agent-rp-surface="resource-center" role="dialog" aria-modal="true"
    aria-label="Agent RP 资源中心" style={{
      alignItems: 'center', background: 'rgba(0,0,0,.52)', display: 'flex', inset: 0, justifyContent: 'center',
      padding: narrow ? '8px' : '24px', position: 'fixed', zIndex: 1001,
    }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #171719)', border: '1px solid var(--dsw-alias-border-l2, #39393c)',
      borderRadius: '16px', boxShadow: '0 22px 80px rgba(0,0,0,.36)', display: 'grid',
      gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : '190px minmax(0, 1fr)',
      gridTemplateRows: narrow ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)',
      height: narrow ? 'calc(100vh - 16px)' : 'min(700px, calc(100vh - 48px))', maxWidth: '960px',
      overflow: 'hidden', width: narrow ? 'calc(100vw - 16px)' : 'min(960px, calc(100vw - 48px))',
    }}>
      <aside style={{
        borderBottom: narrow ? '1px solid var(--dsw-alias-border-l2, #39393c)' : undefined,
        borderRight: narrow ? undefined : '1px solid var(--dsw-alias-border-l2, #39393c)', padding: narrow ? '12px' : '20px 14px',
      }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '8px', margin: narrow ? '0 2px 10px' : '0 6px 18px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '17px', margin: 0 }}>资源中心</h2>
            {!narrow && <p style={{ fontSize: '11px', lineHeight: 1.5, margin: '5px 0 0', opacity: .5 }}>跨角色与会话复用的本机内容</p>}
          </div>
          {narrow && <button type="button" aria-label="关闭资源中心" onClick={onClose} style={{
            background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '22px', padding: '2px 5px',
          }}>×</button>}
        </div>
        <div role="tablist" aria-label="资源类型" style={{
          display: 'grid', gap: narrow ? '4px' : '5px', gridTemplateColumns: narrow ? 'repeat(4, minmax(0, 1fr))' : 'minmax(0, 1fr)',
        }}>
          {sections.map(value => <button key={value} type="button" role="tab" aria-selected={section === value}
            onClick={() => { setSection(value); setQuery(''); setError(undefined); setNotice(undefined) }} style={{
              alignItems: 'center', background: section === value ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'transparent',
              border: section === value ? `1px solid color-mix(in srgb, ${accent} 34%, transparent)` : '1px solid transparent',
              borderRadius: '9px', color: 'inherit', cursor: 'pointer', display: 'flex', font: 'inherit', fontSize: narrow ? '11px' : '12px',
              gap: '8px', justifyContent: narrow ? 'center' : 'space-between', padding: narrow ? '7px 4px' : '9px 10px', textAlign: 'left',
            }}><span>{sectionName(value)}</span><span style={{ fontSize: '10px', opacity: .46 }}>{counts[value] ?? '…'}</span></button>)}
        </div>
      </aside>
      <main role="tabpanel" aria-label={`${sectionName(section)}资源`} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <header style={{ alignItems: 'center', borderBottom: '1px solid var(--dsw-alias-border-l2, #39393c)', display: 'flex', gap: '10px', padding: narrow ? '12px' : '17px 18px' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '15px' }}>{sectionName(section)}</strong>
            <span style={{ display: 'block', fontSize: '11px', marginTop: '2px', opacity: .48 }}>
              {section === 'characters' ? '角色卡与收藏状态' : section === 'world-info' ? '独立世界书来源'
                : section === 'presets' ? '可复用的对话预设' : '玩家身份与人物设定'}
            </span>
          </div>
          {section === 'personas' && <button type="button" disabled={busy !== undefined} onClick={() => {
            setPersonaDraft({ name: '', description: '' }); setConfirmingPersonaId(undefined)
          }} style={actionStyle(busy === undefined)}>＋ 新建</button>}
          {canImport && <button type="button" disabled={busy !== undefined} onClick={triggerImport}
            style={actionStyle(busy === undefined)}>{importBusy ? '导入中…' : `＋ ${importLabel}`}</button>}
          {!narrow && <button type="button" aria-label="关闭资源中心" onClick={onClose} style={{
            background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '23px', padding: '2px 5px',
          }}>×</button>}
        </header>
        <input ref={characterInputRef} type="file" accept=".png,.json,.charx,image/png,application/json,application/zip" hidden onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file !== undefined) importResource(file, 'characters')
        }} />
        <input ref={worldInfoInputRef} type="file" accept=".json,application/json" hidden onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file !== undefined) importResource(file, 'world-info')
        }} />
        <input ref={presetInputRef} type="file" accept=".json,application/json" hidden onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file !== undefined) importResource(file, 'presets')
        }} />
        <div style={{ padding: narrow ? '10px 12px' : '12px 18px' }}>
          <input type="search" value={query} aria-label={`搜索${sectionName(section)}`} placeholder={`搜索${sectionName(section)}`}
            onChange={event => { setQuery(event.target.value) }} style={{
              background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)',
              borderRadius: '9px', boxSizing: 'border-box', color: 'inherit', font: 'inherit', fontSize: '12px',
              outline: 'none', padding: '8px 10px', width: '100%',
            }} />
          {notice !== undefined && <p role="status" style={{ color: 'var(--dsw-alias-state-success, #4fba83)', fontSize: '11px', margin: '8px 2px 0' }}>{notice}</p>}
          {error !== undefined && <p role="alert" style={{ color: 'var(--dsw-alias-state-danger, #d64d5f)', fontSize: '11px', margin: '8px 2px 0' }}>{error}</p>}
          {loadErrors[section] !== undefined && <p role="alert" style={{ color: 'var(--dsw-alias-state-danger, #d64d5f)', fontSize: '11px', margin: '8px 2px 0' }}>{loadErrors[section]}</p>}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: narrow ? '0 12px 16px' : '0 18px 18px' }}>
          {section === 'personas' && personaDraft !== undefined && <div style={{
            background: 'var(--dsw-alias-bg-layer-1, #202024)', border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
            borderRadius: '10px', display: 'grid', gap: '8px', marginBottom: '10px', padding: '11px',
          }}>
            <input value={personaDraft.name} maxLength={120} placeholder="身份名称" onChange={event => {
              setPersonaDraft(value => value === undefined ? undefined : { ...value, name: event.target.value })
            }} style={{ background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px', color: 'inherit', font: 'inherit', padding: '8px' }} />
            <textarea value={personaDraft.description} maxLength={12_000} rows={4} placeholder="身份、外貌、性格或与角色的关系"
              onChange={event => { setPersonaDraft(value => value === undefined ? undefined : { ...value, description: event.target.value }) }}
              style={{ background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px', color: 'inherit', font: 'inherit', lineHeight: 1.5, padding: '8px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" disabled={busy !== undefined} onClick={() => { setPersonaDraft(undefined) }} style={actionStyle(busy === undefined)}>取消</button>
              <button type="button" disabled={busy !== undefined || personaDraft.name.trim() === ''} onClick={savePersonaDraft} style={{
                ...actionStyle(busy === undefined && personaDraft.name.trim() !== ''), background: accent, borderColor: accent, color: '#fff',
              }}>{busy?.startsWith('persona:') === true ? '保存中…' : '保存身份'}</button>
            </div>
          </div>}
          {loading && <div style={{ fontSize: '12px', opacity: .52, padding: '22px 4px' }}>正在读取{sectionName(section)}…</div>}
          {!loading && empty && <div style={{ fontSize: '12px', lineHeight: 1.65, opacity: .55, padding: '22px 4px', textAlign: 'center' }}>
            {normalizedQuery === '' ? `还没有${sectionName(section)}资源` : `没有找到匹配的${sectionName(section)}`}
          </div>}
          {!loading && !empty && <div style={{ border: '1px solid var(--dsw-alias-border-l2, #39393c)', borderRadius: '11px', overflow: 'hidden' }}>
            {section === 'characters' && visibleCharacters.map((entry, index) => <div key={entry.id} style={{ ...rowStyle, borderTop: index === 0 ? 'none' : rowStyle.borderTop }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.displayName}</strong>
                <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', opacity: .48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  V{entry.cardVersion} · {entry.greetingCount} 个开场{entry.worldInfoCount > 0 ? ` · ${entry.worldInfoCount} 条世界书` : ''}{entry.archived ? ' · 已收起' : ''}
                </span>
              </div>
              <button type="button" disabled={busy !== undefined} onClick={() => { toggleCharacterArchive(entry) }} style={actionStyle(busy === undefined)}>
                {busy === `character:${entry.id}` ? '处理中…' : entry.archived ? '恢复' : '收起'}
              </button>
            </div>)}
            {section === 'world-info' && visibleWorldInfos.map((entry, index) => <div key={entry.id} style={{ ...rowStyle, borderTop: index === 0 ? 'none' : rowStyle.borderTop }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</strong>
                <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', opacity: .48 }}>{entry.entryCount} 条目{entry.degradations.length > 0 ? ` · ${entry.degradations.length} 项兼容提醒` : ''}</span>
              </div>
              {onStartWorldInfo !== undefined && <button type="button" disabled={busy !== undefined}
                onClick={() => { startWorldInfo(entry) }} style={actionStyle(busy === undefined)}>
                {busy === `start-world-info:${entry.id}` ? '启动中…' : '开始'}
              </button>}
            </div>)}
            {section === 'presets' && visiblePresets.map((entry, index) => <div key={entry.id} style={{ ...rowStyle, borderTop: index === 0 ? 'none' : rowStyle.borderTop }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {presetDraft?.id === entry.id
                  ? <input value={presetDraft.name} maxLength={160} aria-label="预设名称" onChange={event => { setPresetDraft({ id: entry.id, name: event.target.value }) }} style={{
                    background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '7px', color: 'inherit', font: 'inherit', padding: '6px 8px', width: '100%',
                  }} />
                  : <strong style={{ display: 'block', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</strong>}
                <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', opacity: .48 }}>{entry.enabledCount}/{entry.promptCount} 项启用{entry.regexScriptCount > 0 ? ` · ${entry.regexScriptCount} 条正则` : ''}</span>
              </div>
              {presetDraft?.id === entry.id ? <>
                <button type="button" disabled={busy !== undefined} onClick={() => { setPresetDraft(undefined) }} style={actionStyle(busy === undefined)}>取消</button>
                <button type="button" disabled={busy !== undefined || presetDraft.name.trim() === ''} onClick={savePresetName} style={actionStyle(busy === undefined && presetDraft.name.trim() !== '')}>{busy === `preset:${entry.id}` ? '保存中…' : '保存'}</button>
              </> : <button type="button" disabled={busy !== undefined} onClick={() => { setPresetDraft({ id: entry.id, name: entry.name }) }} style={actionStyle(busy === undefined)}>改名</button>}
            </div>)}
            {section === 'personas' && visiblePersonas.map((entry, index) => <div key={entry.id} style={{ ...rowStyle, alignItems: 'flex-start', borderTop: index === 0 ? 'none' : rowStyle.borderTop }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '13px' }}>{entry.name}</strong>
                <span style={{ display: '-webkit-box', fontSize: '10px', lineHeight: 1.5, marginTop: '4px', opacity: .48, overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{entry.description || '没有额外人物设定'}</span>
              </div>
              <button type="button" disabled={busy !== undefined} onClick={() => {
                setPersonaDraft({ id: entry.id, name: entry.name, description: entry.description }); setConfirmingPersonaId(undefined)
              }} style={actionStyle(busy === undefined)}>编辑</button>
              <button type="button" disabled={busy !== undefined} onClick={() => { removePersona(entry) }} style={{
                ...actionStyle(busy === undefined), color: confirmingPersonaId === entry.id ? 'var(--dsw-alias-state-danger, #e88989)' : 'inherit',
              }}>{busy === `persona:${entry.id}` ? '移除中…' : confirmingPersonaId === entry.id ? '确认移除' : '移除'}</button>
            </div>)}
          </div>}
        </div>
      </main>
    </section>
  </div>
}
