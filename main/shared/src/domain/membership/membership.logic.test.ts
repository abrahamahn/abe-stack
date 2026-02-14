// main/shared/src/domain/membership/membership.logic.test.ts
import { describe, expect, it } from 'vitest';

import {
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
} from './membership.logic';

import type { Invitation, Membership } from './membership.schemas';
import type { TenantRole } from '../../types/roles';

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

  function createMembershipWithUser(role: string, userId: string): Membership {
    return {
      id: `mem-${userId}` as Membership['id'],
      tenantId: 'tenant-1' as Membership['tenantId'],
      userId: userId as Membership['userId'],
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

  // ==========================================================================
  // getRoleLevel
  // ==========================================================================
  describe('getRoleLevel', () => {
    it('returns correct numeric levels in ascending order', () => {
      expect(getRoleLevel('viewer')).toBe(1);
      expect(getRoleLevel('member')).toBe(2);
      expect(getRoleLevel('admin')).toBe(3);
      expect(getRoleLevel('owner')).toBe(4);
    });
  });

  // ==========================================================================
  // canAssignRole
  // ==========================================================================
  describe('canAssignRole', () => {
    const roles: TenantRole[] = ['owner', 'admin', 'member', 'viewer'];

    it('owner can assign admin, member, viewer but not owner', () => {
      expect(canAssignRole('owner', 'admin')).toBe(true);
      expect(canAssignRole('owner', 'member')).toBe(true);
      expect(canAssignRole('owner', 'viewer')).toBe(true);
      expect(canAssignRole('owner', 'owner')).toBe(false);
    });

    it('admin can assign member, viewer but not admin or owner', () => {
      expect(canAssignRole('admin', 'member')).toBe(true);
      expect(canAssignRole('admin', 'viewer')).toBe(true);
      expect(canAssignRole('admin', 'admin')).toBe(false);
      expect(canAssignRole('admin', 'owner')).toBe(false);
    });

    it('member cannot assign any role', () => {
      for (const target of roles) {
        expect(canAssignRole('member', target)).toBe(false);
      }
    });

    it('viewer cannot assign any role', () => {
      for (const target of roles) {
        expect(canAssignRole('viewer', target)).toBe(false);
      }
    });

    it('full matrix validation', () => {
      const expected: Record<TenantRole, Record<TenantRole, boolean>> = {
        owner: { owner: false, admin: true, member: true, viewer: true },
        admin: { owner: false, admin: false, member: true, viewer: true },
        member: { owner: false, admin: false, member: false, viewer: false },
        viewer: { owner: false, admin: false, member: false, viewer: false },
      };

      for (const actor of roles) {
        for (const target of roles) {
          expect(canAssignRole(actor, target)).toBe(expected[actor][target]);
        }
      }
    });
  });

  // ==========================================================================
  // canRemoveMember
  // ==========================================================================
  describe('canRemoveMember', () => {
    const roles: TenantRole[] = ['owner', 'admin', 'member', 'viewer'];

    it('owner can remove admin, member, viewer but not owner', () => {
      expect(canRemoveMember('owner', 'admin')).toBe(true);
      expect(canRemoveMember('owner', 'member')).toBe(true);
      expect(canRemoveMember('owner', 'viewer')).toBe(true);
      expect(canRemoveMember('owner', 'owner')).toBe(false);
    });

    it('admin can remove member, viewer but not admin or owner', () => {
      expect(canRemoveMember('admin', 'member')).toBe(true);
      expect(canRemoveMember('admin', 'viewer')).toBe(true);
      expect(canRemoveMember('admin', 'admin')).toBe(false);
      expect(canRemoveMember('admin', 'owner')).toBe(false);
    });

    it('member cannot remove anyone', () => {
      for (const target of roles) {
        expect(canRemoveMember('member', target)).toBe(false);
      }
    });

    it('viewer cannot remove anyone', () => {
      for (const target of roles) {
        expect(canRemoveMember('viewer', target)).toBe(false);
      }
    });

    it('full matrix validation', () => {
      const expected: Record<TenantRole, Record<TenantRole, boolean>> = {
        owner: { owner: false, admin: true, member: true, viewer: true },
        admin: { owner: false, admin: false, member: true, viewer: true },
        member: { owner: false, admin: false, member: false, viewer: false },
        viewer: { owner: false, admin: false, member: false, viewer: false },
      };

      for (const actor of roles) {
        for (const target of roles) {
          expect(canRemoveMember(actor, target)).toBe(expected[actor][target]);
        }
      }
    });
  });

  // ==========================================================================
  // canChangeRole
  // ==========================================================================
  describe('canChangeRole', () => {
    it('owner can change admin to member or viewer', () => {
      expect(canChangeRole('owner', 'admin', 'member')).toBe(true);
      expect(canChangeRole('owner', 'admin', 'viewer')).toBe(true);
    });

    it('owner can change member to admin or viewer', () => {
      expect(canChangeRole('owner', 'member', 'admin')).toBe(true);
      expect(canChangeRole('owner', 'member', 'viewer')).toBe(true);
    });

    it('owner can change viewer to member or admin', () => {
      expect(canChangeRole('owner', 'viewer', 'member')).toBe(true);
      expect(canChangeRole('owner', 'viewer', 'admin')).toBe(true);
    });

    it('owner cannot change to/from owner role', () => {
      expect(canChangeRole('owner', 'owner', 'admin')).toBe(false);
      expect(canChangeRole('owner', 'admin', 'owner')).toBe(false);
      expect(canChangeRole('owner', 'owner', 'member')).toBe(false);
      expect(canChangeRole('owner', 'member', 'owner')).toBe(false);
    });

    it('admin can change member to viewer and vice versa', () => {
      expect(canChangeRole('admin', 'member', 'viewer')).toBe(true);
      expect(canChangeRole('admin', 'viewer', 'member')).toBe(true);
    });

    it('admin cannot change to/from admin or owner', () => {
      expect(canChangeRole('admin', 'admin', 'member')).toBe(false);
      expect(canChangeRole('admin', 'member', 'admin')).toBe(false);
      expect(canChangeRole('admin', 'owner', 'member')).toBe(false);
      expect(canChangeRole('admin', 'member', 'owner')).toBe(false);
    });

    it('member cannot change any role', () => {
      expect(canChangeRole('member', 'viewer', 'member')).toBe(false);
      expect(canChangeRole('member', 'admin', 'viewer')).toBe(false);
    });

    it('viewer cannot change any role', () => {
      expect(canChangeRole('viewer', 'member', 'viewer')).toBe(false);
      expect(canChangeRole('viewer', 'admin', 'member')).toBe(false);
    });

    it('rejects same-role no-op changes', () => {
      expect(canChangeRole('owner', 'admin', 'admin')).toBe(false);
      expect(canChangeRole('owner', 'member', 'member')).toBe(false);
      expect(canChangeRole('owner', 'viewer', 'viewer')).toBe(false);
      expect(canChangeRole('admin', 'member', 'member')).toBe(false);
      expect(canChangeRole('admin', 'viewer', 'viewer')).toBe(false);
    });
  });

  // ==========================================================================
  // isSoleOwner
  // ==========================================================================
  describe('isSoleOwner', () => {
    it('returns true when user is the only owner', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('admin', 'user-2'),
        createMembershipWithUser('member', 'user-3'),
      ];
      expect(isSoleOwner(memberships, 'user-1')).toBe(true);
    });

    it('returns false when there are multiple owners', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('owner', 'user-2'),
      ];
      expect(isSoleOwner(memberships, 'user-1')).toBe(false);
    });

    it('returns false when user is not an owner', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('member', 'user-2'),
      ];
      expect(isSoleOwner(memberships, 'user-2')).toBe(false);
    });

    it('returns false for empty memberships list', () => {
      expect(isSoleOwner([], 'user-1')).toBe(false);
    });
  });

  // ==========================================================================
  // canLeave
  // ==========================================================================
  describe('canLeave', () => {
    it('returns false when user is sole owner', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('member', 'user-2'),
      ];
      expect(canLeave(memberships, 'user-1')).toBe(false);
    });

    it('returns true when user is not an owner', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('member', 'user-2'),
      ];
      expect(canLeave(memberships, 'user-2')).toBe(true);
    });

    it('returns true when there are multiple owners', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('owner', 'user-2'),
      ];
      expect(canLeave(memberships, 'user-1')).toBe(true);
    });
  });

  // ==========================================================================
  // getNextOwnerCandidate
  // ==========================================================================
  describe('getNextOwnerCandidate', () => {
    it('returns the highest-role member as candidate', () => {
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        createMembershipWithUser('viewer', 'user-2'),
        createMembershipWithUser('admin', 'user-3'),
        createMembershipWithUser('member', 'user-4'),
      ];
      const candidate = getNextOwnerCandidate(memberships, 'user-1');
      expect(candidate?.userId).toBe('user-3');
    });

    it('returns earliest member when roles are equal', () => {
      const now = Date.now();
      const memberships: Membership[] = [
        createMembershipWithUser('owner', 'user-1'),
        {
          ...createMembershipWithUser('member', 'user-2'),
          createdAt: new Date(now + 1000).toISOString(),
        },
        {
          ...createMembershipWithUser('member', 'user-3'),
          createdAt: new Date(now).toISOString(),
        },
      ];
      const candidate = getNextOwnerCandidate(memberships, 'user-1');
      expect(candidate?.userId).toBe('user-3');
    });

    it('returns undefined when owner is the only member', () => {
      const memberships: Membership[] = [createMembershipWithUser('owner', 'user-1')];
      const candidate = getNextOwnerCandidate(memberships, 'user-1');
      expect(candidate).toBeUndefined();
    });

    it('returns undefined for empty memberships', () => {
      const candidate = getNextOwnerCandidate([], 'user-1');
      expect(candidate).toBeUndefined();
    });
  });
});
