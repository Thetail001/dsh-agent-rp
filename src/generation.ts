/** Persistent Roleplay reply versions and direct generation commands. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  createAssistantMessage,
  createUserMessage,
  type AssistantMessage,
  type ContentBlock,
} from '@deepseek-ai/dsh-llm'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { readCurrentMvuState } from './mvu.ts'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'

/** A complete reply-version group snapshot stored after every mutation. */
export interface GenerationStateRecord {
  readonly format: 0
  readonly groupId: string
  readonly operation: 'regenerate' | 'continue' | 'select'
  readonly originSeq: number
  readonly anchorSeq: number
  readonly assistantSeqs: readonly number[]
  readonly versions: readonly {
    readonly seq: number
    readonly text: string
  }[]
  readonly selectedVersionSeq: number
  readonly surfaceSeq: number
  readonly mvu?: {
    readonly statData: JsonValue
    readonly updateCount: number
    readonly lastError?: string
  }
}

/** Browser request sent through the private generation command. */
export type GenerationRequest =
  | { readonly operation: 'regenerate'; readonly replySeq: number }
  | { readonly operation: 'continue'; readonly replySeq: number }
  | { readonly operation: 'select'; readonly replySeq: number; readonly versionIndex: number }

/** A validated reply-version group reconstructed from the latest snapshot event. */
export interface ActiveGenerationGroup extends GenerationStateRecord {
  readonly eventSeq: number
}

const RESULT_PREFIX = 'agent-rp-generation-v0:'

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}必须是对象`)
  return value as Record<string, unknown>
}

function eventSeq(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label}无效`)
  return value
}

/** Parse one browser generation request without accepting extra fields. */
export function parseGenerationRequest(source: string): GenerationRequest {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('回复操作请求不是有效 JSON', { cause: error })
  }
  const request = object(value, '回复操作请求')
  const replySeq = eventSeq(request.replySeq, '回复序号')
  if (request.operation === 'regenerate' || request.operation === 'continue') {
    if (Object.keys(request).some(key => key !== 'operation' && key !== 'replySeq')) throw new Error('回复操作请求包含未知字段')
    return { operation: request.operation, replySeq }
  }
  if (request.operation === 'select') {
    const versionIndex = eventSeq(request.versionIndex, '版本序号')
    if (Object.keys(request).some(key => key !== 'operation' && key !== 'replySeq' && key !== 'versionIndex')) {
      throw new Error('回复操作请求包含未知字段')
    }
    return { operation: 'select', replySeq, versionIndex }
  }
  throw new Error('未知的回复操作')
}

function uniqueSeqs(value: readonly number[], label: string): readonly number[] {
  if (value.length === 0 || value.some(seq => !Number.isSafeInteger(seq) || seq < 0)
    || new Set(value).size !== value.length) throw new Error(`${label}无效`)
  return value
}

function parseGenerationState(data: GenerationStateRecord, eventSeq: number): ActiveGenerationGroup {
  const assistantSeqs = uniqueSeqs(data.assistantSeqs, '回复来源序号')
  const versionSeqs = uniqueSeqs(data.versions.map(version => version.seq), '回复版本序号')
  if (data.format !== 0 || !/^[0-9a-f-]{36}$/iu.test(data.groupId)
    || (data.operation !== 'regenerate' && data.operation !== 'continue' && data.operation !== 'select')
    || !Number.isSafeInteger(data.originSeq) || data.originSeq < 0
    || !Number.isSafeInteger(data.anchorSeq) || data.anchorSeq < 0
    || !Number.isSafeInteger(data.selectedVersionSeq) || data.selectedVersionSeq < 0
    || !Number.isSafeInteger(data.surfaceSeq) || data.surfaceSeq < 0
    || data.versions.some(version => typeof version.text !== 'string' || version.text.trim() === '')
    || versionSeqs[0] !== data.originSeq
    || !versionSeqs.includes(data.selectedVersionSeq)
    || !assistantSeqs.includes(data.originSeq)) throw new Error('回复版本事件无效')
  return { ...data, eventSeq }
}

/** Encode one complete reply-version snapshot into a supported command result. */
export function encodeGenerationState(data: GenerationStateRecord): string {
  return `${RESULT_PREFIX}${JSON.stringify(data)}`
}

/** Decode one reply-version snapshot, declining unrelated command output. */
export function decodeGenerationState(source: string | undefined): GenerationStateRecord | undefined {
  if (source?.startsWith(RESULT_PREFIX) !== true) return undefined
  let value: unknown
  try {
    value = JSON.parse(source.slice(RESULT_PREFIX.length))
  } catch (error: unknown) {
    throw new Error('回复版本结果不是有效 JSON', { cause: error })
  }
  return object(value, '回复版本结果') as unknown as GenerationStateRecord
}

