window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/import-hint.ts
		/**
		* Select the filename of one unambiguous SillyTavern chat import draft.
		* @param attachments - ordered browser-only draft attachments.
		* @returns the JSONL filename when it is the draft's only attachment.
		*/
		function selectSillyTavernChatImportName(attachments) {
			if (attachments.length !== 1) return void 0;
			const attachment = attachments[0];
			if (attachment?.kind !== "file") return void 0;
			const name = attachment.file.name.trim();
			return /\.jsonl$/iu.test(name) ? name : void 0;
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
		/** Explain the otherwise implicit send-to-import step for one JSONL draft. */
		function importHintComponent(ctx) {
			return function SillyTavernImportHint({ input, sessionId }) {
				if (ctx.sessions.list.getSnapshot().byId[sessionId]?.agentPreset !== "agent-rp") return null;
				const conversation = ctx.sessions.scope(sessionId)?.get("conversation");
				const ids = input.attachmentIds ?? input.imageIds ?? [];
				const filename = selectSillyTavernChatImportName(conversation?.draftAttachments?.(ids) ?? []);
				if (filename === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: hintStyle,
					role: "status",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: markStyle,
						"aria-hidden": "true",
						children: "↗"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: textStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: titleStyle,
							children: ["导入 SillyTavern 对话", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fileStyle,
								children: filename
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: detailStyle,
							children: "将创建新的角色会话，点击发送开始导入"
						})]
					})]
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