import { useEffect, useState } from 'react'
import {
  CHARACTER_LIBRARY_PATH,
  type CharacterLibraryDetail,
  type CharacterLibraryEditableContent,
} from '../character-library-protocol.ts'
import { updateCharacterEdits } from './character-library-client.ts'

function contentFromDetail(detail: CharacterLibraryDetail): CharacterLibraryEditableContent {
  const content = detail.content as CharacterLibraryEditableContent | undefined
  if (content !== undefined) return { ...content, alternateGreetings: [...content.alternateGreetings] }
  return {
    name: detail.name,
    description: '', personality: '', scenario: '', messageExample: '',
    firstMessage: detail.greetings[0] ?? '',
    alternateGreetings: detail.greetings.slice(1),
  }
}

const fieldStyle = {
  background: 'var(--dsw-alias-bg-base, #171719)',
  border: '1px solid var(--dsw-alias-border-l2, #414147)',
  borderRadius: '8px',
  boxSizing: 'border-box' as const,
  color: 'inherit',
  font: 'inherit',
  lineHeight: 1.55,
  padding: '8px 9px',
  width: '100%',
}

function Field({ label, value, rows = 4, onChange }: {
  readonly label: string
  readonly value: string
  readonly rows?: number
  readonly onChange: (value: string) => void
}) {
  return <label style={{ display: 'grid', fontSize: '11px', gap: '5px' }}>
    <span style={{ fontWeight: 620, opacity: .62 }}>{label}</span>
    <textarea value={value} rows={rows} onChange={event => { onChange(event.target.value) }}
      style={{ ...fieldStyle, minHeight: rows === 2 ? '64px' : undefined, resize: 'vertical' }} />
  </label>
}

