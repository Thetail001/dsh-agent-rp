/** Logged research, character, director, section, and editor Workers for one story turn. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  BlockAssembler,
  createUserMessage,
  ReasoningEffortId,
  type GenerateOptions,
} from '@deepseek-ai/dsh-llm'
import type { SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import { roleplayActModelDispatch, roleplayActModelFailure, type RoleplayActModelDispatch, type RoleplayActModelFailureKind } from './roleplay-act-model-log.ts'
import { appendAgentRpSessionEvent } from './session-event-compat.ts'
import { compileStoryCharacterContext } from './story-workspace.ts'
import type { StoryWorkspaceSnapshot } from './story-workspace-protocol.ts'
import { searchStoryWorkspaceSources } from './story-research.ts'

/** Ordered model responsibilities before the visible character request. */
export type StoryTurnStage = 'research' | 'character' | 'director' | 'section' | 'editor'

/** Exact auxiliary request dispatched by the story pipeline. */
export interface StoryTurnStageRequestRecord {
  readonly format: 0
  readonly requestId: string
  readonly sessionId: string
  readonly workspaceId: string
  readonly workspaceRevision: number
  readonly turn: number
  readonly step: number
  readonly stage: StoryTurnStage
  readonly subjectId?: string
  readonly dispatch: RoleplayActModelDispatch
}

/** Terminal output or stable failure for one story-pipeline request. */
export interface StoryTurnStageResultRecord {
  readonly format: 0
  readonly requestId: string
  readonly requestSeq: number
  readonly result:
    | { readonly kind: 'success'; readonly text: string }
    | { readonly kind: 'failure'; readonly failure: RoleplayActModelFailureKind }
}

/** Final draft and provenance made visible to the top-level character Agent. */
export interface StoryTurnBriefRecord {
  readonly format: 0
  readonly sessionId: string
  readonly workspaceId: string
  readonly workspaceRevision: number
  readonly turn: number
  readonly step: number
  readonly resultEventSeqs: readonly number[]
  readonly directorBrief: string
  readonly finalDraft: string
  readonly modelContext: string
}

/** Logged network-search request generated from an enabled Web source. */
export interface StoryWebSearchRequestRecord {
  readonly format: 0
  readonly sessionId: string
  readonly workspaceId: string
  readonly workspaceRevision: number
  readonly turn: number
  readonly step: number
  readonly query: string
  readonly maxResults: number
}

/** Logged portable network-search result consumed by the research Worker. */
export interface StoryWebSearchResultRecord {
  readonly format: 0
  readonly requestSeq: number
  readonly result:
    | {
        readonly kind: 'success'
        readonly content?: string
        readonly sources: readonly {
          readonly url: string
          readonly title?: string
          readonly snippet?: string
          readonly publishedAt?: string
        }[]
        readonly truncated: boolean
      }
    | { readonly kind: 'failure'; readonly failure: 'unavailable' | 'aborted' | 'provider' }
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Ignorable exact request sent to one story-pipeline Worker. */
    'agent-rp/story-stage-request': StoryTurnStageRequestRecord
    /** Ignorable terminal result from one story-pipeline Worker. */
    'agent-rp/story-stage-result': StoryTurnStageResultRecord
    /** Ignorable final story brief consumed by the visible character request. */
    'agent-rp/story-turn-brief': StoryTurnBriefRecord
    /** Ignorable exact web query made for one story turn. */
    'agent-rp/story-web-search-request': StoryWebSearchRequestRecord
    /** Ignorable portable web-search result consumed by story research. */
    'agent-rp/story-web-search-result': StoryWebSearchResultRecord
  }
}

interface StageOutput {
  readonly text?: string
  readonly resultEventSeq: number
}

interface StoryWebSearchGateway {
  search(request: { readonly query: string; readonly maxResults: number }, signal?: AbortSignal): Promise<{
    readonly content?: string
    readonly sources: readonly {
      readonly url: string
      readonly title?: string
      readonly snippet?: string
      readonly publishedAt?: string
    }[]
    readonly truncated: boolean
  }>
}

/** Inputs owned by one accepted Agent-loop step. */
export interface RunStoryTurnPipelineInput {
  readonly ctx: Context
  readonly agent: Agent
  readonly workspace: StoryWorkspaceSnapshot
  readonly turn: number
  readonly step: number
  readonly messages: readonly UserMessage[]
  readonly signal: AbortSignal
}

function messageText(messages: readonly UserMessage[]): string {
  return messages.flatMap(message => message.content.flatMap(block => block.type === 'text' ? [block.text] : []))
    .join('\n').trim()
}

function transcriptText(agent: Agent): string {
  const text = agent.session.deriveMessages().flatMap(message =>
    message.content.flatMap(block => block.type === 'text' ? [block.text] : [])).join('\n')
  return text.length <= 24_000 ? text : text.slice(-24_000)
}

