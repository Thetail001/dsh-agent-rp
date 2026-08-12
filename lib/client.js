window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		function initials(name) {
			return [...name.trim()].slice(0, 1).join("").toUpperCase() || "RP";
		}
		function truncate(text, max) {
			const normalized = text.replace(/\s+/gu, " ").trim();
			return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}…`;
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
			if (summary?.agentPreset !== "agent-rp") return void 0;
			return projection ?? {
				characterName: summary.displayTitle,
				description: "",
				personality: "",
				scenario: "",
				importedMessageCount: 0,
				worldInfoCount: 0,
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
		function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar }) {
			const projection = roleplaySummary(useSessions((state) => state.byId[sessionId]), useProjection("agentRp"));
			const [open, setOpen] = (0, react.useState)(false);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							children: projection.description.trim() === "" ? "继续这段对话" : truncate(projection.description, 54)
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
					})
				]
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			})] });
		}
		const chipStyle = {
			background: `color-mix(in srgb, ${color} 10%, transparent)`,
			borderRadius: "999px",
			color: "inherit",
			fontSize: "11px",
			opacity: .76,
			padding: "5px 9px"
		};
		function RoleplayComposerDock({ sessionId, useProjection, useSessions, useSession }) {
			const projection = roleplaySummary(useSessions((state) => state.byId[sessionId]), useProjection("agentRp"));
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
					for (const element of Array.from(tools?.children ?? []).slice(1)) hide(element);
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
			if (projection === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: rootRef,
				"data-agent-rp-status": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusLine, {
					projection,
					running: useSession((state) => state.running)
				})
			});
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								onClick: () => {
									inputActions.setDraft("请导入这张角色卡");
								},
								children: "角色卡"
							}), selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								onClick: () => {
									inputActions.setDraft("请导入这本世界书");
								},
								children: "世界书"
							})]
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
		const inject = ["slots", "sessions"];
		/** Register the Agent RP header, composer presentation, and import affordance. */
		function apply(ctx) {
			const loadAvatar = avatarLoader(ctx);
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "agent-rp-character-header",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayHeader, {
				...props,
				loadAvatar
			})));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "agent-rp-status",
				order: -100
			}, RoleplayComposerDock));
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