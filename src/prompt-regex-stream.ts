/** Logged SillyTavern prompt-regex views for Agent Loop requests. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  freezeMessage,
  isAgentLoopRequest,
  type ContentBlock,
  type GenerateOptions,
  type Message,
  type MessageSource,
  type RequestMessage,
} from '@deepseek-ai/dsh-llm'
import {
  SessionSeq,
  type Session,
  type SessionEvent,
  type SessionMessageProjection,
} from '@deepseek-ai/dsh-session'
import {
  AI_OUTPUT_PLACEMENT,
  PROMPT_REGEX_SOURCE_MARKER,
  readPromptRegexSourceMarker,
  tracePromptRegexView,
  USER_INPUT_PLACEMENT,
  type PromptRegexOutcome,
  type RegexCharacter,
  type PromptRegexSourceMarker,
  type PromptRegexTraceRecord,
} from './frontend-regex.ts'
import type { ImportedRegexScript } from './import/types.ts'
import {
  prepareSillyTavernProviderMessages,
} from './preset-prompt.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'
import { hiddenReplyVersionSeqs } from './generation-state-record.ts'
import { messageEditContents } from './message-edit.ts'
import type {
  RoleplayPromptRegexTransform,
  RoleplayPromptTransformPlan,
  RoleplayTurnPromptPlan,
} from './roleplay-turn-plan.ts'

interface DialogueNode {
  readonly current: Extract<SessionEvent, { type: 'user/message' | 'assistant/message' }>
  readonly original: Extract<SessionEvent, { type: 'user/message' | 'assistant/message' }>
  readonly role: 'user' | 'assistant'
}

interface OpenStep {
  readonly turn: number
  readonly step: number
}

function messageOf(event: DialogueNode['current']): Message {
  return event.type === 'user/message' ? event.data : event.data.message
}

function sourceMarker(source: MessageSource): PromptRegexSourceMarker | undefined {
  return readPromptRegexSourceMarker(
    (source as unknown as Record<string, unknown>)[PROMPT_REGEX_SOURCE_MARKER],
  )
}

function dialogueEvent(event: SessionEvent | undefined): event is DialogueNode['current'] {
  if (event?.type === 'user/message') return event.data.source.kind === 'user'
  return event?.type === 'assistant/message' && event.data.message.source.kind === 'model'
}

function dialogueNodes(session: Session): DialogueNode[] {
  // 0.2.1: 账本隐藏的非选中 swipe 版本不参与正则改写，也不计入 depth。
  const hidden = hiddenReplyVersionSeqs(session.snapshotEvents())
  return session.surface.nodes.flatMap(seq => {
    if (hidden.has(Number(seq))) return []
    const current = session.snapshotEvents()[seq]
    if (!dialogueEvent(current)) return []
    const marker = sourceMarker(messageOf(current).source)
    const candidate = marker === undefined ? current : session.snapshotEvents()[marker.originalSeq]
    const original = dialogueEvent(candidate) && candidate.type === current.type ? candidate : current
    return [{ current, original, role: current.type === 'user/message' ? 'user' as const : 'assistant' as const }]
  })
}

function openStep(events: readonly SessionEvent[]): OpenStep | undefined {
  let current: OpenStep | undefined
  for (const event of events) {
    if (event.type === 'step/start') current = { turn: event.data.turn, step: event.data.step }
    else if (event.type === 'step/end') current = undefined
  }
  return current
}

function transformedContent(
  content: readonly ContentBlock[],
  card: RegexCharacter,
  placement: number,
  depth: number,
  userName: string | undefined,
  scripts: readonly ImportedRegexScript[],
): { readonly content: ContentBlock[]; readonly outcomes: readonly PromptRegexOutcome[] } {
  const textBlocks = content.filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
  const traces = (textBlocks.length === 0 ? [''] : textBlocks.map(block => block.text)).map(text =>
    tracePromptRegexView(text, card, scripts, placement, depth, userName))
  let traceIndex = 0
  return {
    content: content.map(block => {
      if (block.type !== 'text') return block
      const trace = traces[traceIndex++]
      return trace === undefined ? block : { ...block, text: trace.text }
    }),
    outcomes: traces[0]?.scripts.map((_script, index) => {
      const values = traces.map(trace => trace.scripts[index]?.outcome ?? 'no-match')
      return values.reduce((best, value) => outcomeRank(value) > outcomeRank(best) ? value : best, 'disabled')
    }) ?? [],
  }
}

function sameContent(left: readonly ContentBlock[], right: readonly ContentBlock[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sourceWithMarker<S extends MessageSource>(
  source: S,
  originalSeq: number,
  trace?: PromptRegexTraceRecord,
): S {
  const { replayState: _replayState, ...stable } = source as S & { readonly replayState?: unknown }
  return {
    ...stable,
    [PROMPT_REGEX_SOURCE_MARKER]: { format: 0, originalSeq, ...(trace === undefined ? {} : { trace }) },
  } as unknown as S
}

/**
 * Durable prompt-regex view record: one per request that ran prompt scripts,
 * carrying every rewritten message keyed by its original event seq.
 * 0.2.1 移除了 assistant/message 的 surface replace（数学上不可能：
 * assistant 禁带 sourceEventSeqs，replace 又必须引用全部被覆盖节点），
 * 正则改写改走 messageProjection：日志本体不动，派生消息层生效。
 */
