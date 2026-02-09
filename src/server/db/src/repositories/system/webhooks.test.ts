// src/server/db/src/repositories/system/webhooks.test.ts
/**
 * Tests for Webhooks Repository
 *
 * Validates webhook registration operations including webhook creation,
 * ID lookups, tenant filtering, event-based queries, updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWebhookRepository } from './webhooks';

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

const mockWebhook = {
  id: 'wh-123',
  tenant_id: 'tenant-123',
  url: 'https://example.com/webhook',
  secret: 'whsec_abc123',
  events: ['user.created', 'user.updated'],
  is_active: true,
  retry_max: 3,
  retry_backoff: 1000,
  timeout_ms: 5000,
  headers: { 'X-Custom': 'value' },
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createWebhookRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new webhook', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        url: 'https://example.com/webhook',
        secret: 'whsec_abc123',
        events: ['user.created', 'user.updated'],
        isActive: true,
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.url).toBe('https://example.com/webhook');
      expect(result.events).toEqual(['user.created', 'user.updated']);
      expect(result.isActive).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          url: 'https://example.com/webhook',
          secret: 'whsec_abc123',
          events: ['user.created'],
        }),
      ).rejects.toThrow('Failed to create webhook');
    });

    it('should handle optional fields', async () => {
      const webhookWithDefaults = {
        ...mockWebhook,
        retry_max: 3,
        retry_backoff: 1000,
        timeout_ms: 5000,
        headers: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithDefaults);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        url: 'https://example.com/webhook',
        secret: 'whsec_abc123',
        events: ['user.created'],
      });

      expect(result.retryMax).toBe(3);
      expect(result.retryBackoff).toBe(1000);
      expect(result.timeoutMs).toBe(5000);
    });

    it('should handle custom headers', async () => {
      const customHeaders = {
        'X-Custom': 'value',
        Authorization: 'Bearer token',
      };
      const webhookWithHeaders = {
        ...mockWebhook,
        headers: customHeaders,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithHeaders);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        url: 'https://example.com/webhook',
        secret: 'whsec_abc123',
        events: ['user.created'],
        headers: customHeaders,
      });

      expect(result.headers).toEqual(customHeaders);
    });

    it('should handle multiple events', async () => {
      const multipleEvents = ['user.created', 'user.updated', 'user.deleted', 'payment.processed'];
      const webhookWithMultipleEvents = {
        ...mockWebhook,
        events: multipleEvents,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithMultipleEvents);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        url: 'https://example.com/webhook',
        secret: 'whsec_abc123',
        events: multipleEvents,
      });

      expect(result.events).toEqual(multipleEvents);
    });
  });

  describe('findById', () => {
    it('should return webhook when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('wh-123');
      expect(result?.url).toBe('https://example.com/webhook');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-nonexistent');

      expect(result).toBeNull();
    });

    it('should include all webhook fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.url).toBe('https://example.com/webhook');
      expect(result?.events).toEqual(['user.created', 'user.updated']);
      expect(result?.isActive).toBe(true);
    });
  });

  describe('findByTenantId', () => {
    it('should return array of webhooks for tenant', async () => {
      const webhooks = [
        mockWebhook,
        { ...mockWebhook, id: 'wh-456', url: 'https://example.com/webhook2' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(webhooks);

      const repo = createWebhookRepository(mockDb);
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

    it('should return empty array when tenant has no webhooks', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockWebhook]);

      const repo = createWebhookRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });

    it('should return both active and inactive webhooks', async () => {
      const webhooks = [mockWebhook, { ...mockWebhook, id: 'wh-456', is_active: false }];
      vi.mocked(mockDb.query).mockResolvedValue(webhooks);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(2);
      expect(result.some((w) => w.isActive)).toBe(true);
      expect(result.some((w) => !w.isActive)).toBe(true);
    });
  });

  describe('findActiveByEvent', () => {
    it('should return array of active webhooks subscribed to event', async () => {
      const webhooks = [mockWebhook, { ...mockWebhook, id: 'wh-456', tenant_id: 'tenant-456' }];
      vi.mocked(mockDb.query).mockResolvedValue(webhooks);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findActiveByEvent('user.created');

      expect(result).toHaveLength(2);
      expect(result.every((w) => w.isActive)).toBe(true);
      expect(result.every((w) => w.events.includes('user.created'))).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/is_active.*events/s),
        }),
      );
    });

    it('should return empty array when no webhooks for event', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findActiveByEvent('user.deleted');

      expect(result).toEqual([]);
    });

    it('should only return active webhooks', async () => {
      const activeWebhooks = [mockWebhook, { ...mockWebhook, id: 'wh-456', is_active: true }];
      vi.mocked(mockDb.query).mockResolvedValue(activeWebhooks);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findActiveByEvent('user.created');

      expect(result.every((w) => w.isActive)).toBe(true);
    });

    it('should handle webhooks across different tenants', async () => {
      const webhooks = [
        mockWebhook,
        { ...mockWebhook, id: 'wh-456', tenant_id: 'tenant-456' },
        { ...mockWebhook, id: 'wh-789', tenant_id: 'tenant-789' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(webhooks);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findActiveByEvent('user.created');

      expect(result).toHaveLength(3);
      expect(result.map((w) => w.tenantId)).toEqual(['tenant-123', 'tenant-456', 'tenant-789']);
    });

    it('should verify event in array query', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockWebhook]);

      const repo = createWebhookRepository(mockDb);
      await repo.findActiveByEvent('user.created');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ANY.*events/s),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update webhook and return updated webhook', async () => {
      const updatedWebhook = {
        ...mockWebhook,
        is_active: false,
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-123', { isActive: false });

      expect(result?.isActive).toBe(false);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when webhook not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-nonexistent', { isActive: false });

      expect(result).toBeNull();
    });

    it('should update URL', async () => {
      const updatedWebhook = {
        ...mockWebhook,
        url: 'https://newdomain.com/webhook',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-123', {
        url: 'https://newdomain.com/webhook',
      });

      expect(result?.url).toBe('https://newdomain.com/webhook');
    });

    it('should update events array', async () => {
      const newEvents = ['user.created', 'user.updated', 'user.deleted'];
      const updatedWebhook = {
        ...mockWebhook,
        events: newEvents,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-123', { events: newEvents });

      expect(result?.events).toEqual(newEvents);
    });

    it('should update multiple fields', async () => {
      const updatedWebhook = {
        ...mockWebhook,
        url: 'https://newdomain.com/webhook',
        is_active: false,
        retry_max: 5,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-123', {
        url: 'https://newdomain.com/webhook',
        isActive: false,
        retryMax: 5,
      });

      expect(result?.url).toBe('https://newdomain.com/webhook');
      expect(result?.isActive).toBe(false);
      expect(result?.retryMax).toBe(5);
    });

    it('should update headers', async () => {
      const newHeaders = { 'X-New-Header': 'new-value' };
      const updatedWebhook = {
        ...mockWebhook,
        headers: newHeaders,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.update('wh-123', { headers: newHeaders });

      expect(result?.headers).toEqual(newHeaders);
    });
  });

  describe('delete', () => {
    it('should delete webhook and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.delete('wh-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when webhook not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.delete('wh-nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebhookRepository(mockDb);
      await repo.delete('wh-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*webhooks/s),
        }),
      );
    });

    it('should only delete exact ID match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebhookRepository(mockDb);
      const webhookId = 'wh-specific-123';
      await repo.delete(webhookId);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([webhookId]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle webhooks with single event', async () => {
      const singleEventWebhook = {
        ...mockWebhook,
        events: ['user.created'],
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(singleEventWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.events).toEqual(['user.created']);
    });

    it('should handle webhooks with many events', async () => {
      const manyEvents = Array.from({ length: 20 }, (_, i) => `event.type${i}`);
      const manyEventsWebhook = {
        ...mockWebhook,
        events: manyEvents,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(manyEventsWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.events).toEqual(manyEvents);
    });

    it('should handle null headers', async () => {
      const webhookWithoutHeaders = {
        ...mockWebhook,
        headers: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithoutHeaders);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.headers).toBeNull();
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/webhook/' + 'a'.repeat(500);
      const webhookWithLongUrl = {
        ...mockWebhook,
        url: longUrl,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithLongUrl);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.url).toBe(longUrl);
    });

    it('should handle custom retry configurations', async () => {
      const customRetryWebhook = {
        ...mockWebhook,
        retry_max: 10,
        retry_backoff: 5000,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(customRetryWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.retryMax).toBe(10);
      expect(result?.retryBackoff).toBe(5000);
    });

    it('should handle custom timeout values', async () => {
      const customTimeoutWebhook = {
        ...mockWebhook,
        timeout_ms: 30000,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(customTimeoutWebhook);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.timeoutMs).toBe(30000);
    });

    it('should handle different URL protocols', async () => {
      const protocols = [
        'https://secure.example.com/webhook',
        'http://insecure.example.com/webhook',
      ];

      for (const url of protocols) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockWebhook,
          url,
        });

        const repo = createWebhookRepository(mockDb);
        const result = await repo.findById('wh-123');

        expect(result?.url).toBe(url);
      }
    });

    it('should handle complex header objects', async () => {
      const complexHeaders = {
        Authorization: 'Bearer token123',
        'X-Custom': 'value',
        'X-Tenant-ID': 'tenant-123',
        'Content-Type': 'application/json',
      };
      const webhookWithComplexHeaders = {
        ...mockWebhook,
        headers: complexHeaders,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(webhookWithComplexHeaders);

      const repo = createWebhookRepository(mockDb);
      const result = await repo.findById('wh-123');

      expect(result?.headers).toEqual(complexHeaders);
    });
  });
});
