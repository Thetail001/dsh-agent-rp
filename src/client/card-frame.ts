/** Browser-side compilation of character display segments into isolated iframe documents. */

import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
  normalizeLegacyCardHtml,
  type CardDisplayDiagnostic,
  type CompiledCharacterDisplay,
} from '../card-display-compiler.ts'
import {
  characterLibraryImageUrl,
  type CharacterLibraryDetail,
} from '../character-library-protocol.ts'

/** One browser-ready display piece consumed directly by the React view. */
export type CompiledCardFrameSegment =
  | { readonly kind: 'markdown'; readonly text: string }
  | {
      readonly kind: 'frame'
      readonly sourceKind: 'html' | 'inline-html'
      readonly srcDoc: string
      /** The source needs scripts or remote document loading and must not run in the library picker. */
      readonly interactive: boolean
      /** HTTPS origins referenced by this display segment. */
      readonly remoteOrigins: readonly string[]
    }

/** Browser-ready segments plus content-free compatibility diagnostics. */
export interface CompiledCardFrames {
  readonly segments: readonly CompiledCardFrameSegment[]
  readonly diagnostics: readonly CardDisplayDiagnostic[]
}

/** Inputs that vary with the active Session and local browser origin. */
export interface CardFrameCompileOptions {
  readonly origin: string
  readonly statData?: JsonValue
  readonly character?: CharacterLibraryDetail
}

/** Select card-declared resource origins that still need local approval. */
export function blockedCardFrameOrigins(
  segmentOrigins: readonly string[],
  character: {
    readonly remoteResourceOrigins?: readonly string[]
    readonly approvedRemoteResourceOrigins?: readonly string[]
  },
): readonly string[] {
  const declared = new Set(character.remoteResourceOrigins ?? [])
  const approved = new Set(character.approvedRemoteResourceOrigins ?? [])
  return segmentOrigins.filter(origin => declared.has(origin) && !approved.has(origin))
}

const cardFrameCompatibility = `<style>
html{background:transparent!important;color-scheme:dark;scrollbar-color:rgba(145,158,181,.58) transparent;scrollbar-width:thin}
*,*::before,*::after{box-sizing:border-box}
[data-agent-rp-center]{display:block;text-align:center}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(145,158,181,.58);background-clip:padding-box}
img,svg,video,canvas{max-width:100%}
</style>`

