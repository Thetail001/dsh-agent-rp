/** Incremental browser projection of the active Roleplay identity. */

import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { JsonValue, SessionEvent } from '@deepseek-ai/dsh-session'
import { parseCharacterCardValue } from './import/character-card.ts'
import { decodeCharacterLibraryLaunch, type CharacterImportMeta, type CharacterLibraryLaunchRecord } from './import/session-character.ts'
import { readSillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import { parseWorldInfoImportMeta, type WorldInfoImportMeta } from './import/session-world-info.ts'
import { parseWorldInfoJson } from './import/world-info.ts'
import type { ActiveSessionPreset, PresetImportMeta } from './import/session-preset.ts'
import {
  presetRegexScripts,
  presetTavernHelperScripts,
  type ImportedSillyTavernPreset,
} from './import/sillytavern-preset.ts'
import type { AgentRpProjection } from './projection-types.ts'
import { applyMvuReply, readCurrentMvuState } from './mvu.ts'
import { canEditPresetPrompt, canTogglePresetPrompt } from './preset-configuration.ts'
import { configurePreset, parsePresetConfigurationRequest } from './preset-configuration-core.ts'
import { parsePresetLibraryResult } from './preset-library-protocol.ts'
import { parseSessionPersona } from './session-persona.ts'
import { decodeGenerationState, type GenerationStateRecord } from './generation.ts'
import { inspectLorebooks } from './import/lorebook.ts'
import { createEjsWorldInfoBooks, EjsTemplateEngine } from './ejs-template.ts'
import type { ImportedCharacterCard, ImportedWorldInfo } from './import/types.ts'
import {
  configuredLorebook,
  decodeWorldInfoConfiguration,
  editableWorldInfoEntry,
  worldInfoTokenBudget,
  withTavernWorldbooks,
  type SessionLorebookSource,
} from './world-info-configuration-core.ts'
import type { WorldInfoConfigurationState } from './world-info-configuration-types.ts'
import { decodeSillyTavernChatCommandRecord, type SillyTavernChatCommandRecord } from './sillytavern-chat-protocol.ts'
import { decodeWorldInfoLibraryImport } from './world-info-library-protocol.ts'
import { decodePersonaCommandRecord } from './persona-command-protocol.ts'
import {
  decodeTavernHelperState,
  initializeTavernHelperPresetState,
  initializeTavernHelperState,
  type TavernHelperState,
} from './tavern-helper.ts'
import { PROMPT_REGEX_SOURCE_MARKER, readPromptRegexSourceMarker } from './frontend-regex.ts'
import { parsePublishedRoleplayImageMeta, PUBLISH_ROLEPLAY_IMAGE_TOOL } from './roleplay-image.ts'

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
      || (record.originalCharacterName !== undefined && typeof record.originalCharacterName !== 'string')
      || typeof record.description !== 'string'
      || typeof record.personality !== 'string'
      || typeof record.scenario !== 'string'
      || (record.userName !== undefined && typeof record.userName !== 'string')
      || (record.persona !== undefined && (typeof record.persona !== 'object' || record.persona === null))
      || !Array.isArray(record.generations)
      || !Array.isArray(record.publishedImages)
      || (record.currentReplySeq !== undefined && (typeof record.currentReplySeq !== 'number'
        || !Number.isSafeInteger(record.currentReplySeq) || record.currentReplySeq < 0))
      || !validCardVersion
      || (record.characterCardRaw !== undefined && (typeof record.characterCardRaw !== 'object'
        || record.characterCardRaw === null || Array.isArray(record.characterCardRaw)))
      || (record.avatarAttachmentId !== undefined && typeof record.avatarAttachmentId !== 'string')
      || (record.avatarLibraryId !== undefined && typeof record.avatarLibraryId !== 'string')
      || typeof record.importedMessageCount !== 'number' || !Number.isSafeInteger(record.importedMessageCount)
      || record.importedMessageCount < 0
      || typeof record.worldInfoCount !== 'number' || !Number.isSafeInteger(record.worldInfoCount)
      || record.worldInfoCount < 0
      || typeof record.worldInfo !== 'object' || record.worldInfo === null
      || (record.frontend !== undefined && (typeof record.frontend !== 'object' || record.frontend === null))
      || (record.tavern !== undefined && (typeof record.tavern !== 'object' || record.tavern === null))
      || (record.preset !== undefined && (typeof record.preset !== 'object' || record.preset === null))
      || !Array.isArray(record.presetLibrary)
      || (record.lastRequest !== undefined && (typeof record.lastRequest !== 'object' || record.lastRequest === null))
      || (record.promptRegex !== undefined && (typeof record.promptRegex !== 'object' || record.promptRegex === null))
      || !validSource) throw new Error('invalid agentRp projection')
    return value as AgentRpProjection
  },
}

