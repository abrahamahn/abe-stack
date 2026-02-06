// packages/shared/src/core/policy.test.ts
import { describe, expect, it } from 'vitest';

import { can, hasPermission } from './policy';

import type { AuthContext, PolicyAction, PolicyResource } from './policy';

describe('policy', () => {
  // ==========================================================================
  // Admin Bypass
  // ==========================================================================
  describe('admin bypass', () => {
    const adminCtx: AuthContext = { appRole: 'admin' };

    it('admin can perform any action on any resource', () => {
      const resources: PolicyResource[] = [
        'tenant',
        'membership',
        'billing',
        'audit-log',
        'settings',
        'data',
      ];
      const actions: PolicyAction[] = ['read', 'write', 'delete', 'manage', 'invite'];

      for (const resource of resources) {
        for (const action of actions) {
          expect(can(adminCtx, action, resource)).toBe(true);
        }
      }
    });
  });

  // ==========================================================================
  // Tenant Resource
  // ==========================================================================
  describe('tenant resource', () => {
    it('owner can write and manage tenant', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'owner' };
      expect(can(ctx, 'write', 'tenant')).toBe(true);
      expect(can(ctx, 'manage', 'tenant')).toBe(true);
    });

    it('admin can write and manage tenant', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'admin' };
      expect(can(ctx, 'write', 'tenant')).toBe(true);
      expect(can(ctx, 'manage', 'tenant')).toBe(true);
    });

    it('member can read but not write tenant', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(can(ctx, 'read', 'tenant')).toBe(true);
      expect(can(ctx, 'write', 'tenant')).toBe(false);
      expect(can(ctx, 'manage', 'tenant')).toBe(false);
    });

    it('user without tenant role cannot read tenant', () => {
      const ctx: AuthContext = { appRole: 'user' };
      expect(can(ctx, 'read', 'tenant')).toBe(false);
    });
  });

  // ==========================================================================
  // Billing Resource
  // ==========================================================================
  describe('billing resource', () => {
    it('owner can manage and write billing', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'owner' };
      expect(can(ctx, 'manage', 'billing')).toBe(true);
      expect(can(ctx, 'write', 'billing')).toBe(true);
    });

    it('admin can read billing but cannot manage', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'admin' };
      expect(can(ctx, 'read', 'billing')).toBe(true);
      expect(can(ctx, 'manage', 'billing')).toBe(false);
      expect(can(ctx, 'write', 'billing')).toBe(false);
    });

    it('member cannot access billing', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(can(ctx, 'read', 'billing')).toBe(false);
      expect(can(ctx, 'manage', 'billing')).toBe(false);
    });
  });

  // ==========================================================================
  // Membership Resource
  // ==========================================================================
  describe('membership resource', () => {
    it('owner can invite and manage members', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'owner' };
      expect(can(ctx, 'invite', 'membership')).toBe(true);
      expect(can(ctx, 'manage', 'membership')).toBe(true);
      expect(can(ctx, 'write', 'membership')).toBe(true);
    });

    it('admin can invite and manage members', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'admin' };
      expect(can(ctx, 'invite', 'membership')).toBe(true);
      expect(can(ctx, 'manage', 'membership')).toBe(true);
    });

    it('member can read but not invite', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(can(ctx, 'read', 'membership')).toBe(true);
      expect(can(ctx, 'invite', 'membership')).toBe(false);
      expect(can(ctx, 'manage', 'membership')).toBe(false);
    });
  });

  // ==========================================================================
  // Audit Log Resource
  // ==========================================================================
  describe('audit-log resource', () => {
    it('owner and admin can read audit logs', () => {
      expect(can({ appRole: 'user', tenantRole: 'owner' }, 'read', 'audit-log')).toBe(true);
      expect(can({ appRole: 'user', tenantRole: 'admin' }, 'read', 'audit-log')).toBe(true);
    });

    it('member cannot read audit logs', () => {
      expect(can({ appRole: 'user', tenantRole: 'member' }, 'read', 'audit-log')).toBe(false);
    });

    it('viewer cannot read audit logs', () => {
      expect(can({ appRole: 'user', tenantRole: 'viewer' }, 'read', 'audit-log')).toBe(false);
    });
  });

  // ==========================================================================
  // Data Resource
  // ==========================================================================
  describe('data resource', () => {
    it('resource owner can always write and delete their data', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member', isOwner: true };
      expect(can(ctx, 'write', 'data')).toBe(true);
      expect(can(ctx, 'delete', 'data')).toBe(true);
    });

    it('tenant admin can write and delete any data', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'admin' };
      expect(can(ctx, 'write', 'data')).toBe(true);
      expect(can(ctx, 'delete', 'data')).toBe(true);
    });

    it('member can read but not write or delete other data', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(can(ctx, 'read', 'data')).toBe(true);
      expect(can(ctx, 'write', 'data')).toBe(false);
      expect(can(ctx, 'delete', 'data')).toBe(false);
    });

    it('user without tenant role cannot access data', () => {
      const ctx: AuthContext = { appRole: 'user' };
      expect(can(ctx, 'read', 'data')).toBe(false);
    });
  });

  // ==========================================================================
  // Settings Resource
  // ==========================================================================
  describe('settings resource', () => {
    it('owner can manage settings', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'owner' };
      expect(can(ctx, 'write', 'settings')).toBe(true);
      expect(can(ctx, 'manage', 'settings')).toBe(true);
    });

    it('member can read but not write settings', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(can(ctx, 'read', 'settings')).toBe(true);
      expect(can(ctx, 'write', 'settings')).toBe(false);
    });
  });

  // ==========================================================================
  // hasPermission
  // ==========================================================================
  describe('hasPermission', () => {
    it('parses permission string and delegates to can()', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'owner' };
      expect(hasPermission(ctx, 'billing:manage')).toBe(true);
      expect(hasPermission(ctx, 'billing:read')).toBe(true);
    });

    it('denies permissions for unauthorized context', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(hasPermission(ctx, 'billing:manage')).toBe(false);
      expect(hasPermission(ctx, 'membership:invite')).toBe(false);
    });

    it('grants read permissions for members', () => {
      const ctx: AuthContext = { appRole: 'user', tenantRole: 'member' };
      expect(hasPermission(ctx, 'membership:read')).toBe(true);
      expect(hasPermission(ctx, 'data:read')).toBe(true);
    });
  });
});
