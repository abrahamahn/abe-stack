// main/server/db/src/repositories/billing/customer-mappings.test.ts
/**
 * Tests for Customer Mappings Repository
 *
 * Validates userId ↔ provider customerId mapping operations including:
 * - Finding mappings by user/provider combinations
 * - Creating new mappings
 * - Deleting mappings
 * - Get-or-create pattern for idempotent customer creation
 *
 * @complexity O(1) for all repository operations with proper indexing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createCustomerMappingRepository } from './customer-mappings';

import type { RawDb } from '../../client';
import type { CustomerMapping, NewCustomerMapping } from '../../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  withSession: vi.fn() as RawDb['withSession'],
});

// ============================================================================
// Test Data
// ============================================================================

const mockCustomerMapping: CustomerMapping = {
  id: 'mapping-123',
  userId: 'user-456',
  provider: 'stripe',
  providerCustomerId: 'cus_stripe123',
  createdAt: new Date('2024-01-01T10:00:00Z'),
};

const mockDbRow = {
  id: 'mapping-123',
  user_id: 'user-456',
  provider: 'stripe',
  provider_customer_id: 'cus_stripe123',
  created_at: new Date('2024-01-01T10:00:00Z'),
};

const mockPaypalMapping: CustomerMapping = {
  id: 'mapping-789',
  userId: 'user-456',
  provider: 'paypal',
  providerCustomerId: 'PAYPAL123ABC',
  createdAt: new Date('2024-01-02T10:00:00Z'),
};

const mockPaypalDbRow = {
  id: 'mapping-789',
  user_id: 'user-456',
  provider: 'paypal',
  provider_customer_id: 'PAYPAL123ABC',
  created_at: new Date('2024-01-02T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createCustomerMappingRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByUserIdAndProvider', () => {
    it('should return mapping for stripe provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('user-456', 'stripe');

      expect(result).toEqual(mockCustomerMapping);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('customer_mappings'),
        }),
      );
    });

    it('should return mapping for paypal provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPaypalDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('user-456', 'paypal');

      expect(result).toEqual(mockPaypalMapping);
      expect(result?.provider).toBe('paypal');
    });

    it('should return null when no mapping exists', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('user-999', 'stripe');

      expect(result).toBeNull();
    });

    it('should filter by both userId and provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.findByUserIdAndProvider('user-456', 'stripe');

      expect(vi.mocked(mockDb.queryOne)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
          values: expect.arrayContaining(['user-456', 'stripe']),
        }),
      );
    });

    it('should handle different user and provider combinations', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createCustomerMappingRepository(mockDb);

      // User with Stripe
      await repo.findByUserIdAndProvider('user-1', 'stripe');
      expect(mockDb.queryOne).toHaveBeenCalledTimes(1);

      // User with PayPal
      await repo.findByUserIdAndProvider('user-1', 'paypal');
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByProviderCustomerId', () => {
    it('should return mapping by stripe customer ID', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByProviderCustomerId('stripe', 'cus_stripe123');

      expect(result).toEqual(mockCustomerMapping);
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should return mapping by paypal customer ID', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPaypalDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByProviderCustomerId('paypal', 'PAYPAL123ABC');

      expect(result).toEqual(mockPaypalMapping);
      expect(result?.providerCustomerId).toBe('PAYPAL123ABC');
    });

    it('should return null when customer ID not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByProviderCustomerId('stripe', 'cus_nonexistent');

      expect(result).toBeNull();
    });

    it('should filter by both provider and providerCustomerId', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.findByProviderCustomerId('stripe', 'cus_stripe123');

      expect(vi.mocked(mockDb.queryOne)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('provider_customer_id'),
          values: expect.arrayContaining(['stripe', 'cus_stripe123']),
        }),
      );
    });

    it('should differentiate between providers with same-looking IDs', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(mockDbRow).mockResolvedValueOnce(null);

      const repo = createCustomerMappingRepository(mockDb);

      const stripeResult = await repo.findByProviderCustomerId('stripe', 'cus_123');
      expect(stripeResult).toBeTruthy();

      const paypalResult = await repo.findByProviderCustomerId('paypal', 'cus_123');
      expect(paypalResult).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all mappings for a user', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow, mockPaypalDbRow]);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockCustomerMapping);
      expect(result[1]).toEqual(mockPaypalMapping);
    });

    it('should return empty array when user has no mappings', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-999');

      expect(result).toEqual([]);
    });

    it('should order results by createdAt ascending', async () => {
      const olderMapping = { ...mockDbRow, created_at: new Date('2024-01-01') };
      const newerMapping = { ...mockPaypalDbRow, created_at: new Date('2024-01-02') };

      vi.mocked(mockDb.query).mockResolvedValue([olderMapping, newerMapping]);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result[0]?.createdAt.getTime() ?? 0).toBeLessThan(result[1]?.createdAt.getTime() ?? 0);
    });

    it('should handle single mapping', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-single');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCustomerMapping);
    });

    it('should correctly convert all snake_case fields to camelCase', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).toHaveProperty('providerCustomerId');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('user_id');
      expect(result[0]).not.toHaveProperty('provider_customer_id');
    });
  });

  describe('create', () => {
    it('should create new mapping and return it', async () => {
      const newMapping: NewCustomerMapping = {
        userId: 'user-new',
        provider: 'stripe',
        providerCustomerId: 'cus_new123',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        id: 'mapping-new',
        user_id: 'user-new',
        provider: 'stripe',
        provider_customer_id: 'cus_new123',
        created_at: new Date('2024-01-03T10:00:00Z'),
      });

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.create(newMapping);

      expect(result.userId).toBe('user-new');
      expect(result.provider).toBe('stripe');
      expect(result.providerCustomerId).toBe('cus_new123');
      expect(result.id).toBe('mapping-new');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should create paypal mapping', async () => {
      const newMapping: NewCustomerMapping = {
        userId: 'user-paypal',
        provider: 'paypal',
        providerCustomerId: 'PAYPAL_NEW',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        id: 'mapping-paypal',
        user_id: 'user-paypal',
        provider: 'paypal',
        provider_customer_id: 'PAYPAL_NEW',
        created_at: new Date(),
      });

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.create(newMapping);

      expect(result.provider).toBe('paypal');
    });

    it('should convert camelCase to snake_case for database', async () => {
      const newMapping: NewCustomerMapping = {
        userId: 'user-123',
        provider: 'stripe',
        providerCustomerId: 'cus_123',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.create(newMapping);

      expect(vi.mocked(mockDb.queryOne)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT.*customer_mappings.*RETURNING/s),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createCustomerMappingRepository(mockDb);
      const newMapping: NewCustomerMapping = {
        userId: 'user-fail',
        provider: 'stripe',
        providerCustomerId: 'cus_fail',
      };

      await expect(repo.create(newMapping)).rejects.toThrow('Failed to create customer mapping');
    });

    it('should accept optional id field', async () => {
      const newMapping: NewCustomerMapping = {
        id: 'custom-id',
        userId: 'user-custom',
        provider: 'stripe',
        providerCustomerId: 'cus_custom',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        id: 'custom-id',
        user_id: 'user-custom',
        provider: 'stripe',
        provider_customer_id: 'cus_custom',
        created_at: new Date(),
      });

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.create(newMapping);

      expect(result.id).toBe('custom-id');
    });

    it('should accept optional createdAt field', async () => {
      const customDate = new Date('2024-01-15T10:00:00Z');
      const newMapping: NewCustomerMapping = {
        userId: 'user-date',
        provider: 'stripe',
        providerCustomerId: 'cus_date',
        createdAt: customDate,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        id: 'mapping-date',
        user_id: 'user-date',
        provider: 'stripe',
        provider_customer_id: 'cus_date',
        created_at: customDate,
      });

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.create(newMapping);

      expect(result.createdAt).toEqual(customDate);
    });
  });

  describe('delete', () => {
    it('should return true when mapping is deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.delete('mapping-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE'),
        }),
      );
    });

    it('should return false when mapping not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.delete('mapping-nonexistent');

      expect(result).toBe(false);
    });

    it('should use correct ID in WHERE clause', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.delete('mapping-specific');

      expect(vi.mocked(mockDb.execute)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
          values: expect.arrayContaining(['mapping-specific']),
        }),
      );
    });

    it('should delete from customer_mappings table', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.delete('mapping-123');

      expect(vi.mocked(mockDb.execute)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('customer_mappings'),
        }),
      );
    });
  });

  describe('deleteByUserId', () => {
    it('should return count of deleted mappings', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.deleteByUserId('user-456');

      expect(result).toBe(2);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return 0 when no mappings found for user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.deleteByUserId('user-nonexistent');

      expect(result).toBe(0);
    });

    it('should delete all mappings for specific user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createCustomerMappingRepository(mockDb);
      await repo.deleteByUserId('user-multi');

      expect(vi.mocked(mockDb.execute)).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
          values: expect.arrayContaining(['user-multi']),
        }),
      );
    });

    it('should delete mappings for all providers', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.deleteByUserId('user-both-providers');

      expect(result).toBe(2); // Stripe + PayPal
    });
  });

  describe('getOrCreate', () => {
    it('should return existing mapping when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const createCustomerId = vi.fn();
      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.getOrCreate('user-456', 'stripe', createCustomerId);

      expect(result).toEqual(mockCustomerMapping);
      expect(createCustomerId).not.toHaveBeenCalled();
      expect(mockDb.queryOne).toHaveBeenCalledTimes(1); // Only findByUserIdAndProvider
    });

    it('should create new mapping when not found', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(null) // findByUserIdAndProvider returns null
        .mockResolvedValueOnce({
          // create returns new mapping
          id: 'mapping-new',
          user_id: 'user-new',
          provider: 'stripe',
          provider_customer_id: 'cus_created123',
          created_at: new Date(),
        });

      const createCustomerId = vi.fn().mockResolvedValue('cus_created123');
      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.getOrCreate('user-new', 'stripe', createCustomerId);

      expect(createCustomerId).toHaveBeenCalledTimes(1);
      expect(result.providerCustomerId).toBe('cus_created123');
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2); // findByUserIdAndProvider + create
    });

    it('should call createCustomerId only once', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'mapping-new',
        user_id: 'user-new',
        provider: 'paypal',
        provider_customer_id: 'PAYPAL_CREATED',
        created_at: new Date(),
      });

      const createCustomerId = vi.fn().mockResolvedValue('PAYPAL_CREATED');
      const repo = createCustomerMappingRepository(mockDb);
      await repo.getOrCreate('user-new', 'paypal', createCustomerId);

      expect(createCustomerId).toHaveBeenCalledTimes(1);
    });

    it('should handle stripe provider creation', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'mapping-stripe',
        user_id: 'user-stripe',
        provider: 'stripe',
        provider_customer_id: 'cus_new_stripe',
        created_at: new Date(),
      });

      const createCustomerId = vi.fn().mockResolvedValue('cus_new_stripe');
      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.getOrCreate('user-stripe', 'stripe', createCustomerId);

      expect(result.provider).toBe('stripe');
      expect(result.providerCustomerId).toBe('cus_new_stripe');
    });

    it('should handle paypal provider creation', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'mapping-paypal',
        user_id: 'user-paypal',
        provider: 'paypal',
        provider_customer_id: 'PAYPAL_NEW',
        created_at: new Date(),
      });

      const createCustomerId = vi.fn().mockResolvedValue('PAYPAL_NEW');
      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.getOrCreate('user-paypal', 'paypal', createCustomerId);

      expect(result.provider).toBe('paypal');
      expect(result.providerCustomerId).toBe('PAYPAL_NEW');
    });

    it('should propagate createCustomerId errors', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(null);

      const createCustomerId = vi.fn().mockRejectedValue(new Error('Stripe API error'));
      const repo = createCustomerMappingRepository(mockDb);

      await expect(repo.getOrCreate('user-error', 'stripe', createCustomerId)).rejects.toThrow(
        'Stripe API error',
      );
    });

    it('should be idempotent - multiple calls return same mapping', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const createCustomerId = vi.fn();
      const repo = createCustomerMappingRepository(mockDb);

      const result1 = await repo.getOrCreate('user-456', 'stripe', createCustomerId);
      const result2 = await repo.getOrCreate('user-456', 'stripe', createCustomerId);

      expect(result1).toEqual(result2);
      expect(createCustomerId).not.toHaveBeenCalled();
    });

    it('should create separate mappings for different providers', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(null) // No Stripe mapping
        .mockResolvedValueOnce({
          // Create Stripe mapping
          id: 'mapping-stripe',
          user_id: 'user-multi',
          provider: 'stripe',
          provider_customer_id: 'cus_stripe',
          created_at: new Date(),
        })
        .mockResolvedValueOnce(null) // No PayPal mapping
        .mockResolvedValueOnce({
          // Create PayPal mapping
          id: 'mapping-paypal',
          user_id: 'user-multi',
          provider: 'paypal',
          provider_customer_id: 'PAYPAL_ID',
          created_at: new Date(),
        });

      const createStripeId = vi.fn().mockResolvedValue('cus_stripe');
      const createPaypalId = vi.fn().mockResolvedValue('PAYPAL_ID');

      const repo = createCustomerMappingRepository(mockDb);

      const stripeResult = await repo.getOrCreate('user-multi', 'stripe', createStripeId);
      const paypalResult = await repo.getOrCreate('user-multi', 'paypal', createPaypalId);

      expect(stripeResult.provider).toBe('stripe');
      expect(paypalResult.provider).toBe('paypal');
      expect(createStripeId).toHaveBeenCalledTimes(1);
      expect(createPaypalId).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty user IDs gracefully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('', 'stripe');

      expect(result).toBeNull();
    });

    it('should preserve Date objects from database results', async () => {
      const dateObj = new Date('2024-01-01T10:00:00Z');
      const dbRowWithDate = {
        ...mockDbRow,
        created_at: dateObj,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(dbRowWithDate);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('user-456', 'stripe');

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.createdAt).toEqual(dateObj);
    });

    it('should handle multiple mappings in correct order', async () => {
      const mappings = [
        { ...mockDbRow, id: 'map-1', created_at: new Date('2024-01-01') },
        { ...mockDbRow, id: 'map-2', created_at: new Date('2024-01-02') },
        { ...mockDbRow, id: 'map-3', created_at: new Date('2024-01-03') },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mappings);

      const repo = createCustomerMappingRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('map-1');
      expect(result[2]?.id).toBe('map-3');
    });

    it('should handle concurrent getOrCreate calls correctly', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce(null) // First call: not found
        .mockResolvedValueOnce({
          // First call: create succeeds
          id: 'mapping-concurrent',
          user_id: 'user-concurrent',
          provider: 'stripe',
          provider_customer_id: 'cus_concurrent',
          created_at: new Date(),
        })
        .mockResolvedValueOnce({
          // Second call: now found
          id: 'mapping-concurrent',
          user_id: 'user-concurrent',
          provider: 'stripe',
          provider_customer_id: 'cus_concurrent',
          created_at: new Date(),
        });

      const createCustomerId = vi.fn().mockResolvedValue('cus_concurrent');
      const repo = createCustomerMappingRepository(mockDb);

      const result1 = await repo.getOrCreate('user-concurrent', 'stripe', createCustomerId);
      const result2 = await repo.getOrCreate('user-concurrent', 'stripe', createCustomerId);

      expect(result1.providerCustomerId).toBe('cus_concurrent');
      expect(result2.providerCustomerId).toBe('cus_concurrent');
      expect(createCustomerId).toHaveBeenCalledTimes(1);
    });
  });
});
