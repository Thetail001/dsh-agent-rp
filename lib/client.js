window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/tavern-generation-protocol.ts
		/** Browser-safe request and response values for isolated Tavern Helper generation. */
		/** Same-origin endpoint used by approved Tavern Helper scripts. */
		const TAVERN_GENERATION_PATH = "/api/dsh-agent-rp/tavern/generate";
		/** Same-origin endpoint used to query one user-approved OpenAI-compatible API. */
		const TAVERN_MODEL_LIST_PATH = "/api/dsh-agent-rp/tavern/models";
		//#endregion
		//#region src/client/tavern-runtime.ts
		const remoteCache = /* @__PURE__ */ new Map();
		/** Script origins trusted by the built-in jsDelivr bundle resolver. */
		const BUILT_IN_TAVERN_SCRIPT_ORIGINS = ["https://cdn.jsdelivr.net", "https://testingcf.jsdelivr.net"];
		const allowedScriptOrigins = new Set(BUILT_IN_TAVERN_SCRIPT_ORIGINS);
		const importLine = /^\s*import\s+(['"])(https:\/\/[^'"\s]+)\1\s*;?\s*$/gmu;
		async function remoteSource(url, signal) {
			const parsed = new URL(url);
			if (!allowedScriptOrigins.has(parsed.origin)) throw new Error(`远程脚本来源未开放：${parsed.origin}`);
			const cached = remoteCache.get(parsed.href);
			if (cached !== void 0) return cached;
			const loading = fetch(parsed.href, {
				cache: "force-cache",
				credentials: "omit",
				headers: { accept: "text/javascript, application/javascript, text/plain" },
				referrerPolicy: "no-referrer",
				signal
			}).then(async (response) => {
				if (!response.ok) throw new Error(`远程脚本读取失败（${response.status}）`);
				const length = Number(response.headers.get("content-length") ?? 0);
				if (Number.isFinite(length) && length > 2 * 1024 * 1024) throw new Error("远程脚本超过 2 MiB");
				const source = await response.text();
				if (new TextEncoder().encode(source).byteLength > 2 * 1024 * 1024) throw new Error("远程脚本超过 2 MiB");
				return source;
			});
			remoteCache.set(parsed.href, loading);
			try {
				return await loading;
			} catch (error) {
				remoteCache.delete(parsed.href);
				throw error;
			}
		}
		/** Resolve the common card form consisting of side-effect imports from jsDelivr bundles. */
		async function resolveTavernScriptSource(content, signal) {
			const urls = [...content.matchAll(importLine)].map((match) => match[2]);
			const local = content.replace(importLine, "").trim();
			if (urls.length === 0) return content;
			const sources = await Promise.all(urls.map((url) => remoteSource(url, signal)));
			if (sources.reduce((size, source) => size + new TextEncoder().encode(source).byteLength, 0) > 4 * 1024 * 1024) throw new Error("远程脚本合计超过 4 MiB");
			return [...sources, local].filter(Boolean).join("\n;\n");
		}
		function safeJson(value) {
			return JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
		}
		function runtimeSource(snapshot) {
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
`;
		}
		/** Create a network-isolated script document from already-resolved JavaScript. */
		function tavernScriptFrameSource(script, source, snapshot) {
			const encoded = safeJson(`${source}\n//# sourceURL=dsh-agent-rp:${script.id}`);
			return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${snapshot.approvedScriptOrigins.map((origin) => new URL(origin).origin).join(" ")}; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'; font-src 'none'; frame-src 'none'"><style>html,body{background:transparent;color-scheme:dark}</style></head><body><script>${runtimeSource(snapshot)}\ntry{Function('localStorage','sessionStorage',${encoded})(__dshLocalStorage,__dshSessionStorage)}catch(error){console.error(error);parent.postMessage({source:'dsh-agent-rp-tavern-script',scriptId:${safeJson(script.id)},action:'runtime-error',value:String(error)},'*')}<\/script></body></html>`;
		}
		//#endregion
		//#region src/preset-export.ts
		function prompt(prompt) {
			return {
				identifier: prompt.identifier,
				name: prompt.name,
				role: prompt.role,
				content: prompt.content,
				marker: prompt.marker,
				system_prompt: prompt.systemPrompt,
				forbid_overrides: prompt.forbidOverrides,
				...prompt.injectionPosition === void 0 ? {} : { injection_position: prompt.injectionPosition },
				...prompt.injectionDepth === void 0 ? {} : { injection_depth: prompt.injectionDepth },
				...prompt.injectionOrder === void 0 ? {} : { injection_order: prompt.injectionOrder }
			};
		}
		function regex(script) {
			return {
				...script.id === void 0 ? {} : { id: script.id },
				scriptName: script.scriptName,
				findRegex: script.findRegex,
				replaceString: script.replaceString,
				trimStrings: [...script.trimStrings],
				placement: [...script.placement],
				disabled: script.disabled,
				markdownOnly: script.markdownOnly,
				promptOnly: script.promptOnly,
				runOnEdit: script.runOnEdit,
				substituteRegex: script.substituteRegex,
				minDepth: script.minDepth,
				maxDepth: script.maxDepth
			};
		}
		function helperScript(script) {
			return {
				type: "script",
				id: script.id,
				name: script.name,
				content: script.content,
				info: script.info,
				enabled: script.enabled,
				button: {
					enabled: script.buttonEnabled,
					buttons: script.buttons.map((button) => ({ ...button }))
				},
				data: structuredClone(script.data)
			};
		}
		/** Serialize the supported current configuration as a new SillyTavern preset JSON file. */
		function exportSillyTavernPresetJson(preset) {
			const generation = preset.generation;
			const helperScripts = preset.tavernHelperScripts ?? [];
			const helperVariables = preset.tavernHelperVariables ?? {};
			const hasHelper = helperScripts.length > 0 || Object.keys(helperVariables).length > 0;
			return `${JSON.stringify({
				prompts: preset.prompts.map(prompt),
				prompt_order: [{
					character_id: 100001,
					order: preset.order.map((entry) => ({ ...entry }))
				}],
				...generation.temperature === void 0 ? {} : { temperature: generation.temperature },
				...generation.maxTokens === void 0 ? {} : { openai_max_tokens: generation.maxTokens },
				...generation.reasoningEffort === void 0 ? {} : { reasoning_effort: generation.reasoningEffort },
				...generation.topP === void 0 ? {} : { top_p: generation.topP },
				...generation.topK === void 0 ? {} : { top_k: generation.topK },
				...generation.topA === void 0 ? {} : { top_a: generation.topA },
				...generation.minP === void 0 ? {} : { min_p: generation.minP },
				...generation.frequencyPenalty === void 0 ? {} : { frequency_penalty: generation.frequencyPenalty },
				...generation.presencePenalty === void 0 ? {} : { presence_penalty: generation.presencePenalty },
				...generation.repetitionPenalty === void 0 ? {} : { repetition_penalty: generation.repetitionPenalty },
				wi_format: preset.formats.worldInfo,
				scenario_format: preset.formats.scenario,
				personality_format: preset.formats.personality,
				extensions: {
					regex_scripts: preset.regexScripts.map(regex),
					...hasHelper ? { tavern_helper: {
						scripts: helperScripts.map(helperScript),
						variables: structuredClone(helperVariables)
					} } : {}
				}
			}, null, 2)}\n`;
		}
		//#endregion
		//#region src/preset-sections.ts
		const separatorRun = /[-—_=─]{4,}/u;
		const edgeSeparators = /^[-—_=─\s]+|[-—_=─\s]+$/gu;
		/** Returns the display title when a prompt name acts as an author-defined section divider. */
		function presetDividerTitle(name) {
			if (!separatorRun.test(name)) return void 0;
			const title = name.replace(edgeSeparators, "").trim();
			return title === "" ? "未命名分组" : title;
		}
		/** Projects the flat SillyTavern prompt order into collapsible presentation groups. */
		function projectPresetPromptSections(prompts) {
			const grouped = [];
			let current = {
				key: "base",
				title: "基础提示",
				kind: "base",
				prompts: []
			};
			grouped.push(current);
			for (const prompt of prompts) {
				if (!prompt.attached || prompt.imported === false) continue;
				const dividerTitle = presetDividerTitle(prompt.name);
				if (dividerTitle !== void 0) {
					current = {
						key: `section:${prompt.identifier}`,
						title: dividerTitle,
						kind: "named",
						prompts: []
					};
					grouped.push(current);
				}
				current.prompts.push(prompt);
			}
			const custom = prompts.filter((prompt) => prompt.attached && prompt.imported === false);
			if (custom.length > 0) grouped.push({
				key: "custom",
				title: "自定义模块",
				kind: "named",
				prompts: custom
			});
			const detached = prompts.filter((prompt) => !prompt.attached);
			if (detached.length > 0) grouped.push({
				key: "detached",
				title: "未加入当前顺序",
				kind: "detached",
				prompts: detached
			});
			return grouped.filter((section) => section.prompts.length > 0).map((section) => ({
				...section,
				enabledCount: section.prompts.filter((prompt) => prompt.enabled).length
			}));
		}
		//#endregion
		//#region src/preset-library-http-protocol.ts
		/** Browser-safe values for model-free preset library access. */
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const PRESET_LIBRARY_PATH = "/api/agent-rp/presets";
		//#endregion
		//#region src/frontend-regex.ts
		const HTML_DISPLAY_TAGS = /* @__PURE__ */ new Set([
			"a",
			"abbr",
			"address",
			"area",
			"article",
			"aside",
			"audio",
			"b",
			"base",
			"bdi",
			"bdo",
			"blockquote",
			"body",
			"br",
			"button",
			"canvas",
			"caption",
			"cite",
			"code",
			"col",
			"colgroup",
			"data",
			"datalist",
			"dd",
			"del",
			"details",
			"dfn",
			"dialog",
			"div",
			"dl",
			"dt",
			"em",
			"embed",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"hr",
			"html",
			"i",
			"iframe",
			"img",
			"input",
			"ins",
			"kbd",
			"label",
			"legend",
			"li",
			"link",
			"main",
			"map",
			"mark",
			"menu",
			"meta",
			"meter",
			"nav",
			"noscript",
			"object",
			"ol",
			"optgroup",
			"option",
			"output",
			"p",
			"picture",
			"pre",
			"progress",
			"q",
			"rp",
			"rt",
			"ruby",
			"s",
			"samp",
			"script",
			"search",
			"section",
			"select",
			"slot",
			"small",
			"source",
			"span",
			"strong",
			"style",
			"sub",
			"summary",
			"sup",
			"table",
			"tbody",
			"td",
			"template",
			"textarea",
			"tfoot",
			"th",
			"thead",
			"time",
			"title",
			"tr",
			"track",
			"u",
			"ul",
			"var",
			"video",
			"wbr"
		]);
		function stripUnknownTagsOutsideCode(value) {
			let result = "";
			let cursor = 0;
			let codeTicks = 0;
			while (cursor < value.length) {
				if (value[cursor] === "`") {
					let end = cursor + 1;
					while (value[end] === "`") end += 1;
					const ticks = end - cursor;
					if (codeTicks === 0) codeTicks = ticks;
					else if (ticks === codeTicks) codeTicks = 0;
					result += value.slice(cursor, end);
					cursor = end;
					continue;
				}
				if (codeTicks === 0 && value[cursor] === "<") {
					const tag = value.slice(cursor).match(/^<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?\s*\/?>/u);
					const name = tag?.[1]?.toLowerCase();
					if (tag?.[0] !== void 0 && name !== void 0 && !HTML_DISPLAY_TAGS.has(name)) {
						cursor += tag[0].length;
						continue;
					}
				}
				result += value[cursor];
				cursor += 1;
			}
			return result;
		}
		/**
		* Match SillyTavern's Markdown display for model-defined wrapper elements.
		* Unknown HTML-like tags are discarded there while their text remains. Code
		* examples and fenced blocks keep their source spelling.
		*/
		function normalizeSillyTavernMarkdown(value) {
			let fence;
			return sourceLines(value).map((line) => {
				const candidate = line.text.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1];
				if (candidate !== void 0) {
					if (fence === void 0) fence = {
						marker: candidate[0] ?? "",
						length: candidate.length
					};
					else if (candidate[0] === fence.marker && candidate.length >= fence.length && /^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u.test(line.text)) fence = void 0;
					return line.text;
				}
				return fence === void 0 ? stripUnknownTagsOutsideCode(line.text) : line.text;
			}).join("");
		}
		function sourceLines(value) {
			const lines = [];
			for (const match of value.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/gu)) {
				const text = match[0];
				const start = match.index;
				if (text === "" && start === value.length) break;
				lines.push({
					start,
					end: start + text.length,
					text
				});
			}
			return lines;
		}
		function isFrontendDocument(info, source) {
			const language = info.trim().split(/\s+/u)[0]?.toLowerCase();
			if (language !== void 0 && language !== "") return language === "html";
			return /<!doctype\s+html\b|<html(?:\s|>)|<head(?:\s|>)|<body(?:\s|>)/iu.test(source);
		}
		function appendMarkdown(segments, text) {
			const normalized = normalizeSillyTavernMarkdown(text);
			if (normalized === "") return;
			const previous = segments.at(-1);
			if (previous?.kind === "markdown") {
				segments[segments.length - 1] = {
					kind: "markdown",
					text: previous.text + normalized
				};
				return;
			}
			segments.push({
				kind: "markdown",
				text: normalized
			});
		}
		/**
		* Split a display-regex result into native Markdown and isolated HTML documents.
		* Only fenced frontend documents become executable surfaces; ordinary inline
		* HTML remains part of the Markdown message.
		*/
		function splitCharacterDisplay(value) {
			const lines = sourceLines(value);
			const segments = [];
			let cursor = 0;
			for (let index = 0; index < lines.length; index += 1) {
				const line = lines[index];
				if (line === void 0) continue;
				const opening = line.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*([^\r\n]*?)[ \t]*(?:\r\n|\r|\n|$)$/u);
				if (opening === null) continue;
				const marker = opening[1];
				if (marker === void 0) continue;
				let closingIndex;
				for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
					const closingMarker = (lines[candidate]?.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u))?.[1];
					if (closingMarker !== void 0 && closingMarker[0] === marker[0] && closingMarker.length >= marker.length) {
						closingIndex = candidate;
						break;
					}
				}
				if (closingIndex === void 0) break;
				const closing = lines[closingIndex];
				if (closing === void 0) break;
				const source = value.slice(line.end, closing.start);
				if (isFrontendDocument(opening[2] ?? "", source)) {
					appendMarkdown(segments, value.slice(cursor, line.start));
					segments.push({
						kind: "html",
						source
					});
					cursor = closing.end;
				}
				index = closingIndex;
			}
			appendMarkdown(segments, value.slice(cursor));
			return segments;
		}
		function substituteCardMacros(value, card, userName = "用户", transform = (replacement) => replacement) {
			const name = card.nickname?.trim() || card.name;
			return value.replace(/\{\{char\}\}|<char>|<bot>/giu, transform(name)).replace(/\{\{user\}\}|<user>/giu, transform(userName));
		}
		function compileRegex(value) {
			try {
				const literal = value.match(/^\/([\s\S]*)\/([a-z]*)$/iu);
				if (literal === null) return new RegExp(value);
				const flags = literal[2] ?? "";
				if (flags !== "" && !/^(?!.*?(.).*?\1)[dgimsuvy]+$/u.test(flags)) return new RegExp(value);
				return new RegExp(literal[1] ?? "", flags);
			} catch (_invalidRegex) {
				return;
			}
		}
		function escapeRegexMacro(value) {
			return value.replace(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gu, (character) => {
				switch (character) {
					case "\n": return "\\n";
					case "\r": return "\\r";
					case "	": return "\\t";
					case "\v": return "\\v";
					case "\f": return "\\f";
					case "\0": return "\\0";
					default: return `\\${character}`;
				}
			});
		}
		function substitutedFindRegex(script, card, userName) {
			switch (Number(script.substituteRegex)) {
				case 1: return substituteCardMacros(script.findRegex, card, userName);
				case 2: return substituteCardMacros(script.findRegex, card, userName, escapeRegexMacro);
				default: return script.findRegex;
			}
		}
		function inDepth(script, depth) {
			if (depth === void 0) return true;
			if (script.minDepth !== null && script.minDepth >= -1 && depth < script.minDepth) return false;
			return script.maxDepth === null || script.maxDepth < 0 || depth <= script.maxDepth;
		}
		function filterMatch(value, trimStrings, card, userName) {
			return trimStrings.reduce((text, trim) => text.replaceAll(substituteCardMacros(trim, card, userName), ""), value);
		}
		function applyScript(raw, script, card, userName) {
			const find = compileRegex(substitutedFindRegex(script, card, userName));
			if (find === void 0 || script.findRegex === "" || raw === "") return raw;
			return raw.replace(find, (...args) => {
				const groups = typeof args.at(-1) === "object" && args.at(-1) !== null ? args.at(-1) : void 0;
				return substituteCardMacros(script.replaceString.replace(/\{\{match\}\}/giu, "$0").replace(/\$(\d+)|\$<([^>]+)>/gu, (_token, numeric, named) => {
					const match = numeric === void 0 ? groups?.[named ?? ""] : args[Number(numeric)];
					return typeof match === "string" ? filterMatch(match, script.trimStrings, card, userName) : "";
				}), card, userName);
			});
		}
		function runScripts(raw, card, placement, view, depth, userName, presetScripts = []) {
			return [...presetScripts, ...card.frontend.regexScripts].reduce((text, script) => {
				if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text;
				return (view === "display" ? script.markdownOnly : script.promptOnly) ? applyScript(text, script, card, userName) : text;
			}, raw);
		}
		/** Apply character display-only scripts without executing their HTML. */
		function renderCharacterDisplay(raw, card, placement, depth, userName, presetScripts) {
			return runScripts(raw, card, placement, "display", depth, userName, presetScripts);
		}
		//#endregion
		//#region src/client/import-hint.ts
		/**
		* Classify one standalone draft without inspecting or executing its contents.
		* @param attachments - ordered browser-only draft attachments.
		* @returns filename-based migration affordance, when unambiguous enough to offer a choice.
		*/
		function selectSillyTavernDraft(attachments) {
			if (attachments.length === 2) {
				const card = attachments.find((attachment) => attachment.kind === "file" && /\.json$/iu.test(attachment.file.name.trim()) || attachment.kind === "file" && /\.charx$/iu.test(attachment.file.name.trim()) || attachment.kind === "image" && /\.png$/iu.test(attachment.file.name.trim()));
				const chat = attachments.find((attachment) => attachment.kind === "file" && /\.jsonl$/iu.test(attachment.file.name.trim()));
				if (card !== void 0 && chat !== void 0) return {
					kind: "migration",
					name: `${card.file.name.trim()} + ${chat.file.name.trim()}`
				};
				return;
			}
			if (attachments.length !== 1) return void 0;
			const attachment = attachments[0];
			if (attachment === void 0) return void 0;
			const name = attachment.file.name.trim();
			if (name === "") return void 0;
			if (attachment.kind === "file" && /\.jsonl$/iu.test(name)) return {
				kind: "chat",
				name
			};
			if (attachment.kind === "file" && /\.json$/iu.test(name)) return {
				kind: "json-resource",
				name
			};
			if (attachment.kind === "file" && /\.charx$/iu.test(name)) return {
				kind: "character-card",
				name
			};
			if (attachment.kind === "image" && /\.png$/iu.test(name)) return {
				kind: "png-candidate",
				name
			};
		}
		//#endregion
		//#region src/character-library-protocol.ts
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const CHARACTER_LIBRARY_PATH = "/api/agent-rp/characters";
		/** Same-origin URL for one validated inert CHARX image. */
		function characterLibraryImageUrl(id, index) {
			return `${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/images/${index}`;
		}
		//#endregion
		//#region src/persona-library-protocol.ts
		/** Browser-safe values shared by the local Persona library and Roleplay UI. */
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const PERSONA_LIBRARY_PATH = "/api/agent-rp/personas";
		//#endregion
		//#region src/sillytavern-chat-protocol.ts
		/** Browser-safe values for model-free SillyTavern chat migration. */
		/** Same-origin upload endpoint served by the Agent RP Host plugin. */
		const SILLYTAVERN_CHAT_PATH = "/api/agent-rp/sillytavern-chats";
		//#endregion
		//#region src/session-launch-protocol.ts
		/** Same-origin endpoint that creates one complete roleplay Session. */
		const AGENT_RP_SESSION_PATH = "/api/agent-rp/sessions";
		//#endregion
		//#region src/world-info-library-protocol.ts
		/** Same-origin upload endpoint served by the Agent RP Host plugin. */
		const WORLD_INFO_LIBRARY_PATH = "/api/agent-rp/world-info";
		//#endregion
		//#region src/workspace-settings.ts
		/** Same-origin Host route for Agent RP workspace preferences. */
		const AGENT_RP_WORKSPACE_SETTINGS_PATH = "/api/agent-rp/settings";
		/** Image providers available for explicit roleplay illustrations. */
		const AGENT_RP_IMAGE_PROVIDERS = [
			"openai",
			"novelai",
			"a1111",
			"comfyui"
		];
		const DEFAULT_IMAGE_PROFILE_ID = "default";
		const DEFAULT_IMAGE_GENERATION_SETTINGS = {
			provider: "openai",
			openai: {
				endpoint: "https://api.openai.com/v1/images/generations",
				model: "gpt-image-1",
				size: "1024x1024"
			},
			novelai: {
				endpoint: "https://image.novelai.net/ai/generate-image",
				model: "nai-diffusion-4-5-full",
				width: 832,
				height: 1216,
				steps: 28,
				scale: 5,
				sampler: "k_euler",
				noiseSchedule: "karras",
				cfgRescale: .18,
				negativePrompt: "",
				quality: true,
				smea: true,
				smeaDyn: true
			},
			a1111: {
				endpoint: "http://127.0.0.1:7860",
				model: "",
				width: 768,
				height: 1024,
				steps: 28,
				cfgScale: 7,
				sampler: "DPM++ 2M Karras",
				negativePrompt: ""
			},
			comfyui: {
				endpoint: "http://127.0.0.1:8188",
				workflow: "",
				width: 768,
				height: 1024,
				negativePrompt: ""
			}
		};
		/** Default settings preserve the existing all-workspace behavior. */
		const DEFAULT_AGENT_RP_SETTINGS = {
			workspaceMode: "all",
			workspaceIds: [],
			imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
			activeImageProfileId: DEFAULT_IMAGE_PROFILE_ID,
			imageProfiles: [{
				id: DEFAULT_IMAGE_PROFILE_ID,
				name: "默认配置",
				settings: DEFAULT_IMAGE_GENERATION_SETTINGS
			}]
		};
		function text(value, fallback, max, label) {
			if (value === void 0) return fallback;
			if (typeof value !== "string" || value.length > max) throw new Error(`${label}无效`);
			return value.trim();
		}
		function endpoint(value, fallback, label) {
			const candidate = text(value, fallback, 2e3, label);
			let parsed;
			try {
				parsed = new URL(candidate);
			} catch {
				throw new Error(`${label}无效`);
			}
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "" || parsed.hash !== "") throw new Error(`${label}无效`);
			return candidate;
		}
		function integer(value, fallback, min, max, label) {
			const candidate = value === void 0 ? fallback : value;
			if (!Number.isSafeInteger(candidate) || Number(candidate) < min || Number(candidate) > max) throw new Error(`${label}无效`);
			return Number(candidate);
		}
		function finite(value, fallback, min, max, label) {
			const candidate = value === void 0 ? fallback : value;
			if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < min || candidate > max) throw new Error(`${label}无效`);
			return candidate;
		}
		function bool(value, fallback, label) {
			if (value === void 0) return fallback;
			if (typeof value !== "boolean") throw new Error(`${label}无效`);
			return value;
		}
		function novelAiDimension(value, fallback, label) {
			const candidate = integer(value, fallback, 64, 2048, label);
			if (candidate % 64 !== 0) throw new Error(`${label}必须是 64 的倍数`);
			return candidate;
		}
		/** Normalize image settings while accepting pre-image-generation settings files. */
		function normalizeImageGenerationSettings(value) {
			if (value === void 0) return structuredClone(DEFAULT_AGENT_RP_SETTINGS.imageGeneration);
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 图片设置不是对象");
			const record = value;
			if (!AGENT_RP_IMAGE_PROVIDERS.includes(record.provider)) throw new Error("Agent RP 图片提供方无效");
			const openai = typeof record.openai === "object" && record.openai !== null && !Array.isArray(record.openai) ? record.openai : {};
			const novelai = typeof record.novelai === "object" && record.novelai !== null && !Array.isArray(record.novelai) ? record.novelai : {};
			const a1111 = typeof record.a1111 === "object" && record.a1111 !== null && !Array.isArray(record.a1111) ? record.a1111 : {};
			const comfyui = typeof record.comfyui === "object" && record.comfyui !== null && !Array.isArray(record.comfyui) ? record.comfyui : {};
			const size = openai.size ?? DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.size;
			if (size !== "1024x1024" && size !== "1024x1536" && size !== "1536x1024") throw new Error("OpenAI 图片尺寸无效");
			const novelAiModel = novelai.model ?? DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.model;
			if (novelAiModel !== "nai-diffusion-4-5-full" && novelAiModel !== "nai-diffusion-4-5-curated") throw new Error("NovelAI 图片模型无效");
			return {
				provider: record.provider,
				openai: {
					endpoint: endpoint(openai.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.endpoint, "OpenAI 图片服务地址"),
					model: text(openai.model, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.model, 200, "OpenAI 图片模型"),
					size
				},
				novelai: {
					endpoint: endpoint(novelai.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.endpoint, "NovelAI 图片服务地址"),
					model: novelAiModel,
					width: novelAiDimension(novelai.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.width, "NovelAI 宽度"),
					height: novelAiDimension(novelai.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.height, "NovelAI 高度"),
					steps: integer(novelai.steps, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.steps, 1, 50, "NovelAI 步数"),
					scale: finite(novelai.scale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.scale, 0, 20, "NovelAI 引导强度"),
					sampler: text(novelai.sampler, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.sampler, 100, "NovelAI 采样器"),
					noiseSchedule: text(novelai.noiseSchedule, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.noiseSchedule, 100, "NovelAI 噪声调度"),
					cfgRescale: finite(novelai.cfgRescale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.cfgRescale, 0, 1, "NovelAI CFG Rescale"),
					negativePrompt: text(novelai.negativePrompt, "", 8e3, "NovelAI 负面提示词"),
					quality: bool(novelai.quality, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.quality, "NovelAI 质量增强"),
					smea: bool(novelai.smea, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.smea, "NovelAI SMEA"),
					smeaDyn: bool(novelai.smeaDyn, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.smeaDyn, "NovelAI SMEA DYN")
				},
				a1111: {
					endpoint: endpoint(a1111.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.endpoint, "A1111 图片服务地址"),
					model: text(a1111.model, "", 500, "A1111 模型"),
					width: integer(a1111.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.width, 256, 2048, "A1111 宽度"),
					height: integer(a1111.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.height, 256, 2048, "A1111 高度"),
					steps: integer(a1111.steps, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.steps, 1, 150, "A1111 步数"),
					cfgScale: finite(a1111.cfgScale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.cfgScale, 0, 30, "A1111 CFG"),
					sampler: text(a1111.sampler, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.sampler, 300, "A1111 采样器"),
					negativePrompt: text(a1111.negativePrompt, "", 8e3, "A1111 负面提示词")
				},
				comfyui: {
					endpoint: endpoint(comfyui.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.endpoint, "ComfyUI 服务地址"),
					workflow: text(comfyui.workflow, "", 256 * 1024, "ComfyUI API 工作流"),
					width: integer(comfyui.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.width, 64, 4096, "ComfyUI 宽度"),
					height: integer(comfyui.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.height, 64, 4096, "ComfyUI 高度"),
					negativePrompt: text(comfyui.negativePrompt, "", 8e3, "ComfyUI 负面提示词")
				}
			};
		}
		/**
		* Validate one persisted or wire settings value.
		* @param value - untrusted JSON value.
		* @returns normalized settings with duplicate ids removed.
		*/
		function normalizeAgentRpSettings(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 设置不是对象");
			const record = value;
			const workspaceMode = record.workspaceMode;
			const workspaceIds = record.workspaceIds;
			if (workspaceMode !== "all" && workspaceMode !== "selected" || !Array.isArray(workspaceIds) || workspaceIds.length > 1e3 || workspaceIds.some((id) => typeof id !== "string" || id.trim() !== id || id === "" || id.length > 256)) throw new Error("Agent RP 工作区设置字段无效");
			const imageGeneration = normalizeImageGenerationSettings(record.imageGeneration);
			let imageProfiles;
			let activeImageProfileId;
			if (record.imageProfiles === void 0) {
				activeImageProfileId = DEFAULT_IMAGE_PROFILE_ID;
				imageProfiles = [{
					id: activeImageProfileId,
					name: "默认配置",
					settings: imageGeneration
				}];
			} else {
				if (!Array.isArray(record.imageProfiles) || record.imageProfiles.length === 0 || record.imageProfiles.length > 50) throw new Error("图片服务配置档案无效");
				imageProfiles = record.imageProfiles.map((value) => {
					if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("图片服务配置档案无效");
					const profile = value;
					if (typeof profile.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/iu.test(profile.id)) throw new Error("图片服务配置档案 id 无效");
					if (typeof profile.name !== "string" || profile.name.trim() === "" || profile.name.trim().length > 80) throw new Error("图片服务配置档案名称无效");
					return {
						id: profile.id,
						name: profile.name.trim(),
						settings: normalizeImageGenerationSettings(profile.settings)
					};
				});
				if (new Set(imageProfiles.map((profile) => profile.id)).size !== imageProfiles.length) throw new Error("图片服务配置档案 id 重复");
				if (new Set(imageProfiles.map((profile) => profile.name.toLowerCase())).size !== imageProfiles.length) throw new Error("图片服务配置档案名称重复");
				activeImageProfileId = typeof record.activeImageProfileId === "string" ? record.activeImageProfileId : imageProfiles[0].id;
				if (!imageProfiles.some((profile) => profile.id === activeImageProfileId)) throw new Error("当前图片服务配置档案不存在");
			}
			const activeImageGeneration = imageProfiles.find((profile) => profile.id === activeImageProfileId).settings;
			return {
				workspaceMode,
				workspaceIds: [...new Set(workspaceIds)],
				imageGeneration: activeImageGeneration,
				activeImageProfileId,
				imageProfiles
			};
		}
		/**
		* Decide whether a workspace may show a new Agent RP entry point.
		* @param settings - resolved Host settings, or undefined before they are available.
		* @param workspaceId - workspace owning the current Session, when registered.
		* @returns whether the entry point should be visible.
		*/
		function allowsAgentRpEntry(settings, workspaceId) {
			const resolved = settings ?? DEFAULT_AGENT_RP_SETTINGS;
			return resolved.workspaceMode === "all" || workspaceId !== void 0 && resolved.workspaceIds.includes(workspaceId);
		}
		//#endregion
		//#region src/image-generation-protocol.ts
		/** Browser-safe protocol for local roleplay image generation. */
		/** Same-origin route serving image jobs, assets, and credential state. */
		const AGENT_RP_IMAGE_PATH = "/api/agent-rp/images";
		/** Supported image generation intents. */
		const IMAGE_GENERATION_MODES = [
			"scene",
			"portrait",
			"avatar",
			"custom"
		];
		const JOB_ID_PATTERN = /^image-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
		const COMMAND_RECORD_PREFIX = "dsh-agent-rp:image:v0:";
		/** Validate one opaque browser-minted image job id. */
		function isImageJobId(value) {
			return JOB_ID_PATTERN.test(value);
		}
		/** Parse and validate one command request. */
		function parseImageGenerationRequest(value) {
			const parsed = typeof value === "string" ? JSON.parse(value.trim()) : value;
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("图片生成请求不是对象");
			const record = parsed;
			const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
			if (record.format !== 0 || typeof record.jobId !== "string" || !isImageJobId(record.jobId) || typeof record.mode !== "string" || !IMAGE_GENERATION_MODES.includes(record.mode) || prompt.length < 1 || prompt.length > 8e3) throw new Error("图片生成请求字段无效");
			return {
				format: 0,
				jobId: record.jobId,
				mode: record.mode,
				prompt
			};
		}
		/** Decode a settled `/rp-draw` result without exposing image bytes to the transcript. */
		function decodeImageGenerationRecord(value) {
			if (value === void 0 || !value.startsWith(COMMAND_RECORD_PREFIX)) return void 0;
			try {
				const record = JSON.parse(value.slice(22));
				return record.format === 0 && typeof record.jobId === "string" && isImageJobId(record.jobId) ? { jobId: record.jobId } : void 0;
			} catch {
				return;
			}
		}
		/** Build the same-origin URL for job metadata. */
		function generatedImageJobUrl(jobId) {
			return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}`;
		}
		/** Build the same-origin URL for one immutable generated asset. */
		function generatedImageAssetUrl(jobId, download = false) {
			return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}/asset${download ? "?download=1" : ""}`;
		}
		//#endregion
		//#region src/client/index.tsx
		function createWorkspaceSettingsSource() {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = {
				status: "loading",
				value: DEFAULT_AGENT_RP_SETTINGS
			};
			const publish = (next) => {
				snapshot = next;
				for (const listener of listeners) listener();
			};
			const decode = (value) => {
				if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 设置响应无效");
				return normalizeAgentRpSettings(value.settings);
			};
			const load = async () => {
				try {
					const response = await fetch(AGENT_RP_WORKSPACE_SETTINGS_PATH, { headers: { accept: "application/json" } });
					const value = await response.json();
					if (!response.ok) throw new Error(value.error ?? `设置读取失败（${response.status}）`);
					publish({
						status: "ready",
						value: decode(value)
					});
				} catch (reason) {
					publish({
						status: "error",
						value: DEFAULT_AGENT_RP_SETTINGS,
						error: reason instanceof Error ? reason.message : String(reason)
					});
				}
			};
			load();
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				async set(settings) {
					const response = await fetch(AGENT_RP_WORKSPACE_SETTINGS_PATH, {
						method: "PUT",
						headers: {
							accept: "application/json",
							"content-type": "application/json"
						},
						body: JSON.stringify(settings)
					});
					const value = await response.json();
					if (!response.ok) throw new Error(value.error ?? `设置保存失败（${response.status}）`);
					publish({
						status: "ready",
						value: decode(value)
					});
				}
			};
		}
		async function imageCredentialInfo(provider) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/credential?provider=${encodeURIComponent(provider)}`, { headers: { accept: "application/json" } });
			const value = await response.json();
			if (!response.ok || value.credential === void 0) throw new Error(value.error ?? `图片密钥状态读取失败（${response.status}）`);
			return value.credential;
		}
		async function updateImageCredential(provider, change) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/credential?provider=${encodeURIComponent(provider)}`, {
				method: "PUT",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(change)
			});
			const value = await response.json();
			if (!response.ok || value.credential === void 0) throw new Error(value.error ?? `图片密钥保存失败（${response.status}）`);
			return value.credential;
		}
		async function testConfiguredImageProvider(settings) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/test`, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(settings)
			});
			const value = await response.json();
			if (!response.ok || value.test === void 0) throw new Error(value.error ?? `图片服务连接测试失败（${response.status}）`);
			return value.test;
		}
		const color = "var(--dsw-alias-state-business-primary, #6f78e8)";
		const statusPlaceholder = "<StatusPlaceHolderImpl/>";
		const roleplayViewListeners = /* @__PURE__ */ new Map();
		const roleplayBackgroundListeners = /* @__PURE__ */ new Map();
		const roleplayExpressionListeners = /* @__PURE__ */ new Map();
		function roleplayViewKey(sessionId) {
			return `dsh.agent-rp.view.${sessionId}`;
		}
		function readRoleplayViewMode(sessionId) {
			return localStorage.getItem(roleplayViewKey(sessionId)) === "debug" ? "debug" : "immersive";
		}
		function setRoleplayViewMode(sessionId, mode) {
			if (mode === "immersive") localStorage.removeItem(roleplayViewKey(sessionId));
			else localStorage.setItem(roleplayViewKey(sessionId), mode);
			for (const listener of roleplayViewListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayViewMode(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				const listeners = roleplayViewListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayViewListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayViewListeners.delete(sessionId);
				};
			}, () => readRoleplayViewMode(sessionId), () => "immersive");
		}
		function roleplayBackgroundKey(sessionId) {
			return `dsh.agent-rp.background.${sessionId}`;
		}
		function readRoleplayBackground(sessionId) {
			const value = localStorage.getItem(roleplayBackgroundKey(sessionId));
			if (value === "off") return "off";
			if (value !== null && /^\d+$/u.test(value)) return Number(value);
			return "auto";
		}
		function setRoleplayBackground(sessionId, choice) {
			if (choice === "auto") localStorage.removeItem(roleplayBackgroundKey(sessionId));
			else localStorage.setItem(roleplayBackgroundKey(sessionId), String(choice));
			for (const listener of roleplayBackgroundListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayBackground(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				if (sessionId === void 0) return () => {};
				const listeners = roleplayBackgroundListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayBackgroundListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayBackgroundListeners.delete(sessionId);
				};
			}, () => sessionId === void 0 ? "auto" : readRoleplayBackground(sessionId), () => "auto");
		}
		function roleplayExpressionKey(sessionId) {
			return `dsh.agent-rp.expression.${sessionId}`;
		}
		function readRoleplayExpression(sessionId) {
			const value = localStorage.getItem(roleplayExpressionKey(sessionId));
			return value !== null && /^\d+$/u.test(value) ? Number(value) : "default";
		}
		function setRoleplayExpression(sessionId, choice) {
			if (choice === "default") localStorage.removeItem(roleplayExpressionKey(sessionId));
			else localStorage.setItem(roleplayExpressionKey(sessionId), String(choice));
			for (const listener of roleplayExpressionListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayExpression(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				if (sessionId === void 0) return () => {};
				const listeners = roleplayExpressionListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayExpressionListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayExpressionListeners.delete(sessionId);
				};
			}, () => sessionId === void 0 ? "default" : readRoleplayExpression(sessionId), () => "default");
		}
		const roleplayPresetPreferenceKey = "dsh.agent-rp.preset";
		const tavernScriptOriginsKey = "dsh.agent-rp.tavern-script-origins";
		const tavernScriptGenerationApprovalsKey = "dsh.agent-rp.tavern-script-generation-approvals";
		const tavernScriptCustomGenerationApprovalsKey = "dsh.agent-rp.tavern-script-custom-generation-approvals";
		const tavernScriptModelApprovalsKey = "dsh.agent-rp.tavern-script-model-approvals";
		function normalizedTavernScriptOrigin(value) {
			if (typeof value !== "string") return void 0;
			try {
				const url = new URL(value);
				return url.protocol === "https:" && url.origin === value ? url.origin : void 0;
			} catch {
				return;
			}
		}
		function normalizedTavernModelOrigin(value) {
			if (typeof value !== "string") return void 0;
			try {
				const url = new URL(value);
				return url.protocol === "http:" || url.protocol === "https:" ? url.origin : void 0;
			} catch {
				return;
			}
		}
		function readApprovedTavernScriptOrigins() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptOriginsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.flatMap((item) => {
					const origin = normalizedTavernScriptOrigin(item);
					return origin === void 0 ? [] : [origin];
				}));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptOrigins(origins) {
			localStorage.setItem(tavernScriptOriginsKey, JSON.stringify([...origins].sort()));
		}
		function readApprovedTavernScriptGenerations() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptGenerationApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 1024));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptGenerations(approvals) {
			localStorage.setItem(tavernScriptGenerationApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readApprovedTavernScriptCustomGenerations() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptCustomGenerationApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 3072));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptCustomGenerations(approvals) {
			localStorage.setItem(tavernScriptCustomGenerationApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readApprovedTavernScriptModels() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptModelApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 3072));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptModels(approvals) {
			localStorage.setItem(tavernScriptModelApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readRoleplayPresetPreference() {
			const value = localStorage.getItem(roleplayPresetPreferenceKey);
			return value !== null && /^[a-z0-9-]{8,80}$/u.test(value) ? value : "";
		}
		function writeRoleplayPresetPreference(presetId) {
			localStorage.setItem(roleplayPresetPreferenceKey, presetId);
		}
		function usePresetPreference(listPresets, enabled = true) {
			const [entries, setEntries] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [presetId, setPresetId] = (0, react.useState)(readRoleplayPresetPreference);
			(0, react.useEffect)(() => {
				if (!enabled) {
					setEntries([]);
					setError(void 0);
					return;
				}
				let current = true;
				setEntries(void 0);
				setError(void 0);
				listPresets().then((value) => {
					if (!current) return;
					setEntries(value);
					setPresetId((selectedId) => {
						if (value.some((entry) => entry.id === selectedId)) return selectedId;
						writeRoleplayPresetPreference("");
						return "";
					});
				}, (reason) => {
					if (!current) return;
					setEntries([]);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					current = false;
				};
			}, [enabled, listPresets]);
			return {
				entries,
				...error === void 0 ? {} : { error },
				presetId,
				selectPreset(value) {
					writeRoleplayPresetPreference(value);
					setPresetId(value);
				}
			};
		}
		async function characterLibraryJson(path = "") {
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, { headers: { accept: "application/json" } });
			const value = await response.json();
			if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
			return value;
		}
		async function fetchCharacterDetail(id) {
			return (await characterLibraryJson(`/${encodeURIComponent(id)}`)).entry;
		}
		function useCharacterDetail(libraryId) {
			const [detail, setDetail] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let current = true;
				setDetail(void 0);
				if (libraryId === void 0) return () => {
					current = false;
				};
				fetchCharacterDetail(libraryId).then((value) => {
					if (current) setDetail(value);
				}, () => {
					if (current) setDetail(void 0);
				});
				return () => {
					current = false;
				};
			}, [libraryId]);
			return detail;
		}
		function backgroundAssets(detail) {
			return detail?.imageAssets.filter((asset) => asset.type === "background") ?? [];
		}
		function selectedBackground(detail, choice) {
			if (choice === "off") return void 0;
			const backgrounds = backgroundAssets(detail);
			return choice === "auto" ? backgrounds.find((asset) => asset.name.trim().toLocaleLowerCase() === "main") ?? backgrounds[0] : backgrounds.find((asset) => asset.index === choice);
		}
		const cardFrameCompatibility = `<style>
