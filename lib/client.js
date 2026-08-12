window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		const hintStyle = {
			alignItems: "center",
			background: "color-mix(in srgb, var(--color-primary, #7c6ee6) 8%, transparent)",
			border: "1px solid color-mix(in srgb, var(--color-primary, #7c6ee6) 24%, transparent)",
			borderRadius: "10px",
			display: "flex",
			gap: "10px",
			padding: "9px 12px"
		};
		const markStyle = {
			alignItems: "center",
			background: "color-mix(in srgb, var(--color-primary, #7c6ee6) 16%, transparent)",
			borderRadius: "8px",
			display: "flex",
			flex: "0 0 30px",
			fontSize: "16px",
			height: "30px",
			justifyContent: "center"
		};
		const textStyle = { minWidth: 0 };
		const titleStyle = {
			fontSize: "13px",
			fontWeight: 600,
			lineHeight: 1.45
		};
		const fileStyle = {
			fontWeight: 400,
			marginLeft: "6px",
			opacity: .72,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const detailStyle = {
			fontSize: "12px",
			lineHeight: 1.45,
			marginTop: "2px",
			opacity: .62
		};
		const actionsStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: "6px",
			marginLeft: "auto"
		};
		const actionStyle = {
			background: "color-mix(in srgb, var(--color-primary, #7c6ee6) 12%, transparent)",
			border: "1px solid color-mix(in srgb, var(--color-primary, #7c6ee6) 28%, transparent)",
			borderRadius: "7px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "12px",
			padding: "5px 9px"
		};
		/** Explain the otherwise implicit send-to-import step for one JSONL draft. */
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
							style: textStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: titleStyle,
								children: [migration ? "迁移 SillyTavern 角色" : chat ? "导入 SillyTavern 对话" : selected.kind === "json-resource" ? "SillyTavern JSON 资源" : "PNG 附件", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: fileStyle,
									children: selected.name
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: detailStyle,
								children: migration ? "角色卡与聊天记录将进入同一个新会话，点击发送开始迁移" : chat ? "将创建新的角色会话，点击发送开始导入" : blank ? "选择导入类型，再点击发送" : "将按输入框中的说明处理"
							})]
						}),
						!chat && !migration && blank && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: actionsStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								onClick: () => {
									inputActions.setDraft("请导入这张角色卡");
								},
								children: "作为角色卡"
							}), selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								onClick: () => {
									inputActions.setDraft("请导入这本世界书");
								},
								children: "作为世界书"
							})]
						})
					]
				});
			};
		}
		/** Client services required by the import hint. */
		const inject = ["slots", "sessions"];
		/** Register the Agent RP-only JSONL import hint above the composer. */
		function apply(ctx) {
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