/** Fold the latest durable snapshot for every reply group. */
export function readGenerationGroups(events: readonly SessionEvent[]): readonly ActiveGenerationGroup[] {
  const groups = new Map<string, ActiveGenerationGroup>()
  for (const event of events) {
    const data = event.type === 'command/done' && event.data.kind === 'success'
      ? decodeGenerationState(event.data.text)
      : event.type === ('agent-rp/generation-state' as SessionEvent['type'])
        ? (event as SessionEvent & { readonly data: GenerationStateRecord }).data
        : undefined
    if (data === undefined) continue
    const group = parseGenerationState(data, event.seq)
    for (const seq of [...group.assistantSeqs, ...group.versions.map(version => version.seq), group.anchorSeq, group.surfaceSeq]) {
      if (seq >= event.seq || events[seq]?.type !== 'assistant/message') throw new Error('回复版本引用了不存在的助手消息')
    }
    groups.set(group.groupId, group)
  }
  return [...groups.values()].sort((left, right) => left.eventSeq - right.eventSeq)
}

function assistantEvent(events: readonly SessionEvent[], seq: number): Extract<SessionEvent, { type: 'assistant/message' }> {
  const event = events[seq]
  if (event?.type !== 'assistant/message') throw new Error('目标回复不存在')
  return event
}

function visibleText(event: Extract<SessionEvent, { type: 'assistant/message' }>): string {
  return event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n').trim()
}

function replacementMessage(message: AssistantMessage, content: ContentBlock[] = message.content): AssistantMessage {
  const { kind: _kind, ...source } = message.source
  return createAssistantMessage({ content, source })
}

function continuedContent(before: readonly ContentBlock[], continuation: readonly ContentBlock[]): ContentBlock[] {
  const result = structuredClone([...before, ...continuation])
  const joinAt = before.length - 1
  const left = result[joinAt]
  const right = result[joinAt + 1]
  if (left?.type === 'text' && right?.type === 'text') {
    result.splice(joinAt, 2, { type: 'text', text: `${left.text}${right.text}` })
  }
  return result
}

function sourceSeqs(nodes: readonly number[], selectedVersionSeq: number): number[] {
  return [...new Set([...nodes, selectedVersionSeq])]
}

function appendCurrentReplySurface(
  agent: Agent,
  currentSurfaceSeq: number,
  selected: Extract<SessionEvent, { type: 'assistant/message' }>,
  content?: ContentBlock[],
): Extract<SessionEvent, { type: 'assistant/message' }> {
  const nodes = [...agent.session.surface.nodes]
  const startIndex = nodes.indexOf(currentSurfaceSeq)
  if (startIndex < 0) throw new Error('回复已不在当前对话末尾')
  const shadowed = nodes.slice(startIndex)
  const start = shadowed[0]
  const end = shadowed.at(-1)
  if (start === undefined || end === undefined) throw new Error('当前回复不可替换')
  return agent.session.append('assistant/message', {
    turn: selected.data.turn,
    step: selected.data.step,
    message: replacementMessage(selected.data.message, content),
    ...(selected.data.usage === undefined ? {} : { usage: selected.data.usage }),
  }, {
    surfaceOp: { op: 'replace', start, end },
    sourceEventSeqs: sourceSeqs(shadowed, selected.seq),
  })
}

function latestReply(
  agent: Agent,
  replySeq: number,
): { readonly group?: ActiveGenerationGroup; readonly surfaceSeq: number; readonly selectedSeq: number } {
  const events = agent.session.events
  const surfaceSeq = agent.session.surface.nodes.at(-1)
  if (surfaceSeq === undefined) throw new Error('当前会话还没有角色回复')
  const groups = readGenerationGroups(events)
  const group = groups.findLast(candidate => candidate.anchorSeq === replySeq)
  if (group !== undefined) {
    if (group.surfaceSeq !== surfaceSeq) {
      const currentSurface = assistantEvent(events, surfaceSeq)
      const selected = group.versions.find(version => version.seq === group.selectedVersionSeq)
      if (selected === undefined || visibleText(currentSurface) !== selected.text) {
        throw new Error('只能操作对话末尾的角色回复')
      }
    }
    return { group, surfaceSeq, selectedSeq: group.selectedVersionSeq }
  }
  const reply = assistantEvent(events, replySeq)
  if (reply.surfaceOp !== 'append' || surfaceSeq !== reply.seq || visibleText(reply) === '') {
    throw new Error('只能操作对话末尾的角色回复')
  }
  return { surfaceSeq, selectedSeq: reply.seq }
}

function mvuSnapshot(agent: Agent): GenerationStateRecord['mvu'] {
  const active = readActiveSessionCharacter(agent.session.events)
  if (active === undefined) return undefined
  const surfaceEvents = agent.session.surface.nodes.map(seq => agent.session.events[seq]!).filter(event => event.type === 'assistant/message')
  return readCurrentMvuState(cardFromImportMeta(active.meta), surfaceEvents)
}

function appendState(
  agent: Agent,
  record: Omit<GenerationStateRecord, 'format' | 'mvu'>,
): GenerationStateRecord {
  const mvu = mvuSnapshot(agent)
  return {
    format: 0,
    ...record,
    ...(mvu === undefined ? {} : { mvu }),
  }
}

