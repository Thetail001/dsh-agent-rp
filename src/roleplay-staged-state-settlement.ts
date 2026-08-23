/** Post-narrative state settlement driven at DSH's native turn-stopping boundary. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  BlockAssembler,
  createUserMessage,
  ReasoningEffortId,
  type GenerateOptions,
} from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { jsonrepair } from 'jsonrepair'
import {
  roleplayActModelDispatch,
  roleplayActModelFailure,
  type RoleplayActModelDispatch,
  type RoleplayActModelFailureKind,
} from './roleplay-act-model-log.ts'
import {
  type RoleplayStateActionPlan,
} from './roleplay-state-action.ts'
import { parseRoleplayStateOperations } from './roleplay-state-operations.ts'
import type { BoundRoleplayTurnPlan, RoleplayTurnPlanReference } from './roleplay-turn-settlement.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'
import type { MvuStateOperation } from './mvu.ts'

/** Exact provider request dispatched after the visible Roleplay reply has finished. */
export interface RoleplayStagedStateRequestRecord {
  readonly format: 0
  readonly requestId: string
  readonly sessionId: string
  readonly turn: number
  readonly step: number
  readonly throughEventSeq: number
  readonly planEventSeq: number
  readonly target: Omit<RoleplayStateActionPlan, 'instructions'>
  readonly dispatch: RoleplayActModelDispatch
}

/** Terminal, replayable result of one post-narrative state calculation. */
export interface RoleplayStagedStateResultRecord {
  readonly format: 0
  readonly requestId: string
  readonly requestSeq: number
  readonly result:
    | {
        readonly kind: 'success'
        readonly text: string
        readonly operations: readonly MvuStateOperation[]
      }
    | {
        readonly kind: 'failure'
        readonly failure: RoleplayActModelFailureKind
      }
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Ignorable exact request made by the post-narrative settlement stage. */
    'agent-rp/staged-state-request': RoleplayStagedStateRequestRecord
    /** Ignorable terminal result consumed by turn settlement. */
    'agent-rp/staged-state-result': RoleplayStagedStateResultRecord
  }
}

export interface CollectedRoleplayStagedStateSettlement {
  readonly requestEventSeq: number
  readonly resultEventSeq: number
  readonly throughEventSeq: number
  readonly target: Omit<RoleplayStateActionPlan, 'instructions'>
  readonly outcome: 'success' | 'failed'
  readonly operations: readonly MvuStateOperation[]
  readonly error?: string
}

function targetReceipt(target: RoleplayStateActionPlan): Omit<RoleplayStateActionPlan, 'instructions'> {
  return {
    engine: target.engine,
    tool: target.tool,
    moduleId: target.moduleId,
    stateId: target.stateId,
    expectedRevision: target.expectedRevision,
    operations: [...target.operations],
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function referenceTarget(
  reference: RoleplayTurnPlanReference,
  stateId: string,
): Omit<RoleplayStateActionPlan, 'instructions'> | undefined {
  const action = reference.receipt?.act?.strategy === 'agent'
    ? reference.receipt.act.stateActions?.find(candidate => candidate.stateId === stateId)
    : undefined
  return action === undefined ? undefined : targetReceipt(action)
}

function parseStateSettlementResponse(text: unknown): readonly MvuStateOperation[] {
  if (typeof text !== 'string') throw new Error('Roleplay staged state result text is invalid')
  if (text.length > 256 * 1024) throw new Error('Roleplay staged state result is too large')
  const unfenced = text.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '')
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Roleplay staged state result has no JSON object')
  const value = JSON.parse(jsonrepair(unfenced.slice(start, end + 1))) as unknown
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || Object.keys(value).some(key => key !== 'operations')) {
    throw new Error('Roleplay staged state result fields are invalid')
  }
  return parseRoleplayStateOperations((value as { operations?: unknown }).operations, { allowEmpty: true })
}

