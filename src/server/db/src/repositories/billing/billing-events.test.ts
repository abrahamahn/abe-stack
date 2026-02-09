// src/server/db/src/repositories/billing/billing-events.test.ts
/**
 * Tests for Billing Events Repository
 *
 * Validates webhook idempotency tracking and event recording operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createBillingEventRepository } from './billing-events';

import type { RawDb } from '../../client';
import type { BillingEvent, NewBillingEvent } from '../../schema/index';

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
});

// ============================================================================
// Test Data
// ============================================================================

const mockEvent: BillingEvent = {
  id: 'event-123',
  provider: 'stripe',
  providerEventId: 'evt_123',
  eventType: 'invoice.paid',
  payload: { amount: 1999, currency: 'usd' },
  processedAt: new Date('2024-01-01T10:00:00Z'),
  createdAt: new Date('2024-01-01T10:00:00Z'),
};

const mockDbRow = {
  id: 'event-123',
  provider: 'stripe',
  provider_event_id: 'evt_123',
  event_type: 'invoice.paid',
  payload: JSON.stringify({ amount: 1999, currency: 'usd' }),
  processed_at: new Date('2024-01-01T10:00:00Z'),
  created_at: new Date('2024-01-01T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createBillingEventRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return event when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findById('event-123');

      expect(result).toEqual(mockEvent);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('billing_events'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderEventId', () => {
    it('should return event for stripe provider', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findByProviderEventId('stripe', 'evt_123');

      expect(result).toEqual(mockEvent);
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should return event for paypal provider', async () => {
      const paypalRow = { ...mockDbRow, provider: 'paypal', provider_event_id: 'pp_123' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(paypalRow);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findByProviderEventId('paypal', 'pp_123');

      expect(result?.provider).toBe('paypal');
      expect(result?.providerEventId).toBe('pp_123');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findByProviderEventId('stripe', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('wasProcessed', () => {
    it('should return true when event exists', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ exists: '1' });

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.wasProcessed('stripe', 'evt_123');

      expect(result).toBe(true);
    });

    it('should return false when event does not exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.wasProcessed('stripe', 'evt_999');

      expect(result).toBe(false);
    });

    it('should check both provider and providerEventId', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createBillingEventRepository(mockDb);
      await repo.wasProcessed('paypal', 'evt_123');

      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('recordEvent', () => {
    it('should insert and return new event', async () => {
      const newEvent: NewBillingEvent = {
        provider: 'stripe',
        providerEventId: 'evt_new',
        eventType: 'subscription.created',
        payload: { invoiceId: 'inv_123' },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        provider_event_id: 'evt_new',
        event_type: 'subscription.created',
        payload: JSON.stringify({ invoiceId: 'inv_123' }),
      });

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.recordEvent(newEvent);

      expect(result.providerEventId).toBe('evt_new');
      expect(result.eventType).toBe('subscription.created');
      expect(result.payload).toEqual({ invoiceId: 'inv_123' });
    });

    it('should set processedAt if not provided', async () => {
      const newEvent: NewBillingEvent = {
        provider: 'stripe',
        providerEventId: 'evt_new',
        eventType: 'invoice.payment_failed',
        payload: {},
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createBillingEventRepository(mockDb);
      await repo.recordEvent(newEvent);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should stringify payload object', async () => {
      const newEvent: NewBillingEvent = {
        provider: 'stripe',
        providerEventId: 'evt_new',
        eventType: 'invoice.paid',
        payload: { complex: { nested: 'data' } },
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        payload: JSON.stringify({ complex: { nested: 'data' } }),
      });

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.recordEvent(newEvent);

      expect(result.payload).toEqual({ complex: { nested: 'data' } });
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createBillingEventRepository(mockDb);

      await expect(
        repo.recordEvent({
          provider: 'stripe',
          providerEventId: 'evt_fail',
          eventType: 'test' as never,
          payload: {},
        }),
      ).rejects.toThrow('Failed to record billing event');
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete events older than specified date', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createBillingEventRepository(mockDb);
      const cutoffDate = new Date('2023-12-01');
      const result = await repo.deleteOlderThan(cutoffDate);

      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return 0 if no events deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.deleteOlderThan(new Date());

      expect(result).toBe(0);
    });
  });

  describe('listByType', () => {
    it('should return events filtered by type', async () => {
      const events = [mockDbRow, { ...mockDbRow, id: 'event-456' }];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.listByType('invoice.paid');

      expect(result).toHaveLength(2);
      expect(result[0]?.eventType).toBe('invoice.paid');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should respect default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createBillingEventRepository(mockDb);
      await repo.listByType('invoice.paid');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });

    it('should accept custom limit', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createBillingEventRepository(mockDb);
      await repo.listByType('subscription.created', 50);

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should return empty array if no events found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.listByType('nonexistent_type' as never);

      expect(result).toEqual([]);
    });

    it('should order by createdAt descending', async () => {
      const events = [
        { ...mockDbRow, id: 'event-1', created_at: new Date('2024-01-02') },
        { ...mockDbRow, id: 'event-2', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(events);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.listByType('invoice.paid');

      expect(result[0]?.id).toBe('event-1');
      expect(result[1]?.id).toBe('event-2');
    });
  });

  describe('payload parsing', () => {
    it('should parse JSONB payload correctly', async () => {
      const rowWithJsonb = {
        ...mockDbRow,
        payload: JSON.stringify({ complex: { data: [1, 2, 3] } }),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithJsonb);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findById('event-123');

      expect(result?.payload).toEqual({ complex: { data: [1, 2, 3] } });
    });

    it('should handle null payload', async () => {
      const rowWithNullPayload = { ...mockDbRow, payload: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithNullPayload);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findById('event-123');

      expect(result?.payload).toEqual({});
    });

    it('should handle empty payload', async () => {
      const rowWithEmptyPayload = { ...mockDbRow, payload: JSON.stringify({}) };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithEmptyPayload);

      const repo = createBillingEventRepository(mockDb);
      const result = await repo.findById('event-123');

      expect(result?.payload).toEqual({});
    });
  });
});