function webSearchGateway(ctx: Context): StoryWebSearchGateway | undefined {
  const accessor = ctx as unknown as { readonly get?: (name: string) => unknown }
  if (typeof accessor.get !== 'function') return undefined
  try {
    const candidate = accessor.get('web') as Partial<StoryWebSearchGateway> | undefined
    return candidate !== undefined && typeof candidate.search === 'function'
      ? candidate as StoryWebSearchGateway
      : undefined
  } catch {
    return undefined
  }
}

function webFailure(error: unknown): 'unavailable' | 'aborted' | 'provider' {
  const message = error instanceof Error ? error.message : String(error)
  if (/abort|cancel|取消|中止/iu.test(message)) return 'aborted'
  if (/unavailable|not registered|missing|不可用|未配置/iu.test(message)) return 'unavailable'
  return 'provider'
}

function webSearchText(result: Extract<StoryWebSearchResultRecord['result'], { readonly kind: 'success' }>): string {
  return [
    result.content ?? '',
    ...result.sources.map(source => [
      `### ${source.title ?? source.url}`,
      source.url,
      source.snippet ?? '',
      source.publishedAt === undefined ? '' : `发布时间：${source.publishedAt}`,
    ].filter(Boolean).join('\n')),
  ].filter(Boolean).join('\n\n')
}

async function searchWeb(
  input: RunStoryTurnPipelineInput,
  playerInput: string,
  resultEventSeqs: number[],
): Promise<string> {
  const webSources = input.workspace.manifest.sources.filter(source => source.enabled && source.kind === 'web')
  if (webSources.length === 0) return ''
  const scope = webSources.map(source => {
    const content = input.workspace.documents.sources.find(document => document.id === source.id)?.content ?? ''
    return `${source.name}: ${content}`
  }).join('\n').slice(0, 2_000)
  const query = `${scope}\n${playerInput}`.trim().slice(0, 2_500)
  const requestEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-web-search-request', {
    format: 0,
    sessionId: String(input.agent.session.id),
    workspaceId: input.workspace.manifest.id,
    workspaceRevision: input.workspace.manifest.revision,
    turn: input.turn,
    step: input.step,
    query,
    maxResults: 6,
  })
  try {
    await input.ctx.sessions.flush(input.agent.session)
    const web = webSearchGateway(input.ctx)
    if (web === undefined) throw new Error('web search unavailable')
    const result = await web.search({ query, maxResults: 6 }, input.signal)
    const resultEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-web-search-result', {
      format: 0,
      requestSeq: requestEvent.seq,
      result: { kind: 'success', ...result },
    })
    resultEventSeqs.push(resultEvent.seq)
    return webSearchText({ kind: 'success', ...result })
  } catch (error: unknown) {
    const resultEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-web-search-result', {
      format: 0,
      requestSeq: requestEvent.seq,
      result: { kind: 'failure', failure: webFailure(error) },
    })
    resultEventSeqs.push(resultEvent.seq)
    return ''
  }
}

function baseGenerateOptions(input: RunStoryTurnPipelineInput): Pick<GenerateOptions, 'provider' | 'model' | 'maxTokens'> {
  const config = input.agent.session.requestHeader()?.config
  const provider = config?.provider ?? input.agent.options.provider
  const model = config?.model ?? input.agent.options.model
  if (provider === undefined || provider.trim() === '' || model === undefined || model.trim() === '') {
    throw new Error('故事流水线没有可用的模型路由')
  }
  const maxTokens = config?.maxTokens ?? input.agent.options.maxTokens
  return { provider, model, ...(maxTokens === undefined ? {} : { maxTokens }) }
}

function generateOptions(
  input: RunStoryTurnPipelineInput,
  system: string,
  body: string,
  maxTokens: number,
  temperature: number,
): GenerateOptions {
  const base = baseGenerateOptions(input)
  return {
    ...base,
    reasoningEffort: ReasoningEffortId('off'),
    temperature,
    maxTokens: Math.min(base.maxTokens ?? maxTokens, maxTokens),
    system,
    messages: [createUserMessage({
      source: { kind: 'plugin', plugin: 'dsh-agent-rp-story-engine' },
      content: [{ type: 'text', text: body }],
    })],
    signal: input.signal,
  }
}

