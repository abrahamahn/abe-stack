// packages/shared/src/domain/membership/membership.logic.test.ts
import { describe, expect, it } from 'vitest';

import {
  canAcceptInvite,
  canRevokeInvite,
  hasAtLeastRole,
  isInviteExpired,
} from './membership.logic';

import type { Invitation, Membership } from './membership.schemas';

describe('membership.logic', () => {
  // ==========================================================================
  // Test Data Helpers
  // ==========================================================================
  function createInvitation(overrides: Partial<Invitation> = {}): Invitation {
    return {
      id: 'inv-1' as Invitation['id'],
      tenantId: 'tenant-1' as Invitation['tenantId'],
      email: 'user@test.com',
      role: 'member',
      status: 'pending',
      invitedById: 'user-1' as Invitation['invitedById'],
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // +1 day
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function createMembership(role: string): Membership {
    return {
      id: 'mem-1' as Membership['id'],
      tenantId: 'tenant-1' as Membership['tenantId'],
      userId: 'user-1' as Membership['userId'],
      role: role as Membership['role'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // isInviteExpired
  // ==========================================================================
  describe('isInviteExpired', () => {
    it('returns false for future expiry', () => {
      const invite = createInvitation({
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(isInviteExpired(invite)).toBe(false);
    });

    it('returns true for past expiry', () => {
      const invite = createInvitation({
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(isInviteExpired(invite)).toBe(true);
    });
  });

  // ==========================================================================
  // canAcceptInvite
  // ==========================================================================
  describe('canAcceptInvite', () => {
    it('returns true for pending, non-expired invite', () => {
      const invite = createInvitation({ status: 'pending' });
      expect(canAcceptInvite(invite)).toBe(true);
    });

    it('returns false for expired invite', () => {
      const invite = createInvitation({
        status: 'pending',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(canAcceptInvite(invite)).toBe(false);
    });

    it('returns false for accepted invite', () => {
      const invite = createInvitation({ status: 'accepted' });
      expect(canAcceptInvite(invite)).toBe(false);
    });

    it('returns false for revoked invite', () => {
      const invite = createInvitation({ status: 'revoked' });
      expect(canAcceptInvite(invite)).toBe(false);
    });
  });

  // ==========================================================================
  // canRevokeInvite
  // ==========================================================================
  describe('canRevokeInvite', () => {
    it('returns true for pending invite', () => {
      const invite = createInvitation({ status: 'pending' });
      expect(canRevokeInvite(invite)).toBe(true);
    });

    it('returns false for accepted invite', () => {
      const invite = createInvitation({ status: 'accepted' });
      expect(canRevokeInvite(invite)).toBe(false);
    });

    it('returns false for already revoked invite', () => {
      const invite = createInvitation({ status: 'revoked' });
      expect(canRevokeInvite(invite)).toBe(false);
    });

    it('returns false for expired invite', () => {
      const invite = createInvitation({ status: 'expired' });
      expect(canRevokeInvite(invite)).toBe(false);
    });
  });

  // ==========================================================================
  // hasAtLeastRole
  // ==========================================================================
  describe('hasAtLeastRole', () => {
    it('owner has at least any role', () => {
      const membership = createMembership('owner');
      expect(hasAtLeastRole(membership, 'viewer')).toBe(true);
      expect(hasAtLeastRole(membership, 'member')).toBe(true);
      expect(hasAtLeastRole(membership, 'admin')).toBe(true);
      expect(hasAtLeastRole(membership, 'owner')).toBe(true);
    });

    it('admin has at least member and viewer', () => {
      const membership = createMembership('admin');
      expect(hasAtLeastRole(membership, 'viewer')).toBe(true);
      expect(hasAtLeastRole(membership, 'member')).toBe(true);
      expect(hasAtLeastRole(membership, 'admin')).toBe(true);
      expect(hasAtLeastRole(membership, 'owner')).toBe(false);
    });

    it('member has at least viewer', () => {
      const membership = createMembership('member');
      expect(hasAtLeastRole(membership, 'viewer')).toBe(true);
      expect(hasAtLeastRole(membership, 'member')).toBe(true);
      expect(hasAtLeastRole(membership, 'admin')).toBe(false);
    });

    it('viewer has only viewer level', () => {
      const membership = createMembership('viewer');
      expect(hasAtLeastRole(membership, 'viewer')).toBe(true);
      expect(hasAtLeastRole(membership, 'member')).toBe(false);
    });
  });
});
