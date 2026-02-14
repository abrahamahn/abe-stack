// main/server/db/src/repositories/system/webhook-deliveries.test.ts
/**
 * Tests for Webhook Deliveries Repository
 *
 * Validates webhook delivery tracking operations including delivery creation,
 * ID lookups, webhook filtering, status filtering, and delivery updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWebhookDeliveryRepository } from './webhook-deliveries';

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

const mockDelivery = {
  id: 'del-123',
  webhook_id: 'wh-123',
  event_type: 'user.created',
  payload: { userId: 'usr-123', email: 'test@example.com' },
  status: 'pending',
  attempt_count: 0,
  max_attempts: 3,
  next_retry_at: null,
  response_status: null,
  response_body: null,
  error_message: null,
  delivered_at: null,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createWebhookDeliveryRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new delivery', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.create({
        webhookId: 'wh-123',
        eventType: 'user.created',
        payload: { userId: 'usr-123', email: 'test@example.com' },
        status: 'pending',
      });

      expect(result.webhookId).toBe('wh-123');
      expect(result.eventType).toBe('user.created');
      expect(result.status).toBe('pending');
      expect(result.payload).toEqual({ userId: 'usr-123', email: 'test@example.com' });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookDeliveryRepository(mockDb);

      await expect(
        repo.create({
          webhookId: 'wh-123',
          eventType: 'user.created',
          payload: { userId: 'usr-123' },
          status: 'pending',
        }),
      ).rejects.toThrow('Failed to create webhook delivery');
    });

    it('should handle optional fields', async () => {
      const deliveryWithDefaults = {
        ...mockDelivery,
        attempt_count: 0,
        max_attempts: 3,
        next_retry_at: null,
        response_status: null,
        response_body: null,
        error_message: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithDefaults);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.create({
        webhookId: 'wh-123',
        eventType: 'user.created',
        payload: { userId: 'usr-123' },
        status: 'pending',
      });

      expect(result.attemptCount).toBe(0);
      expect(result.maxAttempts).toBe(3);
      expect(result.nextRetryAt).toBeNull();
      expect(result.responseStatus).toBeNull();
    });

    it('should handle complex payloads', async () => {
      const complexPayload = {
        user: {
          id: 'usr-123',
          email: 'test@example.com',
          metadata: { source: 'api', plan: 'pro' },
        },
        timestamp: '2024-01-01T10:00:00Z',
      };
      const deliveryWithComplexPayload = {
        ...mockDelivery,
        payload: complexPayload,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithComplexPayload);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.create({
        webhookId: 'wh-123',
        eventType: 'user.created',
        payload: complexPayload,
        status: 'pending',
      });

      expect(result.payload).toEqual(complexPayload);
    });

    it('should handle different event types', async () => {
      const eventTypes = [
        'user.created',
        'user.updated',
        'payment.processed',
        'subscription.cancelled',
      ];

      for (const eventType of eventTypes) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockDelivery,
          event_type: eventType,
        });

        const repo = createWebhookDeliveryRepository(mockDb);
        const result = await repo.create({
          webhookId: 'wh-123',
          eventType,
          payload: { data: 'test' },
          status: 'pending',
        });

        expect(result.eventType).toBe(eventType);
      }
    });
  });

  describe('findById', () => {
    it('should return delivery when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('del-123');
      expect(result?.webhookId).toBe('wh-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-nonexistent');

      expect(result).toBeNull();
    });

    it('should include all delivery fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.webhookId).toBe('wh-123');
      expect(result?.eventType).toBe('user.created');
      expect(result?.status).toBe('pending');
      expect(result?.attemptCount).toBe(0);
      expect(result?.maxAttempts).toBe(3);
    });
  });

  describe('findByWebhookId', () => {
    it('should return array of deliveries for webhook with default limit', async () => {
      const deliveries = [
        mockDelivery,
        { ...mockDelivery, id: 'del-456', status: 'delivered' },
        { ...mockDelivery, id: 'del-789', status: 'failed' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByWebhookId('wh-123');

      expect(result).toHaveLength(3);
      expect(result.every((d) => d.webhookId === 'wh-123')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('webhook_id'),
        }),
      );
    });

    it('should return empty array when webhook has no deliveries', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByWebhookId('wh-new');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDelivery]);

      const repo = createWebhookDeliveryRepository(mockDb);
      await repo.findByWebhookId('wh-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });

    it('should respect custom limit', async () => {
      const deliveries = Array.from({ length: 50 }, (_, i) => ({
        ...mockDelivery,
        id: `del-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByWebhookId('wh-123', 50);

      expect(result).toHaveLength(50);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });

    it('should return deliveries with different statuses', async () => {
      const deliveries = [
        { ...mockDelivery, id: 'del-1', status: 'pending' },
        { ...mockDelivery, id: 'del-2', status: 'delivered' },
        { ...mockDelivery, id: 'del-3', status: 'failed' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByWebhookId('wh-123');

      expect(result.map((d) => d.status)).toEqual(['pending', 'delivered', 'failed']);
    });
  });

  describe('findByStatus', () => {
    it('should return array of deliveries with status', async () => {
      const deliveries = [mockDelivery, { ...mockDelivery, id: 'del-456', webhook_id: 'wh-456' }];
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByStatus('pending');

      expect(result).toHaveLength(2);
      expect(result.every((d) => d.status === 'pending')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status'),
        }),
      );
    });

    it('should return empty array when no deliveries with status', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByStatus('delivered');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDelivery]);

      const repo = createWebhookDeliveryRepository(mockDb);
      await repo.findByStatus('pending');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });

    it('should respect custom limit', async () => {
      const deliveries = Array.from({ length: 25 }, (_, i) => ({
        ...mockDelivery,
        id: `del-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByStatus('pending', 25);

      expect(result).toHaveLength(25);
    });

    it('should handle different status values', async () => {
      const statuses = ['pending', 'delivering', 'delivered', 'failed'];

      for (const status of statuses) {
        vi.mocked(mockDb.query).mockResolvedValue([{ ...mockDelivery, status }]);

        const repo = createWebhookDeliveryRepository(mockDb);
        const result = await repo.findByStatus(status);

        expect(result[0].status).toBe(status);
      }
    });

    it('should return deliveries across different webhooks', async () => {
      const deliveries = [
        { ...mockDelivery, id: 'del-1', webhook_id: 'wh-123' },
        { ...mockDelivery, id: 'del-2', webhook_id: 'wh-456' },
        { ...mockDelivery, id: 'del-3', webhook_id: 'wh-789' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(deliveries);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findByStatus('pending');

      expect(result.map((d) => d.webhookId)).toEqual(['wh-123', 'wh-456', 'wh-789']);
    });
  });

  describe('update', () => {
    it('should update delivery and return updated delivery', async () => {
      const updatedDelivery = {
        ...mockDelivery,
        status: 'delivered',
        response_status: 200,
        delivered_at: new Date('2024-01-01T10:05:00Z'),
        updated_at: new Date('2024-01-01T10:05:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', {
        status: 'delivered',
        responseStatus: 200,
        deliveredAt: new Date('2024-01-01T10:05:00Z'),
      });

      expect(result?.status).toBe('delivered');
      expect(result?.responseStatus).toBe(200);
      expect(result?.deliveredAt).toEqual(new Date('2024-01-01T10:05:00Z'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when delivery not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-nonexistent', { status: 'failed' });

      expect(result).toBeNull();
    });

    it('should update status to failed with error message', async () => {
      const failedDelivery = {
        ...mockDelivery,
        status: 'failed',
        error_message: 'Connection timeout',
        attempt_count: 1,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(failedDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', {
        status: 'failed',
        errorMessage: 'Connection timeout',
        attemptCount: 1,
      });

      expect(result?.status).toBe('failed');
      expect(result?.errorMessage).toBe('Connection timeout');
      expect(result?.attemptCount).toBe(1);
    });

    it('should update response details', async () => {
      const deliveryWithResponse = {
        ...mockDelivery,
        response_status: 200,
        response_body: { success: true, id: 'evt-123' },
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithResponse);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', {
        responseStatus: 200,
        responseBody: { success: true, id: 'evt-123' },
      });

      expect(result?.responseStatus).toBe(200);
      expect(result?.responseBody).toEqual({ success: true, id: 'evt-123' });
    });

    it('should update next retry time', async () => {
      const retryTime = new Date('2024-01-01T10:10:00Z');
      const deliveryWithRetry = {
        ...mockDelivery,
        status: 'pending',
        attempt_count: 1,
        next_retry_at: retryTime,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithRetry);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', {
        attemptCount: 1,
        nextRetryAt: retryTime,
      });

      expect(result?.attemptCount).toBe(1);
      expect(result?.nextRetryAt).toEqual(retryTime);
    });

    it('should increment attempt count', async () => {
      const retriedDelivery = {
        ...mockDelivery,
        attempt_count: 2,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(retriedDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', { attemptCount: 2 });

      expect(result?.attemptCount).toBe(2);
    });

    it('should update multiple fields at once', async () => {
      const updatedDelivery = {
        ...mockDelivery,
        status: 'failed',
        attempt_count: 3,
        error_message: 'Max retries exceeded',
        response_status: 500,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.update('del-123', {
        status: 'failed',
        attemptCount: 3,
        errorMessage: 'Max retries exceeded',
        responseStatus: 500,
      });

      expect(result?.status).toBe('failed');
      expect(result?.attemptCount).toBe(3);
      expect(result?.errorMessage).toBe('Max retries exceeded');
      expect(result?.responseStatus).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('should handle deliveries with max attempts reached', async () => {
      const maxAttemptsDelivery = {
        ...mockDelivery,
        attempt_count: 3,
        max_attempts: 3,
        status: 'failed',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(maxAttemptsDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.attemptCount).toBe(3);
      expect(result?.maxAttempts).toBe(3);
      expect(result?.status).toBe('failed');
    });

    it('should handle null response body', async () => {
      const deliveryWithoutResponse = {
        ...mockDelivery,
        response_status: 200,
        response_body: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithoutResponse);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.responseBody).toBeNull();
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` })),
      };
      const deliveryWithLargePayload = {
        ...mockDelivery,
        payload: largePayload,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithLargePayload);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.payload).toEqual(largePayload);
    });

    it('should handle different HTTP status codes', async () => {
      const statusCodes = [200, 201, 400, 401, 404, 500, 502, 503];

      for (const status of statusCodes) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockDelivery,
          response_status: status,
        });

        const repo = createWebhookDeliveryRepository(mockDb);
        const result = await repo.findById('del-123');

        expect(result?.responseStatus).toBe(status);
      }
    });

    it('should handle long error messages', async () => {
      const longError = 'Error: ' + 'A'.repeat(2000);
      const deliveryWithLongError = {
        ...mockDelivery,
        status: 'failed',
        error_message: longError,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithLongError);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.errorMessage).toBe(longError);
    });

    it('should handle complex response bodies', async () => {
      const complexResponse = {
        status: 'success',
        data: { id: 'evt-123', timestamp: '2024-01-01T10:00:00Z' },
        meta: { version: '1.0', requestId: 'req-123' },
      };
      const deliveryWithComplexResponse = {
        ...mockDelivery,
        response_body: complexResponse,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithComplexResponse);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.responseBody).toEqual(complexResponse);
    });

    it('should handle future retry times', async () => {
      const futureRetry = new Date('2025-01-01T00:00:00Z');
      const deliveryWithFutureRetry = {
        ...mockDelivery,
        next_retry_at: futureRetry,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deliveryWithFutureRetry);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.nextRetryAt).toEqual(futureRetry);
    });

    it('should handle null delivered_at for pending deliveries', async () => {
      const pendingDelivery = {
        ...mockDelivery,
        status: 'pending',
        delivered_at: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(pendingDelivery);

      const repo = createWebhookDeliveryRepository(mockDb);
      const result = await repo.findById('del-123');

      expect(result?.deliveredAt).toBeNull();
    });
  });
});
