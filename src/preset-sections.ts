/** Presentation groups derived from a SillyTavern preset's ordered prompt list. */

/** Prompt fields used to derive preset presentation groups. */
export interface PresetSectionPrompt {
  readonly identifier: string
  readonly name: string
  readonly attached: boolean
  readonly enabled: boolean
}

/** One presentation group without changing the preset's underlying prompt order. */
export interface PresetPromptSection<T extends PresetSectionPrompt> {
  readonly key: string
  readonly title: string
  readonly kind: 'base' | 'named' | 'detached'
  readonly prompts: readonly T[]
  readonly enabledCount: number
}

const separatorRun = /[-—_=─]{4,}/u
const edgeSeparators = /^[-—_=─\s]+|[-—_=─\s]+$/gu

/** Returns the display title when a prompt name acts as an author-defined section divider. */
export function presetDividerTitle(name: string): string | undefined {
  if (!separatorRun.test(name)) return undefined
  const title = name.replace(edgeSeparators, '').trim()
  return title === '' ? '未命名分组' : title
}

/** Projects the flat SillyTavern prompt order into collapsible presentation groups. */
export function projectPresetPromptSections<T extends PresetSectionPrompt>(prompts: readonly T[]): readonly PresetPromptSection<T>[] {
  const grouped: { key: string; title: string; kind: PresetPromptSection<T>['kind']; prompts: T[] }[] = []
  let current: { key: string; title: string; kind: PresetPromptSection<T>['kind']; prompts: T[] } = {
    key: 'base', title: '基础提示', kind: 'base', prompts: [],
  }
  grouped.push(current)

  for (const prompt of prompts) {
    if (!prompt.attached) continue
    const dividerTitle = presetDividerTitle(prompt.name)
    if (dividerTitle !== undefined) {
      current = {
        key: `section:${prompt.identifier}`,
        title: dividerTitle,
        kind: 'named',
        prompts: [],
      }
      grouped.push(current)
    }
    current.prompts.push(prompt)
  }

  const detached = prompts.filter(prompt => !prompt.attached)
  if (detached.length > 0) {
    grouped.push({ key: 'detached', title: '未加入当前顺序', kind: 'detached', prompts: detached })
  }

  return grouped
    .filter(section => section.prompts.length > 0)
    .map(section => ({
      ...section,
      enabledCount: section.prompts.filter(prompt => prompt.enabled).length,
    }))
}
