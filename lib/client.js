window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
				const card = attachments.find((attachment) => attachment.kind === "file" && /\.json$/iu.test(attachment.file.name.trim()) || attachment.kind === "image" && /\.png$/iu.test(attachment.file.name.trim()));
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
			if (attachment.kind === "image" && /\.png$/iu.test(name)) return {
				kind: "png-candidate",
				name
			};
		}
		//#endregion
		//#region src/client/index.tsx
		const color = "var(--dsw-alias-state-business-primary, #6f78e8)";
		const statusPlaceholder = "<StatusPlaceHolderImpl/>";
		const cardFrameCompatibility = `<style>
html,body{margin:0!important;max-width:100%!important;background:transparent!important;color-scheme:dark;scrollbar-color:rgba(145,158,181,.58) transparent;scrollbar-width:thin}
body{overflow-x:hidden!important}
*,*::before,*::after{box-sizing:border-box}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(145,158,181,.58);background-clip:padding-box}
img,svg,video,canvas{max-width:100%}
.form-control,.dynamic-item>*{min-width:0;max-width:100%}
.add-btn .svg-icon{fill:none!important;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}
@media(max-width:600px){.chapter-section>label{width:100%!important;white-space:nowrap}.chapter-section>.form-control{width:100%!important;flex:none!important}}
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
		function cardFrameSource(rendered, statData) {
			const adapted = rendered.replace(/```html/giu, "").replace(/```/gu, "").replaceAll("window.parent?.document ?? window.document", "window.document");
			return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; frame-src 'none';"><meta name="viewport" content="width=device-width,initial-scale=1">${cardFrameCompatibility}</head><body><textarea id="send_textarea" hidden></textarea><script>${mvuFrameRuntime(statData)}window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};function __dshReportSize(){var root=document.documentElement;var body=document.body;var value=Math.max(root?root.scrollHeight:0,body?body.scrollHeight:0);parent.postMessage({source:'dsh-agent-rp-card',action:'resize',value:value},'*')}function __dshAdaptChoices(){document.querySelectorAll('.nova-container').forEach(function(container){if(container.dataset.dshAdapted==='true')return;var header=container.querySelector('.nova-header');var content=container.querySelector('.collapsible-content');var group=container.querySelector('.button-group-silent');var submit=container.querySelector('.submit-btn-silent');if(!header||!content||!group)return;var buttons=Array.from(group.querySelectorAll('.action-btn-silent'));if(buttons.length===0)return;container.dataset.dshAdapted='true';header.innerHTML='<span>行动建议</span><small>点选后仍可修改</small>';header.addEventListener('click',function(event){event.stopImmediatePropagation();content.style.display=content.style.display==='none'?'flex':'none';requestAnimationFrame(__dshReportSize)},true);content.style.display='flex';if(submit)submit.style.display='none';buttons.forEach(function(button,index){button.hidden=index>=3;button.addEventListener('click',function(event){event.preventDefault();event.stopImmediatePropagation();var input=document.getElementById('send_textarea');if(!input)return;input.value=(button.getAttribute('data-action')||button.textContent||'').trim();input.dispatchEvent(new Event('input',{bubbles:true}));buttons.forEach(function(item){item.classList.remove('selected')});button.classList.add('selected')},true)});if(buttons.length>3){var more=document.createElement('button');more.type='button';more.className='dsh-choice-more';more.textContent='更多 '+String(buttons.length-3)+' 项';more.addEventListener('click',function(){var opening=buttons[3].hidden;buttons.slice(3).forEach(function(button){button.hidden=!opening});more.textContent=opening?'收起':'更多 '+String(buttons.length-3)+' 项';requestAnimationFrame(__dshReportSize)});content.appendChild(more)}})}addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(input)input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')});__dshAdaptChoices();requestAnimationFrame(__dshReportSize);if(window.ResizeObserver)new ResizeObserver(__dshReportSize).observe(document.documentElement)});<\/script>${adapted}${cardFrameCompatibility}<style>.nova-container[data-dsh-adapted="true"]{margin:10px 0!important;padding:0!important}.nova-container[data-dsh-adapted="true"] .mystic-card-silent{border:1px solid rgba(212,175,55,.28)!important;border-radius:12px!important;box-shadow:none!important;max-width:none!important;padding:10px!important}.nova-container[data-dsh-adapted="true"] .nova-header{align-items:center!important;background:transparent!important;border:0!important;box-shadow:none!important;display:flex!important;font-family:inherit!important;justify-content:space-between!important;letter-spacing:0!important;padding:4px 6px 9px!important;text-align:left!important;text-transform:none!important}.nova-container[data-dsh-adapted="true"] .nova-header small{color:var(--roe-text-light,#ddd);font-family:inherit;font-size:11px;font-weight:400;opacity:.5}.nova-container[data-dsh-adapted="true"] .collapsible-content{gap:7px!important;margin-top:0!important}.nova-container[data-dsh-adapted="true"] .button-group-silent{gap:7px!important}.nova-container[data-dsh-adapted="true"] .action-btn-silent{border-left-width:2px!important;border-radius:8px!important;font-family:inherit!important;font-size:13px!important;line-height:1.45!important;padding:9px 12px!important}.nova-container[data-dsh-adapted="true"] .action-btn-silent[hidden]{display:none!important}.nova-container[data-dsh-adapted="true"] .action-btn-silent.selected{border-left-width:3px!important}.nova-container[data-dsh-adapted="true"] .click-order-badge{display:none!important}.dsh-choice-more{background:transparent;border:0;color:var(--roe-gold,#d4af37);cursor:pointer;font:inherit;font-size:12px;opacity:.78;padding:4px 6px;text-align:left}.dsh-choice-more:hover{opacity:1}</style></body></html>`;
		}
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
				presetLibrary: [],
				source: "preset"
			};
		}
		function Avatar({ projection, loadAvatar, size = 40 }) {
			const [src, setSrc] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let current = true;
				let objectUrl;
				const attachmentId = projection.avatarAttachmentId;
				if (attachmentId === void 0) {
					setSrc(void 0);
					return () => {
						current = false;
					};
				}
				loadAvatar(attachmentId).then((url) => {
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
			}, [loadAvatar, projection.avatarAttachmentId]);
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
		function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar, configurePreset, importPreset, managePresetLibrary }) {
			const projection = roleplaySummary(useSessions((state) => state.byId[sessionId]), useProjection("agentRp"));
			const [open, setOpen] = (0, react.useState)(false);
			const [statusOpen, setStatusOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
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
			}, [projection !== void 0]);
			if (projection === void 0) return null;
			const imported = projection.importedMessageCount > 0;
			const status = projection.frontend === void 0 || projection.mvu === void 0 ? void 0 : renderCharacterDisplay(statusPlaceholder, {
				name: projection.characterName,
				frontend: projection.frontend
			}, 2, 0, projection.userName, projection.preset?.regexScripts);
			const statusSource = status === void 0 || status === statusPlaceholder || projection.mvu === void 0 ? void 0 : cardFrameSource(status, projection.mvu.statData);
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
							projection,
							loadAvatar
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
									children: projection.characterName
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
								setPresetOpen(true);
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
							children: "预设"
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
					"aria-label": `${projection.characterName}的角色信息`,
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
										projection,
										loadAvatar,
										size: 54
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
											style: {
												fontSize: "18px",
												margin: 0
											},
											children: projection.characterName
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
									projection.preset.preservedPromptRegexCount === 0 ? "" : `${projection.preset.preservedPromptRegexCount} 条生成规则已保留；等待 Host 提供独立模型消息视图`
								].filter(Boolean).join("\n")
							}),
							projection.description === "" && projection.personality === "" && projection.scenario === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
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
					characterName: projection.characterName,
					source: statusSource,
					onClose: () => {
						setStatusOpen(false);
					}
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
				}))
			] });
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
										preset.omittedExtensions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											style: {
												fontSize: "10px",
												lineHeight: 1.5,
												margin: "9px 1px 0",
												opacity: .38
											},
											children: ["兼容副本不包含未执行扩展：", preset.omittedExtensions.join("、")]
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
				const projection = roleplaySummary(useSessions((state) => state.byId[sessionId]), useProjection("agentRp"));
				const chat = useSession((state) => state.chat);
				const rootRef = (0, react.useRef)(null);
				const placeholder = projection === void 0 ? void 0 : `和${projection.characterName}说点什么…`;
				(0, react.useLayoutEffect)(() => {
					const inputRoot = rootRef.current?.parentElement;
					const card = inputRoot?.querySelector("[data-composer-card]");
					const textarea = card?.querySelector("textarea");
					if (inputRoot == null || textarea == null || placeholder === void 0) return;
					const previousPlaceholder = textarea.getAttribute("placeholder");
					inputRoot.dataset.agentRpInput = "";
					textarea.setAttribute("placeholder", placeholder);
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
				}, [placeholder]);
				(0, react.useEffect)(() => {
					const frontend = projection?.frontend;
					if (frontend === void 0 || projection === void 0 || frontend.regexScripts.length + (projection.preset?.regexScripts.length ?? 0) === 0) return;
					const mounted = /* @__PURE__ */ new Set();
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
						const sourceFrame = [...mounted].find((frame) => frame?.contentWindow === event.source);
						if (sourceFrame == null || typeof event.data !== "object" || event.data === null) return;
						const message = event.data;
						if (message.source !== "dsh-agent-rp-card") return;
						if (message.action === "resize" && typeof message.value === "number" && Number.isFinite(message.value)) {
							sourceFrame.style.height = `${Math.min(760, Math.max(72, Math.ceil(message.value)))}px`;
							return;
						}
						if (typeof message.value !== "string" || message.value.length > 65536) return;
						if (message.action === "draft") {
							inputActions.setDraft(message.value);
							return;
						}
						if (message.action !== "trigger-slash") return;
						const match = message.value.match(/^\/send\s+([\s\S]*?)(?:\|\/trigger)?$/u);
						if (match?.[1] === void 0) return;
						(ctx.sessions.scope(sessionId)?.get("conversation"))?.send(match[1]);
					};
					window.addEventListener("message", bridge);
					const scan = () => {
						const scroll = rootRef.current?.closest("[data-conversation-scroll]");
						if (scroll === null || scroll === void 0) return;
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"context\"], [data-chat-flow-kind=\"tool-call\"]")) hideTranscriptDetail(item);
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-error\"]")) if (item.textContent?.includes("agent-rp/character-card-seed has invalid provenance")) hideTranscriptDetail(item);
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"user\"]")) {
							if (item.dataset.agentRpSetupCollapsed === "true" || !item.textContent?.includes("🎬 档案提交完毕指令：")) continue;
							const content = item.firstElementChild;
							if (content === null) continue;
							const details = document.createElement("details");
							details.style.cssText = "font-size:12px;opacity:.72;";
							const summary = document.createElement("summary");
							summary.textContent = "角色设定已提交";
							summary.style.cssText = "cursor:pointer;list-style:none;";
							const original = content.cloneNode(true);
							original.style.cssText = "margin-top:8px;max-height:240px;overflow:auto;white-space:pre-wrap;";
							details.append(summary, original);
							content.style.display = "none";
							item.insertBefore(details, content.nextSibling);
							item.dataset.agentRpSetupCollapsed = "true";
						}
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"assistant-step\"]")) {
							const key = item.dataset.chatFlowKey;
							if (key === void 0 || item.dataset.agentRpFrontend === "true") continue;
							const node = chat.nodes.get(key);
							if (node?.kind !== "assistant-step") continue;
							const data = node.data;
							for (const button of item.querySelectorAll("button")) if (button.textContent?.trimStart().startsWith("Think")) hideTranscriptDetail(button);
							const raw = data.blocks?.flatMap((block) => block.kind === "text" && block.text !== void 0 ? [block.text] : []).join("\n") ?? "";
							if (raw === "") continue;
							const depth = Math.max(0, chat.order.length - chat.order.indexOf(key) - 1);
							const rendered = renderCharacterDisplay(raw.replaceAll(statusPlaceholder, ""), {
								name: projection.characterName,
								frontend
							}, 2, depth, projection.userName, projection.preset?.regexScripts);
							if (rendered === raw || !/<(?:!doctype|html|head|body|style|script|div|section|details)\b/iu.test(rendered)) continue;
							const original = item.firstElementChild;
							if (original === null) continue;
							const frame = document.createElement("iframe");
							frame.title = `${projection.characterName}的轻前端界面`;
							frame.setAttribute("sandbox", "allow-scripts");
							frame.style.cssText = "border:0;border-radius:12px;display:block;height:180px;max-width:100%;width:100%;background:transparent;color-scheme:dark;";
							frame.srcdoc = cardFrameSource(rendered, projection.mvu?.statData);
							original.style.display = "none";
							item.insertBefore(frame, original.nextSibling);
							item.dataset.agentRpFrontend = "true";
							mounted.add(frame);
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
						for (const frame of mounted) {
							const item = frame.closest("[data-agent-rp-frontend]");
							const original = item?.firstElementChild;
							if (original !== null) original.style.removeProperty("display");
							if (item !== null) delete item.dataset.agentRpFrontend;
							frame.remove();
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
				}, [chat, projection]);
				if (projection === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: rootRef,
					"data-agent-rp-status": true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusLine, {
						projection,
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
				const selected = selectSillyTavernDraft(conversation?.draftAttachments?.(ids) ?? []);
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
								children: [migration ? "迁移角色与对话" : chat ? "导入历史对话" : selected.kind === "json-resource" ? "识别到 JSON 资源" : "识别到 PNG 图片", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "agent-rp-character-header",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayHeader, {
				...props,
				loadAvatar,
				configurePreset,
				importPreset,
				managePresetLibrary
			})));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-configure"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-library"
			}, () => null));
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