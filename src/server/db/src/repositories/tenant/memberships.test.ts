// backend/db/src/repositories/tenant/memberships.test.ts
/**
 * Tests for Memberships Repository
 *
 * Validates user membership operations including creation, tenant-user lookups,
 * role management, and membership removal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMembershipRepository } from './memberships';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockMembership = {
  id: 'mem-123',
  tenant_id: 'tenant-123',
  user_id: 'usr-123',
  role: 'member',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createMembershipRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new membership', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        userId: 'usr-123',
        role: 'member',
      });

      expect(result.id).toBe('mem-123');
      expect(result.tenantId).toBe('tenant-123');
      expect(result.userId).toBe('usr-123');
      expect(result.role).toBe('member');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMembershipRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          userId: 'usr-123',
          role: 'member',
        }),
      ).rejects.toThrow('Failed to create membership');
    });

    it('should handle admin role', async () => {
      const adminMembership = {
        ...mockMembership,
        role: 'admin',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(adminMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        userId: 'usr-123',
        role: 'admin',
      });

      expect(result.role).toBe('admin');
    });

    it('should handle owner role', async () => {
      const ownerMembership = {
        ...mockMembership,
        role: 'owner',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(ownerMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        userId: 'usr-123',
        role: 'owner',
      });

      expect(result.role).toBe('owner');
    });

    it('should generate SQL with memberships table', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      await repo.create({
        tenantId: 'tenant-123',
        userId: 'usr-123',
        role: 'member',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*memberships/s),
        }),
      );
    });
  });

  describe('findByTenantAndUser', () => {
    it('should return membership when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantAndUser('tenant-123', 'usr-123');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantAndUser('tenant-999', 'usr-999');

      expect(result).toBeNull();
    });

    it('should use AND condition for tenant and user', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      await repo.findByTenantAndUser('tenant-123', 'usr-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*tenant_id.*user_id/s),
        }),
      );
    });

    it('should pass both tenant and user IDs as parameters', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      await repo.findByTenantAndUser('tenant-123', 'usr-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['tenant-123', 'usr-123']),
        }),
      );
    });

    it('should handle different role types', async () => {
      const roles = ['owner', 'admin', 'member', 'viewer'];

      for (const role of roles) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockMembership,
          role,
        });

        const repo = createMembershipRepository(mockDb);
        const result = await repo.findByTenantAndUser('tenant-123', 'usr-123');

        expect(result?.role).toBe(role);
      }
    });
  });

  describe('findByTenantId', () => {
    it('should return array of memberships for tenant', async () => {
      const memberships = [
        mockMembership,
        { ...mockMembership, id: 'mem-456', user_id: 'usr-456', role: 'admin' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(memberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-123');
      expect(result[1].tenantId).toBe('tenant-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return empty array when tenant has no members', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should order results by created_at asc', async () => {
      const memberships = [
        { ...mockMembership, id: 'mem-123', created_at: new Date('2024-01-01') },
        { ...mockMembership, id: 'mem-456', created_at: new Date('2024-01-02') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(memberships);

      const repo = createMembershipRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*asc/is),
        }),
      );
    });

    it('should handle tenant with multiple member roles', async () => {
      const multiRoleMemberships = [
        { ...mockMembership, id: 'mem-1', role: 'owner' },
        { ...mockMembership, id: 'mem-2', role: 'admin' },
        { ...mockMembership, id: 'mem-3', role: 'member' },
        { ...mockMembership, id: 'mem-4', role: 'viewer' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multiRoleMemberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(4);
      expect(result.map((m) => m.role)).toEqual(['owner', 'admin', 'member', 'viewer']);
    });

    it('should handle single member tenant', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockMembership]);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mem-123');
    });
  });

  describe('findByUserId', () => {
    it('should return array of memberships for user', async () => {
      const memberships = [
        mockMembership,
        { ...mockMembership, id: 'mem-456', tenant_id: 'tenant-456' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(memberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[1].userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no memberships', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should order results by created_at asc', async () => {
      const memberships = [
        { ...mockMembership, id: 'mem-123', created_at: new Date('2024-01-01') },
        { ...mockMembership, id: 'mem-456', created_at: new Date('2024-01-02') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(memberships);

      const repo = createMembershipRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*asc/is),
        }),
      );
    });

    it('should handle user with memberships in multiple tenants', async () => {
      const multiTenantMemberships = Array.from({ length: 5 }, (_, i) => ({
        ...mockMembership,
        id: `mem-${i}`,
        tenant_id: `tenant-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(multiTenantMemberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(5);
      expect(result.every((m) => m.userId === 'usr-123')).toBe(true);
    });

    it('should handle user with different roles across tenants', async () => {
      const mixedRoleMemberships = [
        { ...mockMembership, tenant_id: 'tenant-1', role: 'owner' },
        { ...mockMembership, tenant_id: 'tenant-2', role: 'admin' },
        { ...mockMembership, tenant_id: 'tenant-3', role: 'member' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mixedRoleMemberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result.map((m) => m.role)).toEqual(['owner', 'admin', 'member']);
    });
  });

  describe('update', () => {
    it('should update membership and return updated record', async () => {
      const updatedMembership = {
        ...mockMembership,
        role: 'admin',
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.update('mem-123', { role: 'admin' });

      expect(result).toBeDefined();
      expect(result?.role).toBe('admin');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when membership not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.update('nonexistent', { role: 'admin' });

      expect(result).toBeNull();
    });

    it('should handle role promotion', async () => {
      const promotedMembership = {
        ...mockMembership,
        role: 'admin',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(promotedMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.update('mem-123', { role: 'admin' });

      expect(result?.role).toBe('admin');
    });

    it('should handle role demotion', async () => {
      const demotedMembership = {
        ...mockMembership,
        role: 'viewer',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(demotedMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.update('mem-123', { role: 'viewer' });

      expect(result?.role).toBe('viewer');
    });

    it('should generate UPDATE SQL with WHERE clause', async () => {
      const updatedMembership = { ...mockMembership, role: 'admin' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMembership);

      const repo = createMembershipRepository(mockDb);
      await repo.update('mem-123', { role: 'admin' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*memberships.*WHERE/s),
        }),
      );
    });

    it('should include RETURNING clause', async () => {
      const updatedMembership = { ...mockMembership, role: 'admin' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMembership);

      const repo = createMembershipRepository(mockDb);
      await repo.update('mem-123', { role: 'admin' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/RETURNING/i),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete membership and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.delete('mem-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when membership not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createMembershipRepository(mockDb);
      await repo.delete('mem-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*memberships/s),
        }),
      );
    });

    it('should only delete exact ID match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createMembershipRepository(mockDb);
      await repo.delete('mem-specific');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['mem-specific']),
        }),
      );
    });

    it('should include WHERE clause in delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createMembershipRepository(mockDb);
      await repo.delete('mem-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*WHERE/s),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should transform snake_case to camelCase correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMembership);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantAndUser('tenant-123', 'usr-123');

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('tenant_id');
      expect(result).not.toHaveProperty('user_id');
    });

    it('should handle timestamp fields', async () => {
      const now = new Date('2024-06-15T10:30:00Z');
      const membershipWithTimestamps = {
        ...mockMembership,
        created_at: now,
        updated_at: now,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(membershipWithTimestamps);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantAndUser('tenant-123', 'usr-123');

      expect(result?.createdAt).toEqual(now);
      expect(result?.updatedAt).toEqual(now);
    });

    it('should handle concurrent memberships', async () => {
      const concurrentMemberships = Array.from({ length: 10 }, (_, i) => ({
        ...mockMembership,
        id: `mem-${i}`,
        user_id: `usr-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(concurrentMemberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(10);
    });

    it('should preserve role case sensitivity', async () => {
      const roles = ['owner', 'admin', 'member', 'viewer'];

      for (const role of roles) {
        const membership = { ...mockMembership, role };
        vi.mocked(mockDb.queryOne).mockResolvedValue(membership);

        const repo = createMembershipRepository(mockDb);
        const result = await repo.findByTenantAndUser('tenant-123', 'usr-123');

        expect(result?.role).toBe(role);
        expect(result?.role).not.toBe(role.toUpperCase());
      }
    });

    it('should handle unique constraint violations gracefully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMembershipRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          userId: 'usr-123',
          role: 'member',
        }),
      ).rejects.toThrow('Failed to create membership');
    });

    it('should handle large result sets for popular tenants', async () => {
      const largeMembershipSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockMembership,
        id: `mem-${i}`,
        user_id: `usr-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(largeMembershipSet);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByTenantId('tenant-popular');

      expect(result).toHaveLength(100);
    });

    it('should handle user belonging to many tenants', async () => {
      const manyTenantMemberships = Array.from({ length: 50 }, (_, i) => ({
        ...mockMembership,
        id: `mem-${i}`,
        tenant_id: `tenant-${i}`,
        user_id: 'usr-power-user',
      }));
      vi.mocked(mockDb.query).mockResolvedValue(manyTenantMemberships);

      const repo = createMembershipRepository(mockDb);
      const result = await repo.findByUserId('usr-power-user');

      expect(result).toHaveLength(50);
      expect(result.every((m) => m.userId === 'usr-power-user')).toBe(true);
    });
  });
});
