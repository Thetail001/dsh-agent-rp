/** Browser-only isolated Tavern Helper runtime. */

import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import type { ImportedTavernHelperScript } from '../import/types.ts'

type JsonRecord = Readonly<Record<string, JsonValue>>

/** Initial state copied into one script sandbox. */
export interface TavernScriptSnapshot {
  readonly scriptId: string
  readonly scriptName: string
  readonly scriptInfo: string
  readonly buttons: readonly { readonly name: string; readonly visible: boolean }[]
  readonly characterName: string
  readonly userName?: string
  readonly approvedScriptOrigins: readonly string[]
  readonly scopes: {
    readonly global: JsonRecord
    readonly preset: JsonRecord
    readonly character: JsonRecord
    readonly chat: JsonRecord
    readonly message: JsonRecord
    readonly script: JsonRecord
  }
  readonly messages: readonly {
    readonly messageId: number
    readonly role: 'user' | 'assistant'
    readonly text: string
  }[]
}

const remoteCache = new Map<string, Promise<string>>()
/** Script origins trusted by the built-in jsDelivr bundle resolver. */
export const BUILT_IN_TAVERN_SCRIPT_ORIGINS = ['https://cdn.jsdelivr.net', 'https://testingcf.jsdelivr.net'] as const
const allowedScriptOrigins = new Set<string>(BUILT_IN_TAVERN_SCRIPT_ORIGINS)
const importLine = /^\s*import\s+(['"])(https:\/\/[^'"\s]+)\1\s*;?\s*$/gmu

async function remoteSource(url: string, signal: AbortSignal): Promise<string> {
  const parsed = new URL(url)
  if (!allowedScriptOrigins.has(parsed.origin)) {
    throw new Error(`远程脚本来源未开放：${parsed.origin}`)
  }
  const cached = remoteCache.get(parsed.href)
  if (cached !== undefined) return cached
  const loading = fetch(parsed.href, {
    cache: 'force-cache',
    credentials: 'omit',
    headers: { accept: 'text/javascript, application/javascript, text/plain' },
    referrerPolicy: 'no-referrer',
    signal,
  }).then(async response => {
    if (!response.ok) throw new Error(`远程脚本读取失败（${response.status}）`)
    const length = Number(response.headers.get('content-length') ?? 0)
    if (Number.isFinite(length) && length > 2 * 1024 * 1024) throw new Error('远程脚本超过 2 MiB')
    const source = await response.text()
    if (new TextEncoder().encode(source).byteLength > 2 * 1024 * 1024) throw new Error('远程脚本超过 2 MiB')
    return source
  })
  remoteCache.set(parsed.href, loading)
  try {
    return await loading
  } catch (error) {
    remoteCache.delete(parsed.href)
    throw error
  }
}

/** Resolve the common card form consisting of side-effect imports from jsDelivr bundles. */
export async function resolveTavernScriptSource(content: string, signal: AbortSignal): Promise<string> {
  const urls = [...content.matchAll(importLine)].map(match => match[2]!)
  const local = content.replace(importLine, '').trim()
  if (urls.length === 0) return content
  const sources = await Promise.all(urls.map(url => remoteSource(url, signal)))
  const total = sources.reduce((size, source) => size + new TextEncoder().encode(source).byteLength, 0)
  if (total > 4 * 1024 * 1024) throw new Error('远程脚本合计超过 4 MiB')
  return [...sources, local].filter(Boolean).join('\n;\n')
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029')
}

function runtimeSource(snapshot: TavernScriptSnapshot): string {
  return `
'use strict';
var __dshSnapshot=${safeJson(snapshot)};
var __dshScopes=__dshSnapshot.scopes;
var __dshMessages=__dshSnapshot.messages;
var __dshListeners=new Map();
var __dshPending=new Map();
var __dshRequest=0;
function __dshClone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value))}
function __dshPath(path){if(Array.isArray(path))return path.map(String);return String(path??'').replace(/\\[([^[\\]]+)\\]/g,'.$1').replace(/^\\./,'').split('.').filter(Boolean)}
function __dshGet(object,path,fallback){var value=object;for(var part of __dshPath(path)){if(value==null)return fallback;value=value[part]}return value===undefined?fallback:value}
function __dshSet(object,path,value){var parts=__dshPath(path);if(parts.length===0)return object;var target=object;for(var i=0;i<parts.length-1;i++){var key=parts[i];var next=parts[i+1];if(target[key]===null||typeof target[key]!=='object')target[key]=/^\\d+$/.test(next)?[]:{};target=target[key]}target[parts.at(-1)]=value;return object}
function __dshUnset(object,path){var parts=__dshPath(path);var target=object;for(var i=0;i<parts.length-1;i++){target=target?.[parts[i]];if(target==null)return false}return target!=null&&delete target[parts.at(-1)]}
function __dshPlain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function __dshMerge(target){for(var source of Array.prototype.slice.call(arguments,1)){if(!__dshPlain(source))continue;for(var key of Object.keys(source)){var value=source[key];if(__dshPlain(value)){if(!__dshPlain(target[key]))target[key]={};__dshMerge(target[key],value)}else target[key]=__dshClone(value)}}return target}
function __dshScope(option){var type=option?.type??'chat';if(type==='script')return 'script';if(type==='message')return 'message';return ['global','preset','character','chat'].includes(type)?type:'chat'}
function __dshPost(action,data){parent.postMessage(Object.assign({source:'dsh-agent-rp-tavern-script',scriptId:__dshSnapshot.scriptId,action:action},data??{}),'*')}
function __dshReplace(variables,option){var scope=__dshScope(option);var cloned=__dshClone(variables??{});__dshScopes[scope]=cloned;var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('variables-replace',{requestId:requestId,scope:scope,variables:cloned})})}
function __DshStorage(initial,persist){this.data=new Map(Object.entries(initial??{}).map(function(pair){return [String(pair[0]),String(pair[1])]}));this.persist=persist}
Object.defineProperty(__DshStorage.prototype,'length',{get:function(){return this.data.size}});
__DshStorage.prototype.key=function(index){return Array.from(this.data.keys())[Number(index)]??null};
__DshStorage.prototype.getItem=function(key){key=String(key);return this.data.has(key)?this.data.get(key):null};
__DshStorage.prototype.setItem=function(key,value){this.data.set(String(key),String(value));this.persist?.(this.data)};
__DshStorage.prototype.removeItem=function(key){this.data.delete(String(key));this.persist?.(this.data)};
__DshStorage.prototype.clear=function(){this.data.clear();this.persist?.(this.data)};
var __dshStorageScheduled=false;
var __dshLocalStorage=new __DshStorage(__dshScopes.script?.__dsh_local_storage,function(data){if(__dshStorageScheduled)return;__dshStorageScheduled=true;queueMicrotask(function(){__dshStorageScheduled=false;var variables=__dshClone(__dshScopes.script??{});variables.__dsh_local_storage=Object.fromEntries(data);void __dshReplace(variables,{type:'script'}).catch(function(error){__dshPost('runtime-error',{value:String(error)})})})});
var __dshSessionStorage=new __DshStorage();
try{Object.defineProperty(window,'localStorage',{configurable:true,value:__dshLocalStorage})}catch(error){}
try{Object.defineProperty(window,'sessionStorage',{configurable:true,value:__dshSessionStorage})}catch(error){}
window.getVariables=function(option){return __dshClone(__dshScopes[__dshScope(option)]??{})};
window.replaceVariables=__dshReplace;
window.updateVariablesWith=function(updater,option){var current=window.getVariables(option);return Promise.resolve(updater(current)).then(function(next){return __dshReplace(next,option).then(function(){return next})})};
window.insertOrAssignVariables=function(variables,option){return window.updateVariablesWith(function(current){return __dshMerge(current,variables)},option)};
window.insertVariables=function(variables,option){return window.updateVariablesWith(function(current){return __dshMerge({},variables,current)},option)};
window.deleteVariable=function(path,option){var occurred=false;return window.updateVariablesWith(function(current){occurred=__dshUnset(current,path);return current},option).then(function(variables){return {variables:variables,delete_occurred:occurred}})};
window.getAllVariables=function(){return __dshClone(__dshMerge({},__dshScopes.global,__dshScopes.character,__dshScopes.script,__dshScopes.chat,__dshScopes.message))};
window.waitGlobalInitialized=function(name){return Promise.resolve(window[name])};
window.getScriptId=function(){return __dshSnapshot.scriptId};
window.getScriptName=function(){return __dshSnapshot.scriptName};
window.getScriptInfo=function(){return __dshSnapshot.scriptInfo};
window.replaceScriptInfo=function(){};
window.getScriptButtons=function(){return __dshClone(__dshSnapshot.buttons)};
window.getButtonEvent=function(name){return __dshSnapshot.scriptId+'_'+String(name)};
window.getLastMessageId=function(){return Math.max(-1,__dshMessages.length-1)};
window.getCurrentMessageId=window.getLastMessageId;
window.getChatMessages=function(range){var result=__dshMessages.map(function(message){return {message_id:message.messageId,role:message.role,message:message.text,name:message.role==='user'?__dshSnapshot.userName:__dshSnapshot.characterName}});if(typeof range!=='string'||range==='')return __dshClone(result);var parts=range.split('-').map(Number);if(parts.some(Number.isNaN))return __dshClone(result);return __dshClone(result.slice(parts[0],parts.length>1?parts[1]+1:parts[0]+1))};
window.triggerSlash=function(value){__dshPost('trigger-slash',{value:String(value)})};
window.errorCatched=function(fn){return function(){try{return Promise.resolve(fn.apply(this,arguments)).catch(console.error)}catch(error){console.error(error)}}};
function __dshOn(type,listener,mode){var list=__dshListeners.get(String(type))??[];if(list.some(entry=>entry.listener===listener))return {stop:function(){}};var entry={listener:listener,once:mode==='once'};if(mode==='first')list.unshift(entry);else list.push(entry);__dshListeners.set(String(type),list);return {stop:function(){window.eventRemoveListener(type,listener)}}}
window.eventOn=function(type,listener){return __dshOn(type,listener)};
window.eventOnce=function(type,listener){return __dshOn(type,listener,'once')};
window.eventMakeFirst=function(type,listener){window.eventRemoveListener(type,listener);return __dshOn(type,listener,'first')};
window.eventMakeLast=function(type,listener){window.eventRemoveListener(type,listener);return __dshOn(type,listener)};
window.eventRemoveListener=function(type,listener){var list=__dshListeners.get(String(type))??[];__dshListeners.set(String(type),list.filter(entry=>entry.listener!==listener))};
window.eventClearEvent=function(type){__dshListeners.delete(String(type))};
window.eventClearListener=function(listener){for(var pair of __dshListeners)__dshListeners.set(pair[0],pair[1].filter(entry=>entry.listener!==listener))};
window.eventClearAll=function(){__dshListeners.clear()};
async function __dshEmitLocal(type,args){var list=[...(__dshListeners.get(String(type))??[])];for(var entry of list){await entry.listener.apply(window,args);if(entry.once)window.eventRemoveListener(type,entry.listener)}}
window.eventEmit=function(type){var args=Array.prototype.slice.call(arguments,1);__dshPost('event-emit',{eventType:String(type),args:__dshClone(args)});return __dshEmitLocal(type,args)};
window.eventEmitAndWait=window.eventEmit;
window.eventOnButton=window.eventOn;
window.iframe_events={MESSAGE_IFRAME_RENDER_STARTED:'message_iframe_render_started',MESSAGE_IFRAME_RENDER_ENDED:'message_iframe_render_ended',GENERATION_STARTED:'js_generation_started',STREAM_TOKEN_RECEIVED_FULLY:'js_stream_token_received_fully',STREAM_TOKEN_RECEIVED_INCREMENTALLY:'js_stream_token_received_incrementally',GENERATION_ENDED:'js_generation_ended'};
window.tavern_events={APP_READY:'app_ready',MESSAGE_SENT:'message_sent',MESSAGE_RECEIVED:'message_received',MESSAGE_EDITED:'message_edited',MESSAGE_DELETED:'message_deleted',MESSAGE_UPDATED:'message_updated',CHAT_CHANGED:'chat_id_changed',GENERATION_STARTED:'generation_started',GENERATION_STOPPED:'generation_stopped',GENERATION_ENDED:'generation_ended',USER_MESSAGE_RENDERED:'user_message_rendered',CHARACTER_MESSAGE_RENDERED:'character_message_rendered'};
window.Mvu={events:{VARIABLE_INITIALIZED:'mag_variable_initiailized',VARIABLE_UPDATE_STARTED:'mag_variable_update_started',COMMAND_PARSED:'mag_command_parsed',VARIABLE_UPDATE_ENDED:'mag_variable_update_ended',BEFORE_MESSAGE_UPDATE:'mag_before_message_update'},getMvuData:function(option){return window.getVariables(option??{type:'message'})},replaceMvuData:function(value,option){return __dshReplace(value,option??{type:'message'})},isDuringExtraAnalysis:function(){return false}};
window.SillyTavern={chat:[],name1:__dshSnapshot.userName??'用户',name2:__dshSnapshot.characterName,chatId:'dsh-agent-rp',chatMetadata:__dshScopes.chat,extensionSettings:{},getCurrentChatId:function(){return 'dsh-agent-rp'},eventSource:{on:window.eventOn,once:window.eventOnce,emit:window.eventEmit,emitAndWait:window.eventEmitAndWait,removeListener:window.eventRemoveListener},eventTypes:window.tavern_events,getContext:function(){return this}};
window.TavernHelper=window;
var __dshFrameHost=document.createElement('div');
var __dshFrameElement=document.createElement('iframe');
__dshFrameHost.hidden=true;__dshFrameHost.appendChild(__dshFrameElement);document.body.appendChild(__dshFrameHost);
try{Object.defineProperty(window,'frameElement',{configurable:true,value:__dshFrameElement})}catch(error){}
var __dshSurfaceReported;
var __dshSurfaceScheduled=false;
function __dshHasSurface(){return Array.from(document.body.children).some(function(element){if(element===__dshFrameHost||element.tagName==='SCRIPT'||element.tagName==='STYLE'||element.tagName==='LINK'||element.hidden)return false;var style=getComputedStyle(element);return style.display!=='none'&&style.visibility!=='hidden'})}
function __dshReportSurface(){__dshSurfaceScheduled=false;var visible=__dshHasSurface();if(visible===__dshSurfaceReported)return;__dshSurfaceReported=visible;__dshPost('surface',{visible:visible})}
function __dshScheduleSurface(){if(__dshSurfaceScheduled)return;__dshSurfaceScheduled=true;queueMicrotask(__dshReportSurface)}
new MutationObserver(__dshScheduleSurface).observe(document.body,{attributes:true,attributeFilter:['class','hidden','style'],childList:true,subtree:true});
__dshScheduleSurface();
var __dshApprovedOrigins=new Set(__dshSnapshot.approvedScriptOrigins);
var __dshNativeAppend=Element.prototype.appendChild;
var __dshNativeInsert=Element.prototype.insertBefore;
function __dshGuardScript(node){if(node?.tagName!=='SCRIPT'||!node.src)return;var origin;try{origin=new URL(node.src).origin}catch(error){origin=String(node.src)};if(__dshApprovedOrigins.has(origin))return;node.type='application/x-dsh-blocked';node.removeAttribute('src');__dshPost('external-script-request',{origin:origin})}
Element.prototype.appendChild=function(node){__dshGuardScript(node);return __dshNativeAppend.call(this,node)};
Element.prototype.insertBefore=function(node,before){__dshGuardScript(node);return __dshNativeInsert.call(this,node,before)};
function Chain(value){this.data=value}
Chain.prototype.value=function(){return this.data};
for(var method of ['map','filter','flatMap'])Chain.prototype[method]=function(method){return function(callback){this.data=Array.from(this.data??[])[method](callback);return this}}(method);
Chain.prototype.assign=function(){this.data=Object.assign(this.data,...arguments);return this};
Chain.prototype.sortBy=function(iteratee){var getter=typeof iteratee==='function'?iteratee:function(value){return __dshGet(value,iteratee)};this.data=Array.from(this.data??[]).sort(function(a,b){return String(getter(a)).localeCompare(String(getter(b)))});return this};
Chain.prototype.fromPairs=function(){this.data=Object.fromEntries(this.data);return this};
function lodash(value){return new Chain(value)}
Object.assign(lodash,{get:__dshGet,set:__dshSet,has:function(object,path){return __dshGet(object,path,Symbol.for('missing'))!==Symbol.for('missing')},unset:__dshUnset,merge:__dshMerge,assign:Object.assign,cloneDeep:__dshClone,isArray:Array.isArray,isPlainObject:__dshPlain,isEqual:function(a,b){return JSON.stringify(a)===JSON.stringify(b)},clamp:function(value,min,max){return Math.min(max,Math.max(min,Number(value)))},inRange:function(value,start,end){return value>=start&&value<end},range:function(start,end){if(end===undefined){end=start;start=0}return Array.from({length:Math.max(0,end-start)},function(_,i){return start+i})},times:function(count,iteratee){return Array.from({length:count},function(_,i){return iteratee(i)})},constant:function(value){return function(){return value}},keys:Object.keys,values:Object.values,size:function(value){return Array.isArray(value)||typeof value==='string'?value.length:Object.keys(value??{}).length},forEach:function(value,iteratee){Object.entries(value??{}).forEach(function(pair){iteratee(pair[1],pair[0])});return value},pickBy:function(value,predicate){return Object.fromEntries(Object.entries(value??{}).filter(function(pair){return predicate(pair[1],pair[0])}))},pick:function(value,keys){return Object.fromEntries(keys.filter(function(key){return key in value}).map(function(key){return [key,value[key]]}))},omit:function(value,keys){return Object.fromEntries(Object.entries(value??{}).filter(function(pair){return !keys.includes(pair[0])}))},difference:function(left,right){return left.filter(function(value){return !right.includes(value)})},pull:function(array){var values=Array.prototype.slice.call(arguments,1);for(var i=array.length-1;i>=0;i--)if(values.includes(array[i]))array.splice(i,1);return array},toInteger:function(value){var number=Number(value);return Number.isFinite(number)?Math.trunc(number):0}});
window._=lodash;
function Mini(value){if(value instanceof Mini)this.items=value.items;else if(typeof value==='string'&&value.trim().startsWith('<')){var template=document.createElement('template');template.innerHTML=value.trim();this.items=Array.from(template.content.childNodes)}else if(typeof value==='string')this.items=Array.from(document.querySelectorAll(value));else if(value===window||value===document||value instanceof Node)this.items=[value];else this.items=value&&typeof value.length==='number'?Array.from(value):[]}
Mini.prototype.each=function(callback){this.items.forEach(function(item,index){callback.call(item,index,item)});return this};
Mini.prototype.on=function(type,selector,handler){if(typeof selector==='function'){handler=selector;selector=undefined}return this.each(function(){this.addEventListener(type,function(event){if(selector===undefined)return handler.call(this,event);var target=event.target?.closest?.(selector);if(target&&this.contains(target))handler.call(target,event)})})};
for(var pair of [['text','textContent'],['html','innerHTML'],['val','value']])Mini.prototype[pair[0]]=function(property){return function(value){if(value===undefined)return this.items[0]?.[property]??'';return this.each(function(){this[property]=String(value)})}}(pair[1]);
Mini.prototype.attr=function(name,value){if(value===undefined)return this.items[0]?.getAttribute?.(name);return this.each(function(){this.setAttribute?.(name,String(value))})};
Mini.prototype.prop=function(name,value){if(value===undefined)return this.items[0]?.[name];return this.each(function(){this[name]=value})};
Mini.prototype.css=function(name,value){if(typeof name==='object')return this.each(function(){Object.assign(this.style,name)});if(value===undefined)return this.items[0] instanceof Element?getComputedStyle(this.items[0]).getPropertyValue(name):'';return this.each(function(){this.style?.setProperty(name,String(value))})};
Mini.prototype.append=function(value){var nodes=new Mini(value).items;return this.each(function(){for(var node of nodes)this.append(node.cloneNode(true))})};
Mini.prototype.prepend=function(value){var nodes=new Mini(value).items;return this.each(function(){for(var node of [...nodes].reverse())this.prepend(node.cloneNode(true))})};
Mini.prototype.find=function(selector){return new Mini(this.items.flatMap(function(item){return Array.from(item.querySelectorAll?.(selector)??[])}))};
Mini.prototype.closest=function(selector){return new Mini(this.items.map(function(item){return item.closest?.(selector)}).filter(Boolean))};
Mini.prototype.remove=function(){return this.each(function(){this.remove()})};Mini.prototype.hide=function(){return this.css('display','none')};Mini.prototype.show=function(){return this.css('display','')};
Mini.prototype.addClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.add(...names)})};Mini.prototype.removeClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.remove(...names)})};Mini.prototype.toggleClass=function(value,force){return this.each(function(){this.classList?.toggle(String(value),force)})};
window.$=function(value){if(typeof value==='function'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',value,{once:true});else queueMicrotask(value);return new Mini([])}return new Mini(value)};window.jQuery=window.$;
window.toastr={info:console.info,success:console.info,warning:console.warn,error:console.error};
addEventListener('message',function(event){if(event.source!==parent||!event.data||event.data.source!=='dsh-agent-rp-host')return;var message=event.data;if(message.action==='variables-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);message.ok?pending.resolve():pending.reject(new Error(String(message.error??'变量保存失败')));return}if(message.action==='variables-sync'){__dshScopes=message.scopes;__dshMessages=message.messages;return}if(message.action==='event'){var args=message.args??[];var before=message.eventType==='mag_variable_update_ended'?JSON.stringify(args[0]??{}):undefined;void __dshEmitLocal(message.eventType,args).then(function(){if(before!==undefined&&JSON.stringify(args[0]??{})!==before)return __dshReplace(args[0]??{},{type:'message'})}).catch(function(error){console.error(error);__dshPost('runtime-error',{value:String(error)})})}});
addEventListener('error',function(event){__dshPost('runtime-error',{value:event.message})});
addEventListener('unhandledrejection',function(event){__dshPost('runtime-error',{value:String(event.reason)})});
__dshPost('ready');
`
}

/** Create a network-isolated script document from already-resolved JavaScript. */
export function tavernScriptFrameSource(
  script: ImportedTavernHelperScript,
  source: string,
  snapshot: TavernScriptSnapshot,
): string {
  const encoded = safeJson(`${source}\n//# sourceURL=dsh-agent-rp:${script.id}`)
  const origins = snapshot.approvedScriptOrigins.map(origin => new URL(origin).origin).join(' ')
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${origins}; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'; font-src 'none'; frame-src 'none'"><style>html,body{background:transparent;color-scheme:dark}</style></head><body><script>${runtimeSource(snapshot)}\ntry{Function('localStorage','sessionStorage',${encoded})(__dshLocalStorage,__dshSessionStorage)}catch(error){console.error(error);parent.postMessage({source:'dsh-agent-rp-tavern-script',scriptId:${safeJson(script.id)},action:'runtime-error',value:String(error)},'*')}</script></body></html>`
}