async function runStage(
  input: RunStoryTurnPipelineInput,
  stage: StoryTurnStage,
  request: GenerateOptions,
  resultEventSeqs: number[],
  subjectId?: string,
): Promise<StageOutput> {
  const requestId = crypto.randomUUID()
  const requestEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-stage-request', {
    format: 0,
    requestId,
    sessionId: String(input.agent.session.id),
    workspaceId: input.workspace.manifest.id,
    workspaceRevision: input.workspace.manifest.revision,
    turn: input.turn,
    step: input.step,
    stage,
    ...(subjectId === undefined ? {} : { subjectId }),
    dispatch: roleplayActModelDispatch(request),
  })
  try {
    await input.ctx.sessions.flush(input.agent.session)
    const assembler = new BlockAssembler()
    for await (const chunk of input.ctx.llm.stream(request)) assembler.push(chunk)
    if (assembler.finish.kind === 'error' || assembler.finish.kind === 'aborted') {
      const resultEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-stage-result', {
        format: 0,
        requestId,
        requestSeq: requestEvent.seq,
        result: { kind: 'failure', failure: assembler.finish.kind === 'aborted' ? 'aborted' : 'provider' },
      })
      resultEventSeqs.push(resultEvent.seq)
      return { resultEventSeq: resultEvent.seq }
    }
    const text = assembler.blocks().flatMap(block => block.type === 'text' ? [block.text] : []).join('\n').trim()
    if (text === '' || text.length > 256 * 1_024) throw new Error('故事 Worker 返回了不可用文本')
    const resultEvent = appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-stage-result', {
      format: 0,
      requestId,
      requestSeq: requestEvent.seq,
      result: { kind: 'success', text },
    })
    resultEventSeqs.push(resultEvent.seq)
    return { text, resultEventSeq: resultEvent.seq }
  } catch (error: unknown) {
    const existing = input.agent.session.events.find(event => event.type === 'agent-rp/story-stage-result'
      && event.data.requestSeq === requestEvent.seq)
    const resultEvent = existing ?? appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-stage-result', {
      format: 0,
      requestId,
      requestSeq: requestEvent.seq,
      result: { kind: 'failure', failure: roleplayActModelFailure(error) },
    })
    resultEventSeqs.push(resultEvent.seq)
    return { resultEventSeq: resultEvent.seq }
  }
}

function existingBrief(
  events: readonly SessionEvent[],
  input: RunStoryTurnPipelineInput,
): SessionEvent<'agent-rp/story-turn-brief'> | undefined {
  return events.findLast((event): event is SessionEvent<'agent-rp/story-turn-brief'> =>
    event.type === 'agent-rp/story-turn-brief' && event.data.turn === input.turn && event.data.step === input.step
      && event.data.workspaceId === input.workspace.manifest.id
      && event.data.workspaceRevision === input.workspace.manifest.revision)
}

function directorFallback(
  input: RunStoryTurnPipelineInput,
  playerInput: string,
  research: string,
  characterDecisions: readonly string[],
): string {
  return [
    '# 本轮剧情目标',
    input.workspace.documents.outline,
    '# 尚未回收的伏笔',
    input.workspace.documents.foreshadowing,
    '# 与本轮相关的资料',
    research,
    '# 各人物独立决策',
    characterDecisions.join('\n\n'),
    '# 玩家输入',
    playerInput,
  ].join('\n\n')
}

function modelContext(finalDraft: string): string {
  return [
    '故事引擎已经依据人物私有认知分别推演，并完成导演规划、分区写作与编辑。',
    '<edited_draft>',
    finalDraft,
    '</edited_draft>',
    '请把 edited_draft 作为本轮可见正文；只允许为角色口吻和既有格式做必要的局部适配，不得重新安排剧情，也不得解释故事流水线。',
  ].join('\n')
}

