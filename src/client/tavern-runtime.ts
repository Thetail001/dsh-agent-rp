/** Browser-only isolated Tavern Helper runtime. */

import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import type { ImportedRegexScript, ImportedTavernHelperScript } from '../import/types.ts'
import type { TavernWorldbookBindings, TavernWorldbookEntry } from '../tavern-helper.ts'

type JsonRecord = Readonly<Record<string, JsonValue>>

/** Current session preset exposed to one isolated Tavern Helper script. */
export interface TavernScriptPresetSnapshot {
  readonly name: string
  readonly revision: number
  readonly value: JsonRecord
}

/** Initial state copied into one script sandbox. */
export interface TavernScriptSnapshot {
  readonly scriptId: string
  readonly scriptName: string
  readonly scriptInfo: string
  readonly buttons: readonly { readonly name: string; readonly visible: boolean }[]
  readonly characterName: string
  readonly characterId: string
  readonly chatId: string
  readonly userName?: string
  readonly preset?: TavernScriptPresetSnapshot
  readonly approvedScriptOrigins: readonly string[]
  readonly scopes: {
    readonly global: JsonRecord
    readonly preset: JsonRecord
    readonly character: JsonRecord
    readonly chat: JsonRecord
    readonly message: JsonRecord
    readonly script: JsonRecord
  }
  readonly worldbooks: Readonly<Record<string, readonly TavernWorldbookEntry[]>>
  readonly worldbookBindings: Required<TavernWorldbookBindings>
  readonly messages: readonly {
    readonly messageId: number
    readonly seq: number
    readonly role: 'user' | 'assistant'
    readonly text: string
    readonly data: JsonRecord
    readonly extra: JsonRecord
  }[]
  readonly displayRegexScripts: readonly ImportedRegexScript[]
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
var __dshDisplayRegexScripts=__dshSnapshot.displayRegexScripts;
var __dshWorldbooks=__dshSnapshot.worldbooks;
var __dshWorldbookBindings=__dshSnapshot.worldbookBindings;
var __dshPreset=__dshSnapshot.preset;
function __dshScriptButtons(value){var result=[],seen=new Set();for(var button of Array.isArray(value)?value:[]){if(!button||typeof button!=='object')continue;var name=String(button.name??'').trim();if(!name||name.length>200||seen.has(name))continue;seen.add(name);result.push({name:name,visible:button.visible!==false});if(result.length>=50)break}return result}
var __dshCurrentScriptButtons=__dshScriptButtons(__dshScopes.script?.__dsh_script_buttons??__dshSnapshot.buttons);
var __dshCurrentScriptInfo=typeof __dshScopes.script?.__dsh_script_info==='string'?__dshScopes.script.__dsh_script_info:__dshSnapshot.scriptInfo;
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
function __dshWorldbookMutation(request){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('worldbook-mutate',{requestId:requestId,request:__dshClone(request)})})}
function __dshChatMutation(request){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('chat-mutate',{requestId:requestId,request:__dshClone(request)})})}
function __dshPresetMutation(value){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject,preset:value});__dshPost('preset-replace',{requestId:requestId,preset:__dshClone(value)})})}
var __dshScriptMetadataScheduled=false;
function __dshPersistScriptMetadata(){if(__dshScriptMetadataScheduled)return;__dshScriptMetadataScheduled=true;queueMicrotask(function(){__dshScriptMetadataScheduled=false;var variables=__dshClone(__dshScopes.script??{});variables.__dsh_script_buttons=__dshClone(__dshCurrentScriptButtons);variables.__dsh_script_info=__dshCurrentScriptInfo;void __dshReplace(variables,{type:'script'}).catch(function(error){__dshPost('runtime-error',{value:String(error)})})})}
function __dshReportScriptButtons(){__dshPost('script-buttons',{buttons:__dshClone(__dshCurrentScriptButtons)})}
function __dshWorldbookName(value){var name=String(value??'').trim();if(!name)throw new Error('世界书名称不能为空');return name}
function __dshWorldbookEntries(entries){entries=Array.isArray(entries)?entries:[];var used=new Set();return entries.map(function(value,index){var entry=value&&typeof value==='object'?value:{};var uid=Number.isSafeInteger(entry.uid)&&entry.uid>=0&&entry.uid<1000000?entry.uid:index%1000000;while(used.has(uid))uid=(uid+1)%1000000;used.add(uid);var strategy=entry.strategy&&typeof entry.strategy==='object'?entry.strategy:{};var secondary=strategy.keys_secondary&&typeof strategy.keys_secondary==='object'?strategy.keys_secondary:{};var position=entry.position&&typeof entry.position==='object'?entry.position:{};var recursion=entry.recursion&&typeof entry.recursion==='object'?entry.recursion:{};var effect=entry.effect&&typeof entry.effect==='object'?entry.effect:{};var key=function(item){return item instanceof RegExp?item.toString():String(item)};return {uid:uid,name:String(entry.name??''),enabled:entry.enabled!==false,strategy:{type:['constant','selective','vectorized'].includes(strategy.type)?strategy.type:'constant',keys:Array.isArray(strategy.keys)?strategy.keys.map(key):[],keys_secondary:{logic:['and_any','and_all','not_all','not_any'].includes(secondary.logic)?secondary.logic:'and_any',keys:Array.isArray(secondary.keys)?secondary.keys.map(key):[]},scan_depth:strategy.scan_depth==='same_as_global'?'same_as_global':Number.isFinite(strategy.scan_depth)?Math.max(0,strategy.scan_depth):'same_as_global'},position:{type:['before_character_definition','after_character_definition','before_example_messages','after_example_messages','before_author_note','after_author_note','at_depth','outlet'].includes(position.type)?position.type:'at_depth',role:['system','assistant','user'].includes(position.role)?position.role:'system',depth:Number.isFinite(position.depth)?position.depth:4,order:Number.isFinite(position.order)?position.order:100},content:String(entry.content??''),probability:Number.isFinite(entry.probability)?Math.min(100,Math.max(0,entry.probability)):100,recursion:{prevent_incoming:recursion.prevent_incoming===true,prevent_outgoing:recursion.prevent_outgoing===true,delay_until:Number.isFinite(recursion.delay_until)&&recursion.delay_until>0?recursion.delay_until:null},effect:{sticky:Number.isFinite(effect.sticky)&&effect.sticky>0?effect.sticky:null,cooldown:Number.isFinite(effect.cooldown)&&effect.cooldown>0?effect.cooldown:null,delay:Number.isFinite(effect.delay)&&effect.delay>0?effect.delay:null},...(entry.extra&&typeof entry.extra==='object'?{extra:__dshClone(entry.extra)}:{}),...(entry.ignoreBudget===true?{ignoreBudget:true}:{})}})}
window.getWorldbookNames=function(){return Object.keys(__dshWorldbooks)};
window.getGlobalWorldbookNames=function(){return __dshClone(__dshWorldbookBindings.global)};
window.rebindGlobalWorldbooks=function(names){names=Array.from(new Set((Array.isArray(names)?names:[]).map(__dshWorldbookName)));return __dshWorldbookMutation({format:0,operation:'bind-global-worldbooks',names:names}).then(function(){__dshWorldbookBindings.global=names})};
window.getCharWorldbookNames=function(name){if(name!=='current')throw new Error('当前仅支持查询当前角色卡');return __dshClone(__dshWorldbookBindings.character)};
window.rebindCharWorldbooks=function(name,bindings){if(name!=='current')return Promise.reject(new Error('当前仅支持绑定当前角色卡'));bindings=bindings??{};var primary=bindings.primary==null?null:__dshWorldbookName(bindings.primary);var additional=Array.from(new Set((Array.isArray(bindings.additional)?bindings.additional:[]).map(__dshWorldbookName)));return __dshWorldbookMutation({format:0,operation:'bind-character-worldbooks',primary:primary,additional:additional}).then(function(){__dshWorldbookBindings.character={primary:primary,additional:additional}})};
window.getChatWorldbookName=function(name){if(name!=='current')throw new Error('当前仅支持查询当前聊天');return __dshWorldbookBindings.chat};
window.rebindChatWorldbook=function(name,worldbook){if(name!=='current')return Promise.reject(new Error('当前仅支持绑定当前聊天'));var value=worldbook==null?null:__dshWorldbookName(worldbook);return __dshWorldbookMutation({format:0,operation:'bind-chat-worldbook',name:value}).then(function(){__dshWorldbookBindings.chat=value})};
window.getWorldbook=function(name){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.reject(new Error("未能找到世界书 '"+name+"'"));return Promise.resolve(__dshClone(__dshWorldbooks[name]))};
window.createWorldbook=function(name,entries){name=__dshWorldbookName(name);if(Object.hasOwn(__dshWorldbooks,name))return Promise.resolve(false);var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next;return true})};
window.createOrReplaceWorldbook=function(name,entries){name=__dshWorldbookName(name);var created=!Object.hasOwn(__dshWorldbooks,name);var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next;return created})};
window.replaceWorldbook=function(name,entries){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.reject(new Error("未能找到世界书 '"+name+"'"));var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next})};
window.deleteWorldbook=function(name){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.resolve(false);return __dshWorldbookMutation({format:0,operation:'delete-worldbook',name:name}).then(function(){delete __dshWorldbooks[name];return true})};
window.updateWorldbookWith=function(name,updater){return window.getWorldbook(name).then(updater).then(function(entries){return window.replaceWorldbook(name,entries)}).then(function(){return window.getWorldbook(name)})};
window.createWorldbookEntries=function(name,entries){var added;return window.updateWorldbookWith(name,function(current){added=__dshWorldbookEntries(entries).map(function(entry,index){return {...entry,uid:current.length+index}});return current.concat(added)}).then(function(worldbook){return {worldbook:worldbook,new_entries:worldbook.slice(-added.length)}})};
window.deleteWorldbookEntries=function(name,predicate){var removed=[];return window.updateWorldbookWith(name,function(current){return current.filter(function(entry){if(predicate(entry)){removed.push(entry);return false}return true})}).then(function(worldbook){return {worldbook:worldbook,deleted_entries:removed}})};
window.getOrCreateChatWorldbook=function(chatName,worldbookName){if(chatName!=='current')return Promise.reject(new Error('当前仅支持当前聊天'));if(__dshWorldbookBindings.chat&&Object.hasOwn(__dshWorldbooks,__dshWorldbookBindings.chat))return Promise.resolve(__dshWorldbookBindings.chat);var name=worldbookName?__dshWorldbookName(worldbookName):'聊天世界书-'+Date.now();return window.createWorldbook(name).then(function(){return window.rebindChatWorldbook('current',name)}).then(function(){return name})};
window.getLorebooks=window.getWorldbookNames;window.deleteLorebook=window.deleteWorldbook;window.createLorebook=window.createWorldbook;window.getCharLorebooks=function(){return window.getCharWorldbookNames('current')};window.getCurrentCharPrimaryLorebook=function(){return window.getCharWorldbookNames('current').primary};window.setCurrentCharLorebooks=function(value){return window.rebindCharWorldbooks('current',{...window.getCharWorldbookNames('current'),...value})};window.getChatLorebook=function(){return window.getChatWorldbookName('current')};window.setChatLorebook=function(value){return window.rebindChatWorldbook('current',value)};window.getOrCreateChatLorebook=function(name){return window.getOrCreateChatWorldbook('current',name)};
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
window.getScriptInfo=function(){return __dshCurrentScriptInfo};
window.replaceScriptInfo=function(info){__dshCurrentScriptInfo=String(info??'').slice(0,8000);__dshPersistScriptMetadata()};
window.getScriptButtons=function(){return __dshClone(__dshCurrentScriptButtons)};
window.replaceScriptButtons=function(buttons){__dshCurrentScriptButtons=__dshScriptButtons(buttons);__dshReportScriptButtons();__dshPersistScriptMetadata()};
window.updateScriptButtonsWith=function(updater){var next=updater(window.getScriptButtons());if(next&&typeof next.then==='function')return next.then(function(value){window.replaceScriptButtons(value);return window.getScriptButtons()});window.replaceScriptButtons(next);return window.getScriptButtons()};
window.getCurrentCharId=function(){return __dshSnapshot.characterId};
window.getCurrentCharacterId=window.getCurrentCharId;
window.getCurrentCharacterName=function(){return __dshSnapshot.characterName};
window.getCurrentChatId=function(){return __dshSnapshot.chatId};
function __dshPresetName(name){if(name!=='in_use')throw new Error("当前仅支持正在使用的预设 'in_use'");if(!__dshPreset)throw new Error('当前会话没有预设');return name}
window.getPresetNames=function(){return __dshPreset?['in_use']:[]};
window.getLoadedPresetName=function(){return __dshPreset?.name??''};
window.getPreset=function(name){__dshPresetName(name);return __dshClone(__dshPreset.value)};
window.replacePreset=function(name,value){__dshPresetName(name);if(!__dshPlain(value))return Promise.reject(new Error('预设必须是对象'));var next=__dshClone(value);return __dshPresetMutation(next).then(function(){__dshPreset={name:__dshPreset.name,revision:__dshPreset.revision+1,value:next}})};
window.updatePresetWith=function(name,updater,option){var current=window.getPreset(name);return Promise.resolve(updater(current)).then(function(next){return window.replacePreset(name,next,option).then(function(){return window.getPreset(name)})})};
window.setPreset=function(name,value,option){if(value!==undefined&&!__dshPlain(value))return Promise.reject(new Error('预设修改必须是对象'));return window.updatePresetWith(name,function(current){return __dshMerge({},current,value??{})},option)};
window.isPresetSystemPrompt=function(prompt){return ['main','nsfw','jailbreak','enhanceDefinitions'].includes(String(prompt?.id??''))};
window.isPresetPlaceholderPrompt=function(prompt){return ['worldInfoBefore','personaDescription','charDescription','charPersonality','scenario','worldInfoAfter','dialogueExamples','chatHistory'].includes(String(prompt?.id??''))};
window.isPresetNormalPrompt=function(prompt){return !window.isPresetSystemPrompt(prompt)&&!window.isPresetPlaceholderPrompt(prompt)};
function __dshPresetRegexOption(option){if(!__dshPlain(option)||option.type!=='preset'||(option.name!==undefined&&option.name!=='in_use'))throw new Error("当前仅支持正在使用的预设正则 { type: 'preset', name: 'in_use' }");__dshPresetName('in_use')}
function __dshPresetRegexes(){var extensions=__dshPreset?.value?.extensions;return Array.isArray(extensions?.regex_scripts)?extensions.regex_scripts:[]}
function __dshFixedPresetRegex(regex){var value=__dshClone(regex??{});delete value.enabled;delete value.disabled;delete value.min_depth;delete value.max_depth;return JSON.stringify(value)}
window.getTavernRegexes=function(option){__dshPresetRegexOption(option);return __dshClone(__dshPresetRegexes())};
window.replaceTavernRegexes=function(regexes,option){try{__dshPresetRegexOption(option);if(!Array.isArray(regexes))throw new Error('预设正则必须是数组');var current=__dshPresetRegexes();if(regexes.length!==current.length)throw new Error('当前仅支持修改已有预设正则，暂不支持新增或删除');for(var index=0;index<current.length;index++){if(String(regexes[index]?.id??'')!==String(current[index]?.id??'')||__dshFixedPresetRegex(regexes[index])!==__dshFixedPresetRegex(current[index]))throw new Error('当前仅支持修改预设正则的启用状态和深度')}var next=__dshClone(__dshPreset.value);if(!__dshPlain(next.extensions))next.extensions={};next.extensions.regex_scripts=__dshClone(regexes);return __dshPresetMutation(next).then(function(){__dshPreset={name:__dshPreset.name,revision:__dshPreset.revision+1,value:next};return window.eventEmit(window.tavern_events.CHAT_CHANGED,__dshSnapshot.chatId)})}catch(error){return Promise.reject(error)}};
window.updateTavernRegexesWith=function(updater,option){var current=window.getTavernRegexes(option);return Promise.resolve(updater(current)).then(function(next){return window.replaceTavernRegexes(next,option).then(function(){return window.getTavernRegexes(option)})})};
window.appendInexistentScriptButtons=function(buttons){var current=window.getScriptButtons();var names=new Set(current.map(function(button){return button.name}));window.replaceScriptButtons(current.concat(__dshScriptButtons(buttons).filter(function(button){return !names.has(button.name)})))};
window.getButtonEvent=function(name){return __dshSnapshot.scriptId+'_'+String(name)};
window.getLastMessageId=function(){return Math.max(-1,__dshMessages.length-1)};
window.getCurrentMessageId=window.getLastMessageId;
function __dshMessageId(value){if(__dshMessages.length===0)return;var id=Number(String(value).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1)));if(!Number.isInteger(id))return;if(id<0)id=__dshMessages.length+id;if(id<0||id>=__dshMessages.length)return;return id}
function __dshMessageRange(range){if(__dshMessages.length===0)return [];var source=String(range??('0-'+(__dshMessages.length-1))).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1));var match=source.match(/^(-?\\d+)(?:-(-?\\d+))?$/);if(!match)return [];var left=__dshMessageId(match[1]);var right=__dshMessageId(match[2]??match[1]);if(left===undefined||right===undefined)return [];var start=Math.min(left,right),end=Math.max(left,right);return __dshMessages.slice(start,end+1)}
function __dshMessageBoundary(value){if(value==='end')return __dshMessages.length;var id=Number(String(value).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1)));if(!Number.isInteger(id))return __dshMessages.length;if(id<0)id=__dshMessages.length+id+1;return Math.min(__dshMessages.length,Math.max(0,id))}
function __dshReindexMessages(){__dshMessages=__dshMessages.map(function(message,messageId){return Object.assign({},message,{messageId:messageId})})}
function __dshMessageSignature(messages){return JSON.stringify((messages??[]).map(function(message){return [message.seq,message.role,message.text]}))}
function __dshSyncSillyTavernChat(){if(!window.SillyTavern)return;window.SillyTavern.chat=__dshMessages.map(function(message){return {name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,is_user:message.role==='user',is_system:false,mes:message.text,swipe_id:0,swipes:[message.text],variables:[message.data??{}],swipe_info:[message.extra??{}],extra:message.extra??{}}})}
function __dshDisplayedMessageId(value){if(__dshMessages.length===0)throw new Error('未找到任何消息楼层');if(value===undefined||value==='last')return __dshMessages.length-1;if(value==='last_user'||value==='last_char'){var role=value==='last_user'?'user':'assistant';for(var index=__dshMessages.length-1;index>=0;index--)if(__dshMessages[index]?.role===role)return index;throw new Error(value==='last_user'?'未找到任何 user 消息楼层':'未找到任何 char 消息楼层')}var id=__dshMessageId(value);if(id===undefined)throw new Error('提供的 message_id 不在当前聊天楼层范围内: '+String(value));return id}
function __dshDisplayMacros(value,messageId,transform){transform=transform??function(item){return item};return String(value).replace(/\\{\\{char\\}\\}|<char>|<bot>/giu,transform(__dshSnapshot.characterName)).replace(/\\{\\{user\\}\\}|<user>/giu,transform(__dshSnapshot.userName??'用户')).replace(/\\{\\{lastMessageId\\}\\}/giu,String(__dshMessages.length-1)).replace(/\\{\\{messageId\\}\\}/giu,String(messageId))}
function __dshDisplayRegex(value){try{var literal=String(value).match(/^\\/([\\s\\S]*)\\/([a-z]*)$/iu);return literal===null?new RegExp(String(value)):new RegExp(literal[1]??'',literal[2]??'')}catch(error){return}}
function __dshEscapeDisplayRegex(value){return String(value).replace(/[\\n\\r\\t\\v\\f\\0.^$*+?{}[\\]\\\\/|()]/gu,function(character){if(character==='\\n')return '\\\\n';if(character==='\\r')return '\\\\r';if(character==='\\t')return '\\\\t';if(character==='\\v')return '\\\\v';if(character==='\\f')return '\\\\f';if(character==='\\0')return '\\\\0';return '\\\\'+character})}
function __dshDisplayReplace(raw,script,messageId){var mode=Number(script.substituteRegex);var findSource=mode===1?__dshDisplayMacros(script.findRegex,messageId):mode===2?__dshDisplayMacros(script.findRegex,messageId,__dshEscapeDisplayRegex):script.findRegex;var find=__dshDisplayRegex(findSource);if(!find||!script.findRegex||!raw)return raw;return raw.replace(find,function(){var args=Array.from(arguments);var groups=typeof args.at(-1)==='object'&&args.at(-1)!==null?args.at(-1):undefined;var replacement=String(script.replaceString??'').replace(/\\{\\{match\\}\\}/giu,'$0').replace(/\\$(\\d+)|\\$<([^>]+)>/gu,function(token,numeric,named){var match=numeric===undefined?groups?.[named??'']:args[Number(numeric)];if(typeof match!=='string')return '';return (script.trimStrings??[]).reduce(function(text,trim){return text.replaceAll(__dshDisplayMacros(trim,messageId),'')},match)});return __dshDisplayMacros(replacement,messageId)})}
window.formatAsTavernRegexedString=function(text,source,destination,option){if(!['user_input','ai_output','slash_command','world_info','reasoning'].includes(source))throw new Error('不支持的预设正则来源: '+String(source));if(destination!=='display'&&destination!=='prompt')throw new Error('不支持的预设正则目标: '+String(destination));option=option??{};if(option.character_name!==undefined&&option.character_name!==__dshSnapshot.characterName)throw new Error('当前仅支持使用当前角色名格式化预设正则');var depth=typeof option.depth==='number'&&Number.isFinite(option.depth)?option.depth:undefined;var messageId=depth===undefined?Math.max(0,__dshMessages.length-1):Math.max(0,__dshMessages.length-depth-1);var value=String(text??'');for(var regex of __dshPresetRegexes()){if(regex.enabled===false||regex.source?.[source]!==true||regex.destination?.[destination]!==true)continue;if(depth!==undefined&&regex.min_depth!==null&&regex.min_depth>=-1&&depth<regex.min_depth)continue;if(depth!==undefined&&regex.max_depth!==null&&regex.max_depth>=0&&depth>regex.max_depth)continue;value=__dshDisplayReplace(value,{findRegex:regex.find_regex,replaceString:regex.replace_string,trimStrings:regex.trim_strings,substituteRegex:0},messageId)}return __dshDisplayMacros(value,messageId)};
function __dshDisplayedSource(text,messageId){var message=__dshMessages[messageId];var placement=message?.role==='user'?1:2;var depth=Math.max(0,__dshMessages.length-messageId-1);var value=__dshDisplayMacros(text,messageId);for(var script of __dshDisplayRegexScripts??[]){if(script.disabled||!script.markdownOnly||!Array.isArray(script.placement)||!script.placement.includes(placement))continue;if(script.minDepth!==null&&script.minDepth>=-1&&depth<script.minDepth)continue;if(script.maxDepth!==null&&script.maxDepth>=0&&depth>script.maxDepth)continue;value=__dshDisplayReplace(value,script,messageId)}return value}
function __dshDisplayedHtml(text,messageId){var value=__dshDisplayedSource(text,messageId);var marker=String.fromCharCode(96).repeat(3);var trimmed=value.trim();if(trimmed.slice(0,marker.length+4).toLowerCase()===marker+'html'&&trimmed.endsWith(marker)){var newline=trimmed.indexOf('\\n');return newline<0?'':trimmed.slice(newline+1,-marker.length).trim()}if(/<\\/?[A-Za-z][^>]*>/u.test(value))return value;var html=value.replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;').replace(/"/gu,'&quot;').replace(/'/gu,'&#39;');html=html.replace(/\\*\\*([^*\\n]+)\\*\\*/gu,'<strong>$1</strong>').replace(/\\*([^*\\n]+)\\*/gu,'<em>$1</em>');return html.split(/\\n{2,}/u).map(function(paragraph){return '<p>'+paragraph.replace(/\\n/gu,'<br>')+'</p>'}).join('')}
window.getChatMessages=function(range,option){option=option??{};return __dshClone(__dshMessageRange(range).flatMap(function(message){if(option.role&&option.role!=='all'&&option.role!==message.role)return [];if(option.hide_state==='hidden')return [];if(option.include_swipes)return [{message_id:message.messageId,name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,role:message.role,is_hidden:false,swipe_id:0,swipes:[message.text],swipes_data:[message.data??{}],swipes_info:[message.extra??{}]}];return [{message_id:message.messageId,name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,role:message.role,is_hidden:false,message:message.text,data:message.data??{},extra:message.extra??{},swipe_id:0,swipes:[message.text],swipes_data:[message.data??{}]}]}))};
window.setChatMessages=function(messages){messages=(Array.isArray(messages)?messages:[]).flatMap(function(message){var messageId=__dshMessageId(message?.message_id);return messageId===undefined?[]:[Object.assign({},__dshClone(message),{message_id:messageId})]});if(messages.length===0)return Promise.resolve();return __dshChatMutation({format:0,operation:'set-chat-messages',messages:messages}).then(function(){for(var update of messages){var current=__dshMessages[update.message_id];if(!current)continue;var swipeId=update.swipe_id??0;var text=update.message??update.swipes?.[swipeId]??current.text;var data=update.data??update.swipes_data?.[swipeId]??current.data;var extra=update.extra??update.swipes_info?.[swipeId]??current.extra;__dshMessages[update.message_id]=Object.assign({},current,{role:update.role??current.role,text:text,data:data??{},extra:extra??{}})}__dshSyncSillyTavernChat();return Promise.all(messages.map(function(message){return window.eventEmit(window.tavern_events.MESSAGE_UPDATED,message.message_id)}))})};
window.createChatMessages=function(messages,option){messages=Array.isArray(messages)?__dshClone(messages):[];if(messages.length===0)return Promise.resolve();option=option??{};var insertAt=__dshMessageBoundary(option.insert_at??option.insert_before??'end');return __dshChatMutation({format:0,operation:'create-chat-messages',messages:messages,insertAt:insertAt}).then(function(){var created=messages.map(function(message){return {messageId:0,role:message.role,text:String(message.message??''),data:message.data??{},extra:message.extra??{}}});__dshMessages.splice(insertAt,0,...created);__dshReindexMessages();__dshSyncSillyTavernChat();return Promise.all(created.map(function(message,index){var id=insertAt+index;return window.eventEmit(message.role==='user'?window.tavern_events.MESSAGE_SENT:window.tavern_events.MESSAGE_RECEIVED,id,'extension')}))})};
window.deleteChatMessages=function(messageIds){messageIds=Array.from(new Set((Array.isArray(messageIds)?messageIds:[]).flatMap(function(value){var id=__dshMessageId(value);return id===undefined?[]:[id]}))).sort(function(a,b){return a-b});if(messageIds.length===0)return Promise.resolve();return __dshChatMutation({format:0,operation:'delete-chat-messages',messageIds:messageIds}).then(function(){for(var id of [...messageIds].reverse())__dshMessages.splice(id,1);__dshReindexMessages();__dshSyncSillyTavernChat();return Promise.all(messageIds.map(function(id){return window.eventEmit(window.tavern_events.MESSAGE_DELETED,id)}))})};
window.rotateChatMessages=function(begin,middle,end){begin=__dshMessageBoundary(begin);middle=__dshMessageBoundary(middle);end=__dshMessageBoundary(end);middle=Math.min(end,Math.max(begin,middle));if(begin===middle||middle===end)return Promise.resolve();return __dshChatMutation({format:0,operation:'rotate-chat-messages',begin:begin,middle:middle,end:end}).then(function(){var right=__dshMessages.splice(middle,end-middle);__dshMessages.splice(begin,0,...right);__dshReindexMessages();__dshSyncSillyTavernChat();return window.eventEmit(window.tavern_events.CHAT_CHANGED,'dsh-agent-rp')})};
function __dshGenerate(mode,config){var requestId=String(++__dshRequest);var value=__dshClone(config??{});void __dshEmitLocal(window.iframe_events.GENERATION_STARTED,[]);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject,generation:value.should_stream===true});__dshPost('generate',{requestId:requestId,mode:mode,config:value})})}
window.generate=function(config){return __dshGenerate('preset',config)};
window.generateRaw=function(config){return __dshGenerate('raw',config)};
window.getModelList=function(config){if(!__dshPlain(config)||typeof config.apiurl!=='string'||config.apiurl.trim()==='')return Promise.reject(new Error('API 地址不能为空'));if(config.key!==undefined&&typeof config.key!=='string')return Promise.reject(new Error('API 密钥必须是文本'));var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('model-list',{requestId:requestId,apiurl:config.apiurl,key:config.key})})};
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
window.SillyTavern={chat:[],name1:__dshSnapshot.userName??'用户',name2:__dshSnapshot.characterName,characterId:__dshSnapshot.characterId,chatId:__dshSnapshot.chatId,chatMetadata:__dshScopes.chat,extensionSettings:{},getCurrentCharacterId:window.getCurrentCharId,getCurrentChatId:window.getCurrentChatId,eventSource:{on:window.eventOn,once:window.eventOnce,emit:window.eventEmit,emitAndWait:window.eventEmitAndWait,removeListener:window.eventRemoveListener},eventTypes:window.tavern_events,getContext:function(){return this}};
window.getContext=function(){return window.SillyTavern.getContext()};
__dshSyncSillyTavernChat();
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
Object.defineProperty(Mini.prototype,'length',{get:function(){return this.items.length}});
Mini.prototype.empty=function(){return this.each(function(){this.replaceChildren?.()})};
var __dshDisplayedRoots=new Map();
var __dshDisplayedScheduled=new Set();
function __dshReportDisplayed(messageId,root){if(__dshDisplayedScheduled.has(messageId))return;__dshDisplayedScheduled.add(messageId);queueMicrotask(function(){__dshDisplayedScheduled.delete(messageId);if(__dshDisplayedRoots.get(messageId)!==root)return;__dshPost('display-override',{messageId:messageId,value:root.outerHTML})})}
function __dshDisplayedRoot(messageId){var existing=__dshDisplayedRoots.get(messageId);if(existing)return existing;var root=document.createElement('div');root.className='mes_text';root.dataset.dshMessageId=String(messageId);root.innerHTML=__dshDisplayedHtml(__dshMessages[messageId]?.text??'',messageId);__dshFrameHost.appendChild(root);new MutationObserver(function(){__dshReportDisplayed(messageId,root)}).observe(root,{attributes:true,characterData:true,childList:true,subtree:true});__dshDisplayedRoots.set(messageId,root);return root}
window.formatAsDisplayedMessage=function(text,option){var messageId=__dshDisplayedMessageId(option?.message_id);return __dshDisplayedHtml(String(text??''),messageId)};
window.retrieveDisplayedMessage=function(messageId){messageId=__dshDisplayedMessageId(messageId);var result=new Mini(__dshDisplayedRoot(messageId));result.__dshMessageId=messageId;return result};
window.refreshOneMessage=function(messageId,target){var sourceId=__dshDisplayedMessageId(messageId);var targetId=Number.isInteger(target?.__dshMessageId)?target.__dshMessageId:sourceId;var root=__dshDisplayedRoot(targetId);root.innerHTML=__dshDisplayedHtml(__dshMessages[sourceId]?.text??'',sourceId);__dshReportDisplayed(targetId,root);var eventType=__dshMessages[sourceId]?.role==='user'?window.tavern_events.USER_MESSAGE_RENDERED:window.tavern_events.CHARACTER_MESSAGE_RENDERED;return window.eventEmit(eventType,sourceId).then(function(){})};
window.toastr={info:console.info,success:console.info,warning:console.warn,error:console.error};
  addEventListener('message',function(event){if(event.source!==parent||!event.data||event.data.source!=='dsh-agent-rp-host')return;var message=event.data;if(message.action==='script-buttons-request'){__dshReportScriptButtons();return}if(message.action==='variables-result'||message.action==='preset-result'||message.action==='model-list-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);message.ok?pending.resolve(message.action==='model-list-result'?message.value:undefined):pending.reject(new Error(String(message.error??'保存失败')));return}if(message.action==='generation-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);if(message.ok){var text=String(message.value??'');if(pending.generation){void __dshEmitLocal(window.iframe_events.STREAM_TOKEN_RECEIVED_FULLY,[text]);void __dshEmitLocal(window.iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY,[text])}void __dshEmitLocal(window.iframe_events.GENERATION_ENDED,[text]);pending.resolve(text)}else pending.reject(new Error(String(message.error??'生成失败')));return}if(message.action==='preset-sync'){__dshPreset=message.preset;return}if(message.action==='variables-sync'){var transcriptChanged=__dshMessageSignature(__dshMessages)!==__dshMessageSignature(message.messages);__dshScopes=message.scopes;__dshMessages=message.messages;__dshDisplayRegexScripts=message.displayRegexScripts??__dshDisplayRegexScripts;__dshWorldbooks=message.worldbooks;__dshWorldbookBindings=message.worldbookBindings;if(message.preset!==undefined)__dshPreset=message.preset;if(transcriptChanged){for(var root of __dshDisplayedRoots.values())root.remove();__dshDisplayedRoots.clear()}__dshSyncSillyTavernChat();return}if(message.action==='event'){var args=message.args??[];var before=message.eventType==='mag_variable_update_ended'?JSON.stringify(args[0]??{}):undefined;void __dshEmitLocal(message.eventType,args).then(function(){if(before!==undefined&&JSON.stringify(args[0]??{})!==before)return __dshReplace(args[0]??{},{type:'message'})}).catch(function(error){console.error(error);__dshPost('runtime-error',{value:String(error)})})}});
addEventListener('error',function(event){__dshPost('runtime-error',{value:event.message})});
addEventListener('unhandledrejection',function(event){__dshPost('runtime-error',{value:String(event.reason)})});
__dshReportScriptButtons();
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
