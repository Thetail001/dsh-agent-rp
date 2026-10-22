/** Serialize the active DSH Roleplay transcript as a portable SillyTavern chat. */

import type {Session, SessionEvent} from '@deepseek-ai/dsh-session'
import { readGenerationGroups } from './generation.ts'
import { hiddenReplyVersionSeqs } from './generation-state-record.ts'

/** Identity and provenance included in one exported chat. */
export interface SillyTavernSessionExportOptions {
  readonly sessionId: string
  readonly characterName: string
  readonly userName: string
}

/** Downloadable SillyTavern JSONL produced from the active Session surface. */
export interface SillyTavernSessionExport {
  readonly filename: string
  readonly source: string
  readonly messageCount: number
}

function text(event: SessionEvent): string | undefined {
  if (event.type === 'user/message') {
    if (event.data.source.kind !== 'user' && event.data.source.kind !== 'model') return undefined
    return event.data.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
  }
  if (event.type !== 'assistant/message' || event.data.message.source.kind !== 'model') return undefined
  return event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

function sendDate(time: number): string {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function filename(characterName: string, exportedAt = new Date()): string {
  const part = (value: number) => String(value).padStart(2, '0')
  const timestamp = `${part(exportedAt.getMonth() + 1)}${part(exportedAt.getDate())}-${part(exportedAt.getHours())}${part(exportedAt.getMinutes())}`
  const safeName = characterName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_')
    .replace(/[. ]+$/gu, '')
    .slice(0, 210) || 'Agent-RP-对话'
  return `${safeName}-${timestamp}.jsonl`
}

/** Export the current visible transcript and persistent reply alternatives without invoking a model. */
export function exportSillyTavernSessionChat(
  session: Session,
  options: SillyTavernSessionExportOptions,
): SillyTavernSessionExport {
  const generations = readGenerationGroups(session.snapshotEvents())
  const rows: Record<string, unknown>[] = [{
    user_name: options.userName,
    character_name: options.characterName,
    create_date: sendDate(session.snapshotEvents()[0]?.time ?? Date.now()),
    chat_metadata: {
      exported_from: 'dsh-agent-rp',
      source_session_id: options.sessionId,
    },
  }]
  const events = session.snapshotEvents()
  // 0.2.x 的 swipe 版本全部 append 在表面上，导出必须按账本只导选中版本，
  // 否则每个非选中版本都会变成一条独立楼层（内容还会重复出现在 swipes 里）。
  const hidden = hiddenReplyVersionSeqs(events)
  for (const seq of session.surface.nodes) {
    const event = events[Number(seq)]
    if (event === undefined || hidden.has(event.seq)) continue
    const message = text(event)
    if (message === undefined || message.trim() === '') continue
    const user = event.type === 'user/message'
    const row: Record<string, unknown> = {
      name: user ? options.userName : options.characterName,
      is_user: user,
      is_system: false,
      mes: message,
      send_date: sendDate(event.time),
      extra: {
        exported_from: 'dsh-agent-rp',
        dsh_event_seq: event.seq,
      },
    }
    if (!user) {
      // 同 0.2.x 语义：surfaceSeq 只是最后 append 的版本，版本归属看 assistantSeqs。
      const group = generations.find(candidate => candidate.assistantSeqs.includes(event.seq))
      const swipes = group?.versions.map(version => version.text) ?? [message]
      const selected = group?.versions.findIndex(version => version.seq === group.selectedVersionSeq) ?? 0
      row.swipes = swipes
      row.swipe_id = selected < 0 ? 0 : selected
    }
    rows.push(row)
  }
  return {
    filename: filename(options.characterName),
    source: `${rows.map(row => JSON.stringify(row)).join('\n')}\n`,
    messageCount: rows.length - 1,
  }
}
