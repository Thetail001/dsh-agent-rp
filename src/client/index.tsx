/** Roleplay browser shell and native SillyTavern migration affordances. */

import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type {
  ClientContext, SessionId, SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { IConversation, TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { createRoot, type Root } from 'react-dom/client'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { AgentRpProjection } from '../projection-types.ts'
import type { PresetConfigurationRequest } from '../preset-configuration-types.ts'
import { exportSillyTavernPresetJson } from '../preset-export.ts'
import { projectPresetPromptSections } from '../preset-sections.ts'
import {
  AI_OUTPUT_PLACEMENT, renderCharacterDisplay, splitCharacterDisplay,
  type CharacterDisplaySegment,
} from '../frontend-regex.ts'
import { selectSillyTavernDraft, type DraftAttachmentLike } from './import-hint.ts'
import {
  CHARACTER_LIBRARY_PATH,
  encodeCharacterLibrarySessionRequest,
  type CharacterLibraryDetail,
  type CharacterLibrarySummary,
} from '../character-library-protocol.ts'
import {
  PERSONA_LIBRARY_PATH,
  type PersonaLibraryEntry,
  type PersonaLibrarySaveRequest,
  type SessionPersonaSnapshot,
} from '../persona-library-protocol.ts'

interface ImportHintProps {
  readonly sessionId: SessionId
  readonly input: {
    readonly draft: string
    readonly attachmentIds?: readonly string[]
    readonly imageIds?: readonly string[]
  }
  readonly inputActions: {
    readonly setDraft: (text: string) => void
  }
}

interface DraftResolver {
  readonly draftAttachments: (ids: readonly string[]) => readonly DraftAttachmentLike[]
}

type HeaderProps = PropsRuntime<'conversation.session.header.actions'> & {
  readonly loadAvatar: (attachmentId: string) => Promise<string | undefined>
  readonly renameSession: (sessionId: SessionId, title: string) => Promise<void>
  readonly configurePreset: (sessionId: SessionId, request: PresetConfigurationRequest) => Promise<void>
  readonly importPreset: (sessionId: SessionId, file: File) => Promise<void>
  readonly managePresetLibrary: (sessionId: SessionId, request: PresetLibraryRequest) => Promise<void>
  readonly listCharacters: () => Promise<readonly CharacterLibrarySummary[]>
  readonly readCharacter: (id: string) => Promise<CharacterLibraryDetail>
  readonly startCharacterSession: (
    sessionId: SessionId,
    character: CharacterLibraryDetail,
    greetingIndex: number,
    persona?: SessionPersonaSnapshot,
  ) => Promise<void>
  readonly listPersonas: () => Promise<readonly PersonaLibraryEntry[]>
  readonly savePersona: (request: PersonaLibrarySaveRequest) => Promise<PersonaLibraryEntry>
}

type ComposerDockProps = PropsRuntime<'conversation.composer.dock'>

type GenerationTailProps = TurnTailOwnerProps & {
  readonly matched: {
    readonly replySeq: number
  }
  readonly sessionId: SessionId
  readonly runGeneration: (
    sessionId: SessionId,
    request: { readonly operation: 'regenerate' | 'continue'; readonly replySeq: number }
      | { readonly operation: 'select'; readonly replySeq: number; readonly versionIndex: number },
  ) => Promise<void>
  readonly useProjection: PropsRuntime<'conversation.composer.dock'>['useProjection']
  readonly useSession: PropsRuntime<'conversation.composer.dock'>['useSession']
}

const color = 'var(--dsw-alias-state-business-primary, #6f78e8)'
const statusPlaceholder = '<StatusPlaceHolderImpl/>'

type RoleplayViewMode = 'immersive' | 'debug'

const roleplayViewListeners = new Map<SessionId, Set<() => void>>()

function roleplayViewKey(sessionId: SessionId): string {
  return `dsh.agent-rp.view.${sessionId}`
}

function readRoleplayViewMode(sessionId: SessionId): RoleplayViewMode {
  return localStorage.getItem(roleplayViewKey(sessionId)) === 'debug' ? 'debug' : 'immersive'
}

function setRoleplayViewMode(sessionId: SessionId, mode: RoleplayViewMode): void {
  if (mode === 'immersive') localStorage.removeItem(roleplayViewKey(sessionId))
  else localStorage.setItem(roleplayViewKey(sessionId), mode)
  for (const listener of roleplayViewListeners.get(sessionId) ?? []) listener()
}

function useRoleplayViewMode(sessionId: SessionId): RoleplayViewMode {
  return useSyncExternalStore(callback => {
    const listeners = roleplayViewListeners.get(sessionId) ?? new Set<() => void>()
    listeners.add(callback)
    roleplayViewListeners.set(sessionId, listeners)
    return () => {
      listeners.delete(callback)
      if (listeners.size === 0) roleplayViewListeners.delete(sessionId)
    }
  }, () => readRoleplayViewMode(sessionId), () => 'immersive')
}

const cardFrameCompatibility = `<style>
html{background:transparent!important;color-scheme:dark;scrollbar-color:rgba(145,158,181,.58) transparent;scrollbar-width:thin}
*,*::before,*::after{box-sizing:border-box}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(145,158,181,.58);background-clip:padding-box}
img,svg,video,canvas{max-width:100%}
</style>`

function mvuFrameRuntime(statData: NonNullable<AgentRpProjection['mvu']>['statData'] | undefined): string {
  const json = JSON.stringify(statData ?? {}).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029')
  return `
var __dshStatData=${json};
window.Mvu={events:{VARIABLE_UPDATE_ENDED:'mvu-variable-update-ended'}};
window.getAllVariables=function(){return {stat_data:__dshStatData}};
window.waitGlobalInitialized=function(){return Promise.resolve()};
window.eventOn=function(){return function(){}};
window.errorCatched=function(fn){return function(){try{var value=fn.apply(this,arguments);if(value&&typeof value.catch==='function')value.catch(console.error)}catch(error){console.error(error)}}};
window._={
  get:function(object,path,fallback){var parts=Array.isArray(path)?path:String(path).replace(/^\\./,'').split('.').filter(Boolean);var value=object;for(var i=0;i<parts.length;i++){if(value==null)return fallback;value=value[parts[i]]}return value===undefined?fallback:value},
  clamp:function(value,min,max){return Math.min(max,Math.max(min,Number(value)))},
};
(function(){
  function nodes(value){if(value instanceof Mini)return value.items;if(typeof value==='string'&&value.trim().startsWith('<')){var template=document.createElement('template');template.innerHTML=value.trim();return Array.from(template.content.childNodes)}if(typeof value==='string')return Array.from(document.querySelectorAll(value));if(value===window||value===document||value instanceof Element||value instanceof DocumentFragment)return [value];if(value&&typeof value.length==='number')return Array.from(value);return []}
  function Mini(value){this.items=nodes(value)}
  Mini.prototype.each=function(callback){this.items.forEach(function(item,index){callback.call(item,index,item)});return this};
  Mini.prototype.text=function(value){if(value===undefined)return this.items[0]?.textContent??'';return this.each(function(){this.textContent=String(value)})};
  Mini.prototype.html=function(value){if(value===undefined)return this.items[0]?.innerHTML??'';return this.each(function(){this.innerHTML=String(value)})};
  Mini.prototype.empty=function(){return this.html('')};
  Mini.prototype.val=function(value){if(value===undefined)return this.items[0]?.value??'';return this.each(function(){this.value=value})};
  Mini.prototype.attr=function(name,value){if(value===undefined)return this.items[0]?.getAttribute?.(name);return this.each(function(){this.setAttribute?.(name,String(value))})};
  Mini.prototype.addClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.add(...names)})};
  Mini.prototype.removeClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.remove(...names)})};
  Mini.prototype.toggleClass=function(value,force){return this.each(function(){this.classList?.toggle(String(value),force)})};
  Mini.prototype.on=function(type,selector,handler){if(typeof selector==='function'){handler=selector;selector=undefined}return this.each(function(){this.addEventListener(type,function(event){if(selector===undefined){handler.call(this,event);return}var target=event.target?.closest?.(selector);if(target&&this.contains(target))handler.call(target,event)})})};
  window.$=function(value){if(typeof value==='function'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',value,{once:true});else queueMicrotask(value);return new Mini([])}return new Mini(value)};
})();
`
}

function cardFrameSource(
  source: string,
  statData: NonNullable<AgentRpProjection['mvu']>['statData'] | undefined,
): string {
  const adapted = source.replaceAll('window.parent?.document ?? window.document', 'window.document')
  const head = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; frame-src 'none';"><meta name="viewport" content="width=device-width,initial-scale=1">${cardFrameCompatibility}<script>${mvuFrameRuntime(statData)}window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};function __dshReportSize(){var root=document.documentElement;var body=document.body;var value=Math.max(root?root.scrollHeight:0,body?body.scrollHeight:0);parent.postMessage({source:'dsh-agent-rp-card',action:'resize',value:value},'*')}addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(!input){input=document.createElement('textarea');input.id='send_textarea';input.hidden=true;document.body.appendChild(input)}input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')});requestAnimationFrame(__dshReportSize);if(window.ResizeObserver)new ResizeObserver(__dshReportSize).observe(document.documentElement)});</script>`
  if (/<head(?:\s|>)/iu.test(adapted)) return adapted.replace(/<head([^>]*)>/iu, `<head$1>${head}`)
  if (/<html(?:\s|>)/iu.test(adapted)) return adapted.replace(/<html([^>]*)>/iu, `<html$1><head>${head}</head>`)
  return `<!doctype html><html><head>${head}</head><body>${adapted}</body></html>`
}

function CharacterDisplay({ segments, statData, characterName }: {
  readonly segments: readonly CharacterDisplaySegment[]
  readonly statData: NonNullable<AgentRpProjection['mvu']>['statData'] | undefined
  readonly characterName: string
}) {
  return <div data-agent-rp-character-display style={{ display: 'grid', gap: '10px', minWidth: 0 }}>
    {segments.map((segment, index) => segment.kind === 'markdown'
      ? <MarkdownText key={index} text={segment.text} />
      : <iframe
          key={index}
          title={`${characterName}的轻前端界面 ${index + 1}`}
          data-agent-rp-frame
          sandbox="allow-scripts"
          srcDoc={cardFrameSource(segment.source, statData)}
          style={{ background: 'transparent', border: 0, colorScheme: 'dark', display: 'block', height: '72px', maxWidth: '100%', width: '100%' }}
        />)}
  </div>
}

function GenerationTail({ matched, runGeneration, sessionId, useProjection, useSession }: GenerationTailProps) {
  const projection = useProjection('agentRp') as AgentRpProjection | undefined
  const running = useSession(snapshot => snapshot.running)
  const [busy, setBusy] = useState<'regenerate' | 'continue' | 'select'>()
  const [error, setError] = useState<string>()
  const group = projection?.generations.find(candidate => candidate.anchorSeq === matched.replySeq)
  if (projection === undefined || projection.currentReplySeq !== matched.replySeq) return null
  const selectedIndex = group?.versions.findIndex(version => version.seq === group.selectedVersionSeq) ?? 0
  const invoke = (request: Parameters<GenerationTailProps['runGeneration']>[1]): void => {
    setBusy(request.operation)
    setError(undefined)
    void runGeneration(sessionId, request).then(
      () => { setBusy(undefined) },
      (reason: unknown) => {
        setBusy(undefined)
        setError(reason instanceof Error ? reason.message : '回复操作失败')
      },
    )
  }
  const disabled = running || busy !== undefined
  return <div data-agent-rp-generation-tail style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '5px', marginRight: 'auto' }}>
    {group !== undefined && group.versions.length > 1 && <>
      <button type="button" aria-label="上一版回复" disabled={disabled || selectedIndex <= 0} onClick={() => {
        invoke({ operation: 'select', replySeq: matched.replySeq, versionIndex: selectedIndex - 1 })
      }} style={generationButtonStyle}>‹</button>
      <span style={{ fontSize: '10px', minWidth: '32px', opacity: 0.5, textAlign: 'center' }}>{selectedIndex + 1} / {group.versions.length}</span>
      <button type="button" aria-label="下一版回复" disabled={disabled || selectedIndex >= group.versions.length - 1} onClick={() => {
        invoke({ operation: 'select', replySeq: matched.replySeq, versionIndex: selectedIndex + 1 })
      }} style={generationButtonStyle}>›</button>
    </>}
    <button type="button" disabled={disabled} onClick={() => { invoke({ operation: 'regenerate', replySeq: matched.replySeq }) }} style={generationButtonStyle}>
      {busy === 'regenerate' ? '重写中…' : '重写'}
    </button>
    <button type="button" disabled={disabled} onClick={() => { invoke({ operation: 'continue', replySeq: matched.replySeq }) }} style={generationButtonStyle}>
      {busy === 'continue' ? '续写中…' : '续写'}
    </button>
    {error !== undefined && <span role="alert" title={error} style={{ color: '#dc7777', fontSize: '10px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</span>}
  </div>
}

const generationButtonStyle = {
  background: 'transparent', border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  borderRadius: '6px', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '10px',
  lineHeight: 1, minHeight: '24px', minWidth: '24px', opacity: 0.58, padding: '4px 7px',
} as const

function initials(name: string): string {
  return [...name.trim()].slice(0, 1).join('').toUpperCase() || 'RP'
}

function characterCapabilitySummary(projection: AgentRpProjection): string {
  const parts = [
    projection.worldInfoCount > 0 ? `${projection.worldInfoCount} 条世界书` : undefined,
    (projection.frontend?.regexScripts.length ?? 0) > 0 ? '轻前端' : undefined,
    projection.mvu === undefined ? undefined : '动态状态',
    projection.preset === undefined ? undefined : `预设 · ${projection.preset.enabledCount} 项启用`,
  ].filter((part): part is string => part !== undefined)
  return parts.length === 0 ? '继续这段对话' : parts.join(' · ')
}

function hideWhileMounted(elements: readonly (HTMLElement | null | undefined)[]): () => void {
  const states = elements
    .filter((element): element is HTMLElement => element != null)
    .map(element => ({
      element,
      display: element.style.getPropertyValue('display'),
      priority: element.style.getPropertyPriority('display'),
    }))
  for (const { element } of states) element.style.setProperty('display', 'none', 'important')
  return () => {
    for (const { element, display, priority } of states) {
      if (display === '') element.style.removeProperty('display')
      else element.style.setProperty('display', display, priority)
    }
  }
}

function roleplaySummary(summary: SessionSummary | undefined, projection: AgentRpProjection | undefined) {
  if (projection !== undefined) return projection
  if (summary?.agentPreset !== 'agent-rp') return undefined
  return {
    characterName: summary.displayTitle,
    description: '',
    personality: '',
    scenario: '',
    importedMessageCount: 0,
    worldInfoCount: 0,
    presetLibrary: [],
    generations: [],
    source: 'preset' as const,
  }
}

function roleplayDisplayName(summary: SessionSummary | undefined, projection: AgentRpProjection): string {
  return summary?.title?.trim() || projection.characterName
}

function Avatar({ projection, loadAvatar, size = 40 }: {
  readonly projection: AgentRpProjection
  readonly loadAvatar: HeaderProps['loadAvatar']
  readonly size?: number
}) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let current = true
    let objectUrl: string | undefined
    const attachmentId = projection.avatarAttachmentId
    if (attachmentId === undefined) {
      setSrc(undefined)
      return () => { current = false }
    }
    void loadAvatar(attachmentId).then((url: string | undefined) => {
      if (!current) {
        if (url !== undefined) URL.revokeObjectURL(url)
        return
      }
      objectUrl = url
      setSrc(url)
    })
    return () => {
      current = false
      if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl)
    }
  }, [loadAvatar, projection.avatarAttachmentId])
  return <span style={{
    alignItems: 'center',
    background: `color-mix(in srgb, ${color} 16%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
    borderRadius: '50%',
    color,
    display: 'inline-flex',
    flex: `0 0 ${size}px`,
    fontSize: `${Math.max(13, Math.round(size * 0.36))}px`,
    fontWeight: 650,
    height: `${size}px`,
    justifyContent: 'center',
    overflow: 'hidden',
    width: `${size}px`,
  }}>
    {src === undefined
      ? initials(projection.characterName)
      : <img src={src} alt="" style={{ height: '100%', objectFit: 'cover', width: '100%' }} />}
  </span>
}

function DetailSection({ title, text }: { readonly title: string; readonly text: string }) {
  if (text.trim() === '') return null
  return <section style={{ marginTop: '18px' }}>
    <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 7px', opacity: 0.56 }}>{title}</h3>
    <p style={{ fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
  </section>
}

function RoleplayHeader({
  sessionId, useProjection, useSessions, loadAvatar, renameSession, configurePreset, importPreset, managePresetLibrary,
  listCharacters, readCharacter, startCharacterSession,
  listPersonas, savePersona,
}: HeaderProps) {
  const summary = useSessions(state => state.byId[sessionId])
  const projected = useProjection('agentRp')
  const projection = roleplaySummary(summary, projected)
  const [open, setOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [aliasDraft, setAliasDraft] = useState('')
  const [aliasError, setAliasError] = useState<string>()
  const [renaming, setRenaming] = useState(false)
  const viewMode = useRoleplayViewMode(sessionId)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (viewMode === 'debug') return
    const root = rootRef.current
    const header = root?.closest('header')
    if (root == null || header == null) return
    const actionSiblings = Array.from(root.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element !== root && element instanceof HTMLElement)
    const secondaryTabs = Array.from(header.querySelectorAll<HTMLElement>('[role="tablist"] [role="tab"]')).slice(1)
    return hideWhileMounted([
      header.querySelector<HTMLElement>('nav[aria-label]'),
      ...actionSiblings,
      ...secondaryTabs,
    ])
  }, [projection !== undefined, viewMode])
  if (projection === undefined) return null
  const displayName = roleplayDisplayName(summary, projection)
  const displayProjection = displayName === projection.characterName
    ? projection
    : { ...projection, characterName: displayName }
  const imported = projection.importedMessageCount > 0
  const status = projection.frontend === undefined || projection.mvu === undefined
    ? undefined
    : renderCharacterDisplay(statusPlaceholder, {
        name: projection.characterName,
        frontend: projection.frontend,
      }, AI_OUTPUT_PLACEMENT, 0, projection.userName, projection.preset?.regexScripts)
  const statusHtml = status === undefined || status === statusPlaceholder
    ? undefined
    : splitCharacterDisplay(status).find(segment => segment.kind === 'html')?.source
  const statusSource = statusHtml === undefined || projection.mvu === undefined
    ? undefined
    : cardFrameSource(statusHtml, projection.mvu.statData)
  return <>
    <div ref={rootRef} data-agent-rp-header style={{ alignItems: 'center', display: 'flex', gap: '10px', marginRight: 'auto', minWidth: 0 }}>
      <Avatar projection={displayProjection} loadAvatar={loadAvatar} />
      <div style={{ minWidth: 0 }}>
        <div style={{ alignItems: 'baseline', display: 'flex', gap: '8px', minWidth: 0 }}>
          <strong style={{ fontSize: '15px', fontWeight: 620, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </strong>
          <span style={{ fontSize: '11px', opacity: 0.48, whiteSpace: 'nowrap' }}>{imported ? '已迁移对话' : '角色对话'}</span>
        </div>
        <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {characterCapabilitySummary(projection)}
        </div>
      </div>
      <button type="button" onClick={() => { setOpen(true) }} style={{
        background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px',
        color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', marginLeft: '8px', padding: '6px 10px',
      }}>角色信息</button>
      <button type="button" onClick={() => { setLibraryOpen(true) }} style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        borderRadius: '8px', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', padding: '6px 10px',
      }}>角色库</button>
      <button type="button" onClick={() => { setPresetOpen(true) }} style={{
        background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)',
        borderRadius: '8px', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', padding: '6px 10px',
      }}>预设</button>
      <button type="button" aria-pressed={viewMode === 'debug'} onClick={() => {
        setRoleplayViewMode(sessionId, viewMode === 'immersive' ? 'debug' : 'immersive')
      }} style={{
        background: viewMode === 'debug' ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
        border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px', color: 'inherit', cursor: 'pointer',
        font: 'inherit', fontSize: '12px', padding: '6px 10px',
      }}>{viewMode === 'debug' ? '返回沉浸' : '调试'}</button>
      {statusSource !== undefined && <button type="button" onClick={() => { setStatusOpen(true) }} style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
        borderRadius: '8px', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', padding: '6px 10px',
      }}>当前状态</button>}
    </div>
    {open && <div role="dialog" aria-modal="true" aria-label={`${displayName}的角色信息`} style={{
      alignItems: 'stretch', background: 'rgba(0,0,0,.48)', display: 'flex', inset: 0,
      justifyContent: 'flex-end', position: 'fixed', zIndex: 1000,
    }} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <aside style={{
        background: 'var(--dsw-alias-bg-base, #171719)', borderLeft: '1px solid var(--dsw-alias-border-l2, #39393c)',
        boxShadow: '-18px 0 44px rgba(0,0,0,.2)', maxWidth: '92vw', overflowY: 'auto', padding: '24px', width: '380px',
      }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '13px' }}>
          <Avatar projection={displayProjection} loadAvatar={loadAvatar} size={54} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>{displayName}</h2>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.52 }}>
              {projection.cardVersion === undefined ? '角色会话' : `角色卡 V${projection.cardVersion}`}
            </div>
          </div>
          <button type="button" aria-label="关闭角色信息" onClick={() => { setOpen(false) }} style={{
            background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '22px', marginLeft: 'auto', padding: '4px',
          }}>×</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '20px' }}>
          {projection.userName !== undefined && <span style={chipStyle}>你是 {projection.userName}</span>}
          {projection.importedMessageCount > 0 && <span style={chipStyle}>{projection.importedMessageCount} 条历史消息</span>}
          {projection.worldInfoCount > 0 && <span style={chipStyle}>{projection.worldInfoCount} 条世界书设定</span>}
          {(projection.frontend?.regexScripts.length ?? 0) > 0 && <span style={chipStyle}>轻前端 · {projection.frontend?.regexScripts.length} 条显示规则</span>}
          {(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 && <span style={chipStyle}>
            {projection.mvu === undefined ? 'MVU · 未初始化' : `MVU · 已接通${projection.mvu.updateCount === 0 ? '' : ` · ${projection.mvu.updateCount} 次更新`}`}
          </span>}
          {projection.preset !== undefined && <span style={chipStyle}>
            预设 · {projection.preset.name} · {projection.preset.enabledCount}/{projection.preset.promptCount} 项启用
          </span>}
        </div>
        <form style={{ marginTop: '20px' }} onSubmit={event => {
          event.preventDefault()
          const alias = aliasDraft.trim()
          if (alias === '') {
            setAliasError('显示名不能为空')
            return
          }
          setRenaming(true)
          setAliasError(undefined)
          void renameSession(sessionId, alias).then(() => {
            setRenaming(false)
          }, error => {
            setRenaming(false)
            setAliasError(error instanceof Error ? error.message : String(error))
          })
        }}>
          <label htmlFor={`agent-rp-alias-${sessionId}`} style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '7px', opacity: 0.56 }}>
            显示名
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input id={`agent-rp-alias-${sessionId}`} value={aliasDraft} placeholder={displayName} onChange={event => { setAliasDraft(event.target.value) }} style={{
              background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)',
              borderRadius: '8px', color: 'inherit', flex: 1, font: 'inherit', minWidth: 0, padding: '7px 9px',
            }} />
            <button type="submit" disabled={renaming} style={{
              background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
              borderRadius: '8px', color: 'inherit', cursor: renaming ? 'wait' : 'pointer', font: 'inherit', padding: '7px 10px',
            }}>{renaming ? '保存中' : '保存'}</button>
          </div>
          {aliasError !== undefined && <div role="alert" style={{ color: '#e88989', fontSize: '12px', marginTop: '6px' }}>{aliasError}</div>}
          {projection.originalCharacterName !== undefined && <div style={{ fontSize: '11px', lineHeight: 1.5, marginTop: '7px', opacity: 0.48 }}>
            原始卡名：{projection.originalCharacterName}
          </div>}
        </form>
        <DetailSection title="角色简介" text={projection.description} />
        <DetailSection title="性格" text={projection.personality} />
        <DetailSection title="当前场景" text={projection.scenario} />
        {projection.persona !== undefined && <DetailSection title={`Persona · ${projection.persona.name}`} text={
          projection.persona.description || '没有额外人物设定'
        } />}
        {projection.preset !== undefined && <DetailSection title="运行预设" text={[
          `${projection.preset.promptCount} 个提示模块，当前启用 ${projection.preset.enabledCount} 个`,
          projection.preset.appliedGeneration.length === 0
            ? '没有可直接映射的生成参数'
            : `已映射：${projection.preset.appliedGeneration.join('、')}`,
          projection.preset.preservedGeneration.length === 0
            ? ''
            : `已保留但当前 Host 未应用：${projection.preset.preservedGeneration.join('、')}`,
          projection.preset.degradedRoleCount === 0
            ? ''
            : `${projection.preset.degradedRoleCount} 项非 system 角色按 Host 兼容模式注入`,
          projection.preset.preservedInChatCount === 0
            ? ''
            : `${projection.preset.preservedInChatCount} 项聊天内注入已保留；当前 Host 暂不执行`,
          projection.preset.regexScriptCount === 0 ? '' : `${projection.preset.enabledRegexScriptCount}/${projection.preset.regexScriptCount} 条正则启用`,
          projection.preset.activeDisplayRegexCount === 0 ? '' : `${projection.preset.activeDisplayRegexCount} 条显示规则正在运行`,
          projection.preset.preservedPromptRegexCount === 0 ? '' : `${projection.preset.preservedPromptRegexCount} 条生成规则已保留；等待 Host 提供独立模型消息视图`,
          ...projection.preset.extensionStatus.map(item => `${item.name}：${item.detail}`),
        ].filter(Boolean).join('\n')} />}
        {projection.source === 'sillytavern-chat' && projection.cardVersion === undefined && <p style={{ fontSize: '13px', lineHeight: 1.7, marginTop: '22px', opacity: 0.62 }}>
          当前只迁移了聊天记录，没有对应角色卡；再次迁移时可将角色卡和 JSONL 放在同一条消息中
        </p>}
      </aside>
    </div>}
    {statusOpen && statusSource !== undefined && <RoleplayStatusDialog
      characterName={displayName}
      source={statusSource}
      onClose={() => { setStatusOpen(false) }}
    />}
    {libraryOpen && <CharacterLibraryDialog
      currentCharacterName={projection.characterName}
      listCharacters={listCharacters}
      readCharacter={readCharacter}
      onClose={() => { setLibraryOpen(false) }}
      onStart={(character, greetingIndex, userName) => startCharacterSession(
        sessionId, character, greetingIndex, userName,
      )}
      listPersonas={listPersonas}
      savePersona={savePersona}
    />}
    {presetOpen && (projection.preset === undefined
      ? <PresetImportDialog
          entries={projection.presetLibrary}
          onClose={() => { setPresetOpen(false) }}
          onImport={file => importPreset(sessionId, file)}
          onLibrary={request => managePresetLibrary(sessionId, request)}
        />
      : <PresetManagerDialog
          preset={projection.preset}
          lastRequest={projection.lastRequest}
          entries={projection.presetLibrary}
          onClose={() => { setPresetOpen(false) }}
          onImport={file => importPreset(sessionId, file)}
          onSave={request => configurePreset(sessionId, request)}
          onLibrary={request => managePresetLibrary(sessionId, request)}
        />)}
  </>
}

function CharacterLibraryDialog({
  currentCharacterName, listCharacters, readCharacter, listPersonas, savePersona, onClose, onStart,
}: {
  readonly currentCharacterName: string
  readonly listCharacters: HeaderProps['listCharacters']
  readonly readCharacter: HeaderProps['readCharacter']
  readonly listPersonas: HeaderProps['listPersonas']
  readonly savePersona: HeaderProps['savePersona']
  readonly onClose: () => void
  readonly onStart: (
    character: CharacterLibraryDetail, greetingIndex: number, persona?: SessionPersonaSnapshot,
  ) => Promise<void>
}) {
  const [entries, setEntries] = useState<readonly CharacterLibrarySummary[]>()
  const [selected, setSelected] = useState<CharacterLibraryDetail>()
  const [greetingIndex, setGreetingIndex] = useState(0)
  const [personas, setPersonas] = useState<readonly PersonaLibraryEntry[]>()
  const [personaId, setPersonaId] = useState('')
  const [editingPersona, setEditingPersona] = useState(false)
  const [personaName, setPersonaName] = useState('')
  const [personaDescription, setPersonaDescription] = useState('')
  const [savingPersona, setSavingPersona] = useState(false)
  const [loadingId, setLoadingId] = useState<string>()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    let current = true
    void listCharacters().then(value => {
      if (!current) return
      setEntries(value)
      const preferred = value.find(entry => entry.displayName === currentCharacterName) ?? value[0]
      if (preferred === undefined) return
      setLoadingId(preferred.id)
      void readCharacter(preferred.id).then(detail => {
        if (!current) return
        setSelected(detail)
        setGreetingIndex(0)
        setLoadingId(undefined)
      }, readError => {
        if (!current) return
        setLoadingId(undefined)
        setError(readError instanceof Error ? readError.message : String(readError))
      })
    }, listError => {
      if (!current) return
      setEntries([])
      setError(listError instanceof Error ? listError.message : String(listError))
    })
    return () => { current = false }
  }, [currentCharacterName, listCharacters, readCharacter])
  useEffect(() => {
    let current = true
    void listPersonas().then(value => {
      if (!current) return
      setPersonas(value)
      setPersonaId(value[0]?.id ?? '')
    }, listError => {
      if (!current) return
      setPersonas([])
      setError(listError instanceof Error ? listError.message : String(listError))
    })
    return () => { current = false }
  }, [listPersonas])
  const choose = (entry: CharacterLibrarySummary): void => {
    setLoadingId(entry.id)
    setError(undefined)
    void readCharacter(entry.id).then(detail => {
      setSelected(detail)
      setGreetingIndex(0)
      setLoadingId(undefined)
    }, readError => {
      setLoadingId(undefined)
      setError(readError instanceof Error ? readError.message : String(readError))
    })
  }
  return <div role="dialog" aria-modal="true" aria-label="角色库" style={{
    alignItems: 'center', background: 'rgba(0,0,0,.52)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '24px', position: 'fixed', zIndex: 1001,
  }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #171719)', border: '1px solid var(--dsw-alias-border-l2, #39393c)',
      borderRadius: '16px', boxShadow: '0 22px 80px rgba(0,0,0,.36)', display: 'grid',
      gridTemplateColumns: 'minmax(210px, .78fr) minmax(330px, 1.35fr)', height: 'min(680px, calc(100vh - 48px))',
      maxWidth: '980px', overflow: 'hidden', width: 'min(980px, calc(100vw - 48px))',
    }}>
      <div style={{ borderRight: '1px solid var(--dsw-alias-border-l2, #39393c)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '22px 20px 14px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>角色库</h2>
          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '7px 0 0', opacity: .55 }}>选择角色只会创建新会话，不会改动当前聊天</p>
        </div>
        <div style={{ display: 'grid', gap: '6px', minHeight: 0, overflowY: 'auto', padding: '4px 10px 18px' }}>
          {entries === undefined && <div style={{ fontSize: '13px', opacity: .55, padding: '16px 10px' }}>正在读取角色…</div>}
          {entries?.length === 0 && <div style={{ fontSize: '13px', lineHeight: 1.65, opacity: .62, padding: '16px 10px' }}>
            角色库还是空的。导入一张角色卡后，它会自动保存在这里
          </div>}
          {entries?.map(entry => <button key={entry.id} type="button" aria-pressed={selected?.id === entry.id}
            onClick={() => { choose(entry) }} style={{
              background: selected?.id === entry.id ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
              border: selected?.id === entry.id ? `1px solid color-mix(in srgb, ${color} 36%, transparent)` : '1px solid transparent',
              borderRadius: '10px', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: '11px', textAlign: 'left',
            }}>
            <div style={{ fontSize: '13px', fontWeight: 620, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.displayName}{loadingId === entry.id ? ' · 读取中' : ''}
            </div>
            <div style={{ fontSize: '11px', marginTop: '5px', opacity: .5 }}>
              V{entry.cardVersion} · {entry.greetingCount} 个开场{entry.worldInfoCount === 0 ? '' : ` · ${entry.worldInfoCount} 条世界书`}
            </div>
          </button>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <header style={{ alignItems: 'center', display: 'flex', padding: '18px 20px 12px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: .5 }}>开始一段新的角色对话</div>
            <strong style={{ display: 'block', fontSize: '17px', marginTop: '3px' }}>{selected?.displayName ?? '选择角色'}</strong>
          </div>
          <button type="button" aria-label="关闭角色库" onClick={onClose} style={{
            background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '23px', marginLeft: 'auto', padding: '4px 6px',
          }}>×</button>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '4px 20px 22px' }}>
          {selected !== undefined && <>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 620, margin: '8px 0 8px', opacity: .65 }}>选择开场</label>
            <div style={{ display: 'grid', gap: '8px' }}>
              {selected.greetings.map((greeting, index) => <button key={index} type="button" aria-pressed={greetingIndex === index}
                onClick={() => { setGreetingIndex(index) }} style={{
                  background: greetingIndex === index ? `color-mix(in srgb, ${color} 13%, transparent)` : 'var(--dsw-alias-bg-layer-1, #202024)',
                  border: greetingIndex === index ? `1px solid color-mix(in srgb, ${color} 38%, transparent)` : '1px solid var(--dsw-alias-border-l2, #39393c)',
                  borderRadius: '10px', color: 'inherit', cursor: 'pointer', font: 'inherit', lineHeight: 1.6,
                  maxHeight: greetingIndex === index ? '170px' : '78px', overflow: 'hidden', padding: '11px 12px', textAlign: 'left', whiteSpace: 'pre-wrap',
                }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 620, marginBottom: '4px', opacity: .5 }}>
                  {index === 0 ? '默认开场' : `备选开场 ${index}`}
                </span>
                <span style={{ fontSize: '13px' }}>{greeting.trim() === '' ? '无开场白' : greeting}</span>
              </button>)}
            </div>
            <div style={{ alignItems: 'center', display: 'flex', margin: '20px 0 7px' }}>
              <label htmlFor="agent-rp-session-persona" style={{ fontSize: '12px', fontWeight: 620, opacity: .65 }}>选择你的 Persona</label>
              <button type="button" onClick={() => {
                setEditingPersona(value => !value)
                setPersonaName('')
                setPersonaDescription('')
              }} style={{ background: 'transparent', border: 0, color, cursor: 'pointer', font: 'inherit', fontSize: '12px', marginLeft: 'auto', padding: 0 }}>
                {editingPersona ? '收起' : '新建 Persona'}
              </button>
            </div>
            <select id="agent-rp-session-persona" value={personaId} onChange={event => { setPersonaId(event.target.value) }} style={{
              background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)',
              borderRadius: '9px', boxSizing: 'border-box', color: 'inherit', font: 'inherit', padding: '9px 10px', width: '100%',
            }}>
              <option value="">不使用 Persona</option>
              {personas?.map(persona => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
            </select>
            {personaId !== '' && <div style={{ fontSize: '12px', lineHeight: 1.6, marginTop: '8px', opacity: .58, whiteSpace: 'pre-wrap' }}>
              {personas?.find(persona => persona.id === personaId)?.description || '只有称呼，没有额外人物设定'}
            </div>}
            {editingPersona && <div style={{ background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)', borderRadius: '10px', display: 'grid', gap: '9px', marginTop: '10px', padding: '11px' }}>
              <input value={personaName} maxLength={120} placeholder="Persona 名称（角色会这样称呼你）" onChange={event => { setPersonaName(event.target.value) }} style={{
                background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #414147)', borderRadius: '8px', boxSizing: 'border-box', color: 'inherit', font: 'inherit', padding: '8px 9px', width: '100%',
              }} />
              <textarea value={personaDescription} maxLength={12000} rows={4} placeholder="你的身份、外貌、性格或与角色的关系；留白也可以" onChange={event => { setPersonaDescription(event.target.value) }} style={{
                background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #414147)', borderRadius: '8px', boxSizing: 'border-box', color: 'inherit', font: 'inherit', lineHeight: 1.55, padding: '8px 9px', resize: 'vertical', width: '100%',
              }} />
              <button type="button" disabled={savingPersona || personaName.trim() === ''} onClick={() => {
                setSavingPersona(true)
                setError(undefined)
                void savePersona({ format: 0, name: personaName, description: personaDescription }).then(entry => {
                  setPersonas(current => [entry, ...(current ?? []).filter(item => item.id !== entry.id)])
                  setPersonaId(entry.id)
                  setEditingPersona(false)
                  setSavingPersona(false)
                }, saveError => {
                  setSavingPersona(false)
                  setError(saveError instanceof Error ? saveError.message : String(saveError))
                })
              }} style={{ background: color, border: 0, borderRadius: '8px', color: '#fff', cursor: 'pointer', font: 'inherit', justifySelf: 'end', opacity: personaName.trim() === '' ? .45 : 1, padding: '7px 11px' }}>
                {savingPersona ? '正在保存…' : '保存并选中'}
              </button>
            </div>}
          </>}
          {error !== undefined && <div role="alert" style={{ color: '#e88989', fontSize: '12px', lineHeight: 1.55, marginTop: '14px' }}>{error}</div>}
        </div>
        <footer style={{ alignItems: 'center', borderTop: '1px solid var(--dsw-alias-border-l2, #39393c)', display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '14px 20px' }}>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '9px',
            color: 'inherit', cursor: 'pointer', font: 'inherit', padding: '8px 13px',
          }}>取消</button>
          <button type="button" disabled={selected === undefined || starting} onClick={() => {
            if (selected === undefined) return
            setStarting(true)
            setError(undefined)
            const persona = personas?.find(entry => entry.id === personaId)
            void onStart(selected, greetingIndex, persona === undefined ? undefined : {
              id: persona.id, name: persona.name, description: persona.description,
            }).then(() => {
              setStarting(false)
              onClose()
            }, startError => {
              setStarting(false)
              setError(startError instanceof Error ? startError.message : String(startError))
            })
          }} style={{
            background: color, border: 0, borderRadius: '9px', color: '#fff', cursor: starting ? 'wait' : 'pointer',
            font: 'inherit', fontWeight: 620, opacity: selected === undefined ? .45 : 1, padding: '8px 15px',
          }}>{starting ? '正在创建…' : '开始对话'}</button>
        </footer>
      </div>
    </section>
  </div>
}

type PresetProjection = NonNullable<AgentRpProjection['preset']>
type PresetPromptProjection = PresetProjection['prompts'][number]
type PresetLibraryEntry = AgentRpProjection['presetLibrary'][number]
type PresetLibraryRequest = { readonly operation: 'list' }
  | { readonly operation: 'select' | 'delete'; readonly id: string }
  | { readonly operation: 'save'; readonly name: string }

function roleLabel(role: PresetPromptProjection['role']): string {
  switch (role) {
    case 'system': return '系统'
    case 'user': return '用户'
    case 'assistant': return '助手'
  }
}

function PresetManagerDialog({ preset, lastRequest, entries, onClose, onImport, onSave, onLibrary }: {
  readonly preset: PresetProjection
  readonly lastRequest?: AgentRpProjection['lastRequest']
  readonly entries: AgentRpProjection['presetLibrary']
  readonly onClose: () => void
  readonly onImport: (file: File) => Promise<void>
  readonly onSave: (request: PresetConfigurationRequest) => Promise<void>
  readonly onLibrary: (request: PresetLibraryRequest) => Promise<void>
}) {
  const [prompts, setPrompts] = useState(() => preset.prompts.map(prompt => ({ ...prompt })))
  const [regexScripts, setRegexScripts] = useState(() => preset.regexScripts.map(script => ({ ...script })))
  const [temperature, setTemperature] = useState(preset.generation.temperature?.toString() ?? '')
  const [maxTokens, setMaxTokens] = useState(preset.generation.maxTokens?.toString() ?? '')
  const [reasoningEffort, setReasoningEffort] = useState(preset.generation.reasoningEffort ?? '')
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<'prompts' | 'regex'>('prompts')
  const [collapsedPromptSections, setCollapsedPromptSections] = useState<ReadonlySet<string>>(() => new Set(
    projectPresetPromptSections(preset.prompts).slice(1).map(group => group.key),
  ))
  const [editingPromptId, setEditingPromptId] = useState<string>()
  const [promptFilter, setPromptFilter] = useState<'all' | 'enabled' | 'modified'>('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const attachedPositionById = new Map(prompts.filter(prompt => prompt.attached).map((prompt, position) => [prompt.identifier, position]))
  const promptModified = (prompt: PresetPromptProjection): boolean => !prompt.imported
    || prompt.name !== prompt.importedName
    || prompt.role !== prompt.importedRole
    || prompt.content !== prompt.importedContent
    || prompt.injectionPosition !== prompt.importedInjectionPosition
    || prompt.injectionDepth !== prompt.importedInjectionDepth
    || prompt.injectionOrder !== prompt.importedInjectionOrder
    || prompt.attached !== prompt.importedAttached
    || (prompt.attached && prompt.enabled !== prompt.importedEnabled)
    || (prompt.attached && attachedPositionById.get(prompt.identifier) !== prompt.importedPosition)
  const promptSections = projectPresetPromptSections(prompts)
  const visiblePromptSections = promptSections.flatMap((group) => {
    const filteredPrompts = group.prompts.filter(prompt => promptFilter === 'all'
      || (promptFilter === 'enabled' && prompt.enabled)
      || (promptFilter === 'modified' && promptModified(prompt)))
    const groupMatches = normalizedQuery === '' || group.title.toLocaleLowerCase().includes(normalizedQuery)
    const matchingPrompts = groupMatches ? filteredPrompts : filteredPrompts.filter(prompt =>
      prompt.name.toLocaleLowerCase().includes(normalizedQuery)
      || prompt.identifier.toLocaleLowerCase().includes(normalizedQuery))
    return matchingPrompts.length === 0 ? [] : [{
      ...group,
      prompts: matchingPrompts,
      enabledCount: matchingPrompts.filter(prompt => prompt.enabled).length,
    }]
  })
  const visibleRegex = regexScripts.filter(script => normalizedQuery === ''
    || script.scriptName.toLocaleLowerCase().includes(normalizedQuery))
  const attached = prompts.filter(prompt => prompt.attached)
  const enabledCount = attached.filter(prompt => prompt.enabled).length
  const editingPrompt = prompts.find(prompt => prompt.identifier === editingPromptId)
  const togglePromptSection = (key: string): void => {
    setCollapsedPromptSections((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const setPrompt = (identifier: string, update: (prompt: PresetPromptProjection) => PresetPromptProjection): void => {
    setPrompts(current => current.map(prompt => prompt.identifier === identifier ? update(prompt) : prompt))
  }
  const setPromptContent = (identifier: string, content: string): void => {
    setPrompt(identifier, prompt => ({
      ...prompt,
      content,
      contentModified: content !== prompt.importedContent,
    }))
  }
  const addPrompt = (): void => {
    const identifier = crypto.randomUUID()
    const prompt: PresetPromptProjection = {
      identifier,
      name: '新提示模块',
      importedName: '新提示模块',
      role: 'system',
      importedRole: 'system',
      content: '',
      importedContent: '',
      imported: false,
      contentModified: false,
      injectionPosition: 0,
      injectionDepth: 4,
      injectionOrder: 100,
      marker: false,
      systemPrompt: false,
      forbidOverrides: false,
      attached: true,
      importedAttached: false,
      enabled: false,
      importedEnabled: false,
      toggleable: true,
      editable: true,
      deletable: true,
    }
    setPrompts(current => [
      ...current.filter(item => item.attached),
      prompt,
      ...current.filter(item => !item.attached),
    ])
    setEditingPromptId(identifier)
  }
  const exportCopy = (): void => {
    const resolvedTemperature = temperature.trim() === '' ? undefined : Number(temperature)
    const resolvedMaxTokens = maxTokens.trim() === '' ? undefined : Number(maxTokens)
    if (resolvedTemperature !== undefined && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
      setError('温度需填写 0 到 2 之间的数字')
      return
    }
    if (resolvedMaxTokens !== undefined && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
      setError('最大输出需填写正整数')
      return
    }
    setError(undefined)
    const exportJson = exportSillyTavernPresetJson({
      prompts: prompts.map(prompt => ({
        identifier: prompt.identifier,
        name: prompt.name,
        role: prompt.role,
        content: prompt.content,
        marker: prompt.marker,
        systemPrompt: prompt.systemPrompt,
        forbidOverrides: prompt.forbidOverrides,
        ...(prompt.injectionPosition === undefined ? {} : { injectionPosition: prompt.injectionPosition }),
        ...(prompt.injectionDepth === undefined ? {} : { injectionDepth: prompt.injectionDepth }),
        ...(prompt.injectionOrder === undefined ? {} : { injectionOrder: prompt.injectionOrder }),
      })),
      order: prompts.filter(prompt => prompt.attached).map(prompt => ({ identifier: prompt.identifier, enabled: prompt.enabled })),
      generation: {
        ...(preset.generation.topP === undefined ? {} : { topP: preset.generation.topP }),
        ...(preset.generation.topK === undefined ? {} : { topK: preset.generation.topK }),
        ...(preset.generation.topA === undefined ? {} : { topA: preset.generation.topA }),
        ...(preset.generation.minP === undefined ? {} : { minP: preset.generation.minP }),
        ...(preset.generation.frequencyPenalty === undefined ? {} : { frequencyPenalty: preset.generation.frequencyPenalty }),
        ...(preset.generation.presencePenalty === undefined ? {} : { presencePenalty: preset.generation.presencePenalty }),
        ...(preset.generation.repetitionPenalty === undefined ? {} : { repetitionPenalty: preset.generation.repetitionPenalty }),
        ...(resolvedTemperature === undefined ? {} : { temperature: resolvedTemperature }),
        ...(resolvedMaxTokens === undefined ? {} : { maxTokens: resolvedMaxTokens }),
        ...(reasoningEffort === '' ? {} : { reasoningEffort }),
      },
      formats: preset.formats,
      regexScripts: regexScripts.map(({ index: _index, ...script }) => script),
    })
    const blob = new Blob([exportJson], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${preset.name.replace(/[\\/:*?"<>|]+/gu, '_')} · Agent RP 副本.json`
    anchor.click()
    anchor.remove()
    setTimeout(() => { URL.revokeObjectURL(url) }, 0)
  }
  const move = (identifier: string, direction: -1 | 1): void => {
    setPrompts((current) => {
      const attachedPrompts = current.filter(prompt => prompt.attached)
      const detachedPrompts = current.filter(prompt => !prompt.attached)
      const index = attachedPrompts.findIndex(prompt => prompt.identifier === identifier)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= attachedPrompts.length) return current
      const next = [...attachedPrompts]
      const [entry] = next.splice(index, 1)
      if (entry === undefined) return current
      next.splice(destination, 0, entry)
      return [...next, ...detachedPrompts]
    })
  }
  const save = async (close = true): Promise<boolean> => {
    const resolvedTemperature = temperature.trim() === '' ? null : Number(temperature)
    const resolvedMaxTokens = maxTokens.trim() === '' ? null : Number(maxTokens)
    if (resolvedTemperature !== null && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
      setError('温度需填写 0 到 2 之间的数字')
      return false
    }
    if (resolvedMaxTokens !== null && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
      setError('最大输出需填写正整数')
      return false
    }
    setSaving(true)
    setError(undefined)
    try {
      await onSave({
        operation: 'replace',
        revision: preset.revision,
        order: prompts.filter(prompt => prompt.attached).map(prompt => ({
          identifier: prompt.identifier,
          enabled: prompt.enabled,
        })),
        prompts: prompts.map(prompt => ({
          identifier: prompt.identifier,
          name: prompt.name,
          role: prompt.role,
          content: prompt.content,
          ...(prompt.injectionPosition === undefined ? {} : { injectionPosition: prompt.injectionPosition }),
          ...(prompt.injectionDepth === undefined ? {} : { injectionDepth: prompt.injectionDepth }),
          ...(prompt.injectionOrder === undefined ? {} : { injectionOrder: prompt.injectionOrder }),
        })),
        content: [],
        generation: {
          temperature: resolvedTemperature,
          maxTokens: resolvedMaxTokens,
          reasoningEffort: reasoningEffort === '' ? null : reasoningEffort,
        },
        regex: regexScripts.map(script => ({ index: script.index, disabled: script.disabled })),
      })
      if (close) onClose()
      return true
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '预设保存失败')
      return false
    } finally {
      setSaving(false)
    }
  }
  const reset = async (): Promise<void> => {
    setSaving(true)
    setError(undefined)
    try {
      await onSave({ operation: 'reset', revision: preset.revision })
      onClose()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '恢复预设默认值失败')
    } finally {
      setSaving(false)
    }
  }
  const saveToLibrary = async (): Promise<void> => {
    const name = window.prompt('新预设名称', `${preset.name} · 副本`)?.trim()
    if (name === undefined || name === '') return
    if (!await save(false)) return
    setSaving(true)
    try {
      await onLibrary({ operation: 'save', name })
      onClose()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '另存预设失败')
    } finally {
      setSaving(false)
    }
  }
  return <div className="agent-rp-preset-overlay" role="dialog" aria-modal="true" aria-label={`${preset.name}预设管理`} style={{
    alignItems: 'center', background: 'rgba(0,0,0,.62)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '18px', position: 'fixed', zIndex: 1100,
  }} onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <style>{presetManagerResponsiveStyle}</style>
    <section className="agent-rp-preset-dialog" style={{
      background: 'var(--dsw-alias-bg-base, #151518)', border: '1px solid var(--dsw-alias-border-l2, #38383d)',
      borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column',
      maxHeight: 'min(900px, 92vh)', maxWidth: '920px', overflow: 'hidden', width: 'min(96vw, 920px)',
    }}>
      <header style={{ alignItems: 'center', borderBottom: '1px solid var(--dsw-alias-border-l2, #343438)', display: 'flex', gap: '12px', padding: '18px 20px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '17px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</h2>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.56 }}>{enabledCount} 项提示启用 · {regexScripts.filter(script => !script.disabled).length}/{regexScripts.length} 条正则启用 · 会话独立</div>
        </div>
        <button type="button" aria-label="关闭预设管理" disabled={saving} onClick={onClose} style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '22px', marginLeft: 'auto', padding: '4px',
        }}>×</button>
      </header>
      <div className="agent-rp-preset-body" style={{ display: 'grid', flex: '1 1 auto', gap: '14px', gridTemplateColumns: 'minmax(0, 1fr) 230px', minHeight: 0, padding: '16px 20px' }}>
        <div className="agent-rp-preset-list" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '9px' }}>
            {([['prompts', '提示模块'], ['regex', '正则脚本']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setSection(value); setQuery('') }} style={{
              ...miniButtonStyle, background: section === value ? `color-mix(in srgb, ${color} 16%, transparent)` : 'transparent',
              borderColor: section === value ? `color-mix(in srgb, ${color} 42%, transparent)` : miniButtonStyle.border,
              height: '30px', padding: '3px 10px',
            }}>{label}{value === 'regex' ? ` · ${regexScripts.length}` : ''}</button>)}
          </div>
          <input aria-label={section === 'prompts' ? '搜索提示模块' : '搜索正则脚本'} placeholder={section === 'prompts' ? '搜索模块名称或标识…' : '搜索正则脚本名称…'} value={query} onChange={event => { setQuery(event.target.value) }} style={{
            background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)',
            borderRadius: '9px', color: 'inherit', font: 'inherit', fontSize: '13px', outline: 'none', padding: '9px 11px',
          }} />
          {section === 'prompts' && <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
            {([['all', '全部'], ['enabled', '已启用'], ['modified', '已修改']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setPromptFilter(value) }} style={{
              ...miniButtonStyle,
              background: promptFilter === value ? `color-mix(in srgb, ${color} 14%, transparent)` : 'transparent',
              borderColor: promptFilter === value ? `color-mix(in srgb, ${color} 38%, transparent)` : miniButtonStyle.border,
            }}>{label}</button>)}
            <button type="button" onClick={addPrompt} style={{ ...miniButtonStyle, marginLeft: 'auto' }}>＋ 新建模块</button>
          </div>}
          <div style={{ display: 'flex', fontSize: '11px', justifyContent: 'space-between', margin: '10px 3px 7px', opacity: 0.48 }}>
            <span>{section === 'prompts' ? '提示模块' : '预设正则'}</span><span>{section === 'prompts' ? '顺序与开关' : '开关'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
            {section === 'prompts' && visiblePromptSections.map((group) => {
              const collapsed = normalizedQuery === '' && collapsedPromptSections.has(group.key)
              return <section key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button type="button" aria-expanded={!collapsed} onClick={() => { togglePromptSection(group.key) }} style={{
                  alignItems: 'center', background: 'var(--dsw-alias-bg-layer-1, #202024)',
                  border: '1px solid var(--dsw-alias-border-l2, #34343a)', borderRadius: '10px', color: 'inherit',
                  cursor: 'pointer', display: 'grid', font: 'inherit', gap: '8px', gridTemplateColumns: '18px minmax(0, 1fr) auto',
                  minHeight: '42px', padding: '8px 11px', textAlign: 'left', width: '100%',
                }}>
                  <span aria-hidden="true" style={{ fontSize: '12px', opacity: 0.58, transform: `rotate(${collapsed ? 0 : 90}deg)`, transition: 'transform .14s ease' }}>›</span>
                  <span style={{ fontSize: '13px', fontWeight: 620, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.title}</span>
                  <span style={{ fontSize: '10px', opacity: 0.46 }}>{group.enabledCount}/{group.prompts.length} 启用</span>
                </button>
                {!collapsed && group.prompts.map((prompt) => {
                  const attachedIndex = prompts.filter(item => item.attached).findIndex(item => item.identifier === prompt.identifier)
                  return <div key={prompt.identifier} style={{
                alignItems: 'center', background: prompt.enabled ? `color-mix(in srgb, ${color} 9%, transparent)` : 'var(--dsw-alias-bg-layer-1, #202024)',
                border: `1px solid ${prompt.enabled ? `color-mix(in srgb, ${color} 24%, transparent)` : 'var(--dsw-alias-border-l2, #34343a)'}`,
                borderRadius: '10px', display: 'grid', gap: '8px', gridTemplateColumns: 'minmax(0, 1fr) auto', marginLeft: '8px', minHeight: '52px', padding: '8px 9px 8px 12px',
                opacity: prompt.attached ? 1 : 0.62,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: '7px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.name || prompt.identifier}</span>
                    <span style={{ fontSize: '10px', opacity: 0.48 }}>{prompt.marker ? '结构位' : roleLabel(prompt.role)}</span>
                    {promptModified(prompt) && <span style={{ color, fontSize: '10px', opacity: 0.82 }}>已修改</span>}
                  </div>
                  <div title={prompt.identifier} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', marginTop: '3px', opacity: 0.38, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.identifier}</div>
                </div>
                <div style={{ alignItems: 'center', display: 'flex', gap: '5px' }}>
                  {prompt.editable && <button type="button" onClick={() => { setEditingPromptId(prompt.identifier) }} style={miniButtonStyle}>编辑</button>}
                  {prompt.imported && prompt.editable && prompt.content !== prompt.importedContent && <button type="button" onClick={() => { setPromptContent(prompt.identifier, prompt.importedContent) }} style={miniButtonStyle}>恢复默认正文</button>}
                  {prompt.attached && <>
                    <button type="button" aria-label={`上移${prompt.name}`} disabled={attachedIndex <= 0 || normalizedQuery !== ''} onClick={() => { move(prompt.identifier, -1) }} style={miniButtonStyle}>↑</button>
                    <button type="button" aria-label={`下移${prompt.name}`} disabled={attachedIndex >= attached.length - 1 || normalizedQuery !== ''} onClick={() => { move(prompt.identifier, 1) }} style={miniButtonStyle}>↓</button>
                  </>}
                  {prompt.toggleable ? <button type="button" role="switch" aria-checked={prompt.enabled} onClick={() => {
                    setPrompt(prompt.identifier, value => ({ ...value, attached: true, enabled: !value.enabled }))
                  }} style={{
                    background: prompt.enabled ? color : 'var(--dsw-alias-bg-layer-2, #2b2b30)', border: 0, borderRadius: '999px',
                    cursor: 'pointer', height: '22px', padding: '2px', position: 'relative', width: '39px',
                  }}><span style={{
                    background: '#fff', borderRadius: '50%', display: 'block', height: '18px', transform: `translateX(${prompt.enabled ? 17 : 0}px)`, transition: 'transform .14s ease', width: '18px',
                  }} /></button> : <span style={{ fontSize: '10px', opacity: 0.44, padding: '0 3px' }}>固定</span>}
                  {!prompt.attached && <button type="button" onClick={() => { setPrompt(prompt.identifier, value => ({ ...value, attached: true })) }} style={miniButtonStyle}>加入</button>}
                </div>
                  </div>
                })}
              </section>
            })}
            {section === 'regex' && visibleRegex.map(script => <div key={script.index} style={{
              alignItems: 'center', background: !script.disabled ? `color-mix(in srgb, ${color} 9%, transparent)` : 'var(--dsw-alias-bg-layer-1, #202024)',
              border: `1px solid ${!script.disabled ? `color-mix(in srgb, ${color} 24%, transparent)` : 'var(--dsw-alias-border-l2, #34343a)'}`,
              borderRadius: '10px', display: 'grid', gap: '8px', gridTemplateColumns: 'minmax(0, 1fr) auto', minHeight: '52px', padding: '8px 9px 8px 12px',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{script.scriptName}</div>
                <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.42 }}>{[
                  script.markdownOnly ? '显示' : undefined,
                  script.promptOnly ? '生成规则已保留' : undefined,
                  script.placement.includes(1) ? '用户消息' : undefined,
                  script.placement.includes(2) ? '角色回复' : undefined,
                ].filter(Boolean).join(' · ') || '普通处理'}</div>
              </div>
              <button type="button" role="switch" aria-checked={!script.disabled} disabled={saving} onClick={() => { setRegexScripts(current => current.map(item => item.index === script.index ? { ...item, disabled: !item.disabled } : item)) }} style={{
                background: !script.disabled ? color : 'var(--dsw-alias-bg-layer-2, #2b2b30)', border: 0, borderRadius: '999px',
                cursor: 'pointer', height: '22px', padding: '2px', position: 'relative', width: '39px',
              }}><span style={{
                background: '#fff', borderRadius: '50%', display: 'block', height: '18px', transform: `translateX(${!script.disabled ? 17 : 0}px)`, transition: 'transform .14s ease', width: '18px',
              }} /></button>
            </div>)}
            {((section === 'prompts' && visiblePromptSections.length === 0) || (section === 'regex' && visibleRegex.length === 0)) && <div style={{ fontSize: '13px', opacity: 0.52, padding: '32px 10px', textAlign: 'center' }}>没有匹配的{section === 'prompts' ? '模块' : '正则脚本'}</div>}
          </div>
        </div>
        <aside className="agent-rp-preset-generation" style={{ borderLeft: '1px solid var(--dsw-alias-border-l2, #343438)', paddingLeft: '16px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '2px 0 13px', opacity: 0.62 }}>生成参数</h3>
          <PresetNumberField label="温度" hint="0—2" value={temperature} onChange={setTemperature} />
          <PresetNumberField label="最大输出" hint="由模型上限约束" value={maxTokens} onChange={setMaxTokens} />
          <label style={fieldLabelStyle}>推理等级
            <select value={reasoningEffort} onChange={event => { setReasoningEffort(event.target.value) }} style={fieldInputStyle}>
              <option value="">跟随会话</option>
              <option value="auto">自动（跟随模型）</option><option value="off">关闭</option><option value="min">Min</option>
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="xhigh">XHigh</option><option value="max">Max</option>
              {reasoningEffort !== '' && !['auto', 'off', 'min', 'low', 'medium', 'high', 'xhigh', 'max'].includes(reasoningEffort)
                && <option value={reasoningEffort}>导入值 · {reasoningEffort}</option>}
            </select>
          </label>
          <p style={{ fontSize: '11px', lineHeight: 1.55, margin: '16px 1px 0', opacity: 0.46 }}>
            修改只影响当前角色会话。未填写的参数跟随会话与模型设置
          </p>
          {preset.extensionStatus.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '12px 1px 0' }}>
            {preset.extensionStatus.map(item => <div key={item.name} style={{ fontSize: '10px', lineHeight: 1.45, opacity: item.state === 'unsupported' ? 0.72 : 0.44 }}>
              <span style={{ color: item.state === 'unsupported' ? '#d9a85f' : item.state === 'active' ? '#7ec89b' : 'inherit' }}>●</span>{' '}{item.name} · {item.detail}
            </div>)}
          </div>}
        </aside>
      </div>
      <footer className="agent-rp-preset-footer" style={{ alignItems: 'center', borderTop: '1px solid var(--dsw-alias-border-l2, #343438)', display: 'flex', gap: '9px', justifyContent: 'flex-end', minHeight: '64px', padding: '12px 20px' }}>
        {error !== undefined && <span role="alert" style={{ color: '#e47a7a', fontSize: '12px', marginRight: 'auto' }}>{error}</span>}
        <button type="button" disabled={saving} onClick={() => { void reset() }} style={{ ...secondaryButtonStyle, marginRight: error === undefined ? 'auto' : undefined }}>恢复预设默认值</button>
        <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={event => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file === undefined) return
          setSaving(true)
          setError(undefined)
          void onImport(file).then(onClose, (reason: unknown) => {
            setError(reason instanceof Error ? reason.message : '预设导入失败')
            setSaving(false)
          })
        }} />
        <button type="button" disabled={saving} onClick={() => { importInputRef.current?.click() }} style={secondaryButtonStyle}>替换预设</button>
        <button type="button" disabled={saving} onClick={() => { setLibraryOpen(true); void onLibrary({ operation: 'list' }) }} style={secondaryButtonStyle}>预设库</button>
        <button type="button" disabled={saving} onClick={() => { setInspectionOpen(true) }} style={secondaryButtonStyle}>运行检查</button>
        <button type="button" disabled={saving} onClick={exportCopy} title={preset.omittedExtensions.length === 0 ? '导出当前配置' : `不包含未执行扩展：${preset.omittedExtensions.join('、')}`} style={secondaryButtonStyle}>导出副本</button>
        <button type="button" disabled={saving} onClick={() => { void saveToLibrary() }} style={secondaryButtonStyle}>另存为预设</button>
        <button type="button" disabled={saving} onClick={onClose} style={secondaryButtonStyle}>取消</button>
        <button type="button" disabled={saving} onClick={() => { void save() }} style={primaryButtonStyle}>{saving ? '保存中…' : '保存到此会话'}</button>
      </footer>
    </section>
    {editingPrompt !== undefined && <PresetPromptEditorDialog
      prompt={editingPrompt}
      onClose={() => { setEditingPromptId(undefined) }}
      onApply={(value) => {
        setPrompt(editingPrompt.identifier, prompt => ({
          ...prompt,
          name: value.name,
          role: value.role,
          content: value.content,
          injectionPosition: value.injectionPosition,
          injectionDepth: value.injectionDepth,
          injectionOrder: value.injectionOrder,
          contentModified: value.content !== prompt.importedContent,
        }))
        setEditingPromptId(undefined)
      }}
      {...editingPrompt.deletable ? { onDelete: () => {
        setPrompts(current => current.filter(prompt => prompt.identifier !== editingPrompt.identifier))
        setEditingPromptId(undefined)
      } } : {}}
    />}
    {libraryOpen && <PresetLibraryDialog
      entries={entries}
      {...preset.libraryId === undefined ? {} : { activeId: preset.libraryId }}
      onClose={() => { setLibraryOpen(false) }}
      onAction={async request => {
        await onLibrary(request)
        if (request.operation === 'select') onClose()
      }}
    />}
    {inspectionOpen && <PresetRuntimeInspector
      preset={preset}
      lastRequest={lastRequest}
      onClose={() => { setInspectionOpen(false) }}
    />}
  </div>
}

function requestParameterSummary(request: NonNullable<AgentRpProjection['lastRequest']>): readonly string[] {
  const config = request.config
  return [
    `${config.provider} / ${config.model}`,
    config.reasoningEffort === undefined ? undefined : `推理 ${config.reasoningEffort}`,
    config.temperature === undefined ? undefined : `温度 ${config.temperature}`,
    config.maxTokens === undefined ? undefined : `最大输出 ${config.maxTokens}`,
    config.stop === undefined || config.stop.length === 0 ? undefined : `${config.stop.length} 个停止词`,
    request.toolNames.length === 0 ? '未提供工具' : `${request.toolNames.length} 个工具`,
  ].filter((value): value is string => value !== undefined)
}

function requestedReasoningDifference(
  preset: PresetProjection,
  request: NonNullable<AgentRpProjection['lastRequest']>,
  requestMatches: boolean,
): string | undefined {
  const requested = preset.generation.reasoningEffort
  const actual = request.config.reasoningEffort
  if (!requestMatches || requested === undefined || requested === 'auto' || actual === undefined || requested === actual) return undefined
  return `推理等级不同：预设保存的是 ${requested}，这次实际请求使用 ${actual}。当前模型没有采用预设值`
}

function PresetRuntimeInspector({ preset, lastRequest, onClose }: {
  readonly preset: PresetProjection
  readonly lastRequest?: AgentRpProjection['lastRequest']
  readonly onClose: () => void
}) {
  const enabled = preset.prompts.filter(prompt => prompt.attached && prompt.enabled)
  const historyIndex = enabled.findIndex(prompt => prompt.identifier === 'chatHistory' && prompt.marker)
  const requestMatches = lastRequest !== undefined
    && lastRequest.presetName === preset.name && lastRequest.presetRevision === preset.revision
  const reasoningDifference = lastRequest === undefined
    ? undefined
    : requestedReasoningDifference(preset, lastRequest, requestMatches)
  return <div role="dialog" aria-modal="true" aria-label="预设运行检查" style={{
    alignItems: 'center', background: 'rgba(0,0,0,.7)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '18px', position: 'fixed', zIndex: 1250,
  }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #151518)', border: '1px solid var(--dsw-alias-border-l2, #38383d)',
      borderRadius: '16px', boxShadow: '0 26px 90px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column',
      maxHeight: '92vh', maxWidth: '1100px', overflow: 'hidden', width: 'min(96vw, 1100px)',
    }}>
      <header style={{ alignItems: 'center', borderBottom: '1px solid var(--dsw-alias-border-l2, #343438)', display: 'flex', gap: '12px', padding: '18px 20px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '17px', margin: 0 }}>运行检查</h2>
          <div style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '4px', opacity: 0.56 }}>已保存的预设顺序与 Host 最近记录的实际系统提示</div>
        </div>
        <button type="button" aria-label="关闭运行检查" onClick={onClose} style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '22px', marginLeft: 'auto', padding: '4px',
        }}>×</button>
      </header>
      <div style={{ borderBottom: '1px solid var(--dsw-alias-border-l2, #343438)', padding: '13px 20px' }}>
        {lastRequest === undefined
          ? <div role="status" style={{ background: 'var(--dsw-alias-bg-layer-1, #202024)', borderRadius: '9px', fontSize: '12px', lineHeight: 1.6, padding: '10px 12px' }}>
              这段会话还没有真实模型请求。发送一条消息后，这里才会出现实际系统提示和最终参数
            </div>
          : <>
              <div role="status" style={{ color: requestMatches ? 'inherit' : '#d9a85f', fontSize: '12px', lineHeight: 1.5 }}>
                {requestMatches
                  ? `当前预设版本与最近记录的请求一致 · ${new Date(lastRequest.time).toLocaleString()}`
                  : `当前预设在最近记录的请求之后发生过变化 · 右侧仍显示当时实际使用的内容`}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px' }}>
                {requestParameterSummary(lastRequest).map(value => <span key={value} style={chipStyle}>{value}</span>)}
              </div>
              {reasoningDifference !== undefined && <div role="note" style={{
                background: 'rgba(217,168,95,.1)', border: '1px solid rgba(217,168,95,.28)', borderRadius: '9px',
                color: '#e3b66f', fontSize: '11px', lineHeight: 1.55, marginTop: '10px', padding: '8px 10px',
              }}>{reasoningDifference}</div>}
            </>}
      </div>
      <div className="agent-rp-runtime-inspector-body" style={{ display: 'grid', flex: '1 1 auto', gridTemplateColumns: 'minmax(280px, .78fr) minmax(360px, 1.22fr)', minHeight: 0, overflow: 'hidden' }}>
        <section className="agent-rp-runtime-inspector-order" style={{ borderRight: '1px solid var(--dsw-alias-border-l2, #343438)', minHeight: 0, overflowY: 'auto', padding: '17px 18px' }}>
          <div style={{ alignItems: 'baseline', display: 'flex', gap: '8px', marginBottom: '11px' }}>
            <h3 style={{ fontSize: '12px', margin: 0 }}>当前组装顺序</h3>
            <span style={{ fontSize: '10px', opacity: 0.44 }}>{enabled.length} 项启用</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {enabled.map((prompt, index) => {
              const retained = prompt.injectionPosition === 1
              const history = prompt.identifier === 'chatHistory' && prompt.marker
              const placement = retained ? '保留，当前不执行' : history ? '聊天记录位置'
                : historyIndex >= 0 && index > historyIndex ? '历史之后' : '系统提示'
              return <div key={prompt.identifier} style={{
                alignItems: 'center', background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #34343a)',
                borderRadius: '9px', display: 'grid', gap: '9px', gridTemplateColumns: '25px minmax(0, 1fr) auto', padding: '8px 9px',
              }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', opacity: 0.38, textAlign: 'right' }}>{index + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.name || prompt.identifier}</span>
                  <span title={prompt.identifier} style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: '9px', marginTop: '2px', opacity: 0.34, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.identifier}</span>
                </span>
                <span style={{ color: retained ? '#d9a85f' : 'inherit', fontSize: '9px', opacity: retained ? 0.9 : 0.48, whiteSpace: 'nowrap' }}>{placement}</span>
              </div>
            })}
          </div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '17px 18px' }}>
          <div style={{ alignItems: 'baseline', display: 'flex', gap: '8px', marginBottom: '11px' }}>
            <h3 style={{ fontSize: '12px', margin: 0 }}>最近记录的实际系统提示</h3>
            {lastRequest !== undefined && <span style={{ fontSize: '10px', opacity: 0.44 }}>{lastRequest.system.length.toLocaleString()} 字符</span>}
          </div>
          <pre style={{
            background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #34343a)', borderRadius: '10px',
            flex: '1 1 auto', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '11px', lineHeight: 1.62,
            margin: 0, minHeight: '300px', overflow: 'auto', padding: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{lastRequest === undefined ? '尚无真实请求' : lastRequest.system || '这一轮没有系统提示'}</pre>
          <p style={{ fontSize: '10px', lineHeight: 1.5, margin: '9px 1px 0', opacity: 0.42 }}>
            这里只展示 Host 写入会话记录的 system prompt；聊天历史与用户消息不会复制到检查页
          </p>
        </section>
      </div>
    </section>
  </div>
}

function PresetPromptEditorDialog({ prompt, onClose, onApply, onDelete }: {
  readonly prompt: PresetPromptProjection
  readonly onClose: () => void
  readonly onApply: (value: {
    readonly name: string
    readonly role: PresetPromptProjection['role']
    readonly content: string
    readonly injectionPosition: number
    readonly injectionDepth: number
    readonly injectionOrder: number
  }) => void
  readonly onDelete?: () => void
}) {
  const [name, setName] = useState(prompt.name)
  const [role, setRole] = useState(prompt.role)
  const [content, setContent] = useState(prompt.content)
  const [injectionPosition, setInjectionPosition] = useState(prompt.injectionPosition ?? 0)
  const [injectionDepth, setInjectionDepth] = useState(String(prompt.injectionDepth ?? 4))
  const [injectionOrder, setInjectionOrder] = useState(String(prompt.injectionOrder ?? 100))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const resolvedDepth = Number(injectionDepth)
  const resolvedOrder = Number(injectionOrder)
  const validInjection = injectionPosition === 0 || (
    Number.isSafeInteger(resolvedDepth) && resolvedDepth >= 0 && resolvedDepth <= 9999
    && Number.isSafeInteger(resolvedOrder) && resolvedOrder >= 0 && resolvedOrder <= 9999
  )
  return <div role="dialog" aria-modal="true" aria-label={`编辑${prompt.name || prompt.identifier}`} style={{
    alignItems: 'center', background: 'rgba(0,0,0,.7)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '18px', position: 'fixed', zIndex: 1150,
  }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #151518)', border: '1px solid var(--dsw-alias-border-l2, #38383d)',
      borderRadius: '14px', boxShadow: '0 24px 80px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column',
      maxHeight: 'min(820px, 90vh)', maxWidth: '760px', overflow: 'hidden', width: 'min(94vw, 760px)',
    }}>
      <header style={{ borderBottom: '1px solid var(--dsw-alias-border-l2, #343438)', display: 'grid', gap: '8px', gridTemplateColumns: 'minmax(0, 1fr) 130px', padding: '14px 18px' }}>
        <label style={{ ...fieldLabelStyle, margin: 0 }}>模块名称
          <input aria-label="模块名称" value={name} onChange={event => { setName(event.target.value) }} style={fieldInputStyle} />
        </label>
        <label style={{ ...fieldLabelStyle, margin: 0 }}>消息角色
          <select aria-label="消息角色" value={role} onChange={event => { setRole(event.target.value as PresetPromptProjection['role']) }} style={fieldInputStyle}>
            <option value="system">系统</option><option value="user">用户</option><option value="assistant">助手</option>
          </select>
        </label>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', gridColumn: '1 / -1', opacity: 0.4 }}>{prompt.identifier}</div>
        <label style={{ ...fieldLabelStyle, margin: 0 }}>插入位置
          <select aria-label="插入位置" value={injectionPosition} onChange={event => { setInjectionPosition(Number(event.target.value)) }} style={fieldInputStyle}>
            <option value={0}>相对（按模块顺序）</option><option value={1}>聊天内（按历史深度）</option>
          </select>
        </label>
        {injectionPosition === 1 && <>
          <label style={{ ...fieldLabelStyle, margin: 0 }}>历史深度
            <input aria-label="历史深度" type="number" min={0} max={9999} value={injectionDepth} onChange={event => { setInjectionDepth(event.target.value) }} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, margin: 0 }}>同深度优先级
            <input aria-label="同深度优先级" type="number" min={0} max={9999} value={injectionOrder} onChange={event => { setInjectionOrder(event.target.value) }} style={fieldInputStyle} />
          </label>
          <div style={{ alignSelf: 'end', color: '#d6aa67', fontSize: '10px', lineHeight: 1.45 }}>配置会完整保留；当前 Host 暂不执行聊天内深度注入</div>
        </>}
      </header>
      <textarea aria-label="提示内容" autoFocus spellCheck={false} value={content} onChange={event => { setContent(event.target.value) }} style={{
        background: 'var(--dsw-alias-bg-layer-1, #202024)', border: 0, color: 'inherit', flex: '1 1 auto',
        font: '13px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace', minHeight: '360px', outline: 'none',
        padding: '16px 18px', resize: 'none', whiteSpace: 'pre-wrap',
      }} />
      <footer style={{ alignItems: 'center', borderTop: '1px solid var(--dsw-alias-border-l2, #343438)', display: 'flex', gap: '9px', justifyContent: 'flex-end', padding: '12px 18px' }}>
        <span style={{ fontSize: '10px', marginRight: 'auto', opacity: 0.42 }}>{content.length.toLocaleString()} 字符</span>
        {onDelete !== undefined && (confirmingDelete
          ? <><span style={{ color: '#e47a7a', fontSize: '11px' }}>永久移除此模块？</span><button type="button" onClick={onDelete} style={{ ...secondaryButtonStyle, borderColor: '#a94f4f', color: '#ef8a8a' }}>确认删除</button></>
          : <button type="button" onClick={() => { setConfirmingDelete(true) }} style={{ ...secondaryButtonStyle, marginRight: 'auto' }}>删除模块</button>)}
        <button type="button" onClick={onClose} style={secondaryButtonStyle}>取消</button>
        <button type="button" disabled={name.trim() === '' || !validInjection} onClick={() => { onApply({
          name: name.trim(), role, content, injectionPosition, injectionDepth: resolvedDepth, injectionOrder: resolvedOrder,
        }) }} style={primaryButtonStyle}>应用修改</button>
      </footer>
    </section>
  </div>
}