function remoteOrigins(source: string): readonly string[] {
  const origins = new Set<string>()
  for (const match of source.matchAll(/https:\/\/[^\s"'<>`\\)]+/giu)) {
    try {
      const url = new URL(match[0].replace(/[),.;]+$/u, ''))
      if (url.protocol === 'https:') origins.add(url.origin)
    } catch {
      // URL-like card text does not declare a usable browser resource.
    }
  }
  return [...origins].sort()
}

function mvuFrameRuntime(statData: JsonValue | undefined): string {
  const json = JSON.stringify(statData ?? {}).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029')
  return `
var __dshStatData=${json};
var __dshCardListeners=new Map();
function __dshCardOn(type,listener){var list=__dshCardListeners.get(String(type))??[];list.push(listener);__dshCardListeners.set(String(type),list);var stop=function(){var current=__dshCardListeners.get(String(type))??[];__dshCardListeners.set(String(type),current.filter(function(value){return value!==listener}))};stop.stop=stop;return stop}
function __dshCardEmit(type){var args=Array.prototype.slice.call(arguments,1);for(var listener of [...(__dshCardListeners.get(String(type))??[])]){try{listener.apply(window,args)}catch(error){console.error(error)}}}
window.Mvu={events:{VARIABLE_INITIALIZED:'mag_variable_initialized',VARIABLE_UPDATE_STARTED:'mag_variable_update_started',COMMAND_PARSED:'mag_command_parsed',VARIABLE_UPDATE_ENDED:'mvu-variable-update-ended',BEFORE_MESSAGE_UPDATE:'mag_before_message_update'},getMvuData:function(){return {stat_data:__dshStatData}},replaceMvuData:function(value){__dshStatData=value?.stat_data??value??{};__dshCardEmit('mvu-variable-update-ended',{stat_data:__dshStatData});return Promise.resolve()},isDuringExtraAnalysis:function(){return false}};
window.getAllVariables=function(){return {stat_data:__dshStatData}};
window.waitGlobalInitialized=function(){return Promise.resolve()};
window.eventOn=__dshCardOn;
window.eventOnce=function(type,listener){var control;control=__dshCardOn(type,function(){control.stop();return listener.apply(this,arguments)});return control};
window.eventEmit=__dshCardEmit;
window.errorCatched=function(fn){return function(){try{var value=fn.apply(this,arguments);if(value&&typeof value.catch==='function')value.catch(console.error)}catch(error){console.error(error)}}};
window.toastr={info:function(){},success:function(){},warning:function(){},error:function(){}};
var __dshCardChat=[{message_id:0,message:'',mes:'',name:'角色',is_user:false,role:'assistant',extra:{}}];
window.getChatMessages=function(){return Promise.resolve(__dshCardChat.map(function(message){return Object.assign({},message,{extra:Object.assign({},message.extra)})}))};
window.setChatMessage=function(value,id){var index=Number(id);if(!Number.isSafeInteger(index)||index<0||index>=__dshCardChat.length)index=__dshCardChat.length-1;var text=typeof value==='string'?value:value?.message??value?.mes;if(typeof text==='string'){__dshCardChat[index].message=text;__dshCardChat[index].mes=text;__dshCardEmit('mag_before_message_update',index);__dshCardEmit('mvu-variable-update-ended',{stat_data:__dshStatData})}return Promise.resolve()};
window.SillyTavern={chat:__dshCardChat,name1:'用户',name2:'角色',characters:[],this_chid:0,characterId:0,groups:[],groupId:null,chatMetadata:{},chat_metadata:{},extensionSettings:{},eventSource:{on:window.eventOn,once:window.eventOnce,emit:window.eventEmit},getChatMessages:window.getChatMessages,setChatMessage:window.setChatMessage,getContext:function(){return this}};
window.getContext=function(){return window.SillyTavern.getContext()};
window.TavernHelper=window;
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

const sandboxFacadeNames = [
  'SillyTavern', 'Mvu', 'getAllVariables', 'waitGlobalInitialized', 'eventOn', 'eventOnce', 'eventEmit',
  'errorCatched', 'toastr', 'getChatMessages', 'setChatMessage', 'getContext', 'TavernHelper', '_', '$',
] as const

function redirectKnownHostFacades(source: string): string {
  return sandboxFacadeNames.reduce((value, name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    return value.replace(new RegExp(
      `(?:window\\s*\\.\\s*)?(?:parent|top)\\s*(?:\\?\\.)?\\.?\\s*${escaped}(?![\\w$])`,
      'gu',
    ), `window.${name}`)
  }, source)
}

function cardFrameSource(source: string, options: CardFrameCompileOptions): string {
  const assets = (options.character?.imageAssets ?? []).map(asset => ({
    ...asset,
    url: new URL(characterLibraryImageUrl(options.character!.id, asset.index), options.origin).href,
  }))
  const adapted = redirectKnownHostFacades(
    assets.reduce((html, asset) => asset.sourceUri === '' ? html : html.replaceAll(asset.sourceUri, asset.url), source)
      .replaceAll('window.parent?.document ?? window.document', 'window.document'),
  )
  const assetJson = JSON.stringify(assets).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029')
  const allowedImageOrigins = [...new Set([
    options.origin,
    ...(options.character?.approvedRemoteResourceOrigins ?? []),
    ...(options.character?.displayExtensions?.filter(extension => extension.enabled)
      .flatMap(extension => extension.remoteImageOrigins) ?? []),
  ])].map(origin => origin.replace(/["'<>\s]/gu, '')).filter(Boolean).join(' ')
  const interactiveOrigins = (options.character?.approvedRemoteResourceOrigins ?? [])
    .map(origin => origin.replace(/["'<>\s]/gu, '')).filter(Boolean).join(' ')
  const remotePolicy = interactiveOrigins === '' ? "'none'" : interactiveOrigins
  const head = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: ${allowedImageOrigins}; style-src 'unsafe-inline' ${interactiveOrigins}; script-src 'unsafe-inline' ${interactiveOrigins}; connect-src ${remotePolicy}; font-src ${remotePolicy}; frame-src 'none';"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">${cardFrameCompatibility}<script>${mvuFrameRuntime(options.statData)}window.dshCharacterAssets=Object.freeze(${assetJson}.map(Object.freeze));window.getCharacterAsset=function(type,name){var target=window.dshCharacterAssets.find(function(asset){return asset.type===String(type).toLowerCase()&&(name===undefined||asset.name===String(name))});return target?.url};window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};function __dshReportSize(){var root=document.documentElement;var body=document.body;var value=Math.max(root?root.scrollHeight:0,body?body.scrollHeight:0);parent.postMessage({source:'dsh-agent-rp-card',action:'resize',value:value},'*')}addEventListener('message',function(event){var message=event.data;if(message&&message.source==='dsh-agent-rp-host'&&message.action==='request-resize')requestAnimationFrame(__dshReportSize)});addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(!input){input=document.createElement('textarea');input.id='send_textarea';input.hidden=true;document.body.appendChild(input)}input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')});requestAnimationFrame(__dshReportSize);if(window.ResizeObserver)new ResizeObserver(__dshReportSize).observe(document.documentElement)});</script>`
  if (/<head(?:\s|>)/iu.test(adapted)) return adapted.replace(/<head([^>]*)>/iu, `<head$1>${head}`)
  if (/<html(?:\s|>)/iu.test(adapted)) return adapted.replace(/<html([^>]*)>/iu, `<html$1><head>${head}</head>`)
  return `<!doctype html><html><head>${head}</head><body>${adapted}</body></html>`
}

/** Wrap one already-isolated frontend document with the shared sandbox runtime. */
export function compileCardFrameDocument(source: string, options: CardFrameCompileOptions): string {
  return cardFrameSource(source, options)
}

function inlineCardFrameSource(source: string, options: CardFrameCompileOptions): {
  readonly srcDoc: string
  readonly diagnostics: readonly CardDisplayDiagnostic[]
} {
  const legacy = normalizeLegacyCardHtml(source)
  const markdown = marked.parse(legacy.source, { async: false, breaks: true, gfm: true }) as string
  const sanitized = DOMPurify.sanitize(markdown, {
    ADD_TAGS: ['style'],
    FORBID_ATTR: ['srcdoc'],
    FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'link', 'meta', 'object', 'script'],
    USE_PROFILES: { html: true },
    WHOLE_DOCUMENT: true,
  })
  return { srcDoc: cardFrameSource(sanitized, options), diagnostics: legacy.diagnostics }
}

