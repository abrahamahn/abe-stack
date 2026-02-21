// main/server/core/src/realtime/permission.middleware.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPermissionMiddleware } from './permission.middleware';

import type { MembershipListRepository, PermissionMiddleware } from './permission.middleware';
import type { Membership } from '@bslt/shared';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockMembershipListRepo(): MembershipListRepository {
  return {
    findByUserId: vi.fn(),
  };
}

function createMockMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'mem-1' as Membership['id'],
    tenantId: 'tenant-1' as Membership['tenantId'],
    userId: 'user-1' as Membership['userId'],
    role: 'member',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('createPermissionMiddleware', () => {
  let repo: MembershipListRepository;
  let middleware: PermissionMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    repo = createMockMembershipListRepo();
    middleware = createPermissionMiddleware({
      membershipRepo: repo,
      cacheTtlMs: 60_000, // 1 minute for testing
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // loadPermissions
  // ==========================================================================

  describe('loadPermissions', () => {
    it('should load and cache user memberships', async () => {
      const memberships = [
        createMockMembership({ tenantId: 'tenant-1' as Membership['tenantId'], role: 'admin' }),
        createMockMembership({ tenantId: 'tenant-2' as Membership['tenantId'], role: 'member' }),
      ];
      vi.mocked(repo.findByUserId).mockResolvedValue(memberships);

      const permissions = await middleware.loadPermissions('conn-1', 'user-1');

      expect(permissions.userId).toBe('user-1');
      expect(permissions.memberships.size).toBe(2);
      expect(permissions.memberships.get('tenant-1')?.role).toBe('admin');
      expect(permissions.memberships.get('tenant-2')?.role).toBe('member');
    });

    it('should call the repo with the correct userId', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);

      await middleware.loadPermissions('conn-1', 'user-42');

      expect(repo.findByUserId).toHaveBeenCalledWith('user-42');
    });

    it('should set loadedAt to current time', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);
      vi.setSystemTime(new Date('2026-02-20T10:00:00Z'));

      const permissions = await middleware.loadPermissions('conn-1', 'user-1');

      expect(permissions.loadedAt).toBe(new Date('2026-02-20T10:00:00Z').getTime());
    });

    it('should handle user with no memberships', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);

      const permissions = await middleware.loadPermissions('conn-1', 'user-1');

      expect(permissions.memberships.size).toBe(0);
    });

    it('should overwrite previous permissions for same connection', async () => {
      vi.mocked(repo.findByUserId)
        .mockResolvedValueOnce([createMockMembership({ role: 'viewer' })])
        .mockResolvedValueOnce([createMockMembership({ role: 'admin' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      await middleware.loadPermissions('conn-1', 'user-1');

      const permissions = middleware.getConnectionPermissions('conn-1');
      expect(permissions?.memberships.get('tenant-1')?.role).toBe('admin');
    });
  });

  // ==========================================================================
  // getConnectionPermissions
  // ==========================================================================

  describe('getConnectionPermissions', () => {
    it('should return cached permissions for a known connection', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'owner' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      const permissions = middleware.getConnectionPermissions('conn-1');

      expect(permissions).not.toBeNull();
      expect(permissions?.userId).toBe('user-1');
    });

    it('should return null for unknown connection', () => {
      const permissions = middleware.getConnectionPermissions('unknown-conn');

      expect(permissions).toBeNull();
    });

    it('should return null when cache has expired', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      // Advance time past the cache TTL
      vi.advanceTimersByTime(61_000);

      const permissions = middleware.getConnectionPermissions('conn-1');

      expect(permissions).toBeNull();
    });

    it('should return permissions before cache expires', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      // Advance time but stay within cache TTL
      vi.advanceTimersByTime(30_000);

      const permissions = middleware.getConnectionPermissions('conn-1');

      expect(permissions).not.toBeNull();
    });
  });

  // ==========================================================================
  // hasRole
  // ==========================================================================

  describe('hasRole', () => {
    it('should return true when user has the exact required role', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'admin' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      expect(middleware.hasRole('conn-1', 'tenant-1', 'admin')).toBe(true);
    });

    it('should return true when user has a higher role than required', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'owner' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      expect(middleware.hasRole('conn-1', 'tenant-1', 'member')).toBe(true);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'admin')).toBe(true);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'viewer')).toBe(true);
    });

    it('should return false when user has a lower role than required', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'viewer' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      expect(middleware.hasRole('conn-1', 'tenant-1', 'member')).toBe(false);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'admin')).toBe(false);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'owner')).toBe(false);
    });

    it('should return false when user is not in the specified tenant', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([
        createMockMembership({ tenantId: 'tenant-1' as Membership['tenantId'], role: 'admin' }),
      ]);

      await middleware.loadPermissions('conn-1', 'user-1');

      expect(middleware.hasRole('conn-1', 'tenant-2', 'viewer')).toBe(false);
    });

    it('should return false for unknown connection', () => {
      expect(middleware.hasRole('unknown-conn', 'tenant-1', 'viewer')).toBe(false);
    });

    it('should return false when permissions have expired', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'admin' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      vi.advanceTimersByTime(61_000);

      expect(middleware.hasRole('conn-1', 'tenant-1', 'viewer')).toBe(false);
    });

    it('should support role hierarchy for member role', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      expect(middleware.hasRole('conn-1', 'tenant-1', 'viewer')).toBe(true);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'member')).toBe(true);
      expect(middleware.hasRole('conn-1', 'tenant-1', 'admin')).toBe(false);
    });
  });

  // ==========================================================================
  // refreshPermissions
  // ==========================================================================

  describe('refreshPermissions', () => {
    it('should reload permissions from the repository', async () => {
      vi.mocked(repo.findByUserId)
        .mockResolvedValueOnce([createMockMembership({ role: 'viewer' })])
        .mockResolvedValueOnce([createMockMembership({ role: 'admin' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      const refreshed = await middleware.refreshPermissions('conn-1');

      expect(refreshed?.memberships.get('tenant-1')?.role).toBe('admin');
      expect(repo.findByUserId).toHaveBeenCalledTimes(2);
    });

    it('should return null for unknown connection', async () => {
      const result = await middleware.refreshPermissions('unknown-conn');

      expect(result).toBeNull();
    });

    it('should reset the loadedAt timestamp', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      vi.setSystemTime(new Date('2026-02-20T10:00:00Z'));
      await middleware.loadPermissions('conn-1', 'user-1');

      vi.setSystemTime(new Date('2026-02-20T11:00:00Z'));
      const refreshed = await middleware.refreshPermissions('conn-1');

      expect(refreshed?.loadedAt).toBe(new Date('2026-02-20T11:00:00Z').getTime());
    });

    it('should make permissions available again after expiry', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');

      // Expire the cache
      vi.advanceTimersByTime(61_000);
      expect(middleware.getConnectionPermissions('conn-1')).toBeNull();

      // Refresh should restore access
      await middleware.refreshPermissions('conn-1');
      expect(middleware.getConnectionPermissions('conn-1')).not.toBeNull();
    });
  });

  // ==========================================================================
  // removeConnection
  // ==========================================================================

  describe('removeConnection', () => {
    it('should remove cached permissions', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      middleware.removeConnection('conn-1');

      expect(middleware.getConnectionPermissions('conn-1')).toBeNull();
    });

    it('should not throw when removing unknown connection', () => {
      expect(() => {
        middleware.removeConnection('unknown-conn');
      }).not.toThrow();
    });

    it('should prevent refresh after removal', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await middleware.loadPermissions('conn-1', 'user-1');
      middleware.removeConnection('conn-1');

      const result = await middleware.refreshPermissions('conn-1');
      expect(result).toBeNull();
    });

    it('should decrement the active connection count', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);

      await middleware.loadPermissions('conn-1', 'user-1');
      await middleware.loadPermissions('conn-2', 'user-2');
      expect(middleware.getActiveConnectionCount()).toBe(2);

      middleware.removeConnection('conn-1');
      expect(middleware.getActiveConnectionCount()).toBe(1);
    });
  });

  // ==========================================================================
  // getActiveConnectionCount
  // ==========================================================================

  describe('getActiveConnectionCount', () => {
    it('should return 0 with no connections', () => {
      expect(middleware.getActiveConnectionCount()).toBe(0);
    });

    it('should track multiple connections', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);

      await middleware.loadPermissions('conn-1', 'user-1');
      await middleware.loadPermissions('conn-2', 'user-2');
      await middleware.loadPermissions('conn-3', 'user-3');

      expect(middleware.getActiveConnectionCount()).toBe(3);
    });

    it('should count unique connections only', async () => {
      vi.mocked(repo.findByUserId).mockResolvedValue([]);

      await middleware.loadPermissions('conn-1', 'user-1');
      await middleware.loadPermissions('conn-1', 'user-1'); // Same connection

      expect(middleware.getActiveConnectionCount()).toBe(1);
    });
  });

  // ==========================================================================
  // Cache TTL
  // ==========================================================================

  describe('cache TTL', () => {
    it('should use default TTL of 5 minutes when not specified', async () => {
      const defaultMiddleware = createPermissionMiddleware({
        membershipRepo: repo,
      });
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await defaultMiddleware.loadPermissions('conn-1', 'user-1');

      // Should still be valid at 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(defaultMiddleware.getConnectionPermissions('conn-1')).not.toBeNull();

      // Should be expired at 6 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(defaultMiddleware.getConnectionPermissions('conn-1')).toBeNull();
    });

    it('should respect custom TTL', async () => {
      const shortTtlMiddleware = createPermissionMiddleware({
        membershipRepo: repo,
        cacheTtlMs: 5000,
      });
      vi.mocked(repo.findByUserId).mockResolvedValue([createMockMembership({ role: 'member' })]);

      await shortTtlMiddleware.loadPermissions('conn-1', 'user-1');

      vi.advanceTimersByTime(3000);
      expect(shortTtlMiddleware.getConnectionPermissions('conn-1')).not.toBeNull();

      vi.advanceTimersByTime(3000);
      expect(shortTtlMiddleware.getConnectionPermissions('conn-1')).toBeNull();
    });
  });
});
