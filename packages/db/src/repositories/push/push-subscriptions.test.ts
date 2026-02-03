// packages/db/src/repositories/push/push-subscriptions.test.ts
/**
 * Tests for Push Subscriptions Repository
 *
 * Validates push notification subscription operations including subscription
 * creation, endpoint lookups, user subscriptions, and device management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPushSubscriptionRepository } from './push-subscriptions';

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

const mockPushSubscription = {
  id: 'ps-123',
  user_id: 'usr-123',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expiration_time: null,
  keys_p256dh: 'p256dh-key',
  keys_auth: 'auth-key',
  device_id: 'device-123',
  user_agent: 'Mozilla/5.0',
  is_active: true,
  created_at: new Date('2024-01-01'),
  last_used_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createPushSubscriptionRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new push subscription', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPushSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc123');
      expect(result.keysP256dh).toBe('p256dh-key');
      expect(result.keysAuth).toBe('auth-key');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPushSubscriptionRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          keysP256dh: 'p256dh-key',
          keysAuth: 'auth-key',
          deviceId: 'device-123',
        }),
      ).rejects.toThrow('Failed to create push subscription');
    });

    it('should handle optional expiration time', async () => {
      const subscriptionWithExpiration = {
        ...mockPushSubscription,
        expiration_time: new Date('2024-12-31'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(subscriptionWithExpiration);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
        expirationTime: new Date('2024-12-31'),
      });

      expect(result.expirationTime).toEqual(new Date('2024-12-31'));
    });

    it('should handle optional user agent', async () => {
      const subscriptionWithoutUserAgent = {
        ...mockPushSubscription,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(subscriptionWithoutUserAgent);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
      });

      expect(result.userAgent).toBeNull();
    });

    it('should default is_active to true', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPushSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
      });

      expect(result.isActive).toBe(true);
    });
  });

  describe('findByUserId', () => {
    it('should return array of subscriptions for user', async () => {
      const subscriptions = [
        mockPushSubscription,
        { ...mockPushSubscription, id: 'ps-456', device_id: 'device-456' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(subscriptions);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[1].userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no subscriptions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should return only active subscriptions by default', async () => {
      const activeSubscriptions = [
        mockPushSubscription,
        { ...mockPushSubscription, id: 'ps-456', is_active: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(activeSubscriptions);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result.every((sub) => sub.isActive)).toBe(true);
    });

    it('should handle multiple devices for same user', async () => {
      const multiDeviceSubscriptions = [
        mockPushSubscription,
        { ...mockPushSubscription, id: 'ps-456', device_id: 'device-mobile' },
        { ...mockPushSubscription, id: 'ps-789', device_id: 'device-tablet' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multiDeviceSubscriptions);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.deviceId)).toEqual([
        'device-123',
        'device-mobile',
        'device-tablet',
      ]);
    });
  });

  describe('findByEndpoint', () => {
    it('should return subscription when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPushSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result).toBeDefined();
      expect(result?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('endpoint'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://nonexistent.com');

      expect(result).toBeNull();
    });

    it('should handle exact endpoint matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockPushSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
      await repo.findByEndpoint(endpoint);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([endpoint]),
        }),
      );
    });

    it('should return inactive subscriptions if they exist', async () => {
      const inactiveSubscription = {
        ...mockPushSubscription,
        is_active: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(inactiveSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result?.isActive).toBe(false);
    });
  });

  describe('deleteByEndpoint', () => {
    it('should delete subscription and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.deleteByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when subscription not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.deleteByEndpoint('https://nonexistent.com');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPushSubscriptionRepository(mockDb);
      await repo.deleteByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*push_subscriptions/s),
        }),
      );
    });

    it('should only delete exact endpoint match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPushSubscriptionRepository(mockDb);
      const endpoint = 'https://fcm.googleapis.com/fcm/send/specific123';
      await repo.deleteByEndpoint(endpoint);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([endpoint]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null device ID', async () => {
      const subscriptionWithoutDevice = {
        ...mockPushSubscription,
        device_id: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(subscriptionWithoutDevice);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result?.deviceId).toBeNull();
    });

    it('should handle subscriptions with expiration', async () => {
      const expiringSubscription = {
        ...mockPushSubscription,
        expiration_time: new Date('2024-12-31'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expiringSubscription);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result?.expirationTime).toEqual(new Date('2024-12-31'));
    });

    it('should handle very long endpoint URLs', async () => {
      const longEndpoint = 'https://fcm.googleapis.com/fcm/send/' + 'A'.repeat(500);
      const subscriptionWithLongEndpoint = {
        ...mockPushSubscription,
        endpoint: longEndpoint,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(subscriptionWithLongEndpoint);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        endpoint: longEndpoint,
        keysP256dh: 'p256dh-key',
        keysAuth: 'auth-key',
      });

      expect(result.endpoint).toBe(longEndpoint);
    });

    it('should handle last_used_at updates', async () => {
      const recentlyUsed = {
        ...mockPushSubscription,
        last_used_at: new Date('2024-01-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(recentlyUsed);

      const repo = createPushSubscriptionRepository(mockDb);
      const result = await repo.findByEndpoint('https://fcm.googleapis.com/fcm/send/abc123');

      expect(result?.lastUsedAt).toEqual(new Date('2024-01-15'));
    });

    it('should handle different push service endpoints', async () => {
      const endpoints = [
        'https://fcm.googleapis.com/fcm/send/abc123',
        'https://updates.push.services.mozilla.com/wpush/v1/def456',
        'https://android.googleapis.com/gcm/send/ghi789',
      ];

      for (const endpoint of endpoints) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockPushSubscription,
          endpoint,
        });

        const repo = createPushSubscriptionRepository(mockDb);
        const result = await repo.findByEndpoint(endpoint);

        expect(result?.endpoint).toBe(endpoint);
      }
    });
  });
});
