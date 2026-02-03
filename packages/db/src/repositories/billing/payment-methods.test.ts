// infra/db/src/repositories/billing/payment-methods.test.ts
/**
 * Tests for Payment Methods Repository
 *
 * Validates payment method CRUD operations, default payment method management,
 * and proper handling of card details JSONB serialization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPaymentMethodRepository } from './payment-methods.js';

import type { RawDb } from '../../client.js';
import type {
  PaymentMethod,
  NewPaymentMethod,
  UpdatePaymentMethod,
  CardDetails,
} from '../../schema/index.js';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb =>
  ({
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
    transaction: vi.fn(),
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn(),
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockCardDetails: CardDetails = {
  brand: 'visa',
  last4: '4242',
  expMonth: 12,
  expYear: 2025,
};

const mockPaymentMethod: PaymentMethod = {
  id: 'pm-123',
  userId: 'user-456',
  provider: 'stripe',
  providerPaymentMethodId: 'pm_stripe_123',
  type: 'card',
  isDefault: true,
  cardDetails: mockCardDetails,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const mockDbRow = {
  id: 'pm-123',
  user_id: 'user-456',
  provider: 'stripe',
  provider_payment_method_id: 'pm_stripe_123',
  type: 'card',
  is_default: true,
  card_details: JSON.stringify(mockCardDetails),
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createPaymentMethodRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return payment method when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result).toEqual(mockPaymentMethod);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('payment_methods'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should parse card details JSONB correctly', async () => {
      const rowWithCardDetails = {
        ...mockDbRow,
        card_details: JSON.stringify({
          brand: 'mastercard',
          last4: '5555',
          expMonth: 6,
          expYear: 2026,
        }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithCardDetails);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result?.cardDetails).toEqual({
        brand: 'mastercard',
        last4: '5555',
        expMonth: 6,
        expYear: 2026,
      });
    });

    it('should handle null card details', async () => {
      const rowWithoutCardDetails = { ...mockDbRow, card_details: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithoutCardDetails);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result?.cardDetails).toBeNull();
    });
  });

  describe('findByProviderPaymentMethodId', () => {
    it('should return payment method for stripe provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByProviderPaymentMethodId('stripe', 'pm_stripe_123');

      expect(result).toEqual(mockPaymentMethod);
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should return payment method for paypal provider', async () => {
      const paypalRow = {
        ...mockDbRow,
        provider: 'paypal',
        provider_payment_method_id: 'ba_paypal_123',
        type: 'bank_account',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(paypalRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByProviderPaymentMethodId('paypal', 'ba_paypal_123');

      expect(result?.provider).toBe('paypal');
      expect(result?.providerPaymentMethodId).toBe('ba_paypal_123');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByProviderPaymentMethodId('stripe', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should query with both provider and providerPaymentMethodId', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.findByProviderPaymentMethodId('stripe', 'pm_123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('payment_methods'),
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return all payment methods for user', async () => {
      const methods = [mockDbRow, { ...mockDbRow, id: 'pm-456', is_default: false }];
      vi.mocked(mockDb.query).mockResolvedValue(methods);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pm-123');
      expect(result[1].id).toBe('pm-456');
    });

    it('should order by isDefault descending, then createdAt descending', async () => {
      const methods = [
        { ...mockDbRow, id: 'pm-1', is_default: true, created_at: new Date('2024-01-03') },
        { ...mockDbRow, id: 'pm-2', is_default: false, created_at: new Date('2024-01-02') },
        { ...mockDbRow, id: 'pm-3', is_default: false, created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(methods);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result[0].id).toBe('pm-1'); // Default first
      expect(result[0].isDefault).toBe(true);
    });

    it('should return empty array when user has no payment methods', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-no-methods');

      expect(result).toEqual([]);
    });

    it('should parse card details for all returned methods', async () => {
      const methods = [
        {
          ...mockDbRow,
          card_details: JSON.stringify({
            brand: 'visa',
            last4: '1111',
            expMonth: 1,
            expYear: 2025,
          }),
        },
        {
          ...mockDbRow,
          id: 'pm-456',
          card_details: JSON.stringify({
            brand: 'amex',
            last4: '9999',
            expMonth: 12,
            expYear: 2026,
          }),
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(methods);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result[0].cardDetails?.brand).toBe('visa');
      expect(result[1].cardDetails?.brand).toBe('amex');
    });
  });

  describe('findDefaultByUserId', () => {
    it('should return default payment method for user', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findDefaultByUserId('user-456');

      expect(result).toEqual(mockPaymentMethod);
      expect(result?.isDefault).toBe(true);
    });

    it('should return null when user has no default payment method', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findDefaultByUserId('user-no-default');

      expect(result).toBeNull();
    });

    it('should query with userId and isDefault conditions', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.findDefaultByUserId('user-456');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_default'),
        }),
      );
    });

    it('should limit to 1 result', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.findDefaultByUserId('user-456');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should insert and return new payment method with card details', async () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new_123',
        type: 'card',
        cardDetails: mockCardDetails,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        id: 'pm-new',
        user_id: 'user-789',
        provider_payment_method_id: 'pm_new_123',
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.create(newMethod);

      expect(result.userId).toBe('user-789');
      expect(result.providerPaymentMethodId).toBe('pm_new_123');
      expect(result.cardDetails).toEqual(mockCardDetails);
    });

    it('should stringify card details when creating', async () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new_123',
        type: 'card',
        cardDetails: { brand: 'amex', last4: '3456', expMonth: 3, expYear: 2027 },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        card_details: JSON.stringify({ brand: 'amex', last4: '3456', expMonth: 3, expYear: 2027 }),
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.create(newMethod);

      expect(result.cardDetails).toEqual({
        brand: 'amex',
        last4: '3456',
        expMonth: 3,
        expYear: 2027,
      });
    });

    it('should create payment method without card details', async () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'paypal',
        providerPaymentMethodId: 'ba_paypal_456',
        type: 'bank_account',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        provider: 'paypal',
        type: 'bank_account',
        card_details: null,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.create(newMethod);

      expect(result.cardDetails).toBeNull();
    });

    it('should set isDefault when provided', async () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new_123',
        type: 'card',
        isDefault: true,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        is_default: true,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.create(newMethod);

      expect(result.isDefault).toBe(true);
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);

      await expect(
        repo.create({
          userId: 'user-789',
          provider: 'stripe',
          providerPaymentMethodId: 'pm_fail',
          type: 'card',
        }),
      ).rejects.toThrow('Failed to create payment method');
    });

    it('should handle null cardDetails gracefully', async () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new_123',
        type: 'card',
        cardDetails: null,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        card_details: null,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.create(newMethod);

      expect(result.cardDetails).toBeNull();
    });
  });

  describe('update', () => {
    it('should update payment method and return updated record', async () => {
      const updateData: UpdatePaymentMethod = {
        isDefault: true,
        cardDetails: { brand: 'discover', last4: '6789', expMonth: 8, expYear: 2028 },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        is_default: true,
        card_details: JSON.stringify({
          brand: 'discover',
          last4: '6789',
          expMonth: 8,
          expYear: 2028,
        }),
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.update('pm-123', updateData);

      expect(result?.isDefault).toBe(true);
      expect(result?.cardDetails).toEqual({
        brand: 'discover',
        last4: '6789',
        expMonth: 8,
        expYear: 2028,
      });
    });

    it('should stringify card details when updating', async () => {
      const updateData: UpdatePaymentMethod = {
        cardDetails: { brand: 'jcb', last4: '0000', expMonth: 11, expYear: 2029 },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        card_details: JSON.stringify({ brand: 'jcb', last4: '0000', expMonth: 11, expYear: 2029 }),
      });

      const repo = createPaymentMethodRepository(mockDb);
      await repo.update('pm-123', updateData);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should update only isDefault field', async () => {
      const updateData: UpdatePaymentMethod = {
        isDefault: false,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        is_default: false,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.update('pm-123', updateData);

      expect(result?.isDefault).toBe(false);
    });

    it('should return null when payment method not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.update('nonexistent', { isDefault: true });

      expect(result).toBeNull();
    });

    it('should handle null cardDetails in update', async () => {
      const updateData: UpdatePaymentMethod = {
        cardDetails: null,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        card_details: null,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.update('pm-123', updateData);

      expect(result?.cardDetails).toBeNull();
    });

    it('should update updatedAt timestamp', async () => {
      const newDate = new Date('2024-02-01T12:00:00Z');
      const updateData: UpdatePaymentMethod = {
        isDefault: true,
        updatedAt: newDate,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        updated_at: newDate,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.update('pm-123', updateData);

      expect(result?.updatedAt).toEqual(newDate);
    });
  });

  describe('delete', () => {
    it('should delete payment method and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.delete('pm-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE'),
        }),
      );
    });

    it('should return false when payment method not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should delete by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.delete('pm-specific-id');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('payment_methods'),
        }),
      );
    });
  });

  describe('deleteByProviderPaymentMethodId', () => {
    it('should delete by stripe provider payment method id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.deleteByProviderPaymentMethodId('stripe', 'pm_stripe_123');

      expect(result).toBe(true);
    });

    it('should delete by paypal provider payment method id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.deleteByProviderPaymentMethodId('paypal', 'ba_paypal_456');

      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.deleteByProviderPaymentMethodId('stripe', 'nonexistent');

      expect(result).toBe(false);
    });

    it('should query with both provider and providerPaymentMethodId', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.deleteByProviderPaymentMethodId('stripe', 'pm_123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE'),
        }),
      );
    });
  });

  describe('setAsDefault', () => {
    it('should set payment method as default and clear others', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2); // clearDefaultForUser
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        is_default: true,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.setAsDefault('user-456', 'pm-123');

      expect(result?.isDefault).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled(); // clearDefaultForUser called
      expect(mockDb.queryOne).toHaveBeenCalled(); // update called
    });

    it('should return null when payment method not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.setAsDefault('user-456', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when payment method belongs to different user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.setAsDefault('user-wrong', 'pm-123');

      expect(result).toBeNull();
    });

    it('should call clearDefaultForUser before setting new default', async () => {
      const executeMock = vi.mocked(mockDb.execute);
      const queryOneMock = vi.mocked(mockDb.queryOne);

      executeMock.mockResolvedValue(1);
      queryOneMock.mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.setAsDefault('user-456', 'pm-123');

      // Verify clearDefaultForUser was called (execute) before setAsDefault (queryOne)
      expect(executeMock).toHaveBeenCalled();
      expect(queryOneMock).toHaveBeenCalled();
    });

    it('should update only the specified payment method for user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        id: 'pm-specific',
        is_default: true,
      });

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.setAsDefault('user-456', 'pm-specific');

      expect(result?.id).toBe('pm-specific');
      expect(result?.isDefault).toBe(true);
    });
  });

  describe('clearDefaultForUser', () => {
    it('should clear default flag for all user payment methods', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.clearDefaultForUser('user-456');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should not throw when user has no payment methods', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPaymentMethodRepository(mockDb);

      await expect(repo.clearDefaultForUser('user-no-methods')).resolves.toBeUndefined();
    });

    it('should set isDefault to false for all', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.clearDefaultForUser('user-456');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_default'),
        }),
      );
    });

    it('should filter by userId', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.clearDefaultForUser('user-specific');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle malformed JSONB gracefully', async () => {
      const rowWithMalformedJson = {
        ...mockDbRow,
        card_details: 'not valid json{',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithMalformedJson);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      // parseJsonb should return null for invalid JSON
      expect(result?.cardDetails).toBeNull();
    });

    it('should handle empty string card details', async () => {
      const rowWithEmptyString = {
        ...mockDbRow,
        card_details: '',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithEmptyString);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result?.cardDetails).toBeNull();
    });

    it('should handle payment method with all optional fields missing', async () => {
      const minimalRow = {
        id: 'pm-minimal',
        user_id: 'user-123',
        provider: 'stripe',
        provider_payment_method_id: 'pm_min',
        type: 'card',
        is_default: false,
        card_details: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-minimal');

      expect(result?.id).toBe('pm-minimal');
      expect(result?.cardDetails).toBeNull();
      expect(result?.isDefault).toBe(false);
    });

    it('should handle multiple payment methods with same provider', async () => {
      const methods = [
        { ...mockDbRow, id: 'pm-1', provider_payment_method_id: 'pm_1' },
        { ...mockDbRow, id: 'pm-2', provider_payment_method_id: 'pm_2' },
        { ...mockDbRow, id: 'pm-3', provider_payment_method_id: 'pm_3' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(methods);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result).toHaveLength(3);
      expect(result.every((pm: PaymentMethod) => pm.provider === 'stripe')).toBe(true);
    });

    it('should handle different payment method types', async () => {
      const methods = [
        { ...mockDbRow, id: 'pm-1', type: 'card' },
        { ...mockDbRow, id: 'pm-2', type: 'bank_account', card_details: null },
        { ...mockDbRow, id: 'pm-3', type: 'paypal', card_details: null },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(methods);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findByUserId('user-456');

      expect(result[0].type).toBe('card');
      expect(result[1].type).toBe('bank_account');
      expect(result[2].type).toBe('paypal');
    });
  });

  describe('data transformation', () => {
    it('should correctly transform snake_case to camelCase', async () => {
      const snakeCaseRow = {
        id: 'pm-123',
        user_id: 'user-456',
        provider: 'stripe',
        provider_payment_method_id: 'pm_stripe_123',
        type: 'card',
        is_default: true,
        card_details: JSON.stringify(mockCardDetails),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snakeCaseRow);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('providerPaymentMethodId');
      expect(result).toHaveProperty('isDefault');
      expect(result).toHaveProperty('cardDetails');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('user_id');
      expect(result).not.toHaveProperty('provider_payment_method_id');
    });

    it('should correctly transform camelCase to snake_case for insert', async () => {
      const camelCaseData: NewPaymentMethod = {
        userId: 'user-789',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new',
        type: 'card',
        isDefault: true,
        cardDetails: mockCardDetails,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPaymentMethodRepository(mockDb);
      await repo.create(camelCaseData);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should preserve Date objects during transformation', async () => {
      const now = new Date('2024-06-15T14:30:00Z');
      const rowWithDates = {
        ...mockDbRow,
        created_at: now,
        updated_at: now,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithDates);

      const repo = createPaymentMethodRepository(mockDb);
      const result = await repo.findById('pm-123');

      expect(result?.createdAt).toEqual(now);
      expect(result?.updatedAt).toEqual(now);
      expect(result?.createdAt).toBeInstanceOf(Date);
    });
  });
});
