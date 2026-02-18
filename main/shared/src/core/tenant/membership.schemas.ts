// main/shared/src/core/tenant/membership.schemas.ts
/**
 * @file Membership Schemas
 * @description Types and schemas for workspace/tenant memberships and invitations.
 * @module Core/Tenant
 */

import {
  createEnumSchema,
  createSchema,
  parseOptional,
  parseString,
  withDefault,
  type Schema,
} from '../../primitives/schema';
import {
  inviteIdSchema,
  membershipIdSchema,
  tenantIdSchema,
  userIdSchema,
} from '../../primitives/schema/ids';
import { emailSchema, isoDateTimeSchema } from '../schemas';
import { tenantRoleSchema } from '../auth/roles';
import { INVITATION_STATUSES } from '../constants/iam';

import type { InviteId, MembershipId, TenantId, UserId } from '../../primitives/schema/ids';
import type { TenantRole } from '../auth/roles';

// ============================================================================
// Constants
// ============================================================================

export { INVITATION_STATUSES };
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

/** Input for directly adding a member to a workspace */
export interface AddMember {
  userId: string;
  role: TenantRole;
}

/** Input for accepting an invitation */
export interface AcceptInvitation {
  token: string;
}

// ============================================================================
// Schemas
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

export const addMemberSchema: Schema<AddMember> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    userId: parseString(obj['userId'], 'userId', { min: 1 }),
    role: tenantRoleSchema.parse(obj['role']),
  };
});

export const acceptInvitationSchema: Schema<AcceptInvitation> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    token: parseString(obj['token'], 'token', { min: 1 }),
  };
});

// ============================================================================
// Response Schemas
// ============================================================================

/** List of members */
export interface MembersListResponse {
  data: Membership[];
}

/** List of invitations */
export interface InvitationsListResponse {
  data: Invitation[];
}

/** Generic membership action response */
export interface MembershipActionResponse {
  message: string;
}

export const membersListResponseSchema: Schema<MembersListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) throw new Error('data must be an array');

    return {
      data: obj['data'].map((item) => membershipSchema.parse(item)),
    };
  },
);

export const invitationsListResponseSchema: Schema<InvitationsListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) throw new Error('data must be an array');

    return {
      data: obj['data'].map((item) => invitationSchema.parse(item)),
    };
  },
);

export const membershipActionResponseSchema: Schema<MembershipActionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      message: parseString(obj['message'], 'message'),
    };
  },
);
