// backend/db/src/repositories/features/tenant-feature-overrides.test.ts
/**
 * Tests for Tenant Feature Overrides Repository
 *
 * Validates tenant-specific feature flag override operations including creation,
 * lookups by tenant and key, finding by tenant, updates, upserts, and deletions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTenantFeatureOverrideRepository } from './tenant-feature-overrides';

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

const mockTenantOverride = {
  tenant_id: 'tenant-123',
  key: 'billing.seat_based',
  is_enabled: true,
  value: JSON.stringify({ maxSeats: 50 }),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTenantFeatureOverrideRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new tenant override', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
        value: { maxSeats: 50 },
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.key).toBe('billing.seat_based');
      expect(result.isEnabled).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantFeatureOverrideRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          key: 'test.flag',
          isEnabled: false,
        }),
      ).rejects.toThrow('Failed to create tenant feature override');
    });

    it('should handle optional value field', async () => {
      const overrideWithoutValue = {
        ...mockTenantOverride,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithoutValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
      });

      expect(result.value).toBeNull();
    });

    it('should handle complex JSON value', async () => {
      const complexValue = {
        settings: {
          maxSeats: 50,
          allowOverage: false,
          customLimits: [10, 20, 30],
        },
      };
      const overrideWithComplexValue = {
        ...mockTenantOverride,
        value: JSON.stringify(complexValue),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithComplexValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
        value: complexValue,
      });

      expect(result.value).toEqual(JSON.stringify(complexValue));
    });

    it('should allow disabled overrides', async () => {
      const disabledOverride = {
        ...mockTenantOverride,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(disabledOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: false,
      });

      expect(result.isEnabled).toBe(false);
    });

    it('should handle different tenant IDs', async () => {
      const tenantIds = ['tenant-123', 'org-456', 'company-789'];

      for (const tenantId of tenantIds) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockTenantOverride,
          tenant_id: tenantId,
        });

        const repo = createTenantFeatureOverrideRepository(mockDb);
        const result = await repo.create({
          tenantId,
          key: 'billing.seat_based',
          isEnabled: true,
        });

        expect(result.tenantId).toBe(tenantId);
      }
    });
  });

  describe('findByTenantAndKey', () => {
    it('should return override when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'billing.seat_based');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.key).toBe('billing.seat_based');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-999', 'nonexistent.flag');

      expect(result).toBeNull();
    });

    it('should handle exact composite key matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const tenantId = 'tenant-123';
      const key = 'billing.seat_based';
      await repo.findByTenantAndKey(tenantId, key);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([tenantId, key]),
        }),
      );
    });

    it('should return disabled overrides', async () => {
      const disabledOverride = {
        ...mockTenantOverride,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(disabledOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'billing.seat_based');

      expect(result?.isEnabled).toBe(false);
    });

    it('should return overrides with null value', async () => {
      const overrideWithNullValue = {
        ...mockTenantOverride,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithNullValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'billing.seat_based');

      expect(result?.value).toBeNull();
    });
  });

  describe('findByTenantId', () => {
    it('should return array of overrides for tenant', async () => {
      const overrides = [
        mockTenantOverride,
        {
          ...mockTenantOverride,
          key: 'auth.two_factor',
          is_enabled: false,
        },
        {
          ...mockTenantOverride,
          key: 'search.elasticsearch',
          is_enabled: true,
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(overrides);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('billing.seat_based');
      expect(result[1].key).toBe('auth.two_factor');
      expect(result[2].key).toBe('search.elasticsearch');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return empty array when tenant has no overrides', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should return both enabled and disabled overrides', async () => {
      const overrides = [
        mockTenantOverride,
        { ...mockTenantOverride, key: 'flag.disabled', is_enabled: false },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(overrides);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(2);
      expect(result.some((o) => o.isEnabled)).toBe(true);
      expect(result.some((o) => !o.isEnabled)).toBe(true);
    });

    it('should order results by key ascending', async () => {
      const overrides = [
        { ...mockTenantOverride, key: 'zebra.flag' },
        { ...mockTenantOverride, key: 'alpha.flag' },
        { ...mockTenantOverride, key: 'beta.flag' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(overrides);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*key.*ASC/i),
        }),
      );
    });

    it('should handle tenants with many overrides', async () => {
      const manyOverrides = Array.from({ length: 50 }, (_, i) => ({
        ...mockTenantOverride,
        key: `feature.flag.${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(manyOverrides);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(50);
    });
  });

  describe('update', () => {
    it('should update override and return updated record', async () => {
      const updatedOverride = {
        ...mockTenantOverride,
        is_enabled: false,
        value: JSON.stringify({ maxSeats: 100 }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-123', 'billing.seat_based', {
        isEnabled: false,
        value: { maxSeats: 100 },
      });

      expect(result).toBeDefined();
      expect(result?.isEnabled).toBe(false);
      expect(result?.value).toEqual(JSON.stringify({ maxSeats: 100 }));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when override not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-999', 'nonexistent.flag', {
        isEnabled: false,
      });

      expect(result).toBeNull();
    });

    it('should update only isEnabled field', async () => {
      const updatedOverride = {
        ...mockTenantOverride,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-123', 'billing.seat_based', {
        isEnabled: false,
      });

      expect(result?.isEnabled).toBe(false);
      expect(result?.value).toEqual(JSON.stringify({ maxSeats: 50 }));
    });

    it('should update only value field', async () => {
      const newValue = { maxSeats: 200 };
      const updatedOverride = {
        ...mockTenantOverride,
        value: JSON.stringify(newValue),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-123', 'billing.seat_based', {
        value: newValue,
      });

      expect(result?.value).toEqual(JSON.stringify(newValue));
      expect(result?.isEnabled).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updatedOverride = {
        ...mockTenantOverride,
        is_enabled: false,
        value: JSON.stringify({ updated: true }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-123', 'billing.seat_based', {
        isEnabled: false,
        value: { updated: true },
      });

      expect(result?.isEnabled).toBe(false);
      expect(result?.value).toEqual(JSON.stringify({ updated: true }));
    });

    it('should use composite key in WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const tenantId = 'tenant-123';
      const key = 'billing.seat_based';
      await repo.update(tenantId, key, { isEnabled: false });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([tenantId, key]),
        }),
      );
    });
  });

  describe('upsert', () => {
    it('should insert new override when not exists', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
        value: { maxSeats: 50 },
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.key).toBe('billing.seat_based');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should update existing override when conflict', async () => {
      const updatedOverride = {
        ...mockTenantOverride,
        is_enabled: false,
        value: JSON.stringify({ maxSeats: 100 }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: false,
        value: { maxSeats: 100 },
      });

      expect(result.isEnabled).toBe(false);
      expect(result.value).toEqual(JSON.stringify({ maxSeats: 100 }));
    });

    it('should throw error if upsert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantFeatureOverrideRepository(mockDb);

      await expect(
        repo.upsert({
          tenantId: 'tenant-123',
          key: 'test.flag',
          isEnabled: true,
        }),
      ).rejects.toThrow('Failed to upsert tenant feature override');
    });

    it('should use onConflictDoUpdate with composite key', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenantOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
        value: { maxSeats: 50 },
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ON CONFLICT.*DO UPDATE/s),
        }),
      );
    });

    it('should handle upsert with null value', async () => {
      const overrideWithNullValue = {
        ...mockTenantOverride,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithNullValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
      });

      expect(result.value).toBeNull();
    });

    it('should handle upsert flipping isEnabled', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce({ ...mockTenantOverride, is_enabled: true })
        .mockResolvedValueOnce({ ...mockTenantOverride, is_enabled: false });

      const repo = createTenantFeatureOverrideRepository(mockDb);

      const result1 = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
      });
      expect(result1.isEnabled).toBe(true);

      const result2 = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: false,
      });
      expect(result2.isEnabled).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete override and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.delete('tenant-123', 'billing.seat_based');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when override not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.delete('tenant-999', 'nonexistent.flag');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      await repo.delete('tenant-123', 'billing.seat_based');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*tenant_feature_overrides/s),
        }),
      );
    });

    it('should use composite key in WHERE clause', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const tenantId = 'tenant-123';
      const key = 'billing.seat_based';
      await repo.delete(tenantId, key);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([tenantId, key]),
        }),
      );
    });

    it('should only delete exact composite key match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      await repo.delete('tenant-123', 'billing.seat_based');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: ['tenant-123', 'billing.seat_based'],
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle namespace-style keys', async () => {
      const namespacedOverride = {
        ...mockTenantOverride,
        key: 'feature.sub.nested.flag',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(namespacedOverride);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'feature.sub.nested.flag');

      expect(result?.key).toBe('feature.sub.nested.flag');
    });

    it('should handle very long tenant IDs', async () => {
      const longTenantId = 'org-' + 'a'.repeat(100);
      const overrideWithLongTenantId = {
        ...mockTenantOverride,
        tenant_id: longTenantId,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithLongTenantId);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey(longTenantId, 'billing.seat_based');

      expect(result?.tenantId).toBe(longTenantId);
    });

    it('should handle timestamps correctly', async () => {
      const overrideWithTimestamps = {
        ...mockTenantOverride,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-02-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithTimestamps);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'billing.seat_based');

      expect(result?.createdAt).toEqual(new Date('2024-01-01'));
      expect(result?.updatedAt).toEqual(new Date('2024-02-01'));
    });

    it('should handle empty string values', async () => {
      const overrideWithEmptyValue = {
        ...mockTenantOverride,
        value: '',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithEmptyValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.findByTenantAndKey('tenant-123', 'billing.seat_based');

      expect(result?.value).toBe('');
    });

    it('should handle multiple tenants with same key', async () => {
      const tenants = ['tenant-1', 'tenant-2', 'tenant-3'];

      for (const tenantId of tenants) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockTenantOverride,
          tenant_id: tenantId,
        });

        const repo = createTenantFeatureOverrideRepository(mockDb);
        const result = await repo.findByTenantAndKey(tenantId, 'billing.seat_based');

        expect(result?.tenantId).toBe(tenantId);
        expect(result?.key).toBe('billing.seat_based');
      }
    });

    it('should handle tenant with different key formats', async () => {
      const keys = ['simple', 'two.parts', 'three.part.key', 'UPPERCASE.KEY', 'mixed.Case.Key'];

      for (const key of keys) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockTenantOverride,
          key,
        });

        const repo = createTenantFeatureOverrideRepository(mockDb);
        const result = await repo.findByTenantAndKey('tenant-123', key);

        expect(result?.key).toBe(key);
      }
    });

    it('should handle concurrent upserts', async () => {
      const override1 = {
        ...mockTenantOverride,
        is_enabled: true,
        updated_at: new Date('2024-02-01'),
      };
      const override2 = {
        ...mockTenantOverride,
        is_enabled: false,
        updated_at: new Date('2024-02-02'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(override1).mockResolvedValueOnce(override2);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result1 = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: true,
      });
      const result2 = await repo.upsert({
        tenantId: 'tenant-123',
        key: 'billing.seat_based',
        isEnabled: false,
      });

      expect(result1.isEnabled).toBe(true);
      expect(result2.isEnabled).toBe(false);
    });

    it('should handle null value after update', async () => {
      const overrideWithNullValue = {
        ...mockTenantOverride,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(overrideWithNullValue);

      const repo = createTenantFeatureOverrideRepository(mockDb);
      const result = await repo.update('tenant-123', 'billing.seat_based', {
        value: null,
      });

      expect(result?.value).toBeNull();
    });

    it('should handle different tenant ID formats', async () => {
      const tenantIds = ['tenant-123', 'org_456', 'COMPANY-789', 'uuid-1234-5678-90ab-cdef'];

      for (const tenantId of tenantIds) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockTenantOverride,
          tenant_id: tenantId,
        });

        const repo = createTenantFeatureOverrideRepository(mockDb);
        const result = await repo.findByTenantAndKey(tenantId, 'billing.seat_based');

        expect(result?.tenantId).toBe(tenantId);
      }
    });
  });
});
