/** Model-free character-library launch through a private Session command. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CommandId } from '@deepseek-ai/dsh-commands'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { CharacterLibrary } from './character-library.ts'
import type { CharacterLibraryLaunchRequest } from './character-library-protocol.ts'
import {
  encodeCharacterLibraryLaunch,
  prepareCharacterLibraryImportMeta,
} from './import/session-character.ts'
import { substituteCardMacros } from './prompt.ts'
import { parseSessionPersona } from './session-persona.ts'

/** Validate the browser-owned request without accepting filesystem paths or extra fields. */
export function parseCharacterLibraryLaunchRequest(source: string): CharacterLibraryLaunchRequest {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error: unknown) {
    throw new Error('角色库启动请求不是有效 JSON', { cause: error })
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('角色库启动请求不是对象')
  const record = value as Record<string, unknown>
  if (record.format !== 0 || typeof record.characterId !== 'string'
    || !/^card-[a-f0-9]{32}$/u.test(record.characterId)
    || typeof record.greetingIndex !== 'number' || !Number.isSafeInteger(record.greetingIndex) || record.greetingIndex < 0
    || Object.keys(record).some(key => key !== 'format' && key !== 'characterId' && key !== 'greetingIndex' && key !== 'persona')) {
    throw new Error('角色库启动请求字段无效')
  }
  const persona = record.persona === undefined ? undefined : parseSessionPersona(record.persona)
  return {
    format: 0,
    characterId: record.characterId,
    greetingIndex: record.greetingIndex,
    ...(persona === undefined ? {} : { persona }),
  }
}

/** Activate one local card and append its selected opening without invoking a model. */
export function executeCharacterLibraryCommand(
  library: CharacterLibrary,
  invocation: {
    readonly commandId: CommandId
    readonly agent: Agent
    readonly rawInput: string
  },
): { readonly kind: 'success'; readonly text: string; readonly sourceEventSeq: number } {
  const request = parseCharacterLibraryLaunchRequest(invocation.rawInput)
  const source = invocation.agent.session.events.at(-1)
  if (source?.type !== 'command/run' || source.data.name !== 'rp-character-library'
    || String(source.data.commandId) !== String(invocation.commandId)) {
    throw new Error('角色库启动命令不是当前 Session 事件')
  }
  const resolved = library.resolve(request.characterId)
  if (resolved.detail.archived) throw new Error('请先恢复这个角色，再开始对话')
  const selectedGreeting = resolved.detail.greetings[request.greetingIndex]
  if (selectedGreeting === undefined) throw new Error(`角色卡没有第 ${request.greetingIndex + 1} 条开场白`)
  const userName = request.persona?.name
  const meta = prepareCharacterLibraryImportMeta(
    resolved.card, resolved.transport, source.seq, request.characterId, request.greetingIndex, userName,
  )
  const turn = invocation.agent.session.events.reduce((maximum, event) => (
    event.type === 'turn/start' ? Math.max(maximum, event.data.turn) : maximum
  ), 0) + 1
  const start = invocation.agent.session.append('turn/start', { turn })
  const greeting = substituteCardMacros(selectedGreeting, resolved.card, userName).trim()
  let presentationSeq = start.seq
  if (greeting !== '') {
    invocation.agent.session.append('step/start', { turn, step: 1 })
    const message = invocation.agent.session.append('assistant/message', {
      turn,
      step: 1,
      message: createAssistantMessage({
        content: [{ type: 'text', text: greeting }],
        source: { provider: 'agent-rp-library', model: 'character-card' },
      }),
    }, { surfaceOp: 'append', sourceEventSeqs: [source.seq] })
    presentationSeq = message.seq
    invocation.agent.session.append('step/end', { turn, step: 1 })
  }
  invocation.agent.session.append('turn/end', { turn, reason: { kind: 'completed' } })
  return {
    kind: 'success',
    text: encodeCharacterLibraryLaunch({
      format: 0,
      libraryId: request.characterId,
      meta,
      ...(request.persona === undefined ? {} : { persona: request.persona }),
    }),
    sourceEventSeq: presentationSeq,
  }
}
