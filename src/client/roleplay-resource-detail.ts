/** Browser client for bounded, source-neutral Roleplay resource details. */

import {
  parseRoleplayResourceDetail,
  ROLEPLAY_RESOURCE_CATALOG_PATH,
  type RoleplayResourceDetailResponse,
  type RoleplayResourceReference,
} from '../roleplay-resource-catalog-protocol.ts'

/** Validate a Host response against the exact reference requested by the UI. */
export function parseRoleplayResourceDetailResponse(
  value: unknown,
  reference: RoleplayResourceReference,
): RoleplayResourceDetailResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('角色扮演资源详情响应无效')
  }
  const response = value as Partial<RoleplayResourceDetailResponse> & { readonly error?: unknown }
  const descriptor = response.descriptor
  if (response.format !== 0 || typeof descriptor !== 'object' || descriptor === null
    || descriptor.kind !== reference.kind || descriptor.id !== reference.id
    || typeof descriptor.name !== 'string'
    || (descriptor.availability !== 'available' && descriptor.availability !== 'archived')) {
    throw new Error(typeof response.error === 'string' ? response.error : '角色扮演资源详情响应无效')
  }
  try {
    return { format: 0, descriptor, detail: parseRoleplayResourceDetail(response.detail, reference) }
  } catch {
    throw new Error(typeof response.error === 'string' ? response.error : '角色扮演资源详情响应无效')
  }
}

/** Read one explicit resource detail without downloading its source-format payload. */
export async function fetchRoleplayResourceDetail(
  reference: RoleplayResourceReference,
  signal?: AbortSignal,
): Promise<RoleplayResourceDetailResponse> {
  const query = new URLSearchParams({ kind: reference.kind, id: reference.id })
  const response = await fetch(`${ROLEPLAY_RESOURCE_CATALOG_PATH}?${query}`, {
    headers: { accept: 'application/json' },
    ...(signal === undefined ? {} : { signal }),
  })
  const value = await response.json() as unknown
  if (!response.ok) {
    const error = typeof value === 'object' && value !== null && !Array.isArray(value)
      && typeof (value as { readonly error?: unknown }).error === 'string'
      ? (value as { readonly error: string }).error : `角色扮演资源详情读取失败（${response.status}）`
    throw new Error(error)
  }
  return parseRoleplayResourceDetailResponse(value, reference)
}
