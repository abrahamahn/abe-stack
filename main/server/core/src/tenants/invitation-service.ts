// main/server/core/src/tenants/invitation-service.ts
/**
 * Invitation Service
 *
 * Business logic for managing workspace invitations.
 * Handles creating, accepting, revoking, resending, and listing invitations.
 *
 * @module invitation-service
 */

import {
  AUTH_EXPIRY,
  BadRequestError,
  canAcceptInvite,
  canAssignRole,
  canRevokeInvite,
  ForbiddenError,
  isEmailDomainAllowed,
  isInviteExpired,
  MS_PER_DAY,
  NotFoundError,
  QUOTAS,
} from '@bslt/shared';

import type { Repositories } from '../../../db/src';
import type { Invitation as DomainInvitation, TenantRole } from '@bslt/shared';

// ============================================================================
// Constants
// ============================================================================

/** Default invitation expiry in milliseconds */
const DEFAULT_INVITE_EXPIRY_MS = AUTH_EXPIRY.INVITE_DAYS * MS_PER_DAY;

// ============================================================================
// Types
// ============================================================================

/** Invitation info returned to clients */
export interface InvitationInfo {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  status: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt?: string | undefined;
  createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function toInvitationInfo(inv: {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}): InvitationInfo {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    email: inv.email,
    role: inv.role as TenantRole,
    status: inv.status,
    invitedById: inv.invitedById,
    expiresAt: inv.expiresAt instanceof Date ? inv.expiresAt.toISOString() : String(inv.expiresAt),
    acceptedAt: inv.acceptedAt instanceof Date ? inv.acceptedAt.toISOString() : undefined,
    createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : String(inv.createdAt),
  };
}

/**
 * Convert a DB invitation row to a domain-compatible Invitation.
 * Uses forced casts for branded ID types since they're structurally identical strings.
 */
function toDomainInvite(inv: {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}): DomainInvitation {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    invitedById: inv.invitedById,
    expiresAt: inv.expiresAt instanceof Date ? inv.expiresAt.toISOString() : String(inv.expiresAt),
    acceptedAt: inv.acceptedAt instanceof Date ? inv.acceptedAt.toISOString() : undefined,
    createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : String(inv.createdAt),
  } as DomainInvitation;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new invitation.
 * The actor must be admin+ and able to assign the target role.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param actorUserId - ID of the user creating the invitation
 * @param email - Email address to invite
 * @param role - Role to assign upon acceptance
 * @returns Created invitation info
 */
export async function createInvitation(
  repos: Repositories,
  tenantId: string,
  actorUserId: string,
  email: string,
  role: TenantRole,
): Promise<InvitationInfo> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  // Verify actor is a member with sufficient role
  const actorMembership = await repos.memberships.findByTenantAndUser(tenantId, actorUserId);
  if (actorMembership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const actorRole = actorMembership.role;
  if (!canAssignRole(actorRole, role)) {
    throw new ForbiddenError('You cannot invite with this role', 'INSUFFICIENT_ROLE');
  }

  // Enforce domain restrictions
  const allowedDomains = (tenant as { allowedEmailDomains?: string[] }).allowedEmailDomains ?? [];
  if (!isEmailDomainAllowed(email, allowedDomains)) {
    throw new BadRequestError('This email domain is not allowed for this workspace');
  }

  // Check for existing pending invitation
  const existing = await repos.invitations.findPendingByTenantAndEmail(tenantId, email);
  if (existing !== null) {
    throw new BadRequestError('An invitation for this email is already pending');
  }

  // Enforce max pending invitations limit per tenant
  const pendingCount = await repos.invitations.countPendingByTenantId(tenantId);
  if (pendingCount >= QUOTAS.MAX_PENDING_INVITATIONS) {
    throw new BadRequestError(
      `This workspace has reached the maximum of ${String(QUOTAS.MAX_PENDING_INVITATIONS)} pending invitations`,
    );
  }

  const expiresAt = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_MS);

  const invitation = await repos.invitations.create({
    tenantId,
    email,
    role,
    invitedById: actorUserId,
    expiresAt,
  });

  return toInvitationInfo(invitation);
}

/**
 * List all invitations for a workspace.
 * Only members can view invitations.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param actorUserId - ID of the requesting user
 * @returns Array of invitation info
 */
export async function listInvitations(
  repos: Repositories,
  tenantId: string,
  actorUserId: string,
): Promise<InvitationInfo[]> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, actorUserId);
  if (membership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const invitations = await repos.invitations.findByTenantId(tenantId);
  return invitations.map(toInvitationInfo);
}