function PresetImportDialog({ entries, onClose, onImport, onLibrary }: {
  readonly entries: AgentRpProjection['presetLibrary']
  readonly onClose: () => void
  readonly onImport: (file: File) => Promise<void>
  readonly onLibrary: (request: PresetLibraryRequest) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => { void onLibrary({ operation: 'list' }).catch(() => undefined) }, [])
  return <div role="dialog" aria-modal="true" aria-label="导入预设" style={{
    alignItems: 'center', background: 'rgba(0,0,0,.62)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '18px', position: 'fixed', zIndex: 1100,
  }} onMouseDown={event => { if (event.target === event.currentTarget && !importing) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #151518)', border: '1px solid var(--dsw-alias-border-l2, #38383d)',
      borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,.45)', maxWidth: '480px', padding: '24px', width: 'min(94vw, 480px)',
    }}>
      <h2 style={{ fontSize: '17px', margin: 0 }}>为此角色选择预设</h2>
      <p style={{ fontSize: '13px', lineHeight: 1.65, margin: '9px 0 22px', opacity: 0.58 }}>
        从预设库选取，或导入 SillyTavern Chat Completion 预设 JSON。选中后会为当前会话创建独立副本
      </p>
      {error !== undefined && <p role="alert" style={{ color: '#e47a7a', fontSize: '12px', margin: '0 0 12px' }}>{error}</p>}
      {entries.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '20px', maxHeight: '280px', overflowY: 'auto' }}>
        {entries.map(entry => <PresetLibraryRow key={entry.id} entry={entry} busy={importing} onSelect={() => {
          setImporting(true)
          setError(undefined)
          void onLibrary({ operation: 'select', id: entry.id }).then(onClose, (reason: unknown) => {
            setError(reason instanceof Error ? reason.message : '预设选择失败')
            setImporting(false)
          })
        }} />)}
      </div>}
      <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={event => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (file === undefined) return
        setImporting(true)
        setError(undefined)
        void onImport(file).then(onClose, (reason: unknown) => {
          setError(reason instanceof Error ? reason.message : '预设导入失败')
          setImporting(false)
        })
      }} />
      <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
        <button type="button" disabled={importing} onClick={onClose} style={secondaryButtonStyle}>取消</button>
        <button type="button" disabled={importing} onClick={() => { inputRef.current?.click() }} style={primaryButtonStyle}>
          {importing ? '导入中…' : '选择预设文件'}
        </button>
      </div>
    </section>
  </div>
}

