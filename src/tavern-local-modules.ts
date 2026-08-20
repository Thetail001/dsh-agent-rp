/** Maintained browser modules that the Host can replace with bundled, network-free facades. */

import { TAVERN_LOCAL_MODULE_FACADES } from './tavern-local-modules.generated.ts'

/** One browser library installed before a localized Tavern Helper ESM facade is imported. */
export type TavernScriptPreload =
  | 'compare-versions'
  | 'json5'
  | 'jsonrepair'
  | 'klona'
  | 'pinia'
  | 'vue'
  | 'yaml'
  | 'zod'

export interface TavernLocalModule {
  readonly source: string
  readonly preloads: readonly TavernScriptPreload[]
}

interface LocalModuleDefinition {
  readonly packageName: keyof typeof TAVERN_LOCAL_MODULE_FACADES
  readonly major: number
  readonly subpath: RegExp
  readonly preloads: readonly TavernScriptPreload[]
}

const definitions: readonly LocalModuleDefinition[] = [
  { packageName: 'compare-versions', major: 6, subpath: /^$/u, preloads: ['compare-versions'] },
  { packageName: 'json5', major: 2, subpath: /^$/u, preloads: ['json5'] },
  { packageName: 'jsonrepair', major: 3, subpath: /^$/u, preloads: ['jsonrepair'] },
  { packageName: 'klona', major: 2, subpath: /^$/u, preloads: ['klona'] },
  { packageName: 'pinia', major: 3, subpath: /^$/u, preloads: ['vue', 'pinia'] },
  { packageName: 'vue', major: 3, subpath: /^$/u, preloads: ['vue'] },
  { packageName: 'yaml', major: 2, subpath: /^$/u, preloads: ['yaml'] },
  { packageName: 'zod', major: 4, subpath: /^(?:\/v4\/core)?$/u, preloads: ['zod'] },
]

function versionMatches(value: string | undefined, major: number): boolean {
  return value === undefined || new RegExp(`^${major}(?:\\.|$)`, 'u').test(value)
}

/** Resolve a compatible jsDelivr package root to an audited local browser module. */
export function localTavernModule(url: URL): TavernLocalModule | undefined {
  if (url.search !== '' || url.hash !== '') return undefined
  for (const definition of definitions) {
    const packageName = definition.packageName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    const match = url.pathname.match(new RegExp(
      `^/npm/${packageName}(?:@([^/]+))?((?:/[^/]+)*)/\\+esm$`,
      'u',
    ))
    if (match === null || !versionMatches(match[1], definition.major)
      || !definition.subpath.test(match[2] ?? '')) continue
    return {
      source: TAVERN_LOCAL_MODULE_FACADES[definition.packageName],
      preloads: definition.preloads,
    }
  }
  return undefined
}
