window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-roleplay-portable-spike",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:src/client/RoleplayView.module.css.mjs
		const css = ".HpLH9q_view{box-sizing:border-box;width:min(1360px,100%);height:100%;min-height:0;max-height:calc(100dvh - 48px);color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;margin:0 auto;padding:12px 18px 16px;display:flex;overflow:hidden}[data-conversation-scroll]:has([data-conversation-composer=hidden])>:last-child{display:none}[data-phase]:has([data-conversation-view=exclusive]) [role=tablist]{display:none}.HpLH9q_header,.HpLH9q_activity,.HpLH9q_playerDesk,.HpLH9q_review{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px}.HpLH9q_header{min-height:48px;box-shadow:var(--dsw-shadow-lv2);flex:none;justify-content:space-between;align-items:center;gap:16px;padding:8px 14px;display:flex}.HpLH9q_gameIdentity{align-items:baseline;gap:8px;min-width:0;display:flex}.HpLH9q_headerActions{flex:none;align-items:center;gap:8px;display:flex}.HpLH9q_gameIdentity>span{color:var(--dsw-alias-label-caption)}.HpLH9q_header h1,.HpLH9q_panelHeader h2,.HpLH9q_review h2,.HpLH9q_preparation h2{color:var(--dsw-alias-label-primary);margin:0}.HpLH9q_header h1{flex:none;font-size:20px;font-weight:650;line-height:28px}.HpLH9q_phase{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:14px;line-height:21px;overflow:hidden}.HpLH9q_status{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary);border-radius:999px;flex:none;padding:4px 9px;font-size:12px;font-weight:650;line-height:18px}.HpLH9q_status[data-running=true]{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label)}.HpLH9q_tabletop{flex:1;grid-template-columns:minmax(0,1fr) minmax(320px,376px);gap:10px;min-height:0;display:grid}.HpLH9q_activity{grid-template-rows:auto minmax(0,1fr) auto;min-width:0;min-height:0;display:grid;overflow:hidden}.HpLH9q_panelHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;justify-content:space-between;align-items:center;gap:10px;min-height:46px;padding:7px 13px;display:flex}.HpLH9q_panelHeader h2{font-size:17px;font-weight:650;line-height:24px}.HpLH9q_panelHeader p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.HpLH9q_recordViewport{overscroll-behavior:contain;scrollbar-gutter:stable;min-height:0;padding:0 13px 12px;overflow-y:auto}.HpLH9q_recordStack{flex-direction:column;justify-content:flex-end;gap:10px;min-height:100%;padding-top:10px;display:flex}.HpLH9q_controls{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex:none;align-items:center;gap:10px;padding:10px 13px;display:flex}.HpLH9q_privateNotice{border-top:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 28%, transparent);background:var(--dsw-alias-state-business-tertiary);flex:none;align-items:flex-start;gap:10px;padding:10px 13px;display:flex}.HpLH9q_privateNotice>span{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-bg-layer-1);border-radius:999px;flex:none;padding:2px 7px;font-size:10px;font-weight:650;line-height:16px}.HpLH9q_privateNotice>div{min-width:0}.HpLH9q_privateNotice strong{color:var(--dsw-alias-label-primary);font-size:13px;line-height:19px;display:block}.HpLH9q_privateNotice p{color:var(--dsw-alias-label-primary-dimmed);margin:1px 0 0;font-size:14px;line-height:21px}.HpLH9q_controlIntro{flex:240px;min-width:180px}.HpLH9q_guidance{color:var(--dsw-alias-label-primary-dimmed);margin:0;font-size:14px;font-weight:550;line-height:21px}.HpLH9q_guidanceDetail{color:var(--dsw-alias-label-tertiary);margin:2px 0 0;font-size:12px;line-height:18px}.HpLH9q_progress{background:var(--dsw-alias-bg-base);border-radius:999px;height:4px;margin-top:7px;overflow:hidden}.HpLH9q_progress span{border-radius:inherit;background:var(--dsw-alias-state-business-primary);height:100%;transition:width .16s ease-out;display:block}.HpLH9q_actions{flex-wrap:wrap;flex:480px;justify-content:flex-end;gap:7px;min-width:0;display:flex}.HpLH9q_primary,.HpLH9q_secondary{min-height:34px;font:inherit;cursor:pointer;border-radius:9px;padding:7px 12px;font-size:13px;line-height:19px}.HpLH9q_primary{border:1px solid var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.HpLH9q_primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.HpLH9q_secondary{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-tool-bar-fill);color:var(--dsw-alias-label-secondary)}.HpLH9q_secondary:hover:not(:disabled){background:var(--dsw-alias-button-tool-bar-hover)}.HpLH9q_actions .HpLH9q_secondary{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, var(--dsw-alias-button-tool-bar-fill));color:var(--dsw-alias-label-primary)}.HpLH9q_actions .HpLH9q_secondary:hover:not(:disabled){border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 58%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, var(--dsw-alias-button-tool-bar-hover))}.HpLH9q_primary:disabled,.HpLH9q_secondary:disabled{opacity:.45;cursor:default}.HpLH9q_freeform{flex:460px;min-width:320px;display:flex;position:relative}.HpLH9q_freeform>label{clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;width:1px;height:1px;padding:0;position:absolute;overflow:hidden}.HpLH9q_freeform>div{flex:1;align-items:stretch;gap:8px;display:flex}.HpLH9q_freeform textarea{box-sizing:border-box;resize:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-width:0;min-height:42px;max-height:84px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:9px;outline:none;flex:1;padding:9px 58px 9px 11px;font-size:14px;line-height:21px}.HpLH9q_freeform textarea:focus{border-color:var(--dsw-alias-state-business-primary)}.HpLH9q_freeform textarea::placeholder{color:var(--dsw-alias-label-caption)}.HpLH9q_inputLimit{color:var(--dsw-alias-label-caption);pointer-events:none;margin:0;font-size:11px;line-height:16px;position:absolute;bottom:4px;right:88px}.HpLH9q_recordGroups{flex-direction:column;gap:8px;display:flex}.HpLH9q_recordGroup{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:10px;overflow:hidden}.HpLH9q_recordGroup>summary{cursor:pointer;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;list-style:none;display:flex}.HpLH9q_recordGroup>summary::-webkit-details-marker{display:none}.HpLH9q_recordGroup>summary:after{content:\"›\";color:var(--dsw-alias-label-tertiary);transform:rotate(90deg)}.HpLH9q_recordGroup:not([open])>summary:after{transform:rotate(0)}.HpLH9q_recordGroup>summary span{flex:1;font-size:13px;font-weight:650;line-height:20px}.HpLH9q_recordGroup>summary small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}.HpLH9q_recordGroupBody{border-top:1px solid var(--dsw-alias-border-l1);padding:0 10px 10px}.HpLH9q_outcomeList{flex-direction:column;gap:7px;padding-top:10px;display:flex}.HpLH9q_recordList{flex-direction:column;gap:7px;padding-top:9px;display:flex}.HpLH9q_ballotDetails{border-top:1px solid var(--dsw-alias-border-l1);margin-top:9px;padding-top:8px}.HpLH9q_ballotDetails>summary{color:var(--dsw-alias-state-business-primary);cursor:pointer;align-items:center;gap:6px;font-size:11px;font-weight:600;line-height:17px;list-style:none;display:flex}.HpLH9q_ballotDetails>summary::-webkit-details-marker{display:none}.HpLH9q_ballotDetails>summary:before{content:\"›\";color:var(--dsw-alias-label-tertiary)}.HpLH9q_ballotDetails[open]>summary:before{transform:rotate(90deg)}.HpLH9q_ballotDetails>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}.HpLH9q_ballotOpenLabel,.HpLH9q_ballotDetails[open] .HpLH9q_ballotClosedLabel{display:none}.HpLH9q_ballotDetails[open] .HpLH9q_ballotOpenLabel{display:inline}.HpLH9q_ballotSection{padding-top:1px}.HpLH9q_ballotList{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding-top:8px;display:grid}.HpLH9q_statementCard{background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:10px 11px}.HpLH9q_statementCard button,.HpLH9q_ballotRow button{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12px;font-weight:650;line-height:18px}.HpLH9q_statementCard>strong{font-size:12px;line-height:18px}.HpLH9q_passActors{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.HpLH9q_statementCard p{color:var(--dsw-alias-label-primary-dimmed);white-space:pre-wrap;margin:4px 0 0;font-size:14px;line-height:22px}.HpLH9q_ballotRow{background:var(--dsw-alias-bg-layer-1);min-width:0;color:var(--dsw-alias-label-secondary);border-radius:8px;grid-template-columns:minmax(0,1fr) 12px minmax(0,1fr);align-items:center;gap:4px;padding:6px 8px;font-size:12px;line-height:18px;display:grid}.HpLH9q_ballotRow>span:nth-child(2){color:var(--dsw-alias-label-tertiary);text-align:center}.HpLH9q_ballotRow strong{font-weight:600}.HpLH9q_outcomeRow{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-label-primary);border-radius:9px;grid-template-columns:28px minmax(0,1fr);align-items:center;gap:9px;padding:10px 11px;display:grid}.HpLH9q_outcomeIcon{background:var(--dsw-alias-state-business-primary);width:28px;height:28px;color:var(--dsw-alias-bg-layer-1);border-radius:50%;place-items:center;font-size:15px;font-weight:700;display:grid}.HpLH9q_outcomeRow small{color:var(--dsw-alias-label-tertiary);margin-bottom:1px;font-size:10px;line-height:15px;display:block}.HpLH9q_outcomeRow p{margin:0;font-size:14px;font-weight:650;line-height:21px}.HpLH9q_voteSummary{align-items:flex-start;gap:8px;padding-top:9px;display:flex}.HpLH9q_voteSummaryLabel{color:var(--dsw-alias-label-tertiary);flex:none;padding-top:4px;font-size:11px;line-height:17px}.HpLH9q_voteTally{flex-wrap:wrap;gap:6px;display:flex}.HpLH9q_voteTally span{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);border-radius:999px;align-items:center;gap:5px;padding:3px 7px;font-size:11px;line-height:17px;display:inline-flex}.HpLH9q_voteTally strong{background:var(--dsw-alias-state-business-tertiary);min-width:17px;height:17px;color:var(--dsw-alias-state-business-primary);border-radius:999px;place-items:center;display:grid}.HpLH9q_phaseNarration{border-left:3px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);border-radius:0 9px 9px 0;margin-top:9px;padding:9px 11px}.HpLH9q_phaseNarration small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.HpLH9q_phaseNarration p{color:var(--dsw-alias-label-primary-dimmed);white-space:pre-wrap;margin:3px 0 0;font-size:14px;line-height:21px}.HpLH9q_playerDesk{isolation:isolate;flex-direction:column;min-width:0;min-height:0;display:flex;position:relative;overflow:hidden}.HpLH9q_factsPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;flex:none;margin:10px 11px 0;padding:8px 9px}.HpLH9q_factsPanel>summary{color:var(--dsw-alias-label-secondary);cursor:pointer;justify-content:space-between;font-size:13px;font-weight:650;line-height:19px;display:flex}.HpLH9q_factsPanel>summary span{background:var(--dsw-alias-bg-layer-1);min-width:18px;height:18px;color:var(--dsw-alias-label-tertiary);border-radius:999px;place-items:center;font-size:11px;display:grid}.HpLH9q_actors,.HpLH9q_facts{margin:0;padding:0;list-style:none}.HpLH9q_actors{overscroll-behavior:contain;scrollbar-gutter:stable;flex:1;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(64px,auto);align-content:start;gap:6px;min-height:0;margin:10px 11px 11px;display:grid;overflow-y:auto}.HpLH9q_actors li{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;min-width:0;min-height:64px;position:relative}.HpLH9q_actors li[data-selected=true]{border-color:var(--dsw-alias-state-business-primary)}.HpLH9q_actors li[data-actionable=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 48%, var(--dsw-alias-border-l1));box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)}.HpLH9q_actors li[data-action-selected=true]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent);animation:.18s ease-out HpLH9q_target-selected}.HpLH9q_targetControls{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex:none;align-items:center;gap:10px;min-height:58px;padding:10px 11px;display:flex}.HpLH9q_targetActionCopy{flex:1;min-width:0}.HpLH9q_targetActionCopy p{color:var(--dsw-alias-label-primary-dimmed);margin:0;font-size:14px;font-weight:600;line-height:21px}.HpLH9q_targetActionCopy small{color:var(--dsw-alias-label-tertiary);margin-top:2px;font-size:12px;line-height:18px;display:block}.HpLH9q_targetActionButtons{flex-wrap:wrap;flex:none;justify-content:flex-end;gap:7px;display:flex}.HpLH9q_actors li[data-state=inactive]{opacity:.56}.HpLH9q_actors li[data-mark=trust]{box-shadow:inset 3px 0 var(--dsw-alias-state-success-primary)}.HpLH9q_actors li[data-mark=watch]{box-shadow:inset 3px 0 var(--dsw-alias-state-warn-label)}.HpLH9q_actors li[data-mark=suspect]{box-shadow:inset 3px 0 var(--dsw-alias-state-error-primary)}.HpLH9q_actorButton{box-sizing:border-box;border-radius:inherit;width:100%;height:100%;min-height:62px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;gap:3px;padding:9px 10px;display:flex}.HpLH9q_actorButton:hover{background:var(--dsw-alias-button-tool-bar-hover)}.HpLH9q_actorButton:disabled{cursor:default}.HpLH9q_actors li[data-actionable=true] .HpLH9q_actorButton{padding-right:38px}.HpLH9q_actorInspect{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:26px;height:24px;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;border-radius:7px;place-items:center;padding:0;font-size:10px;line-height:1;display:grid;position:absolute;top:7px;right:7px}.HpLH9q_actorInspect:hover{color:var(--dsw-alias-label-primary)}@keyframes HpLH9q_target-selected{0%{transform:scale(.98)}to{transform:scale(1)}}@media (prefers-reduced-motion:reduce){.HpLH9q_actors li[data-action-selected=true]{animation:none}}.HpLH9q_actorTopline{align-items:center;gap:6px;width:100%;display:flex}.HpLH9q_actorTopline strong{text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:14px;line-height:20px;overflow:hidden}.HpLH9q_actorState{background:var(--dsw-alias-state-success-primary);width:6px;height:6px;box-shadow:0 0 0 3px var(--dsw-alias-state-success-tertiary);border-radius:999px;flex:none}.HpLH9q_actors li[data-state=inactive] .HpLH9q_actorState{background:var(--dsw-alias-label-caption);box-shadow:none}.HpLH9q_markSymbol{background:var(--dsw-alias-bg-layer-1);border-radius:999px;flex:none;place-items:center;width:17px;height:17px;font-size:11px;font-weight:700;display:grid}.HpLH9q_actorBadges{align-items:center;gap:4px;min-width:0;padding-left:12px;display:flex}.HpLH9q_actorBadges em{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);border-radius:999px;padding:1px 5px;font-size:10px;font-style:normal;line-height:15px}.HpLH9q_actorBadges small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}.HpLH9q_facts{flex-direction:column;gap:3px;margin-top:6px;display:flex}.HpLH9q_facts li{color:var(--dsw-alias-label-secondary);padding-left:11px;font-size:12px;line-height:18px;position:relative}.HpLH9q_facts li:before{content:\"•\";color:var(--dsw-alias-state-business-primary);position:absolute;left:0}.HpLH9q_playerInspector{z-index:2;overscroll-behavior:contain;border-top:1px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv3);padding:13px;position:absolute;inset:47px 0 0;overflow-y:auto}.HpLH9q_playerInspector>header{justify-content:space-between;align-items:flex-start;gap:10px;display:flex}.HpLH9q_playerInspector>header p,.HpLH9q_review>header>p:first-child{color:var(--dsw-alias-state-business-primary);margin:0 0 3px;font-size:11px;font-weight:650;line-height:17px}.HpLH9q_playerInspector h3{margin:0;font-size:16px;line-height:22px}.HpLH9q_playerInspector>header>button{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;place-items:center;padding:0;font-size:17px;display:grid}.HpLH9q_markPicker{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:11px;display:grid}.HpLH9q_markPicker button{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);min-height:32px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:8px;justify-content:center;align-items:center;gap:5px;padding:5px 7px;font-size:12px;display:flex}.HpLH9q_markPicker button[aria-pressed=true]{border-color:var(--dsw-alias-state-business-primary)}.HpLH9q_markPicker button[data-mark=trust][aria-pressed=true]{color:var(--dsw-alias-state-success-primary)}.HpLH9q_markPicker button[data-mark=watch][aria-pressed=true]{color:var(--dsw-alias-state-warn-label)}.HpLH9q_markPicker button[data-mark=suspect][aria-pressed=true]{color:var(--dsw-alias-state-error-primary)}.HpLH9q_localOnly{color:var(--dsw-alias-label-tertiary);margin:7px 0 0;font-size:11px;line-height:17px}.HpLH9q_playerRecords{flex-direction:column;gap:9px;margin-top:11px;display:flex}.HpLH9q_playerRecords>div>span{color:var(--dsw-alias-label-tertiary);margin-bottom:4px;font-size:11px;line-height:17px;display:block}.HpLH9q_empty,.HpLH9q_error{margin:0;font-size:13px;line-height:20px}.HpLH9q_empty{color:var(--dsw-alias-label-tertiary)}.HpLH9q_error{color:var(--dsw-alias-state-error-primary);flex-basis:100%}.HpLH9q_review{padding:14px}.HpLH9q_review h2{font-size:16px;line-height:23px}.HpLH9q_review>header>p:last-child{color:var(--dsw-alias-label-secondary);margin:5px 0 0;font-size:13px;line-height:20px}.HpLH9q_review>ol{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0;padding:0;list-style:none;display:grid}.HpLH9q_review li{min-width:0}.HpLH9q_review details{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:9px;height:100%}.HpLH9q_review summary{cursor:pointer;padding:9px 11px}.HpLH9q_review summary span,.HpLH9q_review summary strong{display:block}.HpLH9q_review summary span{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}.HpLH9q_review summary strong{margin-top:3px;font-size:13px;font-weight:600;line-height:20px}.HpLH9q_review dl{flex-direction:column;gap:8px;margin:0;padding:0 11px 11px;display:flex}.HpLH9q_review dl div{grid-template-columns:60px minmax(0,1fr);gap:8px;display:grid}.HpLH9q_review dt,.HpLH9q_review dd{margin:0;font-size:12px;line-height:19px}.HpLH9q_review dt{color:var(--dsw-alias-label-tertiary)}.HpLH9q_review dd{color:var(--dsw-alias-label-secondary);white-space:pre-wrap}.HpLH9q_preparationShell{box-sizing:border-box;place-items:center;width:100%;height:100%;min-height:0;padding:24px;display:grid}.HpLH9q_preparation{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:min(520px,100%);box-shadow:var(--dsw-shadow-lv2);text-align:center;border-radius:16px;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:34px 36px;display:flex}.HpLH9q_preparationMark{background:var(--dsw-alias-state-business-tertiary);width:54px;height:54px;color:var(--dsw-alias-state-business-primary);border-radius:16px;place-items:center;font-size:15px;font-weight:700;line-height:20px;display:grid}.HpLH9q_preparation h2{font-size:20px;line-height:28px}.HpLH9q_preparation p{max-width:520px;color:var(--dsw-alias-label-secondary);margin:0;font-size:14px;line-height:22px}.HpLH9q_preparationActions{flex-direction:column;align-items:center;gap:8px;margin-top:10px;display:flex}.HpLH9q_preparationActions .HpLH9q_primary{min-width:160px;min-height:42px;font-size:14px}.HpLH9q_preparationActions small{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}@media (width<=1000px){.HpLH9q_view{height:auto;max-height:none;padding:12px 14px 28px;overflow:visible}.HpLH9q_tabletop{grid-template-columns:1fr}.HpLH9q_activity{height:min(720px,100dvh - 86px);min-height:560px}.HpLH9q_playerDesk{max-height:620px}.HpLH9q_actors{min-height:360px}}@media (width<=680px){.HpLH9q_header{align-items:flex-start}.HpLH9q_gameIdentity{flex-wrap:wrap;gap:2px 7px}.HpLH9q_gameIdentity>span{display:none}.HpLH9q_phase{flex-basis:100%}.HpLH9q_controls{flex-direction:column;align-items:stretch}.HpLH9q_actions{order:2}.HpLH9q_freeform{order:3;width:100%;min-width:0}.HpLH9q_inputLimit{right:88px}.HpLH9q_review>ol{grid-template-columns:1fr}.HpLH9q_ballotList{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (width<=440px){.HpLH9q_view{padding-left:8px;padding-right:8px}.HpLH9q_actors{grid-template-columns:1fr}.HpLH9q_targetControls{flex-direction:column;align-items:stretch}.HpLH9q_targetActionButtons{justify-content:stretch}.HpLH9q_targetActionButtons button{flex:1}.HpLH9q_freeform>div{flex-direction:column}.HpLH9q_freeform textarea{padding-right:11px}.HpLH9q_inputLimit{text-align:right;margin-top:3px;position:static}.HpLH9q_ballotList{grid-template-columns:1fr}.HpLH9q_preparationShell{padding:12px}.HpLH9q_preparation{padding:28px 20px}}";
		const tagId = "@dsh-external/dsh-roleplay-portable-spike/RoleplayView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-external/dsh-roleplay-portable-spike";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var RoleplayView_module_css_default = {
			"actions": "HpLH9q_actions",
			"activity": "HpLH9q_activity",
			"actorBadges": "HpLH9q_actorBadges",
			"actorButton": "HpLH9q_actorButton",
			"actorInspect": "HpLH9q_actorInspect",
			"actors": "HpLH9q_actors",
			"actorState": "HpLH9q_actorState",
			"actorTopline": "HpLH9q_actorTopline",
			"ballotClosedLabel": "HpLH9q_ballotClosedLabel",
			"ballotDetails": "HpLH9q_ballotDetails",
			"ballotList": "HpLH9q_ballotList",
			"ballotOpenLabel": "HpLH9q_ballotOpenLabel",
			"ballotRow": "HpLH9q_ballotRow",
			"ballotSection": "HpLH9q_ballotSection",
			"controlIntro": "HpLH9q_controlIntro",
			"controls": "HpLH9q_controls",
			"empty": "HpLH9q_empty",
			"error": "HpLH9q_error",
			"facts": "HpLH9q_facts",
			"factsPanel": "HpLH9q_factsPanel",
			"freeform": "HpLH9q_freeform",
			"gameIdentity": "HpLH9q_gameIdentity",
			"guidance": "HpLH9q_guidance",
			"guidanceDetail": "HpLH9q_guidanceDetail",
			"header": "HpLH9q_header",
			"headerActions": "HpLH9q_headerActions",
			"inputLimit": "HpLH9q_inputLimit",
			"localOnly": "HpLH9q_localOnly",
			"markPicker": "HpLH9q_markPicker",
			"markSymbol": "HpLH9q_markSymbol",
			"outcomeIcon": "HpLH9q_outcomeIcon",
			"outcomeList": "HpLH9q_outcomeList",
			"outcomeRow": "HpLH9q_outcomeRow",
			"panelHeader": "HpLH9q_panelHeader",
			"passActors": "HpLH9q_passActors",
			"phase": "HpLH9q_phase",
			"phaseNarration": "HpLH9q_phaseNarration",
			"playerDesk": "HpLH9q_playerDesk",
			"playerInspector": "HpLH9q_playerInspector",
			"playerRecords": "HpLH9q_playerRecords",
			"preparation": "HpLH9q_preparation",
			"preparationActions": "HpLH9q_preparationActions",
			"preparationMark": "HpLH9q_preparationMark",
			"preparationShell": "HpLH9q_preparationShell",
			"primary": "HpLH9q_primary",
			"privateNotice": "HpLH9q_privateNotice",
			"progress": "HpLH9q_progress",
			"recordGroup": "HpLH9q_recordGroup",
			"recordGroupBody": "HpLH9q_recordGroupBody",
			"recordGroups": "HpLH9q_recordGroups",
			"recordList": "HpLH9q_recordList",
			"recordStack": "HpLH9q_recordStack",
			"recordViewport": "HpLH9q_recordViewport",
			"review": "HpLH9q_review",
			"secondary": "HpLH9q_secondary",
			"statementCard": "HpLH9q_statementCard",
			"status": "HpLH9q_status",
			"tabletop": "HpLH9q_tabletop",
			"target-selected": "HpLH9q_target-selected",
			"targetActionButtons": "HpLH9q_targetActionButtons",
			"targetActionCopy": "HpLH9q_targetActionCopy",
			"targetControls": "HpLH9q_targetControls",
			"view": "HpLH9q_view",
			"voteSummary": "HpLH9q_voteSummary",
			"voteSummaryLabel": "HpLH9q_voteSummaryLabel",
			"voteTally": "HpLH9q_voteTally"
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
				"data-conversation-view": "exclusive",
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
				automaticAttemptRef.current = attemptKey;
				const value = action.submission.kind === "prompt" ? action.submission.text : action.submission.line;
				const timer = window.setTimeout(() => {
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
				"data-conversation-view": "exclusive",
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
		/** Required services: slot ownership, session and Workspace addressing, and prompt admission. */
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"conversation"
		];
		/**
		* Register the generic Roleplay view before ordinary chat in the tab order.
		* @param ctx - browser root context.
		*/
		function apply(ctx) {
			ctx.slots.register({
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
							const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
							const workspace = ctx.workspaces.list.getSnapshot().items.find((candidate) => candidate.sessionIds.includes(sessionId));
							const nextSessionId = await ctx.sessions.create(workspace === void 0 ? summary?.cwd === void 0 ? {} : { cwd: summary.cwd } : { workspaceId: workspace.workspaceId });
							ctx.sessions.open(nextSessionId);
							await ctx.workspaces.archiveSession(sessionId);
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
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map