function PresetLibraryRow({ entry, active = false, busy = false, onSelect, onDelete }: {
  readonly entry: PresetLibraryEntry
  readonly active?: boolean
  readonly busy?: boolean
  readonly onSelect: () => void
  readonly onDelete?: () => void
}) {
  return <div style={{
    alignItems: 'center', background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : 'var(--dsw-alias-bg-layer-1, #202024)',
    border: `1px solid ${active ? `color-mix(in srgb, ${color} 34%, transparent)` : 'var(--dsw-alias-border-l2, #39393f)'}`,
    borderRadius: '10px', display: 'flex', gap: '10px', padding: '10px 11px',
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.48 }}>
        {entry.enabledCount}/{entry.promptCount} 项启用 · {entry.regexScriptCount} 条正则{active ? ' · 当前来源' : ''}
      </div>
    </div>
    <button type="button" disabled={busy || active} onClick={onSelect} style={{ ...miniButtonStyle, marginLeft: 'auto' }}>{active ? '已选' : '使用'}</button>
    {onDelete !== undefined && <button type="button" disabled={busy} onClick={onDelete} style={miniButtonStyle}>删除</button>}
  </div>
}

function PresetLibraryDialog({ entries, activeId, onClose, onAction }: {
  readonly entries: AgentRpProjection['presetLibrary']
  readonly activeId?: string
  readonly onClose: () => void
  readonly onAction: (request: PresetLibraryRequest) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return <div role="dialog" aria-modal="true" aria-label="预设库" style={{
    alignItems: 'center', background: 'rgba(0,0,0,.66)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '18px', position: 'fixed', zIndex: 1200,
  }} onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #151518)', border: '1px solid var(--dsw-alias-border-l2, #38383d)',
      borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,.45)', maxWidth: '560px', padding: '22px', width: 'min(94vw, 560px)',
    }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: '10px' }}>
        <div><h2 style={{ fontSize: '17px', margin: 0 }}>预设库</h2><p style={{ fontSize: '12px', margin: '6px 0 0', opacity: 0.52 }}>使用预设只会替换当前会话的独立副本</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="关闭预设库" style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '22px', marginLeft: 'auto' }}>×</button>
      </div>
      {error !== undefined && <p role="alert" style={{ color: '#e47a7a', fontSize: '12px' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '18px', maxHeight: '55vh', overflowY: 'auto' }}>
        {entries.map(entry => <PresetLibraryRow key={entry.id} entry={entry} active={entry.id === activeId} busy={busy} onSelect={() => {
          setBusy(true)
          setError(undefined)
          void onAction({ operation: 'select', id: entry.id }).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : '预设选择失败')
            setBusy(false)
          })
        }} onDelete={() => {
          if (!window.confirm(`从预设库删除“${entry.name}”？当前会话不会受影响`)) return
          setBusy(true)
          setError(undefined)
          void onAction({ operation: 'delete', id: entry.id }).then(() => { setBusy(false) }, (reason: unknown) => {
            setError(reason instanceof Error ? reason.message : '删除失败')
            setBusy(false)
          })
        }} />)}
        {entries.length === 0 && <div style={{ fontSize: '13px', opacity: 0.52, padding: '30px 8px', textAlign: 'center' }}>预设库还是空的，导入一份 JSON 后会自动收藏</div>}
      </div>
    </section>
  </div>
}