function instruction(operation: 'regenerate' | 'continue'): string {
  return operation === 'regenerate'
    ? 'Write a fresh alternative response to the latest user turn. Stay fully in character and preserve established facts, but do not mention, summarize, revise, or continue the previous response. Output only the replacement roleplay response.'
    : 'Continue the latest in-character response seamlessly from its final sentence. Do not repeat or summarize any existing text. Output only the continuation.'
}

async function generate(agent: Agent, operation: 'regenerate' | 'continue', signal: AbortSignal): Promise<number> {
  if (agent.status !== 'idle' || agent.inbox.hasPending) throw new Error('请等待当前回复完成后再操作')
  const before = agent.session.seq
  const onAbort = (): void => { agent.cancel({ kind: 'user' }) }
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    agent.followup(createUserMessage({
      content: [{ type: 'text', text: instruction(operation) }],
      source: {
        kind: 'plugin',
        plugin: 'dsh-agent-rp-generation',
        form: 'notice',
        summary: operation === 'regenerate' ? '正在重写角色回复' : '正在续写角色回复',
      },
    }))
    await agent.whenIdle()
    signal.throwIfAborted()
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
  const generated = agent.session.events.slice(before)
    .findLast((event): event is Extract<SessionEvent, { type: 'assistant/message' }> =>
      event.type === 'assistant/message' && event.surfaceOp === 'append')
  if (generated === undefined || visibleText(generated) === '') throw new Error('模型没有生成可用的角色回复')
  return generated.seq
}

/** Execute Regenerate, Swipe selection, or Continue against the current Roleplay reply. */
export async function executeGenerationCommand(invocation: {
  readonly agent: Agent
  readonly rawInput: string
  readonly signal: AbortSignal
}): Promise<{ readonly kind: 'success'; readonly text: string; readonly sourceEventSeq: number }> {
  const request = parseGenerationRequest(invocation.rawInput)
  const current = latestReply(invocation.agent, request.replySeq)
  const events = invocation.agent.session.events
  const existing = current.group
  const groupId = existing?.groupId ?? crypto.randomUUID()
  const originSeq = existing?.originSeq ?? current.selectedSeq
  const assistantSeqs = [...(existing?.assistantSeqs ?? [originSeq])]
  const versions = [...(existing?.versions ?? [{
    seq: originSeq,
    text: visibleText(assistantEvent(events, originSeq)),
  }])]

  if (request.operation === 'select') {
    const selectedVersion = versions[request.versionIndex]
    if (selectedVersion === undefined) throw new Error('所选回复版本不存在')
    const selectedSeq = selectedVersion.seq
    if (selectedSeq === current.selectedSeq) {
      if (existing === undefined) throw new Error('当前回复还没有其他版本')
      return { kind: 'success', text: encodeGenerationState(existing), sourceEventSeq: existing.surfaceSeq }
    }
    const selected = assistantEvent(events, selectedSeq)
    const surface = appendCurrentReplySurface(invocation.agent, current.surfaceSeq, selected)
    const state = appendState(invocation.agent, {
      groupId, operation: 'select', originSeq,
      anchorSeq: existing?.anchorSeq ?? originSeq,
      assistantSeqs, versions, selectedVersionSeq: selectedSeq, surfaceSeq: surface.seq,
    })
    return { kind: 'success', text: encodeGenerationState(state), sourceEventSeq: state.surfaceSeq }
  }

  let generatedSeq: number | undefined
  try {
    generatedSeq = await generate(invocation.agent, request.operation, invocation.signal)
    const generated = assistantEvent(invocation.agent.session.events, generatedSeq)
    assistantSeqs.push(generatedSeq)
    let selectedSeq = generatedSeq
    let surface
    if (request.operation === 'continue') {
      const selected = assistantEvent(invocation.agent.session.events, current.selectedSeq)
      const content = continuedContent(selected.data.message.content, generated.data.message.content)
      surface = appendCurrentReplySurface(invocation.agent, current.surfaceSeq, generated, content)
      selectedSeq = surface.seq
      versions.push({
        seq: selectedSeq,
        text: content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n').trim(),
      })
    } else {
      surface = appendCurrentReplySurface(invocation.agent, current.surfaceSeq, generated)
      versions.push({ seq: selectedSeq, text: visibleText(generated) })
    }
    const state = appendState(invocation.agent, {
      groupId, operation: request.operation, originSeq,
      anchorSeq: existing?.anchorSeq ?? request.replySeq,
      assistantSeqs, versions, selectedVersionSeq: selectedSeq, surfaceSeq: surface.seq,
    })
    return { kind: 'success', text: encodeGenerationState(state), sourceEventSeq: state.surfaceSeq }
  } catch (error: unknown) {
    const surfaceNodes = invocation.agent.session.surface.nodes
    if (surfaceNodes.includes(current.surfaceSeq) && surfaceNodes.at(-1) !== current.surfaceSeq) {
      const selected = assistantEvent(invocation.agent.session.events, current.selectedSeq)
      appendCurrentReplySurface(invocation.agent, current.surfaceSeq, selected)
    }
    throw error
  }
}
