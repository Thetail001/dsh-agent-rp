window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-roleplay-portable-spike",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:src/client/RoleplayView.module.css.mjs
		const css = ".RAGwjq_view{box-sizing:border-box;width:min(1360px,100%);height:100%;min-height:0;max-height:calc(100dvh - 48px);color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;margin:0 auto;padding:12px 18px 16px;display:flex;overflow:hidden}[data-conversation-scroll]:has([data-conversation-composer=hidden])>:last-child{display:none}.RAGwjq_header,.RAGwjq_activity,.RAGwjq_playerDesk,.RAGwjq_review{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px}.RAGwjq_header{min-height:48px;box-shadow:var(--dsw-shadow-lv2);flex:none;justify-content:space-between;align-items:center;gap:16px;padding:8px 14px;display:flex}.RAGwjq_gameIdentity{align-items:baseline;gap:8px;min-width:0;display:flex}.RAGwjq_headerActions{flex:none;align-items:center;gap:8px;display:flex}.RAGwjq_gameIdentity>span{color:var(--dsw-alias-label-caption)}.RAGwjq_header h1,.RAGwjq_panelHeader h2,.RAGwjq_review h2,.RAGwjq_preparation h2{color:var(--dsw-alias-label-primary);margin:0}.RAGwjq_header h1{flex:none;font-size:20px;font-weight:650;line-height:28px}.RAGwjq_phase{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:14px;line-height:21px;overflow:hidden}.RAGwjq_status{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary);border-radius:999px;flex:none;padding:4px 9px;font-size:12px;font-weight:650;line-height:18px}.RAGwjq_status[data-running=true]{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label)}.RAGwjq_tabletop{flex:1;grid-template-columns:minmax(0,1fr) minmax(320px,376px);gap:10px;min-height:0;display:grid}.RAGwjq_activity{grid-template-rows:auto minmax(0,1fr) auto;min-width:0;min-height:0;display:grid;overflow:hidden}.RAGwjq_panelHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;justify-content:space-between;align-items:center;gap:10px;min-height:46px;padding:7px 13px;display:flex}.RAGwjq_panelHeader h2{font-size:17px;font-weight:650;line-height:24px}.RAGwjq_panelHeader p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.RAGwjq_recordViewport{overscroll-behavior:contain;scrollbar-gutter:stable;min-height:0;padding:0 13px 12px;overflow-y:auto}.RAGwjq_recordStack{flex-direction:column;justify-content:flex-end;gap:10px;min-height:100%;padding-top:10px;display:flex}.RAGwjq_controls{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex:none;align-items:center;gap:10px;padding:10px 13px;display:flex}.RAGwjq_privateNotice{border-top:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 28%, transparent);background:var(--dsw-alias-state-business-tertiary);flex:none;align-items:flex-start;gap:10px;padding:10px 13px;display:flex}.RAGwjq_privateNotice>span{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-bg-layer-1);border-radius:999px;flex:none;padding:2px 7px;font-size:10px;font-weight:650;line-height:16px}.RAGwjq_privateNotice>div{min-width:0}.RAGwjq_privateNotice strong{color:var(--dsw-alias-label-primary);font-size:13px;line-height:19px;display:block}.RAGwjq_privateNotice p{color:var(--dsw-alias-label-primary-dimmed);margin:1px 0 0;font-size:14px;line-height:21px}.RAGwjq_controlIntro{flex:240px;min-width:180px}.RAGwjq_guidance{color:var(--dsw-alias-label-primary-dimmed);margin:0;font-size:14px;font-weight:550;line-height:21px}.RAGwjq_guidanceDetail{color:var(--dsw-alias-label-tertiary);margin:2px 0 0;font-size:12px;line-height:18px}.RAGwjq_progress{background:var(--dsw-alias-bg-base);border-radius:999px;height:4px;margin-top:7px;overflow:hidden}.RAGwjq_progress span{border-radius:inherit;background:var(--dsw-alias-state-business-primary);height:100%;transition:width .16s ease-out;display:block}.RAGwjq_actions{flex-wrap:wrap;flex:480px;justify-content:flex-end;gap:7px;min-width:0;display:flex}.RAGwjq_primary,.RAGwjq_secondary{min-height:34px;font:inherit;cursor:pointer;border-radius:9px;padding:7px 12px;font-size:13px;line-height:19px}.RAGwjq_primary{border:1px solid var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.RAGwjq_primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.RAGwjq_secondary{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-tool-bar-fill);color:var(--dsw-alias-label-secondary)}.RAGwjq_secondary:hover:not(:disabled){background:var(--dsw-alias-button-tool-bar-hover)}.RAGwjq_actions .RAGwjq_secondary{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, var(--dsw-alias-button-tool-bar-fill));color:var(--dsw-alias-label-primary)}.RAGwjq_actions .RAGwjq_secondary:hover:not(:disabled){border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 58%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, var(--dsw-alias-button-tool-bar-hover))}.RAGwjq_primary:disabled,.RAGwjq_secondary:disabled{opacity:.45;cursor:default}.RAGwjq_freeform{flex:460px;min-width:320px;display:flex;position:relative}.RAGwjq_freeform>label{clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;width:1px;height:1px;padding:0;position:absolute;overflow:hidden}.RAGwjq_freeform>div{flex:1;align-items:stretch;gap:8px;display:flex}.RAGwjq_freeform textarea{box-sizing:border-box;resize:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-width:0;min-height:42px;max-height:84px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:9px;outline:none;flex:1;padding:9px 58px 9px 11px;font-size:14px;line-height:21px}.RAGwjq_freeform textarea:focus{border-color:var(--dsw-alias-state-business-primary)}.RAGwjq_freeform textarea::placeholder{color:var(--dsw-alias-label-caption)}.RAGwjq_inputLimit{color:var(--dsw-alias-label-caption);pointer-events:none;margin:0;font-size:11px;line-height:16px;position:absolute;bottom:4px;right:88px}.RAGwjq_recordGroups{flex-direction:column;gap:8px;display:flex}.RAGwjq_recordGroup{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:10px;overflow:hidden}.RAGwjq_recordGroup>summary{cursor:pointer;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;list-style:none;display:flex}.RAGwjq_recordGroup>summary::-webkit-details-marker{display:none}.RAGwjq_recordGroup>summary:after{content:\"›\";color:var(--dsw-alias-label-tertiary);transform:rotate(90deg)}.RAGwjq_recordGroup:not([open])>summary:after{transform:rotate(0)}.RAGwjq_recordGroup>summary span{flex:1;font-size:13px;font-weight:650;line-height:20px}.RAGwjq_recordGroup>summary small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}.RAGwjq_recordGroupBody{border-top:1px solid var(--dsw-alias-border-l1);padding:0 10px 10px}.RAGwjq_outcomeList{flex-direction:column;gap:7px;padding-top:10px;display:flex}.RAGwjq_recordList{flex-direction:column;gap:7px;padding-top:9px;display:flex}.RAGwjq_ballotDetails{border-top:1px solid var(--dsw-alias-border-l1);margin-top:9px;padding-top:8px}.RAGwjq_ballotDetails>summary{color:var(--dsw-alias-state-business-primary);cursor:pointer;align-items:center;gap:6px;font-size:11px;font-weight:600;line-height:17px;list-style:none;display:flex}.RAGwjq_ballotDetails>summary::-webkit-details-marker{display:none}.RAGwjq_ballotDetails>summary:before{content:\"›\";color:var(--dsw-alias-label-tertiary)}.RAGwjq_ballotDetails[open]>summary:before{transform:rotate(90deg)}.RAGwjq_ballotDetails>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}.RAGwjq_ballotOpenLabel,.RAGwjq_ballotDetails[open] .RAGwjq_ballotClosedLabel{display:none}.RAGwjq_ballotDetails[open] .RAGwjq_ballotOpenLabel{display:inline}.RAGwjq_ballotSection{padding-top:1px}.RAGwjq_ballotList{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding-top:8px;display:grid}.RAGwjq_statementCard{background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:10px 11px}.RAGwjq_statementCard button,.RAGwjq_ballotRow button{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12px;font-weight:650;line-height:18px}.RAGwjq_statementCard>strong{font-size:12px;line-height:18px}.RAGwjq_passActors{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.RAGwjq_statementCard p{color:var(--dsw-alias-label-primary-dimmed);white-space:pre-wrap;margin:4px 0 0;font-size:14px;line-height:22px}.RAGwjq_ballotRow{background:var(--dsw-alias-bg-layer-1);min-width:0;color:var(--dsw-alias-label-secondary);border-radius:8px;grid-template-columns:minmax(0,1fr) 12px minmax(0,1fr);align-items:center;gap:4px;padding:6px 8px;font-size:12px;line-height:18px;display:grid}.RAGwjq_ballotRow>span:nth-child(2){color:var(--dsw-alias-label-tertiary);text-align:center}.RAGwjq_ballotRow strong{font-weight:600}.RAGwjq_outcomeRow{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-label-primary);border-radius:9px;grid-template-columns:28px minmax(0,1fr);align-items:center;gap:9px;padding:10px 11px;display:grid}.RAGwjq_outcomeIcon{background:var(--dsw-alias-state-business-primary);width:28px;height:28px;color:var(--dsw-alias-bg-layer-1);border-radius:50%;place-items:center;font-size:15px;font-weight:700;display:grid}.RAGwjq_outcomeRow small{color:var(--dsw-alias-label-tertiary);margin-bottom:1px;font-size:10px;line-height:15px;display:block}.RAGwjq_outcomeRow p{margin:0;font-size:14px;font-weight:650;line-height:21px}.RAGwjq_voteSummary{align-items:flex-start;gap:8px;padding-top:9px;display:flex}.RAGwjq_voteSummaryLabel{color:var(--dsw-alias-label-tertiary);flex:none;padding-top:4px;font-size:11px;line-height:17px}.RAGwjq_voteTally{flex-wrap:wrap;gap:6px;display:flex}.RAGwjq_voteTally span{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);border-radius:999px;align-items:center;gap:5px;padding:3px 7px;font-size:11px;line-height:17px;display:inline-flex}.RAGwjq_voteTally strong{background:var(--dsw-alias-state-business-tertiary);min-width:17px;height:17px;color:var(--dsw-alias-state-business-primary);border-radius:999px;place-items:center;display:grid}.RAGwjq_phaseNarration{border-left:3px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);border-radius:0 9px 9px 0;margin-top:9px;padding:9px 11px}.RAGwjq_phaseNarration small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.RAGwjq_phaseNarration p{color:var(--dsw-alias-label-primary-dimmed);white-space:pre-wrap;margin:3px 0 0;font-size:14px;line-height:21px}.RAGwjq_playerDesk{isolation:isolate;flex-direction:column;min-width:0;min-height:0;display:flex;position:relative;overflow:hidden}.RAGwjq_factsPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;flex:none;margin:10px 11px 0;padding:8px 9px}.RAGwjq_factsPanel>summary{color:var(--dsw-alias-label-secondary);cursor:pointer;justify-content:space-between;font-size:13px;font-weight:650;line-height:19px;display:flex}.RAGwjq_factsPanel>summary span{background:var(--dsw-alias-bg-layer-1);min-width:18px;height:18px;color:var(--dsw-alias-label-tertiary);border-radius:999px;place-items:center;font-size:11px;display:grid}.RAGwjq_actors,.RAGwjq_facts{margin:0;padding:0;list-style:none}.RAGwjq_actors{overscroll-behavior:contain;scrollbar-gutter:stable;flex:1;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(64px,auto);align-content:start;gap:6px;min-height:0;margin:10px 11px 11px;display:grid;overflow-y:auto}.RAGwjq_actors li{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;min-width:0;min-height:64px;position:relative}.RAGwjq_actors li[data-selected=true]{border-color:var(--dsw-alias-state-business-primary)}.RAGwjq_actors li[data-actionable=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 48%, var(--dsw-alias-border-l1));box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)}.RAGwjq_actors li[data-action-selected=true]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent);animation:.18s ease-out RAGwjq_target-selected}.RAGwjq_targetControls{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex:none;align-items:center;gap:10px;min-height:58px;padding:10px 11px;display:flex}.RAGwjq_targetActionCopy{flex:1;min-width:0}.RAGwjq_targetActionCopy p{color:var(--dsw-alias-label-primary-dimmed);margin:0;font-size:14px;font-weight:600;line-height:21px}.RAGwjq_targetActionCopy small{color:var(--dsw-alias-label-tertiary);margin-top:2px;font-size:12px;line-height:18px;display:block}.RAGwjq_targetActionButtons{flex-wrap:wrap;flex:none;justify-content:flex-end;gap:7px;display:flex}.RAGwjq_actors li[data-state=inactive]{opacity:.56}.RAGwjq_actors li[data-mark=trust]{box-shadow:inset 3px 0 var(--dsw-alias-state-success-primary)}.RAGwjq_actors li[data-mark=watch]{box-shadow:inset 3px 0 var(--dsw-alias-state-warn-label)}.RAGwjq_actors li[data-mark=suspect]{box-shadow:inset 3px 0 var(--dsw-alias-state-error-primary)}.RAGwjq_actorButton{box-sizing:border-box;border-radius:inherit;width:100%;height:100%;min-height:62px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;gap:3px;padding:9px 10px;display:flex}.RAGwjq_actorButton:hover{background:var(--dsw-alias-button-tool-bar-hover)}.RAGwjq_actorButton:disabled{cursor:default}.RAGwjq_actors li[data-actionable=true] .RAGwjq_actorButton{padding-right:38px}.RAGwjq_actorInspect{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:26px;height:24px;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;border-radius:7px;place-items:center;padding:0;font-size:10px;line-height:1;display:grid;position:absolute;top:7px;right:7px}.RAGwjq_actorInspect:hover{color:var(--dsw-alias-label-primary)}@keyframes RAGwjq_target-selected{0%{transform:scale(.98)}to{transform:scale(1)}}@media (prefers-reduced-motion:reduce){.RAGwjq_actors li[data-action-selected=true]{animation:none}}.RAGwjq_actorTopline{align-items:center;gap:6px;width:100%;display:flex}.RAGwjq_actorTopline strong{text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:14px;line-height:20px;overflow:hidden}.RAGwjq_actorState{background:var(--dsw-alias-state-success-primary);width:6px;height:6px;box-shadow:0 0 0 3px var(--dsw-alias-state-success-tertiary);border-radius:999px;flex:none}.RAGwjq_actors li[data-state=inactive] .RAGwjq_actorState{background:var(--dsw-alias-label-caption);box-shadow:none}.RAGwjq_markSymbol{background:var(--dsw-alias-bg-layer-1);border-radius:999px;flex:none;place-items:center;width:17px;height:17px;font-size:11px;font-weight:700;display:grid}.RAGwjq_actorBadges{align-items:center;gap:4px;min-width:0;padding-left:12px;display:flex}.RAGwjq_actorBadges em{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);border-radius:999px;padding:1px 5px;font-size:10px;font-style:normal;line-height:15px}.RAGwjq_actorBadges small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}.RAGwjq_facts{flex-direction:column;gap:3px;margin-top:6px;display:flex}.RAGwjq_facts li{color:var(--dsw-alias-label-secondary);padding-left:11px;font-size:12px;line-height:18px;position:relative}.RAGwjq_facts li:before{content:\"•\";color:var(--dsw-alias-state-business-primary);position:absolute;left:0}.RAGwjq_playerInspector{z-index:2;overscroll-behavior:contain;border-top:1px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv3);padding:13px;position:absolute;inset:47px 0 0;overflow-y:auto}.RAGwjq_playerInspector>header{justify-content:space-between;align-items:flex-start;gap:10px;display:flex}.RAGwjq_playerInspector>header p,.RAGwjq_review>header>p:first-child{color:var(--dsw-alias-state-business-primary);margin:0 0 3px;font-size:11px;font-weight:650;line-height:17px}.RAGwjq_playerInspector h3{margin:0;font-size:16px;line-height:22px}.RAGwjq_playerInspector>header>button{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;place-items:center;padding:0;font-size:17px;display:grid}.RAGwjq_markPicker{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:11px;display:grid}.RAGwjq_markPicker button{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);min-height:32px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:8px;justify-content:center;align-items:center;gap:5px;padding:5px 7px;font-size:12px;display:flex}.RAGwjq_markPicker button[aria-pressed=true]{border-color:var(--dsw-alias-state-business-primary)}.RAGwjq_markPicker button[data-mark=trust][aria-pressed=true]{color:var(--dsw-alias-state-success-primary)}.RAGwjq_markPicker button[data-mark=watch][aria-pressed=true]{color:var(--dsw-alias-state-warn-label)}.RAGwjq_markPicker button[data-mark=suspect][aria-pressed=true]{color:var(--dsw-alias-state-error-primary)}.RAGwjq_localOnly{color:var(--dsw-alias-label-tertiary);margin:7px 0 0;font-size:11px;line-height:17px}.RAGwjq_playerRecords{flex-direction:column;gap:9px;margin-top:11px;display:flex}.RAGwjq_playerRecords>div>span{color:var(--dsw-alias-label-tertiary);margin-bottom:4px;font-size:11px;line-height:17px;display:block}.RAGwjq_empty,.RAGwjq_error{margin:0;font-size:13px;line-height:20px}.RAGwjq_empty{color:var(--dsw-alias-label-tertiary)}.RAGwjq_error{color:var(--dsw-alias-state-error-primary);flex-basis:100%}.RAGwjq_review{padding:14px}.RAGwjq_review h2{font-size:16px;line-height:23px}.RAGwjq_review>header>p:last-child{color:var(--dsw-alias-label-secondary);margin:5px 0 0;font-size:13px;line-height:20px}.RAGwjq_review>ol{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0;padding:0;list-style:none;display:grid}.RAGwjq_review li{min-width:0}.RAGwjq_review details{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;height:100%}.RAGwjq_review summary{cursor:pointer;padding:9px 11px}.RAGwjq_review summary span,.RAGwjq_review summary strong{display:block}.RAGwjq_review summary span{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}.RAGwjq_review summary strong{margin-top:3px;font-size:13px;font-weight:600;line-height:20px}.RAGwjq_review dl{flex-direction:column;gap:8px;margin:0;padding:0 11px 11px;display:flex}.RAGwjq_review dl div{grid-template-columns:60px minmax(0,1fr);gap:8px;display:grid}.RAGwjq_review dt,.RAGwjq_review dd{margin:0;font-size:12px;line-height:19px}.RAGwjq_review dt{color:var(--dsw-alias-label-tertiary)}.RAGwjq_review dd{color:var(--dsw-alias-label-secondary);white-space:pre-wrap}.RAGwjq_preparationShell{box-sizing:border-box;place-items:center;width:100%;height:100%;min-height:0;padding:24px;display:grid}.RAGwjq_preparation{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:min(520px,100%);box-shadow:var(--dsw-shadow-lv2);text-align:center;border-radius:16px;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:34px 36px;display:flex}.RAGwjq_preparationMark{background:var(--dsw-alias-state-business-tertiary);width:54px;height:54px;color:var(--dsw-alias-state-business-primary);border-radius:16px;place-items:center;font-size:15px;font-weight:700;line-height:20px;display:grid}.RAGwjq_preparation h2{font-size:20px;line-height:28px}.RAGwjq_preparation p{max-width:520px;color:var(--dsw-alias-label-secondary);margin:0;font-size:14px;line-height:22px}.RAGwjq_preparationActions{flex-direction:column;align-items:center;gap:8px;margin-top:10px;display:flex}.RAGwjq_preparationActions .RAGwjq_primary{min-width:160px;min-height:42px;font-size:14px}.RAGwjq_preparationActions small{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}@media (width<=1000px){.RAGwjq_view{height:auto;max-height:none;padding:12px 14px 28px;overflow:visible}.RAGwjq_tabletop{grid-template-columns:1fr}.RAGwjq_activity{height:min(720px,100dvh - 86px);min-height:560px}.RAGwjq_playerDesk{max-height:620px}.RAGwjq_actors{min-height:360px}}@media (width<=680px){.RAGwjq_header{align-items:flex-start}.RAGwjq_gameIdentity{flex-wrap:wrap;gap:2px 7px}.RAGwjq_gameIdentity>span{display:none}.RAGwjq_phase{flex-basis:100%}.RAGwjq_controls{flex-direction:column;align-items:stretch}.RAGwjq_actions{order:2}.RAGwjq_freeform{order:3;width:100%;min-width:0}.RAGwjq_inputLimit{right:88px}.RAGwjq_review>ol{grid-template-columns:1fr}.RAGwjq_ballotList{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (width<=440px){.RAGwjq_view{padding-left:8px;padding-right:8px}.RAGwjq_actors{grid-template-columns:1fr}.RAGwjq_targetControls{flex-direction:column;align-items:stretch}.RAGwjq_targetActionButtons{justify-content:stretch}.RAGwjq_targetActionButtons button{flex:1}.RAGwjq_freeform>div{flex-direction:column}.RAGwjq_freeform textarea{padding-right:11px}.RAGwjq_inputLimit{text-align:right;margin-top:3px;position:static}.RAGwjq_ballotList{grid-template-columns:1fr}.RAGwjq_preparationShell{padding:12px}.RAGwjq_preparation{padding:28px 20px}}";
		const tagId = "@dsh-external/dsh-roleplay-portable-spike/RoleplayView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-external/dsh-roleplay-portable-spike";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var RoleplayView_module_css_default = {
			"actions": "RAGwjq_actions",
			"activity": "RAGwjq_activity",
			"actorBadges": "RAGwjq_actorBadges",
			"actorButton": "RAGwjq_actorButton",
			"actorInspect": "RAGwjq_actorInspect",
			"actors": "RAGwjq_actors",
			"actorState": "RAGwjq_actorState",
			"actorTopline": "RAGwjq_actorTopline",
			"ballotClosedLabel": "RAGwjq_ballotClosedLabel",
			"ballotDetails": "RAGwjq_ballotDetails",
			"ballotList": "RAGwjq_ballotList",
			"ballotOpenLabel": "RAGwjq_ballotOpenLabel",
			"ballotRow": "RAGwjq_ballotRow",
			"ballotSection": "RAGwjq_ballotSection",
			"controlIntro": "RAGwjq_controlIntro",
			"controls": "RAGwjq_controls",
			"empty": "RAGwjq_empty",
			"error": "RAGwjq_error",
			"facts": "RAGwjq_facts",
			"factsPanel": "RAGwjq_factsPanel",
			"freeform": "RAGwjq_freeform",
			"gameIdentity": "RAGwjq_gameIdentity",
			"guidance": "RAGwjq_guidance",
			"guidanceDetail": "RAGwjq_guidanceDetail",
			"header": "RAGwjq_header",
			"headerActions": "RAGwjq_headerActions",
			"inputLimit": "RAGwjq_inputLimit",
			"localOnly": "RAGwjq_localOnly",
			"markPicker": "RAGwjq_markPicker",
			"markSymbol": "RAGwjq_markSymbol",
			"outcomeIcon": "RAGwjq_outcomeIcon",
			"outcomeList": "RAGwjq_outcomeList",
			"outcomeRow": "RAGwjq_outcomeRow",
			"panelHeader": "RAGwjq_panelHeader",
			"passActors": "RAGwjq_passActors",
			"phase": "RAGwjq_phase",
			"phaseNarration": "RAGwjq_phaseNarration",
			"playerDesk": "RAGwjq_playerDesk",
			"playerInspector": "RAGwjq_playerInspector",
			"playerRecords": "RAGwjq_playerRecords",
			"preparation": "RAGwjq_preparation",
			"preparationActions": "RAGwjq_preparationActions",
			"preparationMark": "RAGwjq_preparationMark",
			"preparationShell": "RAGwjq_preparationShell",
			"primary": "RAGwjq_primary",
			"privateNotice": "RAGwjq_privateNotice",
			"progress": "RAGwjq_progress",
			"recordGroup": "RAGwjq_recordGroup",
			"recordGroupBody": "RAGwjq_recordGroupBody",
			"recordGroups": "RAGwjq_recordGroups",
			"recordList": "RAGwjq_recordList",
			"recordStack": "RAGwjq_recordStack",
			"recordViewport": "RAGwjq_recordViewport",
			"review": "RAGwjq_review",
			"secondary": "RAGwjq_secondary",
			"statementCard": "RAGwjq_statementCard",
			"status": "RAGwjq_status",
			"tabletop": "RAGwjq_tabletop",
			"target-selected": "RAGwjq_target-selected",
			"targetActionButtons": "RAGwjq_targetActionButtons",
			"targetActionCopy": "RAGwjq_targetActionCopy",
			"targetControls": "RAGwjq_targetControls",
			"view": "RAGwjq_view",
			"voteSummary": "RAGwjq_voteSummary",
			"voteSummaryLabel": "RAGwjq_voteSummaryLabel",
			"voteTally": "RAGwjq_voteTally"
		};
		//#endregion
		//#region src/client/RoleplayView.tsx
		/** Generic presentation of one observer-safe Roleplay session projection. */
		const PLAYER_MARKS = [
			{
				value: "trust",
				label: "偏信",
				symbol: "✓"
			},
			{
				value: "watch",
				label: "观察",
				symbol: "·"
			},
			{
				value: "suspect",
				label: "怀疑",
				symbol: "!"
			}
		];
		const FRESH_SCENE_LAUNCH_TTL_MS = 3e4;
		let freshSceneLaunch;
		function beginFreshSceneLaunch(sourceSessionId) {
			freshSceneLaunch = {
				sourceSessionId,
				startedAt: Date.now()
			};
		}
		function freshSceneLaunchRemainingMs() {
			if (freshSceneLaunch === void 0) return 0;
			return Math.max(0, FRESH_SCENE_LAUNCH_TTL_MS - (Date.now() - freshSceneLaunch.startedAt));
		}
		function finishFreshSceneLaunch() {
			freshSceneLaunch = void 0;
		}
		function markStorageKey(sessionId) {
			return `dsh-roleplay-player-marks:${sessionId}`;
		}
		function isPlayerMark(value) {
			return value === "trust" || value === "watch" || value === "suspect";
		}
		function readPlayerMarks(sessionId) {
			if (typeof window === "undefined") return {};
			let stored;
			try {
				stored = window.localStorage.getItem(markStorageKey(sessionId));
			} catch (storageAccessError) {
				return {};
			}
			if (stored === null) return {};
			let parsed;
			try {
				parsed = JSON.parse(stored);
			} catch (malformedStoredMarks) {
				return {};
			}
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
			return Object.fromEntries(Object.entries(parsed).filter((entry) => isPlayerMark(entry[1])));
		}
		function persistPlayerMarks(sessionId, marks) {
			if (typeof window === "undefined") return;
			try {
				window.localStorage.setItem(markStorageKey(sessionId), JSON.stringify(marks));
			} catch (storageWriteError) {}
		}
		function Preparation({ kind, disabled, error, onSubmit }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("main", {
				className: RoleplayView_module_css_default.preparationShell,
				"data-conversation-composer": "hidden",
				"aria-busy": disabled,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: RoleplayView_module_css_default.preparation,
					"aria-live": "polite",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: RoleplayView_module_css_default.preparationMark,
							children: "RP"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: kind === "preparing" ? "正在准备本局" : kind === "absent" ? "这条会话没有场景" : "场景还不能显示" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: kind === "preparing" ? "正在分配座位和身份，完成后先确认本局身份。" : kind === "absent" ? "这是一条旧会话。新建一局后，场景、身份和规则会自动准备。" : "场景已经接入，但当前版本还不能显示它。请刷新页面后再试。" }),
						kind === "absent" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: RoleplayView_module_css_default.preparationActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: RoleplayView_module_css_default.primary,
								type: "button",
								disabled,
								onClick: onSubmit,
								children: disabled ? "正在新建…" : "新建一局"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "不会调用模型，也不会修改这条旧会话。" })]
						}),
						error !== null && error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: RoleplayView_module_css_default.error,
							role: "alert",
							children: error
						})
					]
				})
			});
		}
		function actorLabel(actorById, actorId) {
			if (actorId === void 0) return "未知玩家";
			return actorById.get(actorId)?.label ?? actorId;
		}
		function RecordRow({ record, actorById, onSelectActor }) {
			const actor = record.actorId === void 0 ? void 0 : actorById.get(String(record.actorId));
			const target = record.targetActorId === void 0 ? void 0 : actorById.get(String(record.targetActorId));
			if (record.kind === "statement") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: RoleplayView_module_css_default.statementCard,
				children: [actor === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "公开发言" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						onSelectActor?.(actor.id);
					},
					children: actor.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: record.text })]
			});
			if (record.kind === "ballot") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: RoleplayView_module_css_default.ballotRow,
				children: [
					actor === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "未知玩家" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onSelectActor?.(actor.id);
						},
						children: actor.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "→"
					}),
					target === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "弃票" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							onSelectActor?.(target.id);
						},
						children: target.label
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: RoleplayView_module_css_default.outcomeRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: RoleplayView_module_css_default.outcomeIcon,
					"aria-hidden": "true",
					children: "✓"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "本轮结果" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: record.text })] })]
			});
		}
		function hasRecordActor(record) {
			return record.actorId !== void 0;
		}
		function statementFeedItems(records) {
			const items = [];
			for (const record of records) {
				if (record.text !== "过" || !hasRecordActor(record)) {
					items.push({
						kind: "statement",
						record
					});
					continue;
				}
				const previous = items.at(-1);
				if (previous?.kind === "pass") previous.records.push(record);
				else items.push({
					kind: "pass",
					records: [record]
				});
			}
			return items;
		}
		function timelineGroups(surface, includeProgress) {
			const narrationByRevision = new Map(surface.narration.map((item) => [item.revision, item]));
			const recordsByRevision = /* @__PURE__ */ new Map();
			const legacyRecords = [];
			for (const record of surface.records) {
				if (record.revision === void 0) {
					legacyRecords.push(record);
					continue;
				}
				const records = recordsByRevision.get(record.revision);
				if (records === void 0) recordsByRevision.set(record.revision, [record]);
				else records.push(record);
			}
			const revisionGroups = [.../* @__PURE__ */ new Set([...narrationByRevision.keys(), ...recordsByRevision.keys()])].sort((left, right) => left - right).map((revision) => {
				const narration = narrationByRevision.get(revision);
				const records = recordsByRevision.get(revision) ?? [];
				return {
					key: `revision-${String(revision)}`,
					phase: narration?.phase ?? records[0]?.phase ?? `阶段 ${String(revision)}`,
					records,
					...narration === void 0 ? {} : { narration: narration.text }
				};
			});
			const groups = [];
			for (const group of revisionGroups) {
				const previous = groups.at(-1);
				if (previous?.phase !== group.phase) {
					groups.push(group);
					continue;
				}
				groups[groups.length - 1] = {
					key: previous.key,
					phase: previous.phase,
					records: [...previous.records, ...group.records],
					...group.narration === void 0 ? {} : { narration: group.narration }
				};
			}
			const legacyByPhase = /* @__PURE__ */ new Map();
			for (const record of legacyRecords) {
				const matching = groups.findLast((group) => group.phase === record.phase);
				if (matching !== void 0) {
					matching.records.push(record);
					continue;
				}
				const existing = legacyByPhase.get(record.phase);
				if (existing !== void 0) {
					existing.records.push(record);
					continue;
				}
				const group = {
					key: `legacy-${record.phase}`,
					phase: record.phase,
					records: [record]
				};
				legacyByPhase.set(record.phase, group);
				groups.push(group);
			}
			for (const record of includeProgress ? surface.progress?.records ?? [] : []) {
				const current = groups.at(-1);
				if (current?.phase !== record.phase) {
					groups.push({
						key: `progress-${record.phase}`,
						phase: record.phase,
						records: [record]
					});
					continue;
				}
				groups[groups.length - 1] = {
					key: current.key,
					phase: current.phase,
					records: [...current.records, record]
				};
			}
			return groups;
		}
		function recordGroupCount(group) {
			const ballots = group.records.filter((record) => record.kind === "ballot").length;
			if (ballots > 0) return `${String(ballots)} 张选票`;
			const statements = group.records.filter((record) => record.kind === "statement").length;
			if (statements > 0) return `${String(statements)} 条发言`;
			const outcomes = group.records.filter((record) => record.kind === "outcome").length;
			if (outcomes > 0) return `${String(outcomes)} 条结果`;
			return group.narration === void 0 ? "暂无公开记录" : "1 条阶段结果";
		}
		function visibleRecords(surface, includeProgress) {
			return [...surface.records, ...includeProgress ? surface.progress?.records ?? [] : []];
		}
		function VoteTally({ records, actorById }) {
			const ballots = records.filter((record) => record.kind === "ballot");
			if (ballots.length === 0) return null;
			const tally = /* @__PURE__ */ new Map();
			for (const ballot of ballots) {
				const key = ballot.targetActorId === void 0 ? "abstain" : String(ballot.targetActorId);
				tally.set(key, (tally.get(key) ?? 0) + 1);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: RoleplayView_module_css_default.voteSummary,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: RoleplayView_module_css_default.voteSummaryLabel,
					children: "票数"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: RoleplayView_module_css_default.voteTally,
					"aria-label": "本轮票数汇总",
					children: [...tally.entries()].sort((left, right) => right[1] - left[1]).map(([targetId, count]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [targetId === "abstain" ? "弃票" : actorLabel(actorById, targetId), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: count })] }, targetId))
				})]
			});
		}
		function PublicRecordFeed({ surface, waiting, onSelectActor }) {
			const actorById = new Map(surface.actors.map((actor) => [String(actor.id), actor]));
			const groups = timelineGroups(surface, waiting);
			if (groups.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: RoleplayView_module_css_default.empty,
				children: waiting ? "正在等待第一条对局记录" : "对局记录会显示在这里"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: RoleplayView_module_css_default.recordGroups,
				children: groups.map((group, index) => {
					const ballots = group.records.filter((record) => record.kind === "ballot");
					const outcomes = group.records.filter((record) => record.kind === "outcome");
					const statements = group.records.filter((record) => record.kind === "statement");
					const statementItems = statementFeedItems(statements);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: RoleplayView_module_css_default.recordGroup,
						open: index === groups.length - 1 ? true : void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: group.phase }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: recordGroupCount(group) })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: RoleplayView_module_css_default.recordGroupBody,
							children: [
								statements.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: RoleplayView_module_css_default.recordList,
									children: statementItems.map((item) => item.kind === "statement" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecordRow, {
										record: item.record,
										actorById,
										onSelectActor
									}, item.record.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
										className: RoleplayView_module_css_default.statementCard,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: RoleplayView_module_css_default.passActors,
											children: item.records.map((record, actorIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [actorIndex === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": "true",
												children: "、"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													onSelectActor(record.actorId);
												},
												children: actorLabel(actorById, String(record.actorId))
											})] }, record.id))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "过" })]
									}, `pass-${String(item.records[0]?.id)}`))
								}),
								ballots.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: RoleplayView_module_css_default.ballotSection,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoteTally, {
										records: group.records,
										actorById
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
										className: RoleplayView_module_css_default.ballotDetails,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: RoleplayView_module_css_default.ballotClosedLabel,
											children: [
												"查看 ",
												ballots.length,
												" 张选票"
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: RoleplayView_module_css_default.ballotOpenLabel,
											children: "收起逐票明细"
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: RoleplayView_module_css_default.ballotList,
											children: ballots.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecordRow, {
												record,
												actorById,
												onSelectActor
											}, record.id))
										})]
									})]
								}),
								outcomes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: RoleplayView_module_css_default.outcomeList,
									children: outcomes.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecordRow, {
										record,
										actorById,
										onSelectActor
									}, record.id))
								}),
								group.narration !== void 0 && outcomes.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
									className: RoleplayView_module_css_default.phaseNarration,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "阶段结果" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: group.narration })]
								})
							]
						})]
					}, group.key);
				})
			});
		}
		function markMeta(mark) {
			return PLAYER_MARKS.find((candidate) => candidate.value === mark);
		}
		function PlayerBoard({ surface, waiting, marks, selectedActorId, selectedActionId, selectedTargetAction, targetActions, companionActions, targetGuidance, targetGuidanceDetail, actionLocked, onSelectActor, onSelectAction, onSubmitAction, onMark }) {
			const selected = selectedActorId === null ? void 0 : surface.actors.find((actor) => actor.id === selectedActorId);
			const actorById = new Map(surface.actors.map((actor) => [String(actor.id), actor]));
			const selectedRecords = selected === void 0 ? [] : visibleRecords(surface, waiting).filter((record) => record.actorId === selected.id);
			const inspectorClose = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (selected === void 0) return;
				inspectorClose.current?.focus();
				const closeOnEscape = (event) => {
					if (event.key === "Escape") onSelectActor(null);
				};
				document.addEventListener("keydown", closeOnEscape);
				return () => {
					document.removeEventListener("keydown", closeOnEscape);
				};
			}, [onSelectActor, selected]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: RoleplayView_module_css_default.playerDesk,
				"aria-label": "席位与个人标记",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
						className: RoleplayView_module_css_default.panelHeader,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "席位" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "身份线索 · 个人标记" })] })
					}),
					selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						id: "roleplay-player-inspector",
						className: RoleplayView_module_css_default.playerInspector,
						role: "dialog",
						"aria-label": `${selected.label}公开档案`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "公开档案" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: selected.label })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								ref: inspectorClose,
								type: "button",
								"aria-label": "关闭玩家公开档案",
								onClick: () => {
									onSelectActor(null);
								},
								children: "×"
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: RoleplayView_module_css_default.markPicker,
								"aria-label": `标记${selected.label}`,
								children: PLAYER_MARKS.map((option) => {
									const active = marks[String(selected.id)] === option.value;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										"data-mark": option.value,
										"aria-pressed": active,
										onClick: () => {
											onMark(selected.id, active ? void 0 : option.value);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.symbol }), option.label]
									}, option.value);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: RoleplayView_module_css_default.localOnly,
								children: "这些标记不会发送给角色或写入对局记录。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: RoleplayView_module_css_default.playerRecords,
								children: selectedRecords.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: RoleplayView_module_css_default.empty,
									children: "这名玩家还没有公开发言或投票。"
								}) : selectedRecords.toReversed().map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: record.phase }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecordRow, {
									record,
									actorById
								})] }, record.id))
							})
						]
					}),
					surface.facts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: RoleplayView_module_css_default.factsPanel,
						open: true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: ["本局信息 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: surface.facts.length })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: RoleplayView_module_css_default.facts,
							children: surface.facts.map((fact) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: fact.text }, fact.id))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: RoleplayView_module_css_default.actors,
						children: surface.actors.map((actor) => {
							const mark = marks[String(actor.id)];
							const selectedNow = actor.id === selectedActorId;
							const targetAction = targetActions.get(String(actor.id));
							const actionSelected = targetAction !== void 0 && String(targetAction.id) === selectedActionId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								"data-state": actor.state,
								"data-mark": mark,
								"data-selected": selectedNow || void 0,
								"data-actionable": targetAction === void 0 ? void 0 : "true",
								"data-action-selected": actionSelected || void 0,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: RoleplayView_module_css_default.actorButton,
									disabled: targetAction !== void 0 && actionLocked,
									"aria-label": targetAction === void 0 ? `${actor.label}，查看公开档案` : `${actor.label}，${targetAction.label}`,
									"aria-haspopup": targetAction === void 0 ? "dialog" : void 0,
									"aria-expanded": targetAction === void 0 ? selectedNow : void 0,
									"aria-controls": targetAction === void 0 ? "roleplay-player-inspector" : void 0,
									"aria-pressed": targetAction === void 0 ? void 0 : actionSelected,
									onClick: () => {
										if (targetAction !== void 0) onSelectAction(targetAction);
										else onSelectActor(selectedNow ? null : actor.id);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: RoleplayView_module_css_default.actorTopline,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: RoleplayView_module_css_default.actorState,
												"aria-hidden": "true"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: actor.label }),
											markMeta(mark) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: RoleplayView_module_css_default.markSymbol,
												"aria-label": markMeta(mark)?.label,
												children: markMeta(mark)?.symbol
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: RoleplayView_module_css_default.actorBadges,
										children: [actor.badges?.map((badge) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: badge }, badge)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: actor.detail ?? (actor.state === "active" ? "当前在场" : "当前不在场") })]
									})]
								}), targetAction !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: RoleplayView_module_css_default.actorInspect,
									"aria-label": `查看${actor.label}公开档案`,
									"aria-haspopup": "dialog",
									"aria-expanded": selectedNow,
									"aria-controls": "roleplay-player-inspector",
									onClick: () => {
										onSelectActor(selectedNow ? null : actor.id);
									},
									children: "···"
								})]
							}, actor.id);
						})
					}),
					targetActions.size > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: RoleplayView_module_css_default.targetControls,
						"aria-label": "目标行动",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: RoleplayView_module_css_default.targetActionCopy,
							"aria-live": "polite",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: selectedTargetAction === void 0 ? targetGuidance : `已选：${selectedTargetAction.label}` }), selectedTargetAction === void 0 && targetGuidanceDetail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: targetGuidanceDetail })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: RoleplayView_module_css_default.targetActionButtons,
							children: [selectedTargetAction !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: RoleplayView_module_css_default.primary,
								disabled: actionLocked,
								onClick: () => {
									onSubmitAction(selectedTargetAction);
								},
								children: ["确认", selectedTargetAction.label]
							}), companionActions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: action.emphasis === "primary" ? RoleplayView_module_css_default.primary : RoleplayView_module_css_default.secondary,
								disabled: actionLocked,
								onClick: () => {
									onSubmitAction(action);
								},
								children: action.label
							}, action.id))]
						})]
					})
				]
			});
		}
		function Review({ surface }) {
			const review = surface.review;
			if (review === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: RoleplayView_module_css_default.review,
				"aria-label": review.title,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "终局复盘" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: review.title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: review.detail })
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", { children: review.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.phase }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
					entry.actor,
					" · ",
					entry.decision
				] })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "选择理由" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.rationale })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "信心" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.confidence })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "引用依据" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: entry.evidence.length === 0 ? "未引用额外依据" : entry.evidence.join("、") })] })
				] })] }) }, entry.id)) })]
			});
		}
		function runningStatus(surface) {
			if (surface.progress !== void 0) return surface.progress.title;
			if (surface.kind !== "standard-werewolf") return "场景处理中";
			if (surface.phase.includes("警长竞选报名")) return "等待其他玩家报名";
			if (surface.phase.includes("警长投票") || surface.phase.includes("警长平票重投")) return "等待其他玩家投票";
			return "场景处理中";
		}
		function waitingGuidance(surface, submittedActionLabel) {
			if (surface.progress !== void 0) return surface.progress.detail;
			if (submittedActionLabel !== null) return `已提交：${submittedActionLabel}`;
			return "请稍候";
		}
		/** Render a generic Roleplay surface without interpreting scenario rules. */
		function RoleplayView({ sessionId, useProjection, useSession, startScene, sendPrompt, runCommand }) {
			const surface = useProjection("roleplay");
			const running = useSession((snapshot) => snapshot.running);
			const agentError = useSession((snapshot) => snapshot.lastAgentError);
			const sessionKey = String(sessionId);
			const [draft, setDraft] = (0, react.useState)("");
			const [pending, setPending] = (0, react.useState)(false);
			const [launching, setLaunching] = (0, react.useState)(() => freshSceneLaunchRemainingMs() > 0);
			const [error, setError] = (0, react.useState)(null);
			const [inputExpanded, setInputExpanded] = (0, react.useState)(false);
			const [selectedActorId, setSelectedActorId] = (0, react.useState)(null);
			const [selectedActionId, setSelectedActionId] = (0, react.useState)(null);
			const [submittedActionLabel, setSubmittedActionLabel] = (0, react.useState)(null);
			const [marks, setMarks] = (0, react.useState)(() => readPlayerMarks(sessionKey));
			const pendingRef = (0, react.useRef)(false);
			const automaticAttemptRef = (0, react.useRef)(null);
			const recordViewport = (0, react.useRef)(null);
			const followLatestRecord = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				followLatestRecord.current = true;
			}, [sessionKey]);
			(0, react.useEffect)(() => {
				setInputExpanded(false);
				setSelectedActionId(null);
				setSubmittedActionLabel(null);
			}, [sessionKey, surface?.revision]);
			(0, react.useEffect)(() => {
				if (!launching) return;
				if (surface !== void 0 && freshSceneLaunch?.sourceSessionId !== sessionKey) {
					finishFreshSceneLaunch();
					setLaunching(false);
					return;
				}
				const remaining = freshSceneLaunchRemainingMs();
				if (remaining === 0) {
					finishFreshSceneLaunch();
					setLaunching(false);
					return;
				}
				const timer = window.setTimeout(() => {
					finishFreshSceneLaunch();
					setLaunching(false);
				}, remaining);
				return () => {
					window.clearTimeout(timer);
				};
			}, [
				launching,
				sessionKey,
				surface
			]);
			(0, react.useEffect)(() => {
				const viewport = recordViewport.current;
				if (viewport === null || surface === void 0 || surface === null) return;
				if (!followLatestRecord.current) return;
				viewport.scrollTop = viewport.scrollHeight;
			}, [
				inputExpanded,
				pending,
				running,
				sessionKey,
				surface?.records.at(-1)?.id,
				surface?.progress?.records?.at(-1)?.id,
				surface?.narration.at(-1)?.revision
			]);
			const submit = (0, react.useCallback)(async (value, trimPlayerInput, kind, actionLabel = null) => {
				if (value.trim() === "" || pendingRef.current || running) return;
				pendingRef.current = true;
				setPending(true);
				setSubmittedActionLabel(actionLabel);
				setError(null);
				try {
					const submitted = trimPlayerInput ? value.trim() : value;
					await (kind === "command" ? runCommand(submitted) : sendPrompt(submitted));
					if (trimPlayerInput) setDraft("");
				} catch (cause) {
					setSubmittedActionLabel(null);
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					pendingRef.current = false;
					setPending(false);
				}
			}, [
				runCommand,
				running,
				sendPrompt
			]);
			(0, react.useEffect)(() => {
				if (surface === void 0 || surface === null || surface.status === "complete" || pending || running) return;
				const action = surface.actions.find((candidate) => candidate.automatic === true);
				if (action === void 0) return;
				const attemptKey = `${sessionKey}:${String(surface.revision)}:${String(action.id)}`;
				if (automaticAttemptRef.current === attemptKey) return;
				const value = action.submission.kind === "prompt" ? action.submission.text : action.submission.line;
				const timer = window.setTimeout(() => {
					if (automaticAttemptRef.current === attemptKey) return;
					automaticAttemptRef.current = attemptKey;
					submit(value, false, action.submission.kind, action.label);
				}, 0);
				return () => {
					window.clearTimeout(timer);
				};
			}, [
				pending,
				running,
				sessionKey,
				submit,
				surface
			]);
			const launchScene = (0, react.useCallback)(async () => {
				if (pendingRef.current || running) return;
				pendingRef.current = true;
				setPending(true);
				setLaunching(true);
				beginFreshSceneLaunch(sessionKey);
				setError(null);
				let started = false;
				try {
					await startScene();
					started = true;
				} catch (cause) {
					finishFreshSceneLaunch();
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					pendingRef.current = false;
					setPending(false);
					if (!started) setLaunching(false);
				}
			}, [
				running,
				sessionKey,
				startScene
			]);
			const updateMark = (0, react.useCallback)((actorId, mark) => {
				setMarks((current) => {
					const actorKey = String(actorId);
					const next = mark === void 0 ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== actorKey)) : {
						...current,
						[actorKey]: mark
					};
					persistPlayerMarks(sessionKey, next);
					return next;
				});
			}, [sessionKey]);
			const waiting = pending || running;
			const visibleError = error ?? agentError;
			if (surface === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preparation, {
				kind: launching ? "preparing" : "absent",
				disabled: launching || running,
				error,
				onSubmit: () => {
					launchScene();
				}
			});
			if (surface === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preparation, {
				kind: "unmatched",
				error: visibleError
			});
			const locked = waiting || surface.status === "complete";
			const surfaceInput = surface.input;
			const inputNeedsChoice = surfaceInput !== void 0 && surface.actions.length > 0;
			const targetActions = new Map(surface.actions.flatMap((action) => action.actorId === void 0 ? [] : [[String(action.actorId), action]]));
			const selectedTargetAction = surface.actions.find((action) => String(action.id) === selectedActionId);
			const controlActions = surface.actions.filter((action) => action.actorId === void 0 && (action.automatic !== true || visibleError !== null));
			const targetCompanionActions = targetActions.size === 0 ? [] : controlActions;
			const activityControlActions = targetActions.size === 0 ? controlActions : [];
			const submitAction = (action) => {
				submit(action.submission.kind === "prompt" ? action.submission.text : action.submission.line, false, action.submission.kind, action.label);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
				className: RoleplayView_module_css_default.view,
				"data-roleplay-kind": surface.kind,
				"data-conversation-composer": "hidden",
				"aria-busy": waiting,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: RoleplayView_module_css_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: RoleplayView_module_css_default.gameIdentity,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: surface.title }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "·"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: RoleplayView_module_css_default.phase,
								children: surface.phase
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: RoleplayView_module_css_default.headerActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: RoleplayView_module_css_default.secondary,
							disabled: waiting,
							onClick: () => {
								launchScene();
							},
							children: launching ? "正在开局…" : "新开一局"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: RoleplayView_module_css_default.status,
							"data-running": waiting ? "true" : void 0,
							role: "status",
							children: surface.status === "complete" ? "已结束" : launching ? "正在开局" : waiting && surface.progress !== void 0 ? surface.progress.title : pending ? "正在提交行动" : running ? runningStatus(surface) : "等待你的行动"
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: RoleplayView_module_css_default.tabletop,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: RoleplayView_module_css_default.activity,
						"aria-label": "公开对局记录",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
								className: RoleplayView_module_css_default.panelHeader,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "对局记录" }) })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: recordViewport,
								className: RoleplayView_module_css_default.recordViewport,
								role: "log",
								"aria-label": "对局时间线",
								onScroll: (event) => {
									const viewport = event.currentTarget;
									const distanceFromLatest = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
									followLatestRecord.current = distanceFromLatest <= 24;
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: RoleplayView_module_css_default.recordStack,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PublicRecordFeed, {
										surface,
										waiting,
										onSelectActor: setSelectedActorId
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Review, { surface })]
								})
							}),
							surface.notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: RoleplayView_module_css_default.privateNotice,
								"aria-label": surface.notice.title,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "仅你可见" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: surface.notice.title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: surface.notice.text })] })]
							}),
							(waiting || activityControlActions.length > 0 || surfaceInput !== void 0 || visibleError !== null) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: RoleplayView_module_css_default.controls,
								"aria-label": "玩家行动",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: RoleplayView_module_css_default.controlIntro,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: RoleplayView_module_css_default.guidance,
												"aria-live": "polite",
												children: waiting ? waitingGuidance(surface, submittedActionLabel) : surface.guidance
											}),
											!waiting && surface.guidanceDetail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: RoleplayView_module_css_default.guidanceDetail,
												children: surface.guidanceDetail
											}),
											waiting && surface.progress?.completed !== void 0 && surface.progress.total !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: RoleplayView_module_css_default.progress,
												role: "progressbar",
												"aria-label": surface.progress.title,
												"aria-valuemin": 0,
												"aria-valuemax": surface.progress.total,
												"aria-valuenow": surface.progress.completed,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: `${String(surface.progress.completed / surface.progress.total * 100)}%` } })
											})
										]
									}),
									(activityControlActions.length > 0 || inputNeedsChoice) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: RoleplayView_module_css_default.actions,
										children: [surfaceInput !== void 0 && inputNeedsChoice && !inputExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: activityControlActions.length === 0 ? RoleplayView_module_css_default.primary : RoleplayView_module_css_default.secondary,
											disabled: locked,
											onClick: () => {
												setInputExpanded(true);
											},
											children: surfaceInput.submitLabel
										}), activityControlActions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: action.emphasis === "primary" ? RoleplayView_module_css_default.primary : RoleplayView_module_css_default.secondary,
											disabled: locked,
											onClick: () => {
												submitAction(action);
											},
											children: action.automatic === true ? "重试" : action.label
										}, action.id))]
									}),
									surfaceInput !== void 0 && (!inputNeedsChoice || inputExpanded) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
										className: RoleplayView_module_css_default.freeform,
										onSubmit: (event) => {
											event.preventDefault();
											const submission = surfaceInput.submission;
											submit(submission.kind === "prompt" ? draft : `${submission.prefix} ${JSON.stringify(draft.trim())}`, true, submission.kind);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												htmlFor: "roleplay-player-input",
												children: "输入内容"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
												id: "roleplay-player-input",
												value: draft,
												disabled: locked,
												maxLength: surfaceInput.maxLength,
												placeholder: surfaceInput.placeholder,
												onChange: (event) => {
													setDraft(event.target.value);
												},
												onKeyDown: (event) => {
													if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || locked || draft.trim() === "") return;
													event.preventDefault();
													event.currentTarget.form?.requestSubmit();
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "submit",
												className: RoleplayView_module_css_default.primary,
												disabled: locked || draft.trim() === "",
												children: surfaceInput.submitLabel
											})] }),
											surfaceInput.maxLength !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: RoleplayView_module_css_default.inputLimit,
												children: [
													draft.length,
													"/",
													surfaceInput.maxLength
												]
											})
										]
									}),
									visibleError != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: RoleplayView_module_css_default.error,
										role: "alert",
										children: visibleError
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlayerBoard, {
						surface,
						waiting,
						marks,
						selectedActorId,
						selectedActionId,
						selectedTargetAction,
						targetActions,
						companionActions: targetCompanionActions,
						targetGuidance: surface.guidance,
						targetGuidanceDetail: surface.guidanceDetail,
						actionLocked: locked,
						onSelectActor: setSelectedActorId,
						onSelectAction: (action) => {
							setSelectedActionId(String(action.id));
							setSelectedActorId(null);
						},
						onSubmitAction: submitAction,
						onMark: updateMark
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		function comparableWorkspacePath(value) {
			const normalized = value.replace(/[\\/]+$/u, "").replaceAll("\\", "/");
			return /^[A-Za-z]:\//u.test(normalized) ? normalized.toLocaleLowerCase("en-US") : normalized;
		}
		/** Select Roleplay once when a Session first exposes its conversation chrome. */
		function RoleplayDefaultView({ actions }) {
			(0, react.useEffect)(() => {
				actions.setView("roleplay");
			}, [actions]);
			return null;
		}
		/** Root services required before the deferred Roleplay view registration can be installed. */
		const inject = [
			"slots",
			"sessions",
			"workspaces"
		];
		/**
		* Register the generic Roleplay view before ordinary chat in the tab order.
		* @param ctx - browser root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.view", function* () {
				const conversationSession = ctx.slots.entries("conversation.session")[0];
				if (conversationSession?.store === void 0 || typeof conversationSession.store === "function") throw new Error("ui-roleplay: conversation Session shared store unavailable");
				const conversationStore = conversationSession.store;
				yield ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
					name: "conversation.session.header.actions",
					id: "roleplay-default-view",
					order: -100,
					store: conversationStore
				}, RoleplayDefaultView));
				yield ctx.slots.register({
					name: "conversation.view",
					id: "roleplay",
					order: -10,
					label: "角色扮演",
					inject: (sessionId) => {
						const scoped = ctx.sessions.scope(sessionId);
						if (scoped === void 0) throw new Error(`ui-roleplay: session ${JSON.stringify(sessionId)} resolved no scope`);
						const conversation = scoped.get("conversation");
						if (conversation === void 0) throw new Error("ui-roleplay: conversation service unavailable through the session scope");
						const session = ctx.sessions.binding(sessionId)?.session;
						if (session === void 0) throw new Error(`ui-roleplay: session ${JSON.stringify(sessionId)} resolved no binding`);
						return {
							startScene: async () => {
								const workspaces = ctx.workspaces.list.getSnapshot().items;
								const sessionCwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
								const workspace = workspaces.find((candidate) => candidate.sessionIds.includes(sessionId)) ?? (sessionCwd === void 0 ? void 0 : workspaces.find((candidate) => comparableWorkspacePath(candidate.path) === comparableWorkspacePath(sessionCwd)));
								if (workspace === void 0) throw new Error("当前会话未绑定工作区，无法新开一局。");
								const nextSessionId = await ctx.sessions.create({ workspaceId: workspace.workspaceId });
								await ctx.workspaces.archiveSession(sessionId);
								ctx.sessions.open(nextSessionId);
							},
							sendPrompt: (prompt) => conversation.send(prompt),
							runCommand: async (line) => {
								const result = await session.command(line);
								if (!result.ok) throw new Error(result.error.message);
								if (!result.value.matched) throw new Error("当前行动已失效，请刷新页面后重试。");
							}
						};
					}
				}, RoleplayView);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map