type TrackedCall = 'character-card' | 'world-info' | 'preset' | 'roleplay-image'

interface PendingPublishedImage {
  readonly turn: number
  readonly publishResultSeq: number
  readonly meta: NonNullable<ReturnType<typeof parsePublishedRoleplayImageMeta>>
}

interface AgentRpProjectionState {
  readonly character: Omit<AgentRpProjection, 'worldInfoCount' | 'worldInfo' | 'presetLibrary' | 'lastRequest' | 'generations' | 'publishedImages'>
  readonly cardWorldInfoCount: number
  readonly cardLorebook?: SessionLorebookSource
  readonly standaloneWorldInfos: Readonly<Record<string, SessionLorebookSource>>
  readonly worldInfoConfiguration: WorldInfoConfigurationState
  readonly surface: readonly {
    readonly seq: number
    readonly text?: string
    readonly role?: 'user' | 'assistant'
  }[]
  readonly calls: Readonly<Record<string, TrackedCall>>
  readonly personaCommands: Readonly<Record<string, number>>
  readonly mvu?: AgentRpProjection['mvu']
  readonly preset?: AgentRpProjection['preset']
  readonly presetState?: ActiveSessionPreset
  readonly presetLibrary: AgentRpProjection['presetLibrary']
  readonly lastRequest?: AgentRpProjection['lastRequest']
  readonly promptRegex?: AgentRpProjection['promptRegex']
  readonly generations: Readonly<Record<string, GenerationStateRecord>>
  readonly currentReplySeq?: number
  readonly publishedImages: AgentRpProjection['publishedImages']
  readonly pendingPublishedImages: readonly PendingPublishedImage[]
  readonly replySeqByTurn: Readonly<Record<string, number>>
  readonly tavern?: TavernHelperState
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
  card: ImportedCharacterCard,
): { readonly character: AgentRpProjectionState['character']; readonly lorebookEntries: number } {
  const result = meta.result
  return {
    character: {
      characterName: card.nickname?.trim() || card.name,
      originalCharacterName: card.name,
      description: card.description.trim(),
      personality: card.personality.trim(),
      scenario: card.scenario.trim(),
      ...(result.userName === undefined ? {} : { userName: result.userName }),
      ...(previous.persona === undefined ? {} : { persona: previous.persona }),
      cardVersion: result.cardVersion,
      characterCardRaw: card.raw,
      ...(result.transport === 'png' ? { avatarAttachmentId: result.sourceAttachmentId } : {}),
      ...(result.transport === 'charx' && result.libraryId !== undefined ? { avatarLibraryId: result.libraryId } : {}),
      importedMessageCount: previous.importedMessageCount,
      frontend: card.frontend,
      source: 'character-card',
    },
    lorebookEntries: card.lorebook?.entries.length ?? 0,
  }
}

function mvuAfterTavernMutation(
  current: AgentRpProjectionState['mvu'],
  tavern: TavernHelperState,
): AgentRpProjectionState['mvu'] {
  const scope = tavern.lastMutation?.scope
  if (scope !== 'message' && scope !== 'chat') return current
  const statData = tavern.scopes[scope].stat_data
  if (statData === undefined || jsonObject(statData) === undefined) return current
  return {
    statData,
    updateCount: (current?.updateCount ?? 0) + 1,
  }
}

function cardLorebookSource(meta: CharacterImportMeta, card: ImportedCharacterCard): SessionLorebookSource | undefined {
  if (card.lorebook === undefined) return undefined
  return {
    id: `character:${meta.result.sourceAttachmentId}`,
    name: card.lorebook.name?.trim() || `${card.nickname?.trim() || card.name}的世界书`,
    source: 'character',
    lorebook: card.lorebook,
    degradations: card.degradations.filter(value => value.startsWith('lorebook-')),
  }
}

function standaloneLorebookSource(meta: WorldInfoImportMeta): SessionLorebookSource {
  const worldInfo = JSON.parse(JSON.stringify(meta.raw)) as ImportedWorldInfo['raw']
  const parsed = parseWorldInfoJson(JSON.stringify(worldInfo))
  return {
    id: `standalone:${meta.result.sourceAttachmentId}`,
    name: meta.result.name,
    source: 'standalone',
    lorebook: parsed.lorebook,
    degradations: meta.result.degradations,
  }
}

function surfaceText(event: SessionEvent): string | undefined {
  if (event.type === 'user/message') {
    if (event.data.source.kind !== 'user' && event.data.source.kind !== 'model') return undefined
    return event.data.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  }
  if (event.type === 'assistant/message') {
    if (event.data.message.source.kind !== 'model') return undefined
    return event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  }
  return undefined
}

