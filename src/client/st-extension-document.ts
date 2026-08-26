/** Isolated singleton document for browser-installed SillyTavern extensions. */

import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import type { InstalledStExtensionEntry } from './st-extension-registry.ts'
import { inlineScriptJson } from './inline-script-json.ts'
import { isJsonValue } from './json-value.ts'
import type { TavernPageSnapshot } from './tavern-runtime.ts'

const documentNoncePattern = /^[A-Za-z0-9_-]{16,128}$/u

/** Inputs required to build one browser ClientContext's extension document. */
export interface StExtensionDocumentOptions {
  readonly entries: readonly InstalledStExtensionEntry[]
  readonly nonce: string
  readonly sessionId: string | null
  readonly settings: Readonly<Record<string, JsonValue>>
  readonly snapshot?: TavernPageSnapshot
  readonly token: string
}

/** One bounded report emitted by the current singleton extension document. */
export type StExtensionHostMessage =
  | {
    readonly source: 'dsh-agent-rp-st-extension-host'
    readonly token: string
    readonly action: 'extension-state'
    readonly extensionId: string
    readonly status: 'loaded' | 'failed'
    readonly error?: string
  }
  | {
    readonly source: 'dsh-agent-rp-st-extension-host'
    readonly token: string
    readonly action: 'host-state'
    readonly status: 'ready' | 'failed'
    readonly loaded: readonly string[]
    readonly failed: readonly string[]
    readonly error?: string
  }
  | {
    readonly source: 'dsh-agent-rp-st-extension-host'
    readonly token: string
    readonly action: 'settings-surface'
    readonly hasContent: boolean
  }
  | {
    readonly source: 'dsh-agent-rp-st-extension-host'
    readonly token: string
    readonly action: 'settings-save'
    readonly settings: Readonly<Record<string, JsonValue>>
  }

function boundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function boundedError(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 8_000
}

function identifierList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length <= 64 && value.every(boundedIdentifier)
    && new Set(value).size === value.length
}

function settingsRecord(value: unknown): value is Readonly<Record<string, JsonValue>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    return isJsonValue(value) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= 2 * 1024 * 1024
  } catch {
    return false
  }
}

/**
 * Parse a lifecycle report only when it belongs to the current iframe generation.
 * @param value - Untrusted browser message payload.
 * @param token - Current Host-generated frame token.
 * @returns Valid bounded report, or `undefined` for unrelated input.
 */
export function parseStExtensionHostMessage(value: unknown, token: string): StExtensionHostMessage | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const message = value as Record<string, unknown>
  if (message.source !== 'dsh-agent-rp-st-extension-host' || message.token !== token) return undefined
  if (message.action === 'settings-save') {
    if (!settingsRecord(message.settings)) return undefined
    return {
      source: 'dsh-agent-rp-st-extension-host', token,
      action: 'settings-save', settings: message.settings,
    }
  }
  if (message.action === 'settings-surface') {
    if (typeof message.hasContent !== 'boolean') return undefined
    return {
      source: 'dsh-agent-rp-st-extension-host', token,
      action: 'settings-surface', hasContent: message.hasContent,
    }
  }
  if (message.action === 'extension-state') {
    if (!boundedIdentifier(message.extensionId)
      || (message.status !== 'loaded' && message.status !== 'failed')
      || (message.status === 'loaded' && message.error !== undefined)
      || (message.status === 'failed' && !boundedError(message.error))) return undefined
    return {
      source: 'dsh-agent-rp-st-extension-host', token,
      action: 'extension-state', extensionId: message.extensionId, status: message.status,
      ...(message.status === 'failed' ? { error: message.error as string } : {}),
    }
  }
  if (message.action !== 'host-state' || (message.status !== 'ready' && message.status !== 'failed')
    || !identifierList(message.loaded) || !identifierList(message.failed)) return undefined
  const loaded = message.loaded
  const failed = message.failed
  if (loaded.some(id => failed.includes(id))
    || (message.status === 'ready' && message.error !== undefined)
    || (message.status === 'failed' && !boundedError(message.error))) return undefined
  return {
    source: 'dsh-agent-rp-st-extension-host', token,
    action: 'host-state', status: message.status, loaded, failed,
    ...(message.status === 'failed' ? { error: message.error as string } : {}),
  }
}

