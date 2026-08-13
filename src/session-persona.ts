/** Durable Persona snapshot selected for one Roleplay Session. */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  parseSessionPersonaSnapshot,
  type SessionPersonaSnapshot,
} from './persona-library-protocol.ts'
import { decodeCharacterLibraryLaunch } from './import/session-character.ts'
import { decodePersonaCommandRecord } from './persona-command-protocol.ts'

/** Session event carrying a Persona snapshot independently from the Character Card. */
export interface PersonaSeedRecord {
  readonly format: 0
  readonly persona: SessionPersonaSnapshot
}

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /** Skippable player Persona selected when a Roleplay Session is created. */
    'agent-rp/persona-seed': PersonaSeedRecord
  }
}

/** Validate and normalize one Session-owned Persona snapshot. */
export function parseSessionPersona(value: unknown): SessionPersonaSnapshot {
  return parseSessionPersonaSnapshot(value)
}

/** Return the latest Persona snapshot explicitly selected for one Session. */
export function readSessionPersona(events: readonly SessionEvent[]): SessionPersonaSnapshot | undefined {
  return readSessionPersonaSelection(events).persona
}

/** Latest explicit Persona choice, including a durable clear operation. */
export interface SessionPersonaSelection {
  readonly explicit: boolean
  readonly persona?: SessionPersonaSnapshot
  readonly fallbackUserName?: string
}

/** Return the latest Persona choice and whether the Session explicitly owns it. */
export function readSessionPersonaSelection(events: readonly SessionEvent[]): SessionPersonaSelection {
  let active: SessionPersonaSnapshot | undefined
  let explicit = false
  let fallbackUserName: string | undefined
  for (const event of events) {
    if (event.type === 'command/done' && event.data.kind === 'success') {
      const launch = decodeCharacterLibraryLaunch(event.data.text)
      if (launch?.persona !== undefined) {
        active = launch.persona
        explicit = true
        fallbackUserName = undefined
        continue
      }
      const selection = decodePersonaCommandRecord(event.data.text)
      if (selection !== undefined) {
        const source = events[selection.sourceEventSeq]
        if (source?.type !== 'command/run' || source.data.name !== 'rp-persona'
          || source.seq >= event.seq || String(source.data.commandId) !== String(event.data.commandId)) {
          throw new Error('Persona 结果没有对应的命令来源')
        }
        active = selection.persona
        explicit = true
        fallbackUserName = selection.fallbackUserName
      }
      continue
    }
    if (event.type !== 'agent-rp/persona-seed') continue
    if (event.data.format !== 0) throw new Error('Persona Session 事件格式不受支持')
    active = parseSessionPersona(event.data.persona)
    explicit = true
    fallbackUserName = undefined
  }
  return {
    explicit,
    ...(active === undefined ? {} : { persona: active }),
    ...(fallbackUserName === undefined ? {} : { fallbackUserName }),
  }
}

/** Resolve the Persona description and user name used by the next model request. */
export function resolveSessionPersonaIdentity(
  events: readonly SessionEvent[],
  characterUserName?: string,
  chatUserName?: string,
): { readonly persona?: SessionPersonaSnapshot; readonly userName?: string } {
  const selection = readSessionPersonaSelection(events)
  if (selection.explicit) {
    return {
      ...(selection.persona === undefined ? {} : { persona: selection.persona }),
      ...(selection.persona?.name === undefined && selection.fallbackUserName === undefined
        ? {}
        : { userName: selection.persona?.name ?? selection.fallbackUserName }),
    }
  }
  const userName = characterUserName ?? chatUserName
  return { ...(userName === undefined ? {} : { userName }) }
}
