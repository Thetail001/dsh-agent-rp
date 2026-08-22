/** Session-log adapter from current SillyTavern assets into the native Roleplay runtime. */

import type { Session } from '@deepseek-ai/dsh-session'
import type { ResolvedConfig } from './config.ts'
import { cardFromImportMeta, readActiveSessionCharacter } from './import/session-character.ts'
import { readSillyTavernChatIdentity, type SillyTavernChatIdentity } from './import/sillytavern-chat-seed.ts'
import {
  readWorldInfoLibrarySessionSeed,
  type WorldInfoLibrarySeedRecord,
} from './import/session-world-info.ts'
import { readActiveSessionPreset, type ActiveSessionPreset } from './import/session-preset.ts'
import type { ImportedCharacterCard } from './import/types.ts'
import { readCurrentSessionMvuState, type MvuStateSnapshot } from './mvu.ts'
import { resolveSessionPersonaIdentity } from './session-persona.ts'
import { readTavernHelperState, type TavernHelperState } from './tavern-helper.ts'
import {
  configuredLorebook,
  readWorldInfoConfiguration,
  worldInfoTokenBudget,
  type SessionLorebookSource,
} from './world-info-configuration-core.ts'
import { readActiveSessionLorebookSourcesFromEvents } from './world-info-configuration.ts'
import {
  ROLEPLAY_TURN_PHASES,
  type RoleplayModuleBinding,
  type RoleplayResourceRef,
  type RoleplayRuntimeSnapshot,
} from './roleplay-runtime.ts'

/** One source plus the Session overlay that will be evaluated for this turn. */
export interface ConfiguredRoleplayLorebook {
  readonly source: SessionLorebookSource
  readonly configured: SessionLorebookSource['lorebook']
}

/** Adapter-private values retained while existing renderers migrate onto the runtime contract. */
export interface ResolvedSessionRoleplayRuntime {
  readonly snapshot: RoleplayRuntimeSnapshot
  readonly card?: ImportedCharacterCard
  readonly importedChat?: SillyTavernChatIdentity
  readonly worldScenario?: WorldInfoLibrarySeedRecord
  readonly preset?: ActiveSessionPreset
  readonly tavern?: TavernHelperState
  readonly mvu?: MvuStateSnapshot
  readonly lorebooks: readonly ConfiguredRoleplayLorebook[]
}

function sessionResource(id: string, name: string, adapter: string): RoleplayResourceRef {
  return { id, name, owner: 'session', adapter }
}

function runtimeModule(id: string, source: RoleplayModuleBinding['source'], phases: RoleplayModuleBinding['phases']) {
  return { id, source, phases } satisfies RoleplayModuleBinding
}

/**
 * Resolve the immutable resources participating in the next Roleplay turn.
 * Every Session-owned value is reconstructed from the event log; compatibility
 * formats stay behind this adapter instead of becoming the runtime contract.
 */