function turnText(
  events: readonly SessionEvent[],
  turn: number,
  role: 'user/message' | 'assistant/message',
  throughEventSeq: number,
): string {
  const turnStartSeq = events.findLast(event => event.type === 'turn/start'
    && event.data.turn === turn)?.seq ?? -1
  const text = events.flatMap((event) => {
    if (event.seq <= turnStartSeq || event.seq > throughEventSeq || event.type !== role) return []
    if (role === 'assistant/message') {
      const assistant = event as SessionEvent<'assistant/message'>
      if (assistant.data.turn !== turn) return []
      return assistant.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : [])
    }
    const user = event as SessionEvent<'user/message'>
    return user.data.content.flatMap(block => block.type === 'text' ? [block.text] : [])
  }).join('\n\n')
  return text.length <= 128 * 1024 ? text : text.slice(text.length - 128 * 1024)
}

function settlementRequest(
  agent: Agent,
  turn: number,
  throughEventSeq: number,
  target: RoleplayStateActionPlan,
  current: unknown,
  signal: AbortSignal,
): GenerateOptions {
  const header = agent.session.requestHeader()
  if (header === undefined) throw new Error('Roleplay staged settlement has no provider request header')
  const operations = target.operations.join('、')
  return {
    ...header.config,
    reasoningEffort: ReasoningEffortId('off'),
    temperature: 0,
    maxTokens: Math.min(header.config.maxTokens ?? 4096, 4096),
    system: [
      '你是角色扮演运行时的后台状态结算器。剧情正文已经完成；不要续写、改写、评价或解释剧情。',
      '比较本轮玩家输入、角色正文与当前状态，只计算正文已经造成的状态变化。',
      `只允许这些操作：${operations}。数值增减优先使用 delta；不要返回完整状态。`,
      '只返回一个 JSON 对象：{"operations":[...]}。没有变化时返回 {"operations":[]}。不要使用 Markdown。',
    ].join('\n'),
    messages: [createUserMessage({
      source: { kind: 'plugin', plugin: 'dsh-agent-rp' },
      content: [{
        type: 'text',
        text: [
          '<current_state>',
          JSON.stringify(current),
          '</current_state>',
          '<player_input>',
          turnText(agent.session.events, turn, 'user/message', throughEventSeq),
          '</player_input>',
          '<roleplay_reply>',
          turnText(agent.session.events, turn, 'assistant/message', throughEventSeq),
          '</roleplay_reply>',
          '<imported_state_rules>',
          target.instructions ?? '只更新剧情中明确发生变化的状态。',
          '</imported_state_rules>',
        ].join('\n'),
      }],
    })],
    signal,
  }
}

function matchingPlanEvent(
  events: readonly SessionEvent[],
  turn: number,
  plan: BoundRoleplayTurnPlan,
): SessionEvent<'agent-rp/turn-plan'> {
  const matches = events.filter((event): event is SessionEvent<'agent-rp/turn-plan'> =>
    event.type === 'agent-rp/turn-plan' && event.data.turn === turn
      && event.data.reference.step === plan.step)
  if (matches.length !== 1 || !sameJson(matches[0]!.data.reference.input, plan.plan.input)) {
    throw new Error('Roleplay staged settlement has no unique prepared plan')
  }
  return matches[0]!
}

function stepEnd(
  events: readonly SessionEvent[],
  turn: number,
  step: number,
): SessionEvent<'step/end'> {
  const event = events.findLast((candidate): candidate is SessionEvent<'step/end'> =>
    candidate.type === 'step/end' && candidate.data.turn === turn && candidate.data.step === step)
  if (event === undefined) throw new Error('Roleplay staged settlement requires a closed Agent step')
  return event
}

function terminalForCoverage(
  events: readonly SessionEvent[],
  turn: number,
  throughEventSeq: number,
): boolean {
  const requests = events.filter((event): event is SessionEvent<'agent-rp/staged-state-request'> =>
    event.type === 'agent-rp/staged-state-request' && event.data.turn === turn
      && event.data.throughEventSeq === throughEventSeq)
  return requests.some(request => events.some(event => event.type === 'agent-rp/staged-state-result'
    && event.data.requestSeq === request.seq))
}

