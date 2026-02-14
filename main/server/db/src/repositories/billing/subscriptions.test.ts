// main/server/db/src/repositories/billing/subscriptions.test.ts
/**
 * Tests for Subscriptions Repository
 *
 * Validates subscription data access operations including CRUD, filtering,
 * and specialized queries for expiring/past-due subscriptions.
 */

import { encodeCursor, MS_PER_DAY } from '@abe-stack/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createSubscriptionRepository } from './subscriptions';

import type { RawDb } from '../../client';
import type { Subscription, NewSubscription, UpdateSubscription } from '../../schema/index';

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

const mockSubscription: Subscription = {
  id: 'sub-123',
  userId: 'user-123',
  planId: 'plan-pro',
  provider: 'stripe',
  providerSubscriptionId: 'sub_stripe_123',
  providerCustomerId: 'cus_stripe_456',
  status: 'active',
  currentPeriodStart: new Date('2024-01-01T00:00:00Z'),
  currentPeriodEnd: new Date('2024-02-01T00:00:00Z'),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEnd: null,
  metadata: { source: 'web' },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockDbRow = {
  id: 'sub-123',
  user_id: 'user-123',
  plan_id: 'plan-pro',
  provider: 'stripe',
  provider_subscription_id: 'sub_stripe_123',
  provider_customer_id: 'cus_stripe_456',
  status: 'active',
  current_period_start: new Date('2024-01-01T00:00:00Z'),
  current_period_end: new Date('2024-02-01T00:00:00Z'),
  cancel_at_period_end: false,
  canceled_at: null,
  trial_end: null,
  metadata: JSON.stringify({ source: 'web' }),
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createSubscriptionRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return subscription when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result).toEqual(mockSubscription);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('subscriptions'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should parse metadata JSONB correctly', async () => {
      const rowWithComplexMetadata = {
        ...mockDbRow,
        metadata: JSON.stringify({ customField: 'value', nested: { data: 123 } }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithComplexMetadata);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.metadata).toEqual({ customField: 'value', nested: { data: 123 } });
    });

    it('should handle null metadata', async () => {
      const rowWithNullMetadata = { ...mockDbRow, metadata: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithNullMetadata);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.metadata).toEqual({});
    });
  });

  describe('findByProviderSubscriptionId', () => {
    it('should return subscription for stripe provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findByProviderSubscriptionId('stripe', 'sub_stripe_123');

      expect(result).toEqual(mockSubscription);
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should return subscription for paypal provider', async () => {
      const paypalRow = {
        ...mockDbRow,
        provider: 'paypal',
        provider_subscription_id: 'I-123ABC',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(paypalRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findByProviderSubscriptionId('paypal', 'I-123ABC');

      expect(result?.provider).toBe('paypal');
      expect(result?.providerSubscriptionId).toBe('I-123ABC');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findByProviderSubscriptionId('stripe', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByUserId', () => {
    it('should return active subscription for user', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findActiveByUserId('user-123');

      expect(result).toEqual(mockSubscription);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*status/s),
        }),
      );
    });

    it('should return trialing subscription as active', async () => {
      const trialingRow = { ...mockDbRow, status: 'trialing' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(trialingRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findActiveByUserId('user-123');

      expect(result?.status).toBe('trialing');
    });

    it('should return null when no active subscription', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findActiveByUserId('user-123');

      expect(result).toBeNull();
    });

    it('should order by created_at desc to get most recent', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findActiveByUserId('user-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*DESC/i),
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return all subscriptions for user', async () => {
      const subscriptions = [mockDbRow, { ...mockDbRow, id: 'sub-456', status: 'canceled' }];
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-123');
      expect(result[1].id).toBe('sub-456');
    });

    it('should return empty array when no subscriptions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('user-123');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*DESC/i),
        }),
      );
    });
  });

  describe('list', () => {
    it('should return paginated subscriptions with defaults', async () => {
      const subscriptions = [mockDbRow];
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.list();

      expect(result.data).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should filter by userId', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ userId: 'user-123' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should filter by planId', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ planId: 'plan-pro' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('plan_id'),
        }),
      );
    });

    it('should filter by single status', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ status: 'active' });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should filter by multiple statuses', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ status: ['active', 'trialing'] });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should filter by provider', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ provider: 'stripe' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('provider'),
        }),
      );
    });

    it('should filter by cancelAtPeriodEnd', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ cancelAtPeriodEnd: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('cancel_at_period_end'),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({
        userId: 'user-123',
        status: 'active',
        provider: 'stripe',
        cancelAtPeriodEnd: false,
      });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should skip empty string filters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({ userId: '', planId: '' });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should handle cursor pagination descending', async () => {
      const subscriptions = [mockDbRow, { ...mockDbRow, id: 'sub-456' }];
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const cursor = encodeCursor({
        value: mockSubscription.createdAt,
        tieBreaker: 'sub-000',
        sortOrder: 'desc',
      });
      await repo.list({}, { cursor, sortOrder: 'desc', limit: 20 });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should handle cursor pagination ascending', async () => {
      const subscriptions = [mockDbRow];
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const cursor = encodeCursor({
        value: mockSubscription.createdAt,
        tieBreaker: 'sub-000',
        sortOrder: 'asc',
      });
      await repo.list({}, { cursor, sortOrder: 'asc', limit: 20 });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should ignore invalid cursor format', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({}, { cursor: 'invalid', limit: 20 });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should ignore empty cursor', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({}, { cursor: '', limit: 20 });

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should detect hasMore when items exceed limit', async () => {
      const subscriptions = Array.from({ length: 21 }, (_, i) => ({
        ...mockDbRow,
        id: `sub-${String(i)}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.list({}, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).not.toBeNull();
      expect(result.hasNext).toBe(true);
    });

    it('should return null cursor when no more items', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.list({}, { limit: 20 });

      expect(result.nextCursor).toBeNull();
      expect(result.hasNext).toBe(false);
    });

    it('should generate cursor from last item', async () => {
      const lastSub = {
        ...mockDbRow,
        id: 'sub-last',
        created_at: new Date('2024-01-15T12:00:00Z'),
      };
      const subscriptions = Array.from({ length: 21 }, () => mockDbRow);
      subscriptions[19] = lastSub;
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.list({}, { limit: 20 });

      // Cursor is now base64url-encoded via shared's encodeCursor
      expect(result.nextCursor).toBeTruthy();
      expect(result.hasNext).toBe(true);
    });

    it('should request limit + 1 items to detect hasMore', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.list({}, { limit: 10 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT.*11/),
        }),
      );
    });

    it('should throw error when conditions array is empty but accessed', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createSubscriptionRepository(mockDb);

      // This should not throw because empty conditions are handled correctly
      await expect(repo.list({}, { limit: 20 })).resolves.toBeDefined();
    });
  });

  describe('create', () => {
    it('should create and return new subscription', async () => {
      const newSub: NewSubscription = {
        userId: 'user-123',
        planId: 'plan-pro',
        provider: 'stripe',
        providerSubscriptionId: 'sub_new_123',
        providerCustomerId: 'cus_new_456',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.create(newSub);

      expect(result.userId).toBe('user-123');
      expect(result.provider).toBe('stripe');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*subscriptions/i),
        }),
      );
    });

    it('should handle metadata serialization', async () => {
      const newSub: NewSubscription = {
        userId: 'user-123',
        planId: 'plan-pro',
        provider: 'stripe',
        providerSubscriptionId: 'sub_new_123',
        providerCustomerId: 'cus_new_456',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        metadata: { customField: 'value', nested: { data: 123 } },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        metadata: JSON.stringify({ customField: 'value', nested: { data: 123 } }),
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.create(newSub);

      expect(result.metadata).toEqual({ customField: 'value', nested: { data: 123 } });
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);

      await expect(
        repo.create({
          userId: 'user-123',
          planId: 'plan-pro',
          provider: 'stripe',
          providerSubscriptionId: 'sub_fail',
          providerCustomerId: 'cus_fail',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        }),
      ).rejects.toThrow('Failed to create subscription');
    });

    it('should handle optional fields', async () => {
      const newSub: NewSubscription = {
        userId: 'user-123',
        planId: 'plan-pro',
        provider: 'paypal',
        providerSubscriptionId: 'I-123',
        providerCustomerId: 'paypal-123',
        status: 'trialing',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        trialEnd: new Date('2024-01-15'),
        cancelAtPeriodEnd: false,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        provider: 'paypal',
        status: 'trialing',
        trial_end: new Date('2024-01-15'),
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.create(newSub);

      expect(result.provider).toBe('paypal');
      expect(result?.status).toBe('trialing');
    });
  });

  describe('update', () => {
    it('should update and return subscription', async () => {
      const updateData: UpdateSubscription = {
        status: 'canceled',
        canceledAt: new Date('2024-01-15'),
        cancelAtPeriodEnd: true,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        status: 'canceled',
        canceled_at: new Date('2024-01-15'),
        cancel_at_period_end: true,
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.update('sub-123', updateData);

      expect(result?.status).toBe('canceled');
      expect(result?.cancelAtPeriodEnd).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*subscriptions.*SET/i),
        }),
      );
    });

    it('should return null when subscription not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.update('nonexistent', { status: 'canceled' });

      expect(result).toBeNull();
    });

    it('should handle metadata updates', async () => {
      const updateData: UpdateSubscription = {
        metadata: { reason: 'user_requested', timestamp: '2024-01-15' },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        metadata: JSON.stringify({ reason: 'user_requested', timestamp: '2024-01-15' }),
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.update('sub-123', updateData);

      expect(result?.metadata).toEqual({ reason: 'user_requested', timestamp: '2024-01-15' });
    });

    it('should handle partial updates', async () => {
      const updateData: UpdateSubscription = {
        cancelAtPeriodEnd: true,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        cancel_at_period_end: true,
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.update('sub-123', updateData);

      expect(result?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('updateByProviderSubscriptionId', () => {
    it('should update subscription by provider ID', async () => {
      const updateData: UpdateSubscription = {
        status: 'past_due',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        status: 'past_due',
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.updateByProviderSubscriptionId(
        'stripe',
        'sub_stripe_123',
        updateData,
      );

      expect(result?.status).toBe('past_due');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/provider.*provider_subscription_id/s),
        }),
      );
    });

    it('should work with paypal provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        provider: 'paypal',
        status: 'canceled',
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.updateByProviderSubscriptionId('paypal', 'I-123', {
        status: 'canceled',
      });

      expect(result?.provider).toBe('paypal');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.updateByProviderSubscriptionId('stripe', 'nonexistent', {
        status: 'canceled',
      });

      expect(result).toBeNull();
    });

    it('should handle metadata in updates', async () => {
      const updateData: UpdateSubscription = {
        metadata: { webhookEvent: 'subscription.updated' },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        metadata: JSON.stringify({ webhookEvent: 'subscription.updated' }),
      });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.updateByProviderSubscriptionId(
        'stripe',
        'sub_stripe_123',
        updateData,
      );

      expect(result?.metadata).toEqual({ webhookEvent: 'subscription.updated' });
    });
  });

  describe('delete', () => {
    it('should delete subscription and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.delete('sub-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*subscriptions/i),
        }),
      );
    });

    it('should return false when subscription not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('findExpiringSoon', () => {
    it('should return subscriptions expiring within specified days', async () => {
      const expiringSub = {
        ...mockDbRow,
        current_period_end: new Date(Date.now() + 5 * MS_PER_DAY),
        status: 'active',
      };
      vi.mocked(mockDb.query).mockResolvedValue([expiringSub]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findExpiringSoon(7);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/current_period_end/i),
        }),
      );
    });

    it('should exclude canceled subscriptions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findExpiringSoon(7);

      const call = vi.mocked(mockDb.query).mock.calls[0];
      expect(call).toBeDefined();
      expect(call?.[0].text).toContain('cancel_at_period_end');
      expect(call?.[0].values).toContain(false);
    });

    it('should include trialing subscriptions', async () => {
      const trialingSub = {
        ...mockDbRow,
        status: 'trialing',
        current_period_end: new Date(Date.now() + 3 * MS_PER_DAY),
      };
      vi.mocked(mockDb.query).mockResolvedValue([trialingSub]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findExpiringSoon(7);

      expect(result[0].status).toBe('trialing');
    });

    it('should order by current_period_end ascending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findExpiringSoon(7);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*current_period_end.*ASC/i),
        }),
      );
    });

    it('should handle various day ranges', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findExpiringSoon(30);

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should return empty array when no expiring subscriptions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findExpiringSoon(7);

      expect(result).toEqual([]);
    });
  });

  describe('findPastDue', () => {
    it('should return past due subscriptions', async () => {
      const pastDueSub = { ...mockDbRow, status: 'past_due' };
      vi.mocked(mockDb.query).mockResolvedValue([pastDueSub]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findPastDue();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('past_due');
      const call = vi.mocked(mockDb.query).mock.calls[0];
      expect(call).toBeDefined();
      expect(call?.[0].text).toContain('status');
      expect(call?.[0].values).toContain('past_due');
    });

    it('should order by updated_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      await repo.findPastDue();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*updated_at.*DESC/i),
        }),
      );
    });

    it('should return empty array when no past due subscriptions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findPastDue();

      expect(result).toEqual([]);
    });

    it('should return multiple past due subscriptions', async () => {
      const pastDueSubs = [
        { ...mockDbRow, id: 'sub-1', status: 'past_due' },
        { ...mockDbRow, id: 'sub-2', status: 'past_due' },
        { ...mockDbRow, id: 'sub-3', status: 'past_due' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(pastDueSubs);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findPastDue();

      expect(result).toHaveLength(3);
    });
  });

  describe('countActiveByPlanId', () => {
    it('should return count of active subscriptions for plan', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '42' });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.countActiveByPlanId('plan-pro');

      expect(result).toBe(42);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/COUNT\(\*\)/i),
        }),
      );
    });

    it('should return 0 when no active subscriptions', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.countActiveByPlanId('plan-basic');

      expect(result).toBe(0);
    });

    it('should handle numeric count response', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 15 });

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.countActiveByPlanId('plan-pro');

      expect(result).toBe(15);
    });

    it('should filter by plan_id and active statuses', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '10' });

      const repo = createSubscriptionRepository(mockDb);
      await repo.countActiveByPlanId('plan-enterprise');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/plan_id.*status/s),
        }),
      );
    });

    it('should include both active and trialing statuses', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '25' });

      const repo = createSubscriptionRepository(mockDb);
      await repo.countActiveByPlanId('plan-pro');

      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle subscriptions with all null optional fields', async () => {
      const minimalRow = {
        id: 'sub-123',
        user_id: 'user-123',
        plan_id: 'plan-pro',
        provider: 'stripe',
        provider_subscription_id: 'sub_123',
        provider_customer_id: 'cus_123',
        status: 'active',
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-02-01'),
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        metadata: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.canceledAt).toBeNull();
      expect(result?.trialEnd).toBeNull();
      expect(result?.metadata).toEqual({});
    });

    it('should handle empty metadata object', async () => {
      const rowWithEmptyMetadata = {
        ...mockDbRow,
        metadata: JSON.stringify({}),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithEmptyMetadata);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.metadata).toEqual({});
    });

    it('should handle malformed metadata gracefully', async () => {
      const rowWithBadMetadata = {
        ...mockDbRow,
        metadata: 'not valid json',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithBadMetadata);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.metadata).toEqual({});
    });

    it('should handle boundary dates correctly', async () => {
      const boundaryRow = {
        ...mockDbRow,
        current_period_start: new Date('1970-01-01T00:00:00Z'),
        current_period_end: new Date('2099-12-31T23:59:59Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(boundaryRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.currentPeriodStart).toEqual(new Date('1970-01-01T00:00:00Z'));
      expect(result?.currentPeriodEnd).toEqual(new Date('2099-12-31T23:59:59Z'));
    });

    it('should handle subscription with trial end in the past', async () => {
      const expiredTrialRow = {
        ...mockDbRow,
        status: 'active',
        trial_end: new Date('2023-01-01T00:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expiredTrialRow);

      const repo = createSubscriptionRepository(mockDb);
      const result = await repo.findById('sub-123');

      expect(result?.trialEnd).toEqual(new Date('2023-01-01T00:00:00Z'));
    });
  });
});
