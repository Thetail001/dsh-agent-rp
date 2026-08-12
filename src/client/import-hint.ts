/** Minimal browser draft shape needed to recognize a pending chat import. */
export interface DraftAttachmentLike {
  readonly kind: string
  readonly file: {
    readonly name: string
  }
}

/** One migration affordance that can be inferred safely from a lone draft filename. */
export type SillyTavernDraftKind = 'chat' | 'json-resource' | 'png-candidate'

/** A lone draft that may participate in SillyTavern migration. */
export interface SillyTavernDraftSelection {
  readonly kind: SillyTavernDraftKind
  readonly name: string
}

/**
 * Classify one standalone draft without inspecting or executing its contents.
 * @param attachments - ordered browser-only draft attachments.
 * @returns filename-based migration affordance, when unambiguous enough to offer a choice.
 */
export function selectSillyTavernDraft(
  attachments: readonly DraftAttachmentLike[],
): SillyTavernDraftSelection | undefined {
  if (attachments.length !== 1) return undefined
  const attachment = attachments[0]
  if (attachment === undefined) return undefined
  const name = attachment.file.name.trim()
  if (name === '') return undefined
  if (attachment.kind === 'file' && /\.jsonl$/iu.test(name)) return { kind: 'chat', name }
  if (attachment.kind === 'file' && /\.json$/iu.test(name)) return { kind: 'json-resource', name }
  if (attachment.kind === 'image' && /\.png$/iu.test(name)) return { kind: 'png-candidate', name }
  return undefined
}

/**
 * Select the filename of one unambiguous SillyTavern chat import draft.
 * @param attachments - ordered browser-only draft attachments.
 * @returns the JSONL filename when it is the draft's only attachment.
 */
export function selectSillyTavernChatImportName(
  attachments: readonly DraftAttachmentLike[],
): string | undefined {
  const selected = selectSillyTavernDraft(attachments)
  return selected?.kind === 'chat' ? selected.name : undefined
}
