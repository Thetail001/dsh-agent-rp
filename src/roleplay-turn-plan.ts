/** Pure, provider-neutral plan compiled for one Roleplay turn. */

import type { JsonValue, Session, UserMessage } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import {
  createEjsWorldInfoBooks,
  EjsTemplateEngine,
  type EjsTemplateContext,
} from './ejs-template.ts'
import type { LorebookActivationReason } from './import/lorebook.ts'
import { readAgentRpMemoryHistory } from './memory.ts'
import { MVU_ROLEPLAY_MODULE_ID } from './mvu.ts'
import {
  renderActiveMemoryContext,
  renderCharacterPrompt,
  renderImportedChatPrompt,
  renderImportedCharacterPrompt,
  renderWorldInfoScenarioPrompt,
  roleplayVisibleDialogue,
  roleplayVisibleTranscript,
  renderSessionLorebooks,
} from './prompt.ts'
import {
  assembleSillyTavernPreset,
  type RoleplayInChatPrompt,
  type RoleplayProviderPromptPlan,
} from './preset-prompt.ts'
import {
  ROLEPLAY_EJS_ADAPTER_MODULE_ID,
  ROLEPLAY_MEMORY_MODULE_ID,
  ROLEPLAY_PROMPT_ADAPTER_MODULE_ID,
  ROLEPLAY_PROMPT_MODULE_ID,
  ROLEPLAY_WORLD_MODULE_ID,
  type RoleplayRuntimeSnapshot,
  type RoleplayStateBinding,
  type RoleplayWorldBinding,
} from './roleplay-runtime.ts'
import type { ResolvedSessionRoleplayRuntime } from './session-roleplay-runtime.ts'
import { renderRoleplayStateContext, ROLEPLAY_STATE_MODULE_ID } from './roleplay-state.ts'
import {
  tavernInjectedInChatPrompts,
  tavernInjectedScanText,
  TAVERN_HELPER_ROLEPLAY_MODULE_ID,
  type TavernHelperState,
} from './tavern-helper.ts'
import {
  ReplayableRoleplayMacros,
  type RoleplayMacroContext,
} from './roleplay-macro.ts'

/** Exact replay key for the Session surface and newly claimed messages used by preparation. */
export interface RoleplayTurnInputKey {
  readonly sessionId: string
  readonly sessionSeq: number
  readonly pendingMessageIds: readonly string[]
}

/** Provider-neutral generation preferences selected for this turn. */
export interface RoleplayGenerationPolicy {
  readonly temperature?: number
  readonly maxTokens?: number
  readonly reasoningEffort?: string
  readonly topP?: number
  readonly topK?: number
  readonly topA?: number
  readonly minP?: number
  readonly frequencyPenalty?: number
  readonly presencePenalty?: number
  readonly repetitionPenalty?: number
}

/** Explainable decision for one entry without retaining its private source text twice. */
export interface RoleplayWorldEntryDecision {
  readonly entryId: string
  readonly index: number
  readonly active: boolean
  readonly reason: LorebookActivationReason
  readonly matchedKeys: readonly string[]
  readonly matchedSecondaryKeys: readonly string[]
  readonly approximateTokens: number
  readonly template?: 'rendered' | 'source-limit' | 'syntax-error' | 'runtime-error'
    | 'execution-limit' | 'memory-limit' | 'output-limit' | 'resource-unsupported' | 'resource-limit'
}

/** Activated prompt contributions and diagnostics for one bound world resource. */
export interface RoleplayWorldResourcePlan {
  readonly resource: RoleplayWorldBinding
  readonly beforeActor: readonly string[]
  readonly afterActor: readonly string[]
  readonly entries: readonly RoleplayWorldEntryDecision[]
}

/** World preparation result in semantic experience/actor order. */
export interface RoleplayWorldPlan {
  readonly engine: 'native-v0'
  readonly resources: readonly RoleplayWorldResourcePlan[]
  readonly inChat: readonly RoleplayInChatPrompt[]
  readonly experienceBeforeActor: readonly string[]
  readonly actorBefore: readonly string[]
  readonly actorAfter: readonly string[]
  readonly experienceAfterActor: readonly string[]
  readonly approximateTokens: number
  readonly tokenBudget?: number
}

