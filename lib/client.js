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
		/** Serialize the supported current configuration as a new SillyTavern preset JSON file. */
		function exportSillyTavernPresetJson(preset) {
			const generation = preset.generation;
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
				extensions: { regex_scripts: preset.regexScripts.map(regex) }
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
		//#region src/frontend-regex.ts
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
			if (text === "") return;
			const previous = segments.at(-1);
			if (previous?.kind === "markdown") {
				segments[segments.length - 1] = {
					kind: "markdown",
					text: previous.text + text
				};
				return;
			}
			segments.push({
				kind: "markdown",
				text
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
		/** Stable text prefix recognized by the Character Card Session importer. */
		const CHARACTER_LIBRARY_SESSION_PREFIX = "请从角色库开始新会话";
		/** Serialize a library launch without exposing its controls to the model. */
		function encodeCharacterLibrarySessionRequest(request) {
			return `${CHARACTER_LIBRARY_SESSION_PREFIX}\n${JSON.stringify(request)}`;
		}
		//#endregion
		//#region src/persona-library-protocol.ts
		/** Browser-safe values shared by the local Persona library and Roleplay UI. */
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const PERSONA_LIBRARY_PATH = "/api/agent-rp/personas";
		//#endregion
		//#region src/client/index.tsx
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
		function GenerationTail({ matched, runGeneration, sessionId, useProjection, useSession }) {
			const projection = useProjection("agentRp");
			const running = useSession((snapshot) => snapshot.running);
			const [busy, setBusy] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const group = projection?.generations.find((candidate) => candidate.anchorSeq === matched.replySeq);
			if (projection === void 0 || projection.currentReplySeq !== matched.replySeq) return null;
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
		function initials(name) {
			return [...name.trim()].slice(0, 1).join("").toUpperCase() || "RP";
		}
		function characterCapabilitySummary(projection) {
			const parts = [
				projection.worldInfoCount > 0 ? `${projection.worldInfoCount} 条世界书` : void 0,
				(projection.frontend?.regexScripts.length ?? 0) > 0 ? "轻前端" : void 0,
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
		function BlankRoleplayLauncher({ session, sessionId, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, startCharacterSession, listPersonas, savePersona, deletePersona }) {
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			if (!session.blank) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
			}), libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryDialog, {
				currentCharacterName: "",
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				onClose: () => {
					setLibraryOpen(false);
				},
				onStart: (character, greetingIndex, persona) => startCharacterSession(sessionId, character, greetingIndex, persona),
				listPersonas,
				savePersona,
				deletePersona
			})] });
		}
		function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar, renameSession, configurePreset, importPreset, managePresetLibrary, configureWorldInfo, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, startCharacterSession, listPersonas, savePersona, deletePersona }) {
			const summary = useSessions((state) => state.byId[sessionId]);
			const projection = roleplaySummary(summary, useProjection("agentRp"));
			const [open, setOpen] = (0, react.useState)(false);
			const [statusOpen, setStatusOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [worldInfoOpen, setWorldInfoOpen] = (0, react.useState)(false);
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [aliasDraft, setAliasDraft] = (0, react.useState)("");
			const [aliasError, setAliasError] = (0, react.useState)();
			const [renaming, setRenaming] = (0, react.useState)(false);
			const viewMode = useRoleplayViewMode(sessionId);
			const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
			const expressionChoice = useRoleplayExpression(sessionId);
			const rootRef = (0, react.useRef)(null);
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setPresetOpen(true);
							},
							style: {
								background: "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #444)",
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: "预设"
						}),
						projection.worldInfo.books.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setWorldInfoOpen(true);
							},
							style: {
								background: projection.worldInfo.activeCount > 0 ? `color-mix(in srgb, ${color} 12%, transparent)` : "transparent",
								border: `1px solid ${projection.worldInfo.activeCount > 0 ? `color-mix(in srgb, ${color} 34%, transparent)` : "var(--dsw-alias-border-l2, #444)"}`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: ["世界书", projection.worldInfo.activeCount === 0 ? "" : ` · ${projection.worldInfo.activeCount}`]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": viewMode === "debug",
							onClick: () => {
								setRoleplayViewMode(sessionId, viewMode === "immersive" ? "debug" : "immersive");
							},
							style: {
								background: viewMode === "debug" ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #444)",
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: viewMode === "debug" ? "返回沉浸" : "调试"
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
									(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: chipStyle,
										children: projection.mvu === void 0 ? "MVU · 未初始化" : `MVU · 已接通${projection.mvu.updateCount === 0 ? "" : ` · ${projection.mvu.updateCount} 次更新`}`
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
					onStart: (character, greetingIndex, userName) => startCharacterSession(sessionId, character, greetingIndex, userName),
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
					preset: projection.preset,
					lastRequest: projection.lastRequest,
					entries: projection.presetLibrary,
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
		function WorldInfoManagerDialog({ worldInfo, onClose, onSave }) {
			const first = worldInfo.books.flatMap((book) => book.entries.map((entry) => `${book.id}\u0000${entry.index}`))[0];
			const [selectedKey, setSelectedKey] = (0, react.useState)(first);
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)();
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
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
			if (pair === void 0) return null;
			const { book, entry } = pair;
			const reason = worldInfoReason(entry);
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
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
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
								style: {
									...generationButtonStyle,
									marginLeft: "auto"
								},
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
									marginLeft: hasOverrides ? 0 : "auto",
									padding: "3px 6px"
								},
								children: "×"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					})]
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
		function CharacterLibraryDialog({ currentCharacterName, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, listPersonas, savePersona, deletePersona, onClose, onStart }) {
			const narrow = useNarrowCharacterLibrary();
			const startsInCurrentSession = currentCharacterName === "";
			const [collection, setCollection] = (0, react.useState)("active");
			const [characterQuery, setCharacterQuery] = (0, react.useState)("");
			const [entries, setEntries] = (0, react.useState)();
			const [selected, setSelected] = (0, react.useState)();
			const [greetingIndex, setGreetingIndex] = (0, react.useState)(0);
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
									children: startsInCurrentSession ? "选择角色后，会从当前空白会话开始" : "从这里开始新对话，不会改动当前聊天"
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
												children: startsInCurrentSession ? "设置这段对话" : "开始一段新的角色对话"
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
											}).then(() => {
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
										children: starting ? "正在开始…" : startsInCurrentSession ? "在当前会话开始" : "开始新对话"
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
		function PresetManagerDialog({ preset, lastRequest, entries, onClose, onImport, onSave, onLibrary }) {
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
			const importInputRef = (0, react.useRef)(null);
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
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "off",
														children: "关闭"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "min",
														children: "Min"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "low",
														children: "Low"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "medium",
														children: "Medium"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "high",
														children: "High"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "xhigh",
														children: "XHigh"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "max",
														children: "Max"
													}),
													reasoningEffort !== "" && ![
														"auto",
														"off",
														"min",
														"low",
														"medium",
														"high",
														"xhigh",
														"max"
													].includes(reasoningEffort) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
														value: reasoningEffort,
														children: ["导入值 · ", reasoningEffort]
													})
												]
											})]
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
		const chipStyle = {
			background: `color-mix(in srgb, ${color} 10%, transparent)`,
			borderRadius: "999px",
			color: "inherit",
			fontSize: "11px",
			opacity: .76,
			padding: "5px 9px"
		};
		function roleplayComposerDockComponent(ctx) {
			return function RoleplayComposerDock({ inputActions, sessionId, useProjection, useSessions, useSession }) {
				const summary = useSessions((state) => state.byId[sessionId]);
				const projection = roleplaySummary(summary, useProjection("agentRp"));
				const chat = useSession((state) => state.chat);
				const viewMode = useRoleplayViewMode(sessionId);
				const rootRef = (0, react.useRef)(null);
				const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
				const background = selectedBackground(characterDetail, useRoleplayBackground(sessionId));
				const displayName = projection === void 0 ? void 0 : roleplayDisplayName(summary, projection);
				const placeholder = displayName === void 0 ? void 0 : `和${displayName}说点什么…`;
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
					const inputRoot = rootRef.current?.parentElement;
					const card = inputRoot?.querySelector("[data-composer-card]");
					const textarea = card?.querySelector("textarea");
					if (inputRoot == null || textarea == null || placeholder === void 0) return;
					const previousPlaceholder = textarea.getAttribute("placeholder");
					textarea.setAttribute("placeholder", placeholder);
					if (viewMode === "debug") return () => {
						if (textarea.getAttribute("placeholder") !== placeholder) return;
						if (previousPlaceholder === null) textarea.removeAttribute("placeholder");
						else textarea.setAttribute("placeholder", previousPlaceholder);
					};
					inputRoot.dataset.agentRpInput = "";
					const hiddenControls = /* @__PURE__ */ new Map();
					const hide = (element) => {
						if (!(element instanceof HTMLElement) || hiddenControls.has(element)) return;
						hiddenControls.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
					};
					const hideEngineeringControls = () => {
						const row = card?.lastElementChild;
						const tools = row?.firstElementChild;
						const trailing = row?.lastElementChild;
						for (const element of Array.from(tools?.children ?? [])) hide(element);
						for (const element of Array.from(trailing?.children ?? [])) if (element.tagName !== "BUTTON") hide(element);
						for (const element of Array.from(inputRoot.children)) if (element !== card && element !== rootRef.current) hide(element);
					};
					hideEngineeringControls();
					const observer = new MutationObserver(hideEngineeringControls);
					observer.observe(inputRoot, { childList: true });
					return () => {
						observer.disconnect();
						for (const [element, { display, priority }] of hiddenControls) if (display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", display, priority);
						delete inputRoot.dataset.agentRpInput;
						if (textarea.getAttribute("placeholder") !== placeholder) return;
						if (previousPlaceholder === null) textarea.removeAttribute("placeholder");
						else textarea.setAttribute("placeholder", previousPlaceholder);
					};
				}, [placeholder, viewMode]);
				(0, react.useEffect)(() => {
					if (projection === void 0) return;
					const frontend = projection.frontend;
					const hasDisplayRules = viewMode === "immersive" && frontend !== void 0 && frontend.regexScripts.length + (projection.preset?.regexScripts.length ?? 0) > 0;
					const mounted = /* @__PURE__ */ new Map();
					const hiddenTranscriptDetails = /* @__PURE__ */ new Map();
					const hideTranscriptDetail = (element) => {
						if (hiddenTranscriptDetails.has(element)) return;
						hiddenTranscriptDetails.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
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
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"context\"], [data-chat-flow-kind=\"tool-call\"], [data-chat-flow-kind=\"command\"], [data-chat-flow-kind=\"manual-compaction\"], [data-chat-flow-kind=\"compaction\"], [data-chat-flow-kind=\"model-retry\"], [data-chat-flow-kind=\"unknown\"]")) hideTranscriptDetail(item);
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-error\"]")) if (item.textContent?.includes("agent-rp/character-card-seed has invalid provenance")) hideTranscriptDetail(item);
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
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"assistant-step\"]")) {
							const key = item.dataset.chatFlowKey;
							if (key === void 0) continue;
							const node = chat.nodes.get(key);
							if (node?.kind !== "assistant-step") continue;
							const data = node.data;
							const finalSeq = node.data.finalNode?.seq;
							const generation = finalSeq === void 0 ? void 0 : projection.generations.find((group) => group.assistantSeqs.includes(finalSeq));
							if (viewMode === "immersive" && generation !== void 0) {
								const original = item.firstElementChild;
								if (finalSeq !== generation.anchorSeq) {
									hideTranscriptDetail(item);
									continue;
								}
								const selected = generation.versions.find((version) => version.seq === generation.selectedVersionSeq);
								if (selected !== void 0 && original !== null) {
									const segments = splitCharacterDisplay(renderCharacterDisplay(selected.text.replaceAll(statusPlaceholder, ""), {
										name: projection.characterName,
										frontend: projection.frontend ?? {
											regexScripts: [],
											tavernHelperScriptNames: []
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
							const original = item.firstElementChild;
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
						for (const [element, { display, priority }] of hiddenTranscriptDetails) if (display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", display, priority);
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
					projection,
					viewMode
				]);
				if (projection === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: rootRef,
					"data-agent-rp-status": true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusLine, {
						projection: summary?.title?.trim() && summary.title.trim() !== projection.characterName ? {
							...projection,
							characterName: summary.title.trim()
						} : projection,
						running: useSession((state) => state.running)
					})
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
		function importHintComponent(ctx) {
			return function SillyTavernImportHint({ input, inputActions, sessionId }) {
				if (ctx.sessions.list.getSnapshot().byId[sessionId]?.agentPreset !== "agent-rp") return null;
				const conversation = ctx.sessions.scope(sessionId)?.get("conversation");
				const ids = [.../* @__PURE__ */ new Set([...input.attachmentIds ?? [], ...input.imageIds ?? []])];
				const draftAttachments = conversation?.draftAttachments;
				const selected = selectSillyTavernDraft(typeof draftAttachments === "function" ? draftAttachments.call(conversation, ids) : []);
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
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "12px",
									lineHeight: 1.45,
									marginTop: "2px",
									opacity: .62
								},
								children: migration ? "将创建一个角色会话，并保留原聊天历史" : chat ? "将从这份记录创建新的角色会话" : blank ? "请选择导入类型" : "发送后开始导入"
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
		function base64(data) {
			let binary = "";
			const chunk = 32768;
			for (let offset = 0; offset < data.length; offset += chunk) binary += String.fromCharCode(...data.subarray(offset, offset + chunk));
			return btoa(binary);
		}
		/** Client services required by the Roleplay shell. */
		const inject = [
			"connection",
			"slots",
			"sessions"
		];
		/** Register the Agent RP header, composer presentation, and import affordance. */
		function apply(ctx) {
			const loadAvatar = avatarLoader(ctx);
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
			const startCharacterSession = async (sessionId, character, greetingIndex, persona) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(character.id)}/asset`);
				if (!response.ok) throw new Error(`无法读取角色卡原文件（${response.status}）`);
				const data = base64(new Uint8Array(await response.arrayBuffer()));
				const attachment = character.transport === "png" ? {
					type: "image",
					data,
					mediaType: "image/png",
					name: character.originalFilename
				} : {
					type: "file",
					data,
					mediaType: character.mediaType,
					name: character.originalFilename
				};
				const result = await session.prompt([attachment, {
					type: "text",
					text: encodeCharacterLibrarySessionRequest({
						format: 0,
						greetingIndex,
						...persona === void 0 ? {} : { persona }
					})
				}], "queue");
				if (!result.ok) throw new Error(result.error.message);
			};
			const startCharacterFromBlankSession = async (sessionId, character, greetingIndex, persona) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话选择角色");
				if (summary.agentPreset !== "agent-rp") {
					const response = await ctx.get("connection").api.agentPresets.select({
						sessionId,
						agentPreset: "agent-rp"
					});
					if (!response.result.ok) throw new Error(response.result.error.message);
					ctx.sessions.noteAgentPreset(sessionId, response.result.value.agentPreset);
				}
				await startCharacterSession(sessionId, character, greetingIndex, persona);
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
			const importPreset = async (sessionId, file) => {
				if (!/\.json$/iu.test(file.name)) throw new Error("请选择 SillyTavern 预设 JSON 文件");
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const result = await session.prompt([{
					type: "file",
					data: base64(new Uint8Array(await file.arrayBuffer())),
					name: file.name,
					...file.type === "" ? {} : { mediaType: file.type }
				}, {
					type: "text",
					text: "请导入这份预设"
				}], "queue");
				if (!result.ok) throw new Error(result.error.message);
			};
			const configurePreset = async (sessionId, request) => {
				const response = await ctx.get("connection").api.commands.execute({
					sessionId,
					line: `/rp-preset-configure ${JSON.stringify(request)}`
				});
				if (!response.result.ok) throw new Error(response.result.error?.message ?? "预设保存失败");
				if (response.result.value?.matched !== true) throw new Error("当前 Host 未启用预设管理命令");
			};
			const managePresetLibrary = async (sessionId, request) => {
				const response = await ctx.get("connection").api.commands.execute({
					sessionId,
					line: `/rp-preset-library ${JSON.stringify(request)}`
				});
				if (!response.result.ok) throw new Error(response.result.error?.message ?? "预设库操作失败");
				if (response.result.value?.matched !== true) throw new Error("当前 Host 未启用预设库");
			};
			const configureWorldInfo = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-world-info ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用世界书管理");
			};
			const runGeneration = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-generation ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用回复版本控制");
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
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				startCharacterSession,
				listPersonas,
				savePersona,
				deletePersona
			})));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "agent-rp-blank-launcher",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlankRoleplayLauncher, {
				...props,
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				startCharacterSession: startCharacterFromBlankSession,
				listPersonas,
				savePersona,
				deletePersona
			})));
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
				key: "rp-world-info"
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
				runGeneration
			})));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "agent-rp-status",
				order: -100
			}, roleplayComposerDockComponent(ctx)));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "agent-rp-sillytavern-import-hint",
				order: -10
			}, importHintComponent(ctx)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map