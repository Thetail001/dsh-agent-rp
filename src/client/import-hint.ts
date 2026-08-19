/** Minimal browser draft shape needed to recognize a pending chat import. */
export interface DraftAttachmentLike {
  readonly kind: string
  readonly file: {
    readonly name: string
  }
}

/** One migration affordance inferred safely from draft filenames. */
export type SillyTavernDraftKind = 'migration' | 'chat' | 'character-card' | 'json-resource' | 'png-candidate'

/** One recognized draft selection that may participate in SillyTavern migration. */
export interface SillyTavernDraftSelection {
  readonly kind: SillyTavernDraftKind
  readonly name: string
}

/** Resource kind inferred from inert JSON fields without evaluating embedded content. */
export type SillyTavernJsonKind = 'character-card' | 'world-info' | 'preset' | 'unknown'

/** Maximum JSON size inspected in the browser before the authoritative importer validates it. */
export const MAX_SILLYTAVERN_JSON_HINT_BYTES = 8 * 1024 * 1024

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function hasCharacterFields(value: Record<string, unknown>): boolean {
  return ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example']
    .every(key => typeof value[key] === 'string')
}

/**
 * Classify one JSON resource by stable SillyTavern fields only.
 * @param source - decoded JSON text; scripts and templates remain inert strings.
 * @returns the unambiguous resource kind, or `unknown` for malformed and overlapping documents.
 */
export function classifySillyTavernJson(source: string): SillyTavernJsonKind {
  let parsed: unknown
  try {
    parsed = JSON.parse(source.replace(/^\uFEFF/u, ''))
  } catch {
    return 'unknown'
  }
  const root = record(parsed)
  if (root === undefined) return 'unknown'
  if (Array.isArray(root.prompts) && Array.isArray(root.prompt_order)) return 'preset'
  const data = record(root.data)
  if ((typeof root.spec === 'string' && /^chara_card_v[23]$/u.test(root.spec) && data !== undefined
      && hasCharacterFields(data))
    || hasCharacterFields(root)) return 'character-card'
  if (Array.isArray(root.entries) || record(root.entries) !== undefined) return 'world-info'
  return 'unknown'
}

/** Read and classify one bounded browser file without evaluating any embedded field. */
export async function classifySillyTavernJsonFile(
  file: { readonly size: number; text(): Promise<string> },
): Promise<SillyTavernJsonKind> {
  if (file.size === 0 || file.size > MAX_SILLYTAVERN_JSON_HINT_BYTES) return 'unknown'
  return classifySillyTavernJson(await file.text())
}

/**
 * Classify one standalone draft without inspecting or executing its contents.
 * @param attachments - ordered browser-only draft attachments.
 * @returns filename-based migration affordance, when unambiguous enough to offer a choice.
 */
export function selectSillyTavernDraft(
  attachments: readonly DraftAttachmentLike[],
): SillyTavernDraftSelection | undefined {
  if (attachments.length === 2) {
    const card = attachments.find(attachment =>
      (attachment.kind === 'file' && /\.json$/iu.test(attachment.file.name.trim()))
      || (attachment.kind === 'file' && /\.charx$/iu.test(attachment.file.name.trim()))
      || (attachment.kind === 'image' && /\.png$/iu.test(attachment.file.name.trim())))
    const chat = attachments.find(attachment =>
      attachment.kind === 'file' && /\.jsonl$/iu.test(attachment.file.name.trim()))
    if (card !== undefined && chat !== undefined) {
      return { kind: 'migration', name: `${card.file.name.trim()} + ${chat.file.name.trim()}` }
    }
    return undefined
  }
  if (attachments.length !== 1) return undefined
  const attachment = attachments[0]
  if (attachment === undefined) return undefined
  const name = attachment.file.name.trim()
  if (name === '') return undefined
  if (attachment.kind === 'file' && /\.jsonl$/iu.test(name)) return { kind: 'chat', name }
  if (attachment.kind === 'file' && /\.json$/iu.test(name)) return { kind: 'json-resource', name }
  if (attachment.kind === 'file' && /\.charx$/iu.test(name)) return { kind: 'character-card', name }
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