/** Content-free module outcome useful for diagnostics and later orchestration. */
export interface RoleplayPrepareModuleOutcome {
  readonly moduleId: string
  readonly outcome: 'applied' | 'idle' | 'degraded'
  readonly contributions: number
}

/** Final prompt plus adapter expansion diagnostics. */
export interface RoleplayTurnPromptPlan extends RoleplayProviderPromptPlan {
  readonly systemPromptText: string
  readonly diagnostics: {
    readonly enabledModules: number
    readonly unsupportedMacros: number
    readonly templateFailures: number
  }
}

/** Exact state value and log boundary consumed while preparing this turn. */
export interface RoleplayStateRead extends RoleplayStateBinding {
  readonly eventSeq?: number
  readonly writerModuleId?: string
  readonly value?: JsonValue
}

/** One durable memory record consulted while preparing this turn. */
export interface RoleplayMemoryRead {
  readonly id: string
  readonly sourceEventSeq: number
}

/** Exact memory policy, references, and model-visible context compiled for this turn. */
export type RoleplayMemoryPlan = RoleplayRuntimeSnapshot['memory'] & {
  readonly reads: readonly RoleplayMemoryRead[]
  readonly contextText: string
}

/** Immutable result of the prepare phase, with no renderer or source-format object in its public contract. */
export interface RoleplayTurnPlan {
  readonly format: 0
  readonly input: RoleplayTurnInputKey
  readonly runtime: RoleplayRuntimeSnapshot
  readonly world: RoleplayWorldPlan
  readonly prompt: RoleplayTurnPromptPlan
  readonly stateReads: readonly RoleplayStateRead[]
  readonly memory: RoleplayMemoryPlan
  readonly generation: RoleplayGenerationPolicy
  readonly prepare: {
    readonly modules: readonly RoleplayPrepareModuleOutcome[]
  }
}

export interface PrepareRoleplayTurnInput {
  readonly session: Session
  /** Exact logical next seq when replay construction appended a non-semantic lifecycle marker. */
  readonly sessionBoundarySeq?: number
  readonly pendingMessages?: readonly UserMessage[]
  readonly deployment: ResolvedConfig
  readonly resolved: ResolvedSessionRoleplayRuntime
  readonly templateEngine?: EjsTemplateEngine
}

const nativeProviderPrompt = (): RoleplayProviderPromptPlan => ({
  beforeHistory: [],
  afterHistory: [],
  inChat: [],
  includeHistory: true,
})

function variableScopes(state: TavernHelperState | undefined): NonNullable<EjsTemplateContext['variableScopes']> {
  return state?.scopes ?? {}
}

function templateOptions(engine: EjsTemplateEngine | undefined, context: EjsTemplateContext) {
  return engine === undefined ? {} : {
    regexEngine: engine,
    renderTemplate: engine.createRenderer(context),
  }
}

function worldPlan(
  resolved: ResolvedSessionRoleplayRuntime,
  rendered: ReturnType<typeof renderSessionLorebooks>,
): RoleplayWorldPlan {
  const resources = rendered.books.map((book, index): RoleplayWorldResourcePlan => {
    const resource = resolved.snapshot.world.bindings[index]
    const configured = resolved.lorebooks[index]?.configured
    if (resource === undefined || configured === undefined || resource.id !== book.id) {
      throw new Error('Roleplay world bindings do not match the evaluated resources')
    }
    return {
      resource,
      beforeActor: book.inspected.beforeCharacter,
      afterActor: book.inspected.afterCharacter,
      entries: book.inspected.entries.map((decision) => {
        const source = configured.entries[decision.index]
        if (source === undefined) throw new Error('Roleplay world decision references a missing entry')
        return {
          entryId: source.sourceId,
          index: decision.index,
          active: decision.active,
          reason: decision.reason,
          matchedKeys: decision.matchedKeys,
          matchedSecondaryKeys: decision.matchedSecondaryKeys,
          approximateTokens: decision.approximateTokens,
          ...(decision.template === undefined ? {} : { template: decision.template }),
        }
      }),
    }
  })
  const contributions = (placement: RoleplayWorldBinding['placement'], side: 'beforeActor' | 'afterActor') =>
    resources.filter(item => item.resource.placement === placement).flatMap(item => item[side])
  return {
    engine: rendered.engine,
    resources,
    inChat: rendered.inChat,
    experienceBeforeActor: contributions('experience', 'beforeActor'),
    actorBefore: contributions('actor', 'beforeActor'),
    actorAfter: contributions('actor', 'afterActor'),
    experienceAfterActor: contributions('experience', 'afterActor'),
    approximateTokens: rendered.approximateTokens,
    ...(rendered.tokenBudget === undefined ? {} : { tokenBudget: rendered.tokenBudget }),
  }
}

