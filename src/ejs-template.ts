/** Isolated, deterministic rendering for the supported SillyTavern EJS subset. */

import variant from '@jitl/quickjs-singlefile-mjs-release-sync'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import {
  newQuickJSWASMModuleFromVariant,
  type QuickJSWASMModule,
} from 'quickjs-emscripten-core'

const MAX_TEMPLATE_CHARS = 256 * 1024
const MAX_OUTPUT_CHARS = 256 * 1024
const MEMORY_LIMIT_BYTES = 16 * 1024 * 1024
const MAX_STACK_BYTES = 512 * 1024
const MAX_INTERRUPT_POLLS = 512
const MAX_PENDING_JOBS = 1_024
const MAX_RENDERER_EVALUATIONS = 256

let quickjsModule: Promise<QuickJSWASMModule> | undefined

/** One role-preserving visible Session message exposed to a template. */
export interface EjsTemplateMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/** JSON-only values exposed to one template evaluation. */
export interface EjsTemplateContext {
  readonly characterName: string
  readonly userName: string
  readonly messages: readonly string[]
  readonly transcript?: readonly EjsTemplateMessage[]
  readonly variables?: Readonly<Record<string, JsonValue>>
  readonly variableScopes?: Readonly<Partial<Record<'global' | 'preset' | 'character' | 'chat' | 'message', Readonly<Record<string, JsonValue>>>>>
  readonly statData?: JsonValue
}

/** Stable failure categories that never include private template source. */
export type EjsTemplateFailureKind =
  | 'source-limit'
  | 'syntax-error'
  | 'runtime-error'
  | 'execution-limit'
  | 'memory-limit'
  | 'output-limit'

/** Result of one isolated template evaluation. */
export type EjsTemplateResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly kind: EjsTemplateFailureKind }

interface TemplateSegment {
  readonly kind: 'text' | 'code' | 'escaped' | 'raw'
  readonly value: string
}

function segments(template: string): TemplateSegment[] | undefined {
  const result: TemplateSegment[] = []
  const literalClosings = (value: string) => value.replaceAll('%%>', '%>')
  let cursor = 0
  let trimLeadingWhitespace = false
  while (cursor < template.length) {
    const opening = template.indexOf('<%', cursor)
    if (opening < 0) {
      const tail = literalClosings(trimLeadingWhitespace ? template.slice(cursor).replace(/^\s+/u, '') : template.slice(cursor))
      if (tail !== '') result.push({ kind: 'text', value: tail })
      return result
    }
    let text = template.slice(cursor, opening)
    if (trimLeadingWhitespace) text = text.replace(/^\s+/u, '')
    const marker = template[opening + 2]
    if (marker === '%') {
      if (text !== '') result.push({ kind: 'text', value: literalClosings(text) })
      result.push({ kind: 'text', value: '<%' })
      cursor = opening + 3
      trimLeadingWhitespace = false
      continue
    }
    const trimBefore = marker === '_'
    if (trimBefore) text = text.replace(/\s+$/u, '')
    if (text !== '') result.push({ kind: 'text', value: literalClosings(text) })

    const contentStart = opening + (marker === '=' || marker === '-' || marker === '#' || marker === '_' ? 3 : 2)
    const closing = template.indexOf('%>', contentStart)
    if (closing < 0) return undefined
    const closeMarker = template[closing - 1]
    const contentEnd = closeMarker === '-' || closeMarker === '_' ? closing - 1 : closing
    const value = template.slice(contentStart, contentEnd)
    if (marker !== '#') {
      result.push({
        kind: marker === '=' ? 'escaped' : marker === '-' ? 'raw' : 'code',
        value,
      })
    }
    cursor = closing + 2
    if (closeMarker === '_') {
      trimLeadingWhitespace = true
    } else {
      trimLeadingWhitespace = false
      if (closeMarker === '-') {
        if (template.startsWith('\r\n', cursor)) cursor += 2
        else if (template[cursor] === '\n' || template[cursor] === '\r') cursor += 1
      }
    }
  }
  return result
}