html{background:transparent!important;color-scheme:dark;scrollbar-color:rgba(145,158,181,.58) transparent;scrollbar-width:thin}
*,*::before,*::after{box-sizing:border-box}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(145,158,181,.58);background-clip:padding-box}
img,svg,video,canvas{max-width:100%}
</style>`;
		function mvuFrameRuntime(statData) {
			return `
var __dshStatData=${JSON.stringify(statData ?? {}).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029")};
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
`;
		}
		function cardFrameSource(source, statData, character) {
			const assets = (character?.imageAssets ?? []).map((asset) => ({
				...asset,
				url: new URL(characterLibraryImageUrl(character.id, asset.index), window.location.origin).href
			}));
			const adapted = assets.reduce((html, asset) => asset.sourceUri === "" ? html : html.replaceAll(asset.sourceUri, asset.url), source).replaceAll("window.parent?.document ?? window.document", "window.document");
			const assetJson = JSON.stringify(assets).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
			const head = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: ${window.location.origin.replace(/["'<>\s]/gu, "")}; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; frame-src 'none';"><meta name="viewport" content="width=device-width,initial-scale=1">${cardFrameCompatibility}<script>${mvuFrameRuntime(statData)}window.dshCharacterAssets=Object.freeze(${assetJson}.map(Object.freeze));window.getCharacterAsset=function(type,name){var target=window.dshCharacterAssets.find(function(asset){return asset.type===String(type).toLowerCase()&&(name===undefined||asset.name===String(name))});return target?.url};window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};function __dshReportSize(){var root=document.documentElement;var body=document.body;var value=Math.max(root?root.scrollHeight:0,body?body.scrollHeight:0);parent.postMessage({source:'dsh-agent-rp-card',action:'resize',value:value},'*')}addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(!input){input=document.createElement('textarea');input.id='send_textarea';input.hidden=true;document.body.appendChild(input)}input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')});requestAnimationFrame(__dshReportSize);if(window.ResizeObserver)new ResizeObserver(__dshReportSize).observe(document.documentElement)});<\/script>`;
			if (/<head(?:\s|>)/iu.test(adapted)) return adapted.replace(/<head([^>]*)>/iu, `<head$1>${head}`);
			if (/<html(?:\s|>)/iu.test(adapted)) return adapted.replace(/<html([^>]*)>/iu, `<html$1><head>${head}</head>`);
			return `<!doctype html><html><head>${head}</head><body>${adapted}</body></html>`;
		}
		function CharacterDisplay({ segments, statData, characterName, character }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-character-display": true,
				style: {
					display: "grid",
					gap: "10px",
					minWidth: 0
				},
				children: segments.map((segment, index) => segment.kind === "markdown" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: segment.text }, index) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					title: `${characterName}的轻前端界面 ${index + 1}`,
					"data-agent-rp-frame": true,
					sandbox: "allow-scripts",
					srcDoc: cardFrameSource(segment.source, statData, character),
					style: {
						background: "transparent",
						border: 0,
						colorScheme: "dark",
						display: "block",
						height: "72px",
						maxWidth: "100%",
						width: "100%"
					}
				}, index))
			});
		}
		function replySceneNote(value) {
			return splitCharacterDisplay(value.replaceAll(statusPlaceholder, "")).filter((segment) => segment.kind === "markdown").map((segment) => segment.text.trim()).filter(Boolean).join("\n\n").slice(0, 4e3);
		}
		function GenerationTail({ matched, runGeneration, runImageGeneration, sessionId, useProjection, useSession }) {
			const projection = useProjection("agentRp");
			const running = useSession((snapshot) => snapshot.running);
			const replyText = useSession((snapshot) => {
				const node = snapshot.chat.legacy.nodes.find((candidate) => candidate.kind === "assistant" && candidate.seq === matched.replySeq);
				return node?.kind === "assistant" ? node.blocks.filter((block) => block.kind === "text").map((block) => block.text).join("\n") : "";
			});
			const [busy, setBusy] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [drawOpen, setDrawOpen] = (0, react.useState)(false);
			const group = projection?.generations.find((candidate) => candidate.anchorSeq === matched.replySeq);
			if (projection === void 0 || projection.currentReplySeq !== matched.replySeq) return null;
			const sceneNote = replySceneNote(replyText);
			const selectedIndex = group?.versions.findIndex((version) => version.seq === group.selectedVersionSeq) ?? 0;
			const invoke = (request) => {
				setBusy(request.operation);
				setError(void 0);
				runGeneration(sessionId, request).then(() => {
					setBusy(void 0);
				}, (reason) => {
					setBusy(void 0);
					setError(reason instanceof Error ? reason.message : "回复操作失败");
				});
			};
			const disabled = running || busy !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-agent-rp-generation-tail": true,
				style: {
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "5px",
					marginRight: "auto"
				},
				children: [
					group !== void 0 && group.versions.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "上一版回复",
							disabled: disabled || selectedIndex <= 0,
							onClick: () => {
								invoke({
									operation: "select",
									replySeq: matched.replySeq,
									versionIndex: selectedIndex - 1
								});
							},
							style: generationButtonStyle,
							children: "‹"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: "10px",
								minWidth: "32px",
								opacity: .5,
								textAlign: "center"
							},
							children: [
								selectedIndex + 1,
								" / ",
								group.versions.length
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "下一版回复",
							disabled: disabled || selectedIndex >= group.versions.length - 1,
							onClick: () => {
								invoke({
									operation: "select",
									replySeq: matched.replySeq,
									versionIndex: selectedIndex + 1
								});
							},
							style: generationButtonStyle,
							children: "›"
						})
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled,
						onClick: () => {
							invoke({
								operation: "regenerate",
								replySeq: matched.replySeq
							});
						},
						style: generationButtonStyle,
						children: busy === "regenerate" ? "重写中…" : "重写"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled,
						onClick: () => {
							invoke({
								operation: "continue",
								replySeq: matched.replySeq
							});
						},
						style: generationButtonStyle,
						children: busy === "continue" ? "续写中…" : "续写"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: disabled || sceneNote === "",
						onClick: () => {
							setDrawOpen(true);
						},
						style: generationButtonStyle,
						children: "画这段"
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "alert",
						title: error,
						style: {
							color: "#dc7777",
							fontSize: "10px",
							maxWidth: "220px",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: error
					}),
					drawOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationDialog, {
						projection,
						initialMode: "scene",
						initialNote: sceneNote,
						onClose: () => {
							setDrawOpen(false);
						},
						onGenerate: (request) => {
							runImageGeneration(sessionId, request);
						}
					})
				]
			});
		}
		const generationButtonStyle = {
			background: "transparent",
			border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
			borderRadius: "6px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "10px",
			lineHeight: 1,
			minHeight: "24px",
			minWidth: "24px",
			opacity: .58,
			padding: "4px 7px"
		};
		const headerMenuItemStyle = {
			background: "transparent",
			border: 0,
			borderRadius: "7px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "12px",
			padding: "8px 9px",
			textAlign: "left",
			whiteSpace: "nowrap"
		};
		function initials(name) {
			return [...name.trim()].slice(0, 1).join("").toUpperCase() || "RP";
		}
		function characterCapabilitySummary(projection) {
			const parts = [
				projection.worldInfoCount > 0 ? `${projection.worldInfoCount} 条世界书` : void 0,
				(projection.frontend?.regexScripts.length ?? 0) > 0 ? "轻前端" : void 0,
				(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 ? "酒馆脚本" : void 0,
				projection.mvu === void 0 ? void 0 : "动态状态",
				projection.preset === void 0 ? void 0 : `预设 · ${projection.preset.enabledCount} 项启用`
			].filter((part) => part !== void 0);
			return parts.length === 0 ? "继续这段对话" : parts.join(" · ");
		}
		function hideWhileMounted(elements) {
			const states = elements.filter((element) => element != null).map((element) => ({
				element,
				display: element.style.getPropertyValue("display"),
				priority: element.style.getPropertyPriority("display")
			}));
			for (const { element } of states) element.style.setProperty("display", "none", "important");
			return () => {
				for (const { element, display, priority } of states) if (display === "") element.style.removeProperty("display");
				else element.style.setProperty("display", display, priority);
			};
		}
		function roleplaySummary(summary, projection) {
			if (projection !== void 0) return projection;
			if (summary?.agentPreset !== "agent-rp") return void 0;
			return {
				characterName: summary.displayTitle,
				description: "",
				personality: "",
				scenario: "",
				importedMessageCount: 0,
				worldInfoCount: 0,
				worldInfo: {
					revision: 0,
					activeCount: 0,
					books: []
				},
				presetLibrary: [],
				generations: [],
				source: "preset"
			};
		}
		function roleplayDisplayName(summary, projection) {
			return summary?.title?.trim() || projection.characterName;
		}
		function Avatar({ projection, loadAvatar, imageUrl, size = 40 }) {
			const [src, setSrc] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let current = true;
				let objectUrl;
				const attachmentId = projection.avatarAttachmentId;
				const libraryId = projection.avatarLibraryId;
				if (imageUrl !== void 0) {
					setSrc(imageUrl);
					return () => {
						current = false;
					};
				}
				if (attachmentId === void 0 && libraryId === void 0) {
					setSrc(void 0);
					return () => {
						current = false;
					};
				}
				(libraryId === void 0 ? loadAvatar(attachmentId) : Promise.resolve(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(libraryId)}/avatar`)).then((url) => {
					if (!current) {
						if (url !== void 0) URL.revokeObjectURL(url);
						return;
					}
					objectUrl = url;
					setSrc(url);
				});
				return () => {
					current = false;
					if (objectUrl !== void 0) URL.revokeObjectURL(objectUrl);
				};
			}, [
				imageUrl,
				loadAvatar,
				projection.avatarAttachmentId,
				projection.avatarLibraryId
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					alignItems: "center",
					background: `color-mix(in srgb, ${color} 16%, transparent)`,
					border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
					borderRadius: "50%",
					color,
					display: "inline-flex",
					flex: `0 0 ${size}px`,
					fontSize: `${Math.max(13, Math.round(size * .36))}px`,
					fontWeight: 650,
					height: `${size}px`,
					justifyContent: "center",
					overflow: "hidden",
					width: `${size}px`
				},
				children: src === void 0 ? initials(projection.characterName) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src,
					alt: "",
					style: {
						height: "100%",
						objectFit: "cover",
						width: "100%"
					}
				})
			});
		}
		function DetailSection({ title, text }) {
			if (text.trim() === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { marginTop: "18px" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: "12px",
						fontWeight: 600,
						margin: "0 0 7px",
						opacity: .56
					},
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						fontSize: "13px",
						lineHeight: 1.7,
						margin: 0,
						whiteSpace: "pre-wrap"
					},
					children: text
				})]
			});
		}
		function CharacterAssetsSection({ detail, sessionId }) {
			const backgroundChoice = useRoleplayBackground(sessionId);
			const expressionChoice = useRoleplayExpression(sessionId);
			const backgrounds = backgroundAssets(detail);
			const expressions = detail.imageAssets.filter((asset) => asset.type === "emotion" || asset.type === "expression");
			if (backgrounds.length + expressions.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { marginTop: "20px" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							fontSize: "12px",
							fontWeight: 620,
							margin: "0 0 9px",
							opacity: .58
						},
						children: "卡片资源"
					}),
					backgrounds.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							fontSize: "12px",
							marginBottom: "8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .64 },
							children: "背景"
						}), sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							"aria-label": "选择会话背景",
							value: String(backgroundChoice),
							onChange: (event) => {
								const value = event.target.value;
								setRoleplayBackground(sessionId, value === "auto" || value === "off" ? value : Number(value));
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "7px",
								color: "inherit",
								font: "inherit",
								fontSize: "11px",
								marginLeft: "auto",
								padding: "5px 7px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "auto",
									children: "跟随角色卡"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "off",
									children: "不使用背景"
								}),
								backgrounds.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: asset.index,
									children: asset.name || `背景 ${asset.index + 1}`
								}, asset.index))
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gap: "7px",
							gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))"
						},
						children: backgrounds.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
							style: {
								margin: 0,
								minWidth: 0
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: characterLibraryImageUrl(detail.id, asset.index),
								alt: asset.name || "角色背景",
								loading: "lazy",
								style: {
									aspectRatio: "16 / 9",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "8px",
									display: "block",
									objectFit: "cover",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
								style: {
									fontSize: "10px",
									marginTop: "4px",
									opacity: .48,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: asset.name || `背景 ${asset.index + 1}`
							})]
						}, asset.index))
					})] }),
					expressions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							fontSize: "12px",
							margin: backgrounds.length === 0 ? "0 0 8px" : "16px 0 8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .64 },
							children: "表情资源"
						}), sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setRoleplayExpression(sessionId, "default");
							},
							style: {
								background: expressionChoice === "default" ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "7px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "10px",
								marginLeft: "auto",
								padding: "4px 7px"
							},
							children: "默认头像"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gap: "7px",
							gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))"
						},
						children: expressions.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-label": `使用表情 ${asset.name || asset.index + 1}`,
							"aria-pressed": sessionId !== void 0 && expressionChoice === asset.index,
							disabled: sessionId === void 0,
							onClick: () => {
								if (sessionId !== void 0) setRoleplayExpression(sessionId, asset.index);
							},
							style: {
								background: sessionId !== void 0 && expressionChoice === asset.index ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
								border: sessionId !== void 0 && expressionChoice === asset.index ? `1px solid color-mix(in srgb, ${color} 48%, transparent)` : "1px solid transparent",
								borderRadius: "9px",
								color: "inherit",
								cursor: sessionId === void 0 ? "default" : "pointer",
								font: "inherit",
								margin: 0,
								minWidth: 0,
								padding: "3px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: characterLibraryImageUrl(detail.id, asset.index),
								alt: asset.name || "角色表情",
								loading: "lazy",
								style: {
									aspectRatio: "1",
									background: "color-mix(in srgb, currentColor 5%, transparent)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "8px",
									display: "block",
									objectFit: "contain",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
								style: {
									fontSize: "10px",
									marginTop: "4px",
									opacity: .48,
									overflow: "hidden",
									textAlign: "center",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: asset.name || `表情 ${asset.index + 1}`
							})]
						}, asset.index))
					})] })
				]
			});
		}
		function CharacterLibraryAvatar({ entry, size = 38 }) {
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setFailed(false);
			}, [entry.id]);
			const image = entry.avatarAvailable && !failed;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				style: {
					alignItems: "center",
					background: `color-mix(in srgb, ${color} 13%, transparent)`,
					border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
					borderRadius: `${Math.max(9, Math.round(size * .24))}px`,
					color,
					display: "inline-flex",
					flex: `0 0 ${size}px`,
					fontSize: `${Math.max(12, Math.round(size * .32))}px`,
					fontWeight: 650,
					height: `${size}px`,
					justifyContent: "center",
					overflow: "hidden",
					width: `${size}px`
				},
				children: image ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: `${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(entry.id)}/avatar`,
					alt: "",
					loading: "lazy",
					onError: () => {
						setFailed(true);
					},
					style: {
						height: "100%",
						objectFit: "cover",
						width: "100%"
					}
				}) : initials(entry.displayName)
			});
		}
		const characterLibraryNarrowQuery = "(max-width: 720px)";
		function subscribeCharacterLibraryWidth(listener) {
			const media = window.matchMedia(characterLibraryNarrowQuery);
			media.addEventListener("change", listener);
			return () => {
				media.removeEventListener("change", listener);
			};
		}
		function useNarrowCharacterLibrary() {
			return (0, react.useSyncExternalStore)(subscribeCharacterLibraryWidth, () => window.matchMedia(characterLibraryNarrowQuery).matches, () => false);
		}
		function SillyTavernImportDialog({ listPresets, onClose, onImport }) {
			const chatRef = (0, react.useRef)(null);
			const cardRef = (0, react.useRef)(null);
			const [chatFile, setChatFile] = (0, react.useState)();
			const [cardFile, setCardFile] = (0, react.useState)();
			const { entries: presets, error: presetError, presetId, selectPreset } = usePresetPreference(listPresets);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "迁移 SillyTavern 聊天",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.66)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1250
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.5)",
						maxWidth: "520px",
						padding: "24px",
						width: "min(94vw, 520px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "迁移 SillyTavern 聊天"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "13px",
								lineHeight: 1.65,
								margin: "9px 0 20px",
								opacity: .58
							},
							children: "选择导出的 JSONL。角色卡可选；一同选择时，新会话会直接采用这张卡"
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px",
								margin: "0 0 12px"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: chatRef,
							type: "file",
							accept: ".jsonl,application/x-ndjson",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file !== void 0) setChatFile(file);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: cardRef,
							type: "file",
							accept: ".png,.json,.charx,image/png,application/json",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file !== void 0) setCardFile(file);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "8px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									chatRef.current?.click();
								},
								style: {
									...secondaryButtonStyle,
									textAlign: "left"
								},
								children: chatFile === void 0 ? "选择聊天记录 JSONL" : `聊天记录 · ${chatFile.name}`
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									cardRef.current?.click();
								},
								style: {
									...secondaryButtonStyle,
									textAlign: "left"
								},
								children: cardFile === void 0 ? "选择角色卡（可选）" : `角色卡 · ${cardFile.name}`
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "block",
								fontSize: "12px",
								fontWeight: 620,
								marginTop: "16px",
								opacity: .68
							},
							children: ["对话预设", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "迁移对话预设",
								value: presetId,
								onChange: (event) => {
									selectPreset(event.target.value);
								},
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "9px",
									boxSizing: "border-box",
									color: "inherit",
									display: "block",
									font: "inherit",
									marginTop: "7px",
									padding: "9px 10px",
									width: "100%"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "不使用预设"
								}), presets?.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: entry.id,
									children: entry.name
								}, entry.id))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "11px",
								lineHeight: 1.55,
								marginTop: "6px",
								opacity: .5
							},
							children: presetError !== void 0 ? presetError : presets === void 0 ? "正在读取预设…" : presets.length === 0 ? "预设库暂无内容" : (() => {
								const preset = presets.find((entry) => entry.id === presetId);
								return preset === void 0 ? "迁移后的会话不启用酒馆预设" : `${preset.enabledCount}/${preset.promptCount} 项启用${preset.regexScriptCount === 0 ? "" : ` · ${preset.regexScriptCount} 条正则`}`;
							})()
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "22px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy || chatFile === void 0,
								onClick: () => {
									if (chatFile === void 0) return;
									setBusy(true);
									setError(void 0);
									onImport(chatFile, cardFile, presetId === "" ? void 0 : presetId).then(onClose, (reason) => {
										setError(reason instanceof Error ? reason.message : String(reason));
										setBusy(false);
									});
								},
								style: primaryButtonStyle,
								children: busy ? "正在迁移…" : "创建新会话"
							})]
						})
					]
				})
			});
		}
		function PersonaManagerDialog({ current, listPersonas, savePersona, deletePersona, onApply, onClose }) {
			const [entries, setEntries] = (0, react.useState)();
			const [selectedId, setSelectedId] = (0, react.useState)(current?.id ?? "");
			const [editingId, setEditingId] = (0, react.useState)();
			const [editing, setEditing] = (0, react.useState)(false);
			const [name, setName] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)();
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let active = true;
				listPersonas().then((value) => {
					if (active) setEntries(value);
				}, (reason) => {
					if (active) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					active = false;
				};
			}, [listPersonas]);
			const selected = entries?.find((entry) => entry.id === selectedId) ?? (current?.id === selectedId ? current : void 0);
			const edit = (persona) => {
				setEditing(true);
				setEditingId(persona?.id);
				setName(persona?.name ?? "");
				setDescription(persona?.description ?? "");
				setConfirmDelete(false);
				setError(void 0);
			};
			const apply = (persona) => {
				setBusy("apply");
				setError(void 0);
				onApply(persona).then(onClose, (reason) => {
					setBusy(void 0);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "管理你的身份",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.58)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1220
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && busy === void 0) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.42)",
						maxHeight: "min(720px, calc(100vh - 36px))",
						overflowY: "auto",
						padding: "22px",
						width: "min(94vw, 520px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "12px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									fontSize: "18px",
									margin: 0
								},
								children: "你的身份"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									lineHeight: 1.55,
									margin: "6px 0 0",
									opacity: .55
								},
								children: "更改从下一次回复开始生效，不会改写已有聊天"
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭身份管理",
								disabled: busy !== void 0,
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "23px",
									marginLeft: "auto",
									padding: "4px"
								},
								children: "×"
							})]
						}),
						current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								borderRadius: "10px",
								fontSize: "12px",
								lineHeight: 1.6,
								marginTop: "18px",
								opacity: .62,
								padding: "11px 12px"
							},
							children: "当前会话没有设置 Persona"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: `color-mix(in srgb, ${color} 11%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
								borderRadius: "10px",
								marginTop: "18px",
								padding: "11px 12px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "11px",
										opacity: .5
									},
									children: "当前会话"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontSize: "14px",
										marginTop: "3px"
									},
									children: current.name
								}),
								current.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.6,
										marginTop: "5px",
										opacity: .62,
										whiteSpace: "pre-wrap"
									},
									children: current.description
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								marginTop: "18px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "agent-rp-persona-manager-select",
								style: {
									fontSize: "12px",
									fontWeight: 620,
									opacity: .64
								},
								children: "选择已保存的身份"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									edit();
								},
								style: {
									background: "transparent",
									border: 0,
									color,
									cursor: "pointer",
									font: "inherit",
									fontSize: "12px",
									marginLeft: "auto",
									padding: 0
								},
								children: "新建"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							id: "agent-rp-persona-manager-select",
							value: selectedId,
							disabled: entries === void 0 || busy !== void 0,
							onChange: (event) => {
								setSelectedId(event.target.value);
								setConfirmDelete(false);
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "9px",
								boxSizing: "border-box",
								color: "inherit",
								font: "inherit",
								marginTop: "7px",
								padding: "9px 10px",
								width: "100%"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: entries === void 0 ? "正在读取…" : entries.length === 0 ? "还没有保存的身份" : "选择身份"
								}),
								entries?.map((persona) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: persona.id,
									children: persona.name
								}, persona.id)),
								current !== void 0 && entries?.some((persona) => persona.id === current.id) === false && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: current.id,
									children: [current.name, "（会话快照）"]
								})
							]
						}),
						selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { marginTop: "8px" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "12px",
									lineHeight: 1.6,
									opacity: .58,
									whiteSpace: "pre-wrap"
								},
								children: selected.description || "只有称呼，没有额外人物设定"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "12px",
									marginTop: "8px"
								},
								children: [
									entries?.some((entry) => entry.id === selected.id) === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											edit(selected);
										},
										style: {
											background: "transparent",
											border: 0,
											color,
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											padding: 0
										},
										children: "编辑"
									}),
									entries?.some((entry) => entry.id === selected.id) === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy !== void 0,
										onClick: () => {
											if (!confirmDelete) {
												setConfirmDelete(true);
												return;
											}
											setBusy("delete");
											setError(void 0);
											deletePersona(selected.id).then(() => {
												setEntries((value) => (value ?? []).filter((entry) => entry.id !== selected.id));
												setSelectedId(current?.id === selected.id ? current.id : "");
												setConfirmDelete(false);
												setBusy(void 0);
											}, (reason) => {
												setBusy(void 0);
												setError(reason instanceof Error ? reason.message : String(reason));
											});
										},
										style: {
											background: "transparent",
											border: 0,
											color: confirmDelete ? "#e88989" : "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											opacity: confirmDelete ? 1 : .48,
											padding: 0
										},
										children: busy === "delete" ? "正在移除…" : confirmDelete ? "确认从身份库移除" : "从身份库移除"
									}),
									confirmDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setConfirmDelete(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											opacity: .48,
											padding: 0
										},
										children: "取消"
									})
								]
							})]
						}),
						editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "10px",
								display: "grid",
								gap: "9px",
								marginTop: "14px",
								padding: "11px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: name,
									maxLength: 120,
									placeholder: "称呼（角色会这样称呼你）",
									onChange: (event) => {
										setName(event.target.value);
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #414147)",
										borderRadius: "8px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										padding: "8px 9px",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: description,
									maxLength: 12e3,
									rows: 4,
									placeholder: "身份、外貌、性格，或你与角色的关系",
									onChange: (event) => {
										setDescription(event.target.value);
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #414147)",
										borderRadius: "8px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										lineHeight: 1.55,
										padding: "8px 9px",
										resize: "vertical",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: "8px",
										justifyContent: "flex-end"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setEditing(false);
											setEditingId(void 0);
											setName("");
											setDescription("");
										},
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "8px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											padding: "7px 10px"
										},
										children: "取消编辑"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy !== void 0 || name.trim() === "",
										onClick: () => {
											setBusy("save");
											setError(void 0);
											savePersona({
												format: 0,
												...editingId === void 0 ? {} : { id: editingId },
												name,
												description
											}).then((entry) => {
												setEntries((value) => [entry, ...(value ?? []).filter((item) => item.id !== entry.id)]);
												setSelectedId(entry.id);
												setEditing(false);
												setEditingId(void 0);
												setName("");
												setDescription("");
												setBusy(void 0);
												apply({
													id: entry.id,
													name: entry.name,
													description: entry.description
												});
											}, (reason) => {
												setBusy(void 0);
												setError(reason instanceof Error ? reason.message : String(reason));
											});
										},
										style: {
											background: color,
											border: 0,
											borderRadius: "8px",
											color: "#fff",
											cursor: "pointer",
											font: "inherit",
											opacity: name.trim() === "" ? .45 : 1,
											padding: "7px 11px"
										},
										children: busy === "save" ? "正在保存…" : "保存并应用"
									})]
								})
							]
						}) : null,
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e88989",
								fontSize: "12px",
								lineHeight: 1.55,
								margin: "12px 0 0"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "20px",
								paddingTop: "14px"
							},
							children: [
								current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy !== void 0,
									onClick: () => {
										apply();
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #444)",
										borderRadius: "9px",
										color: "inherit",
										cursor: "pointer",
										font: "inherit",
										marginRight: "auto",
										padding: "8px 12px"
									},
									children: "清除当前身份"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy !== void 0,
									onClick: onClose,
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #444)",
										borderRadius: "9px",
										color: "inherit",
										cursor: "pointer",
										font: "inherit",
										padding: "8px 12px"
									},
									children: "关闭"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: selected === void 0 || busy !== void 0,
									onClick: () => {
										if (selected !== void 0) apply({
											id: selected.id,
											name: selected.name,
											description: selected.description
										});
									},
									style: {
										background: color,
										border: 0,
										borderRadius: "9px",
										color: "#fff",
										cursor: "pointer",
										font: "inherit",
										opacity: selected === void 0 ? .45 : 1,
										padding: "8px 13px"
									},
									children: busy === "apply" ? "正在应用…" : "应用到本会话"
								})
							]
						})
					]
				})
			});
		}
		function BlankRoleplayLauncher({ session, sessionId, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, migrateChat, startCharacterSession, listPresets, listPersonas, savePersona, deletePersona, workspaceSettings, workspaceList }) {
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [migrationOpen, setMigrationOpen] = (0, react.useState)(false);
			const settingsSnapshot = (0, react.useSyncExternalStore)(workspaceSettings.subscribe, workspaceSettings.getSnapshot, workspaceSettings.getSnapshot);
			const workspace = (0, react.useSyncExternalStore)(workspaceList.subscribe, workspaceList.getSnapshot, workspaceList.getSnapshot).items.find((item) => item.sessionIds.includes(sessionId));
			if (!session.blank || !allowsAgentRpEntry(settingsSnapshot.value, workspace?.workspaceId)) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setLibraryOpen(true);
					},
					style: {
						alignItems: "center",
						background: `color-mix(in srgb, ${color} 14%, transparent)`,
						border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
						borderRadius: "8px",
						color: "inherit",
						cursor: "pointer",
						display: "inline-flex",
						font: "inherit",
						fontSize: "12px",
						fontWeight: 620,
						gap: "6px",
						padding: "5px 9px",
						whiteSpace: "nowrap"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							color,
							fontSize: "15px",
							lineHeight: 1
						},
						children: "✦"
					}), "选择角色"]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						setMigrationOpen(true);
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "8px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "12px",
						padding: "5px 9px",
						whiteSpace: "nowrap"
					},
					children: "迁移聊天"
				}),
				libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryDialog, {
					currentCharacterName: "",
					listCharacters,
					readCharacter,
					setCharacterArchived,
					importCharacterFile,
					onClose: () => {
						setLibraryOpen(false);
					},
					onStart: (character, greetingIndex, persona, presetId) => startCharacterSession(sessionId, character, greetingIndex, persona, presetId),
					listPresets,
					listPersonas,
					savePersona,
					deletePersona
				}),
				migrationOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SillyTavernImportDialog, {
					listPresets,
					onClose: () => {
						setMigrationOpen(false);
					},
					onImport: (chatFile, cardFile, presetId) => migrateChat(sessionId, chatFile, cardFile, presetId)
				})
			] });
		}
		const settingsFieldStyle = {
			background: "var(--dsw-alias-bg-layer-1, #202024)",
			border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
			borderRadius: "8px",
			boxSizing: "border-box",
			color: "inherit",
			font: "inherit",
			fontSize: "12px",
			minWidth: 0,
			padding: "8px 9px",
			width: "100%"
		};
		function nextImageProfileName(profiles, provider) {
			const base = provider === "openai" ? "OpenAI 配置" : provider === "novelai" ? "NovelAI 配置" : provider === "a1111" ? "A1111 配置" : "ComfyUI 配置";
			const names = new Set(profiles.map((profile) => profile.name.toLowerCase()));
			if (!names.has(base.toLowerCase())) return base;
			let suffix = 2;
			while (names.has(`${base} ${suffix}`.toLowerCase())) suffix += 1;
			return `${base} ${suffix}`;
		}
		function ImageGenerationSettingsPanel({ settings, writable, onSave }) {
			const activeProfile = settings.imageProfiles.find((profile) => profile.id === settings.activeImageProfileId) ?? settings.imageProfiles[0];
			const [draft, setDraft] = (0, react.useState)(settings.imageGeneration);
			const [profileName, setProfileName] = (0, react.useState)(activeProfile.name);
			const [credential, setCredential] = (0, react.useState)();
			const [credentialValue, setCredentialValue] = (0, react.useState)("");
			const [credentialBusy, setCredentialBusy] = (0, react.useState)(false);
			const [testBusy, setTestBusy] = (0, react.useState)(false);
			const [deleteArmed, setDeleteArmed] = (0, react.useState)(false);
			const [testResult, setTestResult] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				setDraft(settings.imageGeneration);
				setProfileName(activeProfile.name);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			}, [
				settings.imageGeneration,
				activeProfile.id,
				activeProfile.name
			]);
			(0, react.useEffect)(() => {
				let active = true;
				setCredential(void 0);
				setCredentialValue("");
				imageCredentialInfo(draft.provider).then((value) => {
					if (active) setCredential(value);
				}, (reason) => {
					if (active) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					active = false;
				};
			}, [draft.provider]);
			const saveCredential = (change) => {
				setCredentialBusy(true);
				setError(void 0);
				updateImageCredential(draft.provider, change).then((value) => {
					setCredential(value);
					setCredentialValue("");
					setTestResult(void 0);
				}, (reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setCredentialBusy(false);
				});
			};
			const testConnection = () => {
				setTestBusy(true);
				setError(void 0);
				setTestResult(void 0);
				testConfiguredImageProvider(draft).then(setTestResult, (reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setTestBusy(false);
				});
			};
			const editDraft = (update) => {
				setDraft(update);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			};
			const dirty = profileName.trim() !== activeProfile.name || JSON.stringify(draft) !== JSON.stringify(settings.imageGeneration);
			const selectProfile = (id) => {
				if (dirty) {
					setError("请先保存或还原当前档案，再切换配置");
					return;
				}
				const selected = settings.imageProfiles.find((profile) => profile.id === id);
				if (selected === void 0) return;
				onSave({
					...settings,
					activeImageProfileId: selected.id,
					imageGeneration: selected.settings
				});
			};
			const createProfile = () => {
				const profile = {
					id: crypto.randomUUID(),
					name: nextImageProfileName(settings.imageProfiles, draft.provider),
					settings: draft
				};
				onSave({
					...settings,
					activeImageProfileId: profile.id,
					imageGeneration: profile.settings,
					imageProfiles: [...settings.imageProfiles, profile]
				});
			};
			const saveProfile = () => {
				const name = profileName.trim();
				if (name === "") {
					setError("配置名称不能为空");
					return;
				}
				if (settings.imageProfiles.some((profile) => profile.id !== activeProfile.id && profile.name.toLowerCase() === name.toLowerCase())) {
					setError("已有同名的图片配置");
					return;
				}
				onSave({
					...settings,
					imageGeneration: draft,
					imageProfiles: settings.imageProfiles.map((profile) => profile.id === activeProfile.id ? {
						...profile,
						name,
						settings: draft
					} : profile)
				});
			};
			const deleteProfile = () => {
				if (settings.imageProfiles.length <= 1) return;
				if (!deleteArmed) {
					setDeleteArmed(true);
					return;
				}
				const remaining = settings.imageProfiles.filter((profile) => profile.id !== activeProfile.id);
				const selected = remaining[0];
				onSave({
					...settings,
					activeImageProfileId: selected.id,
					imageGeneration: selected.settings,
					imageProfiles: remaining
				});
			};
			const restoreProfile = () => {
				setDraft(settings.imageGeneration);
				setProfileName(activeProfile.name);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			};
			const labelStyle = {
				display: "grid",
				fontSize: "12px",
				gap: "6px",
				opacity: writable ? 1 : .62
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #34343a)",
					marginTop: "28px",
					paddingTop: "24px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							fontSize: "15px",
							margin: 0
						},
						children: "聊天插图"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "12px",
							lineHeight: 1.6,
							margin: "7px 0 16px",
							opacity: .58
						},
						children: "只在你点“绘图”后调用；图片保存在本机，不会作为图片输入送进角色模型"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "end",
							display: "flex",
							flexWrap: "wrap",
							gap: "9px",
							marginBottom: "15px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									flex: "1 1 190px"
								},
								children: ["配置档案", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									"aria-label": "配置档案",
									value: activeProfile.id,
									disabled: !writable,
									onChange: (event) => {
										selectProfile(event.target.value);
									},
									style: settingsFieldStyle,
									children: settings.imageProfiles.map((profile) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: profile.id,
										children: profile.name
									}, profile.id))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									flex: "1 1 190px"
								},
								children: ["配置名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									"aria-label": "配置名称",
									value: profileName,
									disabled: !writable,
									maxLength: 80,
									onChange: (event) => {
										setProfileName(event.target.value);
										setError(void 0);
										setDeleteArmed(false);
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !writable,
									onClick: createProfile,
									style: secondaryButtonStyle,
									children: "新建副本"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !writable || settings.imageProfiles.length <= 1,
									onClick: deleteProfile,
									style: secondaryButtonStyle,
									children: deleteArmed ? "确认删除" : "删除"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: labelStyle,
						children: ["图片服务", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: draft.provider,
							disabled: !writable || credentialBusy,
							onChange: (event) => {
								editDraft((current) => ({
									...current,
									provider: event.target.value
								}));
							},
							style: settingsFieldStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "openai",
									children: "OpenAI Images / 兼容接口"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "novelai",
									children: "NovelAI V4.5"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "a1111",
									children: "A1111 / Forge"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "comfyui",
									children: "ComfyUI"
								})
							]
						})]
					}),
					draft.provider === "openai" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["接口地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.openai.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["模型", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.openai.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["尺寸", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.openai.size,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												size: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1024x1024",
											children: "1024 × 1024"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1024x1536",
											children: "1024 × 1536（竖图）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1536x1024",
											children: "1536 × 1024（横图）"
										})
									]
								})]
							})
						]
					}) : draft.provider === "novelai" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["NovelAI 图片接口", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.novelai.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["V4.5 模型", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "nai-diffusion-4-5-full",
										children: "V4.5 Full"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "nai-diffusion-4-5-curated",
										children: "V4.5 Curated"
									})]
								})]
							}),
							[
								["宽度", "width"],
								["高度", "height"],
								["步数", "steps"],
								["引导强度", "scale"],
								["CFG Rescale", "cfgRescale"]
							].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.novelai[field],
									disabled: !writable,
									step: field === "scale" || field === "cfgRescale" ? .01 : 1,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												[field]: Number(event.target.value)
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["采样器", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.sampler,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												sampler: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_euler",
											children: "Euler"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_euler_ancestral",
											children: "Euler Ancestral"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_dpmpp_2m",
											children: "DPM++ 2M"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_dpmpp_sde",
											children: "DPM++ SDE"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["噪声调度", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.noiseSchedule,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												noiseSchedule: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "karras",
											children: "Karras"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "native",
											children: "Native"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "exponential",
											children: "Exponential"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "polyexponential",
											children: "Polyexponential"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.novelai.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: "12px 18px",
									gridColumn: "1 / -1"
								},
								children: [
									["质量增强", "quality"],
									["SMEA", "smea"],
									["SMEA DYN", "smeaDyn"]
								].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										alignItems: "center",
										display: "flex",
										fontSize: "12px",
										gap: "7px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draft.novelai[field],
										disabled: !writable || field === "smeaDyn" && !draft.novelai.smea,
										onChange: (event) => {
											editDraft((current) => ({
												...current,
												novelai: {
													...current.novelai,
													[field]: event.target.checked
												}
											}));
										}
									}), label]
								}, field))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "11px",
									gridColumn: "1 / -1",
									lineHeight: 1.6,
									margin: "-2px 0 0",
									opacity: .58
								},
								children: "当前接入 V4.5 文生图；每次绘图会按 NovelAI 规则消耗 Anlas，暂不包含 Vibe Transfer、角色参考与局部重绘。"
							})
						]
					}) : draft.provider === "a1111" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["接口地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["模型（留空使用 WebUI 当前模型）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							[
								["宽度", "width"],
								["高度", "height"],
								["步数", "steps"],
								["CFG", "cfgScale"]
							].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.a1111[field],
									disabled: !writable,
									onChange: (event) => {
										const value = Number(event.target.value);
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												[field]: value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["采样器", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.sampler,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												sampler: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.a1111.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["ComfyUI 服务地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.comfyui.endpoint,
									disabled: !writable,
									placeholder: "http://127.0.0.1:8188",
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							[["宽度", "width"], ["高度", "height"]].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.comfyui[field],
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												[field]: Number(event.target.value)
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.comfyui.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["API 格式工作流", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.comfyui.workflow,
									disabled: !writable,
									rows: 12,
									spellCheck: false,
									placeholder: "在 ComfyUI 中打开“开发者模式”，导出 API 格式工作流，再把正向提示词改成 {{prompt}}",
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												workflow: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: {
									fontSize: "11px",
									gridColumn: "1 / -1",
									lineHeight: 1.6,
									margin: "-3px 0 0",
									opacity: .58
								},
								children: [
									"必填：",
									"{{prompt}}",
									"。可选：",
									"{{negative_prompt}}",
									"、",
									"{{width}}",
									"、",
									"{{height}}",
									"、",
									"{{seed}}",
									"。 插件会保留节点和连线，只替换这些占位符。"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "end",
							display: "grid",
							gap: "9px",
							gridTemplateColumns: "minmax(0, 1fr) auto",
							marginTop: "15px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: labelStyle,
							children: [
								draft.provider === "novelai" ? "NovelAI Access Token" : "服务密钥",
								"（按图片服务独立保存）",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "new-password",
									value: credentialValue,
									placeholder: credential?.configured === true ? `已配置${credential.source === void 0 ? "" : ` · ${credential.source}`}` : draft.provider === "openai" ? "OpenAI / 兼容接口密钥" : draft.provider === "novelai" ? "NovelAI Access Token（必填）" : "无鉴权可留空",
									disabled: credentialBusy || credential?.writable === false,
									onChange: (event) => {
										setCredentialValue(event.target.value);
									},
									style: settingsFieldStyle
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "7px"
							},
							children: [credential?.configured === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: credentialBusy || !credential.writable,
								onClick: () => {
									saveCredential({ clear: true });
								},
								style: secondaryButtonStyle,
								children: "移除密钥"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: credentialBusy || credentialValue.trim() === "" || credential?.writable === false,
								onClick: () => {
									saveCredential({ value: credentialValue });
								},
								style: secondaryButtonStyle,
								children: credentialBusy ? "正在保存…" : credential?.configured === true ? "更换密钥" : "保存密钥"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: "8px",
							justifyContent: "flex-end",
							marginTop: "14px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable || testBusy || (draft.provider === "openai" || draft.provider === "novelai") && credential?.configured !== true,
								onClick: testConnection,
								style: secondaryButtonStyle,
								children: testBusy ? "正在测试…" : "测试连接"
							}),
							dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable,
								onClick: restoreProfile,
								style: secondaryButtonStyle,
								children: "还原"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable || !dirty,
								onClick: saveProfile,
								style: primaryButtonStyle,
								children: "保存当前档案"
							})
						]
					}),
					testResult !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: {
							color: testResult.status === "verified" ? "var(--dsw-alias-state-success, #5dbb84)" : "var(--dsw-alias-state-warning, #d6a955)",
							fontSize: "12px",
							margin: "10px 0 0"
						},
						children: testResult.detail
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							margin: "10px 0 0"
						},
						children: error
					})
				]
			});
		}
		function WorkspaceSettingsSection({ workspaceSettings, workspaceList }) {
			const snapshot = (0, react.useSyncExternalStore)(workspaceSettings.subscribe, workspaceSettings.getSnapshot, workspaceSettings.getSnapshot);
			const workspaceSnapshot = (0, react.useSyncExternalStore)(workspaceList.subscribe, workspaceList.getSnapshot, workspaceList.getSnapshot);
			const settings = snapshot.value;
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const writable = snapshot.status === "ready" && !saving;
			const write = (next) => {
				setSaving(true);
				setError(void 0);
				workspaceSettings.set(next).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setSaving(false);
				});
			};
			const toggleWorkspace = (workspaceId) => {
				const selected = settings.workspaceIds.includes(workspaceId);
				write({
					...settings,
					workspaceIds: selected ? settings.workspaceIds.filter((id) => id !== workspaceId) : [...settings.workspaceIds, workspaceId]
				});
			};
			const choiceStyle = (active) => ({
				alignItems: "center",
				background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : "transparent",
				border: `1px solid ${active ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--dsw-alias-border-l2, #3d3d43)"}`,
				borderRadius: "10px",
				color: "inherit",
				cursor: writable ? "pointer" : "default",
				display: "flex",
				font: "inherit",
				gap: "10px",
				padding: "11px 13px",
				textAlign: "left",
				width: "100%"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					margin: "0 auto",
					maxWidth: "720px",
					padding: "8px 4px 32px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							fontSize: "18px",
							margin: "0 0 8px"
						},
						children: "Agent RP"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "13px",
							lineHeight: 1.6,
							margin: "0 0 22px",
							opacity: .62
						},
						children: "控制哪些工作区显示“选择角色”和“迁移聊天”快捷入口，已有角色会话不受影响"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !writable,
							style: choiceStyle(settings.workspaceMode === "all"),
							onClick: () => {
								write({
									...settings,
									workspaceMode: "all"
								});
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color: settings.workspaceMode === "all" ? color : "inherit" },
								children: settings.workspaceMode === "all" ? "●" : "○"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "全部工作区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "12px",
									opacity: .55
								},
								children: "每个工作区都显示“选择角色”和“迁移聊天”"
							})] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !writable,
							style: choiceStyle(settings.workspaceMode === "selected"),
							onClick: () => {
								write({
									...settings,
									workspaceMode: "selected"
								});
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color: settings.workspaceMode === "selected" ? color : "inherit" },
								children: settings.workspaceMode === "selected" ? "●" : "○"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "仅指定工作区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "12px",
									opacity: .55
								},
								children: "只在下面勾选的工作区显示入口"
							})] })]
						})]
					}),
					settings.workspaceMode === "selected" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { marginTop: "22px" },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								style: {
									fontSize: "13px",
									margin: "0 0 9px"
								},
								children: "工作区"
							}),
							workspaceSnapshot.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: 0,
									opacity: .55
								},
								children: "还没有可选的工作区"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
									borderRadius: "11px",
									overflow: "hidden"
								},
								children: workspaceSnapshot.items.map((workspace, index) => {
									const checked = settings.workspaceIds.includes(workspace.workspaceId);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											alignItems: "center",
											borderTop: index === 0 ? "none" : "1px solid var(--dsw-alias-border-l2, #3d3d43)",
											cursor: writable ? "pointer" : "default",
											display: "flex",
											gap: "11px",
											padding: "11px 13px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked,
											disabled: !writable,
											onChange: () => {
												toggleWorkspace(workspace.workspaceId);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: { minWidth: 0 },
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													display: "block",
													fontSize: "13px",
													fontWeight: 580
												},
												children: workspace.title
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													display: "block",
													fontSize: "11px",
													marginTop: "2px",
													opacity: .45,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: workspace.path
											})]
										})]
									}, workspace.workspaceId);
								})
							}),
							settings.workspaceIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: "10px 0 0",
									opacity: .58
								},
								children: "尚未选择工作区，新的角色入口会暂时隐藏"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationSettingsPanel, {
						settings,
						writable,
						onSave: write
					}),
					snapshot.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: {
							fontSize: "12px",
							marginTop: "14px",
							opacity: .55
						},
						children: "正在读取设置…"
					}),
					snapshot.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							marginTop: "14px"
						},
						children: snapshot.error
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							marginTop: "14px"
						},
						children: error
					})
				]
			});
		}
		function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar, renameSession, configurePreset, importPreset, managePresetLibrary, configureWorldInfo, importWorldInfo, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, migrateChat, startCharacterSession, listPresets, listPersonas, savePersona, deletePersona, applyPersona, loadModelCapabilities }) {
			const summary = useSessions((state) => state.byId[sessionId]);
			const projection = roleplaySummary(summary, useProjection("agentRp"));
			const [open, setOpen] = (0, react.useState)(false);
			const [statusOpen, setStatusOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [worldInfoOpen, setWorldInfoOpen] = (0, react.useState)(false);
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [migrationOpen, setMigrationOpen] = (0, react.useState)(false);
			const [personaOpen, setPersonaOpen] = (0, react.useState)(false);
			const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
			const [aliasDraft, setAliasDraft] = (0, react.useState)("");
			const [aliasError, setAliasError] = (0, react.useState)();
			const [renaming, setRenaming] = (0, react.useState)(false);
			const viewMode = useRoleplayViewMode(sessionId);
			const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
			const expressionChoice = useRoleplayExpression(sessionId);
			const rootRef = (0, react.useRef)(null);
			const settingsRef = (0, react.useRef)(null);
			const settingsSummaryRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!settingsOpen) return;
				const closeOutside = (event) => {
					if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettingsOpen(false);
				};
				const closeWithEscape = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					setSettingsOpen(false);
					settingsSummaryRef.current?.focus();
				};
				document.addEventListener("pointerdown", closeOutside);
				document.addEventListener("keydown", closeWithEscape);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
					document.removeEventListener("keydown", closeWithEscape);
				};
			}, [settingsOpen]);
			(0, react.useLayoutEffect)(() => {
				if (viewMode === "debug") return;
				const root = rootRef.current;
				const header = root?.closest("header");
				if (root == null || header == null) return;
				const actionSiblings = Array.from(root.parentElement?.children ?? []).filter((element) => element !== root && element instanceof HTMLElement);
				const secondaryTabs = Array.from(header.querySelectorAll("[role=\"tablist\"] [role=\"tab\"]")).slice(1);
				return hideWhileMounted([
					header.querySelector("nav[aria-label]"),
					...actionSiblings,
					...secondaryTabs
				]);
			}, [projection !== void 0, viewMode]);
			if (projection === void 0) return null;
			const displayName = roleplayDisplayName(summary, projection);
			const displayProjection = displayName === projection.characterName ? projection : {
				...projection,
				characterName: displayName
			};
			const expression = expressionChoice === "default" ? void 0 : characterDetail?.imageAssets.find((asset) => (asset.type === "emotion" || asset.type === "expression") && asset.index === expressionChoice);
			const expressionUrl = expression === void 0 || projection.avatarLibraryId === void 0 ? void 0 : characterLibraryImageUrl(projection.avatarLibraryId, expression.index);
			const imported = projection.importedMessageCount > 0;
			const status = projection.frontend === void 0 || projection.mvu === void 0 ? void 0 : renderCharacterDisplay(statusPlaceholder, {
				name: projection.characterName,
				frontend: projection.frontend
			}, 2, 0, projection.userName, projection.preset?.regexScripts);
			const statusHtml = status === void 0 || status === statusPlaceholder ? void 0 : splitCharacterDisplay(status).find((segment) => segment.kind === "html")?.source;
			const statusSource = statusHtml === void 0 || projection.mvu === void 0 ? void 0 : cardFrameSource(statusHtml, projection.mvu.statData, characterDetail);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rootRef,
					"data-agent-rp-header": true,
					style: {
						alignItems: "center",
						display: "flex",
						gap: "10px",
						marginRight: "auto",
						minWidth: 0
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
							projection: displayProjection,
							loadAvatar,
							...expressionUrl === void 0 ? {} : { imageUrl: expressionUrl }
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "baseline",
									display: "flex",
									gap: "8px",
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										fontSize: "15px",
										fontWeight: 620,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: displayName
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "11px",
										opacity: .48,
										whiteSpace: "nowrap"
									},
									children: imported ? "已迁移对话" : "角色对话"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "12px",
									marginTop: "2px",
									opacity: .55,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: characterCapabilitySummary(projection)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setOpen(true);
							},
							style: {
								background: "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #444)",
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								marginLeft: "8px",
								padding: "6px 10px"
							},
							children: "角色信息"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setLibraryOpen(true);
							},
							style: {
								background: `color-mix(in srgb, ${color} 10%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: "角色库"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setPersonaOpen(true);
							},
							style: {
								background: projection.persona === void 0 ? "transparent" : `color-mix(in srgb, ${color} 12%, transparent)`,
								border: `1px solid ${projection.persona === void 0 ? "var(--dsw-alias-border-l2, #444)" : `color-mix(in srgb, ${color} 34%, transparent)`}`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: ["身份", projection.persona === void 0 ? "" : ` · ${projection.persona.name}`]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							ref: settingsRef,
							open: settingsOpen,
							onToggle: (event) => {
								setSettingsOpen(event.currentTarget.open);
							},
							style: { position: "relative" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
								ref: settingsSummaryRef,
								role: "button",
								"aria-expanded": settingsOpen,
								"aria-haspopup": "menu",
								style: {
									background: projection.worldInfo.activeCount > 0 ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
									border: "1px solid var(--dsw-alias-border-l2, #444)",
									borderRadius: "8px",
									color: "inherit",
									cursor: "pointer",
									fontSize: "12px",
									listStyle: "none",
									padding: "6px 10px",
									whiteSpace: "nowrap"
								},
								children: "会话设置"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "menu",
								"aria-label": "角色会话设置",
								style: {
									background: "var(--dsw-alias-bg-base, #171719)",
									border: "1px solid var(--dsw-alias-border-l2, #39393c)",
									borderRadius: "10px",
									boxShadow: "0 14px 38px rgba(0,0,0,.36)",
									display: "grid",
									gap: "3px",
									minWidth: "168px",
									padding: "6px",
									position: "absolute",
									right: 0,
									top: "calc(100% + 7px)",
									zIndex: 80
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setMigrationOpen(true);
										},
										style: headerMenuItemStyle,
										children: "迁移聊天"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setPresetOpen(true);
										},
										style: headerMenuItemStyle,
										children: "预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setWorldInfoOpen(true);
										},
										style: headerMenuItemStyle,
										children: ["世界书", projection.worldInfo.activeCount === 0 ? "" : ` · ${projection.worldInfo.activeCount}`]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										"aria-pressed": viewMode === "debug",
										onClick: () => {
											setSettingsOpen(false);
											setRoleplayViewMode(sessionId, viewMode === "immersive" ? "debug" : "immersive");
										},
										style: headerMenuItemStyle,
										children: viewMode === "debug" ? "返回沉浸视图" : "打开调试视图"
									})
								]
							})]
						}),
						statusSource !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setStatusOpen(true);
							},
							style: {
								background: `color-mix(in srgb, ${color} 12%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: "当前状态"
						})
					]
				}),
				migrationOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SillyTavernImportDialog, {
					listPresets,
					onClose: () => {
						setMigrationOpen(false);
					},
					onImport: (chatFile, cardFile, presetId) => migrateChat(sessionId, chatFile, cardFile, presetId)
				}),
				personaOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PersonaManagerDialog, {
					...projection.persona === void 0 ? {} : { current: projection.persona },
					listPersonas,
					savePersona,
					deletePersona,
					onApply: (persona) => applyPersona(sessionId, persona),
					onClose: () => {
						setPersonaOpen(false);
					}
				}),
				open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "dialog",
					"aria-modal": "true",
					"aria-label": `${displayName}的角色信息`,
					style: {
						alignItems: "stretch",
						background: "rgba(0,0,0,.48)",
						display: "flex",
						inset: 0,
						justifyContent: "flex-end",
						position: "fixed",
						zIndex: 1e3
					},
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) setOpen(false);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						style: {
							background: "var(--dsw-alias-bg-base, #171719)",
							borderLeft: "1px solid var(--dsw-alias-border-l2, #39393c)",
							boxShadow: "-18px 0 44px rgba(0,0,0,.2)",
							maxWidth: "92vw",
							overflowY: "auto",
							padding: "24px",
							width: "380px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									gap: "13px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
										projection: displayProjection,
										loadAvatar,
										...expressionUrl === void 0 ? {} : { imageUrl: expressionUrl },
										size: 54
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
											style: {
												fontSize: "18px",
												margin: 0
											},
											children: displayName
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: "12px",
												marginTop: "5px",
												opacity: .52
											},
											children: projection.cardVersion === void 0 ? "角色会话" : `角色卡 V${projection.cardVersion}`
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭角色信息",
										onClick: () => {
											setOpen(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "22px",
											marginLeft: "auto",
											padding: "4px"
										},
										children: "×"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: "7px",
									marginTop: "20px"
								},
								children: [
									projection.userName !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: ["你是 ", projection.userName]
									}),
									projection.importedMessageCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [projection.importedMessageCount, " 条历史消息"]
									}),
									projection.worldInfoCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [projection.worldInfoCount, " 条世界书设定"]
									}),
									(projection.frontend?.regexScripts.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"轻前端 · ",
											projection.frontend?.regexScripts.length,
											" 条显示规则"
										]
									}),
									(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"酒馆脚本 · ",
											projection.frontend?.tavernHelperScriptNames.length,
											" 个启用 · 隔离运行"
										]
									}),
									projection.mvu !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: ["MVU · 已接通", projection.mvu.updateCount === 0 ? "" : ` · ${projection.mvu.updateCount} 次更新`]
									}),
									(characterDetail?.imageAssets.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"卡片资源 · ",
											characterDetail?.imageAssets.length,
											" 张图片"
										]
									}),
									projection.preset !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"预设 · ",
											projection.preset.name,
											" · ",
											projection.preset.enabledCount,
											"/",
											projection.preset.promptCount,
											" 项启用"
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
								style: { marginTop: "20px" },
								onSubmit: (event) => {
									event.preventDefault();
									const alias = aliasDraft.trim();
									if (alias === "") {
										setAliasError("显示名不能为空");
										return;
									}
									setRenaming(true);
									setAliasError(void 0);
									renameSession(sessionId, alias).then(() => {
										setRenaming(false);
									}, (error) => {
										setRenaming(false);
										setAliasError(error instanceof Error ? error.message : String(error));
									});
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										htmlFor: `agent-rp-alias-${sessionId}`,
										style: {
											display: "block",
											fontSize: "12px",
											fontWeight: 600,
											marginBottom: "7px",
											opacity: .56
										},
										children: "显示名"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: "8px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: `agent-rp-alias-${sessionId}`,
											value: aliasDraft,
											placeholder: displayName,
											onChange: (event) => {
												setAliasDraft(event.target.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "8px",
												color: "inherit",
												flex: 1,
												font: "inherit",
												minWidth: 0,
												padding: "7px 9px"
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "submit",
											disabled: renaming,
											style: {
												background: `color-mix(in srgb, ${color} 14%, transparent)`,
												border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
												borderRadius: "8px",
												color: "inherit",
												cursor: renaming ? "wait" : "pointer",
												font: "inherit",
												padding: "7px 10px"
											},
											children: renaming ? "保存中" : "保存"
										})]
									}),
									aliasError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											marginTop: "6px"
										},
										children: aliasError
									}),
									projection.originalCharacterName !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: "11px",
											lineHeight: 1.5,
											marginTop: "7px",
											opacity: .48
										},
										children: ["原始卡名：", projection.originalCharacterName]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "角色简介",
								text: projection.description
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "性格",
								text: projection.personality
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "当前场景",
								text: projection.scenario
							}),
							projection.persona !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: `Persona · ${projection.persona.name}`,
								text: projection.persona.description || "没有额外人物设定"
							}),
							characterDetail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterAssetsSection, {
								detail: characterDetail,
								sessionId
							}),
							projection.preset !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "运行预设",
								text: [
									`${projection.preset.promptCount} 个提示模块，当前启用 ${projection.preset.enabledCount} 个`,
									projection.preset.appliedGeneration.length === 0 ? "没有可直接映射的生成参数" : `已映射：${projection.preset.appliedGeneration.join("、")}`,
									projection.preset.preservedGeneration.length === 0 ? "" : `已保留但当前 Host 未应用：${projection.preset.preservedGeneration.join("、")}`,
									projection.preset.degradedRoleCount === 0 ? "" : `${projection.preset.degradedRoleCount} 项非 system 角色按 Host 兼容模式注入`,
									projection.preset.preservedInChatCount === 0 ? "" : `${projection.preset.preservedInChatCount} 项聊天内注入已保留；当前 Host 暂不执行`,
									projection.preset.regexScriptCount === 0 ? "" : `${projection.preset.enabledRegexScriptCount}/${projection.preset.regexScriptCount} 条正则启用`,
									projection.preset.activeDisplayRegexCount === 0 ? "" : `${projection.preset.activeDisplayRegexCount} 条显示规则正在运行`,
									projection.preset.preservedPromptRegexCount === 0 ? "" : `${projection.preset.preservedPromptRegexCount} 条生成规则已保留；等待 Host 提供独立模型消息视图`,
									...projection.preset.extensionStatus.map((item) => `${item.name}：${item.detail}`)
								].filter(Boolean).join("\n")
							}),
							projection.source === "sillytavern-chat" && projection.cardVersion === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "13px",
									lineHeight: 1.7,
									marginTop: "22px",
									opacity: .62
								},
								children: "当前只迁移了聊天记录，没有对应角色卡；再次迁移时可将角色卡和 JSONL 放在同一条消息中"
							})
						]
					})
				}),
				statusOpen && statusSource !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusDialog, {
					characterName: displayName,
					source: statusSource,
					onClose: () => {
						setStatusOpen(false);
					}
				}),
				libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryDialog, {
					currentCharacterName: projection.characterName,
					listCharacters,
					readCharacter,
					setCharacterArchived,
					importCharacterFile,
					onClose: () => {
						setLibraryOpen(false);
					},
					onStart: (character, greetingIndex, persona, presetId) => startCharacterSession(sessionId, character, greetingIndex, persona, presetId),
					listPresets,
					listPersonas,
					savePersona,
					deletePersona
				}),
				presetOpen && (projection.preset === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetImportDialog, {
					entries: projection.presetLibrary,
					onClose: () => {
						setPresetOpen(false);
					},
					onImport: (file) => importPreset(sessionId, file),
					onLibrary: (request) => managePresetLibrary(sessionId, request)
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetManagerDialog, {
					sessionId,
					preset: projection.preset,
					lastRequest: projection.lastRequest,
					entries: projection.presetLibrary,
					loadModelCapabilities,
					onClose: () => {
						setPresetOpen(false);
					},
					onImport: (file) => importPreset(sessionId, file),
					onSave: (request) => configurePreset(sessionId, request),
					onLibrary: (request) => managePresetLibrary(sessionId, request)
				})),
				worldInfoOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorldInfoManagerDialog, {
					worldInfo: projection.worldInfo,
					onClose: () => {
						setWorldInfoOpen(false);
					},
					onImport: (file) => importWorldInfo(sessionId, file),
					onSave: (request) => configureWorldInfo(sessionId, request)
				})
			] });
		}
		function worldInfoEntryTitle(entry) {
			return entry.name?.trim() || entry.comment?.trim() || entry.keys[0] || (entry.constant ? "常驻设定" : `条目 ${entry.sourceId}`);
		}
		function worldInfoReason(entry) {
			switch (entry.reason) {
				case "active-constant": return {
					title: "正在生效",
					detail: "这是常驻条目，会进入下一次回复的提示"
				};
				case "active-keyword": return {
					title: "正在生效",
					detail: `当前对话命中了${entry.matchedKeys.length === 0 ? "关键词" : `“${entry.matchedKeys.join("”“")}”`}`
				};
				case "disabled": return {
					title: "已关闭",
					detail: "打开条目后才会参与匹配"
				};
				case "deleted": return {
					title: "已从本会话移除",
					detail: "原始卡片仍完整保留，可以随时恢复"
				};
				case "empty-content": return {
					title: "没有内容",
					detail: "条目正文为空，不会进入提示"
				};
				case "decorator-unsupported": return {
					title: "暂不执行",
					detail: "正文含有酒馆装饰器；内容已保留，但当前运行层不会执行"
				};
				case "template-unsupported": return {
					title: "暂不执行",
					detail: "正文含有可执行模板；内容已保留，但当前运行层不会执行"
				};
				case "regex-unsupported": return {
					title: "暂不执行",
					detail: "该条目使用正则关键词；当前只执行确定性的文字匹配"
				};
				case "primary-unmatched": return {
					title: "等待关键词",
					detail: entry.keys.length === 0 ? "没有可用于激活的主关键词" : "当前已发送的对话没有命中主关键词"
				};
				case "secondary-unmatched": return {
					title: "次要条件未满足",
					detail: "主关键词已经出现，但次要关键词规则尚未满足"
				};
				case "budget-excluded": return {
					title: "超出预算",
					detail: "条目已匹配，但本书的 token 预算优先保留了其他条目"
				};
			}
		}
		function editableFromProjection(entry) {
			return {
				...entry.name === void 0 ? {} : { name: entry.name },
				...entry.comment === void 0 ? {} : { comment: entry.comment },
				keys: entry.keys,
				secondaryKeys: entry.secondaryKeys,
				content: entry.content,
				enabled: entry.enabled,
				insertionOrder: entry.insertionOrder,
				selective: entry.selective,
				constant: entry.constant,
				caseSensitive: entry.caseSensitive,
				matchWholeWords: entry.matchWholeWords,
				secondaryLogic: entry.secondaryLogic,
				...entry.scanDepth === void 0 ? {} : { scanDepth: entry.scanDepth },
				position: entry.position,
				...entry.priority === void 0 ? {} : { priority: entry.priority },
				ignoreBudget: entry.ignoreBudget
			};
		}
		function WorldInfoManagerDialog({ worldInfo, onClose, onImport, onSave }) {
			const importInputRef = (0, react.useRef)(null);
			const first = worldInfo.books.flatMap((book) => book.entries.map((entry) => `${book.id}\u0000${entry.index}`))[0];
			const [selectedKey, setSelectedKey] = (0, react.useState)(first);
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)();
			const [saving, setSaving] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (selectedKey === void 0 && first !== void 0) setSelectedKey(first);
			}, [first, selectedKey]);
			const pair = worldInfo.books.flatMap((book) => book.entries.map((entry) => ({
				book,
				entry
			}))).find(({ book, entry }) => `${book.id}\u0000${entry.index}` === selectedKey) ?? worldInfo.books.flatMap((book) => book.entries.map((entry) => ({
				book,
				entry
			})))[0];
			(0, react.useEffect)(() => {
				if (pair === void 0 || editing) return;
				setDraft(editableFromProjection(pair.entry));
			}, [
				pair?.book.id,
				pair?.entry.index,
				pair?.entry.modified,
				pair?.entry.deleted,
				editing
			]);
			const book = pair?.book;
			const entry = pair?.entry;
			const reason = entry === void 0 ? void 0 : worldInfoReason(entry);
			const hasOverrides = worldInfo.books.some((item) => item.entries.some((candidate) => candidate.modified || candidate.deleted));
			const mutate = (request, after) => {
				setSaving(true);
				setError(void 0);
				onSave(request).then(() => {
					setSaving(false);
					after?.();
				}, (saveError) => {
					setSaving(false);
					setError(saveError instanceof Error ? saveError.message : String(saveError));
				});
			};
			const importFile = (file) => {
				setImporting(true);
				setError(void 0);
				onImport(file).then(() => {
					setImporting(false);
				}, (importError) => {
					setImporting(false);
					setError(importError instanceof Error ? importError.message : String(importError));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "世界书",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.55)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "20px",
					position: "fixed",
					zIndex: 1002
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 24px 90px rgba(0,0,0,.38)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "calc(100vh - 40px)",
						maxWidth: "1080px",
						overflow: "hidden",
						width: "min(1080px, calc(100vw - 40px))"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								borderBottom: "1px solid var(--dsw-alias-border-l2, #39393c)",
								display: "flex",
								gap: "12px",
								padding: "17px 20px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "18px",
										margin: 0
									},
									children: "世界书"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "12px",
										marginTop: "4px",
										opacity: .52
									},
									children: [
										worldInfo.books.length,
										" 本 · ",
										worldInfo.books.reduce((sum, item) => sum + item.entries.length, 0),
										" 条 · 当前激活 ",
										worldInfo.activeCount,
										" 条"
									]
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: importInputRef,
									type: "file",
									accept: "application/json,.json",
									hidden: true,
									onChange: (event) => {
										const file = event.currentTarget.files?.[0];
										event.currentTarget.value = "";
										if (file !== void 0) importFile(file);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										importInputRef.current?.click();
									},
									style: {
										...generationButtonStyle,
										marginLeft: "auto"
									},
									children: importing ? "导入中…" : "导入世界书"
								}),
								hasOverrides && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: saving,
									onClick: () => {
										mutate({
											operation: "reset-all",
											revision: worldInfo.revision
										}, () => {
											setEditing(false);
										});
									},
									style: generationButtonStyle,
									children: "全部恢复原始设置"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "关闭世界书",
									onClick: onClose,
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: "pointer",
										fontSize: "23px",
										padding: "3px 6px"
									},
									children: "×"
								})
							]
						}),
						pair === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								flex: 1,
								flexDirection: "column",
								justifyContent: "center",
								minHeight: "300px",
								padding: "30px",
								textAlign: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "28px",
										opacity: .38
									},
									children: "◇"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									style: {
										fontSize: "16px",
										margin: "14px 0 0"
									},
									children: "还没有世界书"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										margin: "8px 0 0",
										maxWidth: "430px",
										opacity: .58
									},
									children: "导入 SillyTavern World Info JSON 后会立即用于这段角色对话，不需要发送消息，也不会交给模型判断"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										importInputRef.current?.click();
									},
									style: {
										...primaryButtonStyle,
										marginTop: "18px"
									},
									children: importing ? "正在导入…" : "选择世界书 JSON"
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "alert",
									style: {
										color: "#e88989",
										fontSize: "12px",
										lineHeight: 1.55,
										marginTop: "14px"
									},
									children: error
								})
							]
						}),
						pair !== void 0 && book !== void 0 && entry !== void 0 && reason !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flex: 1,
								flexWrap: "wrap",
								minHeight: 0,
								overflowY: "auto"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
								"aria-label": "世界书条目",
								style: {
									borderRight: "1px solid var(--dsw-alias-border-l2, #39393c)",
									boxSizing: "border-box",
									flex: "1 1 250px",
									maxWidth: "330px",
									minWidth: "230px",
									padding: "12px 10px 18px"
								},
								children: worldInfo.books.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									style: { marginBottom: "15px" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "baseline",
											display: "flex",
											fontSize: "11px",
											fontWeight: 650,
											gap: "6px",
											opacity: .5,
											padding: "4px 8px 7px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: item.name
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												marginLeft: "auto",
												whiteSpace: "nowrap"
											},
											children: item.source === "character" ? "角色卡" : "外部"
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gap: "5px"
										},
										children: item.entries.map((candidate) => {
											const key = `${item.id}\u0000${candidate.index}`;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												"aria-current": key === selectedKey,
												onClick: () => {
													setSelectedKey(key);
													setEditing(false);
													setError(void 0);
												},
												style: {
													alignItems: "center",
													background: key === selectedKey ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
													border: key === selectedKey ? `1px solid color-mix(in srgb, ${color} 34%, transparent)` : "1px solid transparent",
													borderRadius: "9px",
													color: "inherit",
													cursor: "pointer",
													display: "grid",
													font: "inherit",
													gridTemplateColumns: "8px minmax(0, 1fr)",
													gap: "8px",
													padding: "9px 8px",
													textAlign: "left"
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													style: {
														background: candidate.active ? "#75c79a" : candidate.deleted || !candidate.enabled ? "#6d6d72" : "#c5a769",
														borderRadius: "50%",
														height: "7px",
														width: "7px"
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: { minWidth: 0 },
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: {
															display: "block",
															fontSize: "12px",
															fontWeight: 580,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: worldInfoEntryTitle(candidate)
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: {
															display: "block",
															fontSize: "10px",
															marginTop: "3px",
															opacity: .45
														},
														children: [worldInfoReason(candidate).title, candidate.modified ? " · 已修改" : ""]
													})]
												})]
											}, key);
										})
									})]
								}, item.id))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
								style: {
									boxSizing: "border-box",
									flex: "2 1 480px",
									minWidth: 0,
									padding: "22px 24px 28px"
								},
								children: [
									!editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "flex-start",
												display: "flex",
												gap: "12px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: { minWidth: 0 },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													style: {
														fontSize: "17px",
														margin: 0
													},
													children: worldInfoEntryTitle(entry)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: "11px",
														marginTop: "5px",
														opacity: .48
													},
													children: [
														book.name,
														" · #",
														entry.sourceId,
														" · 顺序 ",
														entry.insertionOrder
													]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													background: entry.active ? "rgba(76,178,119,.13)" : "var(--dsw-alias-bg-layer-1, #222226)",
													border: `1px solid ${entry.active ? "rgba(91,200,139,.33)" : "var(--dsw-alias-border-l2, #414146)"}`,
													borderRadius: "999px",
													fontSize: "11px",
													marginLeft: "auto",
													padding: "5px 9px",
													whiteSpace: "nowrap"
												},
												children: reason.title
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											style: {
												fontSize: "12px",
												lineHeight: 1.6,
												margin: "14px 0 0",
												opacity: .6
											},
											children: reason.detail
										}),
										(entry.matchedKeys.length > 0 || entry.matchedSecondaryKeys.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: "6px",
												marginTop: "12px"
											},
											children: [...entry.matchedKeys, ...entry.matchedSecondaryKeys].map((key, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													...chipStyle,
													color: "#91d8ae"
												},
												children: ["命中 · ", key]
											}, `${key}-${index}`))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #39393c)",
												borderRadius: "11px",
												marginTop: "18px",
												padding: "14px 15px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													fontSize: "11px",
													fontWeight: 650,
													opacity: .48
												},
												children: "设定正文"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													fontSize: "13px",
													lineHeight: 1.72,
													marginTop: "8px",
													maxHeight: "240px",
													overflowY: "auto",
													whiteSpace: "pre-wrap"
												},
												children: entry.content || "（空）"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "grid",
												gap: "12px",
												gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
												marginTop: "17px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "主关键词",
													text: entry.constant ? "常驻，无需关键词" : entry.keys.join("、") || "未设置"
												}),
												entry.selective && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "次要关键词",
													text: entry.secondaryKeys.join("、") || "未设置"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "注入位置",
													text: entry.position === "before_char" ? "角色设定之前" : "角色设定之后"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "估算占用",
													text: `约 ${entry.approximateTokens} tokens${book.tokenBudget === void 0 ? "" : ` · 本书预算 ${book.tokenBudget}`}`
												})
											]
										}),
										(entry.useRegex || entry.hasDecorators || book.recursiveScanning || book.degradations.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
											style: {
												fontSize: "12px",
												lineHeight: 1.65,
												marginTop: "17px",
												opacity: .68
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
												style: { cursor: "pointer" },
												children: "兼容性信息"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: { marginTop: "7px" },
												children: [
													entry.useRegex ? "正则关键词已保留，当前不执行" : "",
													entry.hasDecorators ? "装饰器已保留，当前不执行" : "",
													book.recursiveScanning ? "递归扫描已保留，当前不执行" : "",
													...book.degradations
												].filter(Boolean).join("\n")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: "8px",
												marginTop: "22px"
											},
											children: [
												!entry.deleted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "toggle",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index,
															enabled: !entry.enabled
														});
													},
													style: generationButtonStyle,
													children: entry.enabled ? "关闭条目" : "打开条目"
												}),
												!entry.deleted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														setDraft(editableFromProjection(entry));
														setEditing(true);
													},
													style: generationButtonStyle,
													children: "编辑"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "delete",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index,
															deleted: !entry.deleted
														});
													},
													style: generationButtonStyle,
													children: entry.deleted ? "恢复条目" : "从本会话移除"
												}),
												(entry.modified || entry.deleted) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "reset-entry",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index
														});
													},
													style: {
														...generationButtonStyle,
														marginLeft: "auto"
													},
													children: "恢复原始条目"
												})
											]
										})
									] }),
									editing && draft !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorldInfoEntryEditor, {
										draft,
										saving,
										onCancel: () => {
											setEditing(false);
											setError(void 0);
										},
										onSave: (value) => mutate({
											operation: "edit",
											revision: worldInfo.revision,
											bookId: book.id,
											entryIndex: entry.index,
											entry: value
										}, () => {
											setEditing(false);
										})
									}),
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											lineHeight: 1.55,
											marginTop: "14px"
										},
										children: error
									})
								]
							})]
						}) })
					]
				})
			});
		}
		function WorldInfoEntryEditor({ draft, saving, onCancel, onSave }) {
			const [value, setValue] = (0, react.useState)(draft);
			const inputStyle = {
				background: "var(--dsw-alias-bg-layer-1, #202024)",
				border: "1px solid var(--dsw-alias-border-l2, #414146)",
				borderRadius: "8px",
				boxSizing: "border-box",
				color: "inherit",
				font: "inherit",
				padding: "8px 9px",
				width: "100%"
			};
			const list = (source) => source.split(/[,，\n]/u).map((item) => item.trim()).filter(Boolean);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				onSubmit: (event) => {
					event.preventDefault();
					onSave(value);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						alignItems: "center",
						display: "flex",
						gap: "10px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "编辑世界书条目"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "11px",
								marginTop: "5px",
								opacity: .48
							},
							children: "修改只作用于当前会话，原文件不会被覆盖"
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onCancel,
							style: {
								...generationButtonStyle,
								marginLeft: "auto"
							},
							children: "取消"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: saving || value.content.trim() === "",
							style: {
								...generationButtonStyle,
								opacity: value.content.trim() === "" ? .35 : 1
							},
							children: saving ? "保存中…" : "保存"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: "13px",
						marginTop: "19px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: { fontSize: "12px" },
							children: ["名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: value.name ?? "",
								onChange: (event) => {
									setValue((current) => ({
										...current,
										name: event.target.value
									}));
								},
								style: {
									...inputStyle,
									marginTop: "6px"
								},
								placeholder: "可选；留白时显示首个关键词"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: { fontSize: "12px" },
							children: ["设定正文", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: value.content,
								rows: 8,
								onChange: (event) => {
									setValue((current) => ({
										...current,
										content: event.target.value
									}));
								},
								style: {
									...inputStyle,
									lineHeight: 1.65,
									marginTop: "6px",
									resize: "vertical"
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "12px",
								gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: { fontSize: "12px" },
								children: ["主关键词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: value.keys.join("\n"),
									rows: 3,
									disabled: value.constant,
									onChange: (event) => {
										setValue((current) => ({
											...current,
											keys: list(event.target.value)
										}));
									},
									style: {
										...inputStyle,
										lineHeight: 1.5,
										marginTop: "6px",
										opacity: value.constant ? .45 : 1,
										resize: "vertical"
									},
									placeholder: "每行或逗号分隔"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: { fontSize: "12px" },
								children: ["次要关键词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: value.secondaryKeys.join("\n"),
									rows: 3,
									disabled: !value.selective || value.constant,
									onChange: (event) => {
										setValue((current) => ({
											...current,
											secondaryKeys: list(event.target.value)
										}));
									},
									style: {
										...inputStyle,
										lineHeight: 1.5,
										marginTop: "6px",
										opacity: !value.selective || value.constant ? .45 : 1,
										resize: "vertical"
									},
									placeholder: "每行或逗号分隔"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "14px 20px"
							},
							children: [
								["enabled", "启用条目"],
								["constant", "常驻"],
								["selective", "使用次要关键词"],
								["caseSensitive", "区分大小写"],
								["matchWholeWords", "完整词匹配"],
								["ignoreBudget", "忽略预算"]
							].map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									alignItems: "center",
									display: "flex",
									fontSize: "12px",
									gap: "7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: value[key],
									onChange: (event) => {
										setValue((current) => ({
											...current,
											[key]: event.target.checked
										}));
									}
								}), label]
							}, key))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "12px",
								gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["注入位置", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										value: value.position,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												position: event.target.value
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "before_char",
											children: "角色设定之前"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "after_char",
											children: "角色设定之后"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["次要条件", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										disabled: !value.selective,
										value: value.secondaryLogic,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												secondaryLogic: event.target.value
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px",
											opacity: value.selective ? 1 : .45
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "and-any",
												children: "任意命中"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "and-all",
												children: "全部命中"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "not-any",
												children: "全部不出现"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "not-all",
												children: "不是全部出现"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["顺序", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										value: value.insertionOrder,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												insertionOrder: Number(event.target.value)
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["扫描深度", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										value: value.scanDepth ?? "",
										placeholder: "继承世界书",
										onChange: (event) => {
											setValue((current) => {
												const next = { ...current };
												if (event.target.value === "") delete next.scanDepth;
												else next.scanDepth = Number(event.target.value);
												return next;
											});
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										}
									})]
								})
							]
						})
					]
				})]
			});
		}
		function CharacterLibraryDialog({ currentCharacterName, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, listPresets, listPersonas, savePersona, deletePersona, onClose, onStart }) {
			const narrow = useNarrowCharacterLibrary();
			const startsInCurrentSession = currentCharacterName === "";
			const [collection, setCollection] = (0, react.useState)("active");
			const [characterQuery, setCharacterQuery] = (0, react.useState)("");
			const [entries, setEntries] = (0, react.useState)();
			const [selected, setSelected] = (0, react.useState)();
			const [greetingIndex, setGreetingIndex] = (0, react.useState)(0);
			const { entries: presets, error: presetError, presetId, selectPreset } = usePresetPreference(listPresets);
			const [personas, setPersonas] = (0, react.useState)();
			const [personaId, setPersonaId] = (0, react.useState)("");
			const [editingPersona, setEditingPersona] = (0, react.useState)(false);
			const [personaEditorId, setPersonaEditorId] = (0, react.useState)();
			const [personaName, setPersonaName] = (0, react.useState)("");
			const [personaDescription, setPersonaDescription] = (0, react.useState)("");
			const [savingPersona, setSavingPersona] = (0, react.useState)(false);
			const [confirmingPersonaId, setConfirmingPersonaId] = (0, react.useState)();
			const [removingPersonaId, setRemovingPersonaId] = (0, react.useState)();
			const [loadingId, setLoadingId] = (0, react.useState)();
			const [starting, setStarting] = (0, react.useState)(false);
			const [updating, setUpdating] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [draggingFile, setDraggingFile] = (0, react.useState)(false);
			const [actionNotice, setActionNotice] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const fileInputRef = (0, react.useRef)(null);
			const selectionRequestRef = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				let current = true;
				selectionRequestRef.current += 1;
				setEntries(void 0);
				setSelected(void 0);
				setError(void 0);
				listCharacters(collection).then((value) => {
					if (!current) return;
					setEntries(value);
					const preferred = collection === "active" ? value.find((entry) => entry.displayName === currentCharacterName) ?? value[0] : value[0];
					if (preferred === void 0) return;
					const request = ++selectionRequestRef.current;
					setLoadingId(preferred.id);
					readCharacter(preferred.id).then((detail) => {
						if (!current || selectionRequestRef.current !== request) return;
						setSelected(detail);
						setGreetingIndex(0);
						setLoadingId(void 0);
					}, (readError) => {
						if (!current || selectionRequestRef.current !== request) return;
						setLoadingId(void 0);
						setError(readError instanceof Error ? readError.message : String(readError));
					});
				}, (listError) => {
					if (!current) return;
					setEntries([]);
					setError(listError instanceof Error ? listError.message : String(listError));
				});
				return () => {
					current = false;
				};
			}, [
				collection,
				currentCharacterName,
				listCharacters,
				readCharacter
			]);
			(0, react.useEffect)(() => {
				let current = true;
				listPersonas().then((value) => {
					if (!current) return;
					setPersonas(value);
					setPersonaId("");
				}, (listError) => {
					if (!current) return;
					setPersonas([]);
					setError(listError instanceof Error ? listError.message : String(listError));
				});
				return () => {
					current = false;
				};
			}, [listPersonas]);
			const choose = (entry) => {
				const request = ++selectionRequestRef.current;
				setLoadingId(entry.id);
				setError(void 0);
				readCharacter(entry.id).then((detail) => {
					if (selectionRequestRef.current !== request) return;
					setSelected(detail);
					setGreetingIndex(0);
					setLoadingId(void 0);
				}, (readError) => {
					if (selectionRequestRef.current !== request) return;
					setLoadingId(void 0);
					setError(readError instanceof Error ? readError.message : String(readError));
				});
			};
			const updateArchiveState = () => {
				if (selected === void 0) return;
				const archived = collection === "active";
				const displayName = selected.displayName;
				setUpdating(true);
				setError(void 0);
				setCharacterArchived(selected.id, archived).then(() => listCharacters(collection)).then((value) => {
					setEntries(value);
					const normalizedQuery = characterQuery.trim().toLocaleLowerCase();
					const next = value.find((entry) => normalizedQuery === "" || [
						entry.displayName,
						entry.name,
						entry.originalFilename
					].some((text) => text.toLocaleLowerCase().includes(normalizedQuery)));
					if (next === void 0) {
						setSelected(void 0);
						setLoadingId(void 0);
						setUpdating(false);
						setActionNotice(`${archived ? "已收起" : "已恢复"}「${displayName}」`);
						return;
					}
					setLoadingId(next.id);
					return readCharacter(next.id).then((detail) => {
						setSelected(detail);
						setGreetingIndex(0);
						setLoadingId(void 0);
						setUpdating(false);
						setActionNotice(`${archived ? "已收起" : "已恢复"}「${displayName}」`);
					});
				}).catch((updateError) => {
					setLoadingId(void 0);
					setUpdating(false);
					setError(updateError instanceof Error ? updateError.message : String(updateError));
				});
			};
			const importFile = (file) => {
				setImporting(true);
				setDraggingFile(false);
				setError(void 0);
				setActionNotice(void 0);
				importCharacterFile(file).then((result) => listCharacters("active").then((value) => ({
					result,
					value
				}))).then(({ result, value }) => {
					const { entry, outcome } = result;
					setCollection("active");
					setCharacterQuery("");
					setEntries(value);
					setSelected(entry);
					setGreetingIndex(0);
					setLoadingId(void 0);
					setImporting(false);
					setActionNotice(outcome === "created" ? `已加入角色库「${entry.displayName}」` : outcome === "restored" ? `已恢复「${entry.displayName}」` : `角色库中已有「${entry.displayName}」`);
				}).catch((importError) => {
					setImporting(false);
					setError(importError instanceof Error ? importError.message : String(importError));
				});
			};
			const normalizedCharacterQuery = characterQuery.trim().toLocaleLowerCase();
			const visibleEntries = (entries ?? []).filter((entry) => normalizedCharacterQuery === "" || [
				entry.displayName,
				entry.name,
				entry.originalFilename
			].some((text) => text.toLocaleLowerCase().includes(normalizedCharacterQuery)));
			const duplicateNames = new Set((entries ?? []).filter((entry, index, all) => all.findIndex((candidate) => candidate.displayName === entry.displayName) !== index).map((entry) => entry.displayName));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "角色库",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.52)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "clamp(8px, 3vw, 24px)",
					position: "fixed",
					zIndex: 1001
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 22px 80px rgba(0,0,0,.36)",
						display: "grid",
						gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(min(210px, 42%), .78fr) minmax(0, 1.35fr)",
						gridTemplateRows: narrow ? "minmax(240px, .8fr) minmax(0, 1.2fr)" : void 0,
						height: "min(680px, calc(100vh - clamp(16px, 6vw, 48px)))",
						maxWidth: "980px",
						overflow: "hidden",
						width: "min(980px, calc(100vw - clamp(16px, 6vw, 48px)))"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							borderBottom: narrow ? "1px solid var(--dsw-alias-border-l2, #39393c)" : void 0,
							borderRight: narrow ? void 0 : "1px solid var(--dsw-alias-border-l2, #39393c)",
							display: "flex",
							flexDirection: "column",
							minHeight: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { padding: narrow ? "14px 14px 10px" : "22px 20px 14px" },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "18px",
										margin: 0
									},
									children: "角色库"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "12px",
										lineHeight: 1.55,
										margin: "7px 0 0",
										opacity: .55
									},
									children: startsInCurrentSession ? "选择角色后开始一段新对话" : "从这里开始新对话，不会改动当前聊天"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "tablist",
									"aria-label": "角色库分区",
									style: {
										background: "var(--dsw-alias-bg-layer-1, #202024)",
										borderRadius: "9px",
										display: "grid",
										gap: "3px",
										gridTemplateColumns: "1fr 1fr",
										marginTop: "14px",
										padding: "3px"
									},
									children: [["active", "角色"], ["archived", "已收起"]].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "tab",
										"aria-selected": collection === value,
										onClick: () => {
											setCollection(value);
											setCharacterQuery("");
										},
										style: {
											background: collection === value ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
											border: 0,
											borderRadius: "7px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "12px",
											fontWeight: collection === value ? 620 : 400,
											padding: "7px 8px"
										},
										children: label
									}, value))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: characterQuery,
									"aria-label": "搜索角色",
									placeholder: "搜索角色或文件名",
									onChange: (event) => {
										const value = event.target.value;
										const normalized = value.trim().toLocaleLowerCase();
										const matches = (entry) => normalized === "" || [
											entry.displayName,
											entry.name,
											entry.originalFilename
										].some((text) => text.toLocaleLowerCase().includes(normalized));
										const next = (entries ?? []).find(matches);
										setCharacterQuery(value);
										if (next === void 0) {
											selectionRequestRef.current += 1;
											setSelected(void 0);
											setLoadingId(void 0);
										} else if (selected === void 0 || !matches(selected)) choose(next);
									},
									style: {
										background: "var(--dsw-alias-bg-layer-1, #202024)",
										border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
										borderRadius: "9px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										fontSize: "12px",
										marginTop: "10px",
										outline: "none",
										padding: "8px 10px",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: fileInputRef,
									type: "file",
									accept: ".png,.json,.charx,image/png,application/json,application/zip",
									hidden: true,
									onChange: (event) => {
										const file = event.target.files?.[0];
										event.target.value = "";
										if (file !== void 0) importFile(file);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										fileInputRef.current?.click();
									},
									onDragEnter: (event) => {
										event.preventDefault();
										setDraggingFile(true);
									},
									onDragOver: (event) => {
										event.preventDefault();
										event.dataTransfer.dropEffect = "copy";
										setDraggingFile(true);
									},
									onDragLeave: (event) => {
										if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFile(false);
									},
									onDrop: (event) => {
										event.preventDefault();
										const file = event.dataTransfer.files[0];
										if (file === void 0) setDraggingFile(false);
										else importFile(file);
									},
									style: {
										background: draggingFile ? `color-mix(in srgb, ${color} 16%, transparent)` : "transparent",
										border: `1px dashed ${draggingFile ? `color-mix(in srgb, ${color} 65%, transparent)` : "var(--dsw-alias-border-l2, #444)"}`,
										borderRadius: "9px",
										color: "inherit",
										cursor: importing ? "wait" : "pointer",
										display: "block",
										font: "inherit",
										marginTop: "10px",
										opacity: importing ? .58 : 1,
										padding: "9px 10px",
										textAlign: "left",
										width: "100%"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											display: "block",
											fontSize: "12px",
											fontWeight: 620
										},
										children: importing ? "正在导入…" : draggingFile ? "松开即可导入" : "导入角色卡"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											display: "block",
											fontSize: "10px",
											marginTop: "3px",
											opacity: .5
										},
										children: "PNG · JSON · CHARX，也可拖到这里"
									})]
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "6px",
								minHeight: 0,
								overflowX: "hidden",
								overflowY: "auto",
								padding: "4px 10px 18px"
							},
							children: [
								entries === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										opacity: .55,
										padding: "16px 10px"
									},
									children: "正在读取角色…"
								}),
								entries?.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										opacity: .62,
										padding: "16px 10px"
									},
									children: collection === "active" ? "角色库还是空的。导入一张角色卡后，它会自动保存在这里" : "还没有收起的角色"
								}),
								entries !== void 0 && entries.length > 0 && visibleEntries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										opacity: .62,
										padding: "16px 10px"
									},
									children: "没有找到匹配的角色"
								}),
								visibleEntries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": selected?.id === entry.id,
									onClick: () => {
										choose(entry);
									},
									style: {
										alignItems: "center",
										background: selected?.id === entry.id ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
										border: selected?.id === entry.id ? `1px solid color-mix(in srgb, ${color} 36%, transparent)` : "1px solid transparent",
										borderRadius: "10px",
										color: "inherit",
										cursor: "pointer",
										display: "flex",
										font: "inherit",
										gap: "10px",
										padding: "9px",
										textAlign: "left"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryAvatar, { entry }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: "13px",
												fontWeight: 620,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: [entry.displayName, loadingId === entry.id ? " · 读取中" : ""]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: "11px",
												marginTop: "5px",
												opacity: .5,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: [
												duplicateNames.has(entry.displayName) ? `同名 · ${entry.originalFilename} · ${new Date(entry.importedAt).toLocaleString("zh-CN", { hour12: false })} · ` : "",
												"V",
												entry.cardVersion,
												" · ",
												entry.greetingCount,
												" 个开场",
												entry.worldInfoCount === 0 ? "" : ` · ${entry.worldInfoCount} 条世界书`,
												entry.imageAssetCount === 0 ? "" : ` · ${entry.imageAssetCount} 张图片`
											]
										})]
									})]
								}, entry.id))
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							minHeight: 0
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									display: "flex",
									padding: "18px 20px 12px"
								},
								children: [
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryAvatar, {
										entry: selected,
										size: 42
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											marginLeft: selected === void 0 ? 0 : "11px",
											minWidth: 0
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													fontSize: "12px",
													opacity: .5
												},
												children: startsInCurrentSession ? "设置新的角色对话" : "开始一段新的角色对话"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													display: "block",
													fontSize: "17px",
													marginTop: "3px",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: selected?.displayName ?? "选择角色"
											}),
											selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												title: selected.originalFilename,
												style: {
													display: "block",
													fontSize: "11px",
													marginTop: "3px",
													opacity: .46,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: selected.originalFilename
											})
										]
									}),
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: updating,
										onClick: updateArchiveState,
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "8px",
											color: "inherit",
											cursor: updating ? "wait" : "pointer",
											font: "inherit",
											fontSize: "12px",
											marginLeft: "auto",
											padding: "6px 10px"
										},
										children: updating ? "处理中…" : collection === "active" ? "收起角色" : "恢复角色"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭角色库",
										onClick: onClose,
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "23px",
											marginLeft: selected === void 0 ? "auto" : "8px",
											padding: "4px 6px"
										},
										children: "×"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minHeight: 0,
									overflowX: "hidden",
									overflowY: "auto",
									padding: "4px 20px 22px"
								},
								children: [
									selected === void 0 && entries !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "center",
											display: "flex",
											flexDirection: "column",
											height: "100%",
											justifyContent: "center",
											margin: "0 auto",
											maxWidth: "380px",
											minHeight: "240px",
											textAlign: "center"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												"aria-hidden": "true",
												style: {
													alignItems: "center",
													background: `color-mix(in srgb, ${color} 13%, transparent)`,
													borderRadius: "18px",
													color,
													display: "flex",
													fontSize: "24px",
													height: "54px",
													justifyContent: "center",
													width: "54px"
												},
												children: "✦"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													fontSize: "17px",
													marginTop: "16px"
												},
												children: collection === "archived" ? "这里还没有收起的角色" : entries.length === 0 ? "从一张角色卡开始" : "没有匹配的角色"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												style: {
													fontSize: "13px",
													lineHeight: 1.65,
													margin: "8px 0 0",
													opacity: .58
												},
												children: collection === "archived" ? "收起的角色会留在本机，随时可以恢复" : entries.length === 0 ? "支持 SillyTavern 的 PNG、JSON 和 CHARX。原始文件保存在本机；开始对话后，角色设定会提供给模型" : "换个关键词，或清空左侧搜索框"
											}),
											collection === "active" && entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: importing,
												onClick: () => {
													fileInputRef.current?.click();
												},
												style: {
													background: color,
													border: 0,
													borderRadius: "9px",
													color: "#fff",
													cursor: importing ? "wait" : "pointer",
													font: "inherit",
													fontWeight: 620,
													marginTop: "18px",
													opacity: importing ? .58 : 1,
													padding: "9px 15px"
												},
												children: importing ? "正在导入…" : "选择角色卡"
											})
										]
									}),
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterAssetsSection, { detail: selected }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											style: {
												display: "block",
												fontSize: "12px",
												fontWeight: 620,
												margin: "8px 0 8px",
												opacity: .65
											},
											children: "选择开场"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "grid",
												gap: "8px"
											},
											children: selected.greetings.map((greeting, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												"aria-pressed": greetingIndex === index,
												onClick: () => {
													setGreetingIndex(index);
												},
												style: {
													background: greetingIndex === index ? `color-mix(in srgb, ${color} 13%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
													border: greetingIndex === index ? `1px solid color-mix(in srgb, ${color} 38%, transparent)` : "1px solid var(--dsw-alias-border-l2, #39393c)",
													borderRadius: "10px",
													color: "inherit",
													cursor: "pointer",
													font: "inherit",
													lineHeight: 1.6,
													maxHeight: greetingIndex === index ? "170px" : "78px",
													overflow: "hidden",
													padding: "11px 12px",
													textAlign: "left",
													whiteSpace: "pre-wrap"
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														display: "block",
														fontSize: "11px",
														fontWeight: 620,
														marginBottom: "4px",
														opacity: .5
													},
													children: index === 0 ? "默认开场" : `备选开场 ${index}`
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: { fontSize: "13px" },
													children: greeting.trim() === "" ? "无开场白" : greeting
												})]
											}, index))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "agent-rp-session-preset",
											style: {
												display: "block",
												fontSize: "12px",
												fontWeight: 620,
												margin: "20px 0 8px",
												opacity: .65
											},
											children: "对话预设"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "agent-rp-session-preset",
											value: presetId,
											onChange: (event) => {
												selectPreset(event.target.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "9px",
												boxSizing: "border-box",
												color: "inherit",
												font: "inherit",
												padding: "9px 10px",
												width: "100%"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "不使用预设"
											}), presets?.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: entry.id,
												children: entry.name
											}, entry.id))]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												marginTop: "6px",
												opacity: .5
											},
											children: presetError !== void 0 ? presetError : presets === void 0 ? "正在读取预设…" : presets.length === 0 ? "预设库暂无内容，可在角色会话的预设设置中导入" : (() => {
												const preset = presets.find((entry) => entry.id === presetId);
												return preset === void 0 ? "新会话不会启用酒馆预设" : `${preset.enabledCount}/${preset.promptCount} 项启用${preset.regexScriptCount === 0 ? "" : ` · ${preset.regexScriptCount} 条正则`}`;
											})()
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												display: "flex",
												margin: "20px 0 7px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												htmlFor: "agent-rp-session-persona",
												style: {
													fontSize: "12px",
													fontWeight: 620,
													opacity: .65
												},
												children: "你的身份（Persona）"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													setEditingPersona((value) => !value);
													setPersonaEditorId(void 0);
													setPersonaName("");
													setPersonaDescription("");
													setConfirmingPersonaId(void 0);
												},
												style: {
													background: "transparent",
													border: 0,
													color,
													cursor: "pointer",
													font: "inherit",
													fontSize: "12px",
													marginLeft: "auto",
													padding: 0
												},
												children: editingPersona ? "收起" : "新建身份"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "agent-rp-session-persona",
											value: personaId,
											disabled: removingPersonaId !== void 0,
											onChange: (event) => {
												setPersonaId(event.target.value);
												setConfirmingPersonaId(void 0);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "9px",
												boxSizing: "border-box",
												color: "inherit",
												font: "inherit",
												padding: "9px 10px",
												width: "100%"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: "暂不设置"
											}), personas?.map((persona) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: persona.id,
												children: persona.name
											}, persona.id))]
										}),
										personaId !== "" && (() => {
											const persona = personas?.find((entry) => entry.id === personaId);
											if (persona === void 0) return null;
											const confirming = confirmingPersonaId === persona.id;
											const removing = removingPersonaId === persona.id;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: { marginTop: "8px" },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: {
														fontSize: "12px",
														lineHeight: 1.6,
														opacity: .58,
														whiteSpace: "pre-wrap"
													},
													children: persona.description || "只有称呼，没有额外人物设定"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: "10px",
														marginTop: "7px"
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															disabled: removing,
															onClick: () => {
																setEditingPersona(true);
																setPersonaEditorId(persona.id);
																setPersonaName(persona.name);
																setPersonaDescription(persona.description);
																setConfirmingPersonaId(void 0);
															},
															style: {
																background: "transparent",
																border: 0,
																color,
																cursor: "pointer",
																font: "inherit",
																fontSize: "11px",
																padding: 0
															},
															children: "编辑"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															disabled: removing,
															onClick: () => {
																if (!confirming) {
																	setConfirmingPersonaId(persona.id);
																	return;
																}
																setRemovingPersonaId(persona.id);
																setError(void 0);
																deletePersona(persona.id).then(() => {
																	setPersonas((current) => (current ?? []).filter((entry) => entry.id !== persona.id));
																	setPersonaId("");
																	setConfirmingPersonaId(void 0);
																	setRemovingPersonaId(void 0);
																	if (personaEditorId === persona.id) {
																		setEditingPersona(false);
																		setPersonaEditorId(void 0);
																		setPersonaName("");
																		setPersonaDescription("");
																	}
																	setActionNotice(`已移除身份「${persona.name}」`);
																}, (removeError) => {
																	setRemovingPersonaId(void 0);
																	setError(removeError instanceof Error ? removeError.message : String(removeError));
																});
															},
															style: {
																background: "transparent",
																border: 0,
																color: confirming ? "#e88989" : "inherit",
																cursor: removing ? "wait" : "pointer",
																font: "inherit",
																fontSize: "11px",
																opacity: confirming ? 1 : .48,
																padding: 0
															},
															children: removing ? "正在移除…" : confirming ? "确认移除" : "移除"
														}),
														confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															onClick: () => {
																setConfirmingPersonaId(void 0);
															},
															style: {
																background: "transparent",
																border: 0,
																color: "inherit",
																cursor: "pointer",
																font: "inherit",
																fontSize: "11px",
																opacity: .48,
																padding: 0
															},
															children: "取消"
														})
													]
												})]
											});
										})(),
										editingPersona && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "10px",
												display: "grid",
												gap: "9px",
												marginTop: "10px",
												padding: "11px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													value: personaName,
													maxLength: 120,
													placeholder: "称呼（角色会这样称呼你）",
													onChange: (event) => {
														setPersonaName(event.target.value);
													},
													style: {
														background: "transparent",
														border: "1px solid var(--dsw-alias-border-l2, #414147)",
														borderRadius: "8px",
														boxSizing: "border-box",
														color: "inherit",
														font: "inherit",
														padding: "8px 9px",
														width: "100%"
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
													value: personaDescription,
													maxLength: 12e3,
													rows: 4,
													placeholder: "你的身份、外貌、性格或与角色的关系；留白也可以",
													onChange: (event) => {
														setPersonaDescription(event.target.value);
													},
													style: {
														background: "transparent",
														border: "1px solid var(--dsw-alias-border-l2, #414147)",
														borderRadius: "8px",
														boxSizing: "border-box",
														color: "inherit",
														font: "inherit",
														lineHeight: 1.55,
														padding: "8px 9px",
														resize: "vertical",
														width: "100%"
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: savingPersona || personaName.trim() === "",
													onClick: () => {
														setSavingPersona(true);
														setError(void 0);
														const editingId = personaEditorId;
														savePersona({
															format: 0,
															...editingId === void 0 ? {} : { id: editingId },
															name: personaName,
															description: personaDescription
														}).then((entry) => {
															setPersonas((current) => [entry, ...(current ?? []).filter((item) => item.id !== entry.id)]);
															setPersonaId(entry.id);
															setEditingPersona(false);
															setPersonaEditorId(void 0);
															setSavingPersona(false);
															setActionNotice(`${editingId === void 0 ? "已保存并选中" : "已更新"}身份「${entry.name}」`);
														}, (saveError) => {
															setSavingPersona(false);
															setError(saveError instanceof Error ? saveError.message : String(saveError));
														});
													},
													style: {
														background: color,
														border: 0,
														borderRadius: "8px",
														color: "#fff",
														cursor: "pointer",
														font: "inherit",
														justifySelf: "end",
														opacity: personaName.trim() === "" ? .45 : 1,
														padding: "7px 11px"
													},
													children: savingPersona ? "正在保存…" : personaEditorId === void 0 ? "保存并选中" : "更新并选中"
												})
											]
										})
									] }),
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											lineHeight: 1.55,
											marginTop: "14px"
										},
										children: error
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
								style: {
									alignItems: "center",
									borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
									display: "flex",
									gap: "10px",
									justifyContent: "flex-end",
									padding: "14px 20px"
								},
								children: [
									actionNotice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "status",
										style: {
											fontSize: "12px",
											marginRight: "auto",
											opacity: .62
										},
										children: actionNotice
									}),
									actionNotice === void 0 && collection === "archived" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "12px",
											marginRight: "auto",
											opacity: .52
										},
										children: "恢复后可开始新的对话"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: onClose,
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "9px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											padding: "8px 13px"
										},
										children: "取消"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: collection === "archived" || selected === void 0 || starting,
										onClick: () => {
											if (selected === void 0) return;
											setStarting(true);
											setError(void 0);
											const persona = personas?.find((entry) => entry.id === personaId);
											onStart(selected, greetingIndex, persona === void 0 ? void 0 : {
												id: persona.id,
												name: persona.name,
												description: persona.description
											}, presetId === "" ? void 0 : presetId).then(() => {
												setStarting(false);
												onClose();
											}, (startError) => {
												setStarting(false);
												setError(startError instanceof Error ? startError.message : String(startError));
											});
										},
										style: {
											background: color,
											border: 0,
											borderRadius: "9px",
											color: "#fff",
											cursor: starting ? "wait" : "pointer",
											font: "inherit",
											fontWeight: 620,
											opacity: collection === "archived" || selected === void 0 ? .45 : 1,
											padding: "8px 15px"
										},
										children: starting ? "正在开始…" : "开始新对话"
									})
								]
							})
						]
					})]
				})
			});
		}
		function roleLabel(role) {
			switch (role) {
				case "system": return "系统";
				case "user": return "用户";
				case "assistant": return "助手";
			}
		}
		function PresetManagerDialog({ sessionId, preset, lastRequest, entries, loadModelCapabilities, onClose, onImport, onSave, onLibrary }) {
			const [prompts, setPrompts] = (0, react.useState)(() => preset.prompts.map((prompt) => ({ ...prompt })));
			const [regexScripts, setRegexScripts] = (0, react.useState)(() => preset.regexScripts.map((script) => ({ ...script })));
			const [temperature, setTemperature] = (0, react.useState)(preset.generation.temperature?.toString() ?? "");
			const [maxTokens, setMaxTokens] = (0, react.useState)(preset.generation.maxTokens?.toString() ?? "");
			const [reasoningEffort, setReasoningEffort] = (0, react.useState)(preset.generation.reasoningEffort ?? "");
			const [query, setQuery] = (0, react.useState)("");
			const [section, setSection] = (0, react.useState)("prompts");
			const [collapsedPromptSections, setCollapsedPromptSections] = (0, react.useState)(() => new Set(projectPresetPromptSections(preset.prompts).slice(1).map((group) => group.key)));
			const [editingPromptId, setEditingPromptId] = (0, react.useState)();
			const [promptFilter, setPromptFilter] = (0, react.useState)("all");
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [inspectionOpen, setInspectionOpen] = (0, react.useState)(false);
			const [modelCapabilities, setModelCapabilities] = (0, react.useState)({ status: "loading" });
			const importInputRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadModelCapabilities(sessionId).then((value) => {
					if (!cancelled) setModelCapabilities({
						status: "ready",
						value
					});
				}, (reason) => {
					if (!cancelled) setModelCapabilities({
						status: "error",
						error: reason instanceof Error ? reason.message : String(reason)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [loadModelCapabilities, sessionId]);
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const attachedPositionById = new Map(prompts.filter((prompt) => prompt.attached).map((prompt, position) => [prompt.identifier, position]));
			const promptModified = (prompt) => !prompt.imported || prompt.name !== prompt.importedName || prompt.role !== prompt.importedRole || prompt.content !== prompt.importedContent || prompt.injectionPosition !== prompt.importedInjectionPosition || prompt.injectionDepth !== prompt.importedInjectionDepth || prompt.injectionOrder !== prompt.importedInjectionOrder || prompt.attached !== prompt.importedAttached || prompt.attached && prompt.enabled !== prompt.importedEnabled || prompt.attached && attachedPositionById.get(prompt.identifier) !== prompt.importedPosition;
			const visiblePromptSections = projectPresetPromptSections(prompts).flatMap((group) => {
				const filteredPrompts = group.prompts.filter((prompt) => promptFilter === "all" || promptFilter === "enabled" && prompt.enabled || promptFilter === "modified" && promptModified(prompt));
				const matchingPrompts = normalizedQuery === "" || group.title.toLocaleLowerCase().includes(normalizedQuery) ? filteredPrompts : filteredPrompts.filter((prompt) => prompt.name.toLocaleLowerCase().includes(normalizedQuery) || prompt.identifier.toLocaleLowerCase().includes(normalizedQuery));
				return matchingPrompts.length === 0 ? [] : [{
					...group,
					prompts: matchingPrompts,
					enabledCount: matchingPrompts.filter((prompt) => prompt.enabled).length
				}];
			});
			const visibleRegex = regexScripts.filter((script) => normalizedQuery === "" || script.scriptName.toLocaleLowerCase().includes(normalizedQuery));
			const attached = prompts.filter((prompt) => prompt.attached);
			const enabledCount = attached.filter((prompt) => prompt.enabled).length;
			const editingPrompt = prompts.find((prompt) => prompt.identifier === editingPromptId);
			const reasoning = modelCapabilities.value?.reasoning;
			const selectedReasoning = reasoning?.efforts.find((effort) => effort.id === reasoningEffort);
			const unsupportedReasoning = reasoningEffort !== "" && reasoningEffort !== "auto" && modelCapabilities.status === "ready" && reasoning !== void 0 && selectedReasoning === void 0;
			const selectedReasoningLabel = selectedReasoning?.name ?? (reasoningEffort === "" ? "" : reasoningEffort.charAt(0).toLocaleUpperCase() + reasoningEffort.slice(1));
			const currentReasoningLabel = modelCapabilities.value?.current.reasoningEffort === void 0 ? "模型默认等级" : reasoning?.efforts.find((effort) => effort.id === modelCapabilities.value?.current.reasoningEffort)?.name ?? modelCapabilities.value.current.reasoningEffort;
			const modelLabel = modelCapabilities.value === void 0 ? void 0 : modelCapabilities.value.modelName ?? modelCapabilities.value.current.model;
			const preservedSampling = preset.preservedGeneration.filter((value) => !value.startsWith("reasoning_effort"));
			const togglePromptSection = (key) => {
				setCollapsedPromptSections((current) => {
					const next = new Set(current);
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			};
			const setPrompt = (identifier, update) => {
				setPrompts((current) => current.map((prompt) => prompt.identifier === identifier ? update(prompt) : prompt));
			};
			const setPromptContent = (identifier, content) => {
				setPrompt(identifier, (prompt) => ({
					...prompt,
					content,
					contentModified: content !== prompt.importedContent
				}));
			};
			const addPrompt = () => {
				const identifier = crypto.randomUUID();
				const prompt = {
					identifier,
					name: "新提示模块",
					importedName: "新提示模块",
					role: "system",
					importedRole: "system",
					content: "",
					importedContent: "",
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
					deletable: true
				};
				setPrompts((current) => [
					...current.filter((item) => item.attached),
					prompt,
					...current.filter((item) => !item.attached)
				]);
				setEditingPromptId(identifier);
			};
			const exportCopy = () => {
				const resolvedTemperature = temperature.trim() === "" ? void 0 : Number(temperature);
				const resolvedMaxTokens = maxTokens.trim() === "" ? void 0 : Number(maxTokens);
				if (resolvedTemperature !== void 0 && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
					setError("温度需填写 0 到 2 之间的数字");
					return;
				}
				if (resolvedMaxTokens !== void 0 && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
					setError("最大输出需填写正整数");
					return;
				}
				setError(void 0);
				const exportJson = exportSillyTavernPresetJson({
					prompts: prompts.map((prompt) => ({
						identifier: prompt.identifier,
						name: prompt.name,
						role: prompt.role,
						content: prompt.content,
						marker: prompt.marker,
						systemPrompt: prompt.systemPrompt,
						forbidOverrides: prompt.forbidOverrides,
						...prompt.injectionPosition === void 0 ? {} : { injectionPosition: prompt.injectionPosition },
						...prompt.injectionDepth === void 0 ? {} : { injectionDepth: prompt.injectionDepth },
						...prompt.injectionOrder === void 0 ? {} : { injectionOrder: prompt.injectionOrder }
					})),
					order: prompts.filter((prompt) => prompt.attached).map((prompt) => ({
						identifier: prompt.identifier,
						enabled: prompt.enabled
					})),
					generation: {
						...preset.generation.topP === void 0 ? {} : { topP: preset.generation.topP },
						...preset.generation.topK === void 0 ? {} : { topK: preset.generation.topK },
						...preset.generation.topA === void 0 ? {} : { topA: preset.generation.topA },
						...preset.generation.minP === void 0 ? {} : { minP: preset.generation.minP },
						...preset.generation.frequencyPenalty === void 0 ? {} : { frequencyPenalty: preset.generation.frequencyPenalty },
						...preset.generation.presencePenalty === void 0 ? {} : { presencePenalty: preset.generation.presencePenalty },
						...preset.generation.repetitionPenalty === void 0 ? {} : { repetitionPenalty: preset.generation.repetitionPenalty },
						...resolvedTemperature === void 0 ? {} : { temperature: resolvedTemperature },
						...resolvedMaxTokens === void 0 ? {} : { maxTokens: resolvedMaxTokens },
						...reasoningEffort === "" ? {} : { reasoningEffort }
					},
					formats: preset.formats,
					regexScripts: regexScripts.map(({ index: _index, ...script }) => script)
				});
				const blob = new Blob([exportJson], { type: "application/json;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${preset.name.replace(/[\\/:*?"<>|]+/gu, "_")} · Agent RP 副本.json`;
				anchor.click();
				anchor.remove();
				setTimeout(() => {
					URL.revokeObjectURL(url);
				}, 0);
			};
			const move = (identifier, direction) => {
				setPrompts((current) => {
					const attachedPrompts = current.filter((prompt) => prompt.attached);
					const detachedPrompts = current.filter((prompt) => !prompt.attached);
					const index = attachedPrompts.findIndex((prompt) => prompt.identifier === identifier);
					const destination = index + direction;
					if (index < 0 || destination < 0 || destination >= attachedPrompts.length) return current;
					const next = [...attachedPrompts];
					const [entry] = next.splice(index, 1);
					if (entry === void 0) return current;
					next.splice(destination, 0, entry);
					return [...next, ...detachedPrompts];
				});
			};
			const save = async (close = true) => {
				const resolvedTemperature = temperature.trim() === "" ? null : Number(temperature);
				const resolvedMaxTokens = maxTokens.trim() === "" ? null : Number(maxTokens);
				if (resolvedTemperature !== null && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
					setError("温度需填写 0 到 2 之间的数字");
					return false;
				}
				if (resolvedMaxTokens !== null && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
					setError("最大输出需填写正整数");
					return false;
				}
				setSaving(true);
				setError(void 0);
				try {
					await onSave({
						operation: "replace",
						revision: preset.revision,
						order: prompts.filter((prompt) => prompt.attached).map((prompt) => ({
							identifier: prompt.identifier,
							enabled: prompt.enabled
						})),
						prompts: prompts.map((prompt) => ({
							identifier: prompt.identifier,
							name: prompt.name,
							role: prompt.role,
							content: prompt.content,
							...prompt.injectionPosition === void 0 ? {} : { injectionPosition: prompt.injectionPosition },
							...prompt.injectionDepth === void 0 ? {} : { injectionDepth: prompt.injectionDepth },
							...prompt.injectionOrder === void 0 ? {} : { injectionOrder: prompt.injectionOrder }
						})),
						content: [],
						generation: {
							temperature: resolvedTemperature,
							maxTokens: resolvedMaxTokens,
							reasoningEffort: reasoningEffort === "" ? null : reasoningEffort
						},
						regex: regexScripts.map((script) => ({
							index: script.index,
							disabled: script.disabled
						}))
					});
					if (close) onClose();
					return true;
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "预设保存失败");
					return false;
				} finally {
					setSaving(false);
				}
			};
			const reset = async () => {
				setSaving(true);
				setError(void 0);
				try {
					await onSave({
						operation: "reset",
						revision: preset.revision
					});
					onClose();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "恢复预设默认值失败");
				} finally {
					setSaving(false);
				}
			};
			const saveToLibrary = async () => {
				const name = window.prompt("新预设名称", `${preset.name} · 副本`)?.trim();
				if (name === void 0 || name === "") return;
				if (!await save(false)) return;
				setSaving(true);
				try {
					await onLibrary({
						operation: "save",
						name
					});
					onClose();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "另存预设失败");
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "agent-rp-preset-overlay",
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `${preset.name}预设管理`,
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1100
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !saving) onClose();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: presetManagerResponsiveStyle }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "agent-rp-preset-dialog",
						style: {
							background: "var(--dsw-alias-bg-base, #151518)",
							border: "1px solid var(--dsw-alias-border-l2, #38383d)",
							borderRadius: "16px",
							boxShadow: "0 24px 80px rgba(0,0,0,.45)",
							display: "flex",
							flexDirection: "column",
							maxHeight: "min(900px, 92vh)",
							maxWidth: "920px",
							overflow: "hidden",
							width: "min(96vw, 920px)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
									display: "flex",
									gap: "12px",
									padding: "18px 20px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										style: {
											fontSize: "17px",
											margin: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: preset.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: "12px",
											marginTop: "4px",
											opacity: .56
										},
										children: [
											enabledCount,
											" 项提示启用 · ",
											regexScripts.filter((script) => !script.disabled).length,
											"/",
											regexScripts.length,
											" 条正则启用 · 会话独立"
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "关闭预设管理",
									disabled: saving,
									onClick: onClose,
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: "pointer",
										fontSize: "22px",
										marginLeft: "auto",
										padding: "4px"
									},
									children: "×"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "agent-rp-preset-body",
								style: {
									display: "grid",
									flex: "1 1 auto",
									gap: "14px",
									gridTemplateColumns: "minmax(0, 1fr) 230px",
									minHeight: 0,
									padding: "16px 20px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "agent-rp-preset-list",
									style: {
										display: "flex",
										flexDirection: "column",
										minHeight: 0
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												gap: "6px",
												marginBottom: "9px"
											},
											children: [["prompts", "提示模块"], ["regex", "正则脚本"]].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													setSection(value);
													setQuery("");
												},
												style: {
													...miniButtonStyle,
													background: section === value ? `color-mix(in srgb, ${color} 16%, transparent)` : "transparent",
													borderColor: section === value ? `color-mix(in srgb, ${color} 42%, transparent)` : miniButtonStyle.border,
													height: "30px",
													padding: "3px 10px"
												},
												children: [label, value === "regex" ? ` · ${regexScripts.length}` : ""]
											}, value))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": section === "prompts" ? "搜索提示模块" : "搜索正则脚本",
											placeholder: section === "prompts" ? "搜索模块名称或标识…" : "搜索正则脚本名称…",
											value: query,
											onChange: (event) => {
												setQuery(event.target.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "9px",
												color: "inherit",
												font: "inherit",
												fontSize: "13px",
												outline: "none",
												padding: "9px 11px"
											}
										}),
										section === "prompts" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: "5px",
												marginTop: "8px"
											},
											children: [[
												["all", "全部"],
												["enabled", "已启用"],
												["modified", "已修改"]
											].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													setPromptFilter(value);
												},
												style: {
													...miniButtonStyle,
													background: promptFilter === value ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
													borderColor: promptFilter === value ? `color-mix(in srgb, ${color} 38%, transparent)` : miniButtonStyle.border
												},
												children: label
											}, value)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: addPrompt,
												style: {
													...miniButtonStyle,
													marginLeft: "auto"
												},
												children: "＋ 新建模块"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												fontSize: "11px",
												justifyContent: "space-between",
												margin: "10px 3px 7px",
												opacity: .48
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section === "prompts" ? "提示模块" : "预设正则" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section === "prompts" ? "顺序与开关" : "开关" })]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "6px",
												minHeight: "220px",
												overflowY: "auto",
												paddingRight: "4px"
											},
											children: [
												section === "prompts" && visiblePromptSections.map((group) => {
													const collapsed = normalizedQuery === "" && collapsedPromptSections.has(group.key);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
														style: {
															display: "flex",
															flexDirection: "column",
															gap: "6px"
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															"aria-expanded": !collapsed,
															onClick: () => {
																togglePromptSection(group.key);
															},
															style: {
																alignItems: "center",
																background: "var(--dsw-alias-bg-layer-1, #202024)",
																border: "1px solid var(--dsw-alias-border-l2, #34343a)",
																borderRadius: "10px",
																color: "inherit",
																cursor: "pointer",
																display: "grid",
																font: "inherit",
																gap: "8px",
																gridTemplateColumns: "18px minmax(0, 1fr) auto",
																minHeight: "42px",
																padding: "8px 11px",
																textAlign: "left",
																width: "100%"
															},
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	"aria-hidden": "true",
																	style: {
																		fontSize: "12px",
																		opacity: .58,
																		transform: `rotate(${collapsed ? 0 : 90}deg)`,
																		transition: "transform .14s ease"
																	},
																	children: "›"
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: "13px",
																		fontWeight: 620,
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		whiteSpace: "nowrap"
																	},
																	children: group.title
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	style: {
																		fontSize: "10px",
																		opacity: .46
																	},
																	children: [
																		group.enabledCount,
																		"/",
																		group.prompts.length,
																		" 启用"
																	]
																})
															]
														}), !collapsed && group.prompts.map((prompt) => {
															const attachedIndex = prompts.filter((item) => item.attached).findIndex((item) => item.identifier === prompt.identifier);
															return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																style: {
																	alignItems: "center",
																	background: prompt.enabled ? `color-mix(in srgb, ${color} 9%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
																	border: `1px solid ${prompt.enabled ? `color-mix(in srgb, ${color} 24%, transparent)` : "var(--dsw-alias-border-l2, #34343a)"}`,
																	borderRadius: "10px",
																	display: "grid",
																	gap: "8px",
																	gridTemplateColumns: "minmax(0, 1fr) auto",
																	marginLeft: "8px",
																	minHeight: "52px",
																	padding: "8px 9px 8px 12px",
																	opacity: prompt.attached ? 1 : .62
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	style: { minWidth: 0 },
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																		style: {
																			alignItems: "center",
																			display: "flex",
																			gap: "7px",
																			minWidth: 0
																		},
																		children: [
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					fontSize: "13px",
																					fontWeight: 560,
																					overflow: "hidden",
																					textOverflow: "ellipsis",
																					whiteSpace: "nowrap"
																				},
																				children: prompt.name || prompt.identifier
																			}),
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					fontSize: "10px",
																					opacity: .48
																				},
																				children: prompt.marker ? "结构位" : roleLabel(prompt.role)
																			}),
																			promptModified(prompt) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					color,
																					fontSize: "10px",
																					opacity: .82
																				},
																				children: "已修改"
																			})
																		]
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																		title: prompt.identifier,
																		style: {
																			fontFamily: "ui-monospace, monospace",
																			fontSize: "10px",
																			marginTop: "3px",
																			opacity: .38,
																			overflow: "hidden",
																			textOverflow: "ellipsis",
																			whiteSpace: "nowrap"
																		},
																		children: prompt.identifier
																	})]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	style: {
																		alignItems: "center",
																		display: "flex",
																		gap: "5px"
																	},
																	children: [
																		prompt.editable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setEditingPromptId(prompt.identifier);
																			},
																			style: miniButtonStyle,
																			children: "编辑"
																		}),
																		prompt.imported && prompt.editable && prompt.content !== prompt.importedContent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setPromptContent(prompt.identifier, prompt.importedContent);
																			},
																			style: miniButtonStyle,
																			children: "恢复默认正文"
																		}),
																		prompt.attached && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			"aria-label": `上移${prompt.name}`,
																			disabled: attachedIndex <= 0 || normalizedQuery !== "",
																			onClick: () => {
																				move(prompt.identifier, -1);
																			},
																			style: miniButtonStyle,
																			children: "↑"
																		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			"aria-label": `下移${prompt.name}`,
																			disabled: attachedIndex >= attached.length - 1 || normalizedQuery !== "",
																			onClick: () => {
																				move(prompt.identifier, 1);
																			},
																			style: miniButtonStyle,
																			children: "↓"
																		})] }),
																		prompt.toggleable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			role: "switch",
																			"aria-checked": prompt.enabled,
																			onClick: () => {
																				setPrompt(prompt.identifier, (value) => ({
																					...value,
																					attached: true,
																					enabled: !value.enabled
																				}));
																			},
																			style: {
																				background: prompt.enabled ? color : "var(--dsw-alias-bg-layer-2, #2b2b30)",
																				border: 0,
																				borderRadius: "999px",
																				cursor: "pointer",
																				height: "22px",
																				padding: "2px",
																				position: "relative",
																				width: "39px"
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
																				background: "#fff",
																				borderRadius: "50%",
																				display: "block",
																				height: "18px",
																				transform: `translateX(${prompt.enabled ? 17 : 0}px)`,
																				transition: "transform .14s ease",
																				width: "18px"
																			} })
																		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			style: {
																				fontSize: "10px",
																				opacity: .44,
																				padding: "0 3px"
																			},
																			children: "固定"
																		}),
																		!prompt.attached && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setPrompt(prompt.identifier, (value) => ({
																					...value,
																					attached: true
																				}));
																			},
																			style: miniButtonStyle,
																			children: "加入"
																		})
																	]
																})]
															}, prompt.identifier);
														})]
													}, group.key);
												}),
												section === "regex" && visibleRegex.map((script) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														alignItems: "center",
														background: !script.disabled ? `color-mix(in srgb, ${color} 9%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
														border: `1px solid ${!script.disabled ? `color-mix(in srgb, ${color} 24%, transparent)` : "var(--dsw-alias-border-l2, #34343a)"}`,
														borderRadius: "10px",
														display: "grid",
														gap: "8px",
														gridTemplateColumns: "minmax(0, 1fr) auto",
														minHeight: "52px",
														padding: "8px 9px 8px 12px"
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														style: { minWidth: 0 },
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															style: {
																fontSize: "13px",
																fontWeight: 560,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap"
															},
															children: script.scriptName
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															style: {
																fontSize: "10px",
																marginTop: "3px",
																opacity: .42
															},
															children: [
																script.markdownOnly ? "显示" : void 0,
																script.promptOnly ? "生成规则已保留" : void 0,
																script.placement.includes(1) ? "用户消息" : void 0,
																script.placement.includes(2) ? "角色回复" : void 0
															].filter(Boolean).join(" · ") || "普通处理"
														})]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														role: "switch",
														"aria-checked": !script.disabled,
														disabled: saving,
														onClick: () => {
															setRegexScripts((current) => current.map((item) => item.index === script.index ? {
																...item,
																disabled: !item.disabled
															} : item));
														},
														style: {
															background: !script.disabled ? color : "var(--dsw-alias-bg-layer-2, #2b2b30)",
															border: 0,
															borderRadius: "999px",
															cursor: "pointer",
															height: "22px",
															padding: "2px",
															position: "relative",
															width: "39px"
														},
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
															background: "#fff",
															borderRadius: "50%",
															display: "block",
															height: "18px",
															transform: `translateX(${!script.disabled ? 17 : 0}px)`,
															transition: "transform .14s ease",
															width: "18px"
														} })
													})]
												}, script.index)),
												(section === "prompts" && visiblePromptSections.length === 0 || section === "regex" && visibleRegex.length === 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: "13px",
														opacity: .52,
														padding: "32px 10px",
														textAlign: "center"
													},
													children: ["没有匹配的", section === "prompts" ? "模块" : "正则脚本"]
												})
											]
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
									className: "agent-rp-preset-generation",
									style: {
										borderLeft: "1px solid var(--dsw-alias-border-l2, #343438)",
										paddingLeft: "16px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											style: {
												fontSize: "12px",
												fontWeight: 600,
												margin: "2px 0 13px",
												opacity: .62
											},
											children: "生成参数"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetNumberField, {
											label: "温度",
											hint: "0—2",
											value: temperature,
											onChange: setTemperature
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetNumberField, {
											label: "最大输出",
											hint: "由模型上限约束",
											value: maxTokens,
											onChange: setMaxTokens
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											style: fieldLabelStyle,
											children: ["推理等级", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												value: reasoningEffort,
												onChange: (event) => {
													setReasoningEffort(event.target.value);
												},
												style: fieldInputStyle,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "",
														children: "跟随会话"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "auto",
														children: "自动（跟随模型）"
													}),
													reasoning?.efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: effort.id,
														children: effort.name
													}, effort.id)),
													reasoningEffort !== "" && reasoningEffort !== "auto" && selectedReasoning === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
														value: reasoningEffort,
														children: ["导入值 · ", selectedReasoningLabel]
													})
												]
											})]
										}),
										modelCapabilities.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											role: "status",
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												opacity: .52
											},
											children: "正在读取当前模型可用等级…"
										}),
										modelCapabilities.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											role: "note",
											style: {
												color: "#d9a85f",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px"
											},
											children: "暂时无法读取当前模型能力，已保留原预设值"
										}),
										unsupportedReasoning && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											role: "note",
											style: {
												background: "rgba(217,168,95,.1)",
												border: "1px solid rgba(217,168,95,.28)",
												borderRadius: "9px",
												color: "#e3b66f",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												padding: "8px 9px"
											},
											children: [
												selectedReasoningLabel,
												" 仍会保留在预设中；",
												modelLabel,
												" 不支持这个等级，下次回复将沿用会话等级 ",
												currentReasoningLabel
											]
										}),
										!unsupportedReasoning && modelCapabilities.status === "ready" && reasoning !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												opacity: .52
											},
											children: [
												modelLabel,
												" 可用：",
												reasoning.efforts.length === 0 ? "没有可选推理等级" : reasoning.efforts.map((effort) => effort.name).join("、")
											]
										}),
										preservedSampling.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											role: "note",
											style: {
												fontSize: "10px",
												lineHeight: 1.5,
												margin: "10px 1px 0",
												opacity: .5
											},
											children: [
												"暂未映射：",
												preservedSampling.join("、"),
												"；导出副本时仍会保留"
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "16px 1px 0",
												opacity: .46
											},
											children: "修改只影响当前角色会话。未填写的参数跟随会话与模型设置"
										}),
										preset.extensionStatus.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "5px",
												margin: "12px 1px 0"
											},
											children: preset.extensionStatus.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: "10px",
													lineHeight: 1.45,
													opacity: item.state === "unsupported" ? .72 : .44
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: { color: item.state === "unsupported" ? "#d9a85f" : item.state === "active" ? "#7ec89b" : "inherit" },
														children: "●"
													}),
													" ",
													item.name,
													" · ",
													item.detail
												]
											}, item.name))
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
								className: "agent-rp-preset-footer",
								style: {
									alignItems: "center",
									borderTop: "1px solid var(--dsw-alias-border-l2, #343438)",
									display: "flex",
									gap: "9px",
									justifyContent: "flex-end",
									minHeight: "64px",
									padding: "12px 20px"
								},
								children: [
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "alert",
										style: {
											color: "#e47a7a",
											fontSize: "12px",
											marginRight: "auto"
										},
										children: error
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											reset();
										},
										style: {
											...secondaryButtonStyle,
											marginRight: error === void 0 ? "auto" : void 0
										},
										children: "恢复预设默认值"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										ref: importInputRef,
										type: "file",
										accept: ".json,application/json",
										hidden: true,
										onChange: (event) => {
											const file = event.currentTarget.files?.[0];
											event.currentTarget.value = "";
											if (file === void 0) return;
											setSaving(true);
											setError(void 0);
											onImport(file).then(onClose, (reason) => {
												setError(reason instanceof Error ? reason.message : "预设导入失败");
												setSaving(false);
											});
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											importInputRef.current?.click();
										},
										style: secondaryButtonStyle,
										children: "替换预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											setLibraryOpen(true);
											onLibrary({ operation: "list" });
										},
										style: secondaryButtonStyle,
										children: "预设库"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											setInspectionOpen(true);
										},
										style: secondaryButtonStyle,
										children: "运行检查"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: exportCopy,
										title: preset.omittedExtensions.length === 0 ? "导出当前配置" : `不包含未执行扩展：${preset.omittedExtensions.join("、")}`,
										style: secondaryButtonStyle,
										children: "导出副本"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											saveToLibrary();
										},
										style: secondaryButtonStyle,
										children: "另存为预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: onClose,
										style: secondaryButtonStyle,
										children: "取消"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											save();
										},
										style: primaryButtonStyle,
										children: saving ? "保存中…" : "保存到此会话"
									})
								]
							})
						]
					}),
					editingPrompt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetPromptEditorDialog, {
						prompt: editingPrompt,
						onClose: () => {
							setEditingPromptId(void 0);
						},
						onApply: (value) => {
							setPrompt(editingPrompt.identifier, (prompt) => ({
								...prompt,
								name: value.name,
								role: value.role,
								content: value.content,
								injectionPosition: value.injectionPosition,
								injectionDepth: value.injectionDepth,
								injectionOrder: value.injectionOrder,
								contentModified: value.content !== prompt.importedContent
							}));
							setEditingPromptId(void 0);
						},
						...editingPrompt.deletable ? { onDelete: () => {
							setPrompts((current) => current.filter((prompt) => prompt.identifier !== editingPrompt.identifier));
							setEditingPromptId(void 0);
						} } : {}
					}),
					libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryDialog, {
						entries,
						...preset.libraryId === void 0 ? {} : { activeId: preset.libraryId },
						onClose: () => {
							setLibraryOpen(false);
						},
						onAction: async (request) => {
							await onLibrary(request);
							if (request.operation === "select") onClose();
						}
					}),
					inspectionOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetRuntimeInspector, {
						preset,
						lastRequest,
						onClose: () => {
							setInspectionOpen(false);
						}
					})
				]
			});
		}
		function requestParameterSummary(request) {
			const config = request.config;
			return [
				`${config.provider} / ${config.model}`,
				config.reasoningEffort === void 0 ? void 0 : `推理 ${config.reasoningEffort}`,
				config.temperature === void 0 ? void 0 : `温度 ${config.temperature}`,
				config.maxTokens === void 0 ? void 0 : `最大输出 ${config.maxTokens}`,
				config.stop === void 0 || config.stop.length === 0 ? void 0 : `${config.stop.length} 个停止词`,
				request.toolNames.length === 0 ? "未提供工具" : `${request.toolNames.length} 个工具`
			].filter((value) => value !== void 0);
		}
		function requestedReasoningDifference(preset, request, requestMatches) {
			const requested = preset.generation.reasoningEffort;
			const actual = request.config.reasoningEffort;
			if (!requestMatches || requested === void 0 || requested === "auto" || actual === void 0 || requested === actual) return void 0;
			return `推理等级不同：预设保存的是 ${requested}，这次实际请求使用 ${actual}。当前模型没有采用预设值`;
		}
		function PresetRuntimeInspector({ preset, lastRequest, onClose }) {
			const enabled = preset.prompts.filter((prompt) => prompt.attached && prompt.enabled);
			const historyIndex = enabled.findIndex((prompt) => prompt.identifier === "chatHistory" && prompt.marker);
			const requestMatches = lastRequest !== void 0 && lastRequest.presetName === preset.name && lastRequest.presetRevision === preset.revision;
			const reasoningDifference = lastRequest === void 0 ? void 0 : requestedReasoningDifference(preset, lastRequest, requestMatches);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "预设运行检查",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.7)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1250
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 26px 90px rgba(0,0,0,.5)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "92vh",
						maxWidth: "1100px",
						overflow: "hidden",
						width: "min(96vw, 1100px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "flex",
								gap: "12px",
								padding: "18px 20px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "17px",
										margin: 0
									},
									children: "运行检查"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.5,
										marginTop: "4px",
										opacity: .56
									},
									children: "已保存的预设顺序与 Host 最近记录的实际系统提示"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭运行检查",
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "22px",
									marginLeft: "auto",
									padding: "4px"
								},
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								padding: "13px 20px"
							},
							children: lastRequest === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								role: "status",
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									borderRadius: "9px",
									fontSize: "12px",
									lineHeight: 1.6,
									padding: "10px 12px"
								},
								children: "这段会话还没有真实模型请求。发送一条消息后，这里才会出现实际系统提示和最终参数"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "status",
									style: {
										color: requestMatches ? "inherit" : "#d9a85f",
										fontSize: "12px",
										lineHeight: 1.5
									},
									children: requestMatches ? `当前预设版本与最近记录的请求一致 · ${new Date(lastRequest.time).toLocaleString()}` : `当前预设在最近记录的请求之后发生过变化 · 右侧仍显示当时实际使用的内容`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexWrap: "wrap",
										gap: "6px",
										marginTop: "9px"
									},
									children: requestParameterSummary(lastRequest).map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: chipStyle,
										children: value
									}, value))
								}),
								reasoningDifference !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "note",
									style: {
										background: "rgba(217,168,95,.1)",
										border: "1px solid rgba(217,168,95,.28)",
										borderRadius: "9px",
										color: "#e3b66f",
										fontSize: "11px",
										lineHeight: 1.55,
										marginTop: "10px",
										padding: "8px 10px"
									},
									children: reasoningDifference
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "agent-rp-runtime-inspector-body",
							style: {
								display: "grid",
								flex: "1 1 auto",
								gridTemplateColumns: "minmax(280px, .78fr) minmax(360px, 1.22fr)",
								minHeight: 0,
								overflow: "hidden"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "agent-rp-runtime-inspector-order",
								style: {
									borderRight: "1px solid var(--dsw-alias-border-l2, #343438)",
									minHeight: 0,
									overflowY: "auto",
									padding: "17px 18px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										alignItems: "baseline",
										display: "flex",
										gap: "8px",
										marginBottom: "11px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										style: {
											fontSize: "12px",
											margin: 0
										},
										children: "当前组装顺序"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: "10px",
											opacity: .44
										},
										children: [enabled.length, " 项启用"]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: "6px"
									},
									children: enabled.map((prompt, index) => {
										const retained = prompt.injectionPosition === 1;
										const history = prompt.identifier === "chatHistory" && prompt.marker;
										const placement = retained ? "保留，当前不执行" : history ? "聊天记录位置" : historyIndex >= 0 && index > historyIndex ? "历史之后" : "系统提示";
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #34343a)",
												borderRadius: "9px",
												display: "grid",
												gap: "9px",
												gridTemplateColumns: "25px minmax(0, 1fr) auto",
												padding: "8px 9px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														fontFamily: "ui-monospace, monospace",
														fontSize: "10px",
														opacity: .38,
														textAlign: "right"
													},
													children: index + 1
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: { minWidth: 0 },
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: {
															display: "block",
															fontSize: "12px",
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: prompt.name || prompt.identifier
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														title: prompt.identifier,
														style: {
															display: "block",
															fontFamily: "ui-monospace, monospace",
															fontSize: "9px",
															marginTop: "2px",
															opacity: .34,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: prompt.identifier
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														color: retained ? "#d9a85f" : "inherit",
														fontSize: "9px",
														opacity: retained ? .9 : .48,
														whiteSpace: "nowrap"
													},
													children: placement
												})
											]
										}, prompt.identifier);
									})
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								style: {
									display: "flex",
									flexDirection: "column",
									minHeight: 0,
									padding: "17px 18px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "baseline",
											display: "flex",
											gap: "8px",
											marginBottom: "11px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											style: {
												fontSize: "12px",
												margin: 0
											},
											children: "最近记录的实际系统提示"
										}), lastRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: "10px",
												opacity: .44
											},
											children: [lastRequest.system.length.toLocaleString(), " 字符"]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										style: {
											background: "var(--dsw-alias-bg-layer-1, #202024)",
											border: "1px solid var(--dsw-alias-border-l2, #34343a)",
											borderRadius: "10px",
											flex: "1 1 auto",
											fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
											fontSize: "11px",
											lineHeight: 1.62,
											margin: 0,
											minHeight: "300px",
											overflow: "auto",
											padding: "13px",
											whiteSpace: "pre-wrap",
											wordBreak: "break-word"
										},
										children: lastRequest === void 0 ? "尚无真实请求" : lastRequest.system || "这一轮没有系统提示"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											fontSize: "10px",
											lineHeight: 1.5,
											margin: "9px 1px 0",
											opacity: .42
										},
										children: "这里只展示 Host 写入会话记录的 system prompt；聊天历史与用户消息不会复制到检查页"
									})
								]
							})]
						})
					]
				})
			});
		}
		function PresetPromptEditorDialog({ prompt, onClose, onApply, onDelete }) {
			const [name, setName] = (0, react.useState)(prompt.name);
			const [role, setRole] = (0, react.useState)(prompt.role);
			const [content, setContent] = (0, react.useState)(prompt.content);
			const [injectionPosition, setInjectionPosition] = (0, react.useState)(prompt.injectionPosition ?? 0);
			const [injectionDepth, setInjectionDepth] = (0, react.useState)(String(prompt.injectionDepth ?? 4));
			const [injectionOrder, setInjectionOrder] = (0, react.useState)(String(prompt.injectionOrder ?? 100));
			const [confirmingDelete, setConfirmingDelete] = (0, react.useState)(false);
			const resolvedDepth = Number(injectionDepth);
			const resolvedOrder = Number(injectionOrder);
			const validInjection = injectionPosition === 0 || Number.isSafeInteger(resolvedDepth) && resolvedDepth >= 0 && resolvedDepth <= 9999 && Number.isSafeInteger(resolvedOrder) && resolvedOrder >= 0 && resolvedOrder <= 9999;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `编辑${prompt.name || prompt.identifier}`,
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.7)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1150
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "14px",
						boxShadow: "0 24px 80px rgba(0,0,0,.5)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "min(820px, 90vh)",
						maxWidth: "760px",
						overflow: "hidden",
						width: "min(94vw, 760px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "grid",
								gap: "8px",
								gridTemplateColumns: "minmax(0, 1fr) 130px",
								padding: "14px 18px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["模块名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										"aria-label": "模块名称",
										value: name,
										onChange: (event) => {
											setName(event.target.value);
										},
										style: fieldInputStyle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["消息角色", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										"aria-label": "消息角色",
										value: role,
										onChange: (event) => {
											setRole(event.target.value);
										},
										style: fieldInputStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "system",
												children: "系统"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "user",
												children: "用户"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "assistant",
												children: "助手"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontFamily: "ui-monospace, monospace",
										fontSize: "10px",
										gridColumn: "1 / -1",
										opacity: .4
									},
									children: prompt.identifier
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["插入位置", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										"aria-label": "插入位置",
										value: injectionPosition,
										onChange: (event) => {
											setInjectionPosition(Number(event.target.value));
										},
										style: fieldInputStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 0,
											children: "相对（按模块顺序）"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 1,
											children: "聊天内（按历史深度）"
										})]
									})]
								}),
								injectionPosition === 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...fieldLabelStyle,
											margin: 0
										},
										children: ["历史深度", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": "历史深度",
											type: "number",
											min: 0,
											max: 9999,
											value: injectionDepth,
											onChange: (event) => {
												setInjectionDepth(event.target.value);
											},
											style: fieldInputStyle
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...fieldLabelStyle,
											margin: 0
										},
										children: ["同深度优先级", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": "同深度优先级",
											type: "number",
											min: 0,
											max: 9999,
											value: injectionOrder,
											onChange: (event) => {
												setInjectionOrder(event.target.value);
											},
											style: fieldInputStyle
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											alignSelf: "end",
											color: "#d6aa67",
											fontSize: "10px",
											lineHeight: 1.45
										},
										children: "配置会完整保留；当前 Host 暂不执行聊天内深度注入"
									})
								] })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							"aria-label": "提示内容",
							autoFocus: true,
							spellCheck: false,
							value: content,
							onChange: (event) => {
								setContent(event.target.value);
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: 0,
								color: "inherit",
								flex: "1 1 auto",
								font: "13px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace",
								minHeight: "360px",
								outline: "none",
								padding: "16px 18px",
								resize: "none",
								whiteSpace: "pre-wrap"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								alignItems: "center",
								borderTop: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								padding: "12px 18px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: "10px",
										marginRight: "auto",
										opacity: .42
									},
									children: [content.length.toLocaleString(), " 字符"]
								}),
								onDelete !== void 0 && (confirmingDelete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: "#e47a7a",
										fontSize: "11px"
									},
									children: "永久移除此模块？"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onDelete,
									style: {
										...secondaryButtonStyle,
										borderColor: "#a94f4f",
										color: "#ef8a8a"
									},
									children: "确认删除"
								})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setConfirmingDelete(true);
									},
									style: {
										...secondaryButtonStyle,
										marginRight: "auto"
									},
									children: "删除模块"
								})),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onClose,
									style: secondaryButtonStyle,
									children: "取消"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: name.trim() === "" || !validInjection,
									onClick: () => {
										onApply({
											name: name.trim(),
											role,
											content,
											injectionPosition,
											injectionDepth: resolvedDepth,
											injectionOrder: resolvedOrder
										});
									},
									style: primaryButtonStyle,
									children: "应用修改"
								})
							]
						})
					]
				})
			});
		}
		function PresetImportDialog({ entries, onClose, onImport, onLibrary }) {
			const inputRef = (0, react.useRef)(null);
			const [importing, setImporting] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				onLibrary({ operation: "list" }).catch(() => void 0);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "导入预设",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1100
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !importing) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.45)",
						maxWidth: "480px",
						padding: "24px",
						width: "min(94vw, 480px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "为此角色选择预设"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "13px",
								lineHeight: 1.65,
								margin: "9px 0 22px",
								opacity: .58
							},
							children: "从预设库选取，或导入 SillyTavern Chat Completion 预设 JSON。选中后会为当前会话创建独立副本"
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px",
								margin: "0 0 12px"
							},
							children: error
						}),
						entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "7px",
								marginBottom: "20px",
								maxHeight: "280px",
								overflowY: "auto"
							},
							children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryRow, {
								entry,
								busy: importing,
								onSelect: () => {
									setImporting(true);
									setError(void 0);
									onLibrary({
										operation: "select",
										id: entry.id
									}).then(onClose, (reason) => {
										setError(reason instanceof Error ? reason.message : "预设选择失败");
										setImporting(false);
									});
								}
							}, entry.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: inputRef,
							type: "file",
							accept: ".json,application/json",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file === void 0) return;
								setImporting(true);
								setError(void 0);
								onImport(file).then(onClose, (reason) => {
									setError(reason instanceof Error ? reason.message : "预设导入失败");
									setImporting(false);
								});
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: importing,
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: importing,
								onClick: () => {
									inputRef.current?.click();
								},
								style: primaryButtonStyle,
								children: importing ? "导入中…" : "选择预设文件"
							})]
						})
					]
				})
			});
		}
		function PresetLibraryRow({ entry, active = false, busy = false, onSelect, onDelete }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					alignItems: "center",
					background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
					border: `1px solid ${active ? `color-mix(in srgb, ${color} 34%, transparent)` : "var(--dsw-alias-border-l2, #39393f)"}`,
					borderRadius: "10px",
					display: "flex",
					gap: "10px",
					padding: "10px 11px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								fontWeight: 600,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: entry.name
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: "10px",
								marginTop: "4px",
								opacity: .48
							},
							children: [
								entry.enabledCount,
								"/",
								entry.promptCount,
								" 项启用 · ",
								entry.regexScriptCount,
								" 条正则",
								active ? " · 当前来源" : ""
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy || active,
						onClick: onSelect,
						style: {
							...miniButtonStyle,
							marginLeft: "auto"
						},
						children: active ? "已选" : "使用"
					}),
					onDelete !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: onDelete,
						style: miniButtonStyle,
						children: "删除"
					})
				]
			});
		}
		function PresetLibraryDialog({ entries, activeId, onClose, onAction }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "预设库",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.66)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1200
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.45)",
						maxWidth: "560px",
						padding: "22px",
						width: "min(94vw, 560px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "10px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									fontSize: "17px",
									margin: 0
								},
								children: "预设库"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: "6px 0 0",
									opacity: .52
								},
								children: "使用预设只会替换当前会话的独立副本"
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onClose,
								"aria-label": "关闭预设库",
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "22px",
									marginLeft: "auto"
								},
								children: "×"
							})]
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "7px",
								marginTop: "18px",
								maxHeight: "55vh",
								overflowY: "auto"
							},
							children: [entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryRow, {
								entry,
								active: entry.id === activeId,
								busy,
								onSelect: () => {
									setBusy(true);
									setError(void 0);
									onAction({
										operation: "select",
										id: entry.id
									}).catch((reason) => {
										setError(reason instanceof Error ? reason.message : "预设选择失败");
										setBusy(false);
									});
								},
								onDelete: () => {
									if (!window.confirm(`从预设库删除“${entry.name}”？当前会话不会受影响`)) return;
									setBusy(true);
									setError(void 0);
									onAction({
										operation: "delete",
										id: entry.id
									}).then(() => {
										setBusy(false);
									}, (reason) => {
										setError(reason instanceof Error ? reason.message : "删除失败");
										setBusy(false);
									});
								}
							}, entry.id)), entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "13px",
									opacity: .52,
									padding: "30px 8px",
									textAlign: "center"
								},
								children: "预设库还是空的，导入一份 JSON 后会自动收藏"
							})]
						})
					]
				})
			});
		}
		function PresetNumberField({ label, hint, value, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: fieldLabelStyle,
				children: [
					label,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							float: "right",
							fontSize: "10px",
							fontWeight: 400,
							opacity: .45
						},
						children: hint
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						inputMode: "decimal",
						value,
						onChange: (event) => {
							onChange(event.target.value);
						},
						style: fieldInputStyle
					})
				]
			});
		}
		const fieldLabelStyle = {
			display: "block",
			fontSize: "11px",
			fontWeight: 560,
			marginBottom: "13px",
			opacity: .72
		};
		const fieldInputStyle = {
			background: "var(--dsw-alias-bg-layer-1, #202024)",
			border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
			borderRadius: "8px",
			color: "inherit",
			display: "block",
			font: "inherit",
			fontSize: "12px",
			marginTop: "6px",
			padding: "8px 9px",
			width: "100%"
		};
		const miniButtonStyle = {
			background: "transparent",
			border: "1px solid var(--dsw-alias-border-l2, #424248)",
			borderRadius: "6px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "11px",
			height: "25px",
			minWidth: "25px",
			padding: "2px 6px"
		};
		const secondaryButtonStyle = {
			...miniButtonStyle,
			height: "34px",
			padding: "5px 14px"
		};
		const primaryButtonStyle = {
			...secondaryButtonStyle,
			background: color,
			borderColor: color,
			color: "#fff",
			fontWeight: 600
		};
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
`;
		const imageModeLabels = {
			scene: "当前场景",
			portrait: "角色立绘",
			avatar: "角色头像",
			custom: "自定义描述"
		};
		function imagePrompt(mode, projection, note) {
			const detail = [projection.description, projection.personality].map((value) => value.trim()).filter(Boolean).join("\n").slice(0, 3e3);
			const extra = note.trim();
			if (mode === "custom") return extra;
			const subject = `角色：${projection.characterName}${detail === "" ? "" : `\n角色设定：${detail}`}`;
			if (mode === "scene") return `叙事插画\n${subject}\n场景：${projection.scenario.trim() || "延续当前对话中的场景"}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
			if (mode === "portrait") return `角色立绘，完整人物设计，清楚呈现服装与姿态\n${subject}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
			return `角色头像，头肩构图，表情自然，面部清晰\n${subject}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
		}
		function ImageGenerationDialog({ projection, initialMode = "scene", initialNote = "", onClose, onGenerate }) {
			const [mode, setMode] = (0, react.useState)(initialMode);
			const [note, setNote] = (0, react.useState)(initialNote);
			const prompt = imagePrompt(mode, projection, note);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "生成聊天插图",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "20px",
					position: "fixed",
					zIndex: 1e3
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #111216)",
						border: "1px solid var(--dsw-alias-border-l2, #35373d)",
						borderRadius: "14px",
						boxShadow: "0 20px 64px rgba(0,0,0,.45)",
						maxWidth: "620px",
						padding: "20px",
						width: "min(94vw, 620px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "12px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { flex: 1 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "17px",
										margin: 0
									},
									children: "生成聊天插图"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "12px",
										margin: "5px 0 0",
										opacity: .55
									},
									children: "选择画什么，确认后任务会留在这段聊天里"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭绘图",
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									font: "inherit",
									fontSize: "21px",
									opacity: .6
								},
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gap: "8px",
								gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
								marginTop: "18px"
							},
							children: Object.entries(imageModeLabels).map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setMode(value);
									setNote("");
								},
								style: {
									background: value === mode ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
									border: `1px solid ${value === mode ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--dsw-alias-border-l2, #3d3d43)"}`,
									borderRadius: "9px",
									color: "inherit",
									cursor: "pointer",
									font: "inherit",
									fontSize: "12px",
									padding: "9px 10px"
								},
								children: label
							}, value))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "grid",
								fontSize: "12px",
								gap: "7px",
								marginTop: "16px"
							},
							children: [mode === "custom" ? "画面描述" : "补充说明（可不填）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								autoFocus: true,
								value: note,
								maxLength: 8e3,
								rows: 5,
								placeholder: mode === "custom" ? "写下你想看到的画面…" : "例如：黄昏、暖色灯光、电影感构图",
								onChange: (event) => {
									setNote(event.target.value);
								},
								style: {
									...settingsFieldStyle,
									lineHeight: 1.6,
									resize: "vertical"
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							style: {
								fontSize: "11px",
								marginTop: "12px",
								opacity: .62
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
								style: { cursor: "pointer" },
								children: "查看将发送给图片服务的提示词"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									lineHeight: 1.6,
									marginTop: "7px",
									maxHeight: "150px",
									overflow: "auto",
									whiteSpace: "pre-wrap"
								},
								children: prompt
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "20px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: prompt.trim() === "",
								onClick: () => {
									onGenerate({
										mode,
										prompt
									});
									onClose();
								},
								style: primaryButtonStyle,
								children: "开始绘图"
							})]
						})
					]
				})
			});
		}
		function useGeneratedImageJob(jobId, settled) {
			const [revision, setRevision] = (0, react.useState)(0);
			const [job, setJob] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let active = true;
				let timer;
				const load = async () => {
					try {
						const response = await fetch(generatedImageJobUrl(jobId), { headers: { accept: "application/json" } });
						const value = await response.json();
						if (!response.ok || value.job === void 0) throw new Error(value.error ?? `图片任务读取失败（${response.status}）`);
						if (!active) return;
						setJob(value.job);
						setError(void 0);
						if (![
							"completed",
							"failed",
							"cancelled"
						].includes(value.job.status)) timer = setTimeout(() => {
							load();
						}, 1e3);
					} catch (reason) {
						if (!active) return;
						const message = reason instanceof Error ? reason.message : String(reason);
						if (settled) setError(message);
						else timer = setTimeout(() => {
							load();
						}, 700);
					}
				};
				load();
				return () => {
					active = false;
					if (timer !== void 0) clearTimeout(timer);
				};
			}, [
				jobId,
				revision,
				settled
			]);
			return {
				...job === void 0 ? {} : { job },
				...error === void 0 ? {} : { error },
				refresh: () => {
					setRevision((value) => value + 1);
				}
			};
		}
		function ImageGenerationCommandCard({ node, sessionId, runImageGeneration }) {
			let request;
			try {
				request = node.args === null ? void 0 : parseImageGenerationRequest(node.args);
			} catch {
				request = void 0;
			}
			const record = decodeImageGenerationRecord(node.outcome?.text);
			const jobId = request?.jobId ?? record?.jobId;
			if (jobId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-image-card": true,
				style: {
					fontSize: "12px",
					opacity: .62
				},
				children: "无法读取这条绘图记录"
			});
			const { job, error, refresh } = useGeneratedImageJob(jobId, node.outcome !== null);
			const resolvedRequest = job?.request ?? request;
			const [promptOpen, setPromptOpen] = (0, react.useState)(false);
			const [cancelling, setCancelling] = (0, react.useState)(false);
			const status = job?.status ?? (node.outcome === null ? "queued" : node.outcome.kind === "error" ? "failed" : "running");
			const failure = job?.error ?? (node.outcome?.kind === "error" ? node.outcome.text : void 0) ?? error;
			const title = resolvedRequest === void 0 ? "聊天插图" : imageModeLabels[resolvedRequest.mode];
			const retry = () => {
				if (resolvedRequest !== void 0) runImageGeneration(sessionId, {
					mode: resolvedRequest.mode,
					prompt: resolvedRequest.prompt
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				"data-agent-rp-image-card": true,
				style: {
					background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #202126) 82%, transparent)",
					border: "1px solid var(--dsw-alias-border-l2, #383a41)",
					borderRadius: "12px",
					maxWidth: "680px",
					overflow: "hidden",
					width: "100%"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							alignItems: "center",
							display: "flex",
							gap: "9px",
							padding: "10px 12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									color,
									fontSize: "15px"
								},
								children: "✦"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									fontSize: "12px",
									fontWeight: 620
								},
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "11px",
									marginLeft: "auto",
									opacity: .52
								},
								children: status === "completed" ? "已完成" : status === "failed" ? "生成失败" : status === "cancelled" ? "已取消" : job?.phase ?? "正在排队"
							})
						]
					}),
					(status === "queued" || status === "running") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							background: "rgba(127,127,127,.15)",
							height: "3px"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							background: color,
							height: "100%",
							transition: "width .35s ease",
							width: `${Math.max(3, (job?.progress ?? .02) * 100)}%`
						} })
					}),
					status === "completed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: generatedImageAssetUrl(jobId),
						alt: title,
						loading: "lazy",
						style: {
							background: "rgba(0,0,0,.2)",
							display: "block",
							maxHeight: "720px",
							objectFit: "contain",
							width: "100%"
						}
					}),
					(failure !== void 0 || status === "cancelled") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: failure === void 0 ? "status" : "alert",
						style: {
							color: failure === void 0 ? "inherit" : "var(--dsw-alias-state-danger, #df6f7a)",
							fontSize: "12px",
							lineHeight: 1.55,
							padding: "4px 12px 10px"
						},
						children: failure ?? "这次绘图已取消"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						style: {
							alignItems: "center",
							display: "flex",
							flexWrap: "wrap",
							gap: "7px",
							padding: "9px 12px 11px"
						},
						children: [
							resolvedRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setPromptOpen((value) => !value);
								},
								style: generationButtonStyle,
								children: promptOpen ? "收起提示词" : "查看提示词"
							}),
							(status === "queued" || status === "running") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: cancelling,
								onClick: () => {
									setCancelling(true);
									fetch(`${generatedImageJobUrl(jobId)}/cancel`, {
										method: "POST",
										headers: { accept: "application/json" }
									}).then(() => {
										refresh();
									}).finally(() => {
										setCancelling(false);
									});
								},
								style: generationButtonStyle,
								children: cancelling ? "正在取消…" : "取消"
							}),
							(status === "completed" || status === "failed" || status === "cancelled") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: retry,
								style: generationButtonStyle,
								children: "重绘"
							}),
							status === "completed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: generatedImageAssetUrl(jobId, true),
								download: true,
								style: {
									...generationButtonStyle,
									textDecoration: "none"
								},
								children: "下载"
							})
						]
					}),
					promptOpen && resolvedRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							borderTop: "1px solid var(--dsw-alias-border-l2, #383a41)",
							fontSize: "11px",
							lineHeight: 1.6,
							maxHeight: "180px",
							overflow: "auto",
							padding: "10px 12px",
							whiteSpace: "pre-wrap"
						},
						children: resolvedRequest.prompt
					})
				]
			});
		}
		function RoleplayStatusDialog({ characterName, source, onClose }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "当前状态",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "24px",
					position: "fixed",
					zIndex: 1e3
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #111216)",
						border: "1px solid var(--dsw-alias-border-l2, #35373d)",
						borderRadius: "14px",
						boxShadow: "0 20px 64px rgba(0,0,0,.45)",
						maxHeight: "88vh",
						maxWidth: "1240px",
						overflow: "hidden",
						position: "relative",
						width: "min(94vw, 1240px)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "关闭当前状态",
						onClick: onClose,
						style: {
							alignItems: "center",
							background: "rgba(13,17,27,.88)",
							border: "1px solid rgba(116,143,184,.35)",
							borderRadius: "50%",
							color: "#edf4ff",
							cursor: "pointer",
							display: "flex",
							fontSize: "20px",
							height: "34px",
							justifyContent: "center",
							position: "absolute",
							right: "12px",
							top: "12px",
							width: "34px",
							zIndex: 2
						},
						children: "×"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						title: `${characterName}的当前状态`,
						sandbox: "allow-scripts",
						srcDoc: source,
						style: {
							background: "transparent",
							border: 0,
							colorScheme: "dark",
							display: "block",
							height: "min(760px, 82vh)",
							width: "100%"
						}
					})]
				})
			});
		}
		function tavernWorldbookEntry(entry) {
			const parsedUid = Number(entry.sourceId);
			return {
				uid: Number.isSafeInteger(parsedUid) && parsedUid >= 0 ? parsedUid : entry.index,
				name: entry.name ?? entry.comment ?? "",
				enabled: entry.enabled && !entry.deleted,
				strategy: {
					type: entry.constant ? "constant" : "selective",
					keys: entry.keys,
					keys_secondary: {
						logic: entry.secondaryLogic === "and-all" ? "and_all" : entry.secondaryLogic === "not-all" ? "not_all" : entry.secondaryLogic === "not-any" ? "not_any" : "and_any",
						keys: entry.secondaryKeys
					},
					scan_depth: entry.scanDepth ?? "same_as_global"
				},
				position: {
					type: entry.position === "before_char" ? "before_character_definition" : "after_character_definition",
					role: "system",
					depth: 4,
					order: entry.insertionOrder
				},
				content: entry.content,
				probability: 100,
				recursion: {
					prevent_incoming: false,
					prevent_outgoing: false,
					delay_until: null
				},
				effect: {
					sticky: null,
					cooldown: null,
					delay: null
				},
				...entry.ignoreBudget ? { ignoreBudget: true } : {}
			};
		}
		const tavernPresetSystemPromptIds = /* @__PURE__ */ new Set([
			"main",
			"nsfw",
			"jailbreak",
			"enhanceDefinitions"
		]);
		const tavernPresetPlaceholderPromptIds = /* @__PURE__ */ new Set([
			"worldInfoBefore",
			"personaDescription",
			"charDescription",
			"charPersonality",
			"scenario",
			"worldInfoAfter",
			"dialogueExamples",
			"chatHistory"
		]);
		function tavernPresetPrompt(prompt) {
			const system = tavernPresetSystemPromptIds.has(prompt.identifier);
			const placeholder = tavernPresetPlaceholderPromptIds.has(prompt.identifier);
			const position = prompt.injectionPosition === 1 ? {
				type: "in_chat",
				depth: prompt.injectionDepth ?? 4,
				order: prompt.injectionOrder ?? 100
			} : { type: "relative" };
			return {
				id: prompt.identifier,
				identifier: prompt.identifier,
				name: prompt.name,
				enabled: prompt.enabled,
				role: prompt.role,
				...system ? {} : { position },
				...placeholder ? {} : { content: prompt.content },
				system_prompt: prompt.systemPrompt,
				marker: prompt.marker,
				forbid_overrides: prompt.forbidOverrides
			};
		}
		function tavernPresetRegex(script) {
			return {
				id: script.id ?? `preset-regex-${script.index}`,
				script_name: script.scriptName,
				enabled: !script.disabled,
				find_regex: script.findRegex,
				trim_strings: [...script.trimStrings],
				replace_string: script.replaceString,
				source: {
					user_input: script.placement.includes(1),
					ai_output: script.placement.includes(2),
					slash_command: script.placement.includes(3),
					world_info: script.placement.includes(5),
					reasoning: script.placement.includes(6)
				},
				destination: {
					display: script.markdownOnly,
					prompt: script.promptOnly
				},
				run_on_edit: script.runOnEdit,
				min_depth: script.minDepth,
				max_depth: script.maxDepth,
				disabled: script.disabled
			};
		}
		function tavernPresetHelperScript(script) {
			return {
				type: "script",
				id: script.id,
				name: script.name,
				content: script.content,
				info: script.info,
				enabled: script.enabled,
				button: {
					enabled: script.buttonEnabled,
					buttons: script.buttons.map((button) => ({ ...button }))
				},
				data: structuredClone(script.data)
			};
		}
		function currentTavernPreset(projection) {
			const preset = projection.preset;
			if (preset === void 0) return void 0;
			const generation = preset.generation;
			const value = {
				settings: {
					max_context: 2e6,
					max_completion_tokens: generation.maxTokens ?? 300,
					reply_count: 1,
					should_stream: true,
					temperature: generation.temperature ?? 1,
					frequency_penalty: generation.frequencyPenalty ?? 0,
					presence_penalty: generation.presencePenalty ?? 0,
					repetition_penalty: generation.repetitionPenalty ?? 1,
					top_p: generation.topP ?? 1,
					min_p: generation.minP ?? 0,
					top_k: generation.topK ?? 0,
					top_a: generation.topA ?? 0,
					seed: -1,
					squash_system_messages: false,
					reasoning_effort: generation.reasoningEffort ?? "auto",
					request_thoughts: false,
					request_images: false,
					enable_function_calling: false,
					enable_web_search: false,
					allow_sending_images: "auto",
					allow_sending_videos: false,
					character_name_prefix: "none",
					wrap_user_messages_in_quotes: false
				},
				prompts: preset.prompts.filter((prompt) => prompt.attached).map(tavernPresetPrompt),
				prompts_unused: preset.prompts.filter((prompt) => !prompt.attached).map(tavernPresetPrompt),
				extensions: {
					regex_scripts: preset.regexScripts.map(tavernPresetRegex),
					tavern_helper: {
						scripts: preset.tavernHelperScripts.map(tavernPresetHelperScript),
						variables: structuredClone(preset.tavernHelperVariables)
					}
				}
			};
			return {
				name: preset.name,
				revision: preset.revision,
				value
			};
		}
		function tavernObject(value, label) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
			return value;
		}
		function tavernPresetConfiguration(projection, value, revision) {
			const active = projection.preset;
			if (active === void 0) throw new Error("当前会话没有预设");
			const preset = tavernObject(value, "预设");
			const used = Array.isArray(preset.prompts) ? preset.prompts : [];
			const unused = Array.isArray(preset.prompts_unused) ? preset.prompts_unused : [];
			const currentById = new Map(active.prompts.map((prompt) => [prompt.identifier, prompt]));
			const seen = /* @__PURE__ */ new Set();
			const definitions = [...used, ...unused].map((candidate, index) => {
				const item = tavernObject(candidate, `预设提示词 ${index + 1}`);
				const identifier = typeof item.id === "string" && item.id.trim() !== "" ? item.id : typeof item.identifier === "string" ? item.identifier : "";
				if (identifier.trim() === "" || seen.has(identifier)) throw new Error("预设提示词标识无效或重复");
				seen.add(identifier);
				const current = currentById.get(identifier);
				const role = item.role === "user" || item.role === "assistant" || item.role === "system" ? item.role : current?.role ?? "system";
				const position = typeof item.position === "object" && item.position !== null && !Array.isArray(item.position) ? item.position : void 0;
				const inChat = position?.type === "in_chat";
				const withPosition = inChat || current?.injectionPosition !== void 0 || current === void 0 ? {
					injectionPosition: inChat ? 1 : 0,
					...inChat && Number.isSafeInteger(position?.depth) ? { injectionDepth: Number(position.depth) } : {},
					...inChat && Number.isSafeInteger(position?.order) ? { injectionOrder: Number(position.order) } : {}
				} : {};
				return {
					identifier,
					name: typeof item.name === "string" && item.name.trim() !== "" ? item.name : current?.name ?? identifier,
					role,
					content: typeof item.content === "string" ? item.content : current?.content ?? "",
					...withPosition
				};
			});
			const order = used.map((candidate, index) => {
				const item = tavernObject(candidate, `预设顺序 ${index + 1}`);
				return {
					identifier: typeof item.id === "string" && item.id.trim() !== "" ? item.id : typeof item.identifier === "string" ? item.identifier : "",
					enabled: item.enabled === true
				};
			});
			const settings = typeof preset.settings === "object" && preset.settings !== null && !Array.isArray(preset.settings) ? preset.settings : {};
			const generation = {
				...typeof settings.temperature === "number" && Number.isFinite(settings.temperature) && (active.generation.temperature !== void 0 || settings.temperature !== 1) ? { temperature: settings.temperature } : {},
				...Number.isSafeInteger(settings.max_completion_tokens) && Number(settings.max_completion_tokens) > 0 && (active.generation.maxTokens !== void 0 || settings.max_completion_tokens !== 300) ? { maxTokens: Number(settings.max_completion_tokens) } : {},
				...typeof settings.reasoning_effort === "string" && settings.reasoning_effort.trim() !== "" && (active.generation.reasoningEffort !== void 0 || settings.reasoning_effort !== "auto") ? { reasoningEffort: settings.reasoning_effort } : {}
			};
			const extensions = typeof preset.extensions === "object" && preset.extensions !== null && !Array.isArray(preset.extensions) ? preset.extensions : {};
			const candidates = Array.isArray(extensions.regex_scripts) ? extensions.regex_scripts : [];
			return {
				operation: "replace",
				revision,
				order,
				prompts: definitions,
				content: [],
				generation,
				regex: active.regexScripts.map((script, index) => {
					const candidate = (script.id === void 0 ? void 0 : candidates.find((candidate) => {
						if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return false;
						return candidate.id === script.id;
					})) ?? candidates[index];
					const item = typeof candidate === "object" && candidate !== null && !Array.isArray(candidate) ? candidate : {};
					return {
						index,
						disabled: typeof item.enabled === "boolean" ? !item.enabled : typeof item.disabled === "boolean" ? item.disabled : script.disabled,
						minDepth: item.min_depth === null || typeof item.min_depth === "number" && Number.isFinite(item.min_depth) ? item.min_depth : script.minDepth,
						maxDepth: item.max_depth === null || typeof item.max_depth === "number" && Number.isFinite(item.max_depth) ? item.max_depth : script.maxDepth
					};
				})
			};
		}
		function tavernScriptSnapshot(projection, script, approvedScriptOrigins, sessionId) {
			const state = projection.tavern;
			const message = {
				...state?.scopes.message ?? {},
				...projection.mvu === void 0 ? {} : { stat_data: projection.mvu.statData }
			};
			const worldbooks = {
				...Object.fromEntries(projection.worldInfo.books.map((book) => [book.name, book.entries.filter((entry) => !entry.deleted).map(tavernWorldbookEntry)])),
				...state?.worldbooks
			};
			for (const name of state?.deletedWorldbookNames ?? []) delete worldbooks[name];
			const characterBook = projection.worldInfo.books.find((book) => book.source === "character");
			const importedGlobalBooks = projection.worldInfo.books.filter((book) => book.source === "standalone" && !book.id.startsWith("script:")).map((book) => book.name);
			return {
				scriptId: script.id,
				scriptName: script.name,
				scriptInfo: script.info,
				buttons: script.buttons,
				characterName: projection.characterName,
				characterId: projection.tavern?.characterSourceId ?? projection.avatarLibraryId ?? projection.characterName,
				chatId: String(sessionId),
				...projection.userName === void 0 ? {} : { userName: projection.userName },
				...currentTavernPreset(projection) === void 0 ? {} : { preset: currentTavernPreset(projection) },
				approvedScriptOrigins,
				scopes: {
					global: state?.scopes.global ?? {},
					preset: state?.scopes.preset ?? {},
					character: state?.scopes.character ?? projection.frontend?.tavernHelperVariables ?? {},
					chat: state?.scopes.chat ?? {},
					message,
					script: state?.scripts[script.id] ?? script.data
				},
				worldbooks,
				worldbookBindings: {
					global: state?.worldbookBindings?.global ?? importedGlobalBooks,
					character: state?.worldbookBindings?.character ?? {
						primary: characterBook?.name ?? null,
						additional: []
					},
					chat: state?.worldbookBindings?.chat ?? null
				},
				messages: (state?.messages ?? []).map((entry, index, entries) => ({
					...entry,
					data: index === entries.length - 1 ? message : {},
					extra: {}
				})),
				displayRegexScripts: [...projection.preset?.regexScripts ?? [], ...projection.frontend?.regexScripts ?? []]
			};
		}
		function runtimeScriptButtons(value) {
			if (!Array.isArray(value) || value.length > 50) return void 0;
			const names = /* @__PURE__ */ new Set();
			const buttons = [];
			for (const item of value) {
				if (typeof item !== "object" || item === null || Array.isArray(item)) return void 0;
				const button = item;
				if (typeof button.name !== "string" || button.name.trim() === "" || button.name.length > 200 || typeof button.visible !== "boolean" || names.has(button.name)) return void 0;
				names.add(button.name);
				buttons.push({
					name: button.name,
					visible: button.visible
				});
			}
			return buttons;
		}
		function TavernScriptRuntime({ ctx, inputActions, onDisplayOverride, projection, runGeneration, runModelList, runMutation, runPresetConfiguration, sessionId }) {
			const scripts = [...projection.preset?.tavernHelperScripts ?? [], ...projection.frontend?.tavernHelperScripts ?? []].filter((script) => script.enabled && script.content.trim() !== "");
			const [approvedOrigins, setApprovedOrigins] = (0, react.useState)(readApprovedTavernScriptOrigins);
			const scriptOrigins = [.../* @__PURE__ */ new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...approvedOrigins])].sort();
			const signature = `${scripts.map((script) => `${script.id}\u0000${script.content}`).join("")}\u0002${scriptOrigins.join("")}`;
			const [frames, setFrames] = (0, react.useState)([]);
			const [readyScriptIds, setReadyScriptIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [runtimeErrors, setRuntimeErrors] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [runtimeButtons, setRuntimeButtons] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [externalScriptRequests, setExternalScriptRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedGenerations, setApprovedGenerations] = (0, react.useState)(readApprovedTavernScriptGenerations);
			const [generationRequests, setGenerationRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedCustomGenerations, setApprovedCustomGenerations] = (0, react.useState)(readApprovedTavernScriptCustomGenerations);
			const [customGenerationRequests, setCustomGenerationRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedModels, setApprovedModels] = (0, react.useState)(readApprovedTavernScriptModels);
			const [modelListRequests, setModelListRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [surfaceScriptIds, setSurfaceScriptIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [panelOpen, setPanelOpen] = (0, react.useState)(false);
			const [panelScriptId, setPanelScriptId] = (0, react.useState)();
			const frameRefs = (0, react.useRef)(/* @__PURE__ */ new Map());
			const generationQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const customGenerationQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const modelListQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const projectionRef = (0, react.useRef)(projection);
			const mutationQueue = (0, react.useRef)(Promise.resolve());
			const presetRevisionRef = (0, react.useRef)(projection.preset?.revision ?? 0);
			const presetSessionRef = (0, react.useRef)(sessionId);
			projectionRef.current = projection;
			if (presetSessionRef.current !== sessionId) {
				presetSessionRef.current = sessionId;
				presetRevisionRef.current = projection.preset?.revision ?? 0;
			}
			if ((projection.preset?.revision ?? 0) > presetRevisionRef.current) presetRevisionRef.current = projection.preset?.revision ?? 0;
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setFrames([]);
				setReadyScriptIds(/* @__PURE__ */ new Set());
				setRuntimeErrors(/* @__PURE__ */ new Map());
				setRuntimeButtons(/* @__PURE__ */ new Map());
				setExternalScriptRequests(/* @__PURE__ */ new Map());
				generationQueue.current.clear();
				setGenerationRequests(/* @__PURE__ */ new Map());
				customGenerationQueue.current.clear();
				setCustomGenerationRequests(/* @__PURE__ */ new Map());
				modelListQueue.current.clear();
				setModelListRequests(/* @__PURE__ */ new Map());
				setSurfaceScriptIds(/* @__PURE__ */ new Set());
				Promise.all(scripts.map(async (script) => {
					try {
						const source = await resolveTavernScriptSource(script.content, controller.signal);
						return {
							script,
							source,
							srcDoc: tavernScriptFrameSource(script, source, tavernScriptSnapshot(projectionRef.current, script, scriptOrigins, sessionId))
						};
					} catch (reason) {
						return {
							script,
							error: reason instanceof Error ? reason.message : String(reason)
						};
					}
				})).then((result) => {
					if (!controller.signal.aborted) setFrames(result);
				});
				return () => {
					controller.abort();
				};
			}, [sessionId, signature]);
			const syncFrame = (frame, script) => {
				const snapshot = tavernScriptSnapshot(projectionRef.current, script, scriptOrigins, sessionId);
				frame.contentWindow?.postMessage({
					source: "dsh-agent-rp-host",
					action: "variables-sync",
					scopes: snapshot.scopes,
					messages: snapshot.messages,
					displayRegexScripts: snapshot.displayRegexScripts,
					worldbooks: snapshot.worldbooks,
					worldbookBindings: snapshot.worldbookBindings,
					preset: snapshot.preset
				}, "*");
			};
			const broadcast = (message, except) => {
				for (const frame of frameRefs.current.values()) if (frame.contentWindow !== except) frame.contentWindow?.postMessage({
					source: "dsh-agent-rp-host",
					...message
				}, "*");
			};
			const generationApprovalKey = (scriptId) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId
			].join("\0");
			const modelApprovalKey = (scriptId, origin) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId,
				origin
			].join("\0");
			const customGenerationApprovalKey = (scriptId, origin) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId,
				origin
			].join("\0");
			const executeGeneration = (target, requestId, mode, config) => {
				runGeneration(sessionId, {
					mode,
					config
				}).then((value) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-result",
						requestId,
						ok: true,
						value
					}, "*");
				}).catch((reason) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-result",
						requestId,
						ok: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}, "*");
				});
			};
			const executeModelList = (target, requestId, apiurl, key) => {
				runModelList({
					apiurl,
					...key === void 0 ? {} : { key }
				}).then((models) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "model-list-result",
						requestId,
						ok: true,
						value: models
					}, "*");
				}).catch((reason) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "model-list-result",
						requestId,
						ok: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}, "*");
				});
			};
			(0, react.useEffect)(() => {
				for (const entry of frames) {
					const frame = frameRefs.current.get(entry.script.id);
					if (frame !== void 0) syncFrame(frame, entry.script);
				}
			}, [
				projection.frontend,
				projection.mvu,
				projection.preset,
				projection.tavern
			]);
			const previousMvu = (0, react.useRef)();
			(0, react.useEffect)(() => {
				const current = projection.mvu === void 0 ? void 0 : JSON.stringify({ stat_data: projection.mvu.statData });
				const before = previousMvu.current;
				previousMvu.current = current;
				if (current === void 0 || before === void 0 || current === before) return;
				const currentValue = JSON.parse(current);
				const beforeValue = JSON.parse(before);
				broadcast({
					action: "event",
					eventType: "mag_variable_update_ended",
					args: [currentValue, beforeValue]
				});
				broadcast({
					action: "event",
					eventType: "message_received",
					args: [projection.tavern?.messages.at(-1)?.messageId ?? 0, "normal"]
				});
				broadcast({
					action: "event",
					eventType: "generation_ended",
					args: [projection.tavern?.messages.at(-1)?.messageId ?? 0]
				});
			}, [projection.mvu]);
			(0, react.useEffect)(() => {
				const bridge = (event) => {
					const entry = frames.find((candidate) => frameRefs.current.get(candidate.script.id)?.contentWindow === event.source);
					if (entry === void 0 || typeof event.data !== "object" || event.data === null) return;
					const message = event.data;
					if (message.source !== "dsh-agent-rp-tavern-script") return;
					if (message.action === "ready") {
						setReadyScriptIds((current) => new Set(current).add(entry.script.id));
						setRuntimeErrors((current) => {
							if (!current.has(entry.script.id)) return current;
							const next = new Map(current);
							next.delete(entry.script.id);
							return next;
						});
						const frame = frameRefs.current.get(entry.script.id);
						if (frame === void 0) return;
						syncFrame(frame, entry.script);
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "script-buttons-request"
						}, "*");
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: "app_ready",
							args: []
						}, "*");
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: "chat_id_changed",
							args: [String(sessionId)]
						}, "*");
						if (projectionRef.current.mvu !== void 0) frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: "mag_variable_initiailized",
							args: [{ stat_data: projectionRef.current.mvu.statData }, 0]
						}, "*");
						return;
					}
					if (message.action === "runtime-error") {
						const detail = String(message.value);
						setRuntimeErrors((current) => new Map(current).set(entry.script.id, detail));
						ctx.logger.warn(`agent-rp: Tavern Helper script ${JSON.stringify(entry.script.name)} failed: ${detail}`);
						return;
					}
					if (message.action === "script-buttons") {
						const buttons = runtimeScriptButtons(message.buttons);
						if (buttons !== void 0) setRuntimeButtons((current) => new Map(current).set(entry.script.id, buttons));
						return;
					}
					if (message.action === "display-override" && Number.isSafeInteger(message.messageId) && typeof message.value === "string" && message.value.length <= 2 * 1024 * 1024) {
						const messageId = message.messageId;
						if (messageId >= 0 && messageId < (projectionRef.current.tavern?.messages.length ?? 0)) onDisplayOverride(entry.script.id, messageId, message.value);
						return;
					}
					if (message.action === "surface" && typeof message.visible === "boolean") {
						setSurfaceScriptIds((current) => {
							if (current.has(entry.script.id) === message.visible) return current;
							const next = new Set(current);
							if (message.visible) next.add(entry.script.id);
							else next.delete(entry.script.id);
							return next;
						});
						return;
					}
					if (message.action === "external-script-request") {
						const origin = normalizedTavernScriptOrigin(message.origin);
						if (origin !== void 0 && !approvedOrigins.has(origin)) setExternalScriptRequests((current) => new Map(current).set(entry.script.id, origin));
						return;
					}
					if (message.action === "generate" && typeof message.requestId === "string" && (message.mode === "preset" || message.mode === "raw") && typeof message.config === "object" && message.config !== null && !Array.isArray(message.config)) {
						const target = event.source;
						const request = {
							target,
							requestId: message.requestId,
							mode: message.mode,
							config: message.config
						};
						const customApi = request.config.custom_api;
						if (customApi !== void 0) {
							if (typeof customApi !== "object" || customApi === null || Array.isArray(customApi)) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "generation-result",
									requestId: request.requestId,
									ok: false,
									error: "custom_api 必须是对象"
								}, "*");
								return;
							}
							const apiurl = customApi.apiurl;
							const origin = normalizedTavernModelOrigin(apiurl);
							if (origin === void 0) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "generation-result",
									requestId: request.requestId,
									ok: false,
									error: typeof apiurl === "string" ? "API 地址只支持 HTTP 或 HTTPS" : "custom_api.apiurl 不能为空"
								}, "*");
								return;
							}
							const approvalKey = customGenerationApprovalKey(entry.script.id, origin);
							if (approvedCustomGenerations.has(approvalKey)) executeGeneration(target, request.requestId, request.mode, request.config);
							else {
								const queued = customGenerationQueue.current.get(approvalKey) ?? [];
								queued.push(request);
								customGenerationQueue.current.set(approvalKey, queued);
								setCustomGenerationRequests((current) => new Map(current).set(approvalKey, {
									scriptId: entry.script.id,
									origin,
									count: queued.length
								}));
							}
							return;
						}
						if (approvedGenerations.has(generationApprovalKey(entry.script.id))) executeGeneration(target, request.requestId, request.mode, request.config);
						else {
							const queued = generationQueue.current.get(entry.script.id) ?? [];
							queued.push(request);
							generationQueue.current.set(entry.script.id, queued);
							setGenerationRequests((current) => new Map(current).set(entry.script.id, queued.length));
						}
						return;
					}
					if (message.action === "model-list" && typeof message.requestId === "string" && typeof message.apiurl === "string" && message.apiurl.length <= 2048 && (message.key === void 0 || typeof message.key === "string" && message.key.length <= 8192)) {
						const target = event.source;
						const origin = normalizedTavernModelOrigin(message.apiurl);
						if (origin === void 0) {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "model-list-result",
								requestId: message.requestId,
								ok: false,
								error: "API 地址只支持 HTTP 或 HTTPS"
							}, "*");
							return;
						}
						const approvalKey = modelApprovalKey(entry.script.id, origin);
						const request = {
							target,
							requestId: message.requestId,
							apiurl: message.apiurl,
							...message.key === void 0 ? {} : { key: message.key }
						};
						if (approvedModels.has(approvalKey)) executeModelList(target, request.requestId, request.apiurl, request.key);
						else {
							const queued = modelListQueue.current.get(approvalKey) ?? [];
							queued.push(request);
							modelListQueue.current.set(approvalKey, queued);
							setModelListRequests((current) => new Map(current).set(approvalKey, {
								scriptId: entry.script.id,
								origin,
								count: queued.length
							}));
						}
						return;
					}
					if (message.action === "event-emit" && typeof message.eventType === "string" && Array.isArray(message.args)) {
						broadcast({
							action: "event",
							eventType: message.eventType,
							args: message.args
						}, event.source);
						return;
					}
					if (message.action === "trigger-slash" && typeof message.value === "string" && message.value.length <= 65536) {
						const draft = message.value.match(/^\/setinput\s+([\s\S]*)$/u);
						if (draft?.[1] !== void 0) {
							inputActions.setDraft(draft[1]);
							return;
						}
						const send = message.value.match(/^\/send\s+([\s\S]*?)(?:\|\/trigger)?$/u);
						if (send?.[1] !== void 0) (ctx.sessions.scope(sessionId)?.get("conversation"))?.send(send[1]);
						return;
					}
					if (message.action === "preset-replace" && typeof message.requestId === "string") {
						const target = event.source;
						mutationQueue.current = mutationQueue.current.then(async () => {
							const revision = presetRevisionRef.current;
							await runPresetConfiguration(sessionId, tavernPresetConfiguration(projectionRef.current, message.preset, revision));
							presetRevisionRef.current = revision + 1;
							const current = currentTavernPreset(projectionRef.current);
							broadcast({
								action: "preset-sync",
								preset: current === void 0 ? void 0 : {
									...current,
									revision: presetRevisionRef.current,
									value: message.preset
								}
							}, target);
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "preset-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "preset-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if ((message.action === "worldbook-mutate" || message.action === "chat-mutate") && typeof message.requestId === "string" && typeof message.request === "object" && message.request !== null && !Array.isArray(message.request)) {
						const target = event.source;
						const request = message.request;
						mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(() => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if (message.action !== "variables-replace" || typeof message.requestId !== "string" || message.scope !== "global" && message.scope !== "preset" && message.scope !== "character" && message.scope !== "chat" && message.scope !== "message" && message.scope !== "script" || typeof message.variables !== "object" || message.variables === null || Array.isArray(message.variables)) return;
					const target = event.source;
					const request = {
						format: 0,
						scope: message.scope,
						...message.scope === "script" ? { scriptId: entry.script.id } : {},
						variables: message.variables
					};
					mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(() => {
						target.postMessage({
							source: "dsh-agent-rp-host",
							action: "variables-result",
							requestId: message.requestId,
							ok: true
						}, "*");
					}).catch((reason) => {
						target.postMessage({
							source: "dsh-agent-rp-host",
							action: "variables-result",
							requestId: message.requestId,
							ok: false,
							error: reason instanceof Error ? reason.message : String(reason)
						}, "*");
					});
				};
				window.addEventListener("message", bridge);
				return () => {
					window.removeEventListener("message", bridge);
				};
			}, [
				approvedCustomGenerations,
				approvedGenerations,
				approvedModels,
				frames,
				inputActions,
				onDisplayOverride,
				runGeneration,
				runModelList,
				runMutation,
				runPresetConfiguration,
				sessionId
			]);
			if (scripts.length === 0) return null;
			const failures = frames.flatMap((entry) => {
				const error = entry.error ?? runtimeErrors.get(entry.script.id);
				return error === void 0 ? [] : [{
					script: entry.script,
					error
				}];
			});
			const buttons = scripts.flatMap((script) => script.buttonEnabled ? (runtimeButtons.get(script.id) ?? script.buttons).filter((button) => button.visible).map((button) => ({
				script,
				button
			})) : []);
			const panelFrames = frames.filter((entry) => entry.srcDoc !== void 0 && surfaceScriptIds.has(entry.script.id));
			const activePanelScriptId = panelFrames.some((entry) => entry.script.id === panelScriptId) ? panelScriptId : panelFrames[0]?.script.id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"aria-hidden": !panelOpen,
					...panelOpen ? {
						role: "dialog",
						"aria-modal": true,
						"aria-label": "酒馆脚本面板"
					} : {},
					style: panelOpen ? {
						alignItems: "center",
						background: "rgba(0,0,0,.68)",
						display: "flex",
						inset: 0,
						justifyContent: "center",
						padding: "20px",
						position: "fixed",
						zIndex: 1100
					} : {
						height: "1px",
						left: "-10000px",
						opacity: 0,
						overflow: "hidden",
						pointerEvents: "none",
						position: "fixed",
						top: 0,
						width: "1px"
					},
					onMouseDown: (event) => {
						if (panelOpen && event.target === event.currentTarget) setPanelOpen(false);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						style: panelOpen ? {
							background: "var(--dsw-alias-bg-base, #111216)",
							border: "1px solid var(--dsw-alias-border-l2, #35373d)",
							borderRadius: "14px",
							boxShadow: "0 20px 64px rgba(0,0,0,.45)",
							display: "flex",
							flexDirection: "column",
							height: "min(82vh, 760px)",
							maxWidth: "1120px",
							overflow: "hidden",
							width: "min(94vw, 1120px)"
						} : { display: "contents" },
						children: [
							panelOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									borderBottom: "1px solid var(--dsw-alias-border-l2, #35373d)",
									display: "flex",
									gap: "8px",
									padding: "10px 12px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											fontSize: "13px",
											marginRight: "4px"
										},
										children: "酒馆脚本"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											flex: "1 1 auto",
											gap: "6px",
											minWidth: 0,
											overflowX: "auto"
										},
										children: panelFrames.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setPanelScriptId(entry.script.id);
											},
											style: {
												background: entry.script.id === activePanelScriptId ? "var(--dsw-alias-bg-elevated, #2a2c32)" : "transparent",
												border: "1px solid var(--dsw-alias-border-l2, #41434a)",
												borderRadius: "7px",
												color: "inherit",
												cursor: "pointer",
												flex: "0 0 auto",
												font: "inherit",
												fontSize: "11px",
												maxWidth: "240px",
												overflow: "hidden",
												padding: "5px 8px",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: entry.script.name || "未命名脚本"
										}, entry.script.id))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											flex: "0 0 auto",
											fontSize: "11px",
											opacity: .58
										},
										children: [
											readyScriptIds.size,
											"/",
											scripts.length,
											" 已启动"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭酒馆脚本面板",
										onClick: () => {
											setPanelOpen(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "20px",
											padding: "2px 6px"
										},
										children: "×"
									})
								]
							}),
							frames.flatMap((entry) => entry.source === void 0 || entry.srcDoc === void 0 ? [] : [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
								title: entry.script.name || "酒馆脚本",
								"data-agent-rp-tavern-script": entry.script.id,
								sandbox: "allow-scripts",
								srcDoc: entry.srcDoc,
								style: panelOpen ? {
									background: "transparent",
									border: 0,
									display: entry.script.id === activePanelScriptId ? "block" : "none",
									flex: "1 1 auto",
									minHeight: 0,
									width: "100%"
								} : {
									border: 0,
									height: "1px",
									width: "1px"
								},
								ref: (frame) => {
									if (frame === null) frameRefs.current.delete(entry.script.id);
									else frameRefs.current.set(entry.script.id, frame);
								}
							}, entry.script.id)]),
							panelOpen && panelFrames.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									flex: "1 1 auto",
									justifyContent: "center",
									minHeight: 0,
									padding: "24px"
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										maxWidth: "520px",
										width: "100%"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											fontSize: "13px",
											margin: "0 0 12px",
											opacity: .72
										},
										children: "这些脚本在后台运行，没有单独界面。"
									}), frames.map((entry) => {
										const error = entry.error ?? runtimeErrors.get(entry.script.id);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												borderTop: "1px solid var(--dsw-alias-border-l2, #35373d)",
												display: "flex",
												gap: "10px",
												padding: "9px 2px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													flex: "1 1 auto",
													minWidth: 0,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: entry.script.name || "未命名脚本"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													color: error === void 0 ? "inherit" : "var(--dsw-alias-state-warning, #d5a64c)",
													fontSize: "11px",
													opacity: .66
												},
												children: error === void 0 ? readyScriptIds.has(entry.script.id) ? "运行中" : "启动中" : "运行失败"
											})]
										}, entry.script.id);
									})]
								})
							}),
							panelOpen && frames.find((entry) => entry.script.id === activePanelScriptId)?.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: "auto",
									maxWidth: "720px",
									padding: "20px"
								},
								children: frames.find((entry) => entry.script.id === activePanelScriptId)?.error
							})
						]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setPanelOpen(true);
					},
					title: "打开隔离运行的酒馆脚本界面",
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "7px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "11px",
						opacity: .72,
						padding: "3px 7px"
					},
					children: [
						"脚本 ",
						readyScriptIds.size,
						"/",
						scripts.length
					]
				}),
				buttons.map(({ script, button }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !readyScriptIds.has(script.id) || runtimeErrors.has(script.id),
					title: `${script.name} · ${button.name}`,
					onClick: () => {
						frameRefs.current.get(script.id)?.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: `${script.id}_${button.name}`,
							args: []
						}, "*");
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "7px",
						color: "inherit",
						cursor: readyScriptIds.has(script.id) ? "pointer" : "wait",
						font: "inherit",
						fontSize: "11px",
						opacity: readyScriptIds.has(script.id) ? .72 : .4,
						padding: "3px 7px"
					},
					children: button.name
				}, `${script.id}:${button.name}`)),
				[...externalScriptRequests].map(([scriptId, origin]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					title: `允许隔离脚本从 ${origin} 加载 JavaScript`,
					onClick: () => {
						const next = new Set(approvedOrigins);
						next.add(origin);
						writeApprovedTavernScriptOrigins(next);
						setApprovedOrigins(next);
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
						borderRadius: "7px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "11px",
						opacity: .78,
						padding: "3px 7px"
					},
					children: ["允许 ", new URL(origin).hostname]
				}, `${scriptId}:${origin}`)),
				[...generationRequests].map(([scriptId, count]) => {
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: "允许这个隔离脚本使用当前 DSH 模型生成文本；生成会消耗模型额度",
						onClick: () => {
							const next = new Set(approvedGenerations);
							next.add(generationApprovalKey(scriptId));
							writeApprovedTavernScriptGenerations(next);
							setApprovedGenerations(next);
							const queued = generationQueue.current.get(scriptId) ?? [];
							generationQueue.current.delete(scriptId);
							setGenerationRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(scriptId);
								return remaining;
							});
							for (const request of queued) executeGeneration(request.target, request.requestId, request.mode, request.config);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							scripts.find((entry) => entry.id === scriptId)?.name || "脚本",
							" 调用模型",
							count > 1 ? ` (${count})` : ""
						]
					}, `generation:${scriptId}`);
				}),
				[...customGenerationRequests].map(([approvalKey, request]) => {
					const script = scripts.find((entry) => entry.id === request.scriptId);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: `允许这个隔离脚本连接 ${request.origin} 并生成文本；生成会消耗该 API 的额度，密钥只转发给该地址`,
						onClick: () => {
							const next = new Set(approvedCustomGenerations);
							next.add(approvalKey);
							writeApprovedTavernScriptCustomGenerations(next);
							setApprovedCustomGenerations(next);
							const queued = customGenerationQueue.current.get(approvalKey) ?? [];
							customGenerationQueue.current.delete(approvalKey);
							setCustomGenerationRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(approvalKey);
								return remaining;
							});
							for (const item of queued) executeGeneration(item.target, item.requestId, item.mode, item.config);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							script?.name || "脚本",
							" 使用 ",
							new URL(request.origin).hostname,
							" 生成",
							request.count > 1 ? ` (${request.count})` : ""
						]
					}, `custom-generation:${approvalKey}`);
				}),
				[...modelListRequests].map(([approvalKey, request]) => {
					const script = scripts.find((entry) => entry.id === request.scriptId);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: `允许这个隔离脚本连接 ${request.origin} 并读取模型名称；API 密钥只转发给该地址`,
						onClick: () => {
							const next = new Set(approvedModels);
							next.add(approvalKey);
							writeApprovedTavernScriptModels(next);
							setApprovedModels(next);
							const queued = modelListQueue.current.get(approvalKey) ?? [];
							modelListQueue.current.delete(approvalKey);
							setModelListRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(approvalKey);
								return remaining;
							});
							for (const item of queued) executeModelList(item.target, item.requestId, item.apiurl, item.key);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							script?.name || "脚本",
							" 读取 ",
							new URL(request.origin).hostname,
							" 模型",
							request.count > 1 ? ` (${request.count})` : ""
						]
					}, `models:${approvalKey}`);
				}),
				(readyScriptIds.size < scripts.length || failures.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					title: failures.length === 0 ? "正在启动酒馆脚本" : failures.map((entry) => `${entry.script.name}：${entry.error}`).join("\n"),
					style: {
						color: "var(--dsw-alias-state-warning, #d5a64c)",
						fontSize: "11px",
						opacity: .72
					},
					children: [
						"脚本 ",
						readyScriptIds.size,
						"/",
						scripts.length
					]
				})
			] });
		}
		const chipStyle = {
			background: `color-mix(in srgb, ${color} 10%, transparent)`,
			borderRadius: "999px",
			color: "inherit",
			fontSize: "11px",
			opacity: .76,
			padding: "5px 9px"
		};
		function roleplayComposerDockComponent(ctx, runImageGeneration, runTavernMutation, runTavernGeneration, runTavernModelList, runPresetConfiguration) {
			return function RoleplayComposerDock({ inputActions, sessionId, useProjection, useSessions, useSession }) {
				const summary = useSessions((state) => state.byId[sessionId]);
				const projection = roleplaySummary(summary, useProjection("agentRp"));
				const chat = useSession((state) => state.chat);
				const viewMode = useRoleplayViewMode(sessionId);
				const [drawOpen, setDrawOpen] = (0, react.useState)(false);
				const [displayOverrides, setDisplayOverrides] = (0, react.useState)(() => /* @__PURE__ */ new Map());
				const rootRef = (0, react.useRef)(null);
				const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
				const background = selectedBackground(characterDetail, useRoleplayBackground(sessionId));
				const displayName = projection === void 0 ? void 0 : roleplayDisplayName(summary, projection);
				const placeholder = displayName === void 0 ? void 0 : `和${displayName}说点什么…`;
				const transcriptSignature = projection?.tavern?.messages.map((message) => `${message.seq}\u0000${message.text}`).join("");
				const onDisplayOverride = (0, react.useCallback)((_scriptId, messageId, value) => {
					setDisplayOverrides((current) => new Map(current).set(messageId, value));
				}, []);
				(0, react.useEffect)(() => {
					setDisplayOverrides(/* @__PURE__ */ new Map());
				}, [sessionId, transcriptSignature]);
				(0, react.useLayoutEffect)(() => {
					const scroll = rootRef.current?.closest("[data-conversation-scroll]");
					if (scroll == null || background === void 0 || projection?.avatarLibraryId === void 0 || viewMode !== "immersive") return;
					const previous = {
						attachment: scroll.style.getPropertyValue("background-attachment"),
						image: scroll.style.getPropertyValue("background-image"),
						position: scroll.style.getPropertyValue("background-position"),
						repeat: scroll.style.getPropertyValue("background-repeat"),
						size: scroll.style.getPropertyValue("background-size")
					};
					scroll.dataset.agentRpBackground = "true";
					scroll.style.setProperty("background-attachment", "local");
					scroll.style.setProperty("background-image", `linear-gradient(rgba(10,11,15,.76),rgba(10,11,15,.88)),url("${characterLibraryImageUrl(projection.avatarLibraryId, background.index)}")`);
					scroll.style.setProperty("background-position", "center");
					scroll.style.setProperty("background-repeat", "no-repeat");
					scroll.style.setProperty("background-size", "cover");
					return () => {
						delete scroll.dataset.agentRpBackground;
						for (const [property, value] of Object.entries(previous)) {
							const cssProperty = `background-${property === "image" ? "image" : property}`;
							if (value === "") scroll.style.removeProperty(cssProperty);
							else scroll.style.setProperty(cssProperty, value);
						}
					};
				}, [
					background?.index,
					projection?.avatarLibraryId,
					viewMode
				]);
				(0, react.useLayoutEffect)(() => {
					const dock = rootRef.current?.closest("[data-slot=\"conversation.composer.dock\"]");
					const inputRoot = dock?.parentElement;
					if (dock == null || inputRoot == null || placeholder === void 0) return;
					const managedTextareas = /* @__PURE__ */ new Map();
					const hiddenControls = /* @__PURE__ */ new Map();
					const hide = (element) => {
						if (!(element instanceof HTMLElement) || hiddenControls.has(element)) return;
						hiddenControls.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
					};
					const refreshComposer = () => {
						const card = inputRoot.querySelector("[data-composer-card]");
						const textarea = card?.querySelector("textarea");
						if (textarea != null) {
							if (!managedTextareas.has(textarea)) managedTextareas.set(textarea, textarea.getAttribute("placeholder"));
							if (textarea.getAttribute("placeholder") !== placeholder) textarea.setAttribute("placeholder", placeholder);
						}
						if (viewMode === "debug") return;
						const row = card?.lastElementChild;
						const tools = row?.firstElementChild;
						const trailing = row?.lastElementChild;
						for (const element of Array.from(tools?.children ?? [])) hide(element);
						for (const element of Array.from(trailing?.children ?? [])) if (element.tagName !== "BUTTON") hide(element);
						for (const element of Array.from(inputRoot.children)) if (element !== card && element !== dock) hide(element);
					};
					if (viewMode !== "debug") dock.dataset.agentRpInput = "";
					refreshComposer();
					const observer = new MutationObserver(refreshComposer);
					observer.observe(inputRoot, {
						attributeFilter: ["placeholder"],
						attributes: true,
						childList: true,
						subtree: true
					});
					return () => {
						observer.disconnect();
						for (const [element, { display, priority }] of hiddenControls) if (display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", display, priority);
						delete dock.dataset.agentRpInput;
						for (const [textarea, previousPlaceholder] of managedTextareas) {
							if (textarea.getAttribute("placeholder") !== placeholder) continue;
							if (previousPlaceholder === null) textarea.removeAttribute("placeholder");
							else textarea.setAttribute("placeholder", previousPlaceholder);
						}
					};
				}, [placeholder, viewMode]);
				(0, react.useEffect)(() => {
					if (projection === void 0) return;
					const frontend = projection.frontend;
					const hasDisplayRules = viewMode === "immersive" && frontend !== void 0 && frontend.regexScripts.length + (projection.preset?.regexScripts.length ?? 0) > 0;
					const messageIdBySeq = new Map(projection.tavern?.messages.map((message) => [message.seq, message.messageId]));
					const mounted = /* @__PURE__ */ new Map();
					const hiddenTranscriptDetails = /* @__PURE__ */ new Map();
					const legacyConversationNotices = /* @__PURE__ */ new Set();
					const hideTranscriptDetail = (element) => {
						if (hiddenTranscriptDetails.has(element)) return;
						hiddenTranscriptDetails.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
					};
					const restoreTranscriptDetail = (element) => {
						const previous = hiddenTranscriptDetails.get(element);
						if (previous === void 0) return;
						if (previous.display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", previous.display, previous.priority);
						hiddenTranscriptDetails.delete(element);
					};
					const showLegacyConversationNotice = (item) => {
						if (item.dataset.agentRpLegacyConversation === "true") return;
						const notice = document.createElement("aside");
						notice.setAttribute("role", "status");
						notice.style.cssText = "border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:10px;margin:8px 0;padding:12px 14px;font-size:13px;line-height:1.6;opacity:.76;";
						notice.textContent = "这段会话由早期预览版创建，当前版本无法继续读取它的轮次记录。原会话仍保留；请从标题栏打开“角色库”，选择对应角色后开始新对话。";
						item.before(notice);
						item.dataset.agentRpLegacyConversation = "true";
						legacyConversationNotices.add(notice);
						hideTranscriptDetail(item);
					};
					const bridge = (event) => {
						const sourceFrame = [...mounted.keys()].flatMap((root) => [...root.querySelectorAll("iframe[data-agent-rp-frame]")]).find((frame) => frame.contentWindow === event.source);
						if (sourceFrame == null || typeof event.data !== "object" || event.data === null) return;
						const message = event.data;
						if (message.source !== "dsh-agent-rp-card") return;
						if (message.action === "resize" && typeof message.value === "number" && Number.isFinite(message.value)) {
							sourceFrame.style.height = `${Math.max(72, Math.ceil(message.value))}px`;
							return;
						}
						if (typeof message.value !== "string" || message.value.length > 65536) return;
						if (message.action === "draft") {
							inputActions.setDraft(message.value);
							return;
						}
						if (message.action !== "trigger-slash") return;
						const draft = message.value.match(/^\/setinput\s+([\s\S]*)$/u);
						if (draft?.[1] !== void 0) {
							inputActions.setDraft(draft[1]);
							return;
						}
						const send = message.value.match(/^\/send\s+([\s\S]*?)(?:\|\/trigger)?$/u);
						if (send?.[1] === void 0) return;
						(ctx.sessions.scope(sessionId)?.get("conversation"))?.send(send[1]);
					};
					const mountRenderedDisplay = (item, original, segments) => {
						const existing = item.querySelector(":scope > [data-agent-rp-rendered-display]");
						const existingRoot = existing === null ? void 0 : mounted.get(existing);
						if (existing !== null && existingRoot !== void 0) {
							existingRoot.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplay, {
								segments,
								statData: projection.mvu?.statData,
								characterName: projection.characterName,
								...characterDetail === void 0 ? {} : { character: characterDetail }
							}));
							return;
						}
						const display = document.createElement("div");
						display.style.cssText = "display:block;min-width:0;width:100%;";
						display.dataset.agentRpRenderedDisplay = "true";
						original.style.display = "none";
						item.dataset.agentRpFrontend = "true";
						item.insertBefore(display, original.nextSibling);
						const root = (0, react_dom_client.createRoot)(display);
						mounted.set(display, root);
						root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplay, {
							segments,
							statData: projection.mvu?.statData,
							characterName: projection.characterName,
							...characterDetail === void 0 ? {} : { character: characterDetail }
						}));
					};
					window.addEventListener("message", bridge);
					const scan = () => {
						const scroll = rootRef.current?.closest("[data-conversation-scroll]");
						if (scroll === null || scroll === void 0) return;
						if (viewMode === "immersive") {
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"context\"], [data-chat-flow-kind=\"tool-call\"], [data-chat-flow-kind=\"manual-compaction\"], [data-chat-flow-kind=\"compaction\"], [data-chat-flow-kind=\"model-retry\"], [data-chat-flow-kind=\"unknown\"]")) hideTranscriptDetail(item);
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"command\"]")) if (item.querySelector("[data-agent-rp-image-card]") === null) hideTranscriptDetail(item);
							else restoreTranscriptDetail(item);
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-error\"]")) {
								if (item.textContent?.includes("agent-rp/character-card-seed has invalid provenance")) {
									hideTranscriptDetail(item);
									continue;
								}
								if (!item.textContent?.includes("received more than one start Match") || item.dataset.agentRpLegacyConversation === "true") continue;
								showLegacyConversationNotice(item);
							}
							for (const item of scroll.querySelectorAll("[data-chat-flow] > div")) {
								if (!item.textContent?.startsWith("历史加载失败：conversation Context") || !item.textContent.includes("received more than one start Match")) continue;
								showLegacyConversationNotice(item);
							}
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"user\"]")) {
								if (item.dataset.agentRpSetupCollapsed === "true" || !item.textContent?.includes("🎬 档案提交完毕指令：")) continue;
								const content = item.firstElementChild;
								if (content === null) continue;
								const details = document.createElement("details");
								details.style.cssText = "font-size:12px;opacity:.72;";
								const summaryElement = document.createElement("summary");
								summaryElement.textContent = "角色设定已提交";
								summaryElement.style.cssText = "cursor:pointer;list-style:none;";
								const original = content.cloneNode(true);
								original.style.cssText = "margin-top:8px;max-height:240px;overflow:auto;white-space:pre-wrap;";
								details.append(summaryElement, original);
								content.style.display = "none";
								item.insertBefore(details, content.nextSibling);
								item.dataset.agentRpSetupCollapsed = "true";
							}
						}
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"user\"]")) {
							const key = item.dataset.chatFlowKey;
							const node = key === void 0 ? void 0 : chat.nodes.get(key);
							if (node?.kind !== "user") continue;
							const messageId = messageIdBySeq.get(node.data.seq);
							const override = messageId === void 0 ? void 0 : displayOverrides.get(messageId);
							const original = item.firstElementChild;
							if (override === void 0 || original === null) continue;
							mountRenderedDisplay(item, original, [{
								kind: "html",
								source: override
							}]);
						}
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"assistant-step\"]")) {
							const key = item.dataset.chatFlowKey;
							if (key === void 0) continue;
							const node = chat.nodes.get(key);
							if (node?.kind !== "assistant-step") continue;
							const data = node.data;
							const finalSeq = node.data.finalNode?.seq;
							const generation = finalSeq === void 0 ? void 0 : projection.generations.find((group) => group.assistantSeqs.includes(finalSeq));
							const selected = generation?.versions.find((version) => version.seq === generation.selectedVersionSeq);
							const messageId = (selected === void 0 ? void 0 : messageIdBySeq.get(selected.seq)) ?? (finalSeq === void 0 ? void 0 : messageIdBySeq.get(finalSeq));
							const override = messageId === void 0 ? void 0 : displayOverrides.get(messageId);
							const original = item.firstElementChild;
							if (override !== void 0 && original !== null) {
								mountRenderedDisplay(item, original, [{
									kind: "html",
									source: override
								}]);
								continue;
							}
							if (viewMode === "immersive" && generation !== void 0) {
								if (finalSeq !== generation.anchorSeq) {
									hideTranscriptDetail(item);
									continue;
								}
								if (selected !== void 0 && original !== null) {
									const segments = splitCharacterDisplay(renderCharacterDisplay(selected.text.replaceAll(statusPlaceholder, ""), {
										name: projection.characterName,
										frontend: projection.frontend ?? {
											regexScripts: [],
											tavernHelperScriptNames: [],
											tavernHelperScripts: [],
											tavernHelperVariables: {}
										}
									}, 2, 0, projection.userName, projection.preset?.regexScripts));
									mountRenderedDisplay(item, original, segments);
									continue;
								}
							}
							if (item.dataset.agentRpFrontend === "true") continue;
							if (viewMode === "immersive") for (const element of item.querySelectorAll("[data-variant=\"think\"]")) hideTranscriptDetail(element);
							if (!hasDisplayRules || frontend === void 0) continue;
							const raw = data.blocks?.flatMap((block) => block.kind === "text" && block.text !== void 0 ? [block.text] : []).join("\n") ?? "";
							if (raw === "") continue;
							const depth = Math.max(0, chat.order.length - chat.order.indexOf(key) - 1);
							const rendered = renderCharacterDisplay(raw.replaceAll(statusPlaceholder, ""), {
								name: projection.characterName,
								frontend
							}, 2, depth, projection.userName, projection.preset?.regexScripts);
							if (rendered === raw) continue;
							const segments = splitCharacterDisplay(rendered);
							if (!segments.some((segment) => segment.kind === "html")) continue;
							if (original === null) continue;
							mountRenderedDisplay(item, original, segments);
						}
						if (viewMode === "immersive") for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-tail\"]")) {
							const key = item.dataset.chatFlowKey;
							const node = key === void 0 ? void 0 : chat.nodes.get(key);
							if (node?.kind !== "turn-tail") continue;
							const seq = node.data.closing?.finalNode?.seq;
							if (seq !== void 0 && projection.generations.some((group) => group.assistantSeqs.includes(seq) && seq !== group.anchorSeq)) hideTranscriptDetail(item);
						}
					};
					scan();
					const observer = new MutationObserver(scan);
					observer.observe(document.body, {
						childList: true,
						subtree: true
					});
					return () => {
						observer.disconnect();
						window.removeEventListener("message", bridge);
						for (const [display, root] of mounted) {
							const item = display.closest("[data-agent-rp-frontend]");
							const original = item?.firstElementChild;
							if (original !== null) original.style.removeProperty("display");
							if (item !== null) delete item.dataset.agentRpFrontend;
							root.unmount();
							display.remove();
						}
						for (const [element, { display, priority }] of hiddenTranscriptDetails) {
							if (display === "") element.style.removeProperty("display");
							else element.style.setProperty("display", display, priority);
							delete element.dataset.agentRpLegacyConversation;
						}
						for (const notice of legacyConversationNotices) notice.remove();
						const scroll = rootRef.current?.closest("[data-conversation-scroll]");
						for (const item of scroll?.querySelectorAll("[data-agent-rp-setup-collapsed=\"true\"]") ?? []) {
							item.firstElementChild?.style.removeProperty("display");
							item.querySelector(":scope > details")?.remove();
							delete item.dataset.agentRpSetupCollapsed;
						}
					};
				}, [
					chat,
					characterDetail,
					displayOverrides,
					projection,
					viewMode
				]);
				if (projection === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rootRef,
					"data-agent-rp-status": true,
					style: {
						alignItems: "center",
						display: "flex",
						gap: "4px",
						minWidth: 0
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TavernScriptRuntime, {
							ctx,
							inputActions,
							onDisplayOverride,
							projection,
							runGeneration: runTavernGeneration,
							runModelList: runTavernModelList,
							runMutation: runTavernMutation,
							runPresetConfiguration,
							sessionId
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-label": "生成聊天插图",
							title: "生成聊天插图",
							onClick: () => {
								setDrawOpen(true);
							},
							style: {
								alignItems: "center",
								background: "transparent",
								border: 0,
								borderRadius: "7px",
								color: "inherit",
								cursor: "pointer",
								display: "inline-flex",
								flex: "0 0 auto",
								font: "inherit",
								fontSize: "11px",
								gap: "4px",
								opacity: .62,
								padding: "3px 7px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color },
								children: "✦"
							}), "绘图"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusLine, {
							projection: summary?.title?.trim() && summary.title.trim() !== projection.characterName ? {
								...projection,
								characterName: summary.title.trim()
							} : projection,
							running: useSession((state) => state.running)
						}),
						drawOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationDialog, {
							projection,
							onClose: () => {
								setDrawOpen(false);
							},
							onGenerate: (request) => {
								runImageGeneration(sessionId, request);
							}
						})
					]
				});
			};
		}
		function RoleplayStatusLine({ projection, running }) {
			const parts = [
				projection.userName === void 0 ? void 0 : `你是 ${projection.userName}`,
				projection.worldInfoCount === 0 ? void 0 : `世界书 ${projection.worldInfoCount} 条`,
				projection.importedMessageCount === 0 ? void 0 : `已迁移 ${projection.importedMessageCount} 条历史`
			].filter((part) => part !== void 0);
			if (!running && parts.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					alignItems: "center",
					display: "flex",
					fontSize: "11px",
					gap: "8px",
					minHeight: "18px",
					opacity: .5,
					padding: "0 10px"
				},
				children: [
					running && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [projection.characterName, "正在回应"] }),
					running && parts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "·" }),
					parts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: parts.join(" · ") })
				]
			});
		}
		const hintStyle = {
			alignItems: "center",
			background: `color-mix(in srgb, ${color} 8%, transparent)`,
			border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
			borderRadius: "10px",
			display: "flex",
			flexWrap: "wrap",
			gap: "10px",
			padding: "9px 12px"
		};
		const markStyle = {
			alignItems: "center",
			background: `color-mix(in srgb, ${color} 16%, transparent)`,
			borderRadius: "8px",
			display: "flex",
			flex: "0 0 30px",
			fontSize: "16px",
			height: "30px",
			justifyContent: "center"
		};
		const actionStyle = {
			background: `color-mix(in srgb, ${color} 12%, transparent)`,
			border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
			borderRadius: "7px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "12px",
			padding: "5px 9px"
		};
		function importHintComponent(ctx, migrateDraft, listPresets) {
			return function SillyTavernImportHint({ input, inputActions, sessionId }) {
				const [busy, setBusy] = (0, react.useState)(false);
				const [error, setError] = (0, react.useState)();
				const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
				const { entries: loadedPresets, error: presetError, presetId, selectPreset } = usePresetPreference(listPresets, summary?.agentPreset === "agent-rp");
				const presets = loadedPresets ?? [];
				if (summary?.agentPreset !== "agent-rp") return null;
				const conversation = ctx.sessions.scope(sessionId)?.get("conversation");
				const ids = [.../* @__PURE__ */ new Set([...input.attachmentIds ?? [], ...input.imageIds ?? []])];
				const draftAttachments = conversation?.draftAttachments;
				const attachments = typeof draftAttachments === "function" ? draftAttachments.call(conversation, ids) : [];
				const selected = selectSillyTavernDraft(attachments);
				if (selected === void 0) return null;
				const blank = input.draft.trim() === "";
				const chat = selected.kind === "chat";
				const migration = selected.kind === "migration";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: hintStyle,
					role: "status",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: markStyle,
							"aria-hidden": "true",
							children: "↗"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: "1 1 220px",
								minWidth: 0
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "13px",
										fontWeight: 600,
										lineHeight: 1.45
									},
									children: [migration ? "迁移角色与对话" : chat ? "导入历史对话" : selected.kind === "character-card" ? "识别到 CHARX 角色卡" : selected.kind === "json-resource" ? "识别到 JSON 资源" : "识别到 PNG 图片", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontWeight: 400,
											marginLeft: "6px",
											opacity: .72
										},
										children: selected.name
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.45,
										marginTop: "2px",
										opacity: .62
									},
									children: migration ? "将创建一个角色会话，并保留原聊天历史" : chat ? "将从这份记录创建新的角色会话" : blank ? "请选择导入类型" : "发送后开始导入"
								}),
								(error ?? presetError) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										color: "var(--dsw-alias-state-danger, #d64d5f)",
										fontSize: "12px",
										marginTop: "4px"
									},
									children: error ?? presetError
								})
							]
						}),
						(chat || migration) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "8px",
								marginLeft: "auto"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "迁移对话预设",
								value: presetId,
								onChange: (event) => {
									selectPreset(event.target.value);
								},
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "7px",
									color: "inherit",
									font: "inherit",
									fontSize: "11px",
									maxWidth: "150px",
									padding: "5px 7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "不使用预设"
								}), presets.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: entry.id,
									children: entry.name
								}, entry.id))]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								disabled: busy,
								onClick: () => {
									setBusy(true);
									setError(void 0);
									migrateDraft(sessionId, attachments, inputActions, presetId === "" ? void 0 : presetId).catch((reason) => {
										setError(reason instanceof Error ? reason.message : String(reason));
									}).finally(() => {
										setBusy(false);
									});
								},
								children: busy ? "正在迁移…" : migration ? "迁移" : "导入"
							})]
						}),
						!chat && !migration && blank && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								marginLeft: "auto"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这张角色卡");
									},
									children: "角色卡"
								}),
								selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这本世界书");
									},
									children: "世界书"
								}),
								selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这份预设");
									},
									children: "预设"
								})
							]
						})
					]
				});
			};
		}
		function avatarLoader(ctx) {
			return async (attachmentId) => {
				const sessionId = ctx.sessions.list.getSnapshot().current;
				if (sessionId === void 0) return void 0;
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) return void 0;
				const result = await session.readAttachment(attachmentId);
				if (!result.ok) return void 0;
				const bytes = new Uint8Array(result.value.data).slice().buffer;
				const blob = new Blob([bytes], { type: result.value.attachment.mediaType });
				return URL.createObjectURL(blob);
			};
		}
		/** Client services required by the Roleplay shell. */
		const inject = [
			"connection",
			"slots",
			"sessions",
			"workspaces"
		];
		/** Register the Agent RP header, composer presentation, and import affordance. */
		function apply(ctx) {
			const workspaceSettings = createWorkspaceSettingsSource();
			const workspaceList = {
				getSnapshot: () => ctx.workspaces.list.getSnapshot(),
				subscribe: (listener) => ctx.workspaces.list.subscribe(listener)
			};
			const loadAvatar = avatarLoader(ctx);
			const loadModelCapabilities = async (sessionId) => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("当前客户端无法读取模型能力");
				const { result } = await connection.api.sessions.models({ sessionId });
				if (!result.ok) throw new Error(result.error.message);
				const provider = result.value.groups.find((group) => group.id === result.value.current.provider);
				const model = provider?.models.find((entry) => entry.id === result.value.current.model);
				return {
					current: result.value.current,
					...provider === void 0 ? {} : { providerName: provider.name },
					...model === void 0 ? {} : {
						modelName: model.name,
						reasoning: model.reasoning ?? { efforts: [] }
					}
				};
			};
			const renameSession = async (sessionId, title) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const result = await session.rename(title);
				if (!result.ok) throw new Error(result.error.message);
			};
			const characterLibraryJson = async (path = "") => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
				return value;
			};
			const listCharacters = async (collection = "active") => {
				return (await characterLibraryJson(collection === "active" ? "" : "?collection=archived")).entries;
			};
			const readCharacter = async (id) => {
				return (await characterLibraryJson(`/${encodeURIComponent(id)}`)).entry;
			};
			const setCharacterArchived = async (id, archived) => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/${archived ? "archive" : "restore"}`, {
					method: "POST",
					headers: { accept: "application/json" }
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
				return value.entry;
			};
			const importCharacterFile = async (file) => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}/import?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/octet-stream"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0 || value.outcome === void 0) throw new Error(value.error ?? `角色卡导入失败（${response.status}）`);
				return {
					entry: value.entry,
					outcome: value.outcome
				};
			};
			const launchRoleplaySession = async (request) => {
				const response = await fetch(AGENT_RP_SESSION_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(request)
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的角色会话" : `角色会话创建失败（${response.status}）`);
				}
				if (!response.ok || value.sessionId === void 0) throw new Error(value.error ?? `角色会话创建失败（${response.status}）`);
				const sessionId = value.sessionId;
				await ctx.sessions.refresh();
				if (ctx.sessions.list.getSnapshot().byId[sessionId] === void 0) throw new Error("角色会话已创建，但客户端尚未收到它；请刷新页面后重试");
				ctx.sessions.open(sessionId);
				return sessionId;
			};
			const startCharacterSession = async (sessionId, character, greetingIndex, persona, presetId) => {
				await launchRoleplaySession({
					format: 0,
					sourceSessionId: sessionId,
					kind: "character",
					characterId: character.id,
					greetingIndex,
					...persona === void 0 ? {} : { persona },
					...presetId === void 0 ? {} : { presetId }
				});
			};
			const archiveConsumedBlankSession = async (sessionId) => {
				if (ctx.sessions.list.getSnapshot().byId[sessionId]?.blank !== true) return;
				try {
					await ctx.workspaces.archiveSession(sessionId);
				} catch (reason) {
					ctx.logger.warn(`agent-rp: blank source Session ${JSON.stringify(sessionId)} remains visible: ${String(reason)}`);
				}
			};
			const startCharacterFromBlankSession = async (sessionId, character, greetingIndex, persona, presetId) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话选择角色");
				await startCharacterSession(sessionId, character, greetingIndex, persona, presetId);
				await archiveConsumedBlankSession(sessionId);
			};
			const startCharacterFromCurrentSession = async (sessionId, character, greetingIndex, persona, presetId) => {
				await startCharacterSession(sessionId, character, greetingIndex, persona, presetId);
			};
			const migrateChat = async (sourceSessionId, chatFile, cardFile, presetId) => {
				if (!/\.jsonl$/iu.test(chatFile.name)) throw new Error("请选择 SillyTavern 导出的 JSONL 聊天记录");
				const character = cardFile === void 0 ? void 0 : await importCharacterFile(cardFile);
				const response = await fetch(`${SILLYTAVERN_CHAT_PATH}?filename=${encodeURIComponent(chatFile.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": chatFile.type || "application/x-ndjson"
					},
					body: chatFile
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的聊天迁移结果" : `聊天记录上传失败（${response.status}）`);
				}
				if (!response.ok || value.upload === void 0) throw new Error(value.error ?? `聊天记录上传失败（${response.status}）`);
				await launchRoleplaySession({
					format: 0,
					sourceSessionId,
					kind: "chat",
					importId: value.upload.id,
					...character === void 0 ? {} : { characterId: character.entry.id },
					...presetId === void 0 ? {} : { presetId }
				});
			};
			const migrateSillyTavernDraft = async (sourceSessionId, attachments, inputActions, presetId) => {
				const chatAttachment = attachments.find((attachment) => attachment.kind === "file" && /\.jsonl$/iu.test(attachment.file.name));
				if (chatAttachment === void 0) throw new Error("没有找到 JSONL 聊天记录");
				const cardAttachment = attachments.find((attachment) => attachment !== chatAttachment);
				await migrateChat(sourceSessionId, chatAttachment.file, cardAttachment?.file, presetId);
				const sourceConversation = ctx.sessions.scope(sourceSessionId)?.get("conversation");
				const actions = inputActions;
				for (const attachment of attachments) {
					actions.removeAttachment?.(attachment.id);
					actions.removeImage?.(attachment.id);
					sourceConversation?.releaseDraftAttachment?.(attachment.id);
				}
			};
			const migrateChatFromBlankSession = async (sourceSessionId, chatFile, cardFile, presetId) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sourceSessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话迁移聊天");
				await migrateChat(sourceSessionId, chatFile, cardFile, presetId);
				await archiveConsumedBlankSession(sourceSessionId);
			};
			const personaLibraryJson = async (init) => {
				const response = await fetch(PERSONA_LIBRARY_PATH, init === void 0 ? { headers: { accept: "application/json" } } : {
					method: init.method,
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(init.body)
				});
				const value = await response.json();
				if (!response.ok) throw new Error(value.error ?? `Persona 库请求失败（${response.status}）`);
				return value;
			};
			const listPersonas = async () => {
				return (await personaLibraryJson()).entries;
			};
			const listPresets = async () => {
				const response = await fetch(PRESET_LIBRARY_PATH, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok || value.entries === void 0) throw new Error(value.error ?? `预设库请求失败（${response.status}）`);
				return value.entries;
			};
			const savePersona = async (request) => {
				return (await personaLibraryJson({
					method: "POST",
					body: request
				})).entry;
			};
			const deletePersona = async (id) => {
				const response = await fetch(`${PERSONA_LIBRARY_PATH}/${encodeURIComponent(id)}`, {
					method: "DELETE",
					headers: { accept: "application/json" }
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `Persona 移除失败（${response.status}）`);
				return value.entry;
			};
			const applyPersona = async (sessionId, persona) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-persona ${JSON.stringify({
					format: 0,
					...persona === void 0 ? {} : { persona }
				})}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用身份管理");
			};
			const importPreset = async (sessionId, file) => {
				if (!/\.json$/iu.test(file.name)) throw new Error("请选择 SillyTavern 预设 JSON 文件");
				const response = await fetch(`${PRESET_LIBRARY_PATH}?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/json"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `预设导入失败（${response.status}）`);
				await managePresetLibrary(sessionId, {
					operation: "select",
					id: value.entry.id
				});
			};
			const configurePreset = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-preset-configure ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用预设管理命令");
			};
			const managePresetLibrary = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-preset-library ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用预设库");
			};
			const configureWorldInfo = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-world-info ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用世界书管理");
			};
			const importWorldInfo = async (sessionId, file) => {
				if (!/\.json$/iu.test(file.name)) throw new Error("请选择 SillyTavern World Info JSON 文件");
				const response = await fetch(`${WORLD_INFO_LIBRARY_PATH}?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/json"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.upload === void 0) throw new Error(value.error ?? `世界书上传失败（${response.status}）`);
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const request = {
					format: 0,
					importId: value.upload.id
				};
				const result = await session.command(`/rp-world-info-import ${JSON.stringify(request)}`);
				if (!result.ok) throw new Error(result.error.message);
				if (!result.value.matched) throw new Error("当前 Host 未启用世界书导入");
			};
			const runGeneration = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-generation ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用回复版本控制");
			};
			const runImageGeneration = (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const jobId = `image-${crypto.randomUUID()}`;
				const payload = {
					format: 0,
					jobId,
					...request
				};
				session.command(`/rp-draw ${JSON.stringify(payload)}`).then((response) => {
					if (!response.ok) throw new Error(response.error.message);
					if (!response.value.matched) throw new Error("当前 Host 未启用聊天绘图");
				}).catch((reason) => {
					ctx.logger.warn(`agent-rp: image command ${JSON.stringify(jobId)} failed: ${String(reason)}`);
				});
				return jobId;
			};
			const runTavernMutation = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-tavern-variables ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用酒馆脚本变量桥");
			};
			const runTavernGeneration = async (sessionId, request) => {
				const response = await fetch(TAVERN_GENERATION_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						sessionId,
						...request
					})
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的脚本生成结果" : `酒馆脚本生成失败（${response.status}）`);
				}
				if (!response.ok || value.format !== 0 || typeof value.text !== "string") throw new Error(value.error ?? `酒馆脚本生成失败（${response.status}）`);
				return value.text;
			};
			const runTavernModelList = async (request) => {
				const response = await fetch(TAVERN_MODEL_LIST_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						...request
					})
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的模型列表" : `模型列表读取失败（${response.status}）`);
				}
				if (!response.ok || value.format !== 0 || !Array.isArray(value.models) || value.models.some((model) => typeof model !== "string")) throw new Error(value.error ?? `模型列表读取失败（${response.status}）`);
				return value.models;
			};
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "agent-rp-character-header",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayHeader, {
				...props,
				loadAvatar,
				renameSession,
				configurePreset,
				importPreset,
				managePresetLibrary,
				configureWorldInfo,
				importWorldInfo,
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				migrateChat,
				startCharacterSession: startCharacterFromCurrentSession,
				listPresets,
				listPersonas,
				savePersona,
				deletePersona,
				applyPersona,
				loadModelCapabilities
			})));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "agent-rp",
				order: 25,
				label: "Agent RP"
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceSettingsSection, {
				...props,
				workspaceSettings,
				workspaceList
			})));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "agent-rp-blank-launcher",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlankRoleplayLauncher, {
				...props,
				workspaceSettings,
				workspaceList,
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				migrateChat: migrateChatFromBlankSession,
				startCharacterSession: startCharacterFromBlankSession,
				listPresets,
				listPersonas,
				savePersona,
				deletePersona
			})));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-tavern-variables"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-character-library"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-chat-import"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-persona"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-configure"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-library"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-generation"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-draw"
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationCommandCard, {
				...props,
				runImageGeneration
			})));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-world-info"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-world-info-import"
			}, () => null));
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				priority: 100,
				select: (owner) => {
					const closing = owner.turn.data.get("turn-tail")?.closing;
					return closing === null || closing === void 0 ? null : { replySeq: closing.finalNode.seq };
				}
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GenerationTail, {
				...props,
				runGeneration,
				runImageGeneration
			})));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "agent-rp-status",
				order: -100
			}, roleplayComposerDockComponent(ctx, runImageGeneration, runTavernMutation, runTavernGeneration, runTavernModelList, configurePreset)));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "agent-rp-sillytavern-import-hint",
				order: -10
			}, importHintComponent(ctx, migrateSillyTavernDraft, listPresets)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map