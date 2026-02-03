// shared/src/domain/membership/membership.schemas.ts
/**
 * @file Membership Contracts
 * @description Types and schemas for workspace/tenant memberships and invitations.
 * @module Domain/Membership
 */

import { z } from 'zod';

import { emailSchema, isoDateTimeSchema } from '../../core/schemas';
import { inviteIdSchema, membershipIdSchema, tenantIdSchema, userIdSchema } from '../../types/ids';
import { tenantRoleSchema } from '../../types/roles';

// ============================================================================
// Constants
// ============================================================================

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// ============================================================================
// Membership Schemas
// ============================================================================

export const membershipSchema = z.object({
  id: membershipIdSchema,
  tenantId: tenantIdSchema,
  userId: userIdSchema,
  role: tenantRoleSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

export const invitationSchema = z.object({
  id: inviteIdSchema,
  tenantId: tenantIdSchema,
  email: emailSchema,
  role: tenantRoleSchema,
  status: z.enum(INVITATION_STATUSES).default('pending'),
  invitedById: userIdSchema,
  expiresAt: isoDateTimeSchema,
  acceptedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
});
export type Invitation = z.infer<typeof invitationSchema>;

// ============================================================================
// DTOs & Validation
// ============================================================================

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: tenantRoleSchema,
});
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

export const updateMembershipRoleSchema = z.object({
  role: tenantRoleSchema,
});
export type UpdateMembershipRole = z.infer<typeof updateMembershipRoleSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