function compileTemplate(template: string, context: EjsTemplateContext): string | undefined {
  const parsed = segments(template)
  if (parsed === undefined) return undefined
  const transcript = context.transcript ?? []
  const transcriptIsMessagePrefix = transcript.length <= context.messages.length
    && transcript.every((message, index) => message.content === context.messages[index])
  const input = JSON.stringify({
    char: context.characterName,
    user: context.userName,
    messages: transcriptIsMessagePrefix ? context.messages.slice(transcript.length) : context.messages,
    transcript,
    transcriptIsMessagePrefix,
    variables: context.variables ?? {},
    scopes: context.variableScopes ?? {},
    ...(context.statData === undefined ? {} : { stat_data: context.statData }),
  })
  const statements = parsed.map(segment => {
    if (segment.kind === 'text') return `__append(${JSON.stringify(segment.value)});`
    if (segment.kind === 'escaped') return `__append(__escape((${segment.value})));`
    if (segment.kind === 'raw') return `__append((${segment.value}));`
    return segment.value
  }).join('\n')
  return `(async () => {
    'use strict';
    const __input = JSON.parse(${JSON.stringify(input)});
    let __output = '';
    const __append = value => {
      if (value === undefined || value === null) return;
      __output += String(value);
      if (__output.length > ${MAX_OUTPUT_CHARS}) throw new Error('__AGENT_RP_EJS_OUTPUT_LIMIT__');
    };
    const __escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#34;', "'": '&#39;',
    })[character]);
    const __owns = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
    const char = __input.char;
    const user = __input.user;
    const charName = char;
    const userName = user;
    const runType = 'generate';
    const __transcript = __input.transcript;
    const messages = __input.transcriptIsMessagePrefix
      ? [...__transcript.map(message => message.content), ...__input.messages]
      : __input.messages;
    const __normalizeMessageId = value => {
      const id = Number(value);
      if (!Number.isSafeInteger(id)) return -1;
      return id < 0 ? __transcript.length + id : id;
    };
    const __messageRole = value => value === 'system' || value === 'user' || value === 'assistant' ? value : undefined;
    const getChatMessage = (id, role = undefined) => {
      const index = __normalizeMessageId(id);
      const message = index < 0 || index >= __transcript.length ? undefined : __transcript[index];
      const selectedRole = __messageRole(role);
      if (message === undefined || (role !== undefined && selectedRole === undefined) || (selectedRole !== undefined && message.role !== selectedRole)) return '';
      return message.content;
    };
    const getChatMessages = (first, second = undefined, third = undefined) => {
      if (typeof second !== 'number') {
        const count = Number(first);
        const role = __messageRole(second);
        if (!Number.isSafeInteger(count) || count <= 0 || (second !== undefined && role === undefined)) return [];
        const selected = role === undefined ? __transcript : __transcript.filter(message => message.role === role);
        return selected.slice(Math.max(0, selected.length - count)).map(message => message.content);
      }
      const start = __normalizeMessageId(first);
      const end = __normalizeMessageId(second);
      const role = __messageRole(third);
      if (start < 0 || end < start || start >= __transcript.length || (third !== undefined && role === undefined)) return [];
      return __transcript.slice(start, Math.min(end + 1, __transcript.length))
        .filter(message => role === undefined || message.role === role)
        .map(message => message.content);
    };
    const __lastMessageByRole = role => {
      for (let index = __transcript.length - 1; index >= 0; index -= 1) {
        if (__transcript[index].role === role) return { id: index, content: __transcript[index].content };
      }
      return { id: -1, content: '' };
    };
    const __lastUser = __lastMessageByRole('user');
    const __lastCharacter = __lastMessageByRole('assistant');
    const lastMessageId = __transcript.length - 1;
    const lastUserMessageId = __lastUser.id;
    const lastCharMessageId = __lastCharacter.id;
    const lastUserMessage = __lastUser.content;
    const lastCharMessage = __lastCharacter.content;
    const lastMessage = lastMessageId < 0
      ? (messages.length === 0 ? '' : messages[messages.length - 1])
      : __transcript[lastMessageId].content;
    const variableScopes = __input.scopes;
    const stat_data = __input.stat_data;
    const __plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const __set = (record, key, value) => Object.defineProperty(record, key, {
      value, enumerable: true, configurable: true, writable: true,
    });
    const __merge = (target, source) => {
      if (!__plain(source)) return target;
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (__plain(value)) {
          const current = __plain(target[key]) ? target[key] : Object.create(null);
          __set(target, key, __merge(current, value));
        } else {
          __set(target, key, Array.isArray(value) ? value.slice() : value);
        }
      }
      return target;
    };
    const variables = [
      variableScopes.global, variableScopes.preset, variableScopes.character,
      variableScopes.chat, variableScopes.message, __input.variables,
    ].reduce((result, record) => __merge(result, record), Object.create(null));
    if (stat_data !== undefined) __set(variables, 'stat_data', stat_data);
    const __read = (record, name, fallback) => {
      if (name === null) return record;
      const key = String(name);
      if (__owns(record, key)) return record[key];
      let current = record;
      for (const segment of key.split('.')) {
        if (current === null || typeof current !== 'object' || !__owns(current, segment)) return fallback;
        current = current[segment];
      }
      return current;
    };
    const __scopeNames = new Set(['cache', 'global', 'preset', 'character', 'local', 'chat', 'message', 'initial']);
    const __fallback = value => __plain(value)
      ? (__owns(value, 'defaults') ? value.defaults : undefined)
      : typeof value === 'string' && __scopeNames.has(value) ? undefined : value;
    const __scope = value => {
      const option = __plain(value) ? value : {};
      const requested = typeof value === 'string' ? value
        : typeof option.scope === 'string' ? option.scope
          : typeof option.type === 'string' ? option.type : 'cache';
      if (requested === 'global') return variableScopes.global ?? {};
      if (requested === 'preset') return variableScopes.preset ?? {};
      if (requested === 'character') return variableScopes.character ?? {};
      if (requested === 'local' || requested === 'chat') return variableScopes.chat ?? {};
      if (requested === 'message') return variableScopes.message ?? {};
      if (requested === 'initial') return {};
      return variables;
    };
    const getvar = (name, options = undefined) => __read(__scope(options), name, __fallback(options));
    const __scoped = scope => (name, options = undefined) => __read(scope, name, __fallback(options));
    const getchatvar = __scoped(variableScopes.chat ?? {});
    const getglobalvar = __scoped(variableScopes.global ?? {});
    const getlocalvar = getchatvar;
    const getpresetvar = __scoped(variableScopes.preset ?? {});
    const getcharactervar = __scoped(variableScopes.character ?? {});
    const getmessagevar = __scoped(variableScopes.message ?? {});
    const getVar = getvar;
    const getChatVar = getchatvar;
    const getGlobalVar = getglobalvar;
    const getLocalVar = getlocalvar;
    const getPresetVar = getpresetvar;
    const getCharacterVar = getcharactervar;
    const getMessageVar = getmessagevar;
    const print = (...values) => { for (const value of values) __append(value); };
    globalThis.Date = undefined;
    Math.random = () => { throw new Error('__AGENT_RP_EJS_NONDETERMINISTIC__'); };
    ${statements}
    return __output;
  })()`
}

