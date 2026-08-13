/** Incremental browser projection of the active Roleplay identity. */

import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { parseCharacterCardJson } from './import/character-card.ts'
import type { CharacterImportMeta } from './import/session-character.ts'
import { readSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import type { WorldInfoImportMeta } from './import/session-world-info.ts'
import type { ActiveSessionPreset, PresetImportMeta } from './import/session-preset.ts'
import { presetRegexScripts, type ImportedSillyTavernPreset } from './import/sillytavern-preset.ts'
import type { AgentRpProjection } from './projection-types.ts'
import { applyMvuReply, readCurrentMvuState } from './mvu.ts'
import { canEditPresetPrompt, canTogglePresetPrompt } from './preset-configuration.ts'
import { configurePreset, parsePresetConfigurationRequest } from './preset-configuration-core.ts'
import { parsePresetLibraryResult } from './preset-library-protocol.ts'

export type { AgentRpProjection } from './projection-types.ts'

const projectionSchema = {
  parse(value: unknown): AgentRpProjection {
    const record = value as Partial<Record<keyof AgentRpProjection, unknown>> | null
    const validCardVersion = record?.cardVersion === undefined
      || record.cardVersion === 1 || record.cardVersion === 2 || record.cardVersion === 3
    const validSource = record?.source === 'character-card'
      || record?.source === 'sillytavern-chat' || record?.source === 'preset'
    if (record === null || typeof record !== 'object'
      || typeof record.characterName !== 'string'
      || typeof record.description !== 'string'
      || typeof record.personality !== 'string'
      || typeof record.scenario !== 'string'
      || (record.userName !== undefined && typeof record.userName !== 'string')
      || !validCardVersion
      || (record.avatarAttachmentId !== undefined && typeof record.avatarAttachmentId !== 'string')
      || typeof record.importedMessageCount !== 'number' || !Number.isSafeInteger(record.importedMessageCount)
      || record.importedMessageCount < 0
      || typeof record.worldInfoCount !== 'number' || !Number.isSafeInteger(record.worldInfoCount)
      || record.worldInfoCount < 0
      || (record.frontend !== undefined && (typeof record.frontend !== 'object' || record.frontend === null))
      || (record.preset !== undefined && (typeof record.preset !== 'object' || record.preset === null))
      || !Array.isArray(record.presetLibrary)
      || (record.lastRequest !== undefined && (typeof record.lastRequest !== 'object' || record.lastRequest === null))
      || !validSource) throw new Error('invalid agentRp projection')
    return value as AgentRpProjection
  },
}

type ImportCall = 'character-card' | 'world-info' | 'preset'

interface AgentRpProjectionState {
  readonly character: Omit<AgentRpProjection, 'worldInfoCount' | 'presetLibrary' | 'lastRequest'>
  readonly cardWorldInfoCount: number
  readonly standaloneWorldInfos: Readonly<Record<string, number>>
  readonly calls: Readonly<Record<string, ImportCall>>
  readonly mvu?: AgentRpProjection['mvu']
  readonly preset?: AgentRpProjection['preset']
  readonly presetState?: ActiveSessionPreset
  readonly presetLibrary: AgentRpProjection['presetLibrary']
  readonly lastRequest?: AgentRpProjection['lastRequest']
}

const INITIAL_CHARACTER: AgentRpProjectionState['character'] = {
  characterName: '角色会话',
  description: '',
  personality: '',
  scenario: '',
  importedMessageCount: 0,
  source: 'preset',
}

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function cardProjection(
  previous: AgentRpProjectionState['character'],
  meta: CharacterImportMeta,
): { readonly character: AgentRpProjectionState['character']; readonly lorebookEntries: number } {
  const card = parseCharacterCardJson(JSON.stringify(meta.raw))
  const result = meta.result
  return {
    character: {
      characterName: card.nickname?.trim() || card.name,
      description: card.description.trim(),
      personality: card.personality.trim(),
      scenario: card.scenario.trim(),
      ...(result.userName === undefined ? {} : { userName: result.userName }),
      cardVersion: result.cardVersion,
      ...(result.transport === 'png' ? { avatarAttachmentId: result.sourceAttachmentId } : {}),
      importedMessageCount: previous.importedMessageCount,
      frontend: card.frontend,
      source: 'character-card',
    },
    lorebookEntries: card.lorebook?.entries.length ?? 0,
  }
}

function toolCallId(event: Extract<SessionEvent, { type: 'tool/result' }>): string | undefined {
  const first = event.data.message.content[0]
  return first === undefined ? undefined : String(first.toolCallId)
}

function toolFailed(event: Extract<SessionEvent, { type: 'tool/result' }>): boolean {
  return event.data.message.content[0]?.isError === true
}

function parseCharacterMeta(value: JsonValue | undefined): CharacterImportMeta | undefined {
  const meta = jsonObject(value)
  const result = jsonObject(meta?.result)
  if (meta?.format !== 0 || result?.version !== 0 || meta.raw === undefined
    || typeof result.name !== 'string'
    || (result.cardVersion !== 1 && result.cardVersion !== 2 && result.cardVersion !== 3)
    || typeof result.sourceAttachmentId !== 'string'
    || (result.transport !== 'png' && result.transport !== 'json')) return undefined
  return value as unknown as CharacterImportMeta
}

function parseWorldInfoMeta(value: JsonValue | undefined): WorldInfoImportMeta | undefined {
  const meta = jsonObject(value)
  const result = jsonObject(meta?.result)
  if (meta?.format !== 0 || result?.version !== 0 || meta.raw === undefined
    || typeof result.sourceAttachmentId !== 'string'
    || typeof result.entryCount !== 'number' || !Number.isSafeInteger(result.entryCount)
    || result.entryCount < 0) return undefined
  return value as unknown as WorldInfoImportMeta
}

function parsePresetMeta(value: JsonValue | undefined): PresetImportMeta | undefined {
  const meta = jsonObject(value)
  const result = jsonObject(meta?.result)
  const preset = jsonObject(meta?.preset)
  if (meta?.format !== 0 || result?.version !== 0 || preset?.format !== 0
    || typeof result.name !== 'string'
    || typeof result.promptCount !== 'number' || !Number.isSafeInteger(result.promptCount)
    || typeof result.enabledCount !== 'number' || !Number.isSafeInteger(result.enabledCount)
    || typeof result.regexScriptCount !== 'number' || !Number.isSafeInteger(result.regexScriptCount)) return undefined
  return value as unknown as PresetImportMeta
}

function presetProjection(
  name: string,
  preset: ImportedSillyTavernPreset,
  revision: number,
  importedPreset: ImportedSillyTavernPreset = preset,
  libraryId?: string,
): NonNullable<AgentRpProjection['preset']> {
  const generation = preset.generation
  const enabled = new Set(preset.order.filter(entry => entry.enabled).map(entry => entry.identifier))
  const promptsById = new Map(preset.prompts.map(prompt => [prompt.identifier, prompt]))
  const importedPromptsById = new Map(importedPreset.prompts.map(prompt => [prompt.identifier, prompt]))
  const importedOrderById = new Map(importedPreset.order.map((entry, position) => [entry.identifier, { ...entry, position }]))
  const regexScripts = presetRegexScripts(preset)
  const appliedGeneration = [
    generation.temperature === undefined ? undefined : 'temperature',
    generation.maxTokens === undefined ? undefined : 'maxTokens（受模型上限约束）',
    generation.reasoningEffort === undefined || generation.reasoningEffort === 'auto'
      ? undefined : 'reasoningEffort（按当前模型能力）',
  ].filter((value): value is string => value !== undefined)
  const preservedGeneration = [
    generation.topP === undefined ? undefined : 'top_p',
    generation.topK === undefined ? undefined : 'top_k',
    generation.topA === undefined ? undefined : 'top_a',
    generation.minP === undefined ? undefined : 'min_p',
    generation.frequencyPenalty === undefined ? undefined : 'frequency_penalty',
    generation.presencePenalty === undefined ? undefined : 'presence_penalty',
    generation.repetitionPenalty === undefined ? undefined : 'repetition_penalty',
    generation.reasoningEffort === 'auto' ? 'reasoning_effort（auto，跟随模型）' : undefined,
  ].filter((value): value is string => value !== undefined)
  return {
    ...(libraryId === undefined ? {} : { libraryId }),
    name,
    promptCount: preset.prompts.length,
    enabledCount: preset.prompts.filter(prompt => enabled.has(prompt.identifier)).length,
    revision,
    prompts: [...preset.order.flatMap((entry) => {
      const prompt = promptsById.get(entry.identifier)
      return prompt === undefined ? [] : [{
        ...(() => {
          const importedPrompt = importedPromptsById.get(prompt.identifier)
          return {
            imported: importedPrompt !== undefined,
            importedName: importedPrompt?.name ?? prompt.name,
            importedRole: importedPrompt?.role ?? prompt.role,
            ...(importedPrompt?.injectionPosition === undefined ? {} : { importedInjectionPosition: importedPrompt.injectionPosition }),
            ...(importedPrompt?.injectionDepth === undefined ? {} : { importedInjectionDepth: importedPrompt.injectionDepth }),
            ...(importedPrompt?.injectionOrder === undefined ? {} : { importedInjectionOrder: importedPrompt.injectionOrder }),
          }
        })(),
        identifier: prompt.identifier,
        name: prompt.name,
        role: prompt.role,
        content: prompt.content,
        importedContent: importedPromptsById.get(prompt.identifier)?.content ?? prompt.content,
        contentModified: prompt.content !== importedPromptsById.get(prompt.identifier)?.content,
        importedAttached: importedOrderById.has(prompt.identifier),
        importedEnabled: importedOrderById.get(prompt.identifier)?.enabled ?? false,
        ...(importedOrderById.get(prompt.identifier) === undefined ? {} : { importedPosition: importedOrderById.get(prompt.identifier)!.position }),
        marker: prompt.marker,
        systemPrompt: prompt.systemPrompt,
        forbidOverrides: prompt.forbidOverrides,
        ...(prompt.injectionPosition === undefined ? {} : { injectionPosition: prompt.injectionPosition }),
        ...(prompt.injectionDepth === undefined ? {} : { injectionDepth: prompt.injectionDepth }),
        ...(prompt.injectionOrder === undefined ? {} : { injectionOrder: prompt.injectionOrder }),
        attached: true,
        enabled: entry.enabled,
        toggleable: canTogglePresetPrompt(preset, prompt.identifier),
        editable: canEditPresetPrompt(preset, prompt.identifier),
        deletable: !prompt.systemPrompt && !prompt.marker,
      }]
    }), ...preset.prompts.filter(prompt => !preset.order.some(entry => entry.identifier === prompt.identifier)).map(prompt => ({
      ...(() => {
        const importedPrompt = importedPromptsById.get(prompt.identifier)
        return {
          imported: importedPrompt !== undefined,
          importedName: importedPrompt?.name ?? prompt.name,
          importedRole: importedPrompt?.role ?? prompt.role,
          ...(importedPrompt?.injectionPosition === undefined ? {} : { importedInjectionPosition: importedPrompt.injectionPosition }),
          ...(importedPrompt?.injectionDepth === undefined ? {} : { importedInjectionDepth: importedPrompt.injectionDepth }),
          ...(importedPrompt?.injectionOrder === undefined ? {} : { importedInjectionOrder: importedPrompt.injectionOrder }),
        }
      })(),
      identifier: prompt.identifier,
      name: prompt.name,
      role: prompt.role,
      content: prompt.content,
      importedContent: importedPromptsById.get(prompt.identifier)?.content ?? prompt.content,
      contentModified: prompt.content !== importedPromptsById.get(prompt.identifier)?.content,
      importedAttached: importedOrderById.has(prompt.identifier),
      importedEnabled: importedOrderById.get(prompt.identifier)?.enabled ?? false,
      ...(importedOrderById.get(prompt.identifier) === undefined ? {} : { importedPosition: importedOrderById.get(prompt.identifier)!.position }),
      marker: prompt.marker,
      systemPrompt: prompt.systemPrompt,
      forbidOverrides: prompt.forbidOverrides,
      ...(prompt.injectionPosition === undefined ? {} : { injectionPosition: prompt.injectionPosition }),
      ...(prompt.injectionDepth === undefined ? {} : { injectionDepth: prompt.injectionDepth }),
      ...(prompt.injectionOrder === undefined ? {} : { injectionOrder: prompt.injectionOrder }),
      attached: false,
      enabled: false,
      toggleable: canTogglePresetPrompt(preset, prompt.identifier),
      editable: canEditPresetPrompt(preset, prompt.identifier),
      deletable: !prompt.systemPrompt && !prompt.marker,
    }))],
    generation: {
      ...(generation.temperature === undefined ? {} : { temperature: generation.temperature }),
      ...(generation.maxTokens === undefined ? {} : { maxTokens: generation.maxTokens }),
      ...(generation.reasoningEffort === undefined ? {} : { reasoningEffort: generation.reasoningEffort }),
      ...(generation.topP === undefined ? {} : { topP: generation.topP }),
      ...(generation.topK === undefined ? {} : { topK: generation.topK }),
      ...(generation.topA === undefined ? {} : { topA: generation.topA }),
      ...(generation.minP === undefined ? {} : { minP: generation.minP }),
      ...(generation.frequencyPenalty === undefined ? {} : { frequencyPenalty: generation.frequencyPenalty }),
      ...(generation.presencePenalty === undefined ? {} : { presencePenalty: generation.presencePenalty }),
      ...(generation.repetitionPenalty === undefined ? {} : { repetitionPenalty: generation.repetitionPenalty }),
    },
    formats: { ...preset.formats },
    degradedRoleCount: preset.prompts.filter(prompt => enabled.has(prompt.identifier) && prompt.role !== 'system').length,
    preservedInChatCount: preset.prompts.filter(prompt => enabled.has(prompt.identifier) && prompt.injectionPosition === 1).length,
    regexScriptCount: preset.extensionSummary.regexScriptCount,
    enabledRegexScriptCount: regexScripts.filter(script => !script.disabled).length,
    activeDisplayRegexCount: regexScripts.filter(script => !script.disabled && script.markdownOnly).length,
    preservedPromptRegexCount: regexScripts.filter(script => !script.disabled && script.promptOnly).length,
    regexScripts: regexScripts.map((script, index) => ({ ...script, index })),
    appliedGeneration,
    preservedGeneration,
    omittedExtensions: [
      preset.extensionSummary.hasSPreset ? 'SPreset' : undefined,
      preset.extensionSummary.hasTavernHelper ? 'Tavern Helper' : undefined,
    ].filter((value): value is string => value !== undefined),
  }
}

function withoutCall(
  calls: Readonly<Record<string, ImportCall>>,
  callId: string,
): Readonly<Record<string, ImportCall>> {
  return Object.fromEntries(Object.entries(calls).filter(([id]) => id !== callId))
}

/** Projection definition shared by every Agent RP Session. */
export const agentRpProjectionDefinition: ProjectionDefinition<'agentRp', AgentRpProjectionState> = {
  key: 'agentRp',
  schema: projectionSchema as never,
  init: () => ({
    character: INITIAL_CHARACTER,
    cardWorldInfoCount: 0,
    standaloneWorldInfos: {},
    calls: {},
    presetLibrary: [],
  }),
  apply(state, event) {
    if (event.type === 'agent-rp/sillytavern-chat-import') {
      const identity = readSillyTavernChatIdentity([event])
      return {
        ...state,
        character: {
          ...state.character,
          ...(state.character.source === 'preset' && identity !== undefined
            ? { characterName: identity.characterName, source: 'sillytavern-chat' as const }
            : {}),
          ...(identity?.userName === undefined ? {} : { userName: identity.userName }),
          importedMessageCount: event.data.messages.length,
        },
      }
    }
    if (event.type === 'agent-rp/character-card-seed') {
      const projected = cardProjection(state.character, event.data.meta)
      const card = parseCharacterCardJson(JSON.stringify(event.data.meta.raw))
      return {
        ...state,
        character: projected.character,
        cardWorldInfoCount: projected.lorebookEntries,
        mvu: readCurrentMvuState(card, []) ,
      }
    }
    if (event.type === 'agent-rp/sillytavern-preset-seed') {
      const presetState = {
        result: event.data.result,
        importedPreset: event.data.preset,
        preset: event.data.preset,
        revision: 0,
        ...(event.data.libraryId === undefined ? {} : { libraryId: event.data.libraryId }),
      }
      return {
        ...state,
        preset: presetProjection(event.data.result.name, event.data.preset, 0, event.data.preset, event.data.libraryId),
        presetState,
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let library
      try {
        library = parsePresetLibraryResult(event.data.text)
      } catch {
        return state
      }
      if (library === undefined) return state
      if (library.selected !== undefined) {
        const selected = library.selected
        const presetState: ActiveSessionPreset = {
          result: {
            version: 0,
            name: selected.name,
            sourceEventSeq: event.seq,
            sourceAttachmentId: `library:${selected.libraryId}`,
            promptCount: selected.preset.prompts.length,
            enabledCount: selected.preset.order.filter(item => item.enabled).length,
            regexScriptCount: selected.preset.extensionSummary.regexScriptCount,
          },
          importedPreset: selected.preset,
          preset: selected.preset,
          revision: 0,
          libraryId: selected.libraryId,
        }
        return {
          ...state,
          presetLibrary: library.entries,
          preset: presetProjection(selected.name, selected.preset, 0, selected.preset, selected.libraryId),
          presetState,
        }
      }
      if (state.preset === undefined || state.presetState === undefined || library.linkedLibraryId === undefined) {
        return { ...state, presetLibrary: library.entries }
      }
      return {
        ...state,
        presetLibrary: library.entries,
        preset: { ...state.preset, libraryId: library.linkedLibraryId },
        presetState: { ...state.presetState, libraryId: library.linkedLibraryId },
      }
    }
    if (event.type === 'command/run' && event.data.name === 'rp-preset-configure' && event.data.args !== undefined) {
      if (state.preset === undefined || state.presetState === undefined) return state
      try {
        const configured = configurePreset(state.presetState, parsePresetConfigurationRequest(event.data.args))
        const revision = state.presetState.revision + 1
        return {
          ...state,
          preset: presetProjection(
            state.preset.name,
            configured,
            revision,
            state.presetState.importedPreset,
            state.presetState.libraryId,
          ),
          presetState: { ...state.presetState, preset: configured, revision },
        }
      } catch {
        return state
      }
    }
    if (event.type === 'request/header') {
      const config = event.data.header.config
      return {
        ...state,
        lastRequest: {
          eventSeq: event.seq,
          time: event.time,
          ...(state.presetState === undefined ? {} : {
            presetName: state.presetState.result.name,
            presetRevision: state.presetState.revision,
          }),
          system: event.data.header.system ?? '',
          config: {
            provider: config.provider,
            model: config.model,
            ...(config.reasoningEffort === undefined ? {} : { reasoningEffort: String(config.reasoningEffort) }),
            ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
            ...(config.maxTokens === undefined ? {} : { maxTokens: config.maxTokens }),
            ...(config.stop === undefined ? {} : { stop: config.stop }),
          },
          toolNames: event.data.header.tools?.map(tool => tool.name) ?? [],
        },
      }
    }
    if (event.type === 'assistant/message' && state.mvu !== undefined) {
      const text = event.data.message.content
        .flatMap(block => block.type === 'text' ? [block.text] : [])
        .join('\n')
      if (!/<UpdateVariable(?:variable)?>/iu.test(text)) return state
      try {
        const update = applyMvuReply(state.mvu.statData, text)
        return update === undefined ? state : {
          ...state,
          mvu: {
            statData: update.statData,
            updateCount: state.mvu.updateCount + 1,
          },
        }
      } catch (error: unknown) {
        return {
          ...state,
          mvu: {
            ...state.mvu,
            lastError: error instanceof Error ? error.message : String(error),
          },
        }
      }
    }
    if (event.type === 'tool/call') {
      const kind = event.data.name === 'import_character_card'
        ? 'character-card'
        : event.data.name === 'import_world_info' ? 'world-info'
          : event.data.name === 'import_sillytavern_preset' ? 'preset' : undefined
      return kind === undefined
        ? state
        : { ...state, calls: { ...state.calls, [String(event.data.callId)]: kind } }
    }
    if (event.type !== 'tool/result') return state
    const callId = toolCallId(event)
    if (callId === undefined) return state
    const kind = state.calls[callId]
    if (kind === undefined) return state
    const calls = withoutCall(state.calls, callId)
    if (toolFailed(event)) return { ...state, calls }
    if (kind === 'character-card') {
      const meta = parseCharacterMeta(event.data.meta)
      if (meta === undefined) return { ...state, calls }
      const projected = cardProjection(state.character, meta)
      const card = parseCharacterCardJson(JSON.stringify(meta.raw))
      return {
        ...state,
        calls,
        character: projected.character,
        cardWorldInfoCount: projected.lorebookEntries,
        mvu: readCurrentMvuState(card, []),
      }
    }
    if (kind === 'preset') {
      const meta = parsePresetMeta(event.data.meta)
      return meta === undefined
        ? { ...state, calls }
        : {
            ...state,
            calls,
            preset: presetProjection(meta.result.name, meta.preset, 0),
            presetState: {
              result: meta.result,
              importedPreset: meta.preset,
              preset: meta.preset,
              revision: 0,
            },
          }
    }
    const meta = parseWorldInfoMeta(event.data.meta)
    return meta === undefined
      ? { ...state, calls }
      : {
          ...state,
          calls,
          standaloneWorldInfos: {
            ...state.standaloneWorldInfos,
            [meta.result.sourceAttachmentId]: meta.result.entryCount,
          },
        }
  },
  view: state => ({
    ...state.character,
    worldInfoCount: state.cardWorldInfoCount
      + Object.values(state.standaloneWorldInfos).reduce((total, count) => total + count, 0),
    ...(state.mvu === undefined ? {} : { mvu: state.mvu }),
    ...(state.preset === undefined ? {} : { preset: state.preset }),
    presetLibrary: state.presetLibrary,
    ...(state.lastRequest === undefined ? {} : { lastRequest: state.lastRequest }),
  }),
  stateVersion: 2,
}