/**
 * Accept an invitation.
 * The accepting user must have an account with the invited email.
 *
 * @param repos - Repository container
 * @param invitationId - Invitation ID
 * @param acceptingUserId - ID of the user accepting
 * @param acceptingEmail - Email of the accepting user (must match invitation email)
 * @returns The accepted invitation info
 */
export async function acceptInvitation(
  repos: Repositories,
  invitationId: string,
  acceptingUserId: string,
  acceptingEmail: string,
): Promise<InvitationInfo> {
  const invitation = await repos.invitations.findById(invitationId);
  if (invitation === null) {
    throw new NotFoundError('Invitation not found');
  }

  const domainInvite = toDomainInvite(invitation);

  if (!canAcceptInvite(domainInvite)) {
    if (isInviteExpired(domainInvite)) {
      throw new BadRequestError('This invitation has expired');
    }
    throw new BadRequestError('This invitation cannot be accepted');
  }

  // Verify email matches
  if (invitation.email.toLowerCase() !== acceptingEmail.toLowerCase()) {
    throw new ForbiddenError(
      'This invitation was sent to a different email address',
      'EMAIL_MISMATCH',
    );
  }

  // Check if already a member
  const existingMembership = await repos.memberships.findByTenantAndUser(
    invitation.tenantId,
    acceptingUserId,
  );
  if (existingMembership !== null) {
    throw new BadRequestError('You are already a member of this workspace');
  }

  // Create membership
  await repos.memberships.create({
    tenantId: invitation.tenantId,
    userId: acceptingUserId,
    role: invitation.role,
  });

  // Mark invitation as accepted
  const updated = await repos.invitations.update(invitation.id, {
    status: 'accepted',
    acceptedAt: new Date(),
  });

  if (updated === null) {
    throw new Error('Failed to update invitation status');
  }

  return toInvitationInfo(updated);
}

/**
 * Revoke a pending invitation.
 * Only admins+ can revoke invitations.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param invitationId - Invitation ID to revoke
 * @param actorUserId - ID of the user revoking
 * @returns The revoked invitation info
 */
export async function revokeInvitation(
  repos: Repositories,
  tenantId: string,
  invitationId: string,
  actorUserId: string,
): Promise<InvitationInfo> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, actorUserId);
  if (membership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const actorRole = membership.role;
  if (actorRole !== 'admin' && actorRole !== 'owner') {
    throw new ForbiddenError('Only admins and owners can revoke invitations', 'INSUFFICIENT_ROLE');
  }

  const invitation = await repos.invitations.findById(invitationId);
  if (invitation === null) {
    throw new NotFoundError('Invitation not found');
  }

  if (invitation.tenantId !== tenantId) {
    throw new NotFoundError('Invitation not found');
  }

  const domainInvite = toDomainInvite(invitation);

  if (!canRevokeInvite(domainInvite)) {
    throw new BadRequestError('This invitation cannot be revoked');
  }

  const updated = await repos.invitations.update(invitation.id, {
    status: 'revoked',
  });

  if (updated === null) {
    throw new Error('Failed to revoke invitation');
  }

  return toInvitationInfo(updated);
}

/**
 * Resend an invitation by updating its expiry.
 * Only admins+ can resend.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param invitationId - Invitation ID to resend
 * @param actorUserId - ID of the user resending
 * @returns The updated invitation info
 */
export async function resendInvitation(
  repos: Repositories,
  tenantId: string,
  invitationId: string,
  actorUserId: string,
): Promise<InvitationInfo> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const membership = await repos.memberships.findByTenantAndUser(tenantId, actorUserId);
  if (membership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const actorRole = membership.role;
  if (actorRole !== 'admin' && actorRole !== 'owner') {
    throw new ForbiddenError('Only admins and owners can resend invitations', 'INSUFFICIENT_ROLE');
  }

  const invitation = await repos.invitations.findById(invitationId);
  if (invitation === null) {
    throw new NotFoundError('Invitation not found');
  }

  if (invitation.tenantId !== tenantId) {
    throw new NotFoundError('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new BadRequestError('Only pending invitations can be resent');
  }

  // Refresh the expiry date so the invitation is valid for another period
  const newExpiresAt = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_MS);
  const refreshed = await repos.invitations.update(invitation.id, {
    expiresAt: newExpiresAt,
  });

  return toInvitationInfo(refreshed ?? invitation);
}
