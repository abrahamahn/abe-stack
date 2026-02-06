// backend/db/src/repositories/system/audit-events.test.ts
/**
 * Tests for Audit Events Repository
 *
 * Validates audit event operations including event creation, ID lookups,
 * actor-based queries, tenant filtering, action filtering, and resource queries.
 * Tests append-only behavior (no update/delete operations).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAuditEventRepository } from './audit-events';

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

const mockAuditEvent = {
  id: 'ae-123',
  tenant_id: 'tenant-123',
  actor_id: 'usr-123',
  action: 'user.created',
  resource: 'user',
  resource_id: 'usr-456',
  metadata: { email: 'test@example.com' },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createAuditEventRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new audit event', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAuditEvent);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        actorId: 'usr-123',
        action: 'user.created',
        resource: 'user',
        resourceId: 'usr-456',
        metadata: { email: 'test@example.com' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.actorId).toBe('usr-123');
      expect(result.action).toBe('user.created');
      expect(result.resource).toBe('user');
      expect(result.resourceId).toBe('usr-456');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuditEventRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          actorId: 'usr-123',
          action: 'user.created',
          resource: 'user',
          resourceId: 'usr-456',
        }),
      ).rejects.toThrow('Failed to create audit event');
    });

    it('should handle optional metadata', async () => {
      const eventWithoutMetadata = {
        ...mockAuditEvent,
        metadata: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithoutMetadata);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        actorId: 'usr-123',
        action: 'user.login',
        resource: 'session',
        resourceId: 'sess-123',
      });

      expect(result.metadata).toBeNull();
    });

    it('should handle optional ip address and user agent', async () => {
      const eventWithoutNetwork = {
        ...mockAuditEvent,
        ip_address: null,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithoutNetwork);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        actorId: 'usr-123',
        action: 'user.created',
        resource: 'user',
        resourceId: 'usr-456',
      });

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    it('should create event with complex metadata', async () => {
      const complexMetadata = {
        before: { status: 'active' },
        after: { status: 'inactive' },
        reason: 'policy violation',
      };
      const eventWithComplexMetadata = {
        ...mockAuditEvent,
        metadata: complexMetadata,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithComplexMetadata);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        actorId: 'usr-123',
        action: 'user.updated',
        resource: 'user',
        resourceId: 'usr-456',
        metadata: complexMetadata,
      });

      expect(result.metadata).toEqual(complexMetadata);
    });
  });

  describe('findById', () => {
    it('should return event when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAuditEvent);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('ae-123');
      expect(result?.action).toBe('user.created');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-nonexistent');

      expect(result).toBeNull();
    });

    it('should include all event fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAuditEvent);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-123');

      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.actorId).toBe('usr-123');
      expect(result?.resource).toBe('user');
      expect(result?.resourceId).toBe('usr-456');
      expect(result?.metadata).toEqual({ email: 'test@example.com' });
    });
  });

  describe('findRecent', () => {
    it('should return array of recent events with default limit', async () => {
      const events = [
        mockAuditEvent,
        { ...mockAuditEvent, id: 'ae-456', action: 'user.updated' },
        { ...mockAuditEvent, id: 'ae-789', action: 'user.deleted' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toHaveLength(3);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*DESC/s),
        }),
      );
    });

    it('should return empty array when no events exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toEqual([]);
    });

    it('should respect custom limit', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        ...mockAuditEvent,
        id: `ae-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findRecent(50);

      expect(result).toHaveLength(50);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockAuditEvent]);

      const repo = createAuditEventRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });
  });

  describe('findByActorId', () => {
    it('should return array of events for actor', async () => {
      const events = [mockAuditEvent, { ...mockAuditEvent, id: 'ae-456', action: 'user.updated' }];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByActorId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].actorId).toBe('usr-123');
      expect(result[1].actorId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('actor_id'),
        }),
      );
    });

    it('should return empty array when actor has no events', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByActorId('usr-new');

      expect(result).toEqual([]);
    });

    it('should respect custom limit', async () => {
      const events = Array.from({ length: 25 }, (_, i) => ({
        ...mockAuditEvent,
        id: `ae-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByActorId('usr-123', 25);

      expect(result).toHaveLength(25);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockAuditEvent]);

      const repo = createAuditEventRepository(mockDb);
      await repo.findByActorId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });
  });

  describe('findByTenantId', () => {
    it('should return array of events for tenant', async () => {
      const events = [mockAuditEvent, { ...mockAuditEvent, id: 'ae-456', actor_id: 'usr-789' }];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
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

    it('should return empty array when tenant has no events', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should respect custom limit', async () => {
      const events = Array.from({ length: 75 }, (_, i) => ({
        ...mockAuditEvent,
        id: `ae-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123', 75);

      expect(result).toHaveLength(75);
    });

    it('should return events from different actors within tenant', async () => {
      const events = [
        mockAuditEvent,
        { ...mockAuditEvent, id: 'ae-456', actor_id: 'usr-789' },
        { ...mockAuditEvent, id: 'ae-999', actor_id: 'usr-999' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result.map((e) => e.actorId)).toEqual(['usr-123', 'usr-789', 'usr-999']);
    });
  });

  describe('findByAction', () => {
    it('should return array of events for action', async () => {
      const events = [mockAuditEvent, { ...mockAuditEvent, id: 'ae-456', actor_id: 'usr-789' }];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByAction('user.created');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('user.created');
      expect(result[1].action).toBe('user.created');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('action'),
        }),
      );
    });

    it('should return empty array when action has no events', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByAction('user.deleted');

      expect(result).toEqual([]);
    });

    it('should respect custom limit', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        ...mockAuditEvent,
        id: `ae-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByAction('user.created', 10);

      expect(result).toHaveLength(10);
    });

    it('should handle different action types', async () => {
      const actions = [
        'user.created',
        'user.updated',
        'user.deleted',
        'session.created',
        'payment.processed',
      ];

      for (const action of actions) {
        vi.mocked(mockDb.query).mockResolvedValue([{ ...mockAuditEvent, action }]);

        const repo = createAuditEventRepository(mockDb);
        const result = await repo.findByAction(action);

        expect(result[0].action).toBe(action);
      }
    });
  });

  describe('findByResource', () => {
    it('should return array of events for resource', async () => {
      const events = [mockAuditEvent, { ...mockAuditEvent, id: 'ae-456', action: 'user.updated' }];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByResource('user', 'usr-456');

      expect(result).toHaveLength(2);
      expect(result[0].resource).toBe('user');
      expect(result[0].resourceId).toBe('usr-456');
      expect(result[1].resource).toBe('user');
      expect(result[1].resourceId).toBe('usr-456');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('resource'),
        }),
      );
    });

    it('should return empty array when resource has no events', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByResource('user', 'usr-nonexistent');

      expect(result).toEqual([]);
    });

    it('should respect custom limit', async () => {
      const events = Array.from({ length: 30 }, (_, i) => ({
        ...mockAuditEvent,
        id: `ae-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByResource('user', 'usr-456', 30);

      expect(result).toHaveLength(30);
    });

    it('should handle different resource types', async () => {
      const resources = [
        { type: 'user', id: 'usr-123' },
        { type: 'session', id: 'sess-456' },
        { type: 'payment', id: 'pay-789' },
      ];

      for (const resource of resources) {
        vi.mocked(mockDb.query).mockResolvedValue([
          {
            ...mockAuditEvent,
            resource: resource.type,
            resource_id: resource.id,
          },
        ]);

        const repo = createAuditEventRepository(mockDb);
        const result = await repo.findByResource(resource.type, resource.id);

        expect(result[0].resource).toBe(resource.type);
        expect(result[0].resourceId).toBe(resource.id);
      }
    });

    it('should verify both resource and resourceId in query', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockAuditEvent]);

      const repo = createAuditEventRepository(mockDb);
      await repo.findByResource('user', 'usr-456');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/resource.*resource_id/s),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null tenant ID', async () => {
      const eventWithoutTenant = {
        ...mockAuditEvent,
        tenant_id: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithoutTenant);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-123');

      expect(result?.tenantId).toBeNull();
    });

    it('should handle events with large metadata objects', async () => {
      const largeMetadata = {
        request: { headers: { 'user-agent': 'Mozilla/5.0' }, body: { data: 'large payload' } },
        response: { status: 200, body: { result: 'success' } },
        trace: Array.from({ length: 100 }, (_, i) => `step-${i}`),
      };
      const eventWithLargeMetadata = {
        ...mockAuditEvent,
        metadata: largeMetadata,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithLargeMetadata);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-123');

      expect(result?.metadata).toEqual(largeMetadata);
    });

    it('should handle very long action strings', async () => {
      const longAction = 'module.submodule.subsubmodule.action.with.many.parts';
      const eventWithLongAction = {
        ...mockAuditEvent,
        action: longAction,
      };
      vi.mocked(mockDb.query).mockResolvedValue([eventWithLongAction]);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findByAction(longAction);

      expect(result[0].action).toBe(longAction);
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const eventWithIpv6 = {
        ...mockAuditEvent,
        ip_address: ipv6Address,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eventWithIpv6);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findById('ae-123');

      expect(result?.ipAddress).toBe(ipv6Address);
    });

    it('should handle concurrent events with same timestamp', async () => {
      const timestamp = new Date('2024-01-01T12:00:00.000Z');
      const events = [
        { ...mockAuditEvent, id: 'ae-1', created_at: timestamp },
        { ...mockAuditEvent, id: 'ae-2', created_at: timestamp },
        { ...mockAuditEvent, id: 'ae-3', created_at: timestamp },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createAuditEventRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toHaveLength(3);
      expect(result.every((e) => e.createdAt.getTime() === timestamp.getTime())).toBe(true);
    });
  });

  describe('append-only behavior', () => {
    it('should not have update method', () => {
      const repo = createAuditEventRepository(mockDb);

      expect('update' in repo).toBe(false);
    });

    it('should not have delete method', () => {
      const repo = createAuditEventRepository(mockDb);

      expect('delete' in repo).toBe(false);
    });

    it('should only support create and read operations', () => {
      const repo = createAuditEventRepository(mockDb);
      const methods = Object.keys(repo);

      expect(methods).toContain('create');
      expect(methods).toContain('findById');
      expect(methods).toContain('findRecent');
      expect(methods).toContain('findByActorId');
      expect(methods).toContain('findByTenantId');
      expect(methods).toContain('findByAction');
      expect(methods).toContain('findByResource');
      expect(methods).not.toContain('update');
      expect(methods).not.toContain('delete');
    });
  });
});