export interface PromptRegexViewRecord {
  readonly format: 0
  readonly turn: number
  readonly step: number
  readonly replacements: readonly {
    readonly seq: number
    readonly content: readonly ContentBlock[]
  }[]
  readonly trace: PromptRegexTraceRecord
}

declare module '@deepseek-ai/dsh-session' {
  interface PluginRecordMap {
    /** Prompt-regex view rewriting existing dialogue messages at derivation time. */
    'plugin:agent-rp/prompt-regex-view': PromptRegexViewRecord
  }
  /** 镜像进 SessionEventMap 仅为读路径判别收窄；写入只走 appendPluginRecord。 */
  interface SessionEventMap {
    /** Prompt-regex view rewriting existing dialogue messages at derivation time. */
    'plugin:agent-rp/prompt-regex-view': PromptRegexViewRecord
  }
}

/**
 * Pure interpreter turning prompt-regex view records into derived-message
 * rewrites. Rebuilt from the durable original events (never from earlier
 * projections), so chained records stay idempotent across replay.
 */
export const promptRegexViewProjection: SessionMessageProjection<'plugin:agent-rp/prompt-regex-view'> = {
  type: 'plugin:agent-rp/prompt-regex-view',
  project(event, context) {
    const updates = new Map<SessionSeq, Message>()
    const base = Number(context.baseSeq)
    for (const replacement of event.data.replacements) {
      const original = context.events[replacement.seq - base]
      if (original === undefined) {
        // Fork/restore 的重放窗口不含目标事件时，该节点也不在本窗口的表面上。
        if (replacement.seq < base) continue
        throw new Error('正则视图记录引用了不存在的对话消息')
      }
      const message = original.type === 'user/message' ? original.data
        : original.type === 'assistant/message' ? original.data.message
          : undefined
      if (message === undefined) throw new Error('正则视图记录引用了不存在的对话消息')
      updates.set(SessionSeq(replacement.seq), freezeMessage({
        ...message,
        content: replacement.content,
        source: sourceWithMarker(message.source, replacement.seq, event.data.trace),
      } as Message))
    }
    return updates
  },
}

/**
 * Register the prompt-regex view projection for all future session create/restore/fork.
 *
 * A real Host always provides the Session store; a minimal host (or a preview
 * harness) may not, and without Sessions there is nothing to project anyway, so
 * a missing service skips registration instead of failing plugin load.
 */
export function registerPromptRegexViewProjection(ctx: Context): void {
  ctx.get('sessions')?.registerMessageProjection(promptRegexViewProjection)
}

