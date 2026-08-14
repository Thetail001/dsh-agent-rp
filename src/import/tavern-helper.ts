/** Shared Tavern Helper script-tree parser for cards and presets. */

import type { JsonValue } from '@deepseek-ai/dsh-session'
import type { ImportedTavernHelperScript } from './types.ts'

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

/** Preserve one JSON object used as a Tavern Helper variable namespace. */
export function tavernHelperVariables(value: unknown): Readonly<Record<string, JsonValue>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, JsonValue>>
    : {}
}

/** Flatten one Tavern Helper script tree while applying folder enablement. */
export function parseTavernHelperScripts(
  values: readonly unknown[],
  path: string,
  parentEnabled = true,
): ImportedTavernHelperScript[] {
  return values.flatMap((value, index) => {
    const itemPath = `${path}[${index}]`
    const item = object(value, itemPath)
    const enabled = parentEnabled && item.enabled !== false
    if (item.type === 'folder' || Array.isArray(item.scripts)) {
      if (!Array.isArray(item.scripts)) return []
      return parseTavernHelperScripts(item.scripts, `${itemPath}.scripts`, enabled)
    }
    const content = typeof item.content === 'string' ? item.content : ''
    const name = typeof item.name === 'string' ? item.name : ''
    const id = typeof item.id === 'string' && item.id !== '' ? item.id : `${itemPath}:${name}`
    const button = tavernHelperVariables(item.button)
    const buttons = Array.isArray(button.buttons) ? button.buttons.flatMap(entry => {
      const parsed = tavernHelperVariables(entry)
      return typeof parsed.name === 'string' ? [{
        name: parsed.name,
        visible: parsed.visible !== false,
      }] : []
    }) : []
    return [{
      id,
      name,
      content,
      info: typeof item.info === 'string' ? item.info : '',
      enabled,
      buttonEnabled: button.enabled !== false,
      buttons,
      data: tavernHelperVariables(item.data),
    }]
  })
}
