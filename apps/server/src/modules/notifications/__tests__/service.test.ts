// apps/server/src/modules/notifications/__tests__/service.test.ts
/**
 * Notification Service Tests
 *
 * Tests for notification business logic.
 */

import { SubscriptionExistsError } from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


import {
  broadcast,
  clearAllData,
  getActiveSubscriptionCount,
  getPreferences,
  getSubscriptionById,
  getSubscriptionCount,
  getUserSubscriptions,
  getVapidPublicKey,
  sendToUser,
  sendToUsers,
  shouldSendNotification,
  subscribe,
  unsubscribe,
  updatePreferences,
} from '../service';

import type { NotificationPayload, PushSubscription } from '@abe-stack/core';
import type { NotificationService, PushNotificationProvider } from '@infrastructure/notifications';

describe('Notification Service', () => {
  const testUserId = 'user-123';
  const testSubscription: PushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test123',
    expirationTime: null,
    keys: {
      p256dh: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
      auth: 'UUxI4O8k2r',
    },
  };

  beforeEach(() => {
    clearAllData();
  });

  afterEach(() => {
    clearAllData();
  });

  describe('subscribe', () => {
    it('should create new subscription', () => {
      const id = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const sub = getSubscriptionById(id);
      expect(sub).toBeDefined();
      expect(sub?.userId).toBe(testUserId);
      expect(sub?.endpoint).toBe(testSubscription.endpoint);
    });

    it('should update existing subscription for same user', () => {
      const id1 = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');
      const id2 = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      expect(id1).toBe(id2);
      expect(getSubscriptionCount()).toBe(1);
    });

    it('should throw for duplicate endpoint from different user', () => {
      subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      expect(() => subscribe('other-user', testSubscription, 'device-2', 'Mozilla/5.0')).toThrow(
        SubscriptionExistsError,
      );
    });

    it('should allow multiple subscriptions per user', () => {
      const sub1 = { ...testSubscription, endpoint: 'https://example.com/1' };
      const sub2 = { ...testSubscription, endpoint: 'https://example.com/2' };

      subscribe(testUserId, sub1, 'device-1', 'Mozilla/5.0');
      subscribe(testUserId, sub2, 'device-2', 'Mozilla/5.0');

      const subs = getUserSubscriptions(testUserId);
      expect(subs).toHaveLength(2);
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription by ID', () => {
      const id = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      const result = unsubscribe(id);

      expect(result).toBe(true);
      expect(getSubscriptionById(id)).toBeUndefined();
      expect(getSubscriptionCount()).toBe(0);
    });

    it('should remove subscription by endpoint', () => {
      const id = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      const result = unsubscribe(undefined, testSubscription.endpoint);

      expect(result).toBe(true);
      expect(getSubscriptionById(id)).toBeUndefined();
    });

    it('should return false for non-existent subscription', () => {
      const result = unsubscribe('non-existent-id');
      expect(result).toBe(false);
    });

    it('should update user subscription index', () => {
      const id = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      unsubscribe(id);

      expect(getUserSubscriptions(testUserId)).toHaveLength(0);
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return empty array for user with no subscriptions', () => {
      const subs = getUserSubscriptions('unknown-user');
      expect(subs).toEqual([]);
    });

    it('should return only active subscriptions', () => {
      const id = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      // Mark as inactive
      const sub = getSubscriptionById(id);
      if (sub) sub.isActive = false;

      const subs = getUserSubscriptions(testUserId);
      expect(subs).toHaveLength(0);
    });
  });

  describe('getActiveSubscriptionCount', () => {
    it('should count only active subscriptions', () => {
      const id1 = subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');
      subscribe(
        testUserId,
        { ...testSubscription, endpoint: 'https://example.com/2' },
        'device-2',
        'Mozilla/5.0',
      );

      // Mark one as inactive
      const sub = getSubscriptionById(id1);
      if (sub) sub.isActive = false;

      expect(getActiveSubscriptionCount()).toBe(1);
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences for new user', () => {
      const prefs = getPreferences(testUserId);

      expect(prefs.userId).toBe(testUserId);
      expect(prefs.globalEnabled).toBe(true);
      expect(prefs.types.security.enabled).toBe(true);
      expect(prefs.types.marketing.enabled).toBe(false);
    });

    it('should return existing preferences', () => {
      const initial = getPreferences(testUserId);
      const again = getPreferences(testUserId);

      expect(again.updatedAt).toEqual(initial.updatedAt);
    });
  });

  describe('updatePreferences', () => {
    it('should update globalEnabled', () => {
      const prefs = updatePreferences(testUserId, { globalEnabled: false });

      expect(prefs.globalEnabled).toBe(false);
    });

    it('should update quietHours', () => {
      const prefs = updatePreferences(testUserId, {
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 7,
          timezone: 'America/New_York',
        },
      });

      expect(prefs.quietHours.enabled).toBe(true);
      expect(prefs.quietHours.startHour).toBe(22);
      expect(prefs.quietHours.endHour).toBe(7);
    });

    it('should update type preferences', () => {
      const prefs = updatePreferences(testUserId, {
        types: {
          marketing: { enabled: true, channels: ['email'] },
          security: { enabled: false },
        },
      });

      expect(prefs.types.marketing.enabled).toBe(true);
      expect(prefs.types.marketing.channels).toEqual(['email']);
      expect(prefs.types.security.enabled).toBe(false);
    });

    it('should update timestamp', () => {
      const initial = getPreferences(testUserId);
      const initialTime = initial.updatedAt;

      // Wait a tiny bit
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      const updated = updatePreferences(testUserId, { globalEnabled: false });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialTime.getTime());

      vi.useRealTimers();
    });
  });

  describe('shouldSendNotification', () => {
    const notifUserId = 'notif-user-123'; // Separate from testUserId

    it('should return true for enabled notification type', () => {
      const result = shouldSendNotification(notifUserId, 'security');
      expect(result).toBe(true);
    });

    it('should return false when globalEnabled is false', () => {
      const userId = 'notif-user-global';
      updatePreferences(userId, { globalEnabled: false });

      const result = shouldSendNotification(userId, 'security');
      expect(result).toBe(false);
    });

    it('should return false when type is disabled', () => {
      const userId = 'notif-user-type';
      updatePreferences(userId, {
        types: { security: { enabled: false } },
      });

      const result = shouldSendNotification(userId, 'security');
      expect(result).toBe(false);
    });

    it('should return false when push channel not enabled', () => {
      const userId = 'notif-user-channel';
      updatePreferences(userId, {
        types: { security: { channels: ['email'] } },
      });

      const result = shouldSendNotification(userId, 'security');
      expect(result).toBe(false);
    });

    it('should return false during quiet hours', () => {
      const userId = 'notif-user-quiet';
      const now = new Date();
      const currentHour = now.getHours();

      updatePreferences(userId, {
        quietHours: {
          enabled: true,
          startHour: currentHour,
          endHour: (currentHour + 2) % 24,
        },
      });

      const result = shouldSendNotification(userId, 'security');
      expect(result).toBe(false);
    });
  });

  describe('sendToUser', () => {
    const testPayload: NotificationPayload = {
      title: 'Test',
      body: 'Test body',
    };

    it('should send to user subscriptions', async () => {
      const mockSendBatch = vi.fn().mockResolvedValue({
        total: 1,
        successful: 1,
        failed: 0,
        results: [{ success: true, subscriptionId: 'sub-1' }],
        expiredSubscriptions: [],
      });

      const mockProvider: PushNotificationProvider = {
        name: 'mock',
        isConfigured: () => true,
        getPublicKey: () => 'test-key',
        send: vi.fn(),
        sendBatch: mockSendBatch,
      };

      const mockNotificationService: NotificationService = {
        getWebPushProvider: () => mockProvider,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => 'test-key',
        isConfigured: () => true,
      };

      subscribe(testUserId, testSubscription, 'device-1', 'Mozilla/5.0');

      const result = await sendToUser(mockNotificationService, testUserId, testPayload);

      expect(mockSendBatch).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('should return empty result for user with no subscriptions', async () => {
      const mockSendBatch = vi.fn();

      const mockProvider: PushNotificationProvider = {
        name: 'mock',
        isConfigured: () => true,
        getPublicKey: () => 'test-key',
        send: vi.fn(),
        sendBatch: mockSendBatch,
      };

      const mockNotificationService: NotificationService = {
        getWebPushProvider: () => mockProvider,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => 'test-key',
        isConfigured: () => true,
      };

      const result = await sendToUser(mockNotificationService, 'no-subs-user', testPayload);

      expect(result.total).toBe(0);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });
  });

  describe('sendToUsers', () => {
    const mockProvider: PushNotificationProvider = {
      name: 'mock',
      isConfigured: () => true,
      getPublicKey: () => 'test-key',
      send: vi.fn(),
      sendBatch: vi.fn().mockResolvedValue({
        total: 2,
        successful: 2,
        failed: 0,
        results: [],
        expiredSubscriptions: [],
      }),
    };

    const mockNotificationService: NotificationService = {
      getWebPushProvider: () => mockProvider,
      getFcmProvider: () => undefined,
      getVapidPublicKey: () => 'test-key',
      isConfigured: () => true,
    };

    const testPayload: NotificationPayload = {
      title: 'Test',
      body: 'Test body',
    };

    it('should send to multiple users', async () => {
      subscribe('user-1', testSubscription, 'device-1', 'Mozilla/5.0');
      subscribe(
        'user-2',
        { ...testSubscription, endpoint: 'https://example.com/2' },
        'device-2',
        'Mozilla/5.0',
      );

      const result = await sendToUsers(mockNotificationService, ['user-1', 'user-2'], testPayload);

      expect(mockProvider.sendBatch).toHaveBeenCalled();
      expect(result.total).toBe(2);
    });
  });

  describe('broadcast', () => {
    const mockProvider: PushNotificationProvider = {
      name: 'mock',
      isConfigured: () => true,
      getPublicKey: () => 'test-key',
      send: vi.fn(),
      sendBatch: vi.fn().mockResolvedValue({
        total: 2,
        successful: 2,
        failed: 0,
        results: [],
        expiredSubscriptions: [],
      }),
    };

    const mockNotificationService: NotificationService = {
      getWebPushProvider: () => mockProvider,
      getFcmProvider: () => undefined,
      getVapidPublicKey: () => 'test-key',
      isConfigured: () => true,
    };

    const testPayload: NotificationPayload = {
      title: 'Broadcast',
      body: 'To all users',
    };

    it('should send to all active subscriptions', async () => {
      subscribe('user-1', testSubscription, 'device-1', 'Mozilla/5.0');
      subscribe(
        'user-2',
        { ...testSubscription, endpoint: 'https://example.com/2' },
        'device-2',
        'Mozilla/5.0',
      );

      await broadcast(mockNotificationService, testPayload);

      expect(mockProvider.sendBatch).toHaveBeenCalled();
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return public key when configured', () => {
      const mockNotificationService: NotificationService = {
        getWebPushProvider: () => undefined,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => 'test-public-key',
        isConfigured: () => true,
      };

      const key = getVapidPublicKey(mockNotificationService);
      expect(key).toBe('test-public-key');
    });

    it('should throw when not configured', () => {
      const mockNotificationService: NotificationService = {
        getWebPushProvider: () => undefined,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => undefined,
        isConfigured: () => false,
      };

      expect(() => getVapidPublicKey(mockNotificationService)).toThrow();
    });
  });
});
