/** Isolated singleton document for browser-installed SillyTavern extensions. */

import type { InstalledStExtensionEntry } from './st-extension-registry.ts'
import { inlineScriptJson } from './inline-script-json.ts'

const documentNoncePattern = /^[A-Za-z0-9_-]{16,128}$/u

/** Inputs required to build one browser ClientContext's extension document. */
export interface StExtensionDocumentOptions {
  readonly entries: readonly InstalledStExtensionEntry[]
  readonly nonce: string
  readonly token: string
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
  const boot = inlineScriptJson({ entries: options.entries, token: options.token })
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'nonce-${nonce}' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; frame-src 'none'"><style>html,body{background:transparent;color:inherit;color-scheme:dark;margin:0;min-height:100%;padding:0}body{box-sizing:border-box;font-family:system-ui,sans-serif}#extensions_settings:empty,#extensions_settings2:empty{display:none}</style></head><body><div id="extensions_settings"></div><div id="extensions_settings2"></div><script nonce="${nonce}">(()=>{'use strict';const boot=${boot};const entries=boot.entries;const token=boot.token;const loaded=new Set();const failed=new Map();const pending=entries.slice();const byId=new Map(entries.map(entry=>[entry.id,entry]));const post=(action,detail={})=>parent.postMessage({source:'dsh-agent-rp-st-extension-host',token,action,...detail},'*');const errorText=error=>{try{const value=error&&typeof error.message==='string'?error.message:String(error??'未知扩展错误');return value.slice(0,8000)}catch{return '无法读取扩展错误'}};const fail=(entry,error)=>{const detail=errorText(error);failed.set(entry.id,detail);post('extension-state',{extensionId:entry.id,status:'failed',error:detail})};const installStyle=entry=>{if(typeof entry.style!=='string')return;const style=document.createElement('style');style.dataset.agentRpStExtension=entry.id;style.textContent=entry.style;document.head.append(style);return style};const run=async entry=>{let url;let style;try{style=installStyle(entry);url=URL.createObjectURL(new Blob([entry.source+'\\n//# sourceURL=dsh-agent-rp-st-extension:'+encodeURIComponent(entry.id)],{type:'text/javascript'}));await import(url);loaded.add(entry.id);post('extension-state',{extensionId:entry.id,status:'loaded'})}catch(error){style?.remove();fail(entry,error)}finally{if(url!==undefined)URL.revokeObjectURL(url)}};const activate=async()=>{while(pending.length>0){let progressed=false;for(let index=0;index<pending.length;){const entry=pending[index];const missing=entry.dependencies.filter(id=>!byId.has(id));const failedDependencies=entry.dependencies.filter(id=>failed.has(id));if(missing.length>0||failedDependencies.length>0){pending.splice(index,1);fail(entry,new Error(missing.length>0?'缺少扩展依赖：'+missing.join(', '):'扩展依赖启动失败：'+failedDependencies.join(', ')));progressed=true;continue}if(entry.dependencies.some(id=>!loaded.has(id))){index+=1;continue}pending.splice(index,1);await run(entry);progressed=true}if(progressed)continue;for(const entry of pending.splice(0))fail(entry,new Error('扩展依赖存在循环'));}document.documentElement.dataset.agentRpStExtensionState='ready';post('host-state',{status:'ready',loaded:[...loaded],failed:[...failed.keys()]})};const settingsChanged=()=>post('settings-surface',{hasContent:Boolean(document.querySelector('#extensions_settings>*,#extensions_settings2>*'))});new MutationObserver(settingsChanged).observe(document.body,{childList:true,subtree:true});void activate().then(settingsChanged,error=>{document.documentElement.dataset.agentRpStExtensionState='failed';post('host-state',{status:'failed',error:errorText(error),loaded:[...loaded],failed:[...failed.keys()]})})})()</script></body></html>`
}
