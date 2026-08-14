/** Conversion from Tavern Helper's public regex API to Agent RP's durable form. */

import type { ImportedRegexScript } from './import/types.ts'

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} 必须是对象`)
  return value as Record<string, unknown>
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} 必须是字符串`)
  return value
}

function strings(value: unknown, label: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} 必须是字符串数组`)
  return [...value] as string[]
}

function depth(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} 必须是有限数字或 null`)
  return value
}

/** Validate one complete item accepted by `replaceTavernRegexes`. */
export function importTavernRegex(value: unknown, index: number): ImportedRegexScript {
  const regex = object(value, `预设正则 ${index + 1}`)
  const id = typeof regex.id === 'string' && regex.id.trim() !== '' ? regex.id : undefined
  const rawName = string(regex.script_name, `预设正则 ${index + 1}.script_name`)
  const source = object(regex.source, `预设正则 ${index + 1}.source`)
  const destination = object(regex.destination, `预设正则 ${index + 1}.destination`)
  const enabled = typeof regex.enabled === 'boolean'
    ? regex.enabled
    : typeof regex.disabled === 'boolean' ? !regex.disabled : true
  return {
    ...(id === undefined ? {} : { id }),
    scriptName: rawName === '' ? `未命名-${id ?? index + 1}` : rawName,
    findRegex: string(regex.find_regex, `预设正则 ${index + 1}.find_regex`),
    replaceString: string(regex.replace_string, `预设正则 ${index + 1}.replace_string`),
    trimStrings: strings(regex.trim_strings, `预设正则 ${index + 1}.trim_strings`),
    placement: [
      ...(source.user_input === true ? [1] : []),
      ...(source.ai_output === true ? [2] : []),
      ...(source.slash_command === true ? [3] : []),
      ...(source.world_info === true ? [5] : []),
      ...(source.reasoning === true ? [6] : []),
    ],
    disabled: !enabled,
    markdownOnly: destination.display === true,
    promptOnly: destination.prompt === true,
    runOnEdit: regex.run_on_edit === true,
    substituteRegex: 0,
    minDepth: depth(regex.min_depth, `预设正则 ${index + 1}.min_depth`),
    maxDepth: depth(regex.max_depth, `预设正则 ${index + 1}.max_depth`),
  }
}
