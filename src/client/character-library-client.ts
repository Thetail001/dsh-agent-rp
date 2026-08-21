/** Browser HTTP access and change notifications for the Host-owned character library. */

import {
  CHARACTER_LIBRARY_PATH,
  type CharacterLibraryDetail,
  type CharacterLibraryWorldInfoPage,
  type CharacterRemoteResourcePolicy,
  type CharacterRemoteResourceType,
} from '../character-library-protocol.ts'

/** Browser event emitted after one character library entry changes. */
export const characterLibraryChangedEvent = 'agent-rp:character-library-changed'

/** Read one JSON response from the character library. */
export async function characterLibraryJson<T>(path = ''): Promise<T> {
  const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, { headers: { accept: 'application/json' } })
  const value = await response.json() as { readonly error?: string } & T
  if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`)
  return value
}

/** Read one complete character library entry. */
export async function fetchCharacterDetail(id: string): Promise<CharacterLibraryDetail> {
  const value = await characterLibraryJson<{ readonly format: 0; readonly entry: CharacterLibraryDetail }>(
    `/${encodeURIComponent(id)}`,
  )
  return value.entry
}

/** Notify mounted character consumers after a successful Host mutation. */
export function notifyCharacterLibraryChanged(id: string): void {
  window.dispatchEvent(new CustomEvent(characterLibraryChangedEvent, { detail: { id } }))
}

async function postCharacterMutation(path: string, fallbackError: string): Promise<CharacterLibraryDetail> {
  const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, {
    method: 'POST', headers: { accept: 'application/json' },
  })
  const value = await response.json() as {
    readonly error?: string
    readonly format?: 0
    readonly entry?: CharacterLibraryDetail
  }
  if (!response.ok || value.entry === undefined) {
    throw new Error(value.error ?? `${fallbackError}（${response.status}）`)
  }
  return value.entry
}

/** Approve or revoke one exact remote origin and resource type. */
export async function updateCharacterRemoteResource(
  id: string,
  origin: string,
  type: CharacterRemoteResourceType,
  approved: boolean,
): Promise<CharacterLibraryDetail> {
  const operation = approved ? 'approve' : 'revoke'
  const query = new URLSearchParams({ origin, type })
  return postCharacterMutation(
    `/${encodeURIComponent(id)}/remote-resources/${operation}?${query}`,
    '外部资源授权失败',
  )
}

/** Change the remote-resource policy for one character without weakening iframe isolation. */
export async function updateCharacterRemoteResourcePolicy(
  id: string,
  policy: CharacterRemoteResourcePolicy,
): Promise<CharacterLibraryDetail> {
  const query = new URLSearchParams({ value: policy })
  return postCharacterMutation(
    `/${encodeURIComponent(id)}/remote-resources/policy?${query}`,
    '外部资源策略更新失败',
  )
}

/** Read one bounded page of imported World Info entries. */
export async function fetchCharacterWorldInfoPage(
  id: string,
  offset: number,
  limit = 40,
): Promise<CharacterLibraryWorldInfoPage> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/world-info?${query}`, {
    headers: { accept: 'application/json' },
  })
  const value = await response.json() as {
    readonly error?: string
    readonly format?: 0
    readonly page?: CharacterLibraryWorldInfoPage
  }
  if (!response.ok || value.format !== 0 || value.page === undefined) {
    throw new Error(value.error ?? `角色世界书读取失败（${response.status}）`)
  }
  return value.page
}