function PresetNumberField({ label, hint, value, onChange }: {
  readonly label: string
  readonly hint: string
  readonly value: string
  readonly onChange: (value: string) => void
}) {
  return <label style={fieldLabelStyle}>{label}<span style={{ float: 'right', fontSize: '10px', fontWeight: 400, opacity: 0.45 }}>{hint}</span>
    <input inputMode="decimal" value={value} onChange={event => { onChange(event.target.value) }} style={fieldInputStyle} />
  </label>
}

const fieldLabelStyle = { display: 'block', fontSize: '11px', fontWeight: 560, marginBottom: '13px', opacity: 0.72 } as const
const fieldInputStyle = {
  background: 'var(--dsw-alias-bg-layer-1, #202024)', border: '1px solid var(--dsw-alias-border-l2, #3b3b41)',
  borderRadius: '8px', color: 'inherit', display: 'block', font: 'inherit', fontSize: '12px', marginTop: '6px', padding: '8px 9px', width: '100%',
} as const
const miniButtonStyle = {
  background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #424248)', borderRadius: '6px', color: 'inherit',
  cursor: 'pointer', font: 'inherit', fontSize: '11px', height: '25px', minWidth: '25px', padding: '2px 6px',
} as const
const secondaryButtonStyle = { ...miniButtonStyle, height: '34px', padding: '5px 14px' } as const
const primaryButtonStyle = {
  ...secondaryButtonStyle, background: color, borderColor: color, color: '#fff', fontWeight: 600,
} as const