function surfaceRole(event: SessionEvent): 'user' | 'assistant' | undefined {
  if (event.type === 'user/message' && (event.data.source.kind === 'user' || event.data.source.kind === 'model')) return 'user'
  if (event.type === 'assistant/message' && event.data.message.source.kind === 'model') return 'assistant'
  return undefined
}

function applySurface(
  surface: AgentRpProjectionState['surface'],
  event: SessionEvent,
): AgentRpProjectionState['surface'] {
  if (event.type !== 'user/message' && event.type !== 'assistant/message' && event.type !== 'tool/result') return surface
  const message = event.type === 'user/message' ? event.data : event.data.message
  if (event.type !== 'tool/result'
    && typeof (message.source as unknown as Record<string, unknown>)[PROMPT_REGEX_SOURCE_MARKER] === 'object') return surface
  const text = surfaceText(event)
  const role = surfaceRole(event)
  const node = {
    seq: event.seq,
    ...(text === undefined ? {} : { text }),
    ...(role === undefined ? {} : { role }),
  }
  const operation = event.surfaceOp
  if (operation === undefined) return surface
  if (operation === 'append') return [...surface, node]
  const start = surface.findIndex(value => value.seq === operation.start)
  const end = surface.findIndex(value => value.seq === operation.end)
  if (start < 0 || end < start) return surface
  return [
    ...surface.slice(0, start),
    node,
    ...surface.slice(end + 1),
  ]
}

function promptRegexTrace(event: SessionEvent): AgentRpProjection['promptRegex'] | undefined {
  const source = event.type === 'user/message'
    ? event.data.source
    : event.type === 'assistant/message' ? event.data.message.source : undefined
  if (source === undefined) return undefined
  return readPromptRegexSourceMarker(
    (source as unknown as Record<string, unknown>)[PROMPT_REGEX_SOURCE_MARKER],
  )?.trace
}