function documentNonce(value: string): string {
  if (!documentNoncePattern.test(value)) throw new Error('Installed ST extension document nonce is invalid')
  return value
}

/**
 * Build the document that starts every installed extension once in a shared ST-compatible page.
 * @param options - Ordered extension snapshot and Host message credentials.
 * @returns Complete iframe `srcdoc` source.
 */
export function compileStExtensionDocument(options: StExtensionDocumentOptions): string {
  const nonce = documentNonce(options.nonce)
  const boot = inlineScriptJson({
    entries: options.entries,
    sessionId: options.sessionId,
    settings: options.settings,
    snapshot: options.snapshot ?? null,
    token: options.token,
  })
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'nonce-${nonce}' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; frame-src 'none'"><style>html,body{background:transparent;color:inherit;color-scheme:dark;margin:0;min-height:100%;padding:0}body{box-sizing:border-box;font-family:system-ui,sans-serif}#extensions_settings:empty,#extensions_settings2:empty{display:none}</style></head><body><div id="extensions_settings"></div><div id="extensions_settings2"></div><script nonce="${nonce}">(()=>{'use strict';const boot=${boot};const entries=boot.entries;const token=boot.token;const loaded=new Set();const failed=new Map();const pending=entries.slice();const byId=new Map(entries.map(entry=>[entry.id,entry]));const post=(action,detail={})=>parent.postMessage({source:'dsh-agent-rp-st-extension-host',token,action,...detail},'*');const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));let sessionId=boot.sessionId;let snapshot=boot.snapshot;globalThis.__dshAgentRpSessionId=sessionId;const listeners=new Map();const on=(type,listener)=>{if(typeof listener!=='function')return;const values=listeners.get(type)??new Set();values.add(listener);listeners.set(type,values)};const removeListener=(type,listener)=>{const values=listeners.get(type);values?.delete(listener);if(values?.size===0)listeners.delete(type)};const once=(type,listener)=>{const wrapped=(...args)=>{removeListener(type,wrapped);return listener(...args)};on(type,wrapped)};const emit=async(type,...args)=>{for(const listener of [...(listeners.get(type)??[])])await listener(...args)};const eventTypes=Object.freeze({APP_READY:'app_ready',CHAT_CHANGED:'chat_id_changed',MESSAGE_SENT:'message_sent',MESSAGE_RECEIVED:'message_received',GENERATION_ENDED:'generation_ended'});const eventSource=Object.freeze({on,once,emit,emitAndWait:emit,removeListener});const context={chat:[],name1:'用户',name2:'',characters:[],this_chid:undefined,characterId:undefined,groups:[],groupId:null,chatId:sessionId,chatMetadata:{},chat_metadata:{},extensionSettings:null,eventSource,eventTypes,getContext(){return this}};const applySnapshot=value=>{snapshot=value;const messages=snapshot?.messages??[];context.chat=messages.map(message=>({name:message.role==='user'?(snapshot?.userName??'用户'):(snapshot?.characterName??''),is_user:message.role==='user',is_system:false,is_hidden:message.isHidden===true,mes:message.text,swipe_id:0,swipes:[message.text],variables:[clone(message.data??{})],swipe_info:[clone(message.extra??{})],extra:clone(message.extra??{})}));context.name1=snapshot?.userName??'用户';context.name2=snapshot?.characterName??'';context.chatId=sessionId;const character=snapshot===null?undefined:{name:snapshot.characterName,avatar:snapshot.characterId,data:clone(snapshot.characterCard??{})};context.characters=character===undefined?[]:[character];context.this_chid=character===undefined?undefined:0;context.characterId=context.this_chid;const metadata={...clone(snapshot?.scopes.chat??{}),wi_activated:clone(snapshot?.activeWorldbookEntries??[])};context.chatMetadata=metadata;context.chat_metadata=metadata;globalThis.characters=context.characters;globalThis.this_chid=context.this_chid};globalThis.extension_settings=clone(boot.settings);context.extensionSettings=globalThis.extension_settings;globalThis.eventSource=eventSource;globalThis.event_types=eventTypes;globalThis.SillyTavern=context;globalThis.getContext=()=>context;applySnapshot(snapshot);addEventListener('message',event=>{const message=event.data;if(event.source!==parent||!message||message.source!=='dsh-agent-rp-host'||message.token!==token||(message.action!=='session-bind'&&message.action!=='page-sync')||(message.sessionId!==null&&typeof message.sessionId!=='string')||(message.snapshot!==null&&typeof message.snapshot!=='object'))return;if(message.action==='page-sync'){if(message.sessionId!==sessionId)return;applySnapshot(message.snapshot);return}const previous=sessionId;sessionId=message.sessionId;globalThis.__dshAgentRpSessionId=sessionId;applySnapshot(message.snapshot);void emit(eventTypes.CHAT_CHANGED,sessionId);dispatchEvent(new CustomEvent('dsh-agent-rp-session-change',{detail:{previous,sessionId}}))});let settingsTimer;const saveSettings=()=>post('settings-save',{settings:clone(globalThis.extension_settings)});globalThis.saveSettings=saveSettings;globalThis.saveSettingsDebounced=()=>{clearTimeout(settingsTimer);settingsTimer=setTimeout(saveSettings,300)};const errorText=error=>{try{const value=error&&typeof error.message==='string'?error.message:String(error??'未知扩展错误');return value.slice(0,8000)}catch{return '无法读取扩展错误'}};const fail=(entry,error)=>{const detail=errorText(error);failed.set(entry.id,detail);post('extension-state',{extensionId:entry.id,status:'failed',error:detail})};const installStyle=entry=>{if(typeof entry.style!=='string')return;const style=document.createElement('style');style.dataset.agentRpStExtension=entry.id;style.textContent=entry.style;document.head.append(style);return style};const run=async entry=>{let url;let style;try{style=installStyle(entry);url=URL.createObjectURL(new Blob([entry.source+'\\n//# sourceURL=dsh-agent-rp-st-extension:'+encodeURIComponent(entry.id)],{type:'text/javascript'}));await import(url);loaded.add(entry.id);post('extension-state',{extensionId:entry.id,status:'loaded'})}catch(error){style?.remove();fail(entry,error)}finally{if(url!==undefined)URL.revokeObjectURL(url)}};const activate=async()=>{while(pending.length>0){let progressed=false;for(let index=0;index<pending.length;){const entry=pending[index];const missing=entry.dependencies.filter(id=>!byId.has(id));const failedDependencies=entry.dependencies.filter(id=>failed.has(id));if(missing.length>0||failedDependencies.length>0){pending.splice(index,1);fail(entry,new Error(missing.length>0?'缺少扩展依赖：'+missing.join(', '):'扩展依赖启动失败：'+failedDependencies.join(', ')));progressed=true;continue}if(entry.dependencies.some(id=>!loaded.has(id))){index+=1;continue}pending.splice(index,1);await run(entry);progressed=true}if(progressed)continue;for(const entry of pending.splice(0))fail(entry,new Error('扩展依赖存在循环'));}await emit(eventTypes.APP_READY);document.documentElement.dataset.agentRpStExtensionState='ready';post('host-state',{status:'ready',loaded:[...loaded],failed:[...failed.keys()]})};const settingsChanged=()=>post('settings-surface',{hasContent:Boolean(document.querySelector('#extensions_settings>*,#extensions_settings2>*'))});new MutationObserver(settingsChanged).observe(document.body,{childList:true,subtree:true});void activate().then(settingsChanged,error=>{document.documentElement.dataset.agentRpStExtensionState='failed';post('host-state',{status:'failed',error:errorText(error),loaded:[...loaded],failed:[...failed.keys()]})})})()</script></body></html>`
}