function outcomeRank(value: PromptRegexOutcome): number {
  switch (value) {
    case 'applied': return 7
    case 'invalid': return 6
    case 'display-only': return 5
    case 'no-match': return 4
    case 'depth': return 3
    case 'placement': return 2
    case 'disabled': return 1
  }
}

function importedScript(operation: RoleplayPromptRegexTransform): ImportedRegexScript {
  return {
    scriptName: operation.name,
    findRegex: operation.pattern,
    replaceString: operation.replacement,
    trimStrings: operation.trim,
    placement: operation.placements.map(placement => placement === 'user-input'
      ? USER_INPUT_PLACEMENT : AI_OUTPUT_PLACEMENT),
    disabled: !operation.enabled,
    markdownOnly: false,
    promptOnly: operation.phase === 'prompt-only',
    runOnEdit: false,
    substituteRegex: operation.identitySubstitution === 'raw' ? 1
      : operation.identitySubstitution === 'escaped' ? 2 : 0,
    minDepth: operation.minDepth ?? null,
    maxDepth: operation.maxDepth ?? null,
  }
}

function executionProgram(plan: RoleplayPromptTransformPlan): {
  readonly card: RegexCharacter
  readonly scripts: readonly ImportedRegexScript[]
} {
  return {
    card: {
      name: plan.actorName,
      frontend: {
        regexScripts: [],
        tavernHelperScriptNames: [],
        tavernHelperScripts: [],
        tavernHelperVariables: {},
      },
    },
    scripts: plan.operations.map(importedScript),
  }
}

/** Recognize frozen primary requests even when a linked plugin has a second dsh-llm module instance. */
function isAgentLoopDispatch(options: GenerateOptions): boolean {
  return isAgentLoopRequest(options)
    || (options.sessionId !== undefined && options.purpose === undefined && Object.isFrozen(options))
}

function preparePromptRegexStreamOptions(
  options: GenerateOptions,
  agentForSession: (sessionId: string) => Agent | undefined,
  promptPlanForAgent: (agent: Agent) => RoleplayTurnPromptPlan | undefined,
): GenerateOptions | undefined {
  if (!isAgentLoopDispatch(options) || options.sessionId === undefined) return undefined
  const agent = agentForSession(String(options.sessionId))
  if (agent === undefined) return undefined
  const plan = promptPlanForAgent(agent)
  if (plan === undefined) return undefined
  // 0.2.1: 正则改写不再落在 surface 事件上，"是否有受管视图"看投影记录是否存在。
  const hasManagedSurface = agent.session.snapshotEvents()
    .some(event => event.type === 'plugin:agent-rp/prompt-regex-view')
  const hasPromptScripts = plan.transforms.operations.length > 0
  if (!hasPromptScripts && !hasManagedSurface
    && plan.beforeHistory.length === 0 && plan.afterHistory.length === 0 && plan.inChat.length === 0
    && plan.includeHistory && plan.continuation === undefined) return undefined
  let messages: readonly RequestMessage[] = options.messages
  if (hasPromptScripts || hasManagedSurface) {
    const trace = applyPromptRegexSurface(agent.session, plan.transforms)
    if (trace !== undefined && trace.replacementCount > 0) messages = [...agent.session.deriveMessages()]
  }
  return {
    ...options,
    messages: prepareSillyTavernProviderMessages(messages, plan),
  }
}

function installPromptRegexStreamHandler(
  ctx: Context,
  prepare: (options: GenerateOptions) => GenerateOptions | undefined,
): () => void {
  return ctx.on('llm/stream', (options, next) => {
    const prepared = prepare(options)
    return prepared === undefined ? next() : ctx.llm.stream(prepared)
  }, { global: true, prepend: true })
}

function llmStreamOwnerContext(ctx: Context): Context {
  const owner = Reflect.get(ctx.llm as object, 'ctx') as Partial<Context> | undefined
  if (owner === undefined || typeof owner.on !== 'function') {
    throw new Error('DSH LLM runtime does not expose its event context')
  }
  return owner as Context
}

