// main/shared/src/core/tenant/index.ts

/**
 * @file Tenant Module Barrel
 * @description Re-exports all tenant domain types, schemas, and utilities.
 * @module Core/Tenant
 */

// --- domain-restrictions ---
export { extractEmailDomain, isEmailDomainAllowed } from './domain.restrictions';

// --- tenant.logic ---
export {
  getWorkspaceContext,
  hasRequiredWorkspaceRole,
  isAdmin,
  isOwner,
  WORKSPACE_ID_HEADER,
  WORKSPACE_ROLE_HEADER,
} from './tenant.logic';

// --- tenant.schemas ---
export {
  createTenantSchema,
  tenantActionResponseSchema,
  tenantListResponseSchema,
  tenantSchema,
  transferOwnershipSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type MaybeWorkspaceContext,
  type Tenant,
  type TenantActionResponse,
  type TenantListResponse,
  type TransferOwnershipInput,
  type UpdateTenantInput,
  type WorkspaceContext,
} from './tenant.schemas';

// --- tenant.workspace ---
export {
  assertWorkspaceScope,
  createWorkspaceContext,
  isWorkspaceScoped,
} from './tenant.workspace';

// --- tenant.settings.schemas ---
export {
  createTenantSettingSchema,
  tenantSettingSchema,
  updateTenantSettingSchema,
  type CreateTenantSetting,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant.settings.schemas';

// --- membership.display ---
export { getInvitationStatusTone, getTenantRoleTone } from './membership.display';

// --- membership.logic ---
export {
  canAcceptInvite,
  canAssignRole,
  canChangeRole,
  canLeave,
  canRemoveMember,
  canRevokeInvite,
  getNextOwnerCandidate,
  getRoleLevel,
  hasAtLeastRole,
  isInviteExpired,
  isSoleOwner,
  ROLE_LEVELS,
} from './membership.logic';

// --- membership.schemas ---
export {
  acceptInvitationSchema,
  addMemberSchema,
  createInvitationSchema,
  INVITATION_STATUSES,
  invitationSchema,
  invitationsListResponseSchema,
  membershipActionResponseSchema,
  membershipSchema,
  membersListResponseSchema,
  updateMembershipRoleSchema,
  type AcceptInvitation,
  type AddMember,
  type CreateInvitation,
  type Invitation,
  type InvitationStatus,
  type InvitationsListResponse,
  type Membership,
  type MembershipActionResponse,
  type MembersListResponse,
  type UpdateMembershipRole,
} from './membership.schemas';