function worldInfoProjection(
  state: AgentRpProjectionState,
  ejsTemplateEngine?: EjsTemplateEngine,
): AgentRpProjection['worldInfo'] {
  const sources = withTavernWorldbooks([
    ...(state.cardLorebook === undefined ? [] : [state.cardLorebook]),
    ...Object.values(state.standaloneWorldInfos),
  ], state.tavern)
  const messages = state.surface.flatMap(node => node.text === undefined ? [] : [node.text])
  const transcript = state.surface.flatMap(node => node.text === undefined || node.role === undefined
    ? []
    : [{ role: node.role, content: node.text }])
  const configuredSources = sources.map(source => ({ source, configured: configuredLorebook(source, state.worldInfoConfiguration) }))
  const templateOptions = ejsTemplateEngine === undefined ? {} : {
    renderTemplate: ejsTemplateEngine.createRenderer({
      characterName: state.character.characterName,
      userName: state.character.persona?.name ?? state.character.userName ?? '用户',
      messages,
      transcript,
      variableScopes: state.tavern?.scopes ?? {},
      ...(state.mvu === undefined ? {} : { statData: state.mvu.statData }),
      worldInfoBooks: createEjsWorldInfoBooks(configuredSources.map(({ source, configured }) => ({
        id: source.id,
        name: source.name,
        lorebook: configured.lorebook,
      }))),
    }),
  }
  let activeCount = 0
  const aggregateBudget = worldInfoTokenBudget(state.worldInfoConfiguration)
  const inspectedCollection = inspectLorebooks(
    configuredSources.map(({ source, configured }) => ({ id: source.id, lorebook: configured.lorebook })),
    messages,
    { ...templateOptions, tokenBudget: aggregateBudget },
  )
  const books = configuredSources.map(({ source, configured }, sourceIndex) => {
    const inspected = inspectedCollection.books[sourceIndex]!.inspected
    const overrides = new Map(state.worldInfoConfiguration.overrides
      .filter(item => item.bookId === source.id).map(item => [item.entryIndex, item]))
    return {
      id: source.id,
      name: source.name,
      source: source.source,
      ...(source.lorebook.scanDepth === undefined ? {} : { scanDepth: source.lorebook.scanDepth }),
      ...(source.lorebook.tokenBudget === undefined ? {} : { tokenBudget: source.lorebook.tokenBudget }),
      recursiveScanning: source.lorebook.recursiveScanning,
      degradations: source.degradations,
      entries: configured.lorebook.entries.map((entry, index) => {
        const decision = inspected.entries[index]!
        const override = overrides.get(index)
        const deleted = configured.deleted.has(index)
        if (decision.active && !deleted) activeCount += 1
        return {
          index,
          sourceId: entry.sourceId,
          ...editableWorldInfoEntry(entry),
          useRegex: entry.useRegex,
          hasDecorators: entry.hasDecorators,
          active: decision.active && !deleted,
          reason: deleted ? 'deleted' as const : decision.reason,
          matchedKeys: decision.matchedKeys,
          matchedSecondaryKeys: decision.matchedSecondaryKeys,
          approximateTokens: decision.approximateTokens,
          ...(decision.template === undefined ? {} : { template: decision.template }),
          modified: override?.entry !== undefined,
          deleted,
        }
      }),
    }
  })
  return {
    revision: state.worldInfoConfiguration.revision,
    activeCount,
    tokenBudget: aggregateBudget,
    approximateTokens: inspectedCollection.approximateTokens,
    budgetExcludedCount: inspectedCollection.books.flatMap(book => book.inspected.entries)
      .filter(entry => entry.reason === 'session-budget-excluded').length,
    books,
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
  const helperScripts = presetTavernHelperScripts(preset)
  const compatibility = preset.extensionCompatibility
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
  const extensionStatus: NonNullable<AgentRpProjection['preset']>['extensionStatus'] = compatibility === undefined
    ? [
        preset.extensionSummary.hasSPreset ? {
          name: 'SPreset', detail: '旧导入未记录子功能状态，需重新导入后核对', state: 'unsupported' as const,
        } : undefined,
        preset.extensionSummary.hasTavernHelper ? {
          name: 'Tavern Helper', detail: '旧导入未记录脚本状态，需重新导入后核对', state: 'unsupported' as const,
        } : undefined,
      ].filter((value): value is NonNullable<typeof value> => value !== undefined)
    : [
    compatibility?.macroNestEnabled === undefined ? undefined : {
      name: '嵌套宏',
      detail: compatibility.macroNestEnabled
        ? '已由 Agent RP 组装器执行'
        : '原预设未启用',
      state: compatibility.macroNestEnabled ? 'active' as const : 'inactive' as const,
    },
    compatibility?.chatSquashEnabled === undefined ? undefined : {
      name: 'Chat Squash',
      detail: compatibility.chatSquashEnabled
        ? '原预设已启用，当前 Host 尚未执行'
        : '原预设已关闭，无需执行',
      state: compatibility.chatSquashEnabled ? 'unsupported' as const : 'inactive' as const,
    },
    compatibility?.regexBindingEnabled === undefined ? undefined : {
      name: '预设正则绑定',
      detail: compatibility.regexBindingEnabled
        ? '绑定扩展已启用；当前仅执行预设自带正则'
        : compatibility.regexBindingMatchesPresetScripts === true
          ? '绑定扩展已关闭；同一批预设正则已由 Agent RP 接管'
          : '原预设已关闭，无需执行',
      state: compatibility.regexBindingEnabled ? 'unsupported' as const
        : compatibility.regexBindingMatchesPresetScripts === true ? 'active' as const : 'inactive' as const,
    },
    compatibility?.tavernHelperScriptCount === undefined ? undefined : {
      name: 'Tavern Helper 脚本',
      detail: [
        compatibility.tavernHelperFormat === 'entries' ? '条目数组'
          : compatibility.tavernHelperFormat === 'object' ? '对象格式' : undefined,
        `${helperScripts.filter(script => script.enabled).length}/${helperScripts.length} 个脚本接管`,
        compatibility.tavernHelperVariableCount === undefined
          ? undefined : `${compatibility.tavernHelperVariableCount} 个变量`,
        compatibility.tavernHelperIgnoredFieldCount === undefined || compatibility.tavernHelperIgnoredFieldCount === 0
          ? undefined : `${compatibility.tavernHelperIgnoredFieldCount} 个扩展字段未接管`,
      ].filter((value): value is string => value !== undefined).join(' · '),
      state: helperScripts.some(script => script.enabled) ? 'active' as const : 'inactive' as const,
    },
      ].filter((value): value is NonNullable<typeof value> => value !== undefined)
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
    degradedRoleCount: preset.prompts.filter(prompt => enabled.has(prompt.identifier)
      && prompt.role !== 'system' && prompt.injectionPosition !== 1).length,
    preservedInChatCount: preset.prompts.filter(prompt => enabled.has(prompt.identifier) && prompt.injectionPosition === 1).length,
    regexScriptCount: preset.extensionSummary.regexScriptCount,
    enabledRegexScriptCount: regexScripts.filter(script => !script.disabled).length,
    activeDisplayRegexCount: regexScripts.filter(script => !script.disabled && script.markdownOnly).length,
    preservedPromptRegexCount: regexScripts.filter(script => !script.disabled
      && (!script.markdownOnly || script.promptOnly)).length,
    regexScripts: regexScripts.map((script, index) => ({ ...script, index })),
    tavernHelperScripts: helperScripts,
    tavernHelperVariables: preset.tavernHelperVariables ?? {},
    appliedGeneration,
    preservedGeneration,
    omittedExtensions: [
      preset.extensionSummary.hasSPreset ? 'SPreset' : undefined,
      preset.extensionSummary.hasTavernHelper ? 'Tavern Helper' : undefined,
    ].filter((value): value is string => value !== undefined),
    extensionStatus,
  }
}

