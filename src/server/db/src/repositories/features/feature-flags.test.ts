// backend/db/src/repositories/features/feature-flags.test.ts
/**
 * Tests for Feature Flags Repository
 *
 * Validates feature flag operations including creation, lookups by key,
 * finding all flags, finding enabled flags, updates, and deletions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createFeatureFlagRepository } from './feature-flags';

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

const mockFeatureFlag = {
  key: 'billing.seat_based',
  name: 'Seat-Based Billing',
  description: 'Enable seat-based billing for organizations',
  is_enabled: true,
  value: JSON.stringify({ maxSeats: 100 }),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createFeatureFlagRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new feature flag', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFeatureFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.create({
        key: 'billing.seat_based',
        name: 'Seat-Based Billing',
        description: 'Enable seat-based billing for organizations',
        isEnabled: true,
        value: { maxSeats: 100 },
      });

      expect(result.key).toBe('billing.seat_based');
      expect(result.name).toBe('Seat-Based Billing');
      expect(result.isEnabled).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFeatureFlagRepository(mockDb);

      await expect(
        repo.create({
          key: 'test.flag',
          name: 'Test Flag',
          isEnabled: false,
        }),
      ).rejects.toThrow('Failed to create feature flag');
    });

    it('should handle optional description', async () => {
      const flagWithoutDescription = {
        ...mockFeatureFlag,
        description: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithoutDescription);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.create({
        key: 'billing.seat_based',
        name: 'Seat-Based Billing',
        isEnabled: true,
      });

      expect(result.description).toBeNull();
    });

    it('should handle optional value field', async () => {
      const flagWithoutValue = {
        ...mockFeatureFlag,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithoutValue);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.create({
        key: 'billing.seat_based',
        name: 'Seat-Based Billing',
        isEnabled: true,
      });

      expect(result.value).toBeNull();
    });

    it('should default isEnabled to false', async () => {
      const disabledFlag = {
        ...mockFeatureFlag,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(disabledFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.create({
        key: 'billing.seat_based',
        name: 'Seat-Based Billing',
        isEnabled: false,
      });

      expect(result.isEnabled).toBe(false);
    });

    it('should handle complex JSON value', async () => {
      const complexValue = {
        settings: {
          maxSeats: 100,
          allowOverage: true,
          pricingTier: 'enterprise',
        },
      };
      const flagWithComplexValue = {
        ...mockFeatureFlag,
        value: JSON.stringify(complexValue),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithComplexValue);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.create({
        key: 'billing.seat_based',
        name: 'Seat-Based Billing',
        isEnabled: true,
        value: complexValue,
      });

      expect(result.value).toEqual(JSON.stringify(complexValue));
    });
  });

  describe('findByKey', () => {
    it('should return feature flag when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFeatureFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result).toBeDefined();
      expect(result?.key).toBe('billing.seat_based');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('key'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('nonexistent.flag');

      expect(result).toBeNull();
    });

    it('should handle exact key matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFeatureFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const key = 'billing.seat_based';
      await repo.findByKey(key);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([key]),
        }),
      );
    });

    it('should return disabled flags', async () => {
      const disabledFlag = {
        ...mockFeatureFlag,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(disabledFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result?.isEnabled).toBe(false);
    });

    it('should handle flags with null value', async () => {
      const flagWithNullValue = {
        ...mockFeatureFlag,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithNullValue);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result?.value).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return array of all feature flags', async () => {
      const flags = [
        mockFeatureFlag,
        {
          ...mockFeatureFlag,
          key: 'auth.two_factor',
          name: 'Two Factor Auth',
          is_enabled: false,
        },
        {
          ...mockFeatureFlag,
          key: 'search.elasticsearch',
          name: 'Elasticsearch',
          is_enabled: true,
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(flags);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('billing.seat_based');
      expect(result[1].key).toBe('auth.two_factor');
      expect(result[2].key).toBe('search.elasticsearch');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no flags exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should return both enabled and disabled flags', async () => {
      const flags = [
        mockFeatureFlag,
        { ...mockFeatureFlag, key: 'flag.disabled', is_enabled: false },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(flags);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result.some((f) => f.isEnabled)).toBe(true);
      expect(result.some((f) => !f.isEnabled)).toBe(true);
    });

    it('should order results by key ascending', async () => {
      const flags = [
        { ...mockFeatureFlag, key: 'zebra.flag' },
        { ...mockFeatureFlag, key: 'alpha.flag' },
        { ...mockFeatureFlag, key: 'beta.flag' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(flags);

      const repo = createFeatureFlagRepository(mockDb);
      await repo.findAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*key.*ASC/i),
        }),
      );
    });
  });

  describe('findEnabled', () => {
    it('should return only enabled feature flags', async () => {
      const enabledFlags = [
        mockFeatureFlag,
        { ...mockFeatureFlag, key: 'auth.oauth', is_enabled: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(enabledFlags);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findEnabled();

      expect(result).toHaveLength(2);
      expect(result.every((f) => f.isEnabled)).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_enabled'),
        }),
      );
    });

    it('should return empty array when no enabled flags exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findEnabled();

      expect(result).toEqual([]);
    });

    it('should filter out disabled flags', async () => {
      const enabledFlags = [mockFeatureFlag];
      vi.mocked(mockDb.query).mockResolvedValue(enabledFlags);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findEnabled();

      expect(result.every((f) => f.isEnabled)).toBe(true);
    });

    it('should order enabled flags by key ascending', async () => {
      const enabledFlags = [
        { ...mockFeatureFlag, key: 'zebra.flag' },
        { ...mockFeatureFlag, key: 'alpha.flag' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(enabledFlags);

      const repo = createFeatureFlagRepository(mockDb);
      await repo.findEnabled();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*key.*ASC/i),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update feature flag and return updated record', async () => {
      const updatedFlag = {
        ...mockFeatureFlag,
        is_enabled: false,
        name: 'Updated Billing',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        isEnabled: false,
        name: 'Updated Billing',
      });

      expect(result).toBeDefined();
      expect(result?.isEnabled).toBe(false);
      expect(result?.name).toBe('Updated Billing');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when flag not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('nonexistent.flag', {
        isEnabled: false,
      });

      expect(result).toBeNull();
    });

    it('should update only isEnabled field', async () => {
      const updatedFlag = {
        ...mockFeatureFlag,
        is_enabled: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        isEnabled: false,
      });

      expect(result?.isEnabled).toBe(false);
      expect(result?.name).toBe('Seat-Based Billing');
    });

    it('should update only name field', async () => {
      const updatedFlag = {
        ...mockFeatureFlag,
        name: 'New Name',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        name: 'New Name',
      });

      expect(result?.name).toBe('New Name');
      expect(result?.isEnabled).toBe(true);
    });

    it('should update description field', async () => {
      const updatedFlag = {
        ...mockFeatureFlag,
        description: 'New description',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        description: 'New description',
      });

      expect(result?.description).toBe('New description');
    });

    it('should update value field', async () => {
      const newValue = { maxSeats: 200 };
      const updatedFlag = {
        ...mockFeatureFlag,
        value: JSON.stringify(newValue),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        value: newValue,
      });

      expect(result?.value).toEqual(JSON.stringify(newValue));
    });

    it('should update multiple fields at once', async () => {
      const updatedFlag = {
        ...mockFeatureFlag,
        name: 'Updated Name',
        description: 'Updated description',
        is_enabled: false,
        value: JSON.stringify({ updated: true }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.update('billing.seat_based', {
        name: 'Updated Name',
        description: 'Updated description',
        isEnabled: false,
        value: { updated: true },
      });

      expect(result?.name).toBe('Updated Name');
      expect(result?.description).toBe('Updated description');
      expect(result?.isEnabled).toBe(false);
      expect(result?.value).toEqual(JSON.stringify({ updated: true }));
    });
  });

  describe('delete', () => {
    it('should delete feature flag and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.delete('billing.seat_based');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when flag not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.delete('nonexistent.flag');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createFeatureFlagRepository(mockDb);
      await repo.delete('billing.seat_based');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*feature_flags/s),
        }),
      );
    });

    it('should only delete exact key match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createFeatureFlagRepository(mockDb);
      const key = 'billing.seat_based';
      await repo.delete(key);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([key]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle namespace-style keys', async () => {
      const namespacedFlag = {
        ...mockFeatureFlag,
        key: 'feature.sub.nested.flag',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(namespacedFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('feature.sub.nested.flag');

      expect(result?.key).toBe('feature.sub.nested.flag');
    });

    it('should handle very long key names', async () => {
      const longKey = 'billing.enterprise.advanced.features.seat_based_with_overages';
      const flagWithLongKey = {
        ...mockFeatureFlag,
        key: longKey,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithLongKey);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey(longKey);

      expect(result?.key).toBe(longKey);
    });

    it('should handle null description and value', async () => {
      const minimalFlag = {
        ...mockFeatureFlag,
        description: null,
        value: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalFlag);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result?.description).toBeNull();
      expect(result?.value).toBeNull();
    });

    it('should handle timestamps correctly', async () => {
      const flagWithTimestamps = {
        ...mockFeatureFlag,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-02-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithTimestamps);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result?.createdAt).toEqual(new Date('2024-01-01'));
      expect(result?.updatedAt).toEqual(new Date('2024-02-01'));
    });

    it('should handle empty string values', async () => {
      const flagWithEmptyValue = {
        ...mockFeatureFlag,
        value: '',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(flagWithEmptyValue);

      const repo = createFeatureFlagRepository(mockDb);
      const result = await repo.findByKey('billing.seat_based');

      expect(result?.value).toBe('');
    });

    it('should handle different key formats', async () => {
      const keys = ['simple', 'two.parts', 'three.part.key', 'UPPERCASE.KEY', 'mixed.Case.Key'];

      for (const key of keys) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockFeatureFlag,
          key,
        });

        const repo = createFeatureFlagRepository(mockDb);
        const result = await repo.findByKey(key);

        expect(result?.key).toBe(key);
      }
    });

    it('should handle concurrent updates', async () => {
      const updatedFlag1 = {
        ...mockFeatureFlag,
        is_enabled: false,
        updated_at: new Date('2024-02-01'),
      };
      const updatedFlag2 = {
        ...mockFeatureFlag,
        name: 'Concurrent Update',
        updated_at: new Date('2024-02-02'),
      };

      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(updatedFlag1)
        .mockResolvedValueOnce(updatedFlag2);

      const repo = createFeatureFlagRepository(mockDb);
      const result1 = await repo.update('billing.seat_based', { isEnabled: false });
      const result2 = await repo.update('billing.seat_based', { name: 'Concurrent Update' });

      expect(result1?.isEnabled).toBe(false);
      expect(result2?.name).toBe('Concurrent Update');
    });
  });
});