/** Validate one explicit outcome from every module that declared prepare participation. */
export function resolveRoleplayPrepareModuleOutcomes(
  runtime: RoleplayRuntimeSnapshot,
  declarations: readonly RoleplayPrepareModuleOutcome[],
): readonly RoleplayPrepareModuleOutcome[] {
  const active = runtime.modules.filter(module => module.phases.includes('prepare'))
  const activeIds = new Set(active.map(module => module.id))
  const declared = new Map<string, RoleplayPrepareModuleOutcome>()
  for (const declaration of declarations) {
    if (!activeIds.has(declaration.moduleId)) {
      throw new Error(`Roleplay prepare declaration references inactive module ${declaration.moduleId}`)
    }
    if (declared.has(declaration.moduleId)) {
      throw new Error(`Roleplay prepare module ${declaration.moduleId} declared more than once`)
    }
    if (!Number.isSafeInteger(declaration.contributions) || declaration.contributions < 0) {
      throw new Error(`Roleplay prepare module ${declaration.moduleId} has an invalid contribution count`)
    }
    declared.set(declaration.moduleId, declaration)
  }
  return active.map(module => {
    const declaration = declared.get(module.id)
    if (declaration === undefined) {
      throw new Error(`Roleplay prepare module ${module.id} did not declare an outcome`)
    }
    return declaration
  })
}