const presetManagerResponsiveStyle = `
@media (max-width: 720px) {
  .agent-rp-preset-overlay { padding: 8px !important; }
  .agent-rp-preset-dialog {
    border-radius: 12px !important;
    max-height: calc(100dvh - 16px) !important;
    width: calc(100vw - 16px) !important;
  }
  .agent-rp-preset-body {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 12px 14px !important;
  }
  .agent-rp-preset-generation {
    border-bottom: 1px solid var(--dsw-alias-border-l2, #343438);
    border-left: 0 !important;
    display: grid;
    gap: 0 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    order: -1;
    padding: 0 0 11px !important;
  }
  .agent-rp-preset-generation > h3,
  .agent-rp-preset-generation > p { grid-column: 1 / -1; }
  .agent-rp-preset-generation > p { margin-top: 2px !important; }
  .agent-rp-preset-list { flex: 1 1 auto; }
  .agent-rp-preset-footer { padding: 10px 14px !important; }
  .agent-rp-runtime-inspector-body {
    display: flex !important;
    flex-direction: column !important;
    overflow-y: auto !important;
  }
  .agent-rp-runtime-inspector-order {
    border-bottom: 1px solid var(--dsw-alias-border-l2, #343438);
    border-right: 0 !important;
    flex: 0 0 auto;
    max-height: 42vh;
  }
}
@media (max-width: 460px) {
  .agent-rp-preset-generation { grid-template-columns: 1fr 1fr; }
  .agent-rp-preset-generation > label:last-of-type { grid-column: 1 / -1; }
  .agent-rp-preset-footer { flex-wrap: wrap; }
  .agent-rp-preset-footer > button:first-of-type { margin-right: auto !important; }
}
`

