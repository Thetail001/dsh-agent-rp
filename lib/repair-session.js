#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { lstat, open, readFile, rename, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { constants, zstdCompressSync, zstdDecompressSync } from "node:zlib";
/** Complete private event vocabulary owned by Agent RP. */
const AGENT_RP_SESSION_EVENT_TYPES = [
	"agent-rp/character-card-seed",
	"agent-rp/memory-seed",
	"agent-rp/mvu-state",
	"agent-rp/persona-seed",
	"agent-rp/sillytavern-chat-import",
	"agent-rp/sillytavern-preset-seed",
	"agent-rp/state",
	"agent-rp/tavern-generation-request",
	"agent-rp/tavern-generation-result",
	"agent-rp/tavern-state",
	"agent-rp/tavern-state-attachment",
	"agent-rp/turn-presentation",
	"agent-rp/turn-settlement",
	"agent-rp/world-info-library-seed"
];
/** Explicit, backup-first repair for legacy Agent RP events in one DSH JSONL artifact. */
const ZSTD_MAGIC = 4247762216;
const CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
/** Known private Agent RP event types that are safe to admit during legacy repair. */
const LEGACY_AGENT_RP_EVENT_TYPES = /* @__PURE__ */ new Set([...AGENT_RP_SESSION_EVENT_TYPES]);
function completeZstdFrameEnd(source, start) {
	let cursor = start;
	const take = (bytes, label) => {
		if (source.length - cursor < bytes) throw new Error(`会话文件的 Zstandard ${label}不完整`);
		const position = cursor;
		cursor += bytes;
		return position;
	};
	const magicAt = take(4, "帧头");
	if (source.readUInt32LE(magicAt) !== ZSTD_MAGIC) throw new Error(`会话文件在字节 ${start} 处没有 Zstandard 帧`);
	const descriptorAt = take(1, "帧头");
	const descriptor = source.readUInt8(descriptorAt);
	if ((descriptor & 24) !== 0) throw new Error(`Zstandard 帧头损坏（字节 ${descriptorAt}）`);
	const singleSegment = (descriptor & 32) !== 0;
	const contentSizeFlag = descriptor >>> 6;
	const dictionaryFlag = descriptor & 3;
	const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
	const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 2 ** contentSizeFlag;
	take((singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes, "帧头");
	let finalBlock = false;
	while (!finalBlock) {
		const headerAt = take(3, "数据块头");
		const header = source.readUIntLE(headerAt, 3);
		finalBlock = (header & 1) === 1;
		const kind = header >>> 1 & 3;
		if (kind === 3) throw new Error(`Zstandard 数据块损坏（字节 ${headerAt}）`);
		const declaredSize = header >>> 3;
		take(kind === 1 ? 1 : declaredSize, "数据块");
	}
	if ((descriptor & 4) !== 0) take(4, "校验和");
	return cursor;
}
/** Locate complete frames in DSH's concatenated-Zstandard session container. */
function scanZstdFrames(buffer) {
	const frames = [];
	for (let start = 0; start < buffer.length;) {
		const end = completeZstdFrameEnd(buffer, start);
		frames.push({
			start,
			end
		});
		start = end;
	}
	if (frames.length === 0) throw new Error("会话文件不包含 Zstandard 帧");
	return frames;
}
function jsonRecord(line, lineNumber) {
	let value;
	try {
		value = JSON.parse(line.toString("utf8"));
	} catch (error) {
		throw new Error(`会话文件第 ${lineNumber} 行不是有效 JSON`, { cause: error });
	}
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`会话文件第 ${lineNumber} 行不是记录对象`);
	return value;
}
function patchPlaintext(input) {
	if (input.length === 0 || input.at(-1) !== 10) throw new Error("会话记录缺少完整的换行结尾");
	const chunks = [];
	const unknown = /* @__PURE__ */ new Set();
	let repairedEvents = 0;
	let alreadySafeEvents = 0;
	let start = 0;
	let lineNumber = 0;
	while (start < input.length) {
		const newline = input.indexOf(10, start);
		if (newline < 0) throw new Error("会话记录末行不完整");
		lineNumber += 1;
		const line = input.subarray(start, newline);
		if (line.length === 0) throw new Error(`会话文件第 ${lineNumber} 行为空`);
		const record = jsonRecord(line, lineNumber);
		const type = record.type;
		if (typeof type === "string" && LEGACY_AGENT_RP_EVENT_TYPES.has(type)) {
			if (record.surfaceOp !== void 0) throw new Error(`拒绝修复带对话表面操作的事件 ${JSON.stringify(type)}`);
			if (record.ignorable === true) {
				alreadySafeEvents += 1;
				chunks.push(line, Buffer.from("\n"));
			} else {
				if (record.ignorable !== void 0) throw new Error(`事件 ${JSON.stringify(type)} 带有非法的 ignorable 标记`);
				repairedEvents += 1;
				chunks.push(Buffer.from(`${JSON.stringify({
					...record,
					ignorable: true
				})}\n`, "utf8"));
			}
		} else {
			if (typeof type === "string" && type.startsWith("agent-rp/") && record.ignorable !== true) unknown.add(type);
			chunks.push(line, Buffer.from("\n"));
		}
		start = newline + 1;
	}
	return {
		output: repairedEvents === 0 ? input : Buffer.concat(chunks),
		changed: repairedEvents > 0,
		repairedEvents,
		alreadySafeEvents,
		unknownAgentRpEventTypes: [...unknown].sort()
	};
}
function patchZstd(input) {
	const outputs = [];
	const unknown = /* @__PURE__ */ new Set();
	let repairedEvents = 0;
	let alreadySafeEvents = 0;
	for (const frame of scanZstdFrames(input)) {
		const encoded = input.subarray(frame.start, frame.end);
		const patched = patchPlaintext(zstdDecompressSync(encoded));
		repairedEvents += patched.repairedEvents;
		alreadySafeEvents += patched.alreadySafeEvents;
		for (const type of patched.unknownAgentRpEventTypes) unknown.add(type);
		outputs.push(patched.changed ? zstdCompressSync(patched.output, CHECKSUM_OPTIONS) : encoded);
	}
	return {
		output: repairedEvents === 0 ? input : Buffer.concat(outputs),
		changed: repairedEvents > 0,
		repairedEvents,
		alreadySafeEvents,
		unknownAgentRpEventTypes: [...unknown].sort()
	};
}
function artifactEncoding(path) {
	if (path.endsWith(".jsonl.zstd")) return "jsonl.zstd";
	if (path.endsWith(".jsonl")) return "jsonl";
	throw new Error("只能修复明确指定的 session.jsonl 或 session.jsonl.zstd 文件");
}
function backupName(path) {
	const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/gu, "-");
	return resolve(dirname(path), `${basename(path)}.agent-rp-backup-${stamp}-${randomUUID().slice(0, 8)}`);
}
async function replaceWithBackup(path, output, mode) {
	const temporary = resolve(dirname(path), `.${basename(path)}.agent-rp-repair-${randomUUID()}.tmp`);
	const backup = backupName(path);
	const handle = await open(temporary, "wx", mode);
	try {
		await handle.writeFile(output);
		await handle.sync();
	} finally {
		await handle.close();
	}
	try {
		await rename(path, backup);
	} catch (error) {
		await unlink(temporary).catch(() => void 0);
		throw error;
	}
	try {
		await rename(temporary, path);
	} catch (error) {
		try {
			await rename(backup, path);
		} catch (restoreError) {
			throw new AggregateError([error, restoreError], `替换失败；原文件仍在 ${backup}`);
		}
		throw error;
	}
	return backup;
}
/** Inspect or repair one exact DSH session file; never scans a directory. */
async function repairAgentRpSessionFile(inputPath, options = {}) {
	const path = resolve(inputPath);
	const encoding = artifactEncoding(path);
	const info = await lstat(path);
	if (!info.isFile() || info.isSymbolicLink()) throw new Error("修复目标必须是普通会话文件，不能是目录或符号链接");
	const input = await readFile(path);
	const patched = encoding === "jsonl.zstd" ? patchZstd(input) : patchPlaintext(input);
	if (patched.unknownAgentRpEventTypes.length > 0) throw new Error(`会话还包含本工具不认识的 Agent RP 事件：${patched.unknownAgentRpEventTypes.join("、")}`);
	if (options.apply !== true || !patched.changed) return {
		path,
		encoding,
		repairedEvents: patched.repairedEvents,
		alreadySafeEvents: patched.alreadySafeEvents,
		unknownAgentRpEventTypes: patched.unknownAgentRpEventTypes,
		applied: false
	};
	const verified = encoding === "jsonl.zstd" ? patchZstd(patched.output) : patchPlaintext(patched.output);
	if (verified.repairedEvents !== 0 || verified.unknownAgentRpEventTypes.length > 0) throw new Error("修复后校验失败，原文件未替换");
	const backupPath = await replaceWithBackup(path, patched.output, info.mode);
	return {
		path,
		encoding,
		repairedEvents: patched.repairedEvents,
		alreadySafeEvents: patched.alreadySafeEvents,
		unknownAgentRpEventTypes: [],
		applied: true,
		backupPath
	};
}
function usage() {
	console.error("用法：dsh-agent-rp-repair-session [--apply] <session.jsonl.zstd>");
	console.error("默认只读检查；关闭 DSH 后显式加 --apply 才会备份并修复。");
	process.exit(2);
}
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const positional = args.filter((arg) => arg !== "--apply");
if (positional.length !== 1 || args.some((arg) => arg.startsWith("--") && arg !== "--apply")) usage();
try {
	const result = await repairAgentRpSessionFile(positional[0], { apply });
	if (!apply) {
		console.log(`只读检查完成：${result.path}`);
		console.log(`需要修复的旧事件：${result.repairedEvents}`);
		console.log(`已经安全的 Agent RP 事件：${result.alreadySafeEvents}`);
		if (result.repairedEvents > 0) console.log("请先完全关闭 DSH，再用同一条命令加 --apply 执行。");
	} else if (result.applied) {
		console.log(`已修复 ${result.repairedEvents} 条旧事件。`);
		console.log(`原文件备份：${result.backupPath}`);
	} else console.log("该会话不需要修复，未写入任何文件。");
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
export {};
