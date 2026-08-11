/** Branded id factories owned by the roleplay package. */

import type {
  RoleplayActorId as RoleplayActorIdType,
  RoleplayChoiceId as RoleplayChoiceIdType,
  RoleplayFactId as RoleplayFactIdType,
  RoleplayObserverId as RoleplayObserverIdType,
  RoleplayProposalId as RoleplayProposalIdType,
  RoleplayResolverName as RoleplayResolverNameType,
} from './types.ts'
import type {
  RoleplaySurfaceActionId as RoleplaySurfaceActionIdType,
  RoleplaySurfaceActorId as RoleplaySurfaceActorIdType,
  RoleplaySurfaceFactId as RoleplaySurfaceFactIdType,
  RoleplaySurfaceKind as RoleplaySurfaceKindType,
  RoleplaySurfaceRecordId as RoleplaySurfaceRecordIdType,
  RoleplaySurfaceReviewEntryId as RoleplaySurfaceReviewEntryIdType,
} from './surface-types.ts'

/**
 * Brand one actor id after its owning boundary validates the string.
 * @param value - validated actor identifier.
 * @returns the branded actor identifier.
 */
export const asRoleplayActorId = (value: string): RoleplayActorIdType => value as RoleplayActorIdType
/**
 * Brand one fact id after its owning boundary validates the string.
 * @param value - validated fact identifier.
 * @returns the branded fact identifier.
 */
export const asRoleplayFactId = (value: string): RoleplayFactIdType => value as RoleplayFactIdType
/**
 * Brand one observer id after its owning boundary validates the string.
 * @param value - validated observer identifier.
 * @returns the branded observer identifier.
 */
export const asRoleplayObserverId = (value: string): RoleplayObserverIdType => value as RoleplayObserverIdType
/**
 * Brand one choice id after its owning boundary validates the string.
 * @param value - validated choice identifier.
 * @returns the branded choice identifier.
 */
export const asRoleplayChoiceId = (value: string): RoleplayChoiceIdType => value as RoleplayChoiceIdType
/**
 * Brand one proposal id after its owning boundary validates the string.
 * @param value - validated proposal identifier.
 * @returns the branded proposal identifier.
 */
export const asRoleplayProposalId = (value: string): RoleplayProposalIdType => value as RoleplayProposalIdType
/**
 * Brand one resolver name after its owning boundary validates the string.
 * @param value - validated resolver name.
 * @returns the branded resolver name.
 */
export const asRoleplayResolverName = (value: string): RoleplayResolverNameType => value as RoleplayResolverNameType

/**
 * Brand one scenario presenter identity after validation.
 * @param value - validated presenter identity.
 * @returns the branded surface kind.
 */
export const asRoleplaySurfaceKind = (value: string): RoleplaySurfaceKindType => value as RoleplaySurfaceKindType
/**
 * Brand one surface actor id copied from an observer-safe projection.
 * @param value - projected actor identity.
 * @returns the branded surface actor id.
 */
export const asRoleplaySurfaceActorId = (value: string): RoleplaySurfaceActorIdType => value as RoleplaySurfaceActorIdType
/**
 * Brand one surface fact id copied from an observer-safe projection.
 * @param value - projected fact identity.
 * @returns the branded surface fact id.
 */
export const asRoleplaySurfaceFactId = (value: string): RoleplaySurfaceFactIdType => value as RoleplaySurfaceFactIdType
/**
 * Brand one ephemeral surface action id owned by a scenario presenter.
 * @param value - presenter-owned action identity.
 * @returns the branded surface action id.
 */
export const asRoleplaySurfaceActionId = (value: string): RoleplaySurfaceActionIdType => value as RoleplaySurfaceActionIdType
/**
 * Brand one stable public-record id owned by a scenario presenter.
 * @param value - presenter-owned public-record identity.
 * @returns the branded public-record id.
 */
export const asRoleplaySurfaceRecordId = (
  value: string,
): RoleplaySurfaceRecordIdType => value as RoleplaySurfaceRecordIdType
/**
 * Brand one stable completed-session review entry id owned by a scenario presenter.
 * @param value - presenter-owned review entry identity.
 * @returns the branded review entry id.
 */
export const asRoleplaySurfaceReviewEntryId = (
  value: string,
): RoleplaySurfaceReviewEntryIdType => value as RoleplaySurfaceReviewEntryIdType