function RoleplayStatusDialog({ characterName, source, onClose }: {
  readonly characterName: string
  readonly source: string
  readonly onClose: () => void
}) {
  return <div role="dialog" aria-modal="true" aria-label="当前状态" style={{
    alignItems: 'center', background: 'rgba(0,0,0,.62)', display: 'flex', inset: 0,
    justifyContent: 'center', padding: '24px', position: 'fixed', zIndex: 1000,
  }} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section style={{
      background: 'var(--dsw-alias-bg-base, #111216)', border: '1px solid var(--dsw-alias-border-l2, #35373d)',
      borderRadius: '14px', boxShadow: '0 20px 64px rgba(0,0,0,.45)', maxHeight: '88vh',
      maxWidth: '1240px', overflow: 'hidden', position: 'relative', width: 'min(94vw, 1240px)',
    }}>
      <button type="button" aria-label="关闭当前状态" onClick={onClose} style={{
        alignItems: 'center', background: 'rgba(13,17,27,.88)', border: '1px solid rgba(116,143,184,.35)',
        borderRadius: '50%', color: '#edf4ff', cursor: 'pointer', display: 'flex', fontSize: '20px',
        height: '34px', justifyContent: 'center', position: 'absolute', right: '12px', top: '12px', width: '34px', zIndex: 2,
      }}>×</button>
      <iframe title={`${characterName}的当前状态`} sandbox="allow-scripts" srcDoc={source} style={{
        background: 'transparent', border: 0, colorScheme: 'dark', display: 'block', height: 'min(760px, 82vh)', width: '100%',
      }} />
    </section>
  </div>
}