/** Run the state calculation once for the latest completed Agent step. */
export async function runRoleplayStagedStateSettlement(input: {
  readonly ctx: Context
  readonly agent: Agent
  readonly turn: number
  readonly plan: BoundRoleplayTurnPlan
  readonly signal: AbortSignal
}): Promise<void> {
  const target = input.plan.plan.act.stateActions[0]
  if (target === undefined) return
  const state = input.plan.plan.stateReads.find(read => read.id === target.stateId)
  if (state?.value === undefined) return
  const planEvent = matchingPlanEvent(input.agent.session.events, input.turn, input.plan)
  const through = stepEnd(input.agent.session.events, input.turn, input.plan.step)
  if (terminalForCoverage(input.agent.session.events, input.turn, through.seq)) return
  const request = settlementRequest(
    input.agent,
    input.turn,
    through.seq,
    target,
    state.value,
    input.signal,
  )
  const requestId = crypto.randomUUID()
  const requestEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/staged-state-request', {
    format: 0,
    requestId,
    sessionId: String(input.agent.session.id),
    turn: input.turn,
    step: input.plan.step,
    throughEventSeq: through.seq,
    planEventSeq: planEvent.seq,
    target: targetReceipt(target),
    dispatch: roleplayActModelDispatch(request),
  })
  try {
    await input.ctx.sessions.flush(input.agent.session)
    const assembler = new BlockAssembler()
    for await (const chunk of input.ctx.llm.stream(request)) assembler.push(chunk)
    if (assembler.finish.kind === 'error' || assembler.finish.kind === 'aborted') {
      appendAgentRpSessionEvent(input.agent.session, 'agent-rp/staged-state-result', {
        format: 0,
        requestId,
        requestSeq: requestEvent.seq,
        result: {
          kind: 'failure',
          failure: assembler.finish.kind === 'aborted' ? 'aborted' : 'provider',
        },
      })
      return
    }
    const text = assembler.blocks().flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
    const operations = parseStateSettlementResponse(text)
    if (operations.some(operation => !target.operations.includes(operation.op))) {
      throw new Error('Roleplay staged state result uses an operation outside its prepared plan')
    }
    appendAgentRpSessionEvent(input.agent.session, 'agent-rp/staged-state-result', {
      format: 0,
      requestId,
      requestSeq: requestEvent.seq,
      result: { kind: 'success', text, operations },
    })
  } catch (error: unknown) {
    if (!input.agent.session.events.some(event => event.type === 'agent-rp/staged-state-result'
      && event.data.requestSeq === requestEvent.seq)) {
      appendAgentRpSessionEvent(input.agent.session, 'agent-rp/staged-state-result', {
        format: 0,
        requestId,
        requestSeq: requestEvent.seq,
        result: { kind: 'failure', failure: roleplayActModelFailure(error) },
      })
    }
  }
}

