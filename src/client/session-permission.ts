/** Session-scoped browser persistence for exact preflight resource permissions. */

import {
  CHARACTER_REMOTE_RESOURCE_TYPES,
  type CharacterRemoteResourceApproval,
  type CharacterRemoteResourceType,
} from '../character-library-protocol.ts'
import { cardRemoteResourceApprovalKey, characterRemoteResourceOrigin } from '../card-remote-resource.ts'
import type { ApprovalStorage } from './approval-storage.ts'

const sessionResourcePermissionPrefix = 'dsh.agent-rp.session-resource-permissions-v1:'
const maximumPermissionCount = 4_096
const maximumPermissionKeyLength = 4_096

/** Exact resource permissions that expire with one browser tab. */
export interface AgentRpSessionResourcePermissions {
  readonly tavern: {
    readonly scripts: readonly string[]
    readonly images: readonly string[]
    readonly frames: readonly string[]
  }
  readonly card: readonly CharacterRemoteResourceApproval[]
}

function permissionKey(sessionId: string): string {
  return `${sessionResourcePermissionPrefix}${sessionId}`
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > maximumPermissionCount) return []
  return [...new Set(value.filter((item): item is string =>
    typeof item === 'string' && item.length <= maximumPermissionKeyLength))].sort()
}

function cardApprovals(value: unknown): readonly CharacterRemoteResourceApproval[] {
  if (!Array.isArray(value) || value.length > maximumPermissionCount) return []
  const approvals = new Map<string, CharacterRemoteResourceApproval>()
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue
    const record = item as Readonly<Record<string, unknown>>
    if (typeof record.origin !== 'string' || typeof record.type !== 'string'
      || !(CHARACTER_REMOTE_RESOURCE_TYPES as readonly string[]).includes(record.type)) continue
    try {
      const approval = {
        origin: characterRemoteResourceOrigin(record.origin),
        type: record.type as CharacterRemoteResourceType,
      }
      approvals.set(cardRemoteResourceApprovalKey(approval), approval)
    } catch {
      // Corrupt or obsolete session-scoped origins remain inert.
    }
  }
  return [...approvals.values()].sort((left, right) =>
    left.origin.localeCompare(right.origin) || left.type.localeCompare(right.type))
}

/** Read one Session's exact browser-tab permissions while ignoring corrupt entries. */
export function readAgentRpSessionResourcePermissions(
  storage: ApprovalStorage,
  sessionId: string,
): AgentRpSessionResourcePermissions {
  let value: unknown
  try {
    value = JSON.parse(storage.getItem(permissionKey(sessionId)) ?? '{}') as unknown
  } catch {
    value = {}
  }
  const record = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : {}
  const tavern = typeof record.tavern === 'object' && record.tavern !== null && !Array.isArray(record.tavern)
    ? record.tavern as Readonly<Record<string, unknown>> : {}
  return {
    tavern: {
      scripts: stringArray(tavern.scripts),
      images: stringArray(tavern.images),
      frames: stringArray(tavern.frames),
    },
    card: cardApprovals(record.card),
  }
}

/** Persist exact permissions for one Session until its browser tab closes. */
export function writeAgentRpSessionResourcePermissions(
  storage: ApprovalStorage,
  sessionId: string,
  permissions: AgentRpSessionResourcePermissions,
): void {
  const value = {
    tavern: {
      scripts: stringArray(permissions.tavern.scripts),
      images: stringArray(permissions.tavern.images),
      frames: stringArray(permissions.tavern.frames),
    },
    card: cardApprovals(permissions.card),
  }
  storage.setItem(permissionKey(sessionId), JSON.stringify(value))
}

/** Merge Session-only Character Card grants without mutating the library record. */
export function withAgentRpSessionCardPermissions<T extends CharacterLibraryDetailLike>(
  detail: T,
  permissions: AgentRpSessionResourcePermissions,
): T {
  const approvals = new Map(detail.approvedRemoteResources.map(value => [cardRemoteResourceApprovalKey(value), value]))
  for (const value of permissions.card) approvals.set(cardRemoteResourceApprovalKey(value), value)
  return {
    ...detail,
    approvedRemoteResources: [...approvals.values()].sort((left, right) =>
      left.origin.localeCompare(right.origin) || left.type.localeCompare(right.type)),
  } as T
}

interface CharacterLibraryDetailLike {
  readonly approvedRemoteResources: readonly CharacterRemoteResourceApproval[]
}
