/** Model-free standalone World Info activation before an Agent is constructed. */

import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionPersonaSnapshot } from '../persona-library-protocol.ts'
import type { WorldInfoLibraryAsset } from '../world-info-library.ts'
import {
  prepareWorldInfoImportResult,
  type WorldInfoImportMeta,
  type WorldInfoLibrarySeedRecord,
} from './session-world-info.ts'

/** Build a replayable Session seed that activates one retained World Info source. */
export function createWorldInfoLibrarySessionSeed(
  asset: WorldInfoLibraryAsset,
  persona?: SessionPersonaSnapshot,
): readonly SessionEvent[] {
  const attachment = {
    kind: 'file' as const,
    attachmentId: AttachmentId(`library:${asset.upload.id}`),
    bytes: asset.data.byteLength,
    name: asset.filename,
    mediaType: 'application/json',
  }
  const value = prepareWorldInfoImportResult(asset.worldInfo, 0, attachment)
  const { raw, ...result } = value
  const meta: WorldInfoImportMeta = { format: 0, result, raw }
  const data: WorldInfoLibrarySeedRecord = {
    format: 0,
    worldInfoLibraryId: asset.upload.id,
    meta,
  }
  const time = Date.now()
  const events: SessionEvent[] = [{
    type: 'agent-rp/world-info-library-seed',
    seq: 0,
    time,
    data,
    ignorable: true,
  }]
  if (persona !== undefined) {
    events.push({
      type: 'agent-rp/persona-seed',
      seq: events.length,
      time,
      data: { format: 0, persona },
      ignorable: true,
    })
  }
  // Public DSH currently defines a reusable blank Session as one with no
  // turn boundary at all. A balanced zero-step turn makes this deliberately
  // configured Session navigable without inventing user or assistant text,
  // opening a model step, or issuing a model request.
  events.push({
    type: 'turn/start',
    seq: events.length,
    time: time + 1,
    data: { turn: 1 },
  })
  events.push({
    type: 'turn/end',
    seq: events.length,
    time: time + 1,
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  const validated = Session.create(SessionId('agent-rp-world-info-import-validation'), events)
  return Object.freeze(validated.events.slice(0, events.length))
}
