// src/shared/src/domain/membership/membership.schemas.ts
/**
 * @file Membership Contracts
 * @description Types and schemas for workspace/tenant memberships and invitations.
 * @module Domain/Membership
 */

import {
  createEnumSchema,
  createSchema,
  parseOptional,
  parseString,
  withDefault,
} from '../../core/schema.utils';
import { emailSchema, isoDateTimeSchema } from '../../core/schemas';
import { inviteIdSchema, membershipIdSchema, tenantIdSchema, userIdSchema } from '../../types/ids';
import { tenantRoleSchema } from '../../types/roles';

import type { Schema } from '../../core/api';
import type { InviteId, MembershipId, TenantId, UserId } from '../../types/ids';
import type { TenantRole } from '../../types/roles';

// ============================================================================
// Constants
// ============================================================================

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Invitation status enum schema */
const invitationStatusSchema = createEnumSchema(INVITATION_STATUSES, 'invitation status');

// ============================================================================
// Types
// ============================================================================

/** Full membership entity */
export interface Membership {
  id: MembershipId;
  tenantId: TenantId;
  userId: UserId;
  role: TenantRole;
  createdAt: string;
  updatedAt: string;
}

/** Full invitation entity */
export interface Invitation {
  id: InviteId;
  tenantId: TenantId;
  email: string;
  role: TenantRole;
  status: InvitationStatus;
  invitedById: UserId;
  expiresAt: string;
  acceptedAt?: string | undefined;
  createdAt: string;
}

/** Input for creating an invitation */
export interface CreateInvitation {
  email: string;
  role: TenantRole;
}

/** Input for updating a membership role */
export interface UpdateMembershipRole {
  role: TenantRole;
}

/** Input for accepting an invitation */
export interface AcceptInvitation {
  token: string;
}

// ============================================================================
// Membership Schemas
// ============================================================================

export const membershipSchema: Schema<Membership> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: membershipIdSchema.parse(obj['id']),
    tenantId: tenantIdSchema.parse(obj['tenantId']),
    userId: userIdSchema.parse(obj['userId']),
    role: tenantRoleSchema.parse(obj['role']),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const invitationSchema: Schema<Invitation> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: inviteIdSchema.parse(obj['id']),
    tenantId: tenantIdSchema.parse(obj['tenantId']),
    email: emailSchema.parse(obj['email']),
    role: tenantRoleSchema.parse(obj['role']),
    status: invitationStatusSchema.parse(withDefault(obj['status'], 'pending')),
    invitedById: userIdSchema.parse(obj['invitedById']),
    expiresAt: isoDateTimeSchema.parse(obj['expiresAt']),
    acceptedAt: parseOptional(obj['acceptedAt'], (v) => isoDateTimeSchema.parse(v)),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

// ============================================================================
// DTOs & Validation
// ============================================================================

export const createInvitationSchema: Schema<CreateInvitation> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    email: emailSchema.parse(obj['email']),
    role: tenantRoleSchema.parse(obj['role']),
  };
});

export const updateMembershipRoleSchema: Schema<UpdateMembershipRole> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      role: tenantRoleSchema.parse(obj['role']),
    };
  },
);

export const acceptInvitationSchema: Schema<AcceptInvitation> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    token: parseString(obj['token'], 'token', { min: 1 }),
  };
});
