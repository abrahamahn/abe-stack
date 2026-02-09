// src/shared/src/domain/membership/membership.schemas.test.ts
import { describe, expect, it } from 'vitest';

import {
  acceptInvitationSchema,
  createInvitationSchema,
  INVITATION_STATUSES,
  invitationSchema,
  membershipSchema,
  updateMembershipRoleSchema,
} from './membership.schemas';

import type { Invitation, Membership } from './membership.schemas';

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
      id: '00000000-0000-0000-0000-000000000001' as Membership['id'],
      tenantId: '00000000-0000-0000-0000-000000000002' as Membership['tenantId'],
      userId: '00000000-0000-0000-0000-000000000003' as Membership['userId'],
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    describe('when given valid input', () => {
      it('should parse complete membership with member role', () => {
        const result = membershipSchema.safeParse(validMembership);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('00000000-0000-0000-0000-000000000001');
          expect(result.data.tenantId).toBe('00000000-0000-0000-0000-000000000002');
          expect(result.data.userId).toBe('00000000-0000-0000-0000-000000000003');
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
        const incomplete = { id: '00000000-0000-0000-0000-000000000001' };
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
      id: '00000000-0000-0000-0000-000000000010' as Invitation['id'],
      tenantId: '00000000-0000-0000-0000-000000000011' as Invitation['tenantId'],
      email: 'user@example.com',
      role: 'member',
      status: 'pending',
      invitedById: '00000000-0000-0000-0000-000000000012' as Invitation['invitedById'],
      expiresAt: '2026-12-31T23:59:59.999Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    describe('when given valid input', () => {
      it('should parse complete invitation with all fields', () => {
        const result = invitationSchema.safeParse(validInvitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('00000000-0000-0000-0000-000000000010');
          expect(result.data.tenantId).toBe('00000000-0000-0000-0000-000000000011');
          expect(result.data.email).toBe('user@example.com');
          expect(result.data.role).toBe('member');
          expect(result.data.status).toBe('pending');
          expect(result.data.invitedById).toBe('00000000-0000-0000-0000-000000000012');
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
        const incomplete = { id: '00000000-0000-0000-0000-000000000010' };
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
        const input = { token: '00000000-0000-0000-0000-000000000001' };
        const result = acceptInvitationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.token).toBe('00000000-0000-0000-0000-000000000001');
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
