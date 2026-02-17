// main/shared/src/core/membership/index.ts
/**
 * @file Membership Barrel
 * @description Public API for membership domain: schemas, logic, and display.
 * @module Core/Membership
 */

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
  membershipSchema,
  updateMembershipRoleSchema,
  type AcceptInvitation,
  type AddMember,
  type CreateInvitation,
  type Invitation,
  type InvitationStatus,
  type Membership,
  type UpdateMembershipRole,
} from './membership.schemas';