/** Compile deterministic display segments into browser-ready Markdown and iframe documents. */
export function compileCardFrames(
  compilation: CompiledCharacterDisplay,
  options: CardFrameCompileOptions,
): CompiledCardFrames {
  const diagnostics = [...compilation.diagnostics]
  const segments = compilation.segments.map(segment => {
    if (segment.kind === 'markdown') return segment
    if (segment.kind === 'html') {
      return {
        kind: 'frame' as const,
        sourceKind: segment.kind,
        srcDoc: cardFrameSource(segment.source, options),
        interactive: /<script\b|\bfetch\s*\(|\bon[a-z]+\s*=/iu.test(segment.source),
        remoteOrigins: remoteOrigins(segment.source),
      }
    }
    const compiled = inlineCardFrameSource(segment.source, options)
    diagnostics.push(...compiled.diagnostics)
    return {
      kind: 'frame' as const,
      sourceKind: segment.kind,
      srcDoc: compiled.srcDoc,
      interactive: false,
      remoteOrigins: remoteOrigins(segment.source),
    }
  })
  return { segments, diagnostics }
}

/** Serialize diagnostics for DOM inspection without retaining card text. */
export function cardFrameDiagnosticSummary(diagnostics: readonly CardDisplayDiagnostic[]): string | undefined {
  if (diagnostics.length === 0) return undefined
  return diagnostics.map(value => `${value.code}:${value.count}`).join(',')
}
