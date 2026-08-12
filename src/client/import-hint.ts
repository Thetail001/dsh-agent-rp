/** Minimal browser draft shape needed to recognize a pending chat import. */
export interface DraftAttachmentLike {
  readonly kind: string
  readonly file: {
    readonly name: string
  }
}

/**
 * Select the filename of one unambiguous SillyTavern chat import draft.
 * @param attachments - ordered browser-only draft attachments.
 * @returns the JSONL filename when it is the draft's only attachment.
 */
export function selectSillyTavernChatImportName(
  attachments: readonly DraftAttachmentLike[],
): string | undefined {
  if (attachments.length !== 1) return undefined
  const attachment = attachments[0]
  if (attachment?.kind !== 'file') return undefined
  const name = attachment.file.name.trim()
  return /\.jsonl$/iu.test(name) ? name : undefined
}