const chipStyle = {
  background: `color-mix(in srgb, ${color} 10%, transparent)`, borderRadius: '999px',
  color: 'inherit', fontSize: '11px', opacity: 0.76, padding: '5px 9px',
} as const

function roleplayComposerDockComponent(ctx: Context): (props: ComposerDockProps) => JSX.Element | null {
  return function RoleplayComposerDock({
    inputActions, sessionId, useProjection, useSessions, useSession,
  }: ComposerDockProps) {
  const summary = useSessions(state => state.byId[sessionId])
  const projection = roleplaySummary(summary, useProjection('agentRp'))
  const chat = useSession(state => state.chat)
  const viewMode = useRoleplayViewMode(sessionId)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const displayName = projection === undefined ? undefined : roleplayDisplayName(summary, projection)
  const placeholder = displayName === undefined ? undefined : `和${displayName}说点什么…`
  useLayoutEffect(() => {
    const inputRoot = rootRef.current?.parentElement
    const card = inputRoot?.querySelector<HTMLElement>('[data-composer-card]')
    const textarea = card?.querySelector<HTMLTextAreaElement>('textarea')
    if (inputRoot == null || textarea == null || placeholder === undefined) return
    const previousPlaceholder = textarea.getAttribute('placeholder')
    textarea.setAttribute('placeholder', placeholder)
    if (viewMode === 'debug') {
      return () => {
        if (textarea.getAttribute('placeholder') !== placeholder) return
        if (previousPlaceholder === null) textarea.removeAttribute('placeholder')
        else textarea.setAttribute('placeholder', previousPlaceholder)
      }
    }
    inputRoot.dataset.agentRpInput = ''
    const hiddenControls = new Map<HTMLElement, { display: string; priority: string }>()
    const hide = (element: Element): void => {
      if (!(element instanceof HTMLElement) || hiddenControls.has(element)) return
      hiddenControls.set(element, {
        display: element.style.getPropertyValue('display'),
        priority: element.style.getPropertyPriority('display'),
      })
      element.style.setProperty('display', 'none', 'important')
    }
    const hideEngineeringControls = (): void => {
      const row = card?.lastElementChild
      const tools = row?.firstElementChild
      const trailing = row?.lastElementChild
      for (const element of Array.from(tools?.children ?? [])) hide(element)
      for (const element of Array.from(trailing?.children ?? [])) {
        if (element.tagName !== 'BUTTON') hide(element)
      }
      for (const element of Array.from(inputRoot.children)) {
        if (element !== card && element !== rootRef.current) hide(element)
      }
    }
    hideEngineeringControls()
    const observer = new MutationObserver(hideEngineeringControls)
    observer.observe(inputRoot, { childList: true })
    return () => {
      observer.disconnect()
      for (const [element, { display, priority }] of hiddenControls) {
        if (display === '') element.style.removeProperty('display')
        else element.style.setProperty('display', display, priority)
      }
      delete inputRoot.dataset.agentRpInput
      if (textarea.getAttribute('placeholder') !== placeholder) return
      if (previousPlaceholder === null) textarea.removeAttribute('placeholder')
      else textarea.setAttribute('placeholder', previousPlaceholder)
    }
  }, [placeholder, viewMode])
  useEffect(() => {
    if (projection === undefined) return
    const frontend = projection.frontend
    const hasDisplayRules = viewMode === 'immersive' && frontend !== undefined
      && frontend.regexScripts.length + (projection.preset?.regexScripts.length ?? 0) > 0
    const mounted = new Map<HTMLElement, Root>()
    const hiddenTranscriptDetails = new Map<HTMLElement, { readonly display: string; readonly priority: string }>()
    const hideTranscriptDetail = (element: HTMLElement): void => {
      if (hiddenTranscriptDetails.has(element)) return
      hiddenTranscriptDetails.set(element, {
        display: element.style.getPropertyValue('display'),
        priority: element.style.getPropertyPriority('display'),
      })
      element.style.setProperty('display', 'none', 'important')
    }
    const bridge = (event: MessageEvent<unknown>): void => {
      const sourceFrame = [...mounted.keys()]
        .flatMap(root => [...root.querySelectorAll<HTMLIFrameElement>('iframe[data-agent-rp-frame]')])
        .find(frame => frame.contentWindow === event.source)
      if (sourceFrame == null
        || typeof event.data !== 'object' || event.data === null) return
      const message = event.data as { readonly source?: unknown; readonly action?: unknown; readonly value?: unknown }
      if (message.source !== 'dsh-agent-rp-card') return
      if (message.action === 'resize' && typeof message.value === 'number' && Number.isFinite(message.value)) {
        sourceFrame.style.height = `${Math.max(72, Math.ceil(message.value))}px`
        return
      }
      if (typeof message.value !== 'string' || message.value.length > 65_536) return
      if (message.action === 'draft') {
        inputActions.setDraft(message.value)
        return
      }
      if (message.action !== 'trigger-slash') return
      const draft = message.value.match(/^\/setinput\s+([\s\S]*)$/u)
      if (draft?.[1] !== undefined) {
        inputActions.setDraft(draft[1])
        return
      }
      const send = message.value.match(/^\/send\s+([\s\S]*?)(?:\|\/trigger)?$/u)
      if (send?.[1] === undefined) return
      const scoped = ctx.sessions.scope(sessionId)
      const conversation = scoped?.get('conversation') as IConversation | undefined
      void conversation?.send(send[1])
    }
    const mountRenderedDisplay = (
      item: HTMLElement,
      original: HTMLElement,
      segments: readonly CharacterDisplaySegment[],
    ): void => {
      const existing = item.querySelector<HTMLElement>(':scope > [data-agent-rp-rendered-display]')
      const existingRoot = existing === null ? undefined : mounted.get(existing)
      if (existing !== null && existingRoot !== undefined) {
        existingRoot.render(<CharacterDisplay
          segments={segments}
          statData={projection.mvu?.statData}
          characterName={projection.characterName}
        />)
        return
      }
      const display = document.createElement('div')
      display.style.cssText = 'display:block;min-width:0;width:100%;'
      display.dataset.agentRpRenderedDisplay = 'true'
      original.style.display = 'none'
      item.dataset.agentRpFrontend = 'true'
      item.insertBefore(display, original.nextSibling)
      const root = createRoot(display)
      mounted.set(display, root)
      root.render(<CharacterDisplay
        segments={segments}
        statData={projection.mvu?.statData}
        characterName={projection.characterName}
      />)
    }
    window.addEventListener('message', bridge)
    const scan = (): void => {
      const scroll = rootRef.current?.closest('[data-conversation-scroll]')
      if (scroll === null || scroll === undefined) return
      if (viewMode === 'immersive') {
        for (const item of scroll.querySelectorAll<HTMLElement>(
          '[data-chat-flow-kind="context"], [data-chat-flow-kind="tool-call"], [data-chat-flow-kind="command"], '
          + '[data-chat-flow-kind="manual-compaction"], [data-chat-flow-kind="compaction"], '
          + '[data-chat-flow-kind="model-retry"], [data-chat-flow-kind="unknown"]',
        )) hideTranscriptDetail(item)
        for (const item of scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="turn-error"]')) {
          if (item.textContent?.includes('agent-rp/character-card-seed has invalid provenance')) {
            hideTranscriptDetail(item)
          }
        }
        for (const item of scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="user"]')) {
          if (item.dataset.agentRpSetupCollapsed === 'true'
            || !item.textContent?.includes('🎬 档案提交完毕指令：')) continue
          const content = item.firstElementChild as HTMLElement | null
          if (content === null) continue
          const details = document.createElement('details')
          details.style.cssText = 'font-size:12px;opacity:.72;'
          const summaryElement = document.createElement('summary')
          summaryElement.textContent = '角色设定已提交'
          summaryElement.style.cssText = 'cursor:pointer;list-style:none;'
          const original = content.cloneNode(true) as HTMLElement
          original.style.cssText = 'margin-top:8px;max-height:240px;overflow:auto;white-space:pre-wrap;'
          details.append(summaryElement, original)
          content.style.display = 'none'
          item.insertBefore(details, content.nextSibling)
          item.dataset.agentRpSetupCollapsed = 'true'
        }
      }
      for (const item of scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="assistant-step"]')) {
        const key = item.dataset.chatFlowKey
        if (key === undefined) continue
        const node = chat.nodes.get(key)
        if (node?.kind !== 'assistant-step') continue
        const data = node.data as { readonly blocks?: readonly { readonly kind: string; readonly text?: string }[] }
        const finalSeq = (node.data as { readonly finalNode?: { readonly seq: number } }).finalNode?.seq
        const generation = finalSeq === undefined
          ? undefined
          : projection.generations.find(group => group.assistantSeqs.includes(finalSeq))
        if (viewMode === 'immersive' && generation !== undefined) {
          const original = item.firstElementChild as HTMLElement | null
          if (finalSeq !== generation.anchorSeq) {
            hideTranscriptDetail(item)
            continue
          }
          const selected = generation.versions.find(version => version.seq === generation.selectedVersionSeq)
          if (selected !== undefined && original !== null) {
            const rendered = renderCharacterDisplay(selected.text.replaceAll(statusPlaceholder, ''), {
              name: projection.characterName,
              frontend: projection.frontend ?? { regexScripts: [], tavernHelperScriptNames: [] },
            }, AI_OUTPUT_PLACEMENT, 0, projection.userName, projection.preset?.regexScripts)
            const segments = splitCharacterDisplay(rendered)
            mountRenderedDisplay(item, original, segments)
            continue
          }
        }
        if (item.dataset.agentRpFrontend === 'true') continue
        if (viewMode === 'immersive') {
          for (const element of item.querySelectorAll<HTMLElement>('[data-variant="think"]')) {
            hideTranscriptDetail(element)
          }
        }
        if (!hasDisplayRules || frontend === undefined) continue
        const raw = data.blocks?.flatMap(block => block.kind === 'text' && block.text !== undefined ? [block.text] : []).join('\n') ?? ''
        if (raw === '') continue
        const depth = Math.max(0, chat.order.length - chat.order.indexOf(key) - 1)
        const rendered = renderCharacterDisplay(raw.replaceAll(statusPlaceholder, ''), {
          name: projection.characterName,
          frontend,
        }, AI_OUTPUT_PLACEMENT, depth, projection.userName, projection.preset?.regexScripts)
        if (rendered === raw) continue
        const segments = splitCharacterDisplay(rendered)
        if (!segments.some(segment => segment.kind === 'html')) continue
        const original = item.firstElementChild as HTMLElement | null
        if (original === null) continue
        mountRenderedDisplay(item, original, segments)
      }
      if (viewMode === 'immersive') {
        for (const item of scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="turn-tail"]')) {
          const key = item.dataset.chatFlowKey
          const node = key === undefined ? undefined : chat.nodes.get(key)
          if (node?.kind !== 'turn-tail') continue
          const seq = (node.data as { readonly closing?: { readonly finalNode?: { readonly seq: number } } }).closing?.finalNode?.seq
          if (seq !== undefined && projection.generations.some(group =>
            group.assistantSeqs.includes(seq) && seq !== group.anchorSeq)) hideTranscriptDetail(item)
        }
      }
    }
    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('message', bridge)
      for (const [display, root] of mounted) {
        const item = display.closest<HTMLElement>('[data-agent-rp-frontend]')
        const original = item?.firstElementChild as HTMLElement | null
        if (original !== null) original.style.removeProperty('display')
        if (item !== null) delete item.dataset.agentRpFrontend
        root.unmount()
        display.remove()
      }
      for (const [element, { display, priority }] of hiddenTranscriptDetails) {
        if (display === '') element.style.removeProperty('display')
        else element.style.setProperty('display', display, priority)
      }
      const scroll = rootRef.current?.closest('[data-conversation-scroll]')
      for (const item of scroll?.querySelectorAll<HTMLElement>('[data-agent-rp-setup-collapsed="true"]') ?? []) {
        const content = item.firstElementChild as HTMLElement | null
        content?.style.removeProperty('display')
        item.querySelector(':scope > details')?.remove()
        delete item.dataset.agentRpSetupCollapsed
      }
    }
  }, [chat, projection, viewMode])
  if (projection === undefined) return null
  return <div ref={rootRef} data-agent-rp-status>
    <RoleplayStatusLine
      projection={summary?.title?.trim() && summary.title.trim() !== projection.characterName
        ? { ...projection, characterName: summary.title.trim() }
        : projection}
      running={useSession(state => state.running)}
    />
  </div>
  }
}

