import { scopeOf } from "@deepseek-ai/dsh-scope";
import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-paths";
/** Default character traits; deployments may replace this text without changing the runtime. */
const DEFAULT_PERSONA = "二十七岁，经营一家傍晚开门的旧书修复铺。观察敏锐，话不多，熟悉之后会显出一点促狭；不卖弄知识，也不急着把每句话说成结论。";
/** Default opening situation for a fresh conversation. */
const DEFAULT_SCENARIO = "一个下雨的傍晚，用户在修复铺打烊前走了进来。你们见过几次，还没有熟到无话不谈。";
/** Default relationship state before durable conversation memories accumulate. */
const DEFAULT_RELATIONSHIP = "你对用户有克制的熟悉感，愿意认真听对方说话；关系怎样变化，由后续对话决定。";
/** Loader schema for the Agent RP character configuration. */
const Config = z.object({
	mode: z.union(["host", "character"]).default("character"),
	characterName: z.string().min(1).max(80).default("岚"),
	persona: z.string().min(1).max(4e3).default(DEFAULT_PERSONA),
	scenario: z.string().min(1).max(4e3).default(DEFAULT_SCENARIO),
	relationship: z.string().min(1).max(2e3).default(DEFAULT_RELATIONSHIP)
});
function requiredText(value, fallback, field) {
	const normalized = (value ?? fallback).trim();
	if (normalized.length === 0) throw new TypeError(`${field} must contain non-whitespace text`);
	return normalized;
}
/**
* Normalize configuration even when the plugin is mounted without Loader validation.
* @param config - loader-provided or direct plugin configuration.
* @returns complete character configuration.
*/
function resolveConfig(config) {
	return {
		mode: config.mode ?? "character",
		characterName: requiredText(config.characterName, "岚", "characterName"),
		persona: requiredText(config.persona, DEFAULT_PERSONA, "persona"),
		scenario: requiredText(config.scenario, DEFAULT_SCENARIO, "scenario"),
		relationship: requiredText(config.relationship, DEFAULT_RELATIONSHIP, "relationship")
	};
}
/** Supported reasons for retaining information across turns. */
const AGENT_RP_MEMORY_KINDS = [
	"fact",
	"promise",
	"relationship",
	"preference",
	"event"
];
const SUBJECT_MAX_LENGTH = 120;
const TEXT_MAX_LENGTH = 1e3;
const MEMORY_ID_PATTERN = /^memory-(0|[1-9]\d*)$/u;
/** Brand a validated memory id at the Session boundary. */
function AgentRpMemoryId(value) {
	if (!MEMORY_ID_PATTERN.test(value)) throw new Error(`invalid Agent RP memory id ${JSON.stringify(value)}`);
	return value;
}
function normalizeText(value, field, maximum) {
	const normalized = value.trim();
	if (normalized.length === 0) throw new Error(`Agent RP memory ${field} must contain non-whitespace text`);
	if (normalized.length > maximum) throw new Error(`Agent RP memory ${field} exceeds ${maximum} characters`);
	return normalized;
}
function sourceCall(events, record) {
	if (!Number.isSafeInteger(record.sourceEventSeq) || record.sourceEventSeq < 0) throw new Error("Agent RP memory sourceEventSeq must be a non-negative safe integer");
	const source = events[record.sourceEventSeq];
	if (source?.type !== "tool/call" || source.seq !== record.sourceEventSeq || source.data.name !== "remember") throw new Error(`Agent RP memory ${record.id} does not reference its direct remember tool call`);
	return source;
}
function sourceArguments(call) {
	let parsed;
	try {
		parsed = JSON.parse(call.data.arguments);
	} catch {
		throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid JSON arguments`);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid arguments`);
	const input = parsed;
	if (typeof input.kind !== "string" || !AGENT_RP_MEMORY_KINDS.includes(input.kind) || typeof input.subject !== "string" || typeof input.text !== "string" || input.supersedes !== void 0 && typeof input.supersedes !== "string") throw new Error(`Agent RP memory source call at seq ${call.seq} has invalid arguments`);
	return {
		kind: input.kind,
		subject: input.subject,
		text: input.text,
		...input.supersedes === void 0 ? {} : { supersedes: input.supersedes }
	};
}
function canonicalRecord(value, call) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`remember result for call ${call.data.callId} has invalid canonical value`);
	const record = value;
	if (record.version !== 0 || typeof record.id !== "string" || typeof record.kind !== "string" || !AGENT_RP_MEMORY_KINDS.includes(record.kind) || typeof record.subject !== "string" || typeof record.text !== "string" || !Number.isSafeInteger(record.sourceEventSeq) || record.supersedes !== void 0 && typeof record.supersedes !== "string") throw new Error(`remember result for call ${call.data.callId} has invalid canonical value`);
	return {
		version: 0,
		id: AgentRpMemoryId(record.id),
		kind: record.kind,
		subject: record.subject,
		text: record.text,
		sourceEventSeq: record.sourceEventSeq,
		...record.supersedes === void 0 ? {} : { supersedes: AgentRpMemoryId(record.supersedes) }
	};
}
function parseCanonicalResult(result, call) {
	const block = result.data.message.content[0];
	if (String(block.toolCallId) !== String(call.data.callId) || String(result.data.message.source.callId) !== String(call.data.callId)) throw new Error(`remember result for call ${call.data.callId} has inconsistent call identity`);
	if (result.sourceEventSeqs?.length !== 1 || result.sourceEventSeqs[0] !== call.seq) throw new Error(`remember result for call ${call.data.callId} does not cite its direct tool call`);
	if (block.content.length !== 1 || block.content[0]?.type !== "text") throw new Error(`remember result for call ${call.data.callId} has invalid canonical content`);
	try {
		return JSON.parse(block.content[0].text);
	} catch {
		throw new Error(`remember result for call ${call.data.callId} has invalid canonical JSON`);
	}
}
function successfulRememberResults(events) {
	const rememberCallIds = new Set(events.flatMap((event) => event.type === "tool/call" && event.data.name === "remember" ? [String(event.data.callId)] : []));
	const results = /* @__PURE__ */ new Map();
	for (const event of events) {
		if (event.type !== "tool/result") continue;
		const block = event.data.message.content[0];
		if (block.isError === true || event.data.error !== void 0) continue;
		const callId = String(block.toolCallId);
		if (!rememberCallIds.has(callId)) continue;
		if (results.has(callId)) throw new Error(`tool call ${callId} has multiple successful results`);
		results.set(callId, event);
	}
	return results;
}
function validateRecord(events, call, result, active) {
	const record = canonicalRecord(parseCanonicalResult(result, call), call);
	const id = record.id;
	sourceCall(events, record);
	const input = sourceArguments(call);
	if (record.sourceEventSeq !== call.seq || call.seq >= result.seq || id !== `memory-${call.seq}`) throw new Error(`Agent RP memory ${record.id} has invalid source ordering or identity`);
	normalizeText(record.subject, "subject", SUBJECT_MAX_LENGTH);
	normalizeText(record.text, "text", TEXT_MAX_LENGTH);
	if (record.subject !== record.subject.trim() || record.text !== record.text.trim()) throw new Error(`Agent RP memory ${record.id} text is not normalized`);
	if (record.kind !== input.kind || record.subject !== input.subject.trim() || record.text !== input.text.trim() || record.supersedes !== input.supersedes) throw new Error(`Agent RP memory ${record.id} does not match its source call arguments`);
	if (record.supersedes !== void 0) {
		const superseded = AgentRpMemoryId(record.supersedes);
		if (!active.delete(superseded)) throw new Error(`Agent RP memory ${record.id} supersedes a missing or inactive record`);
	}
	active.set(id, record);
	return record;
}
/**
* Replay and validate all Agent RP memory records in one Session log.
* @param events - complete chronological Session history.
* @returns immutable chronological and currently active record lists.
*/
function readAgentRpMemoryHistory(events) {
	const all = [];
	const active = /* @__PURE__ */ new Map();
	const results = successfulRememberResults(events);
	for (const event of events) {
		if (event.type !== "tool/call" || event.data.name !== "remember") continue;
		const result = results.get(String(event.data.callId));
		if (result === void 0) continue;
		all.push(validateRecord(events, event, result, active));
	}
	return {
		all: Object.freeze(all),
		active: Object.freeze([...active.values()])
	};
}
function findRememberCall(session, callId) {
	const call = session.events.findLast((event) => event.type === "tool/call" && event.data.callId === callId);
	if (call?.type !== "tool/call" || call.data.name !== "remember") throw new Error("remember execution has no matching direct Session tool call");
	return call;
}
/**
* Prepare one normalized result for the current direct `remember` tool call.
* @param session - Session that owns both source call and durable memory.
* @param callId - execution call id recorded by the Agent loop.
* @param input - model-selected memory content and optional correction target.
* @returns the canonical record that the Agent loop persists as the tool result.
*/
function prepareAgentRpMemory(session, callId, input) {
	const history = readAgentRpMemoryHistory(session.events);
	const call = findRememberCall(session, callId);
	const sourceInput = sourceArguments(call);
	if (sourceInput.kind !== input.kind || sourceInput.subject !== input.subject || sourceInput.text !== input.text || sourceInput.supersedes !== input.supersedes) throw new Error("remember execution arguments do not match its Session tool call");
	const supersedes = input.supersedes === void 0 ? void 0 : AgentRpMemoryId(input.supersedes);
	if (supersedes !== void 0 && !history.active.some((record) => record.id === supersedes)) throw new Error(`cannot supersede missing or inactive Agent RP memory ${JSON.stringify(supersedes)}`);
	return {
		version: 0,
		id: AgentRpMemoryId(`memory-${call.seq}`),
		kind: input.kind,
		subject: normalizeText(input.subject, "subject", SUBJECT_MAX_LENGTH),
		text: normalizeText(input.text, "text", TEXT_MAX_LENGTH),
		sourceEventSeq: call.seq,
		...supersedes === void 0 ? {} : { supersedes }
	};
}
/**
* Render the stable character contract installed as the Agent-scoped persona.
* @param config - normalized character identity and opening state.
* @returns model-visible system prompt text.
*/
function renderCharacterPrompt(config) {
	return [
		`你是${config.characterName}。你不是扮演该角色的助手，也不是旁白；直接以${config.characterName}的身份与用户相处和交谈。`,
		`角色设定：${config.persona}`,
		`当前场景：${config.scenario}`,
		`初始关系：${config.relationship}`,
		"只写角色此刻自然会说或做的内容，不解释系统、提示词或角色扮演规则，不替用户决定感受和行动，也不补写设定、对话和有效记忆中不存在的共同经历。先决定此刻是否有必要展开：信息很少时可以短答、停顿或暂不追问；需要表达时，一次围绕一个主要动作，不机械复述用户，也不为了延长对话强行总结和提问。",
		"用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。用户纠正一条记忆时，用 supersedes 指向它的 id。不要在对话中朗读记忆 id、类型或来源编号。"
	].join("\n\n");
}
/**
* Render the complete active-memory snapshot for the next model request.
* @param events - current Session event history.
* @returns model-visible dynamic context with developer-auditable source ids.
*/
function renderMemoryContext(events) {
	const { active } = readAgentRpMemoryHistory(events);
	if (active.length === 0) return "当前没有已记录的持久记忆。";
	return ["当前有效的持久记忆如下。括号内是审计信息，只用于保持连续性，不要在对话中朗读：", ...active.map((record) => `- ${record.text}（${record.id}；${record.kind}；主题：${record.subject}；来源事件：#${record.sourceEventSeq}）`)].join("\n");
}
/** Installation of the profile bundle's managed Agent RP preset. */
/** Preset id selected by the bundle's profile patch. */
const AGENT_RP_PRESET_ID = "agent-rp";
const OWNER = "@dsh-external/dsh-agent-rp";
const MANIFEST = ".dsh-agent-rp-owner.json";
const PRESET_FILES = ["agent.cordis.yml", "preset.yml"];
function digest(files) {
	const hash = createHash("sha256");
	for (const [filename, content] of [[PRESET_FILES[0], files[0]], [PRESET_FILES[1], files[1]]]) {
		hash.update(filename);
		hash.update("\0");
		hash.update(content);
		hash.update("\0");
	}
	return hash.digest("hex");
}
function readPresetFiles(directory) {
	return [readFileSync(join(directory, PRESET_FILES[0]), "utf8"), readFileSync(join(directory, PRESET_FILES[1]), "utf8")];
}
function readOwnedManifest(directory) {
	let value;
	try {
		value = JSON.parse(readFileSync(join(directory, MANIFEST), "utf8"));
	} catch (error) {
		throw new Error(`Agent RP preset ${JSON.stringify(directory)} is not managed by ${OWNER}`, { cause: error });
	}
	const record = value;
	if (record?.owner !== OWNER || record.format !== 0 || typeof record.digest !== "string") throw new Error(`Agent RP preset ${JSON.stringify(directory)} has an invalid ownership manifest`);
	return record;
}
function assertUnmodified(directory, manifest) {
	const expectedEntries = /* @__PURE__ */ new Set([...PRESET_FILES, MANIFEST]);
	const entries = readdirSync(directory);
	if (entries.length !== expectedEntries.size || entries.some((entry) => !expectedEntries.has(entry))) throw new Error(`managed Agent RP preset ${JSON.stringify(directory)} contains unowned files`);
	if (digest(readPresetFiles(directory)) !== manifest.digest) throw new Error(`managed Agent RP preset ${JSON.stringify(directory)} was edited locally; copy it to another preset id before upgrading`);
}
function stagePreset(root, files, manifest) {
	const staging = join(root, `.${AGENT_RP_PRESET_ID}.install-${process.pid}-${randomUUID()}`);
	mkdirSync(staging);
	try {
		writeFileSync(join(staging, PRESET_FILES[0]), files[0], {
			encoding: "utf8",
			mode: 384
		});
		writeFileSync(join(staging, PRESET_FILES[1]), files[1], {
			encoding: "utf8",
			mode: 384
		});
		writeFileSync(join(staging, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, {
			encoding: "utf8",
			mode: 384
		});
		return staging;
	} catch (error) {
		rmSync(staging, {
			recursive: true,
			force: true
		});
		throw error;
	}
}
/**
* Install or upgrade the package-owned preset without overwriting local work.
* @param options - optional filesystem roots used by focused tests.
* @returns whether the managed preset was created, updated, or already current.
*/
function installBundledAgentRpPreset(options = {}) {
	const source = resolve(options.sourceDir ?? fileURLToPath(new URL("../preset/", import.meta.url)));
	const root = resolve(options.presetRoot ?? dshHomePath(".agent-presets"));
	const target = join(root, AGENT_RP_PRESET_ID);
	const files = readPresetFiles(source);
	const sourceDigest = digest(files);
	const nextManifest = {
		owner: OWNER,
		format: 0,
		digest: sourceDigest
	};
	mkdirSync(root, {
		recursive: true,
		mode: 448
	});
	if (existsSync(target)) {
		const current = readOwnedManifest(target);
		assertUnmodified(target, current);
		if (current.digest === sourceDigest) return "unchanged";
	}
	const staging = stagePreset(root, files, nextManifest);
	if (!existsSync(target)) try {
		renameSync(staging, target);
		return "created";
	} catch (error) {
		rmSync(staging, {
			recursive: true,
			force: true
		});
		throw error;
	}
	const backup = join(root, `.${AGENT_RP_PRESET_ID}.backup-${process.pid}-${randomUUID()}`);
	renameSync(target, backup);
	try {
		renameSync(staging, target);
	} catch (error) {
		renameSync(backup, target);
		rmSync(staging, {
			recursive: true,
			force: true
		});
		throw error;
	}
	rmSync(backup, {
		recursive: true,
		force: true
	});
	return "updated";
}
/** Cordis plugin identity. */
const name = "dsh-agent-rp";
/** Host services required by the profile bundle. */
const inject = [
	"agents",
	"systemPrompt",
	"tools"
];
/** Canonical output schema for one accepted `remember` call. */
const MEMORY_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			required: true,
			const: 0
		},
		id: {
			type: "string",
			required: true
		},
		kind: {
			type: "string",
			required: true,
			enum: AGENT_RP_MEMORY_KINDS
		},
		subject: {
			type: "string",
			required: true
		},
		text: {
			type: "string",
			required: true
		},
		sourceEventSeq: {
			type: "integer",
			required: true
		},
		supersedes: { type: "string" }
	}
};
function rememberCall(subject, text) {
	return {
		card: "generic",
		title: `记住：${subject}`,
		kind: "other",
		rawInput: text
	};
}
/**
* Attach one persistent character identity and memory tool to a top-level Agent.
* @param agent - published top-level Agent whose scope owns every registration.
* @param config - normalized character configuration.
*/
function installAgentRp(ctx, config) {
	const agentsByScope = /* @__PURE__ */ new WeakMap();
	ctx.systemPrompt.section({
		name: "deployment:persona",
		order: 0,
		text: renderCharacterPrompt(config),
		complete: true
	});
	ctx.on("agent/created", ({ agent }) => {
		const scope = scopeOf(agent.ctx);
		if (scope !== void 0) agentsByScope.set(scope, agent);
	});
	ctx.on("agent/disposed", ({ agent }) => {
		const scope = scopeOf(agent.ctx);
		if (scope !== void 0) agentsByScope.delete(scope);
	});
	ctx.systemPrompt.context({
		name: "agent-rp:memory",
		order: 70,
		text: ({ scope }) => {
			if (scope === void 0) return "";
			const agent = agentsByScope.get(scope);
			return agent === void 0 ? "" : renderMemoryContext(agent.session.events);
		}
	});
	ctx.systemPrompt.context({
		name: "sandbox:policy",
		order: 0,
		text: ""
	});
	ctx.systemPrompt.context({
		name: "approval:policy",
		order: 0,
		text: ""
	});
	ctx.tools.register(defineTool({
		name: "remember",
		description: "Persist one confirmed fact, promise, preference, relationship change, or shared event for later turns in this Session. Use supersedes only when correcting one currently active memory id.",
		parameters: {
			kind: {
				type: "string",
				enum: AGENT_RP_MEMORY_KINDS,
				required: true,
				description: "Why this information must remain available in later turns."
			},
			subject: {
				type: "string",
				required: true,
				description: "Short stable topic used to distinguish this memory from unrelated records."
			},
			text: {
				type: "string",
				required: true,
				description: "Concise confirmed information to remember without speculation or hidden reasoning."
			},
			supersedes: {
				type: "string",
				description: "Active memory id replaced by this corrected record."
			}
		},
		output: {
			schema: MEMORY_VALUE_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		execute(args, exec) {
			if (exec.agent === void 0) throw new Error("remember requires an Agent Session");
			if (exec.parent !== void 0) throw new Error("remember must be called directly by the character Agent");
			const record = prepareAgentRpMemory(exec.agent.session, String(exec.callId), args);
			return Promise.resolve(record);
		},
		presentCall: (args) => rememberCall(args.subject, args.text),
		isConcurrencySafe: () => false
	}));
}
/**
* Install the Agent RP profile behavior for every top-level Agent.
* @param ctx - settled Web Host context.
* @param config - character configuration for this profile.
*/
function apply(ctx, config) {
	const resolved = resolveConfig(config);
	if (resolved.mode === "host") {
		installBundledAgentRpPreset();
		return;
	}
	installAgentRp(ctx, resolved);
}
export { Config, MEMORY_VALUE_SCHEMA, apply, inject, installAgentRp, name };