/** Run or replay the complete story Worker pipeline for one accepted model step. */
export async function runStoryTurnPipeline(input: RunStoryTurnPipelineInput): Promise<StoryTurnBriefRecord> {
  const prior = existingBrief(input.agent.session.events, input)
  if (prior !== undefined) return prior.data
  input.signal.throwIfAborted()
  const playerInput = messageText(input.messages)
  if (playerInput === '') throw new Error('故事流水线没有可用的玩家输入')
  const recentTranscript = transcriptText(input.agent)
  const sourceExcerpts = searchStoryWorkspaceSources(input.workspace, `${recentTranscript}\n${playerInput}`)
  const resultEventSeqs: number[] = []
  const webResearch = await searchWeb(input, playerInput, resultEventSeqs)
  const researchBody = [
    '<public_history>', input.workspace.documents.history, '</public_history>',
    '<recent_transcript>', recentTranscript, '</recent_transcript>',
    '<source_excerpts>', sourceExcerpts, '</source_excerpts>',
    '<web_research>', webResearch, '</web_research>',
    '<player_input>', playerInput, '</player_input>',
  ].join('\n')
  const research = await runStage(input, 'research', generateOptions(
    input,
    '你是剧情研究 Worker。只提取与本轮输入直接相关的既有事实、原著约束和连续性信息；区分明确事实与不确定推测。不要设计剧情，不要替角色决定行动。只返回精炼的研究简报。',
    researchBody,
    4_096,
    0.1,
  ), resultEventSeqs)
  const researchText = research.text ?? [sourceExcerpts, webResearch].filter(Boolean).join('\n\n')

  const characterDecisions: string[] = []
  for (const character of input.workspace.manifest.characters.filter(candidate => candidate.enabled)) {
    input.signal.throwIfAborted()
    const context = compileStoryCharacterContext(input.workspace, character.id, {
      history: input.workspace.documents.history,
      currentScene: recentTranscript,
      playerInput,
    })
    const decision = await runStage(input, 'character', generateOptions(
      input,
      '你是一个只拥有指定人物认知的角色 Worker。独立判断人物此刻能观察到什么、相信什么、想做什么以及可能说什么。不能使用未出现在输入中的知识。不要写完整正文，只返回给导演的行动提案。',
      context.text,
      2_048,
      0.5,
    ), resultEventSeqs, character.id)
    if (decision.text !== undefined) characterDecisions.push(`## ${character.name}\n${decision.text}`)
  }

  const fallback = directorFallback(input, playerInput, researchText, characterDecisions)
  const director = await runStage(input, 'director', generateOptions(
    input,
    '你是剧情导演 Worker。依据大纲、伏笔、研究简报和各人物独立行动提案，为本轮设计具体正文方案。保证因果连续，尊重玩家输入；隐藏知识只能影响拥有者或导演安排，不能让不知情人物表现出全知。明确每个启用正文分区应写什么。不要直接向玩家解释内部资料。',
    [
      '<outline>', input.workspace.documents.outline, '</outline>',
      '<foreshadowing>', input.workspace.documents.foreshadowing, '</foreshadowing>',
      '<public_history>', input.workspace.documents.history, '</public_history>',
      '<research>', researchText, '</research>',
      '<character_decisions>', characterDecisions.join('\n\n'), '</character_decisions>',
      '<sections>', input.workspace.manifest.sections.filter(section => section.enabled)
        .map(section => `${section.id}\t${section.kind}\t${section.name}`).join('\n'), '</sections>',
      '<player_input>', playerInput, '</player_input>',
    ].join('\n'),
    4_096,
    0.4,
  ), resultEventSeqs)
  const directorBrief = director.text ?? fallback

  const enabledSections = input.workspace.manifest.sections.filter(section => section.enabled)
  const sectionDrafts: string[] = []
  if (enabledSections.length === 0) {
    sectionDrafts.push(directorBrief)
  } else {
    for (const section of enabledSections) {
      input.signal.throwIfAborted()
      const existing = input.workspace.documents.sections.find(document => document.id === section.id)?.content ?? ''
      const draft = await runStage(input, 'section', generateOptions(
        input,
        `你是“${section.name}”分区的正文 Worker。根据导演方案写出该分区可直接交付的内容。保持既有文风和连续性，不解释创作过程，不泄露导演资料或人物无权知道的事实。`,
        [
          `<section kind="${section.kind}">`, existing, '</section>',
          '<director_brief>', directorBrief, '</director_brief>',
          '<player_input>', playerInput, '</player_input>',
        ].join('\n'),
        6_144,
        0.7,
      ), resultEventSeqs, section.id)
      if (draft.text !== undefined) sectionDrafts.push(draft.text)
    }
  }
  const uneditedDraft = sectionDrafts.join('\n\n').trim() || directorBrief
  const edited = await runStage(input, 'editor', generateOptions(
    input,
    '你是最终正文编辑 Worker。删除复读、八股句式、空泛总结、机械排比和正文外解释；保留全部事实、行动、对白归属、因果、叙事视角与必要格式。不要增加事件，不要改变人物认知。只返回可直接展示的完整正文。',
    `<draft>\n${uneditedDraft}\n</draft>`,
    8_192,
    0.2,
  ), resultEventSeqs)
  const finalDraft = edited.text ?? uneditedDraft
  const context = modelContext(finalDraft)
  const record: StoryTurnBriefRecord = {
    format: 0,
    sessionId: String(input.agent.session.id),
    workspaceId: input.workspace.manifest.id,
    workspaceRevision: input.workspace.manifest.revision,
    turn: input.turn,
    step: input.step,
    resultEventSeqs,
    directorBrief,
    finalDraft,
    modelContext: context,
  }
  appendAgentRpSessionEvent(input.agent.session, 'agent-rp/story-turn-brief', record)
  await input.ctx.sessions.flush(input.agent.session)
  return record
}

/** Read the exact story brief already prepared for one model step. */
export function readStoryTurnBrief(
  events: readonly SessionEvent[],
  turn: number,
  step: number,
): StoryTurnBriefRecord | undefined {
  return events.findLast((event): event is SessionEvent<'agent-rp/story-turn-brief'> =>
    event.type === 'agent-rp/story-turn-brief' && event.data.turn === turn && event.data.step === step)?.data
}
