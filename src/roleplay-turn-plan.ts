/** Pure, provider-neutral plan compiled for one Roleplay turn. */

import type { JsonValue, Session, UserMessage } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import {
  createEjsWorldInfoBooks,
  EjsTemplateEngine,
  type EjsTemplateContext,
} from './ejs-template.ts'
import type { LorebookActivationReason } from './import/lorebook.ts'
import {
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
  type RoleplayProviderPromptPlan,
} from './preset-prompt.ts'
import type {
  RoleplayRuntimeSnapshot,
  RoleplayStateBinding,
  RoleplayWorldBinding,
} from './roleplay-runtime.ts'
import type { ResolvedSessionRoleplayRuntime } from './session-roleplay-runtime.ts'
import { renderRoleplayStateContext, ROLEPLAY_STATE_MODULE_ID } from './roleplay-state.ts'
import {
  tavernInjectedInChatPrompts,
  tavernInjectedScanText,
  type TavernHelperState,
} from './tavern-helper.ts'

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

/** Immutable result of the prepare phase, with no renderer or source-format object in its public contract. */
export interface RoleplayTurnPlan {
  readonly format: 0
  readonly input: RoleplayTurnInputKey
  readonly runtime: RoleplayRuntimeSnapshot
  readonly world: RoleplayWorldPlan
  readonly prompt: RoleplayTurnPromptPlan
  readonly stateReads: readonly RoleplayStateRead[]
  readonly memory: RoleplayRuntimeSnapshot['memory']
  readonly generation: RoleplayGenerationPolicy
  readonly prepare: {
    readonly modules: readonly RoleplayPrepareModuleOutcome[]
  }
}

export interface PrepareRoleplayTurnInput {
  readonly session: Session
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
    experienceBeforeActor: contributions('experience', 'beforeActor'),
    actorBefore: contributions('actor', 'beforeActor'),
    actorAfter: contributions('actor', 'afterActor'),
    experienceAfterActor: contributions('experience', 'afterActor'),
    approximateTokens: rendered.approximateTokens,
    ...(rendered.tokenBudget === undefined ? {} : { tokenBudget: rendered.tokenBudget }),
  }
}

function preparationOutcomes(
  runtime: RoleplayRuntimeSnapshot,
  world: RoleplayWorldPlan,
  prompt: RoleplayTurnPromptPlan,
  nativeStateCount: number,
): readonly RoleplayPrepareModuleOutcome[] {
  const worldContributions = world.resources.reduce(
    (count, resource) => count + resource.beforeActor.length + resource.afterActor.length,
    0,
  )
  const promptContributions = prompt.beforeHistory.length + prompt.afterHistory.length + prompt.inChat.length
    + (prompt.systemPromptText === '' ? 0 : 1)
  return runtime.modules.filter(module => module.phases.includes('prepare')).map(module => {
    const contributions = module.id === 'roleplay:world' ? worldContributions
      : module.id === 'roleplay:prompt' || module.id === 'adapter:prompt-modules' ? promptContributions
        : module.id === ROLEPLAY_STATE_MODULE_ID ? nativeStateCount
        : module.id === 'adapter:tavern-helper' ? prompt.inChat.length
          : 0
    const degraded = module.id === 'adapter:ejs' && prompt.diagnostics.templateFailures > 0
    return {
      moduleId: module.id,
      outcome: degraded ? 'degraded' : contributions === 0 && module.id === 'roleplay:world' ? 'idle' : 'applied',
      contributions,
    }
  })
}

/** Compile all Session resources into the exact immutable inputs consumed by the next generation. */
export function prepareRoleplayTurn(input: PrepareRoleplayTurnInput): RoleplayTurnPlan {
  const pendingMessages = input.pendingMessages ?? []
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
  const options = templateOptions(input.templateEngine, {
    characterName,
    userName: userName ?? '用户',
    messages: [...roleplayVisibleDialogue(input.session, pendingMessages), ...injectedScanText],
    transcript: roleplayVisibleTranscript(input.session, pendingMessages),
    variableScopes: variableScopes(tavern),
    ...(resolved.mvu === undefined ? {} : { statData: resolved.mvu.statData }),
    worldInfoBooks: createEjsWorldInfoBooks(books),
  })
  const world = worldPlan(resolved, renderSessionLorebooks({
    books,
    session: input.session,
    pendingMessages,
    scanText: injectedScanText,
    ...(resolved.mvu === undefined ? {} : { statData: resolved.mvu.statData }),
    templateOptions: options,
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
  let unsupportedMacros = 0
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
      mvuEnabled: resolved.mvu !== undefined,
      ...(options.renderTemplate === undefined ? {} : { renderTemplate: options.renderTemplate }),
    })
    providerPrompt = assembled
    enabledModules = assembled.enabledPromptCount
    unsupportedMacros = assembled.unsupportedMacroCount
    templateFailures = assembled.templateFailureCount
  } else if (resolved.card !== undefined) {
    systemPromptText = renderImportedCharacterPrompt(
      resolved.card,
      loreBefore,
      loreAfter,
      userName,
      resolved.mvu?.statData,
      snapshot.participant?.description,
      options,
    )
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
    inChat: [...providerPrompt.inChat, ...injectedPrompts],
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
  return {
    format: 0,
    input: {
      sessionId: String(input.session.id),
      sessionSeq: input.session.seq,
      pendingMessageIds: pendingMessages.map(message => String(message.id)),
    },
    runtime: snapshot,
    world,
    prompt,
    stateReads,
    memory: snapshot.memory,
    generation: { ...(resolved.preset?.preset.generation ?? {}) },
    prepare: { modules: preparationOutcomes(snapshot, world, prompt, resolved.nativeStates.length) },
  }
}
