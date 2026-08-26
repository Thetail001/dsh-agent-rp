/** Transcript-delta projection shared by browser compatibility runtimes. */

/** Last visible transcript message observed by a browser event bridge. */
export interface TavernTranscriptCursor {
  readonly last?: {
    readonly seq: number
    readonly role: 'user' | 'assistant'
  }
}

/**
 * Find messages appended after a previously observed transcript tail.
 *
 * A missing cursor establishes an initial baseline. If the old tail disappeared,
 * the transcript was rewritten and the new state becomes the baseline without
 * replaying historical messages.
 */
export function advanceTavernTranscript<Message extends {
  readonly seq: number
  readonly role: 'user' | 'assistant'
}>(
  previous: TavernTranscriptCursor | undefined,
  messages: readonly Message[],
): { readonly cursor: TavernTranscriptCursor; readonly appended: readonly Message[] } {
  const last = messages.at(-1)
  const cursor: TavernTranscriptCursor = last === undefined
    ? {}
    : { last: { seq: last.seq, role: last.role } }
  if (previous === undefined) return { cursor, appended: [] }
  if (previous.last === undefined) return { cursor, appended: messages }
  const anchor = messages.findIndex(message => message.seq === previous.last!.seq && message.role === previous.last!.role)
  return { cursor, appended: anchor < 0 ? [] : messages.slice(anchor + 1) }
}