/** Apply one request's prompt view as a durable projection record. */
export function applyPromptRegexSurface(
  session: Session,
  plan: RoleplayPromptTransformPlan,
): PromptRegexTraceRecord | undefined {
  const position = openStep(session.snapshotEvents())
  if (position === undefined) return undefined
  const { card, scripts } = executionProgram(plan)
  const nodes = dialogueNodes(session)
  const summaries = scripts.map((_script, index) => ({ outcome: 'disabled' as PromptRegexOutcome, affectedMessages: 0, index }))
  const replacements: PromptRegexViewRecord['replacements'][number][] = []
  // 0.2.1: 正则作用于楼层编辑后的文本（message-edit 投影记录），而非 durable 原文。
  const edits = messageEditContents(session.snapshotEvents())
  for (const [index, node] of nodes.entries()) {
    const baseline = edits.get(node.current.seq) ?? messageOf(node.original).content
    const rendered = transformedContent(
      baseline,
      card,
      node.role === 'user' ? USER_INPUT_PLACEMENT : AI_OUTPUT_PLACEMENT,
      nodes.length - index - 1,
      plan.participantName,
      scripts,
    )
    for (const [scriptIndex, outcome] of rendered.outcomes.entries()) {
      const summary = summaries[scriptIndex]
      if (summary === undefined) continue
      if (outcomeRank(outcome) > outcomeRank(summary.outcome)) summary.outcome = outcome
      if (outcome === 'applied') summary.affectedMessages += 1
    }
    // 幂等：与当前派生（含既有投影）内容一致就不重复改写。
    const derived = session.deriveEventMessage(node.current)
    if (derived !== null && sameContent(derived.content, rendered.content)) continue
    replacements.push({ seq: node.current.seq, content: rendered.content })
  }
  const record: PromptRegexTraceRecord = {
    format: 0,
    ...position,
    messageCount: nodes.length,
    replacementCount: replacements.length,
    scripts: scripts.map((script, index) => ({
      source: plan.operations[index]?.owner === 'regex' ? 'regex'
        : plan.operations[index]?.owner === 'prompt-policy' ? 'preset' : 'character',
      index: plan.operations[index]?.ownerIndex ?? index,
      scriptName: script.scriptName,
      outcome: summaries[index]?.outcome ?? 'no-match',
      affectedMessages: summaries[index]?.affectedMessages ?? 0,
    })),
  }
  // 0.2.1: 不再 append replace 事件。一条插件记录承载全部改写与 trace，
  // 投影负责派生层生效；replacements 为空也落记录，trace 供客户端投影消费。
  appendAgentRpSessionEvent(session, 'plugin:agent-rp/prompt-regex-view', {
    format: 0,
    ...position,
    replacements,
    trace: record,
  })
  return record
}

/** Install the logged prompt-regex view before real Agent Loop provider calls. */
export function installPromptRegexStream(
  ctx: Context,
  agentForSession: (sessionId: string) => Agent | undefined,
  promptPlanForAgent: (agent: Agent) => RoleplayTurnPromptPlan | undefined = () => undefined,
): () => void {
  return installPromptRegexStreamHandler(
    ctx,
    options => preparePromptRegexStreamOptions(options, agentForSession, promptPlanForAgent),
  )
}

/** Install the provider seam on the exact context that owns one Agent Loop. */
export function installAgentPromptRegexStream(
  agent: Agent,
  promptPlanForAgent: (agent: Agent) => RoleplayTurnPromptPlan | undefined = () => undefined,
): void {
  agent.ctx.effect(() => installPromptRegexStream(
    llmStreamOwnerContext(agent.ctx),
    sessionId => sessionId === String(agent.session.id) ? agent : undefined,
    promptPlanForAgent,
  ), `agent-rp: provider message preparation for ${agent.session.id}`)
}