function failureKind(value: unknown): EjsTemplateFailureKind {
  if (typeof value !== 'object' || value === null) return 'runtime-error'
  const record = value as { readonly name?: unknown; readonly message?: unknown }
  const message = typeof record.message === 'string' ? record.message : ''
  if (message.includes('__AGENT_RP_EJS_OUTPUT_LIMIT__')) return 'output-limit'
  if (message.includes('interrupted')) return 'execution-limit'
  if (/out of memory|memory limit/iu.test(message)) return 'memory-limit'
  if (record.name === 'SyntaxError') return 'syntax-error'
  return 'runtime-error'
}

/** QuickJS-backed evaluator; every render gets a fresh runtime and context. */
export class EjsTemplateEngine {
  private constructor(private readonly quickjs: QuickJSWASMModule) {}

  /** Load the embedded QuickJS WebAssembly module once during plugin startup. */
  static async create(): Promise<EjsTemplateEngine> {
    quickjsModule ??= newQuickJSWASMModuleFromVariant(variant)
    return new EjsTemplateEngine(await quickjsModule)
  }

  /** Render one template without exposing Host globals, modules, files, or network APIs. */
  render(template: string, context: EjsTemplateContext): EjsTemplateResult {
    if (template.length > MAX_TEMPLATE_CHARS) return { ok: false, kind: 'source-limit' }
    const code = compileTemplate(template, context)
    if (code === undefined) return { ok: false, kind: 'syntax-error' }
    const runtime = this.quickjs.newRuntime()
    runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)
    runtime.setMaxStackSize(MAX_STACK_BYTES)
    let polls = 0
    runtime.setInterruptHandler(() => ++polls > MAX_INTERRUPT_POLLS)
    const vm = runtime.newContext()
    try {
      const result = vm.evalCode(code, 'agent-rp:ejs')
      const errorHandle = result.error
      if (errorHandle !== undefined) {
        const error = vm.dump(errorHandle)
        errorHandle.dispose()
        return { ok: false, kind: failureKind(error) }
      }
      const promiseHandle = result.value
      if (promiseHandle === undefined) return { ok: false, kind: 'runtime-error' }
      const jobs = runtime.executePendingJobs(MAX_PENDING_JOBS)
      const jobError = jobs.error
      if (jobError !== undefined) {
        const error = jobError.context.dump(jobError)
        jobError.dispose()
        jobs.dispose()
        promiseHandle.dispose()
        return { ok: false, kind: failureKind(error) }
      }
      jobs.dispose()
      const settled = vm.getPromiseState(promiseHandle)
      promiseHandle.dispose()
      if (settled.type === 'pending') return { ok: false, kind: 'execution-limit' }
      if (settled.type === 'rejected') {
        const error = vm.dump(settled.error)
        settled.error.dispose()
        return { ok: false, kind: failureKind(error) }
      }
      const value = vm.dump(settled.value)
      settled.value.dispose()
      return typeof value === 'string'
        ? { ok: true, text: value }
        : { ok: false, kind: 'runtime-error' }
    } catch (error) {
      return { ok: false, kind: failureKind(error) }
    } finally {
      vm.dispose()
      runtime.dispose()
    }
  }

  /** Bind one immutable context and cap the number of templates evaluated for one prompt or projection pass. */
  createRenderer(context: EjsTemplateContext): (template: string) => EjsTemplateResult {
    let evaluations = 0
    return template => {
      if (evaluations >= MAX_RENDERER_EVALUATIONS) return { ok: false, kind: 'execution-limit' }
      evaluations += 1
      return this.render(template, context)
    }
  }
}