function RoleplayStatusLine({ projection, running }: {
  readonly projection: AgentRpProjection
  readonly running: boolean
}) {
  const parts = [
    projection.userName === undefined ? undefined : `你是 ${projection.userName}`,
    projection.worldInfoCount === 0 ? undefined : `世界书 ${projection.worldInfoCount} 条`,
    projection.importedMessageCount === 0 ? undefined : `已迁移 ${projection.importedMessageCount} 条历史`,
  ].filter((part): part is string => part !== undefined)
  if (!running && parts.length === 0) return null
  return <div style={{ alignItems: 'center', display: 'flex', fontSize: '11px', gap: '8px', minHeight: '18px', opacity: 0.5, padding: '0 10px' }}>
    {running && <span>{projection.characterName}正在回应</span>}
    {running && parts.length > 0 && <span>·</span>}
    {parts.length > 0 && <span>{parts.join(' · ')}</span>}
  </div>
}

const hintStyle = {
  alignItems: 'center', background: `color-mix(in srgb, ${color} 8%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`, borderRadius: '10px',
  display: 'flex', gap: '10px', padding: '9px 12px',
} as const

const markStyle = {
  alignItems: 'center', background: `color-mix(in srgb, ${color} 16%, transparent)`, borderRadius: '8px',
  display: 'flex', flex: '0 0 30px', fontSize: '16px', height: '30px', justifyContent: 'center',
} as const

const actionStyle = {
  background: `color-mix(in srgb, ${color} 12%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`, borderRadius: '7px', color: 'inherit',
  cursor: 'pointer', font: 'inherit', fontSize: '12px', padding: '5px 9px',
} as const

function importHintComponent(ctx: Context): (props: ImportHintProps) => JSX.Element | null {
  return function SillyTavernImportHint({ input, inputActions, sessionId }: ImportHintProps): JSX.Element | null {
    const summary = ctx.sessions.list.getSnapshot().byId[sessionId]
    if (summary?.agentPreset !== 'agent-rp') return null
    const scoped = ctx.sessions.scope(sessionId)
    const conversation = scoped?.get('conversation') as (IConversation & Partial<DraftResolver>) | undefined
    const ids = [...new Set([...(input.attachmentIds ?? []), ...(input.imageIds ?? [])])]
    const draftAttachments = conversation?.draftAttachments
    const selected = selectSillyTavernDraft(
      typeof draftAttachments === 'function' ? draftAttachments.call(conversation, ids) : [],
    )
    if (selected === undefined) return null
    const blank = input.draft.trim() === ''
    const chat = selected.kind === 'chat'
    const migration = selected.kind === 'migration'
    return <div style={hintStyle} role="status">
      <div style={markStyle} aria-hidden="true">↗</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.45 }}>
          {migration ? '迁移角色与对话' : chat ? '导入历史对话' : selected.kind === 'json-resource' ? '识别到 JSON 资源' : '识别到 PNG 图片'}
          <span style={{ fontWeight: 400, marginLeft: '6px', opacity: 0.72 }}>{selected.name}</span>
        </div>
        <div style={{ fontSize: '12px', lineHeight: 1.45, marginTop: '2px', opacity: 0.62 }}>{migration
          ? '将创建一个角色会话，并保留原聊天历史'
          : chat ? '将从这份记录创建新的角色会话' : blank ? '请选择导入类型' : '发送后开始导入'}</div>
      </div>
      {!chat && !migration && blank && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginLeft: 'auto' }}>
        <button type="button" style={actionStyle} onClick={() => { inputActions.setDraft('请导入这张角色卡') }}>角色卡</button>
        {selected.kind === 'json-resource' && <button type="button" style={actionStyle} onClick={() => { inputActions.setDraft('请导入这本世界书') }}>世界书</button>}
        {selected.kind === 'json-resource' && <button type="button" style={actionStyle} onClick={() => { inputActions.setDraft('请导入这份预设') }}>预设</button>}
      </div>}
    </div>
  }
}

function avatarLoader(ctx: ClientContext) {
  return async (attachmentId: string): Promise<string | undefined> => {
    const state = ctx.sessions.list.getSnapshot()
    const sessionId = state.current
    if (sessionId === undefined) return undefined
    const scope = ctx.sessions.scope(sessionId)
    const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
    if (session === undefined) return undefined
    const result = await session.readAttachment(attachmentId as ImageAttachmentRef['attachmentId'])
    if (!result.ok) return undefined
    const bytes = new Uint8Array(result.value.data).slice().buffer
    const blob = new Blob([bytes], { type: result.value.attachment.mediaType })
    return URL.createObjectURL(blob)
  }
}

function base64(data: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let offset = 0; offset < data.length; offset += chunk) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

/** Client services required by the Roleplay shell. */
export const inject = ['connection', 'slots', 'sessions']

/** Register the Agent RP header, composer presentation, and import affordance. */
export function apply(ctx: ClientContext): void {
  const loadAvatar = avatarLoader(ctx)
  const renameSession = async (sessionId: SessionId, title: string): Promise<void> => {
    const scope = ctx.sessions.scope(sessionId)
    const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
    if (session === undefined) throw new Error('当前角色会话不可用')
    const result = await session.rename(title)
    if (!result.ok) throw new Error(result.error.message)
  }
  const characterLibraryJson = async <T,>(path = ''): Promise<T> => {
    const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, {
      headers: { accept: 'application/json' },
    })
    const value = await response.json() as { readonly error?: string } & T
    if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`)
    return value
  }
  const listCharacters = async (): Promise<readonly CharacterLibrarySummary[]> => {
    const value = await characterLibraryJson<{ readonly format: 0; readonly entries: readonly CharacterLibrarySummary[] }>()
    return value.entries
  }
  const readCharacter = async (id: string): Promise<CharacterLibraryDetail> => {
    const value = await characterLibraryJson<{ readonly format: 0; readonly entry: CharacterLibraryDetail }>(`/${encodeURIComponent(id)}`)
    return value.entry
  }
  const startCharacterSession = async (
    sessionId: SessionId,
    character: CharacterLibraryDetail,
    greetingIndex: number,
    persona?: SessionPersonaSnapshot,
  ): Promise<void> => {
    const scope = ctx.sessions.scope(sessionId)
    const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
    if (session === undefined) throw new Error('当前角色会话不可用')
    const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(character.id)}/asset`)
    if (!response.ok) throw new Error(`无法读取角色卡原文件（${response.status}）`)
    const data = base64(new Uint8Array(await response.arrayBuffer()))
    const attachment = character.transport === 'png'
      ? { type: 'image' as const, data, mediaType: 'image/png' as const, name: character.originalFilename }
      : { type: 'file' as const, data, mediaType: character.mediaType, name: character.originalFilename }
    const importerSession = session as unknown as {
      prompt(content: Array<typeof attachment | { readonly type: 'text'; readonly text: string }>, mode: 'queue'):
      Promise<
        | { readonly ok: true; readonly value: unknown }
        | { readonly ok: false; readonly error: { readonly message: string } }
      >
    }
    const result = await importerSession.prompt([attachment, {
      type: 'text',
      text: encodeCharacterLibrarySessionRequest({
        format: 0,
        greetingIndex,
        ...(persona === undefined ? {} : { persona }),
      }),
    }], 'queue')
    if (!result.ok) throw new Error(result.error.message)
  }
  const personaLibraryJson = async <T,>(
    init?: { readonly method: 'POST'; readonly body: PersonaLibrarySaveRequest },
  ): Promise<T> => {
    const response = await fetch(PERSONA_LIBRARY_PATH, init === undefined ? {
      headers: { accept: 'application/json' },
    } : {
      method: init.method,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(init.body),
    })
    const value = await response.json() as { readonly error?: string } & T
    if (!response.ok) throw new Error(value.error ?? `Persona 库请求失败（${response.status}）`)
    return value
  }
  const listPersonas = async (): Promise<readonly PersonaLibraryEntry[]> => {
    const value = await personaLibraryJson<{ readonly format: 0; readonly entries: readonly PersonaLibraryEntry[] }>()
    return value.entries
  }
  const savePersona = async (request: PersonaLibrarySaveRequest): Promise<PersonaLibraryEntry> => {
    const value = await personaLibraryJson<{ readonly format: 0; readonly entry: PersonaLibraryEntry }>({ method: 'POST', body: request })
    return value.entry
  }
  const importPreset = async (sessionId: SessionId, file: File): Promise<void> => {
    if (!/\.json$/iu.test(file.name)) throw new Error('请选择 SillyTavern 预设 JSON 文件')
    const scope = ctx.sessions.scope(sessionId)
    const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
    if (session === undefined) throw new Error('当前角色会话不可用')
    const fileSession = session as unknown as {
      prompt(
        content: Array<
          | { readonly type: 'file'; readonly data: string; readonly name: string; readonly mediaType?: string }
          | { readonly type: 'text'; readonly text: string }
        >,
        mode: 'queue',
      ): Promise<
        | { readonly ok: true; readonly value: unknown }
        | { readonly ok: false; readonly error: { readonly message: string } }
      >
    }
    const result = await fileSession.prompt([{
      type: 'file',
      data: base64(new Uint8Array(await file.arrayBuffer())),
      name: file.name,
      ...(file.type === '' ? {} : { mediaType: file.type }),
    }, { type: 'text', text: '请导入这份预设' }], 'queue')
    if (!result.ok) throw new Error(result.error.message)
  }
  const configurePreset = async (sessionId: SessionId, request: PresetConfigurationRequest): Promise<void> => {
    const connection = ctx.get('connection') as {
      readonly api: {
        readonly commands: {
          execute(input: { readonly sessionId: SessionId; readonly line: string }): Promise<{
            readonly result: {
              readonly ok: boolean
              readonly value?: { readonly matched: boolean }
              readonly error?: { readonly code: string; readonly message: string }
            }
          }>
        }
      }
    }
    const response = await connection.api.commands.execute({
      sessionId,
      line: `/rp-preset-configure ${JSON.stringify(request)}`,
    })
    if (!response.result.ok) {
      throw new Error(response.result.error?.message ?? '预设保存失败')
    }
    if (response.result.value?.matched !== true) throw new Error('当前 Host 未启用预设管理命令')
  }
  const managePresetLibrary = async (sessionId: SessionId, request: PresetLibraryRequest): Promise<void> => {
    const connection = ctx.get('connection') as {
      readonly api: {
        readonly commands: {
          execute(input: { readonly sessionId: SessionId; readonly line: string }): Promise<{
            readonly result: {
              readonly ok: boolean
              readonly value?: { readonly matched: boolean }
              readonly error?: { readonly code: string; readonly message: string }
            }
          }>
        }
      }
    }
    const response = await connection.api.commands.execute({
      sessionId,
      line: `/rp-preset-library ${JSON.stringify(request)}`,
    })
    if (!response.result.ok) throw new Error(response.result.error?.message ?? '预设库操作失败')
    if (response.result.value?.matched !== true) throw new Error('当前 Host 未启用预设库')
  }
  const runGeneration = async (
    sessionId: SessionId,
    request: { readonly operation: 'regenerate' | 'continue'; readonly replySeq: number }
      | { readonly operation: 'select'; readonly replySeq: number; readonly versionIndex: number },
  ): Promise<void> => {
    const scope = ctx.sessions.scope(sessionId)
    const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
    if (session === undefined) throw new Error('当前角色会话不可用')
    const response = await session.command(`/rp-generation ${JSON.stringify(request)}`)
    if (!response.ok) throw new Error(response.error.message)
    if (!response.value.matched) throw new Error('当前 Host 未启用回复版本控制')
  }
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: 'agent-rp-character-header', order: -100,
  }, props => <RoleplayHeader {...props} loadAvatar={loadAvatar} renameSession={renameSession} configurePreset={configurePreset} importPreset={importPreset} managePresetLibrary={managePresetLibrary} listCharacters={listCharacters} readCharacter={readCharacter} startCharacterSession={startCharacterSession} listPersonas={listPersonas} savePersona={savePersona} />))
  ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
    name: 'conversation.chat.commandview', key: 'rp-preset-configure',
  }, () => null))
  ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
    name: 'conversation.chat.commandview', key: 'rp-preset-library',
  }, () => null))
  ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
    name: 'conversation.chat.commandview', key: 'rp-generation',
  }, () => null))
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    priority: 100,
    select: owner => {
      const closing = owner.turn.data.get('turn-tail')?.closing
      return closing === null || closing === undefined ? null : { replySeq: closing.finalNode.seq }
    },
  }, props => <GenerationTail {...props} runGeneration={runGeneration} />))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock', id: 'agent-rp-status', order: -100,
  }, roleplayComposerDockComponent(ctx)))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'agent-rp-sillytavern-import-hint', order: -10,
  }, importHintComponent(ctx)))
}
