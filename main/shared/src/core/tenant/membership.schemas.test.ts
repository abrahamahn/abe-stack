// main/shared/src/core/tenant/membership.schemas.test.ts
/**
 * @file Membership Schemas Tests
 * @description Tests for membership and invitation schema validation.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationsListResponseSchema,
  INVITATION_STATUSES,
  invitationSchema,
  membershipActionResponseSchema,
  membersListResponseSchema,
  membershipSchema,
  updateMembershipRoleSchema,
} from './membership.schemas';

import type {
  Invitation,
  InvitationsListResponse,
  Membership,
  MembershipActionResponse,
  MembersListResponse,
} from './membership.schemas';

describe('membership.schemas', () => {
  // ==========================================================================
  // INVITATION_STATUSES
  // ==========================================================================
  describe('INVITATION_STATUSES', () => {
    it('should contain all valid invitation statuses', () => {
      expect(INVITATION_STATUSES).toEqual(['pending', 'accepted', 'revoked', 'expired']);
    });

    it('should be readonly tuple', () => {
      expect(Array.isArray(INVITATION_STATUSES)).toBe(true);
      expect(INVITATION_STATUSES.length).toBe(4);
    });
  });

  // ==========================================================================
  // membershipSchema
  // ==========================================================================
  describe('membershipSchema', () => {
    const validMembership: Membership = {
      id: '12345678-1234-4abc-8abc-123456789001' as Membership['id'],
      tenantId: '12345678-1234-4abc-8abc-123456789002' as Membership['tenantId'],
      userId: '12345678-1234-4abc-8abc-123456789003' as Membership['userId'],
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    describe('when given valid input', () => {
      it('should parse complete membership with member role', () => {
        const result = membershipSchema.safeParse(validMembership);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('12345678-1234-4abc-8abc-123456789001');
          expect(result.data.tenantId).toBe('12345678-1234-4abc-8abc-123456789002');
          expect(result.data.userId).toBe('12345678-1234-4abc-8abc-123456789003');
          expect(result.data.role).toBe('member');
          expect(result.data.createdAt).toBe('2026-01-01T00:00:00.000Z');
          expect(result.data.updatedAt).toBe('2026-01-01T00:00:00.000Z');
        }
      });

      it('should parse membership with owner role', () => {
        const membership = { ...validMembership, role: 'owner' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('owner');
        }
      });

      it('should parse membership with admin role', () => {
        const membership = { ...validMembership, role: 'admin' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('admin');
        }
      });

      it('should parse membership with viewer role', () => {
        const membership = { ...validMembership, role: 'viewer' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('viewer');
        }
      });
    });

    describe('when given invalid UUIDs', () => {
      it('should reject invalid membership id', () => {
        const membership = { ...validMembership, id: 'not-a-uuid' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject invalid tenantId', () => {
        const membership = { ...validMembership, tenantId: 'invalid-uuid' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject invalid userId', () => {
        const membership = { ...validMembership, userId: '12345' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject empty string for id', () => {
        const membership = { ...validMembership, id: '' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid roles', () => {
      it('should reject invalid role', () => {
        const membership = { ...validMembership, role: 'superadmin' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject empty string role', () => {
        const membership = { ...validMembership, role: '' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject numeric role', () => {
        const membership = { ...validMembership, role: 123 };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid datetimes', () => {
      it('should reject non-ISO createdAt', () => {
        const membership = { ...validMembership, createdAt: 'not-a-date' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject non-ISO updatedAt', () => {
        const membership = { ...validMembership, updatedAt: 'not-a-date' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject timestamp number for createdAt', () => {
        const membership = { ...validMembership, createdAt: 1704067200000 };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });

      it('should reject empty string for updatedAt', () => {
        const membership = { ...validMembership, updatedAt: '' };
        const result = membershipSchema.safeParse(membership);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject missing required fields', () => {
        const incomplete = { id: '12345678-1234-4abc-8abc-123456789001' };
        const result = membershipSchema.safeParse(incomplete);
        expect(result.success).toBe(false);
      });

      it('should reject null', () => {
        const result = membershipSchema.safeParse(null);
        expect(result.success).toBe(false);
      });

      it('should reject undefined', () => {
        const result = membershipSchema.safeParse(undefined);
        expect(result.success).toBe(false);
      });

      it('should reject non-object input', () => {
        const result = membershipSchema.safeParse('not an object');
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // invitationSchema
  // ==========================================================================
  describe('invitationSchema', () => {
    const validInvitation: Invitation = {
      id: '12345678-1234-4abc-8abc-123456789010' as Invitation['id'],
      tenantId: '12345678-1234-4abc-8abc-123456789011' as Invitation['tenantId'],
      email: 'user@example.com',
      role: 'member',
      status: 'pending',
      invitedById: '12345678-1234-4abc-8abc-123456789012' as Invitation['invitedById'],
      expiresAt: '2026-12-31T23:59:59.999Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    describe('when given valid input', () => {
      it('should parse complete invitation with all fields', () => {
        const result = invitationSchema.safeParse(validInvitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('12345678-1234-4abc-8abc-123456789010');
          expect(result.data.tenantId).toBe('12345678-1234-4abc-8abc-123456789011');
          expect(result.data.email).toBe('user@example.com');
          expect(result.data.role).toBe('member');
          expect(result.data.status).toBe('pending');
          expect(result.data.invitedById).toBe('12345678-1234-4abc-8abc-123456789012');
          expect(result.data.expiresAt).toBe('2026-12-31T23:59:59.999Z');
          expect(result.data.createdAt).toBe('2026-01-01T00:00:00.000Z');
          expect(result.data.acceptedAt).toBeUndefined();
        }
      });

      it('should parse invitation with acceptedAt field', () => {
        const invitation = {
          ...validInvitation,
          acceptedAt: '2026-01-15T12:00:00.000Z',
        };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.acceptedAt).toBe('2026-01-15T12:00:00.000Z');
        }
      });

      it('should default status to pending when status is undefined', () => {
        const { status: _status, ...invitationWithoutStatus } = validInvitation;
        const result = invitationSchema.safeParse(invitationWithoutStatus);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('pending');
        }
      });

      it('should parse invitation with accepted status', () => {
        const invitation = { ...validInvitation, status: 'accepted' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('accepted');
        }
      });

      it('should parse invitation with revoked status', () => {
        const invitation = { ...validInvitation, status: 'revoked' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('revoked');
        }
      });

      it('should parse invitation with expired status', () => {
        const invitation = { ...validInvitation, status: 'expired' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('expired');
        }
      });

      it('should accept undefined for optional acceptedAt', () => {
        const invitation = { ...validInvitation, acceptedAt: undefined };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.acceptedAt).toBeUndefined();
        }
      });
    });

    describe('when given invalid emails', () => {
      it('should reject invalid email format', () => {
        const invitation = { ...validInvitation, email: 'not-an-email' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject email without @', () => {
        const invitation = { ...validInvitation, email: 'userexample.com' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const invitation = { ...validInvitation, email: 'user@' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject empty string email', () => {
        const invitation = { ...validInvitation, email: '' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject email longer than 255 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const invitation = { ...validInvitation, email: longEmail };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid invitation statuses', () => {
      it('should reject invalid status', () => {
        const invitation = { ...validInvitation, status: 'cancelled' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject empty string status', () => {
        const invitation = { ...validInvitation, status: '' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject numeric status', () => {
        const invitation = { ...validInvitation, status: 1 };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject uppercase status', () => {
        const invitation = { ...validInvitation, status: 'PENDING' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid UUIDs', () => {
      it('should reject invalid invitation id', () => {
        const invitation = { ...validInvitation, id: 'not-a-uuid' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject invalid tenantId', () => {
        const invitation = { ...validInvitation, tenantId: 'invalid' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject invalid invitedById', () => {
        const invitation = { ...validInvitation, invitedById: '123' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid roles', () => {
      it('should reject invalid role', () => {
        const invitation = { ...validInvitation, role: 'guest' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject empty string role', () => {
        const invitation = { ...validInvitation, role: '' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject missing required fields', () => {
        const incomplete = { id: '12345678-1234-4abc-8abc-123456789010' };
        const result = invitationSchema.safeParse(incomplete);
        expect(result.success).toBe(false);
      });

      it('should reject null', () => {
        const result = invitationSchema.safeParse(null);
        expect(result.success).toBe(false);
      });

      it('should reject non-object input', () => {
        const result = invitationSchema.safeParse('not an object');
        expect(result.success).toBe(false);
      });

      it('should reject invalid ISO datetime for expiresAt', () => {
        const invitation = { ...validInvitation, expiresAt: 'not-a-date' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });

      it('should reject invalid ISO datetime for acceptedAt when provided', () => {
        const invitation = { ...validInvitation, acceptedAt: 'not-a-date' };
        const result = invitationSchema.safeParse(invitation);
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // createInvitationSchema
  // ==========================================================================
  describe('createInvitationSchema', () => {
    describe('when given valid input', () => {
      it('should parse valid email and role', () => {
        const input = {
          email: 'newuser@example.com',
          role: 'member',
        };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('newuser@example.com');
          expect(result.data.role).toBe('member');
        }
      });

      it('should parse invitation with owner role', () => {
        const input = { email: 'owner@example.com', role: 'owner' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('owner');
        }
      });

      it('should parse invitation with admin role', () => {
        const input = { email: 'admin@example.com', role: 'admin' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('admin');
        }
      });

      it('should parse invitation with viewer role', () => {
        const input = { email: 'viewer@example.com', role: 'viewer' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('viewer');
        }
      });
    });

    describe('when given invalid emails', () => {
      it('should reject invalid email format', () => {
        const input = { email: 'invalid-email', role: 'member' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const input = { email: 'user@', role: 'member' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty string email', () => {
        const input = { email: '', role: 'member' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('when given invalid roles', () => {
      it('should reject invalid role', () => {
        const input = { email: 'user@example.com', role: 'moderator' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty string role', () => {
        const input = { email: 'user@example.com', role: '' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject numeric role', () => {
        const input = { email: 'user@example.com', role: 123 };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject missing email field', () => {
        const input = { role: 'member' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing role field', () => {
        const input = { email: 'user@example.com' };
        const result = createInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject null', () => {
        const result = createInvitationSchema.safeParse(null);
        expect(result.success).toBe(false);
      });

      it('should reject empty object', () => {
        const result = createInvitationSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // updateMembershipRoleSchema
  // ==========================================================================
  describe('updateMembershipRoleSchema', () => {
    describe('when given valid role', () => {
      it('should parse owner role', () => {
        const input = { role: 'owner' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('owner');
        }
      });

      it('should parse admin role', () => {
        const input = { role: 'admin' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('admin');
        }
      });

      it('should parse member role', () => {
        const input = { role: 'member' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('member');
        }
      });

      it('should parse viewer role', () => {
        const input = { role: 'viewer' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('viewer');
        }
      });
    });

    describe('when given invalid role', () => {
      it('should reject invalid role string', () => {
        const input = { role: 'superuser' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty string role', () => {
        const input = { role: '' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject numeric role', () => {
        const input = { role: 1 };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject uppercase role', () => {
        const input = { role: 'ADMIN' };
        const result = updateMembershipRoleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject missing role field', () => {
        const result = updateMembershipRoleSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject null', () => {
        const result = updateMembershipRoleSchema.safeParse(null);
        expect(result.success).toBe(false);
      });

      it('should reject undefined', () => {
        const result = updateMembershipRoleSchema.safeParse(undefined);
        expect(result.success).toBe(false);
      });

      it('should reject non-object input', () => {
        const result = updateMembershipRoleSchema.safeParse('admin');
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // acceptInvitationSchema
  // ==========================================================================
  describe('acceptInvitationSchema', () => {
    describe('when given valid token', () => {
      it('should parse single character token', () => {
        const input = { token: 'a' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('a');
        }
      });

      it('should parse alphanumeric token', () => {
        const input = { token: 'abc123xyz789' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('abc123xyz789');
        }
      });

      it('should parse UUID token', () => {
        const input = { token: '12345678-1234-4abc-8abc-123456789001' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('12345678-1234-4abc-8abc-123456789001');
        }
      });

      it('should parse long token', () => {
        const input = { token: 'a'.repeat(100) };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('a'.repeat(100));
        }
      });

      it('should parse token with special characters', () => {
        const input = { token: 'token-with-dashes_and_underscores.dots' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('token-with-dashes_and_underscores.dots');
        }
      });
    });

    describe('when given invalid token', () => {
      it('should reject empty string token', () => {
        const input = { token: '' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject numeric token', () => {
        const input = { token: 12345 };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject null token', () => {
        const input = { token: null };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject undefined token', () => {
        const input = { token: undefined };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject missing token field', () => {
        const result = acceptInvitationSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject null input', () => {
        const result = acceptInvitationSchema.safeParse(null);
        expect(result.success).toBe(false);
      });

      it('should reject non-object input', () => {
        const result = acceptInvitationSchema.safeParse('token-string');
        expect(result.success).toBe(false);
      });

      it('should reject array input', () => {
        const result = acceptInvitationSchema.safeParse(['token']);
        expect(result.success).toBe(false);
      });
    });
  });
});

// ============================================================================
// Response Schema Test Constants
// ============================================================================

const VALID_MEMBERSHIP = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  tenantId: 'b1ffcd00-ad1c-4ef9-ab7e-7cc0ce491b22',
  userId: 'c2aadd11-be2d-4ef0-ac8f-8dd1df602c33',
  role: 'member',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const VALID_INVITATION = {
  id: 'd3bbee22-cf3e-4ef1-8d90-9ee2ef713d44',
  tenantId: 'e4ccff33-d04f-4ef2-aeab-aff3f0824e55',
  email: 'user@example.com',
  role: 'member',
  status: 'pending',
  invitedById: 'f5dd0044-e150-4ef3-9fbc-b004f1935f66',
  expiresAt: '2026-12-31T23:59:59.999Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ============================================================================
// membersListResponseSchema Tests
// ============================================================================

describe('membersListResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse response with one member', () => {
      const result: MembersListResponse = membersListResponseSchema.parse({
        data: [VALID_MEMBERSHIP],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(result.data[0]?.role).toBe('member');
    });

    it('should parse response with empty data array', () => {
      const result: MembersListResponse = membersListResponseSchema.parse({ data: [] });

      expect(result.data).toHaveLength(0);
    });

    it('should parse response with multiple members', () => {
      const secondMember = {
        ...VALID_MEMBERSHIP,
        id: 'd3bbee22-cf3e-4ef1-8d90-9ee2ef713d55',
        role: 'admin',
      };
      const result: MembersListResponse = membersListResponseSchema.parse({
        data: [VALID_MEMBERSHIP, secondMember],
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[1]?.role).toBe('admin');
    });
  });

  describe('invalid inputs', () => {
    it('should throw when data is not an array', () => {
      expect(() => membersListResponseSchema.parse({ data: 'not-array' })).toThrow(
        'data must be an array',
      );
    });

    it('should throw when data is missing', () => {
      expect(() => membersListResponseSchema.parse({})).toThrow('data must be an array');
    });

    it('should throw when a member in data has invalid UUID', () => {
      const badMember = { ...VALID_MEMBERSHIP, id: 'bad-uuid' };
      expect(() => membersListResponseSchema.parse({ data: [badMember] })).toThrow();
    });

    it('should throw when a member has an invalid role', () => {
      const badMember = { ...VALID_MEMBERSHIP, role: 'superuser' };
      expect(() => membersListResponseSchema.parse({ data: [badMember] })).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => membersListResponseSchema.parse(null)).toThrow('data must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => membersListResponseSchema.parse('list')).toThrow('data must be an array');
    });
  });
});

// ============================================================================
// invitationsListResponseSchema Tests
// ============================================================================

describe('invitationsListResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse response with one invitation', () => {
      const result: InvitationsListResponse = invitationsListResponseSchema.parse({
        data: [VALID_INVITATION],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.email).toBe('user@example.com');
      expect(result.data[0]?.status).toBe('pending');
    });

    it('should parse response with empty data array', () => {
      const result: InvitationsListResponse = invitationsListResponseSchema.parse({ data: [] });

      expect(result.data).toHaveLength(0);
    });

    it('should parse response with multiple invitations of different statuses', () => {
      const acceptedInvitation = {
        ...VALID_INVITATION,
        id: 'e4ccff33-d04f-4ef2-aeab-aff3f0824e66',
        status: 'accepted',
        acceptedAt: '2026-02-01T00:00:00.000Z',
      };
      const result: InvitationsListResponse = invitationsListResponseSchema.parse({
        data: [VALID_INVITATION, acceptedInvitation],
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[1]?.status).toBe('accepted');
    });
  });

  describe('invalid inputs', () => {
    it('should throw when data is not an array', () => {
      expect(() => invitationsListResponseSchema.parse({ data: {} })).toThrow(
        'data must be an array',
      );
    });

    it('should throw when data is missing', () => {
      expect(() => invitationsListResponseSchema.parse({})).toThrow('data must be an array');
    });

    it('should throw when an invitation has an invalid email', () => {
      const badInvitation = { ...VALID_INVITATION, email: 'not-an-email' };
      expect(() => invitationsListResponseSchema.parse({ data: [badInvitation] })).toThrow();
    });

    it('should throw when an invitation has an invalid status', () => {
      const badInvitation = { ...VALID_INVITATION, status: 'cancelled' };
      expect(() => invitationsListResponseSchema.parse({ data: [badInvitation] })).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => invitationsListResponseSchema.parse(null)).toThrow('data must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => invitationsListResponseSchema.parse(42)).toThrow('data must be an array');
    });
  });
});

// ============================================================================
// membershipActionResponseSchema Tests
// ============================================================================

describe('membershipActionResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid action response with message', () => {
      const result: MembershipActionResponse = membershipActionResponseSchema.parse({
        message: 'Member removed successfully',
      });

      expect(result.message).toBe('Member removed successfully');
    });

    it('should parse action response with empty message', () => {
      const result: MembershipActionResponse = membershipActionResponseSchema.parse({
        message: '',
      });

      expect(result.message).toBe('');
    });

    it('should parse action response with long message', () => {
      const longMessage = 'Invitation accepted and member added to workspace.';
      const result: MembershipActionResponse = membershipActionResponseSchema.parse({
        message: longMessage,
      });

      expect(result.message).toBe(longMessage);
    });
  });

  describe('invalid inputs', () => {
    it('should throw when message is missing', () => {
      expect(() => membershipActionResponseSchema.parse({})).toThrow('message must be a string');
    });

    it('should throw when message is null', () => {
      expect(() => membershipActionResponseSchema.parse({ message: null })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when message is a number', () => {
      expect(() => membershipActionResponseSchema.parse({ message: 42 })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when message is a boolean', () => {
      expect(() => membershipActionResponseSchema.parse({ message: true })).toThrow(
        'message must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => membershipActionResponseSchema.parse(null)).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => membershipActionResponseSchema.parse('success')).toThrow(
        'message must be a string',
      );
    });
  });
});