export function resolveSessionRoleplayRuntime(input: {
  readonly session: Session
  readonly deployment: ResolvedConfig
  readonly memoryWriteAvailable?: boolean
  readonly templateEngineAvailable?: boolean
}): ResolvedSessionRoleplayRuntime {
  const events = input.session.events
  const activeCharacter = readActiveSessionCharacter(events)
  const importedCard = activeCharacter === undefined ? undefined : cardFromImportMeta(activeCharacter.meta)
  const importedChat = readSillyTavernChatIdentity(events)
  const worldScenario = readWorldInfoLibrarySessionSeed(events)
  const preset = readActiveSessionPreset(events)
  const tavern = readTavernHelperState(events)
  const worldConfiguration = readWorldInfoConfiguration(events)
  const lorebooks = readActiveSessionLorebookSourcesFromEvents(events).map(source => ({
    source,
    configured: configuredLorebook(source, worldConfiguration).lorebook,
  }))
  const configuredCardLorebook = lorebooks.find(value => value.source.source === 'character')?.configured
  const card = importedCard === undefined
    ? undefined
    : (() => {
        const { lorebook: _importedLorebook, ...withoutLorebook } = importedCard
        return configuredCardLorebook === undefined
          ? withoutLorebook
          : { ...importedCard, lorebook: configuredCardLorebook }
      })()
  const identity = resolveSessionPersonaIdentity(
    events,
    activeCharacter?.result.userName,
    importedChat?.userName,
  )
  const mvu = card === undefined ? undefined : readCurrentSessionMvuState(card, input.session)

  const deploymentActor: RoleplayResourceRef = {
    id: 'deployment:default-actor',
    name: input.deployment.characterName,
    owner: 'deployment',
  }
  let actor: RoleplayResourceRef | undefined
  if (activeCharacter !== undefined && card !== undefined) {
    actor = sessionResource(
      `character:${activeCharacter.result.sourceAttachmentId}`,
      card.nickname?.trim() || card.name,
      'sillytavern:character-card',
    )
  } else if (importedChat !== undefined) {
    actor = sessionResource('session:imported-chat-actor', importedChat.characterName, 'sillytavern:chat')
  } else if (worldScenario === undefined) {
    actor = deploymentActor
  }
  const experience = worldScenario !== undefined && actor === undefined
    ? {
        ...sessionResource(
          `world:${worldScenario.meta.result.sourceAttachmentId}`,
          worldScenario.meta.result.name,
          'sillytavern:world-info',
        ),
        mode: 'scene' as const,
      }
    : { ...(actor ?? deploymentActor), mode: 'character' as const }
  const participant = identity.persona !== undefined
    ? {
        id: identity.persona.id,
        name: identity.persona.name,
        owner: 'session' as const,
        description: identity.persona.description,
      }
    : identity.userName === undefined
      ? undefined
      : sessionResource('session:participant-identity', identity.userName, 'sillytavern:identity')
  const promptResource = preset === undefined
    ? undefined
    : sessionResource(
        `preset:${preset.result.sourceAttachmentId}`,
        preset.result.name,
        'sillytavern:chat-completion-preset',
      )
  const state = [
    ...(mvu === undefined ? [] : [{
      id: 'state:mvu',
      owner: 'session' as const,
      adapter: 'sillytavern:mvu',
      revision: mvu.updateCount,
    }]),
    ...(tavern === undefined ? [] : [{
      id: 'state:tavern-helper',
      owner: 'session' as const,
      adapter: 'sillytavern:tavern-helper',
    }]),
  ]
  const modules: RoleplayModuleBinding[] = [
    runtimeModule('roleplay:prompt', 'native', ['prepare']),
    runtimeModule('roleplay:memory', 'native', ['prepare', 'generate']),
    runtimeModule('roleplay:reply-versions', 'native', ['present']),
    ...(lorebooks.length === 0 ? [] : [runtimeModule('roleplay:world', 'native', ['prepare'])]),
    ...(preset === undefined ? [] : [runtimeModule('adapter:prompt-modules', 'adapter', ['prepare'])]),
    ...(mvu === undefined ? [] : [runtimeModule('adapter:mvu', 'adapter', ['prepare', 'settle'])]),
    ...(tavern === undefined ? [] : [runtimeModule('adapter:tavern-helper', 'adapter', ROLEPLAY_TURN_PHASES)]),
    ...(input.templateEngineAvailable === true ? [runtimeModule('adapter:ejs', 'adapter', ['prepare'])] : []),
  ]
  const tokenBudget = worldInfoTokenBudget(worldConfiguration)
  const snapshot: RoleplayRuntimeSnapshot = {
    format: 0,
    lifecycle: ROLEPLAY_TURN_PHASES,
    experience,
    ...(actor === undefined ? {} : { actor }),
    ...(participant === undefined ? {} : { participant }),
    world: {
      bindings: lorebooks.map(({ source }) => ({
        ...sessionResource(
          source.id,
          source.name,
          source.source === 'character' ? 'sillytavern:character-book' : 'sillytavern:world-info',
        ),
        placement: source.source === 'character' ? 'actor' as const : 'experience' as const,
      })),
      ...(tokenBudget === undefined ? {} : { tokenBudget }),
    },
    prompt: promptResource === undefined
      ? { strategy: 'native' }
      : { strategy: 'modules', resource: promptResource },
    state,
    memory: { read: true, write: input.memoryWriteAvailable === true },
    modules,
  }
  return {
    snapshot,
    ...(card === undefined ? {} : { card }),
    ...(importedChat === undefined ? {} : { importedChat }),
    ...(worldScenario === undefined ? {} : { worldScenario }),
    ...(preset === undefined ? {} : { preset }),
    ...(tavern === undefined ? {} : { tavern }),
    ...(mvu === undefined ? {} : { mvu }),
    lorebooks,
  }
}