/** Reversible local editor for the character-owned fields players most often adjust. */
export function CharacterContentEditor({ detail, color, onChange, onNotice, onError }: {
  readonly detail: CharacterLibraryDetail
  readonly color: string
  readonly onChange: (detail: CharacterLibraryDetail) => void
  readonly onNotice: (message: string) => void
  readonly onError: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const supported = (detail.content as CharacterLibraryEditableContent | undefined) !== undefined
    && typeof (detail.localRevision as number | undefined) === 'number'
  const [draft, setDraft] = useState(() => contentFromDetail(detail))
  useEffect(() => {
    setDraft(contentFromDetail(detail))
    setConfirmingReset(false)
  }, [detail.id, detail.localRevision])
  const update = <Key extends keyof CharacterLibraryEditableContent>(
    key: Key,
    value: CharacterLibraryEditableContent[Key],
  ): void => {
    setDraft(current => ({ ...current, [key]: value }))
  }
  const save = (): void => {
    if (!supported || saving || draft.name.trim() === '') return
    setSaving(true)
    onError('')
    void updateCharacterEdits(detail.id, {
      format: 0, operation: 'save-content', revision: detail.localRevision, content: draft,
    }).then(entry => {
      setSaving(false)
      setEditing(false)
      onChange(entry)
      onNotice('角色设定已保存为本机修订')
    }, reason => {
      setSaving(false)
      onError(reason instanceof Error ? reason.message : String(reason))
    })
  }
  const reset = (): void => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    setSaving(true)
    onError('')
    void updateCharacterEdits(detail.id, {
      format: 0, operation: 'reset', revision: detail.localRevision,
    }).then(entry => {
      setSaving(false)
      setEditing(false)
      setConfirmingReset(false)
      onChange(entry)
      onNotice('已恢复导入时的角色设定与正则开关')
    }, reason => {
      setSaving(false)
      onError(reason instanceof Error ? reason.message : String(reason))
    })
  }
  return <section data-agent-rp-character-content-editor={editing ? 'editing' : 'preview'} style={{
    background: 'var(--dsw-alias-bg-layer-1, #202024)',
    border: '1px solid var(--dsw-alias-border-l2, #39393c)', borderRadius: '10px',
    margin: '4px 0 12px', overflow: 'hidden',
  }}>
    <header style={{ alignItems: 'center', display: 'flex', gap: '8px', padding: '10px 11px' }}>
      <strong style={{ fontSize: '12px' }}>角色设定</strong>
      <span style={{ fontSize: '10px', opacity: .48 }}>
        {detail.localEdits ? `本机修订 ${detail.localRevision}` : '原卡'}
      </span>
      <button type="button" onClick={() => {
        setEditing(value => !value)
        setDraft(contentFromDetail(detail))
        setConfirmingReset(false)
        onError('')
      }} style={{
        background: 'transparent', border: 0, color, cursor: !supported ? 'default' : saving ? 'wait' : 'pointer',
        font: 'inherit', fontSize: '11px', marginLeft: 'auto', padding: '2px 0', whiteSpace: 'nowrap',
      }} disabled={!supported || saving}>{!supported ? '需要刷新服务' : editing ? '收起' : '查看与编辑'}</button>
    </header>
    {!editing && <div style={{ borderTop: '1px solid var(--dsw-alias-border-l2, #39393c)', padding: '9px 11px 10px' }}>
      <div style={{
        display: '-webkit-box', fontSize: '11px', lineHeight: 1.6, opacity: .62,
        overflow: 'hidden', whiteSpace: 'pre-wrap', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3,
      }}>{draft.description.trim() || draft.personality.trim() || (supported ? '这张卡没有填写角色描述或性格' : '本地服务仍在运行旧版本；重启后即可编辑角色设定')}</div>
      {detail.localEdits && <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
        <button type="button" disabled={saving} onClick={reset} style={{
          background: 'transparent', border: 0, color: confirmingReset ? '#e88989' : 'inherit',
          cursor: saving ? 'wait' : 'pointer', font: 'inherit', fontSize: '10px', opacity: confirmingReset ? 1 : .55, padding: 0,
        }}>{saving ? '正在恢复…' : confirmingReset ? '确认恢复原卡' : '恢复原卡'}</button>
        {confirmingReset && <button type="button" onClick={() => { setConfirmingReset(false) }} style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '10px', opacity: .5, padding: 0,
        }}>取消</button>}
        <a href={`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(detail.id)}/export`} download style={{
          color, fontSize: '10px', marginLeft: 'auto', textDecoration: 'none', whiteSpace: 'nowrap',
        }}>导出修改版</a>
      </div>}
    </div>}
    {editing && <div style={{ borderTop: '1px solid var(--dsw-alias-border-l2, #39393c)', display: 'grid', gap: '11px', padding: '11px' }}>
      <label style={{ display: 'grid', fontSize: '11px', gap: '5px' }}>
        <span style={{ fontWeight: 620, opacity: .62 }}>角色名称</span>
        <input value={draft.name} maxLength={200} onChange={event => { update('name', event.target.value) }} style={fieldStyle} />
      </label>
      <Field label="角色描述" value={draft.description} onChange={value => { update('description', value) }} />
      <Field label="性格" value={draft.personality} rows={3} onChange={value => { update('personality', value) }} />
      <Field label="场景" value={draft.scenario} rows={3} onChange={value => { update('scenario', value) }} />
      <Field label="示例对话" value={draft.messageExample} onChange={value => { update('messageExample', value) }} />
      <Field label="默认开场" value={draft.firstMessage} onChange={value => { update('firstMessage', value) }} />
      <div style={{ display: 'grid', gap: '9px' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 620, opacity: .62 }}>备选开场</span>
          <button type="button" onClick={() => { update('alternateGreetings', [...draft.alternateGreetings, '']) }} style={{
            background: 'transparent', border: 0, color, cursor: 'pointer', font: 'inherit', fontSize: '10px', marginLeft: 'auto', padding: 0,
          }}>＋ 添加</button>
        </div>
        {draft.alternateGreetings.length === 0 && <span style={{ fontSize: '10px', opacity: .45 }}>没有备选开场</span>}
        {draft.alternateGreetings.map((greeting, index) => <div key={index} style={{ display: 'grid', gap: '5px' }}>
          <div style={{ alignItems: 'center', display: 'flex' }}>
            <span style={{ fontSize: '10px', opacity: .48 }}>备选开场 {index + 1}</span>
            <button type="button" onClick={() => { update('alternateGreetings', draft.alternateGreetings.filter((_value, itemIndex) => itemIndex !== index)) }} style={{
              background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '10px', marginLeft: 'auto', opacity: .5, padding: 0,
            }}>移除</button>
          </div>
          <textarea value={greeting} rows={4} onChange={event => {
            update('alternateGreetings', draft.alternateGreetings.map((value, itemIndex) => itemIndex === index ? event.target.value : value))
          }} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>)}
      </div>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '9px', justifyContent: 'flex-end' }}>
        {detail.localEdits && <button type="button" disabled={saving} onClick={reset} style={{
          background: 'transparent', border: 0, color: confirmingReset ? '#e88989' : 'inherit', cursor: saving ? 'wait' : 'pointer',
          font: 'inherit', fontSize: '11px', marginRight: 'auto', opacity: confirmingReset ? 1 : .55, padding: 0,
        }}>{confirmingReset ? '确认恢复原卡' : '恢复原卡'}</button>}
        {confirmingReset && <button type="button" onClick={() => { setConfirmingReset(false) }} style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '11px', opacity: .5, padding: 0,
        }}>取消恢复</button>}
        <button type="button" disabled={saving} onClick={() => { setEditing(false); setDraft(contentFromDetail(detail)) }} style={{
          background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px',
          color: 'inherit', cursor: 'pointer', font: 'inherit', padding: '7px 10px', whiteSpace: 'nowrap',
        }}>取消编辑</button>
        <button type="button" disabled={saving || draft.name.trim() === ''} onClick={save} style={{
          background: color, border: 0, borderRadius: '8px', color: '#fff', cursor: saving ? 'wait' : 'pointer',
          font: 'inherit', fontWeight: 620, opacity: draft.name.trim() === '' ? .45 : 1, padding: '7px 11px', whiteSpace: 'nowrap',
        }}>{saving ? '正在保存…' : '保存修改'}</button>
      </div>
      <div style={{ fontSize: '10px', lineHeight: 1.5, opacity: .42 }}>
        修改只保存在本机；原始角色卡保持不变。之后新建的会话会记录并使用这一版完整设定。
      </div>
    </div>}
  </section>
}
