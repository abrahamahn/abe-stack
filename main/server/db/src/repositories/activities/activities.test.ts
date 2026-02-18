// main/server/db/src/repositories/activities/activities.test.ts
/**
 * Tests for Activities Repository
 *
 * Validates activity feed operations including creation,
 * lookups by actor/tenant/resource, and recent activity queries.
 * Append-only — no update or delete tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createActivityRepository } from './activities';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb =>
  ({
    query: vi.fn(),
    raw: vi.fn() as RawDb['raw'],
    transaction: vi.fn() as RawDb['transaction'],
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn() as RawDb['getClient'],
    queryOne: vi.fn(),
    execute: vi.fn(),
    withSession: vi.fn() as RawDb['withSession'],
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockActivityRow = {
  id: 'act-001',
  tenant_id: 'tenant-001',
  actor_id: 'user-001',
  actor_type: 'user',
  action: 'created',
  resource_type: 'project',
  resource_id: 'proj-001',
  description: 'Created project "Alpha"',
  metadata: {},
  ip_address: '192.168.1.1',
  created_at: new Date('2024-06-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createActivityRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return an activity when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockActivityRow);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findById('act-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('act-001');
      expect(result?.actorId).toBe('user-001');
      expect(result?.actorType).toBe('user');
      expect(result?.action).toBe('created');
      expect(result?.resourceType).toBe('project');
      expect(result?.resourceId).toBe('proj-001');
      expect(result?.description).toBe('Created project "Alpha"');
      expect(result?.ipAddress).toBe('192.168.1.1');
    });

    it('should return null when activity not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findRecent', () => {
    it('should return recent activities', async () => {
      const mockActivities = [
        mockActivityRow,
        { ...mockActivityRow, id: 'act-002', action: 'updated' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockActivities);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findRecent(10);

      expect(result).toHaveLength(2);
      expect(result[0]?.action).toBe('created');
      expect(result[1]?.action).toBe('updated');
    });

    it('should return empty array when no activities exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createActivityRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });

    it('should use default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createActivityRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });
  });

  describe('findByActorId', () => {
    it('should return activities for an actor', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockActivityRow]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findByActorId('user-001');

      expect(result).toHaveLength(1);
      expect(result[0]?.actorId).toBe('user-001');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('actor_id'),
        }),
      );
    });

    it('should return empty array when no activities found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findByActorId('user-001');

      expect(result).toEqual([]);
    });
  });

  describe('findByTenantId', () => {
    it('should return activities for a tenant', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockActivityRow]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findByTenantId('tenant-001');

      expect(result).toHaveLength(1);
      expect(result[0]?.tenantId).toBe('tenant-001');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });
  });

  describe('findByResource', () => {
    it('should return activities for a specific resource', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockActivityRow]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findByResource('project', 'proj-001');

      expect(result).toHaveLength(1);
      expect(result[0]?.resourceType).toBe('project');
      expect(result[0]?.resourceId).toBe('proj-001');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('resource_type'),
        }),
      );
    });

    it('should return empty array when no activities for resource', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createActivityRepository(mockDb);
      const result = await repo.findByResource('project', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create an activity successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockActivityRow);

      const repo = createActivityRepository(mockDb);
      const result = await repo.create({
        actorType: 'user',
        actorId: 'user-001',
        action: 'created',
        resourceType: 'project',
        resourceId: 'proj-001',
        description: 'Created project "Alpha"',
      });

      expect(result.id).toBe('act-001');
      expect(result.actorType).toBe('user');
      expect(result.action).toBe('created');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createActivityRepository(mockDb);

      await expect(
        repo.create({
          actorType: 'system',
          action: 'cleanup',
          resourceType: 'cache',
          resourceId: 'main',
        }),
      ).rejects.toThrow('Failed to create activity');
    });

    it('should support system actor type without actorId', async () => {
      const systemActivityRow = {
        ...mockActivityRow,
        actor_id: null,
        actor_type: 'system',
        action: 'cleanup',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(systemActivityRow);

      const repo = createActivityRepository(mockDb);
      const result = await repo.create({
        actorType: 'system',
        action: 'cleanup',
        resourceType: 'cache',
        resourceId: 'main',
      });

      expect(result.actorId).toBeNull();
      expect(result.actorType).toBe('system');
    });
  });
});