/** Compile all Session resources into the exact immutable inputs consumed by the next generation. */
export function prepareRoleplayTurn(input: PrepareRoleplayTurnInput): RoleplayTurnPlan {
  const pendingMessages = input.pendingMessages ?? []
  const sessionBoundarySeq = input.sessionBoundarySeq ?? input.session.seq
  if (!Number.isSafeInteger(sessionBoundarySeq) || sessionBoundarySeq < 0
    || sessionBoundarySeq > input.session.seq) {
    throw new Error('Roleplay preparation Session boundary is invalid')
  }
  const { resolved } = input
  const { snapshot, tavern } = resolved
  const injectedScanText = tavernInjectedScanText(tavern)
  const books = resolved.lorebooks.map(({ source, configured }) => ({
    id: source.id,
    name: source.name,
    lorebook: configured,
  }))
  const characterName = resolved.card?.nickname?.trim() || resolved.card?.name
    || snapshot.actor?.name || snapshot.experience.name
  const userName = snapshot.participant?.name
  const transcript = roleplayVisibleTranscript(input.session, pendingMessages)
  const macroContext: RoleplayMacroContext = {
    ...(resolved.card === undefined ? {} : { card: resolved.card }),
    characterName,
    ...(userName === undefined ? {} : { userName }),
    ...(snapshot.participant?.description === undefined
      ? {} : { userPersona: snapshot.participant.description }),
    messages: transcript.flatMap(message => message.role === 'system'
      ? [] : [{ role: message.role, content: message.content }]),
    pendingInput: pendingMessages.flatMap(message => message.content
      .flatMap(block => block.type === 'text' ? [block.text] : [])).join('\n'),
    entropy: JSON.stringify([
      String(input.session.id),
      sessionBoundarySeq,
      ...pendingMessages.map(message => String(message.id)),
    ]),
    stableEntropy: String(input.session.id),
  }
  const options = templateOptions(input.templateEngine, {
    characterName,
    userName: userName ?? '用户',
    messages: [...roleplayVisibleDialogue(input.session, pendingMessages), ...injectedScanText],
    transcript,
    variableScopes: variableScopes(tavern),
    ...(resolved.mvu === undefined ? {} : { statData: resolved.mvu.statData }),
    worldInfoBooks: createEjsWorldInfoBooks(books),
  })
  const worldMacros = new ReplayableRoleplayMacros(macroContext)
  const world = worldPlan(resolved, renderSessionLorebooks({
    books,
    session: input.session,
    pendingMessages,
    scanText: injectedScanText,
    ...(resolved.mvu === undefined ? {} : { statData: resolved.mvu.statData }),
    templateOptions: { ...options, renderMacro: value => worldMacros.expand(value) },
    ...(snapshot.world.tokenBudget === undefined ? {} : { tokenBudget: snapshot.world.tokenBudget }),
  }))
  const experienceBefore = world.experienceBeforeActor
  const experienceAfter = world.experienceAfterActor
  const loreBefore = [...experienceBefore, ...world.actorBefore]
  const loreAfter = [...world.actorAfter, ...experienceAfter]
  const injectedPrompts = tavernInjectedInChatPrompts(tavern)
  let providerPrompt = nativeProviderPrompt()
  let systemPromptText = ''
  let enabledModules = 0
  let unsupportedMacros = worldMacros.unsupportedCount
  let templateRenders = 0
  let templateFailures = 0

  if (snapshot.prompt.strategy === 'modules' && resolved.preset !== undefined) {
    const assembled = assembleSillyTavernPreset(resolved.preset.preset, {
      ...(resolved.card === undefined ? { characterName } : { card: resolved.card }),
      ...(userName === undefined ? {} : { userName }),
      ...(snapshot.participant?.description === undefined
        ? {} : { userPersona: snapshot.participant.description }),
      worldInfoBefore: loreBefore,
      worldInfoAfter: loreAfter,
      session: input.session,
      pendingMessages,
      macroContext,
      worldInfoMacrosResolved: true,
      mvuEnabled: resolved.mvu !== undefined,
      ...(options.renderTemplate === undefined ? {} : { renderTemplate: options.renderTemplate }),
    })
    providerPrompt = assembled
    enabledModules = assembled.enabledPromptCount
    unsupportedMacros += assembled.unsupportedMacroCount
    templateRenders = assembled.templateRenderCount
    templateFailures = assembled.templateFailureCount
  } else if (resolved.card !== undefined) {
    const cardMacros = new ReplayableRoleplayMacros(macroContext)
    systemPromptText = renderImportedCharacterPrompt(
      resolved.card,
      loreBefore,
      loreAfter,
      userName,
      resolved.mvu?.statData,
      snapshot.participant?.description,
      options,
      cardMacros,
      true,
    )
    unsupportedMacros += cardMacros.unsupportedCount
  } else if (resolved.importedChat !== undefined) {
    systemPromptText = [
      ...experienceBefore,
      renderImportedChatPrompt(
        resolved.importedChat.characterName,
        userName,
        snapshot.participant?.description,
      ),
      ...experienceAfter,
    ].join('\n\n')
  } else if (resolved.worldScenario !== undefined) {
    systemPromptText = renderWorldInfoScenarioPrompt(
      experienceBefore,
      experienceAfter,
      snapshot.participant?.description,
    )
  } else {
    systemPromptText = renderCharacterPrompt(input.deployment, experienceBefore, experienceAfter)
  }

  const prompt: RoleplayTurnPromptPlan = {
    ...providerPrompt,
    inChat: [...providerPrompt.inChat, ...world.inChat, ...injectedPrompts],
    systemPromptText: [systemPromptText, renderRoleplayStateContext(resolved.nativeStates)]
      .filter(text => text !== '').join('\n\n'),
    diagnostics: { enabledModules, unsupportedMacros, templateFailures },
  }
  const nativeStatesById = new Map(resolved.nativeStates.map(state => [state.id, state]))
  const stateReads: RoleplayStateRead[] = snapshot.state.map((binding) => {
    const nativeState = nativeStatesById.get(binding.id)
    return nativeState === undefined ? binding : {
      ...binding,
      eventSeq: nativeState.eventSeq,
      writerModuleId: nativeState.writerModuleId,
      value: nativeState.value,
    }
  })
  const memoryHistory = readAgentRpMemoryHistory(input.session.events)
  const memory: RoleplayMemoryPlan = {
    ...snapshot.memory,
    reads: memoryHistory.active.map(record => ({
      id: String(record.id),
      sourceEventSeq: record.sourceEventSeq,
    })),
    contextText: renderActiveMemoryContext(memoryHistory.active, snapshot.memory.write),
  }
  const worldContributions = world.resources.reduce(
    (count, resource) => count + resource.beforeActor.length + resource.afterActor.length,
    world.inChat.length,
  )
  const promptContributions = providerPrompt.beforeHistory.length + providerPrompt.afterHistory.length
    + providerPrompt.inChat.length + (systemPromptText === '' ? 0 : 1)
  const worldEntries = world.resources.flatMap(resource => resource.entries)
  const worldTemplateAttempts = worldEntries.filter(entry => entry.template !== undefined).length
  const worldTemplateFailures = worldEntries.filter(entry =>
    entry.reason === 'template-error' || entry.reason === 'template-unsupported').length
  const ejsContributions = templateRenders + templateFailures + worldTemplateAttempts
  const ejsFailures = templateFailures + worldTemplateFailures
  const prepareDeclarations: RoleplayPrepareModuleOutcome[] = [
    {
      moduleId: ROLEPLAY_PROMPT_MODULE_ID,
      outcome: promptContributions === 0 ? 'idle' : 'applied',
      contributions: promptContributions,
    },
    {
      moduleId: ROLEPLAY_MEMORY_MODULE_ID,
      outcome: memory.reads.length === 0 && !memory.write ? 'idle' : 'applied',
      contributions: memory.reads.length + (memory.write ? 1 : 0),
    },
    ...(world.resources.length === 0 ? [] : [{
      moduleId: ROLEPLAY_WORLD_MODULE_ID,
      outcome: worldContributions === 0 ? 'idle' as const : 'applied' as const,
      contributions: worldContributions,
    }]),
    ...(resolved.preset === undefined ? [] : [{
      moduleId: ROLEPLAY_PROMPT_ADAPTER_MODULE_ID,
      outcome: enabledModules === 0 ? 'idle' as const : 'applied' as const,
      contributions: enabledModules,
    }]),
    ...(resolved.nativeStates.length === 0 ? [] : [{
      moduleId: ROLEPLAY_STATE_MODULE_ID,
      outcome: 'applied' as const,
      contributions: resolved.nativeStates.length,
    }]),
    ...(resolved.mvu === undefined ? [] : [{
      moduleId: MVU_ROLEPLAY_MODULE_ID,
      outcome: 'applied' as const,
      contributions: 1,
    }]),
    ...(tavern === undefined ? [] : [{
      moduleId: TAVERN_HELPER_ROLEPLAY_MODULE_ID,
      outcome: 'applied' as const,
      contributions: injectedScanText.length + injectedPrompts.length,
    }]),
    ...(snapshot.modules.some(module => module.id === ROLEPLAY_EJS_ADAPTER_MODULE_ID) ? [{
      moduleId: ROLEPLAY_EJS_ADAPTER_MODULE_ID,
      outcome: input.templateEngine === undefined || ejsFailures > 0 ? 'degraded' as const
        : ejsContributions === 0 ? 'idle' as const : 'applied' as const,
      contributions: ejsContributions,
    }] : []),
  ]
  return {
    format: 0,
    input: {
      sessionId: String(input.session.id),
      sessionSeq: sessionBoundarySeq,
      pendingMessageIds: pendingMessages.map(message => String(message.id)),
    },
    runtime: snapshot,
    world,
    prompt,
    stateReads,
    memory,
    generation: { ...(resolved.preset?.preset.generation ?? {}) },
    prepare: { modules: resolveRoleplayPrepareModuleOutcomes(snapshot, prepareDeclarations) },
  }
}
