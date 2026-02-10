// src/server/core/src/tenants/membership-service.ts
/**
 * Membership Service
 *
 * Business logic for managing workspace members.
 * Handles listing, adding, updating roles, and removing members.
 *
 * @module membership-service
 */

import {
  BadRequestError,
  canAssignRole,
  canChangeRole,
  canRemoveMember,
  ForbiddenError,
  NotFoundError,
} from '@abe-stack/shared';

import type { Repositories } from '@abe-stack/db';
import type { TenantRole } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

/** Member info returned to clients */
export interface MemberInfo {
  id: string;
  userId: string;
  role: TenantRole;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List all members of a workspace.
 * Only members of the workspace can view the member list.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param requestingUserId - ID of the requesting user
 * @returns Array of member info
 * @throws NotFoundError if tenant not found
 * @throws ForbiddenError if user is not a member
 */
export async function listMembers(
  repos: Repositories,
  tenantId: string,
  requestingUserId: string,
): Promise<MemberInfo[]> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const requestingMembership = await repos.memberships.findByTenantAndUser(
    tenantId,
    requestingUserId,
  );
  if (requestingMembership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const memberships = await repos.memberships.findByTenantId(tenantId);

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date(m.updatedAt).toISOString(),
  }));
}

/**
 * Add a member to a workspace.
 * Only admins and owners can add members.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param requestingUserId - ID of the requesting user
 * @param targetUserId - ID of the user to add
 * @param role - Role to assign
 * @returns Created member info
 * @throws NotFoundError if tenant or target user not found
 * @throws ForbiddenError if actor lacks permission
 * @throws BadRequestError if user is already a member
 */
export async function addMember(
  repos: Repositories,
  tenantId: string,
  requestingUserId: string,
  targetUserId: string,
  role: TenantRole,
): Promise<MemberInfo> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const actorMembership = await repos.memberships.findByTenantAndUser(tenantId, requestingUserId);
  if (actorMembership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const actorRole = actorMembership.role as TenantRole;
  if (!canAssignRole(actorRole, role)) {
    throw new ForbiddenError('You cannot assign this role', 'INSUFFICIENT_ROLE');
  }

  // Verify target user exists
  const targetUser = await repos.users.findById(targetUserId);
  if (targetUser === null) {
    throw new NotFoundError('User not found');
  }

  // Check if already a member
  const existingMembership = await repos.memberships.findByTenantAndUser(tenantId, targetUserId);
  if (existingMembership !== null) {
    throw new BadRequestError('User is already a member of this workspace');
  }

  const membership = await repos.memberships.create({
    tenantId,
    userId: targetUserId,
    role,
  });

  return {
    id: membership.id,
    userId: membership.userId,
    role: membership.role as TenantRole,
    createdAt:
      typeof membership.createdAt === 'string'
        ? membership.createdAt
        : new Date(membership.createdAt).toISOString(),
    updatedAt:
      typeof membership.updatedAt === 'string'
        ? membership.updatedAt
        : new Date(membership.updatedAt).toISOString(),
  };
}

/**
 * Update a member's role.
 * Subject to role hierarchy validation.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param requestingUserId - ID of the requesting user
 * @param targetUserId - ID of the user whose role is being changed
 * @param newRole - New role to assign
 * @returns Updated member info
 * @throws NotFoundError if tenant or membership not found
 * @throws ForbiddenError if actor lacks permission
 * @throws BadRequestError if invalid role transition
 */
export async function updateMemberRole(
  repos: Repositories,
  tenantId: string,
  requestingUserId: string,
  targetUserId: string,
  newRole: TenantRole,
): Promise<MemberInfo> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const actorMembership = await repos.memberships.findByTenantAndUser(tenantId, requestingUserId);
  if (actorMembership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  const targetMembership = await repos.memberships.findByTenantAndUser(tenantId, targetUserId);
  if (targetMembership === null) {
    throw new NotFoundError('Member not found in this workspace');
  }

  const actorRole = actorMembership.role as TenantRole;
  const targetRole = targetMembership.role as TenantRole;
  if (!canChangeRole(actorRole, targetRole, newRole)) {
    throw new ForbiddenError("You cannot change this member's role", 'INSUFFICIENT_ROLE');
  }

  const updated = await repos.memberships.update(targetMembership.id, { role: newRole });
  if (updated === null) {
    throw new Error('Failed to update membership');
  }

  return {
    id: updated.id,
    userId: updated.userId,
    role: updated.role as TenantRole,
    createdAt:
      typeof updated.createdAt === 'string'
        ? updated.createdAt
        : new Date(updated.createdAt).toISOString(),
    updatedAt:
      typeof updated.updatedAt === 'string'
        ? updated.updatedAt
        : new Date(updated.updatedAt).toISOString(),
  };
}

/**
 * Remove a member from a workspace.
 * Subject to role hierarchy validation.
 *
 * @param repos - Repository container
 * @param tenantId - Workspace ID
 * @param requestingUserId - ID of the requesting user
 * @param targetUserId - ID of the user to remove
 * @throws NotFoundError if tenant or membership not found
 * @throws ForbiddenError if actor lacks permission
 */
export async function removeMember(
  repos: Repositories,
  tenantId: string,
  requestingUserId: string,
  targetUserId: string,
): Promise<void> {
  const tenant = await repos.tenants.findById(tenantId);
  if (tenant === null) {
    throw new NotFoundError('Workspace not found');
  }

  const actorMembership = await repos.memberships.findByTenantAndUser(tenantId, requestingUserId);
  if (actorMembership === null) {
    throw new ForbiddenError('You are not a member of this workspace', 'NOT_MEMBER');
  }

  // Self-removal: anyone except sole owner can leave
  if (requestingUserId === targetUserId) {
    if (actorMembership.role === 'owner') {
      // Check if sole owner
      const allMembers = await repos.memberships.findByTenantId(tenantId);
      const owners = allMembers.filter((m) => m.role === 'owner');
      if (owners.length === 1) {
        throw new ForbiddenError(
          'Cannot leave workspace as sole owner. Transfer ownership first.',
          'SOLE_OWNER',
        );
      }
    }
    await repos.memberships.delete(actorMembership.id);
    return;
  }

  // Removing another member: check permissions
  const targetMembership = await repos.memberships.findByTenantAndUser(tenantId, targetUserId);
  if (targetMembership === null) {
    throw new NotFoundError('Member not found in this workspace');
  }

  const actorRole = actorMembership.role as TenantRole;
  const targetRole = targetMembership.role as TenantRole;
  if (!canRemoveMember(actorRole, targetRole)) {
    throw new ForbiddenError('You cannot remove this member', 'INSUFFICIENT_ROLE');
  }

  await repos.memberships.delete(targetMembership.id);
}
