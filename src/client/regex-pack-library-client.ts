/** Browser HTTP access for reusable standalone regex packs. */

import {
  REGEX_PACK_LIBRARY_PATH,
  type RegexPackLibraryDeleteResponse,
  type RegexPackLibraryImportResponse,
  type RegexPackLibraryListResponse,
  type RegexPackLibrarySummary,
} from '../regex-pack-library-protocol.ts'

async function responseJson<T>(response: Response, fallback: string): Promise<T> {
  const value = await response.json() as { readonly error?: string } & T
  if (!response.ok) throw new Error(value.error ?? `${fallback}（${response.status}）`)
  return value
}

/** List every reusable pack without loading expressions into the resource center. */
export async function listRegexPacks(): Promise<readonly RegexPackLibrarySummary[]> {
  const response = await fetch(REGEX_PACK_LIBRARY_PATH, { headers: { accept: 'application/json' } })
  return (await responseJson<RegexPackLibraryListResponse>(response, '正则包库读取失败')).entries
}

/** Import one standalone SillyTavern JSON export. */
export async function importRegexPackFile(file: File): Promise<RegexPackLibrarySummary> {
  const response = await fetch(`${REGEX_PACK_LIBRARY_PATH}?filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: file,
  })
  return (await responseJson<RegexPackLibraryImportResponse>(response, '正则包导入失败')).entry
}

/** Remove the reusable copy while preserving Session-owned snapshots. */
export async function deleteRegexPack(id: string): Promise<void> {
  const response = await fetch(`${REGEX_PACK_LIBRARY_PATH}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { accept: 'application/json' },
  })
  await responseJson<RegexPackLibraryDeleteResponse>(response, '正则包移除失败')
}
