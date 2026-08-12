/** Roleplay browser shell and native SillyTavern migration affordances. */

import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type {
  ClientContext, SessionId, SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AgentRpProjection } from '../projection-types.ts'
import { AI_OUTPUT_PLACEMENT, renderCharacterDisplay } from '../frontend-regex.ts'
import { selectSillyTavernDraft, type DraftAttachmentLike } from './import-hint.ts'

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
}

type ComposerDockProps = PropsRuntime<'conversation.composer.dock'>

const color = 'var(--dsw-alias-state-business-primary, #6f78e8)'

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

function initials(name: string): string {
  return [...name.trim()].slice(0, 1).join('').toUpperCase() || 'RP'
}

function truncate(text: string, max: number): string {
  const normalized = text.replace(/\s+/gu, ' ').trim()
  return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}…`
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
  if (summary?.agentPreset !== 'agent-rp') return undefined
  return projection ?? {
    characterName: summary.displayTitle,
    description: '',
    personality: '',
    scenario: '',
    importedMessageCount: 0,
    worldInfoCount: 0,
    source: 'preset' as const,
  }
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

function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar }: HeaderProps) {
  const summary = useSessions(state => state.byId[sessionId])
  const projected = useProjection('agentRp')
  const projection = roleplaySummary(summary, projected)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
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
  }, [projection !== undefined])
  if (projection === undefined) return null
  const imported = projection.importedMessageCount > 0
  return <>
    <div ref={rootRef} data-agent-rp-header style={{ alignItems: 'center', display: 'flex', gap: '10px', marginRight: 'auto', minWidth: 0 }}>
      <Avatar projection={projection} loadAvatar={loadAvatar} />
      <div style={{ minWidth: 0 }}>
        <div style={{ alignItems: 'baseline', display: 'flex', gap: '8px', minWidth: 0 }}>
          <strong style={{ fontSize: '15px', fontWeight: 620, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projection.characterName}
          </strong>
          <span style={{ fontSize: '11px', opacity: 0.48, whiteSpace: 'nowrap' }}>{imported ? '已迁移对话' : '角色对话'}</span>
        </div>
        <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {projection.description.trim() === '' ? '继续这段对话' : truncate(projection.description, 54)}
        </div>
      </div>
      <button type="button" onClick={() => { setOpen(true) }} style={{
        background: 'transparent', border: '1px solid var(--dsw-alias-border-l2, #444)', borderRadius: '8px',
        color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', marginLeft: '8px', padding: '6px 10px',
      }}>角色信息</button>
    </div>
    {open && <div role="dialog" aria-modal="true" aria-label={`${projection.characterName}的角色信息`} style={{
      alignItems: 'stretch', background: 'rgba(0,0,0,.48)', display: 'flex', inset: 0,
      justifyContent: 'flex-end', position: 'fixed', zIndex: 1000,
    }} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <aside style={{
        background: 'var(--dsw-alias-bg-base, #171719)', borderLeft: '1px solid var(--dsw-alias-border-l2, #39393c)',
        boxShadow: '-18px 0 44px rgba(0,0,0,.2)', maxWidth: '92vw', overflowY: 'auto', padding: '24px', width: '380px',
      }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '13px' }}>
          <Avatar projection={projection} loadAvatar={loadAvatar} size={54} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>{projection.characterName}</h2>
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
        </div>
        <DetailSection title="角色简介" text={projection.description} />
        <DetailSection title="性格" text={projection.personality} />
        <DetailSection title="当前场景" text={projection.scenario} />
        {projection.description === '' && projection.personality === '' && projection.scenario === '' && <p style={{ fontSize: '13px', lineHeight: 1.7, marginTop: '22px', opacity: 0.62 }}>
          当前只迁移了聊天记录，没有对应角色卡；再次迁移时可将角色卡和 JSONL 放在同一条消息中
        </p>}
      </aside>
    </div>}
  </>
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const placeholder = projection === undefined ? undefined : `和${projection.characterName}说点什么…`
  useLayoutEffect(() => {
    const inputRoot = rootRef.current?.parentElement
    const card = inputRoot?.querySelector<HTMLElement>('[data-composer-card]')
    const textarea = card?.querySelector<HTMLTextAreaElement>('textarea')
    if (inputRoot == null || textarea == null || placeholder === undefined) return
    const previousPlaceholder = textarea.getAttribute('placeholder')
    inputRoot.dataset.agentRpInput = ''
    textarea.setAttribute('placeholder', placeholder)
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
      for (const element of Array.from(tools?.children ?? []).slice(1)) hide(element)
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
  }, [placeholder])
  useEffect(() => {
    const frontend = projection?.frontend
    if (frontend === undefined || frontend.regexScripts.length === 0 || projection === undefined) return
    const mounted = new Set<HTMLIFrameElement>()
    const bridge = (event: MessageEvent<unknown>): void => {
      if (![...mounted].some(frame => frame.contentWindow === event.source)
        || typeof event.data !== 'object' || event.data === null) return
      const message = event.data as { readonly source?: unknown; readonly action?: unknown; readonly value?: unknown }
      if (message.source !== 'dsh-agent-rp-card' || typeof message.value !== 'string' || message.value.length > 65_536) return
      if (message.action === 'draft') {
        inputActions.setDraft(message.value)
        return
      }
      if (message.action !== 'trigger-slash') return
      const match = message.value.match(/^\/send\s+([\s\S]*?)(?:\|\/trigger)?$/u)
      if (match?.[1] === undefined) return
      const scoped = ctx.sessions.scope(sessionId)
      const conversation = scoped?.get('conversation') as IConversation | undefined
      void conversation?.send(match[1])
    }
    window.addEventListener('message', bridge)
    const scan = (): void => {
      const scroll = rootRef.current?.closest('[data-conversation-scroll]')
      if (scroll === null || scroll === undefined) return
      for (const item of scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="assistant-step"]')) {
        const key = item.dataset.chatFlowKey
        if (key === undefined || item.dataset.agentRpFrontend === 'true') continue
        const node = chat.nodes.get(key)
        if (node?.kind !== 'assistant-step') continue
        const data = node.data as { readonly blocks?: readonly { readonly kind: string; readonly text?: string }[] }
        const raw = data.blocks?.flatMap(block => block.kind === 'text' && block.text !== undefined ? [block.text] : []).join('\n') ?? ''
        if (raw === '') continue
        const depth = Math.max(0, chat.order.length - chat.order.indexOf(key) - 1)
        const rendered = renderCharacterDisplay(raw, {
          name: projection.characterName,
          frontend,
        }, AI_OUTPUT_PLACEMENT, depth, projection.userName)
        if (rendered === raw || !/<(?:!doctype|html|head|body|style|script|div|section|details)\b/iu.test(rendered)) continue
        const original = item.firstElementChild as HTMLElement | null
        if (original === null) continue
        const frame = document.createElement('iframe')
        frame.title = `${projection.characterName}的轻前端界面`
        frame.setAttribute('sandbox', 'allow-scripts')
        frame.style.cssText = 'border:0;border-radius:12px;display:block;height:min(760px,78vh);width:100%;background:transparent;'
        const adapted = rendered
          .replace(/```html/giu, '')
          .replace(/```/gu, '')
          .replaceAll('window.parent?.document ?? window.document', 'window.document')
        frame.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; frame-src 'none';"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><textarea id="send_textarea" hidden></textarea><script>${mvuFrameRuntime(projection.mvu?.statData)}window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(input)input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')})});</script>${adapted}</body></html>`
        original.style.display = 'none'
        item.insertBefore(frame, original.nextSibling)
        item.dataset.agentRpFrontend = 'true'
        mounted.add(frame)
      }
    }
    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('message', bridge)
      for (const frame of mounted) {
        const item = frame.closest<HTMLElement>('[data-agent-rp-frontend]')
        const original = item?.firstElementChild as HTMLElement | null
        if (original !== null) original.style.removeProperty('display')
        if (item !== null) delete item.dataset.agentRpFrontend
        frame.remove()
      }
    }
  }, [chat, projection])
  if (projection === undefined) return null
  return <div ref={rootRef} data-agent-rp-status>
    <RoleplayStatusLine projection={projection} running={useSession(state => state.running)} />
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
    const selected = selectSillyTavernDraft(conversation?.draftAttachments?.(ids) ?? [])
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

/** Client services required by the Roleplay shell. */
export const inject = ['slots', 'sessions']

/** Register the Agent RP header, composer presentation, and import affordance. */
export function apply(ctx: ClientContext): void {
  const loadAvatar = avatarLoader(ctx)
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: 'agent-rp-character-header', order: -100,
  }, props => <RoleplayHeader {...props} loadAvatar={loadAvatar} />))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock', id: 'agent-rp-status', order: -100,
  }, roleplayComposerDockComponent(ctx)))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', id: 'agent-rp-sillytavern-import-hint', order: -10,
  }, importHintComponent(ctx)))
}