function withoutCall(
  calls: Readonly<Record<string, TrackedCall>>,
  callId: string,
): Readonly<Record<string, TrackedCall>> {
  return Object.fromEntries(Object.entries(calls).filter(([id]) => id !== callId))
}

/** Build one projection definition with an optional isolated EJS evaluator. */
export function createAgentRpProjectionDefinition(
  ejsTemplateEngine?: EjsTemplateEngine,
): ProjectionDefinition<'agentRp', AgentRpProjectionState> {
  return {
  key: 'agentRp',
  schema: projectionSchema as never,
  init: () => ({
    character: INITIAL_CHARACTER,
    cardWorldInfoCount: 0,
    standaloneWorldInfos: {},
    worldInfoConfiguration: { format: 0, revision: 0, overrides: [] },
    surface: [],
    calls: {},
    personaCommands: {},
    presetLibrary: [],
    generations: {},
    publishedImages: [],
    pendingPublishedImages: [],
    replySeqByTurn: {},
  }),
  apply(state, event) {
    const surface = applySurface(state.surface, event)
    const withSurface = surface === state.surface ? state : { ...state, surface }
    const trace = promptRegexTrace(event)
    if (trace !== undefined) return { ...withSurface, promptRegex: trace }
    if (event.type === 'command/run' && event.data.name === 'rp-persona') {
      return {
        ...withSurface,
        personaCommands: { ...withSurface.personaCommands, [String(event.data.commandId)]: event.seq },
      }
    }
    if (event.type === 'command/done') {
      const commandId = String(event.data.commandId)
      const sourceEventSeq = withSurface.personaCommands[commandId]
      if (sourceEventSeq !== undefined) {
        const { [commandId]: _completed, ...personaCommands } = withSurface.personaCommands
        if (event.data.kind !== 'success') return { ...withSurface, personaCommands }
        try {
          const record = decodePersonaCommandRecord(event.data.text)
          if (record === undefined || record.sourceEventSeq !== sourceEventSeq) {
            return { ...withSurface, personaCommands }
          }
          const { persona: _persona, userName: _userName, ...character } = withSurface.character
          return {
            ...withSurface,
            personaCommands,
            character: {
              ...character,
              ...(record.persona === undefined ? {} : { persona: record.persona, userName: record.persona.name }),
              ...(record.persona !== undefined || record.fallbackUserName === undefined
                ? {}
                : { userName: record.fallbackUserName }),
            },
          }
        } catch {
          return { ...withSurface, personaCommands }
        }
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      try {
        const tavern = decodeTavernHelperState(event.data.text)
        if (tavern !== undefined) {
          const mvu = mvuAfterTavernMutation(withSurface.mvu, tavern)
          return {
            ...withSurface,
            tavern,
            ...(mvu === undefined ? {} : { mvu }),
          }
        }
      } catch {
        return withSurface
      }
    }
    const generation = event.type === 'command/done' && event.data.kind === 'success'
      ? decodeGenerationState(event.data.text)
      : event.type === ('agent-rp/generation-state' as SessionEvent['type'])
        ? (event as SessionEvent & { readonly data: GenerationStateRecord }).data
        : undefined
    if (generation !== undefined) {
      return {
        ...withSurface,
        ...(generation.mvu === undefined ? {} : { mvu: generation.mvu }),
        generations: { ...state.generations, [generation.groupId]: generation },
        currentReplySeq: generation.anchorSeq,
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let directWorldInfo: { readonly key: string; readonly source: SessionLorebookSource } | undefined
      try {
        const record = decodeWorldInfoLibraryImport(event.data.text)
        if (record !== undefined) {
          const meta = parseWorldInfoImportMeta(record.meta)
          directWorldInfo = { key: meta.result.sourceAttachmentId, source: standaloneLorebookSource(meta) }
        }
      } catch {
        return withSurface
      }
      if (directWorldInfo !== undefined) {
        return {
          ...withSurface,
          standaloneWorldInfos: {
            ...withSurface.standaloneWorldInfos,
            [directWorldInfo.key]: directWorldInfo.source,
          },
        }
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let worldInfoConfiguration
      try {
        worldInfoConfiguration = decodeWorldInfoConfiguration(event.data.text)
      } catch {
        return withSurface
      }
      if (worldInfoConfiguration !== undefined) return { ...withSurface, worldInfoConfiguration }
    }
    if (event.type === 'agent-rp/persona-seed') {
      try {
        const persona = parseSessionPersona(event.data.persona)
        return {
          ...withSurface,
          character: { ...withSurface.character, userName: persona.name, persona },
        }
      } catch {
        return withSurface
      }
    }
    if (event.type === 'agent-rp/sillytavern-chat-import') {
      const identity = readSillyTavernChatIdentity([event])
      return {
        ...withSurface,
        character: {
          ...withSurface.character,
          ...(withSurface.character.source === 'preset' && identity !== undefined
            ? { characterName: identity.characterName, source: 'sillytavern-chat' as const }
            : {}),
          ...(identity?.userName === undefined ? {} : { userName: identity.userName }),
          importedMessageCount: event.data.messages.length,
        },
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let chat: SillyTavernChatCommandRecord | undefined
      let launch: CharacterLibraryLaunchRecord | undefined
      try {
        launch = decodeCharacterLibraryLaunch(event.data.text)
        chat = decodeSillyTavernChatCommandRecord(event.data.text) ?? launch?.chat
      } catch {
        return withSurface
      }
      if (chat !== undefined) {
        const withChat = {
          ...withSurface,
          character: {
            ...withSurface.character,
            ...(withSurface.character.source === 'preset' && chat.characterName !== undefined
              ? { characterName: chat.characterName, source: 'sillytavern-chat' as const }
              : {}),
            ...(chat.userName === undefined ? {} : { userName: chat.userName }),
            importedMessageCount: chat.messageCount,
          },
        }
        if (launch === undefined) return withChat
        const card = parseCharacterCardValue(launch.meta.raw)
        const projected = cardProjection(withChat.character, launch.meta, card)
        const { avatarAttachmentId: _avatarAttachmentId, ...libraryCharacter } = projected.character
        const cardLorebook = cardLorebookSource(launch.meta, card)
        const { cardLorebook: _previousLorebook, ...withoutCardLorebook } = withChat
        return {
          ...withoutCardLorebook,
          character: {
            ...libraryCharacter,
            avatarLibraryId: launch.libraryId,
            ...(launch.persona === undefined ? {} : { persona: launch.persona }),
          },
          cardWorldInfoCount: projected.lorebookEntries,
          ...(cardLorebook === undefined ? {} : { cardLorebook }),
          mvu: readCurrentMvuState(card, []),
          tavern: initializeTavernHelperState(card.frontend, launch.meta.result.sourceAttachmentId, withChat.tavern),
        }
      }
    }
    if (event.type === 'agent-rp/character-card-seed') {
      const card = parseCharacterCardValue(event.data.meta.raw)
      const projected = cardProjection(withSurface.character, event.data.meta, card)
      const libraryId = 'characterLibraryId' in event.data.source
        ? event.data.source.characterLibraryId
        : undefined
      const cardLorebook = cardLorebookSource(event.data.meta, card)
      const { cardLorebook: _previousLorebook, ...withoutCardLorebook } = withSurface
      return {
        ...withoutCardLorebook,
        character: libraryId === undefined
          ? projected.character
          : { ...projected.character, avatarLibraryId: libraryId },
        cardWorldInfoCount: projected.lorebookEntries,
        ...(cardLorebook === undefined ? {} : { cardLorebook }),
        mvu: readCurrentMvuState(card, []) ,
        tavern: initializeTavernHelperState(card.frontend, event.data.meta.result.sourceAttachmentId, withSurface.tavern),
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let launch
      try {
        launch = decodeCharacterLibraryLaunch(event.data.text)
      } catch {
        return withSurface
      }
      if (launch !== undefined) {
        const card = parseCharacterCardValue(launch.meta.raw)
        const projected = cardProjection(withSurface.character, launch.meta, card)
        const { avatarAttachmentId: _avatarAttachmentId, ...libraryCharacter } = projected.character
        const cardLorebook = cardLorebookSource(launch.meta, card)
        const { cardLorebook: _previousLorebook, ...withoutCardLorebook } = withSurface
        return {
          ...withoutCardLorebook,
          character: {
            ...libraryCharacter,
            avatarLibraryId: launch.libraryId,
            ...(launch.persona === undefined ? {} : { persona: launch.persona }),
          },
          cardWorldInfoCount: projected.lorebookEntries,
          ...(cardLorebook === undefined ? {} : { cardLorebook }),
          mvu: readCurrentMvuState(card, []),
          tavern: initializeTavernHelperState(card.frontend, launch.meta.result.sourceAttachmentId, withSurface.tavern),
        }
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
        ...withSurface,
        preset: presetProjection(event.data.result.name, event.data.preset, 0, event.data.preset, event.data.libraryId),
        presetState,
        ...(withSurface.tavern === undefined ? {} : {
          tavern: initializeTavernHelperPresetState(
            withSurface.tavern,
            presetTavernHelperScripts(event.data.preset),
            event.data.preset.tavernHelperVariables ?? {},
            event.data.result.sourceAttachmentId,
          ),
        }),
      }
    }
    if (event.type === 'command/done' && event.data.kind === 'success') {
      let library
      try {
        library = parsePresetLibraryResult(event.data.text)
      } catch {
        return withSurface
      }
      if (library === undefined) return withSurface
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
          ...withSurface,
          presetLibrary: library.entries,
          preset: presetProjection(selected.name, selected.preset, 0, selected.preset, selected.libraryId),
          presetState,
          ...(withSurface.tavern === undefined ? {} : {
            tavern: initializeTavernHelperPresetState(
              withSurface.tavern,
              presetTavernHelperScripts(selected.preset),
              selected.preset.tavernHelperVariables ?? {},
              `library:${selected.libraryId}`,
            ),
          }),
        }
      }
      if (withSurface.preset === undefined || withSurface.presetState === undefined || library.linkedLibraryId === undefined) {
        return { ...withSurface, presetLibrary: library.entries }
      }
      return {
        ...withSurface,
        presetLibrary: library.entries,
        preset: { ...withSurface.preset, libraryId: library.linkedLibraryId },
        presetState: { ...withSurface.presetState, libraryId: library.linkedLibraryId },
      }
    }
    if (event.type === 'command/run' && event.data.name === 'rp-preset-configure' && event.data.args !== undefined) {
      if (withSurface.preset === undefined || withSurface.presetState === undefined) return withSurface
      try {
        const configured = configurePreset(withSurface.presetState, parsePresetConfigurationRequest(event.data.args))
        const revision = withSurface.presetState.revision + 1
        return {
          ...withSurface,
          preset: presetProjection(
            withSurface.preset.name,
            configured,
            revision,
            withSurface.presetState.importedPreset,
            withSurface.presetState.libraryId,
          ),
          presetState: { ...withSurface.presetState, preset: configured, revision },
        }
      } catch {
        return withSurface
      }
    }
    if (event.type === 'request/header') {
      const config = event.data.header.config
      return {
        ...withSurface,
        lastRequest: {
          eventSeq: event.seq,
          time: event.time,
          ...(withSurface.presetState === undefined ? {} : {
            presetName: withSurface.presetState.result.name,
            presetRevision: withSurface.presetState.revision,
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
    if (event.type === 'assistant/message' && event.surfaceOp === 'append') {
      const text = event.data.message.content
        .flatMap(block => block.type === 'text' ? [block.text] : [])
        .join('\n')
      const nextState = text.trim() === '' ? withSurface : {
        ...withSurface,
        currentReplySeq: event.seq,
        replySeqByTurn: { ...withSurface.replySeqByTurn, [String(event.data.turn)]: event.seq },
      }
      if (withSurface.mvu === undefined || !/<UpdateVariable(?:variable)?>/iu.test(text)) return nextState
      try {
        const update = applyMvuReply(withSurface.mvu.statData, text)
        return update === undefined ? nextState : {
          ...nextState,
          mvu: {
            statData: update.statData,
            updateCount: withSurface.mvu.updateCount + 1,
          },
        }
      } catch (error: unknown) {
        return {
          ...nextState,
          mvu: {
            ...withSurface.mvu,
            lastError: error instanceof Error ? error.message : String(error),
          },
        }
      }
    }
    if (event.type === 'turn/end') {
      const turn = String(event.data.turn)
      const replySeq = withSurface.replySeqByTurn[turn]
      const pending = withSurface.pendingPublishedImages.filter(image => image.turn === event.data.turn)
      const pendingPublishedImages = withSurface.pendingPublishedImages.filter(image => image.turn !== event.data.turn)
      const { [turn]: _completedTurn, ...replySeqByTurn } = withSurface.replySeqByTurn
      if (replySeq === undefined || pending.length === 0) {
        return { ...withSurface, pendingPublishedImages, replySeqByTurn }
      }
      return {
        ...withSurface,
        pendingPublishedImages,
        replySeqByTurn,
        publishedImages: [
          ...withSurface.publishedImages,
          ...pending.map(image => ({
            id: `published-roleplay-image-${image.publishResultSeq}`,
            replySeq,
            publishResultSeq: image.publishResultSeq,
            sourceEventSeq: image.meta.sourceEventSeq,
            ...(image.meta.sourceCallId === undefined ? {} : { sourceCallId: image.meta.sourceCallId }),
            images: image.meta.images,
            ...(image.meta.caption === undefined ? {} : { caption: image.meta.caption }),
          })),
        ],
      }
    }
    if (event.type === 'tool/call') {
      const kind = event.data.name === 'import_character_card'
        ? 'character-card'
        : event.data.name === 'import_world_info' ? 'world-info'
          : event.data.name === 'import_sillytavern_preset' ? 'preset'
            : event.data.name === PUBLISH_ROLEPLAY_IMAGE_TOOL ? 'roleplay-image' : undefined
      return kind === undefined
        ? withSurface
        : { ...withSurface, calls: { ...withSurface.calls, [String(event.data.callId)]: kind } }
    }
    if (event.type !== 'tool/result') return withSurface
    const callId = toolCallId(event)
    if (callId === undefined) return withSurface
    const kind = withSurface.calls[callId]
    if (kind === undefined) return withSurface
    const calls = withoutCall(withSurface.calls, callId)
    if (toolFailed(event)) return { ...withSurface, calls }
    if (kind === 'roleplay-image') {
      const meta = parsePublishedRoleplayImageMeta(event.data.meta)
      if (meta === undefined || meta.sourceEventSeq >= event.seq
        || withSurface.publishedImages.some(image => image.sourceEventSeq === meta.sourceEventSeq)
        || withSurface.pendingPublishedImages.some(image => image.meta.sourceEventSeq === meta.sourceEventSeq)) {
        return { ...withSurface, calls }
      }
      return {
        ...withSurface,
        calls,
        pendingPublishedImages: [
          ...withSurface.pendingPublishedImages,
          { turn: event.data.turn, publishResultSeq: event.seq, meta },
        ],
      }
    }
    if (kind === 'character-card') {
      const meta = parseCharacterMeta(event.data.meta)
      if (meta === undefined) return { ...withSurface, calls }
      const card = parseCharacterCardValue(meta.raw)
      const projected = cardProjection(withSurface.character, meta, card)
      const cardLorebook = cardLorebookSource(meta, card)
      const { cardLorebook: _previousLorebook, ...withoutCardLorebook } = withSurface
      return {
        ...withoutCardLorebook,
        calls,
        character: projected.character,
        cardWorldInfoCount: projected.lorebookEntries,
        ...(cardLorebook === undefined ? {} : { cardLorebook }),
        mvu: readCurrentMvuState(card, []),
        tavern: initializeTavernHelperState(card.frontend, meta.result.sourceAttachmentId, withSurface.tavern),
      }
    }
    if (kind === 'preset') {
      const meta = parsePresetMeta(event.data.meta)
      return meta === undefined
        ? { ...withSurface, calls }
        : {
            ...withSurface,
            calls,
            preset: presetProjection(meta.result.name, meta.preset, 0),
            presetState: {
              result: meta.result,
              importedPreset: meta.preset,
              preset: meta.preset,
              revision: 0,
            },
            ...(withSurface.tavern === undefined ? {} : {
              tavern: initializeTavernHelperPresetState(
                withSurface.tavern,
                presetTavernHelperScripts(meta.preset),
                meta.preset.tavernHelperVariables ?? {},
                meta.result.sourceAttachmentId,
              ),
            }),
          }
    }
    const meta = parseWorldInfoMeta(event.data.meta)
    return meta === undefined
      ? { ...withSurface, calls }
      : {
          ...withSurface,
          calls,
          standaloneWorldInfos: {
            ...withSurface.standaloneWorldInfos,
            [meta.result.sourceAttachmentId]: standaloneLorebookSource(meta),
          },
        }
  },
  view: state => {
    const worldInfo = worldInfoProjection(state, ejsTemplateEngine)
    const visibleTavernMessages = state.surface.flatMap(({ seq, text, role }) => text === undefined || role === undefined
      ? []
      : [{ seq, role, text, isHidden: false as const }])
    const hiddenTavernMessages = state.tavern?.hiddenPrefix ?? []
    return {
      ...state.character,
      worldInfoCount: worldInfo.books.reduce((total, book) => total + book.entries.filter(entry => !entry.deleted).length, 0),
      worldInfo,
      ...(state.mvu === undefined ? {} : { mvu: state.mvu }),
      ...(state.preset === undefined ? {} : { preset: state.preset }),
      presetLibrary: state.presetLibrary,
      ...(state.lastRequest === undefined ? {} : { lastRequest: state.lastRequest }),
      ...(state.promptRegex === undefined ? {} : { promptRegex: state.promptRegex }),
      generations: Object.values(state.generations).map(group => ({
        groupId: group.groupId,
        anchorSeq: group.anchorSeq,
        selectedVersionSeq: group.selectedVersionSeq,
        assistantSeqs: group.assistantSeqs,
        versions: group.versions,
      })),
      publishedImages: state.publishedImages,
      ...(state.currentReplySeq === undefined ? {} : { currentReplySeq: state.currentReplySeq }),
      ...(state.tavern === undefined ? {} : {
        tavern: {
          ...state.tavern,
          messages: [
            ...hiddenTavernMessages.map(message => ({ ...message, isHidden: true as const })),
            ...visibleTavernMessages,
          ].map((message, messageId) => ({ ...message, messageId })),
        },
      }),
    }
  },
  stateVersion: 10,
  }
}

/** Projection definition used by pure replay tests and deployments without EJS initialization. */
export const agentRpProjectionDefinition = createAgentRpProjectionDefinition()