/** Validate and select the calculation covering the final completed step of a closed turn. */
export function collectRoleplayStagedStateSettlement(input: {
  readonly events: readonly SessionEvent[]
  readonly sessionId: string
  readonly turn: number
  readonly plans: readonly RoleplayTurnPlanReference[]
}): CollectedRoleplayStagedStateSettlement | undefined {
  const requests = new Map<number, SessionEvent<'agent-rp/staged-state-request'>>()
  const results = new Map<number, SessionEvent<'agent-rp/staged-state-result'>>()
  const requestIds = new Set<string>()
  for (const event of input.events) {
    if (event.type === 'agent-rp/staged-state-request' && event.data.turn === input.turn) {
      const data = event.data
      const target = typeof data.target === 'object' && data.target !== null && !Array.isArray(data.target)
        ? data.target : undefined
      const stateId = target === undefined ? undefined : (target as { readonly stateId?: unknown }).stateId
      const planEvent = Number.isSafeInteger(data.planEventSeq) ? input.events[data.planEventSeq] : undefined
      const through = Number.isSafeInteger(data.throughEventSeq) ? input.events[data.throughEventSeq] : undefined
      const reference = input.plans.find(plan => plan.step === data.step)
      const expectedTarget = reference === undefined || typeof stateId !== 'string'
        ? undefined : referenceTarget(reference, stateId)
      const dispatch = typeof data.dispatch === 'object' && data.dispatch !== null && !Array.isArray(data.dispatch)
        ? data.dispatch : undefined
      if (data.format !== 0 || data.sessionId !== input.sessionId
        || typeof data.requestId !== 'string' || data.requestId === '' || requestIds.has(data.requestId)
        || !Number.isSafeInteger(data.step) || data.step <= 0
        || planEvent?.type !== 'agent-rp/turn-plan' || planEvent.seq >= event.seq
        || planEvent.data.turn !== input.turn || !sameJson(planEvent.data.reference, reference)
        || through?.type !== 'step/end' || through.seq >= event.seq
        || through.data.turn !== input.turn || through.data.step !== data.step
        || expectedTarget === undefined || !sameJson(expectedTarget, data.target)
        || dispatch === undefined || typeof dispatch.provider !== 'string' || dispatch.provider === ''
        || typeof dispatch.model !== 'string' || dispatch.model === '' || !Array.isArray(dispatch.messages)
        || (dispatch.system !== undefined && typeof dispatch.system !== 'string')
        || (dispatch.reasoningEffort !== undefined && typeof dispatch.reasoningEffort !== 'string')
        || (dispatch.temperature !== undefined
          && (typeof dispatch.temperature !== 'number' || !Number.isFinite(dispatch.temperature)))
        || (dispatch.maxTokens !== undefined
          && (!Number.isSafeInteger(dispatch.maxTokens) || dispatch.maxTokens <= 0))) {
        throw new Error('Roleplay staged state request is invalid')
      }
      requestIds.add(data.requestId)
      requests.set(event.seq, event)
    } else if (event.type === 'agent-rp/staged-state-result') {
      const recordedRequest = Number.isSafeInteger(event.data.requestSeq)
        ? input.events[event.data.requestSeq] : undefined
      if (recordedRequest?.type !== 'agent-rp/staged-state-request'
        || recordedRequest.data.turn !== input.turn) continue
      const request = requests.get(event.data.requestSeq)
      if (event.data.format !== 0 || request === undefined || request.seq >= event.seq
        || typeof event.data.requestId !== 'string' || event.data.requestId !== request.data.requestId
        || typeof event.data.result !== 'object' || event.data.result === null
        || Array.isArray(event.data.result) || results.has(request.seq)) {
        throw new Error('Roleplay staged state result is invalid')
      }
      if (event.data.result.kind === 'success') {
        const parsed = parseStateSettlementResponse(event.data.result.text)
        if (!Array.isArray(event.data.result.operations) || !sameJson(parsed, event.data.result.operations)
          || parsed.some(operation => !request.data.target.operations.includes(operation.op))) {
          throw new Error('Roleplay staged state operations do not match their request')
        }
      } else if (event.data.result.kind !== 'failure'
        || (event.data.result.failure !== 'aborted' && event.data.result.failure !== 'provider'
          && event.data.result.failure !== 'unknown')) {
        throw new Error('Roleplay staged state result is invalid')
      }
      results.set(request.seq, event)
    }
  }
  const latest = [...requests.values()].sort((left, right) =>
    right.data.throughEventSeq - left.data.throughEventSeq || right.seq - left.seq)[0]
  if (latest === undefined) return undefined
  const finalStep = input.events.findLast((event): event is SessionEvent<'step/end'> =>
    event.type === 'step/end' && event.data.turn === input.turn)
  if (finalStep === undefined || latest.data.throughEventSeq !== finalStep.seq) return undefined
  const result = results.get(latest.seq)
  if (result === undefined) throw new Error('Roleplay staged state request has no terminal result')
  return result.data.result.kind === 'success'
    ? {
        requestEventSeq: latest.seq,
        resultEventSeq: result.seq,
        throughEventSeq: latest.data.throughEventSeq,
        target: latest.data.target,
        outcome: 'success',
        operations: result.data.result.operations,
      }
    : {
        requestEventSeq: latest.seq,
        resultEventSeq: result.seq,
        throughEventSeq: latest.data.throughEventSeq,
        target: latest.data.target,
        outcome: 'failed',
        operations: [],
        error: `后台状态结算失败（${result.data.result.failure}）`,
      }
}
