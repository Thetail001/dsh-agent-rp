import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
import { Session, SessionId, snapshotJsonValue } from "@deepseek-ai/dsh-session";
import { createAssistantMessage, createUserMessage } from "@deepseek-ai/dsh-llm";
import { Buffer as Buffer$1 } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-paths";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
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
/** Character Card V1/V2/V3 JSON parser with lossless raw preservation. */
/** Maximum decoded JSON accepted from one card transport. */
const MAX_CHARACTER_CARD_JSON_BYTES = 2 * 1024 * 1024;
/** Decode one standalone Character Card JSON file without replacement characters. */
function parseCharacterCardJsonBytes(data) {
	let json;
	try {
		json = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^\uFEFF/u, "");
	} catch (error) {
		throw new Error("Character Card JSON must be valid UTF-8", { cause: error });
	}
	return parseCharacterCardJson(json);
}
function object$2(value, path) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
	return value;
}
function requiredString(value, path) {
	if (typeof value !== "string") throw new Error(`${path} must be a string`);
	return value;
}
function optionalString$2(value, path) {
	if (value === void 0) return void 0;
	return requiredString(value, path);
}
function optionalBoolean$1(value, path) {
	if (value === void 0) return void 0;
	if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
	return value;
}
function optionalFiniteNumber$1(value, path) {
	if (value === void 0) return void 0;
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
	return value;
}
function stringArray$2(value, path, fallback = []) {
	if (value === void 0) return [...fallback];
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${path} must be an array of strings`);
	return [...value];
}
function hasDecorator$1(content) {
	return /(?:^|\n)@@@?[a-z_]+(?:\s|$)/imu.test(content);
}
function parseLorebookEntry(value, index, version) {
	const path = `data.character_book.entries[${index}]`;
	const entry = object$2(value, path);
	object$2(entry.extensions, `${path}.extensions`);
	const insertionOrder = optionalFiniteNumber$1(entry.insertion_order, `${path}.insertion_order`);
	if (insertionOrder === void 0) throw new Error(`${path}.insertion_order must be a finite number`);
	const enabled = optionalBoolean$1(entry.enabled, `${path}.enabled`);
	if (enabled === void 0) throw new Error(`${path}.enabled must be a boolean`);
	const priority = optionalFiniteNumber$1(entry.priority, `${path}.priority`);
	const useRegex = optionalBoolean$1(entry.use_regex, `${path}.use_regex`) ?? false;
	if (version === 3 && entry.use_regex === void 0) throw new Error(`${path}.use_regex must be a boolean`);
	const position = optionalString$2(entry.position, `${path}.position`) ?? "after_char";
	if (position !== "before_char" && position !== "after_char") throw new Error(`${path}.position must be before_char or after_char`);
	const content = requiredString(entry.content, `${path}.content`);
	return {
		keys: stringArray$2(entry.keys, `${path}.keys`),
		secondaryKeys: stringArray$2(entry.secondary_keys, `${path}.secondary_keys`),
		content,
		enabled,
		insertionOrder,
		selective: optionalBoolean$1(entry.selective, `${path}.selective`) ?? false,
		constant: optionalBoolean$1(entry.constant, `${path}.constant`) ?? false,
		caseSensitive: optionalBoolean$1(entry.case_sensitive, `${path}.case_sensitive`) ?? false,
		matchWholeWords: optionalBoolean$1(entry.match_whole_words, `${path}.match_whole_words`) ?? false,
		secondaryLogic: "and-any",
		position,
		...priority === void 0 ? {} : { priority },
		useRegex,
		hasDecorators: hasDecorator$1(content)
	};
}
function parseLorebook(value, version) {
	if (value === void 0) return void 0;
	const book = object$2(value, "data.character_book");
	object$2(book.extensions, "data.character_book.extensions");
	if (!Array.isArray(book.entries)) throw new Error("data.character_book.entries must be an array");
	const scanDepth = optionalFiniteNumber$1(book.scan_depth, "data.character_book.scan_depth");
	const tokenBudget = optionalFiniteNumber$1(book.token_budget, "data.character_book.token_budget");
	if (scanDepth !== void 0 && scanDepth < 0) throw new Error("data.character_book.scan_depth must not be negative");
	if (tokenBudget !== void 0 && tokenBudget < 0) throw new Error("data.character_book.token_budget must not be negative");
	const name = optionalString$2(book.name, "data.character_book.name");
	return {
		...name === void 0 ? {} : { name },
		...scanDepth === void 0 ? {} : { scanDepth },
		...tokenBudget === void 0 ? {} : { tokenBudget },
		recursiveScanning: optionalBoolean$1(book.recursive_scanning, "data.character_book.recursive_scanning") ?? false,
		entries: book.entries.map((entry, index) => parseLorebookEntry(entry, index, version))
	};
}
function cardVersion(root) {
	if (root.spec === "chara_card_v3") {
		const specVersion = requiredString(root.spec_version, "spec_version");
		const numeric = Number.parseFloat(specVersion);
		if (!Number.isFinite(numeric) || numeric < 3) throw new Error("spec_version must identify Character Card V3");
		return {
			version: 3,
			specVersion,
			data: object$2(root.data, "data")
		};
	}
	if (root.spec === "chara_card_v2") {
		const specVersion = requiredString(root.spec_version, "spec_version");
		if (specVersion !== "2.0") throw new Error("spec_version must be 2.0 for Character Card V2");
		return {
			version: 2,
			specVersion,
			data: object$2(root.data, "data")
		};
	}
	if (root.spec !== void 0) throw new Error(`unsupported character card spec ${JSON.stringify(root.spec)}`);
	return {
		version: 1,
		specVersion: "1.0",
		data: root
	};
}
function validateVersionFields(data, version) {
	if (version === 1) return;
	for (const field of [
		"creator_notes",
		"system_prompt",
		"post_history_instructions",
		"creator",
		"character_version"
	]) requiredString(data[field], `data.${field}`);
	stringArray$2(data.alternate_greetings, "data.alternate_greetings");
	stringArray$2(data.tags, "data.tags");
	object$2(data.extensions, "data.extensions");
	if (version === 3) stringArray$2(data.group_only_greetings, "data.group_only_greetings");
}
function degradationSet(data, version, specVersion, lorebook) {
	const result = /* @__PURE__ */ new Set();
	if (version === 3 && Number.parseFloat(specVersion) > 3) result.add("future-card-version");
	const assets = data.assets;
	if (Array.isArray(assets) && assets.length > 0) {
		result.add("character-assets");
		if (assets.some((asset) => typeof asset === "object" && asset !== null && !Array.isArray(asset) && typeof asset.uri === "string" && /^(?:https?:|data:)/iu.test(asset.uri))) result.add("remote-assets");
	}
	if (stringArray$2(data.group_only_greetings, "data.group_only_greetings").length > 0) result.add("group-greetings");
	if (lorebook?.recursiveScanning === true) result.add("lorebook-recursion");
	if (lorebook?.entries.some((entry) => entry.useRegex) === true) result.add("lorebook-regex");
	if (lorebook?.entries.some((entry) => entry.hasDecorators) === true) result.add("lorebook-decorators");
	return [...result].sort();
}
/**
* Parse one decoded Character Card JSON document.
* @param json - UTF-8 JSON text from a JSON file or PNG metadata.
* @returns a normalized runtime card plus its exact parsed JSON value.
*/
function parseCharacterCardJson(json) {
	if (Buffer.byteLength(json, "utf8") > 2097152) throw new Error(`character card JSON exceeds ${MAX_CHARACTER_CARD_JSON_BYTES} bytes`);
	let parsed;
	try {
		parsed = JSON.parse(json);
	} catch (error) {
		throw new Error("character card is not valid JSON", { cause: error });
	}
	const raw = snapshotJsonValue(parsed);
	if (raw === void 0) throw new Error("character card must contain lossless JSON");
	const { version, specVersion, data } = cardVersion(object$2(raw, "character card"));
	validateVersionFields(data, version);
	const lorebook = parseLorebook(data.character_book, version);
	const nickname = optionalString$2(data.nickname, "data.nickname");
	const alternateGreetings = stringArray$2(data.alternate_greetings, "data.alternate_greetings");
	const systemPrompt = optionalString$2(data.system_prompt, "data.system_prompt") ?? "";
	const postHistoryInstructions = optionalString$2(data.post_history_instructions, "data.post_history_instructions") ?? "";
	return {
		format: 0,
		version,
		specVersion,
		name: requiredString(data.name, "data.name"),
		...nickname === void 0 ? {} : { nickname },
		description: requiredString(data.description, "data.description"),
		personality: requiredString(data.personality, "data.personality"),
		scenario: requiredString(data.scenario, "data.scenario"),
		firstMessage: requiredString(data.first_mes, "data.first_mes"),
		messageExample: requiredString(data.mes_example, "data.mes_example"),
		alternateGreetings,
		systemPrompt,
		postHistoryInstructions,
		...lorebook === void 0 ? {} : { lorebook },
		degradations: degradationSet(data, version, specVersion, lorebook),
		raw
	};
}
/** One feature preserved from a card but deliberately not executed. */
const CHARACTER_IMPORT_DEGRADATIONS = [
	"character-assets",
	"future-card-version",
	"group-greetings",
	"lorebook-decorators",
	"lorebook-regex",
	"lorebook-recursion",
	"remote-assets"
];
/** One SillyTavern World Info feature retained in raw JSON but not executed. */
const WORLD_INFO_IMPORT_DEGRADATIONS = [
	"entry-advanced-matching",
	"entry-decorators",
	"entry-probability",
	"entry-regex",
	"entry-unsupported-position",
	"lorebook-recursion",
	"timed-effects",
	"vector-matching"
];
/** Reconstruct the normalized active card from its preserved JSON. */
function cardFromImportMeta(meta) {
	return parseCharacterCardJson(JSON.stringify(meta.raw));
}
function jsonObject$1(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value;
}
function parseResult$1(value) {
	const record = jsonObject$1(value, "import_character_card result");
	const validTransport = record.transport === "png" ? record.metadataKeyword === "ccv3" || record.metadataKeyword === "chara" : record.transport === "json" && record.metadataKeyword === void 0;
	if (record.version !== 0 || typeof record.name !== "string" || record.cardVersion !== 1 && record.cardVersion !== 2 && record.cardVersion !== 3 || typeof record.sourceEventSeq !== "number" || !Number.isSafeInteger(record.sourceEventSeq) || typeof record.sourceAttachmentId !== "string" || !validTransport || typeof record.greetingIndex !== "number" || !Number.isSafeInteger(record.greetingIndex) || record.greetingIndex < 0 || typeof record.selectedGreeting !== "string" || record.userName !== void 0 && (typeof record.userName !== "string" || record.userName.trim() === "") || !Array.isArray(record.degradations) || record.degradations.some((value) => typeof value !== "string" || !CHARACTER_IMPORT_DEGRADATIONS.includes(value))) throw new Error("import_character_card result has invalid fields");
	return record;
}
function parseMeta$1(value) {
	const meta = jsonObject$1(value, "import_character_card metadata");
	if (meta.format !== 0) throw new Error("import_character_card metadata has an unsupported format");
	const result = parseResult$1(meta.result);
	if (meta.raw === void 0) throw new Error("import_character_card metadata is missing raw card data");
	return {
		format: 0,
		result,
		raw: meta.raw
	};
}
/** Recognize one durable PNG reference usable as a Character Card transport. */
function isPngCharacterCardAttachment(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const record = value;
	return record.kind === void 0 && record.mediaType === "image/png" && typeof record.attachmentId === "string" && typeof record.bytes === "number" && typeof record.width === "number" && typeof record.height === "number";
}
/** Recognize one durable standalone JSON reference usable as a Character Card transport. */
function isJsonCharacterCardAttachment(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const record = value;
	return record.kind === "file" && typeof record.attachmentId === "string" && typeof record.bytes === "number" && typeof record.name === "string" && /\.json$/iu.test(record.name) && (record.mediaType === void 0 || typeof record.mediaType === "string");
}
function sourceAttachments$1(events, sourceEventSeq) {
	const source = events[sourceEventSeq];
	if (source?.type !== "user/message" || source.seq !== sourceEventSeq) throw new Error("import_character_card sourceEventSeq does not reference a user message");
	const direct = source.data.content.flatMap((block) => block.type === "image" && isPngCharacterCardAttachment(block.attachment) ? [block.attachment] : []);
	if (direct.length > 0) return direct;
	const sourceMeta = source.data.source.kind === "user" ? source.data.source : void 0;
	if (sourceMeta === void 0) throw new Error("import_character_card source attachment metadata is invalid");
	return (sourceMeta.attachmentConsumer === "dsh-agent-rp" && Array.isArray(sourceMeta.attachments) ? sourceMeta.attachments : []).filter((value) => isPngCharacterCardAttachment(value) || isJsonCharacterCardAttachment(value));
}
function validateImport$1(events, resultEvent) {
	const meta = parseMeta$1(resultEvent.data.meta);
	const result = meta.result;
	const card = parseCharacterCardJson(JSON.stringify(meta.raw));
	const call = resultEvent.sourceEventSeqs?.length === 1 ? events[resultEvent.sourceEventSeqs[0]] : void 0;
	if (call?.type !== "tool/call" || call.data.name !== "import_character_card" || call.seq >= resultEvent.seq || String(call.data.callId) !== String(resultEvent.data.message.content[0].toolCallId)) throw new Error("import_character_card result does not cite its direct tool call");
	let callArguments;
	try {
		callArguments = JSON.parse(call.data.arguments);
	} catch {
		throw new Error("import_character_card source call has invalid JSON arguments");
	}
	if (typeof callArguments !== "object" || callArguments === null || Array.isArray(callArguments)) throw new Error("import_character_card source call has invalid arguments");
	const args = callArguments;
	if ((args.greetingIndex ?? 0) !== result.greetingIndex) throw new Error("import_character_card greeting does not match its source call");
	if (result.sourceEventSeq >= call.seq) throw new Error("import_character_card source attachment does not precede its tool call");
	const attachmentIndex = args.attachmentIndex ?? 0;
	if (typeof attachmentIndex !== "number" || !Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0) throw new Error("import_character_card source call has an invalid attachmentIndex");
	const attachment = sourceAttachments$1(events, result.sourceEventSeq)[attachmentIndex];
	if (attachment === void 0 || String(attachment.attachmentId) !== result.sourceAttachmentId) throw new Error("import_character_card source attachment is absent from its user message");
	if (result.transport === "png" && !isPngCharacterCardAttachment(attachment)) throw new Error("import_character_card PNG transport does not match its source attachment");
	if (result.transport === "json" && !isJsonCharacterCardAttachment(attachment)) throw new Error("import_character_card JSON transport does not match its source attachment");
	const expectedGreeting = [card.firstMessage, ...card.alternateGreetings][result.greetingIndex];
	if (result.name !== card.name || result.cardVersion !== card.version || result.selectedGreeting !== expectedGreeting || JSON.stringify(result.degradations) !== JSON.stringify(card.degradations)) throw new Error("import_character_card result summary does not match durable card metadata");
	return {
		result,
		meta: {
			...meta,
			raw: card.raw
		}
	};
}
/**
* Find and validate the last successful character import in one Session.
* @param events - complete chronological Session history.
* @returns the active imported character, or undefined before the first import.
*/
function readActiveSessionCharacter(events) {
	let active;
	for (const event of events) {
		if (event.type === "agent-rp/character-card-seed") {
			const attachment = event.data.source.attachments[0];
			const meta = parseMeta$1(event.data.meta);
			const result = meta.result;
			const card = parseCharacterCardJson(JSON.stringify(meta.raw));
			const expectedGreeting = [card.firstMessage, ...card.alternateGreetings][result.greetingIndex];
			const validTransport = result.transport === "json" ? isJsonCharacterCardAttachment(attachment) : isPngCharacterCardAttachment(attachment);
			if (event.data.format !== 0 || event.data.source.attachmentConsumer !== "dsh-agent-rp" || !validTransport || result.sourceEventSeq !== event.seq || result.sourceAttachmentId !== String(attachment.attachmentId) || result.name !== card.name || result.cardVersion !== card.version || result.selectedGreeting !== expectedGreeting || JSON.stringify(result.degradations) !== JSON.stringify(card.degradations)) throw new Error("agent-rp/character-card-seed has invalid provenance");
			active = {
				result,
				meta: {
					...meta,
					raw: card.raw
				}
			};
			continue;
		}
		if (event.type !== "tool/result" || event.data.message.content[0].isError === true) continue;
		const callId = String(event.data.message.content[0].toolCallId);
		const call = events.find((candidate) => candidate.type === "tool/call" && String(candidate.data.callId) === callId);
		if (call?.type !== "tool/call" || call.data.name !== "import_character_card") continue;
		active = validateImport$1(events, event);
	}
	return active;
}
/**
* Build the canonical import summary associated with its source attachment.
* @param card - parsed Character Card.
* @param transport - transport and PNG metadata provenance for the selected card.
* @param sourceEventSeq - exact user message carrying the attachment.
* @param attachment - matching durable attachment reference.
* @param greetingIndex - zero-based selected greeting, with zero naming `first_mes`.
* @returns a compact canonical tool result.
*/
function prepareCharacterImportResult(card, transport, sourceEventSeq, attachment, greetingIndex, userName) {
	if (!Number.isSafeInteger(greetingIndex) || greetingIndex < 0) throw new Error("greetingIndex must be a non-negative integer");
	const selectedGreeting = [card.firstMessage, ...card.alternateGreetings][greetingIndex];
	if (selectedGreeting === void 0) throw new Error(`greetingIndex ${greetingIndex} is unavailable for this character card`);
	return {
		version: 0,
		name: card.name,
		cardVersion: card.version,
		sourceEventSeq,
		sourceAttachmentId: String(attachment.attachmentId),
		transport: transport.transport,
		...transport.transport === "png" ? { metadataKeyword: transport.metadataKeyword } : {},
		greetingIndex,
		selectedGreeting,
		...userName === void 0 || userName.trim() === "" ? {} : { userName: userName.trim() },
		degradations: [...card.degradations],
		raw: card.raw
	};
}
/** Model-free Character Card import into a native roleplay Session. */
/**
* Build a native Session that activates one Character Card and opens with its selected greeting.
* @param card - parsed lossless Character Card.
* @param attachment - Host-stored original card attachment.
* @param greetingIndex - selected first or alternate greeting.
* @param renderedGreeting - selected greeting after stable identity macro substitution.
* @param transport - JSON or decoded PNG provenance.
* @param userName - optional imported user identity for card macros.
* @returns validated immutable Session seed.
*/
function createCharacterCardSessionSeed(card, attachment, greetingIndex, renderedGreeting, transport = { transport: "json" }, userName) {
	const { raw, ...result } = prepareCharacterImportResult(card, transport, 0, attachment, greetingIndex, userName);
	const meta = {
		format: 0,
		result,
		raw
	};
	const time = Date.now();
	const events = [{
		type: "agent-rp/character-card-seed",
		seq: 0,
		time,
		data: {
			format: 0,
			source: {
				attachmentConsumer: "dsh-agent-rp",
				attachments: [attachment]
			},
			meta
		},
		ignorable: true
	}];
	if (renderedGreeting.trim() !== "") {
		const push = (event) => {
			events.push({
				...event,
				seq: events.length
			});
		};
		push({
			type: "turn/start",
			time: time + 1,
			data: { turn: 1 }
		});
		push({
			type: "step/start",
			time: time + 1,
			data: {
				turn: 1,
				step: 1
			}
		});
		push({
			type: "assistant/message",
			time: time + 1,
			data: {
				turn: 1,
				step: 1,
				message: createAssistantMessage({
					content: [{
						type: "text",
						text: renderedGreeting
					}],
					source: {
						provider: "agent-rp-import",
						model: "character-card"
					}
				})
			},
			surfaceOp: "append"
		});
		push({
			type: "step/end",
			time: time + 1,
			data: {
				turn: 1,
				step: 1
			}
		});
		push({
			type: "turn/end",
			time: time + 1,
			data: {
				turn: 1,
				reason: { kind: "completed" }
			}
		});
	}
	return Object.freeze(Session.create(SessionId("agent-rp-character-card-import-validation"), events).events.slice(0, events.length));
}
var require_crc32 = /* @__PURE__ */ __commonJSMin(((exports) => {
	(function(factory) {
		if (typeof DO_NOT_EXPORT_CRC === "undefined") if ("object" === typeof exports) factory(exports);
		else if ("function" === typeof define && define.amd) define(function() {
			var module$1 = {};
			factory(module$1);
			return module$1;
		});
		else factory({});
		else factory({});
	})(function(CRC32) {
		CRC32.version = "0.3.0";
		function signed_crc_table() {
			var c = 0, table = new Array(256);
			for (var n = 0; n != 256; ++n) {
				c = n;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
				table[n] = c;
			}
			return typeof Int32Array !== "undefined" ? new Int32Array(table) : table;
		}
		var table = signed_crc_table();
		var use_buffer = typeof Buffer !== "undefined";
		function crc32_bstr(bstr) {
			if (bstr.length > 32768) {
				if (use_buffer) return crc32_buf_8(new Buffer(bstr));
			}
			var crc = -1, L = bstr.length - 1;
			for (var i = 0; i < L;) {
				crc = table[(crc ^ bstr.charCodeAt(i++)) & 255] ^ crc >>> 8;
				crc = table[(crc ^ bstr.charCodeAt(i++)) & 255] ^ crc >>> 8;
			}
			if (i === L) crc = crc >>> 8 ^ table[(crc ^ bstr.charCodeAt(i)) & 255];
			return crc ^ -1;
		}
		function crc32_buf(buf) {
			if (buf.length > 1e4) return crc32_buf_8(buf);
			for (var crc = -1, i = 0, L = buf.length - 3; i < L;) {
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
			}
			while (i < L + 3) crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
			return crc ^ -1;
		}
		function crc32_buf_8(buf) {
			for (var crc = -1, i = 0, L = buf.length - 7; i < L;) {
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
				crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
			}
			while (i < L + 7) crc = crc >>> 8 ^ table[(crc ^ buf[i++]) & 255];
			return crc ^ -1;
		}
		function crc32_str(str) {
			for (var crc = -1, i = 0, L = str.length, c, d; i < L;) {
				c = str.charCodeAt(i++);
				if (c < 128) crc = crc >>> 8 ^ table[(crc ^ c) & 255];
				else if (c < 2048) {
					crc = crc >>> 8 ^ table[(crc ^ (192 | c >> 6 & 31)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | c & 63)) & 255];
				} else if (c >= 55296 && c < 57344) {
					c = (c & 1023) + 64;
					d = str.charCodeAt(i++) & 1023;
					crc = crc >>> 8 ^ table[(crc ^ (240 | c >> 8 & 7)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | c >> 2 & 63)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | d >> 6 & 15 | c & 3)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | d & 63)) & 255];
				} else {
					crc = crc >>> 8 ^ table[(crc ^ (224 | c >> 12 & 15)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | c >> 6 & 63)) & 255];
					crc = crc >>> 8 ^ table[(crc ^ (128 | c & 63)) & 255];
				}
			}
			return crc ^ -1;
		}
		CRC32.table = table;
		CRC32.bstr = crc32_bstr;
		CRC32.buf = crc32_buf;
		CRC32.str = crc32_str;
	});
}));
var require_png_chunks_extract = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var crc32 = require_crc32();
	module.exports = extractChunks;
	var uint8 = /* @__PURE__ */ new Uint8Array(4);
	var int32 = new Int32Array(uint8.buffer);
	var uint32 = new Uint32Array(uint8.buffer);
	function extractChunks(data) {
		if (data[0] !== 137) throw new Error("Invalid .png file header");
		if (data[1] !== 80) throw new Error("Invalid .png file header");
		if (data[2] !== 78) throw new Error("Invalid .png file header");
		if (data[3] !== 71) throw new Error("Invalid .png file header");
		if (data[4] !== 13) throw new Error("Invalid .png file header: possibly caused by DOS-Unix line ending conversion?");
		if (data[5] !== 10) throw new Error("Invalid .png file header: possibly caused by DOS-Unix line ending conversion?");
		if (data[6] !== 26) throw new Error("Invalid .png file header");
		if (data[7] !== 10) throw new Error("Invalid .png file header: possibly caused by DOS-Unix line ending conversion?");
		var ended = false;
		var chunks = [];
		var idx = 8;
		while (idx < data.length) {
			uint8[3] = data[idx++];
			uint8[2] = data[idx++];
			uint8[1] = data[idx++];
			uint8[0] = data[idx++];
			var length = uint32[0] + 4;
			var chunk = new Uint8Array(length);
			chunk[0] = data[idx++];
			chunk[1] = data[idx++];
			chunk[2] = data[idx++];
			chunk[3] = data[idx++];
			var name = String.fromCharCode(chunk[0]) + String.fromCharCode(chunk[1]) + String.fromCharCode(chunk[2]) + String.fromCharCode(chunk[3]);
			if (!chunks.length && name !== "IHDR") throw new Error("IHDR header missing");
			if (name === "IEND") {
				ended = true;
				chunks.push({
					name,
					data: /* @__PURE__ */ new Uint8Array(0)
				});
				break;
			}
			for (var i = 4; i < length; i++) chunk[i] = data[idx++];
			uint8[3] = data[idx++];
			uint8[2] = data[idx++];
			uint8[1] = data[idx++];
			uint8[0] = data[idx++];
			var crcActual = int32[0];
			if (crc32.buf(chunk) !== crcActual) throw new Error("CRC values for " + name + " header do not match, PNG file is likely corrupted");
			var chunkData = new Uint8Array(chunk.buffer.slice(4));
			chunks.push({
				name,
				data: chunkData
			});
		}
		if (!ended) throw new Error(".png file ended prematurely: no IEND header was found");
		return chunks;
	}
}));
var require_encode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = encode;
	function encode(keyword, content) {
		keyword = String(keyword);
		content = String(content);
		if (!/^[\x00-\xFF]+$/.test(keyword) || !/^[\x00-\xFF]+$/.test(content)) throw new Error("Only Latin-1 characters are permitted in PNG tEXt chunks. You might want to consider base64 encoding and/or zEXt compression");
		if (keyword.length >= 80) throw new Error("Keyword \"" + keyword + "\" is longer than the 79-character limit imposed by the PNG specification");
		var totalSize = keyword.length + content.length + 1;
		var output = new Uint8Array(totalSize);
		var idx = 0;
		var code;
		for (var i = 0; i < keyword.length; i++) {
			if (!(code = keyword.charCodeAt(i))) throw new Error("0x00 character is not permitted in tEXt keywords");
			output[idx++] = code;
		}
		output[idx++] = 0;
		for (var j = 0; j < content.length; j++) {
			if (!(code = content.charCodeAt(j))) throw new Error("0x00 character is not permitted in tEXt content");
			output[idx++] = code;
		}
		return {
			name: "tEXt",
			data: output
		};
	}
}));
var require_decode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = decode;
	function decode(data) {
		if (data.data && data.name) data = data.data;
		var naming = true;
		var text = "";
		var name = "";
		for (var i = 0; i < data.length; i++) {
			var code = data[i];
			if (naming) if (code) name += String.fromCharCode(code);
			else naming = false;
			else if (code) text += String.fromCharCode(code);
			else throw new Error("Invalid NULL character found. 0x00 character is not permitted in tEXt content");
		}
		return {
			keyword: name,
			text
		};
	}
}));
var require_png_chunk_text = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.encode = require_encode();
	exports.decode = require_decode();
}));
/** Character Card PNG tEXt transport decoder. */
var import_png_chunks_extract = /* @__PURE__ */ __toESM(require_png_chunks_extract(), 1);
var import_png_chunk_text = require_png_chunk_text();
const PNG_SIGNATURE = Buffer$1.from([
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
]);
function preflightChunks(data) {
	let offset = PNG_SIGNATURE.byteLength;
	let ended = false;
	while (offset < data.byteLength) {
		if (data.byteLength - offset < 12) throw new Error("character card PNG has a truncated chunk");
		const length = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0);
		const end = offset + 12 + length;
		if (!Number.isSafeInteger(end) || end > data.byteLength) throw new Error("character card PNG has an invalid chunk length");
		const name = Buffer$1.from(data.subarray(offset + 4, offset + 8)).toString("ascii");
		offset = end;
		if (name === "IEND") {
			ended = true;
			break;
		}
	}
	if (!ended) throw new Error("character card PNG has no IEND chunk");
}
function decodeBase64(value, keyword) {
	if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) throw new Error(`${keyword} PNG metadata is not canonical base64`);
	const bytes = Buffer$1.from(value, "base64");
	if (bytes.byteLength > 2097152) throw new Error(`decoded ${keyword} card exceeds ${MAX_CHARACTER_CARD_JSON_BYTES} bytes`);
	if (bytes.toString("base64") !== value) throw new Error(`${keyword} PNG metadata is not canonical base64`);
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch (error) {
		throw new Error(`${keyword} PNG metadata is not valid UTF-8`, { cause: error });
	}
}
/**
* Extract the preferred card payload from one verified PNG attachment.
* @param data - complete PNG bytes read from the attachment store.
* @returns decoded JSON text, preferring `ccv3` over `chara`.
*/
function readCharacterCardPng(data) {
	const bytes = Buffer$1.from(data);
	if (bytes.byteLength < PNG_SIGNATURE.byteLength || !bytes.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) throw new Error("character card attachment is not a PNG");
	let chunks;
	try {
		preflightChunks(bytes);
		chunks = (0, import_png_chunks_extract.default)(bytes);
	} catch (error) {
		throw new Error("character card PNG is malformed", { cause: error });
	}
	const payloads = /* @__PURE__ */ new Map();
	for (const chunk of chunks) {
		if (chunk.name !== "tEXt") continue;
		let decoded;
		try {
			decoded = (0, import_png_chunk_text.decode)(chunk.data);
		} catch (error) {
			throw new Error("character card PNG contains malformed text metadata", { cause: error });
		}
		const keyword = decoded.keyword.toLowerCase();
		if ((keyword === "ccv3" || keyword === "chara") && !payloads.has(keyword)) payloads.set(keyword, decoded.text);
	}
	for (const keyword of ["ccv3", "chara"]) {
		const payload = payloads.get(keyword);
		if (payload !== void 0) return {
			keyword,
			json: decodeBase64(payload, keyword)
		};
	}
	throw new Error("PNG does not contain ccv3 or chara character metadata");
}
/** Standalone SillyTavern World Info JSON parser with inert advanced behavior. */
/** Maximum decoded JSON accepted from one standalone World Info file. */
const MAX_WORLD_INFO_JSON_BYTES = 2 * 1024 * 1024;
function object$1(value, path) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
	return value;
}
function optionalString$1(value, path) {
	if (value === void 0) return void 0;
	if (typeof value !== "string") throw new Error(`${path} must be a string`);
	return value;
}
function boolean(value, path, fallback) {
	if (value === void 0 || value === null) return fallback;
	if (typeof value !== "boolean") throw new Error(`${path} must be a boolean or null`);
	return value;
}
function finiteNumber(value, path, fallback) {
	if (value === void 0 || value === null) return fallback;
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number or null`);
	return value;
}
function optionalFiniteNumber(value, path) {
	if (value === void 0 || value === null) return void 0;
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} must be a finite number or null`);
	return value;
}
function stringArray$1(value, path) {
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${path} must be an array of strings`);
	return [...value];
}
function hasDecorator(content) {
	return /(?:^|\n)@@@?[a-z_]+(?:\s|$)/imu.test(content);
}
function isDelimitedRegex(key) {
	return /^\/[\s\S]+\/[gimsuy]*$/u.test(key);
}
function hasAdvancedMatching(entry) {
	const filter = entry.characterFilter;
	return entry.matchPersonaDescription === true || entry.matchCharacterDescription === true || entry.matchCharacterPersonality === true || entry.matchCharacterDepthPrompt === true || entry.matchScenario === true || entry.matchCreatorNotes === true || typeof filter === "object" && filter !== null && Object.keys(filter).length > 0;
}
function secondaryLogic(value, path) {
	if (value === 0) return "and-any";
	if (value === 1) return "not-all";
	if (value === 2) return "not-any";
	if (value === 3) return "and-all";
	throw new Error(`${path} must be 0, 1, 2, or 3`);
}
function parseEntry(value, id, degradations) {
	const path = `entries.${id}`;
	const entry = object$1(value, path);
	const keys = stringArray$1(entry.key, `${path}.key`);
	const secondaryKeys = stringArray$1(entry.keysecondary, `${path}.keysecondary`);
	const content = optionalString$1(entry.content, `${path}.content`) ?? "";
	const position = finiteNumber(entry.position, `${path}.position`, 0);
	const probability = finiteNumber(entry.probability, `${path}.probability`, 100);
	const usesProbability = boolean(entry.useProbability, `${path}.useProbability`, true) && probability < 100;
	const advancedMatching = hasAdvancedMatching(entry);
	const vectorized = entry.vectorized === true;
	const timed = entry.sticky !== void 0 && entry.sticky !== null || entry.cooldown !== void 0 && entry.cooldown !== null || entry.delay !== void 0 && entry.delay !== null;
	const recursive = entry.excludeRecursion === true || entry.preventRecursion === true || entry.delayUntilRecursion === true;
	const useRegex = [...keys, ...secondaryKeys].some(isDelimitedRegex);
	const decorated = hasDecorator(content);
	const supportedPosition = position === 0 || position === 1;
	if (useRegex) degradations.add("entry-regex");
	if (decorated) degradations.add("entry-decorators");
	if (!supportedPosition) degradations.add("entry-unsupported-position");
	if (usesProbability) degradations.add("entry-probability");
	if (advancedMatching) degradations.add("entry-advanced-matching");
	if (vectorized) degradations.add("vector-matching");
	if (timed) degradations.add("timed-effects");
	if (recursive) degradations.add("lorebook-recursion");
	const scanDepth = optionalFiniteNumber(entry.scanDepth, `${path}.scanDepth`);
	if (scanDepth !== void 0 && scanDepth < 0) throw new Error(`${path}.scanDepth must not be negative`);
	return {
		keys,
		secondaryKeys,
		content,
		enabled: !boolean(entry.disable, `${path}.disable`, false) && supportedPosition && !usesProbability && !advancedMatching && !vectorized && !timed && !recursive,
		insertionOrder: finiteNumber(entry.order, `${path}.order`, 100),
		selective: boolean(entry.selective, `${path}.selective`, secondaryKeys.length > 0),
		constant: boolean(entry.constant, `${path}.constant`, false),
		caseSensitive: boolean(entry.caseSensitive, `${path}.caseSensitive`, false),
		matchWholeWords: boolean(entry.matchWholeWords, `${path}.matchWholeWords`, false),
		secondaryLogic: secondaryLogic(finiteNumber(entry.selectiveLogic, `${path}.selectiveLogic`, 0), `${path}.selectiveLogic`),
		...scanDepth === void 0 ? {} : { scanDepth },
		position: position === 0 ? "before_char" : "after_char",
		useRegex,
		hasDecorators: decorated
	};
}
/** Decode one standalone World Info JSON file without replacement characters. */
function parseWorldInfoJsonBytes(data) {
	let json;
	try {
		json = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^\uFEFF/u, "");
	} catch (error) {
		throw new Error("World Info JSON must be valid UTF-8", { cause: error });
	}
	return parseWorldInfoJson(json);
}
/**
* Parse one SillyTavern World Info JSON document.
* @param json - UTF-8 JSON text from a standalone file.
* @returns normalized literal-key lore plus exact parsed JSON.
*/
function parseWorldInfoJson(json) {
	if (Buffer.byteLength(json, "utf8") > 2097152) throw new Error(`World Info JSON exceeds ${MAX_WORLD_INFO_JSON_BYTES} bytes`);
	let parsed;
	try {
		parsed = JSON.parse(json);
	} catch (error) {
		throw new Error("World Info is not valid JSON", { cause: error });
	}
	const raw = snapshotJsonValue(parsed);
	if (raw === void 0) throw new Error("World Info must contain lossless JSON");
	const root = object$1(raw, "World Info");
	const entries = root.entries;
	if (typeof entries !== "object" || entries === null) throw new Error("World Info entries must be an object or array");
	const values = Array.isArray(entries) ? entries.map((entry, index) => [String(index), entry]) : Object.entries(entries);
	const degradations = /* @__PURE__ */ new Set();
	const lorebookEntries = values.map(([id, entry]) => parseEntry(entry, id, degradations));
	const name = optionalString$1(root.name, "World Info name");
	return {
		format: 0,
		...name === void 0 ? {} : { name },
		lorebook: {
			recursiveScanning: false,
			entries: lorebookEntries
		},
		degradations: [...degradations].sort(),
		raw
	};
}
/** Strict, lossless parser for exported SillyTavern JSONL chats. */
/** Maximum UTF-8 input accepted as one SillyTavern chat export. */
const MAX_SILLYTAVERN_CHAT_BYTES = 32 * 1024 * 1024;
function object(value, path) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
	return value;
}
function optionalString(value, path) {
	if (value === void 0) return void 0;
	if (typeof value !== "string") throw new Error(`${path} must be a string`);
	return value;
}
function optionalBoolean(value, path) {
	if (value === void 0) return false;
	if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
	return value;
}
function optionalObject(value, path) {
	if (value === void 0) return void 0;
	return object(value, path);
}
function stringArray(value, path) {
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${path} must be an array of strings`);
	return [...value];
}
function optionalNonNegativeInteger(value, path) {
	if (value === void 0) return void 0;
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${path} must be a non-negative safe integer`);
	return value;
}
function parseLine(line, lineNumber) {
	let parsed;
	try {
		parsed = JSON.parse(line);
	} catch (error) {
		throw new Error(`SillyTavern chat line ${lineNumber} is not valid JSON`, { cause: error });
	}
	const raw = snapshotJsonValue(parsed);
	if (raw === void 0) throw new Error(`SillyTavern chat line ${lineNumber} must contain lossless JSON`);
	return raw;
}
function parseHeader(raw, line) {
	const header = object(raw, `SillyTavern chat line ${line}`);
	const metadata = header.chat_metadata;
	if (metadata === void 0) throw new Error(`SillyTavern chat line ${line} must be the chat header with chat_metadata`);
	object(metadata, `SillyTavern chat line ${line}.chat_metadata`);
	const userName = optionalString(header.user_name, `SillyTavern chat line ${line}.user_name`);
	const characterName = optionalString(header.character_name, `SillyTavern chat line ${line}.character_name`);
	return {
		...userName === void 0 ? {} : { userName },
		...characterName === void 0 ? {} : { characterName },
		...header.create_date === void 0 ? {} : { createDate: header.create_date },
		chatMetadata: metadata,
		raw
	};
}
function parseMessage(raw, line) {
	const path = `SillyTavern chat line ${line}`;
	const message = object(raw, path);
	const text = optionalString(message.mes, `${path}.mes`);
	if (text === void 0) throw new Error(`${path}.mes must be a string`);
	const name = optionalString(message.name, `${path}.name`);
	const isUser = optionalBoolean(message.is_user, `${path}.is_user`);
	const isSystem = optionalBoolean(message.is_system, `${path}.is_system`);
	if (isUser && isSystem) throw new Error(`${path} cannot be both a user and system message`);
	const extra = optionalObject(message.extra, `${path}.extra`);
	const narrator = extra?.type === "narrator";
	const swipes = stringArray(message.swipes, `${path}.swipes`);
	const swipeId = optionalNonNegativeInteger(message.swipe_id, `${path}.swipe_id`);
	if (swipeId !== void 0 && swipeId >= swipes.length) throw new Error(`${path}.swipe_id ${swipeId} is outside ${swipes.length} swipe(s)`);
	const kind = narrator ? "narrator" : isUser ? "user" : isSystem ? "system" : "assistant";
	return {
		line,
		...name === void 0 ? {} : { name },
		text,
		kind,
		swipes,
		...swipeId === void 0 ? {} : { swipeId },
		...extra === void 0 ? {} : { extra },
		raw
	};
}
/** Decode one SillyTavern JSONL chat without replacement characters. */
function parseSillyTavernChatBytes(data) {
	if (data.byteLength > 33554432) throw new Error(`SillyTavern chat exceeds ${MAX_SILLYTAVERN_CHAT_BYTES} bytes`);
	let jsonl;
	try {
		jsonl = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^\uFEFF/u, "");
	} catch (error) {
		throw new Error("SillyTavern chat must be valid UTF-8", { cause: error });
	}
	return parseSillyTavernChat(jsonl);
}
/**
* Parse one SillyTavern JSONL chat while retaining every source row.
* @param jsonl - decoded JSONL text from a SillyTavern export.
* @returns the header and ordered chat messages; ordinary system rows remain inert.
*/
function parseSillyTavernChat(jsonl) {
	if (Buffer.byteLength(jsonl, "utf8") > 33554432) throw new Error(`SillyTavern chat exceeds ${MAX_SILLYTAVERN_CHAT_BYTES} bytes`);
	const rows = jsonl.split(/\r?\n/u).map((text, index) => ({
		text,
		line: index + 1
	})).filter((row) => row.text.trim().length > 0);
	const first = rows[0];
	if (first === void 0) throw new Error("SillyTavern chat is empty");
	return {
		format: 0,
		header: parseHeader(parseLine(first.text, first.line), first.line),
		messages: rows.slice(1).map((row) => parseMessage(parseLine(row.text, row.line), row.line))
	};
}
/** Convert a parsed SillyTavern chat into validated DSH Session history. */
function usableIdentityName(value) {
	const name = value?.trim();
	return name === void 0 || name === "" || name.toLowerCase() === "unused" ? void 0 : name;
}
/** Recover names from current SillyTavern exports whose legacy header names are `unused`. */
function resolveSillyTavernChatIdentity(chat) {
	const characterName = usableIdentityName(chat.header.characterName) ?? chat.messages.find((message) => message.kind === "assistant" && usableIdentityName(message.name) !== void 0)?.name?.trim();
	const userName = usableIdentityName(chat.header.userName) ?? chat.messages.find((message) => message.kind === "user" && usableIdentityName(message.name) !== void 0)?.name?.trim();
	return {
		...characterName === void 0 ? {} : { characterName },
		...userName === void 0 ? {} : { userName }
	};
}
function eventTime(message, fallback) {
	if (typeof message.raw !== "object" || message.raw === null || Array.isArray(message.raw)) return fallback;
	const date = message.raw.send_date;
	if (typeof date === "number" && Number.isSafeInteger(date) && date >= 0) return date;
	if (typeof date !== "string") return fallback;
	const parsed = Date.parse(date);
	return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
function metadata(chat, attachment) {
	return {
		format: 0,
		source: {
			attachmentConsumer: "dsh-agent-rp",
			attachments: [attachment]
		},
		header: chat.header.raw,
		messages: chat.messages.map((message) => ({
			line: message.line,
			kind: message.kind,
			...message.name === void 0 ? {} : { name: message.name },
			swipes: message.swipes,
			...message.swipeId === void 0 ? {} : { swipeId: message.swipeId },
			...message.extra === void 0 ? {} : { extra: message.extra }
		}))
	};
}
/**
* Read the latest usable character identity attached to an imported chat Session.
* @param events - current Session history.
* @returns imported character and optional user names, when the chat header names a character.
*/
function readSillyTavernChatIdentity(events) {
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		if (event?.type !== "agent-rp/sillytavern-chat-import") continue;
		const header = event.data.header;
		if (typeof header !== "object" || header === null || Array.isArray(header)) return void 0;
		const headerCharacterName = typeof header.character_name === "string" ? header.character_name : void 0;
		const headerUserName = typeof header.user_name === "string" ? header.user_name : void 0;
		const characterName = usableIdentityName(headerCharacterName) ?? event.data.messages.find((message) => message.kind === "assistant" && usableIdentityName(message.name) !== void 0)?.name?.trim();
		if (characterName === void 0) return void 0;
		const userName = usableIdentityName(headerUserName) ?? event.data.messages.find((message) => message.kind === "user" && usableIdentityName(message.name) !== void 0)?.name?.trim();
		return {
			characterName,
			...userName === void 0 ? {} : { userName }
		};
	}
}
function appendMessageEvents(events, message, turn, time) {
	const push = (event) => {
		events.push({
			...event,
			seq: events.length
		});
	};
	push({
		type: "turn/start",
		time,
		data: { turn }
	});
	push({
		type: "step/start",
		time,
		data: {
			turn,
			step: 1
		}
	});
	if (message.kind === "assistant") push({
		type: "assistant/message",
		time,
		data: {
			turn,
			step: 1,
			message: createAssistantMessage({
				content: [{
					type: "text",
					text: message.text
				}],
				source: {
					provider: "sillytavern-import",
					model: "history"
				}
			})
		},
		surfaceOp: "append"
	});
	else push({
		type: "user/message",
		time,
		data: createUserMessage({
			content: [{
				type: "text",
				text: message.text
			}],
			source: message.kind === "user" ? { kind: "user" } : {
				kind: "plugin",
				plugin: "dsh-agent-rp",
				form: "recall"
			}
		}),
		surfaceOp: "append"
	});
	push({
		type: "step/end",
		time,
		data: {
			turn,
			step: 1
		}
	});
	push({
		type: "turn/end",
		time,
		data: {
			turn,
			reason: { kind: "completed" }
		}
	});
}
/**
* Build a balanced Session seed from one parsed SillyTavern chat.
* @param chat - validated lossless JSONL projection.
* @param attachment - Host-stored original JSONL file owned by the imported Session.
* @returns a frozen seed accepted by the native Session constructor.
*/
function createSillyTavernChatSeed(chat, attachment) {
	if (!/\.jsonl$/iu.test(attachment.name)) throw new Error("SillyTavern chat source must be a .jsonl file");
	const events = [{
		type: "agent-rp/sillytavern-chat-import",
		seq: 0,
		time: Date.now(),
		data: metadata(chat, attachment),
		ignorable: true
	}];
	let turn = 0;
	let fallbackTime = events[0].time;
	for (const message of chat.messages) {
		if (message.kind === "system" || message.text.length === 0) continue;
		turn += 1;
		fallbackTime += 1;
		appendMessageEvents(events, message, turn, eventTime(message, fallbackTime));
	}
	const validated = Session.create(SessionId("agent-rp-sillytavern-import-validation"), events);
	return Object.freeze(validated.events.slice(0, events.length));
}
/** One-shot SillyTavern character and chat migration. */
/**
* Build one Session from a Character Card JSON and its SillyTavern chat export.
* @param card - parsed Character Card identity.
* @param cardAttachment - stored card JSON or PNG.
* @param cardTransport - decoded card transport metadata.
* @param chat - parsed SillyTavern chat history.
* @param chatAttachment - stored chat JSONL.
* @returns one validated seed with imported history and active card identity.
*/
function createSillyTavernMigrationSeed(card, cardAttachment, cardTransport, chat, chatAttachment) {
	const events = [...createSillyTavernChatSeed(chat, chatAttachment)];
	const cardEvent = createCharacterCardSessionSeed(card, cardAttachment, 0, "", cardTransport, resolveSillyTavernChatIdentity(chat).userName)[0];
	if (cardEvent?.type !== "agent-rp/character-card-seed") throw new Error("Character Card seed is missing");
	const seq = events.length;
	events.push({
		...cardEvent,
		seq,
		time: Math.max(Date.now(), events.at(-1)?.time ?? 0),
		data: {
			...cardEvent.data,
			meta: {
				...cardEvent.data.meta,
				result: {
					...cardEvent.data.meta.result,
					sourceEventSeq: seq
				}
			}
		}
	});
	const validated = Session.create(SessionId("agent-rp-sillytavern-migration-validation"), events);
	return Object.freeze(validated.events.slice(0, events.length));
}
function jsonObject(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value;
}
function parseResult(value) {
	const record = jsonObject(value, "import_world_info result");
	if (record.version !== 0 || typeof record.name !== "string" || record.name.trim().length === 0 || typeof record.sourceEventSeq !== "number" || !Number.isSafeInteger(record.sourceEventSeq) || typeof record.sourceAttachmentId !== "string" || typeof record.entryCount !== "number" || !Number.isSafeInteger(record.entryCount) || record.entryCount < 0 || !Array.isArray(record.degradations) || record.degradations.some((value) => typeof value !== "string" || !WORLD_INFO_IMPORT_DEGRADATIONS.includes(value))) throw new Error("import_world_info result has invalid fields");
	return record;
}
function parseMeta(value) {
	const meta = jsonObject(value, "import_world_info metadata");
	if (meta.format !== 0) throw new Error("import_world_info metadata has an unsupported format");
	const result = parseResult(meta.result);
	if (meta.raw === void 0) throw new Error("import_world_info metadata is missing raw data");
	return {
		format: 0,
		result,
		raw: meta.raw
	};
}
/** Recognize one standalone JSON file usable as a World Info transport. */
function isJsonWorldInfoAttachment(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const record = value;
	return record.kind === "file" && typeof record.attachmentId === "string" && typeof record.bytes === "number" && typeof record.name === "string" && /\.json$/iu.test(record.name) && (record.mediaType === void 0 || typeof record.mediaType === "string");
}
function sourceAttachments(events, sourceEventSeq) {
	const source = events[sourceEventSeq];
	if (source?.type !== "user/message" || source.seq !== sourceEventSeq || source.data.source.kind !== "user") throw new Error("import_world_info sourceEventSeq does not reference a user message");
	const sourceMeta = source.data.source;
	return (sourceMeta.attachmentConsumer === "dsh-agent-rp" && Array.isArray(sourceMeta.attachments) ? sourceMeta.attachments : []).filter(isJsonWorldInfoAttachment);
}
function validateImport(events, resultEvent) {
	const meta = parseMeta(resultEvent.data.meta);
	const result = meta.result;
	const worldInfo = parseWorldInfoJson(JSON.stringify(meta.raw));
	const call = resultEvent.sourceEventSeqs?.length === 1 ? events[resultEvent.sourceEventSeqs[0]] : void 0;
	if (call?.type !== "tool/call" || call.data.name !== "import_world_info" || call.seq >= resultEvent.seq || String(call.data.callId) !== String(resultEvent.data.message.content[0].toolCallId)) throw new Error("import_world_info result does not cite its direct tool call");
	let callArguments;
	try {
		callArguments = JSON.parse(call.data.arguments);
	} catch {
		throw new Error("import_world_info source call has invalid JSON arguments");
	}
	if (typeof callArguments !== "object" || callArguments === null || Array.isArray(callArguments)) throw new Error("import_world_info source call has invalid arguments");
	const attachmentIndex = callArguments.attachmentIndex ?? 0;
	if (typeof attachmentIndex !== "number" || !Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0) throw new Error("import_world_info source call has an invalid attachmentIndex");
	if (result.sourceEventSeq >= call.seq) throw new Error("import_world_info source attachment does not precede its tool call");
	const attachment = sourceAttachments(events, result.sourceEventSeq)[attachmentIndex];
	if (attachment === void 0 || String(attachment.attachmentId) !== result.sourceAttachmentId) throw new Error("import_world_info source attachment is absent from its user message");
	const name = worldInfo.name?.trim() || attachment.name.replace(/\.json$/iu, "");
	if (result.name !== name || result.entryCount !== worldInfo.lorebook.entries.length || JSON.stringify(result.degradations) !== JSON.stringify(worldInfo.degradations)) throw new Error("import_world_info result summary does not match durable metadata");
	return {
		result,
		meta: {
			...meta,
			raw: worldInfo.raw
		},
		worldInfo
	};
}
/**
* Find and validate active standalone World Info books in one Session.
* @param events - complete chronological Session history.
* @returns successful imports in log order, with a repeated attachment replacing its prior import.
*/
function readActiveSessionWorldInfos(events) {
	const active = /* @__PURE__ */ new Map();
	for (const event of events) {
		if (event.type !== "tool/result" || event.data.message.content[0].isError === true) continue;
		const callId = String(event.data.message.content[0].toolCallId);
		const call = events.find((candidate) => candidate.type === "tool/call" && String(candidate.data.callId) === callId);
		if (call?.type !== "tool/call" || call.data.name !== "import_world_info") continue;
		const imported = validateImport(events, event);
		active.set(imported.result.sourceAttachmentId, imported);
	}
	return [...active.values()];
}
/**
* Build the canonical World Info summary associated with its source file.
* @param worldInfo - parsed standalone World Info.
* @param sourceEventSeq - exact user message carrying the attachment.
* @param attachment - matching durable JSON attachment.
* @returns compact canonical tool result plus lossless raw JSON.
*/
function prepareWorldInfoImportResult(worldInfo, sourceEventSeq, attachment) {
	const name = worldInfo.name?.trim() || attachment.name.replace(/\.json$/iu, "");
	if (name.trim().length === 0) throw new Error("World Info attachment must have a non-empty filename or name");
	return {
		version: 0,
		name,
		sourceEventSeq,
		sourceAttachmentId: String(attachment.attachmentId),
		entryCount: worldInfo.lorebook.entries.length,
		degradations: [...worldInfo.degradations],
		raw: worldInfo.raw
	};
}
function includesKey(text, key, caseSensitive, matchWholeWords) {
	if (key.length === 0) return false;
	const haystack = caseSensitive ? text : text.toLocaleLowerCase();
	const needle = caseSensitive ? key : key.toLocaleLowerCase();
	if (!matchWholeWords) return haystack.includes(needle);
	if (/\s/u.test(needle)) return haystack.includes(needle);
	let offset = haystack.indexOf(needle);
	while (offset >= 0) {
		const before = offset === 0 ? "" : haystack[offset - 1];
		const after = offset + needle.length >= haystack.length ? "" : haystack[offset + needle.length];
		if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) return true;
		offset = haystack.indexOf(needle, offset + 1);
	}
	return false;
}
function activates(entry, messages, bookDepth) {
	if (!entry.enabled || entry.content.trim().length === 0 || entry.useRegex || entry.hasDecorators) return false;
	if (entry.constant) return true;
	const depth = entry.scanDepth ?? bookDepth ?? messages.length;
	const text = depth === 0 ? "" : messages.slice(-Math.max(0, Math.trunc(depth))).join("\n");
	if (!entry.keys.some((key) => includesKey(text, key, entry.caseSensitive, entry.matchWholeWords))) return false;
	if (!entry.selective || entry.secondaryKeys.length === 0) return true;
	const matches = entry.secondaryKeys.map((key) => includesKey(text, key, entry.caseSensitive, entry.matchWholeWords));
	if (entry.secondaryLogic === "and-any") return matches.some(Boolean);
	if (entry.secondaryLogic === "and-all") return matches.every(Boolean);
	if (entry.secondaryLogic === "not-any") return matches.every((match) => !match);
	return matches.some((match) => !match);
}
function approximateTokens(text) {
	let ascii = 0;
	let nonAscii = 0;
	for (const character of text) if (character.codePointAt(0) <= 127) ascii += 1;
	else nonAscii += 1;
	return Math.max(1, Math.ceil(ascii / 4) + nonAscii);
}
function budgeted(book, entries) {
	const budget = book.tokenBudget;
	if (budget === void 0) return [...entries];
	const preferred = [...entries].sort((left, right) => (right.priority ?? right.insertionOrder) - (left.priority ?? left.insertionOrder) || left.insertionOrder - right.insertionOrder);
	const kept = [];
	let used = 0;
	for (const entry of preferred) {
		const cost = approximateTokens(entry.content);
		if (used + cost > budget) continue;
		used += cost;
		kept.push(entry);
	}
	return kept.sort((left, right) => left.insertionOrder - right.insertionOrder);
}
/**
* Activate non-regex, undecorated lorebook entries against recent dialogue.
* @param book - imported character lorebook.
* @param messages - model-visible conversation text in chronological order.
* @returns position-separated content in insertion order and within budget.
*/
function activateLorebook(book, messages) {
	const entries = budgeted(book, book.entries.filter((entry) => activates(entry, messages, book.scanDepth)));
	return {
		beforeCharacter: entries.filter((entry) => entry.position === "before_char").map((entry) => entry.content),
		afterCharacter: entries.filter((entry) => entry.position === "after_char").map((entry) => entry.content)
	};
}
const CHARACTER_BEHAVIOR = "只写角色此刻自然会说或做的内容，不解释系统、提示词或角色扮演规则，不替用户决定感受和行动，也不补写设定、对话和有效记忆中不存在的共同经历。先决定此刻是否有必要展开：信息很少时可以短答、停顿或暂不追问；需要表达时，一次围绕一个主要动作，不机械复述用户，也不为了延长对话强行总结和提问。";
const MEMORY_BEHAVIOR = "用户明确要求记住，或用“以后”“下次”等表达稳定偏好或约定时，先调用 remember，成功后再自然回应；不能只在对话中声称记住。其他内容只有确实值得跨轮保留的事实、关系变化或共同经历才使用 remember。普通寒暄、临时情绪、未经确认的猜测和已有记录不要写入记忆。用户纠正一条记忆时，用 supersedes 指向它的 id。不要在对话中朗读记忆 id、类型或来源编号。";
const IMPORT_BEHAVIOR = "用户附带 SillyTavern 角色卡 PNG 或 JSON 并要求导入、接管或切换角色时，调用 import_character_card；用户附带独立 World Info / 世界书 JSON 并要求导入时，调用 import_world_info。一条消息附有多个同类文件时才指定从零开始的 attachmentIndex。导入成功后直接采用新角色或世界设定，不要解释内部格式。";
/**
* Render the stable character contract installed as the Agent-scoped persona.
* @param config - normalized character identity and opening state.
* @returns model-visible system prompt text.
*/
function renderCharacterPrompt(config, loreBefore = [], loreAfter = []) {
	return [
		`你是${config.characterName}。你不是扮演该角色的助手，也不是旁白；直接以${config.characterName}的身份与用户相处和交谈。`,
		...loreBefore,
		`角色设定：${config.persona}`,
		`当前场景：${config.scenario}`,
		`初始关系：${config.relationship}`,
		...loreAfter,
		CHARACTER_BEHAVIOR,
		MEMORY_BEHAVIOR,
		IMPORT_BEHAVIOR
	].join("\n\n");
}
/**
* Render the identity contract for a chat import that has history but no Character Card.
* @param characterName - character named by the SillyTavern chat header.
* @param userName - optional user name retained by that header.
* @returns model-visible prompt that continues imported history without applying the deployment default persona.
*/
function renderImportedChatPrompt(characterName, userName) {
	return [
		`你是${characterName}。直接以${characterName}的身份延续当前会话。`,
		...userName === void 0 ? [] : [`与您对话的人在导入记录中名为${userName}。`],
		"以已导入的对话历史为准；缺少角色卡时，不要补用其他角色的身份、经历、场景或关系设定。",
		CHARACTER_BEHAVIOR,
		MEMORY_BEHAVIOR,
		IMPORT_BEHAVIOR
	].join("\n\n");
}
/**
* Activate all Session-owned standalone World Info books for one request.
* @param worldInfos - validated standalone books in Session import order.
* @param session - current model-visible conversation history.
* @param pendingMessages - messages claimed for this step but not yet derived from the Session.
* @returns active entries divided by character position.
*/
function renderImportedWorldInfos(worldInfos, session, pendingMessages = []) {
	const messages = visibleDialogue(session, pendingMessages);
	return worldInfos.reduce((result, worldInfo) => {
		const active = activateLorebook(worldInfo.lorebook, messages);
		result.beforeCharacter.push(...active.beforeCharacter);
		result.afterCharacter.push(...active.afterCharacter);
		return result;
	}, {
		beforeCharacter: [],
		afterCharacter: []
	});
}
/**
* Resolve the two stable SillyTavern identity macros used throughout Character Card text.
* @param value - card-owned prose.
* @param card - active Character Card.
* @param userName - Session-imported user name, or a neutral fallback when none is known.
* @returns prose with character and user identity macros resolved.
*/
function substituteCardMacros(value, card, userName = "用户") {
	const name = card.nickname?.trim() || card.name;
	return value.replace(/\{\{char\}\}|<char>|<bot>/giu, name).replace(/\{\{user\}\}|<user>/giu, userName);
}
/**
* Render an imported Character Card as the complete Agent persona.
* @param card - active Session-owned card.
* @param loreBefore - active before-character lorebook text.
* @param loreAfter - active after-character lorebook text.
* @returns model-visible system prompt text.
*/
function renderImportedCharacterPrompt(card, loreBefore, loreAfter, userName) {
	const name = card.nickname?.trim() || card.name;
	const original = `你是${name}。直接以${name}的身份与用户相处和交谈。`;
	const parts = [
		card.systemPrompt.trim().length === 0 ? original : substituteCardMacros(card.systemPrompt, card, userName).replaceAll("{{original}}", original),
		...loreBefore.map((value) => substituteCardMacros(value, card, userName)),
		`角色描述：${substituteCardMacros(card.description, card, userName)}`,
		`性格：${substituteCardMacros(card.personality, card, userName)}`,
		`当前场景：${substituteCardMacros(card.scenario, card, userName)}`,
		...card.messageExample.trim().length === 0 ? [] : [`对话示例：\n${substituteCardMacros(card.messageExample, card, userName)}`],
		...loreAfter.map((value) => substituteCardMacros(value, card, userName)),
		CHARACTER_BEHAVIOR,
		MEMORY_BEHAVIOR,
		IMPORT_BEHAVIOR
	];
	if (card.postHistoryInstructions.trim().length > 0) parts.push(substituteCardMacros(card.postHistoryInstructions, card, userName).replaceAll("{{original}}", ""));
	return parts.join("\n\n");
}
function dialogueText(messages) {
	return messages.flatMap((message) => {
		if (message.source.kind !== "user" && message.source.kind !== "model") return [];
		return message.content.flatMap((block) => block.type === "text" ? [block.text] : []);
	});
}
function visibleDialogue(session, pendingMessages) {
	const history = session.deriveMessages();
	const historyIds = new Set(history.map((message) => message.id));
	return [...history.flatMap((message) => {
		if (message.source.kind !== "user" && message.source.kind !== "model") return [];
		return message.content.flatMap((block) => block.type === "text" ? [block.text] : []);
	}), ...dialogueText(pendingMessages.filter((message) => !historyIds.has(message.id)))];
}
/**
* Render active imported lorebook text for the next request.
* @param card - active imported character.
* @param session - current Session and model-visible surface.
* @param pendingMessages - messages claimed for this step but not yet present in the Session.
* @returns active entries divided by character position.
*/
function renderImportedLorebook(card, session, pendingMessages = []) {
	return card.lorebook === void 0 ? {
		beforeCharacter: [],
		afterCharacter: []
	} : activateLorebook(card.lorebook, visibleDialogue(session, pendingMessages));
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
	"apiProxy",
	"attachments",
	"systemPrompt",
	"tools"
];
function isCharacterCardOffer(part) {
	return part.type === "image" ? part.mediaType === "image/png" : part.type === "file" && /\.json$/iu.test(part.name);
}
function isWorldInfoRequest(text) {
	return /(?:世界书|世界信息|world\s*info|lorebook)/iu.test(text) && /(?:导入|加载|使用|接入)/u.test(text);
}
/** Recognize one explicit Character Card import without exposing attachment bytes to the model. */
function claimAgentRpPrompt(agentRpActive, content) {
	if (!agentRpActive) return void 0;
	const attachments = content.filter((part) => part.type !== "text");
	const text = content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
	if (isWorldInfoRequest(text)) return attachments.filter((part) => part.type === "file" && /\.json$/iu.test(part.name)).length === 1 ? { text } : void 0;
	if (attachments.filter(isCharacterCardOffer).length !== 1 || !/(?:角色卡|character\s*card|导入|接管|切换角色)/iu.test(text)) return void 0;
	return { text };
}
/** Recognize one standalone SillyTavern JSONL chat upload. */
function isSillyTavernChatOffer(agentRpActive, content) {
	if (!agentRpActive) return false;
	const attachments = content.filter((part) => part.type !== "text");
	return attachments.length === 1 && attachments[0]?.type === "file" && /\.jsonl$/iu.test(attachments[0].name);
}
/** Recognize one Character Card and one JSONL chat submitted together. */
function isSillyTavernMigrationOffer(agentRpActive, content) {
	if (!agentRpActive) return false;
	const attachments = content.filter((part) => part.type !== "text");
	return attachments.length === 2 && attachments.filter(isCharacterCardOffer).length === 1 && attachments.filter((part) => part.type === "file" && /\.jsonl$/iu.test(part.name)).length === 1;
}
/** Recognize one explicitly selected standalone Character Card import. */
function isCharacterCardSessionOffer(agentRpActive, content) {
	if (!agentRpActive) return false;
	const text = content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
	const attachments = content.filter((part) => part.type !== "text");
	return /^请导入这张角色卡$/u.test(text.trim()) && attachments.length === 1 && attachments[0] !== void 0 && isCharacterCardOffer(attachments[0]);
}
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
/** Canonical output schema for one accepted Character Card import. */
const CHARACTER_IMPORT_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			required: true,
			const: 0
		},
		name: {
			type: "string",
			required: true
		},
		cardVersion: {
			type: "integer",
			required: true,
			enum: [
				1,
				2,
				3
			]
		},
		sourceEventSeq: {
			type: "integer",
			required: true
		},
		sourceAttachmentId: {
			type: "string",
			required: true
		},
		transport: {
			type: "string",
			required: true,
			enum: ["png", "json"]
		},
		metadataKeyword: {
			type: "string",
			enum: ["ccv3", "chara"]
		},
		greetingIndex: {
			type: "integer",
			required: true
		},
		selectedGreeting: {
			type: "string",
			required: true
		},
		userName: { type: "string" },
		degradations: {
			type: "array",
			required: true,
			items: {
				type: "string",
				enum: CHARACTER_IMPORT_DEGRADATIONS
			}
		},
		raw: {
			type: "json",
			required: true
		}
	}
};
/** Canonical output schema for one accepted standalone World Info import. */
const WORLD_INFO_IMPORT_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		version: {
			type: "integer",
			required: true,
			const: 0
		},
		name: {
			type: "string",
			required: true
		},
		sourceEventSeq: {
			type: "integer",
			required: true
		},
		sourceAttachmentId: {
			type: "string",
			required: true
		},
		entryCount: {
			type: "integer",
			required: true
		},
		degradations: {
			type: "array",
			required: true,
			items: {
				type: "string",
				enum: WORLD_INFO_IMPORT_DEGRADATIONS
			}
		},
		raw: {
			type: "json",
			required: true
		}
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
function isCharacterCardAttachment(value) {
	return isPngCharacterCardAttachment(value) || isJsonCharacterCardAttachment(value);
}
function latestConsumedAttachments(agent) {
	for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
		const event = agent.session.events[index];
		if (event?.type !== "user/message" || event.data.source.kind !== "user") continue;
		const source = event.data.source;
		const attachments = source.attachmentConsumer === "dsh-agent-rp" && Array.isArray(source.attachments) ? source.attachments.filter(isJsonWorldInfoAttachment) : [];
		if (attachments.length === 0) throw new Error("当前消息没有可导入的 JSON 文件");
		return {
			eventSeq: event.seq,
			attachments
		};
	}
	throw new Error("没有找到导入请求；请在同一条消息中附上 JSON 文件");
}
function latestUserAttachments(agent) {
	for (let index = agent.session.events.length - 1; index >= 0; index -= 1) {
		const event = agent.session.events[index];
		if (event?.type !== "user/message" || event.data.source.kind !== "user") continue;
		const direct = event.data.content.flatMap((block) => block.type === "image" ? [block.attachment] : []);
		const source = event.data.source;
		const consumed = source.attachmentConsumer === "dsh-agent-rp" && Array.isArray(source.attachments) ? source.attachments.filter(isCharacterCardAttachment) : [];
		const attachments = [...direct.filter(isCharacterCardAttachment), ...consumed];
		if (attachments.length === 0) throw new Error("当前消息没有可导入的角色卡；请附上 Character Card PNG 或 JSON");
		return {
			eventSeq: event.seq,
			attachments
		};
	}
	throw new Error("没有找到导入请求；请在同一条消息中附上 Character Card PNG 或 JSON");
}
function importedCharacter(agentsByScope, scope) {
	if (scope === void 0) return void 0;
	const agent = agentsByScope.get(scope);
	return agent === void 0 ? void 0 : readActiveSessionCharacter(agent.session.events);
}
/**
* Attach one persistent character identity and memory tool to a top-level Agent.
* @param agent - published top-level Agent whose scope owns every registration.
* @param config - normalized character configuration.
*/
function installAgentRp(ctx, config) {
	const agentsByScope = /* @__PURE__ */ new WeakMap();
	const pendingMessagesByAgent = /* @__PURE__ */ new WeakMap();
	const gateway = ctx.apiProxy;
	ctx.effect(() => gateway.registerPromptAttachmentConsumer("dsh-agent-rp", ({ agent, content }) => claimAgentRpPrompt(agentsByScope.get(agent) === agent, content)), "agent-rp: prompt attachment consumer");
	ctx.effect(() => gateway.registerPromptSessionImporter("dsh-agent-rp:sillytavern-migration", {
		recognize: ({ agent, content }) => isSillyTavernMigrationOffer(agentsByScope.get(agent) === agent, content),
		async import(input, signal) {
			const cardAttachment = input.attachments.find((attachment) => isJsonCharacterCardAttachment(attachment) || isPngCharacterCardAttachment(attachment));
			const chatAttachment = input.attachments.find((attachment) => "kind" in attachment && attachment.kind === "file" && /\.jsonl$/iu.test(attachment.name));
			if (cardAttachment === void 0 || chatAttachment === void 0) throw new Error("SillyTavern migration requires one Character Card PNG or JSON and one chat JSONL");
			const reader = ctx.attachments;
			const [storedCard, chatBytes] = await Promise.all([isJsonCharacterCardAttachment(cardAttachment) ? input.readFile(cardAttachment, signal).then((data) => ({
				ref: cardAttachment,
				data
			})) : reader.readImage(cardAttachment, signal), input.readFile(chatAttachment, signal)]);
			const payload = isJsonCharacterCardAttachment(storedCard.ref) ? void 0 : readCharacterCardPng(storedCard.data);
			const card = payload === void 0 ? parseCharacterCardJsonBytes(storedCard.data) : parseCharacterCardJson(payload.json);
			const transport = payload === void 0 ? { transport: "json" } : {
				transport: "png",
				metadataKeyword: payload.keyword
			};
			const chat = parseSillyTavernChatBytes(chatBytes);
			return {
				seed: createSillyTavernMigrationSeed(card, storedCard.ref, transport, chat, chatAttachment),
				title: card.nickname?.trim() || card.name
			};
		}
	}), "agent-rp: SillyTavern migration importer");
	ctx.effect(() => gateway.registerPromptSessionImporter("dsh-agent-rp:sillytavern-chat", {
		recognize: ({ agent, content }) => isSillyTavernChatOffer(agentsByScope.get(agent) === agent, content),
		async import(input, signal) {
			if (input.attachments.length !== 1) throw new Error("SillyTavern chat import requires exactly one file");
			const attachment = input.attachments[0];
			if (attachment === void 0 || !("kind" in attachment) || attachment.kind !== "file" || !/\.jsonl$/iu.test(attachment.name)) throw new Error("SillyTavern chat import requires one .jsonl file");
			const chat = parseSillyTavernChatBytes(await input.readFile(attachment, signal));
			const title = resolveSillyTavernChatIdentity(chat).characterName;
			return {
				seed: createSillyTavernChatSeed(chat, attachment),
				...title === void 0 || title === "" ? {} : { title }
			};
		}
	}), "agent-rp: SillyTavern chat importer");
	ctx.effect(() => gateway.registerPromptSessionImporter("dsh-agent-rp:character-card", {
		recognize: ({ agent, content }) => isCharacterCardSessionOffer(agentsByScope.get(agent) === agent, content),
		async import(input, signal) {
			if (input.attachments.length !== 1) throw new Error("Character Card import requires exactly one file");
			const attachment = input.attachments[0];
			if (attachment === void 0 || !isJsonCharacterCardAttachment(attachment) && !isPngCharacterCardAttachment(attachment)) throw new Error("Character Card import requires one PNG or JSON card");
			const reader = ctx.attachments;
			const stored = isJsonCharacterCardAttachment(attachment) ? {
				ref: attachment,
				data: await input.readFile(attachment, signal)
			} : await reader.readImage(attachment, signal);
			const payload = isJsonCharacterCardAttachment(stored.ref) ? void 0 : readCharacterCardPng(stored.data);
			const card = payload === void 0 ? parseCharacterCardJsonBytes(stored.data) : parseCharacterCardJson(payload.json);
			const greeting = substituteCardMacros(card.firstMessage, card);
			return {
				seed: createCharacterCardSessionSeed(card, stored.ref, 0, greeting, payload === void 0 ? { transport: "json" } : {
					transport: "png",
					metadataKeyword: payload.keyword
				}),
				title: card.nickname?.trim() || card.name
			};
		}
	}), "agent-rp: Character Card importer");
	ctx.systemPrompt.section({
		name: "deployment:persona",
		order: 0,
		text: ({ scope }) => {
			const agent = scope === void 0 ? void 0 : agentsByScope.get(scope);
			const pendingMessages = agent === void 0 ? [] : pendingMessagesByAgent.get(agent) ?? [];
			if (agent !== void 0) pendingMessagesByAgent.delete(agent);
			const active = importedCharacter(agentsByScope, scope);
			if (agent === void 0) return renderCharacterPrompt(config);
			const standaloneLore = renderImportedWorldInfos(readActiveSessionWorldInfos(agent.session.events).map((imported) => imported.worldInfo), agent.session, pendingMessages);
			if (active === void 0) {
				const importedChat = readSillyTavernChatIdentity(agent.session.events);
				if (importedChat !== void 0) return [
					...standaloneLore.beforeCharacter,
					renderImportedChatPrompt(importedChat.characterName, importedChat.userName),
					...standaloneLore.afterCharacter
				].join("\n\n");
				return renderCharacterPrompt(config, standaloneLore.beforeCharacter, standaloneLore.afterCharacter);
			}
			const card = cardFromImportMeta(active.meta);
			const characterLore = renderImportedLorebook(card, agent.session, pendingMessages);
			return renderImportedCharacterPrompt(card, [...standaloneLore.beforeCharacter, ...characterLore.beforeCharacter], [...characterLore.afterCharacter, ...standaloneLore.afterCharacter], readSillyTavernChatIdentity(agent.session.events)?.userName);
		},
		complete: true
	});
	ctx.on("agent/created", ({ agent }) => {
		agentsByScope.set(agent, agent);
	});
	ctx.on("agent/disposed", ({ agent }) => {
		agentsByScope.delete(agent);
		pendingMessagesByAgent.delete(agent);
	});
	ctx.on("agent/inbox/claimed", ({ agent, message }) => {
		if (agentsByScope.get(agent) !== agent) return;
		const pending = pendingMessagesByAgent.get(agent);
		if (pending === void 0) pendingMessagesByAgent.set(agent, [message]);
		else pending.push(message);
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
	ctx.tools.register(defineTool({
		name: "import_character_card",
		description: "Import a SillyTavern Character Card V1, V2, or V3 from a PNG or JSON attachment in the latest user message, then make that character active for this Session. Omit attachmentIndex unless the message has multiple recognized cards. greetingIndex 0 selects first_mes; later indexes select alternate_greetings.",
		parameters: {
			attachmentIndex: {
				type: "integer",
				description: "Zero-based Character Card attachment index in the latest user message. Omit when it contains exactly one card."
			},
			greetingIndex: {
				type: "integer",
				description: "Zero selects first_mes; one and above select alternate_greetings. Defaults to zero."
			}
		},
		output: {
			schema: CHARACTER_IMPORT_VALUE_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: [
					`已导入 ${value.name}（Character Card V${value.cardVersion}）`,
					value.selectedGreeting.trim().length === 0 ? "角色卡没有开场白；直接以新角色自然回应。" : `立即以新角色发送这段开场白，不解释导入过程：\n${substituteCardMacros(value.selectedGreeting, parseCharacterCardJson(JSON.stringify(value.raw)), value.userName)}`,
					value.degradations.length === 0 ? "未发现需要降级的能力。" : `未启用：${value.degradations.join("、")}`
				].join("\n")
			}],
			presentationMeta: (_args, value) => {
				const { raw, ...result } = value;
				return {
					format: 0,
					result,
					raw
				};
			}
		},
		async execute(args, exec) {
			if (exec.agent === void 0) throw new Error("import_character_card requires an Agent Session");
			if (exec.parent !== void 0) throw new Error("import_character_card must be called directly by the character Agent");
			const direct = latestUserAttachments(exec.agent);
			const attachmentIndex = args.attachmentIndex ?? 0;
			const attachments = direct.attachments;
			if (!Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= attachments.length) throw new Error(`attachmentIndex ${attachmentIndex} is unavailable; the current import source contains ${attachments.length} Character Card attachment(s)`);
			const attachment = attachments[attachmentIndex];
			if (isJsonCharacterCardAttachment(attachment)) {
				const stored = await ctx.attachments.readFile(attachment, exec.signal);
				return prepareCharacterImportResult(parseCharacterCardJsonBytes(stored.data), { transport: "json" }, direct.eventSeq, stored.ref, args.greetingIndex ?? 0, readSillyTavernChatIdentity(exec.agent.session.events)?.userName);
			}
			const stored = await ctx.attachments.readImage(attachment, exec.signal);
			const payload = readCharacterCardPng(stored.data);
			return prepareCharacterImportResult(parseCharacterCardJson(payload.json), {
				transport: "png",
				metadataKeyword: payload.keyword
			}, direct.eventSeq, stored.ref, args.greetingIndex ?? 0, readSillyTavernChatIdentity(exec.agent.session.events)?.userName);
		},
		presentCall: () => ({
			card: "generic",
			title: "导入角色卡",
			kind: "read"
		}),
		presentResult: (_args, result) => ({
			card: "generic",
			title: result.isError ? "角色卡导入失败" : "角色卡已导入"
		}),
		isConcurrencySafe: () => false
	}));
	ctx.tools.register(defineTool({
		name: "import_world_info",
		description: "Import one standalone SillyTavern World Info / lorebook JSON attachment from the latest user message and keep it active in this Session. Omit attachmentIndex unless the message contains multiple JSON files.",
		parameters: { attachmentIndex: {
			type: "integer",
			description: "Zero-based JSON attachment index in the latest user message. Omit when it contains exactly one file."
		} },
		output: {
			schema: WORLD_INFO_IMPORT_VALUE_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: [
					`已导入世界书 ${value.name}（${value.entryCount} 个条目）`,
					value.degradations.length === 0 ? "未发现需要降级的能力。" : `未启用：${value.degradations.join("、")}`,
					"从下一次回应开始使用已激活的设定，不解释导入过程。"
				].join("\n")
			}],
			presentationMeta: (_args, value) => {
				const { raw, ...result } = value;
				return {
					format: 0,
					result,
					raw
				};
			}
		},
		async execute(args, exec) {
			if (exec.agent === void 0) throw new Error("import_world_info requires an Agent Session");
			if (exec.parent !== void 0) throw new Error("import_world_info must be called directly by the character Agent");
			const direct = latestConsumedAttachments(exec.agent);
			const attachmentIndex = args.attachmentIndex ?? 0;
			if (!Number.isSafeInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= direct.attachments.length) throw new Error(`attachmentIndex ${attachmentIndex} is unavailable; the current import source contains ${direct.attachments.length} JSON attachment(s)`);
			const stored = await ctx.attachments.readFile(direct.attachments[attachmentIndex], exec.signal);
			return prepareWorldInfoImportResult(parseWorldInfoJsonBytes(stored.data), direct.eventSeq, stored.ref);
		},
		presentCall: () => ({
			card: "generic",
			title: "导入世界书",
			kind: "read"
		}),
		presentResult: (_args, result) => ({
			card: "generic",
			title: result.isError ? "世界书导入失败" : "世界书已导入"
		}),
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
export { CHARACTER_IMPORT_VALUE_SCHEMA, Config, MEMORY_VALUE_SCHEMA, WORLD_INFO_IMPORT_VALUE_SCHEMA, apply, claimAgentRpPrompt, inject, installAgentRp, isCharacterCardSessionOffer, isSillyTavernChatOffer, isSillyTavernMigrationOffer, name };
