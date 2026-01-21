// packages/core/src/domains/notifications/__tests__/schemas.test.ts
/**
 * Notification Schema Tests
 *
 * Tests for Zod validation schemas.
 */

import { describe, expect, it } from 'vitest';

import {
  notificationChannelSchema,
  notificationPayloadSchema,
  notificationPrioritySchema,
  notificationTypeSchema,
  pushSubscriptionKeysSchema,
  pushSubscriptionSchema,
  quietHoursSchema,
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '../schemas';

describe('Notification Schemas', () => {
  describe('notificationTypeSchema', () => {
    it('should accept valid notification types', () => {
      expect(notificationTypeSchema.parse('system')).toBe('system');
      expect(notificationTypeSchema.parse('security')).toBe('security');
      expect(notificationTypeSchema.parse('marketing')).toBe('marketing');
      expect(notificationTypeSchema.parse('social')).toBe('social');
      expect(notificationTypeSchema.parse('transactional')).toBe('transactional');
    });

    it('should reject invalid notification types', () => {
      expect(() => notificationTypeSchema.parse('invalid')).toThrow();
      expect(() => notificationTypeSchema.parse('')).toThrow();
      expect(() => notificationTypeSchema.parse(123)).toThrow();
    });
  });

  describe('notificationChannelSchema', () => {
    it('should accept valid channels', () => {
      expect(notificationChannelSchema.parse('push')).toBe('push');
      expect(notificationChannelSchema.parse('email')).toBe('email');
      expect(notificationChannelSchema.parse('sms')).toBe('sms');
      expect(notificationChannelSchema.parse('in_app')).toBe('in_app');
    });

    it('should reject invalid channels', () => {
      expect(() => notificationChannelSchema.parse('invalid')).toThrow();
    });
  });

  describe('notificationPrioritySchema', () => {
    it('should accept valid priorities', () => {
      expect(notificationPrioritySchema.parse('low')).toBe('low');
      expect(notificationPrioritySchema.parse('normal')).toBe('normal');
      expect(notificationPrioritySchema.parse('high')).toBe('high');
      expect(notificationPrioritySchema.parse('urgent')).toBe('urgent');
    });

    it('should reject invalid priorities', () => {
      expect(() => notificationPrioritySchema.parse('invalid')).toThrow();
    });
  });

  describe('pushSubscriptionKeysSchema', () => {
    it('should accept valid keys', () => {
      const result = pushSubscriptionKeysSchema.parse({
        p256dh: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
        auth: 'UUxI4O8k2r',
      });
      expect(result.p256dh).toBeDefined();
      expect(result.auth).toBeDefined();
    });

    it('should reject empty keys', () => {
      expect(() => pushSubscriptionKeysSchema.parse({ p256dh: '', auth: '' })).toThrow();
    });

    it('should reject invalid base64url characters', () => {
      expect(() =>
        pushSubscriptionKeysSchema.parse({
          p256dh: 'invalid=key+with/special',
          auth: 'test',
        }),
      ).toThrow();
    });
  });

  describe('pushSubscriptionSchema', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      expirationTime: null,
      keys: {
        p256dh: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
        auth: 'UUxI4O8k2r',
      },
    };

    it('should accept valid subscription', () => {
      const result = pushSubscriptionSchema.parse(validSubscription);
      expect(result.endpoint).toBe(validSubscription.endpoint);
      expect(result.expirationTime).toBeNull();
    });

    it('should accept subscription with expiration time', () => {
      const result = pushSubscriptionSchema.parse({
        ...validSubscription,
        expirationTime: 1234567890000,
      });
      expect(result.expirationTime).toBe(1234567890000);
    });

    it('should reject invalid endpoint URL', () => {
      expect(() =>
        pushSubscriptionSchema.parse({
          ...validSubscription,
          endpoint: 'not-a-url',
        }),
      ).toThrow();
    });
  });

  describe('subscribeRequestSchema', () => {
    const validRequest = {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        expirationTime: null,
        keys: {
          p256dh: 'BEl62iUYgUivxIk0TrDOQMlB5w8rVALgsBU6fVDR7xzNS8Qu',
          auth: 'UUxI4O8k2r',
        },
      },
      deviceId: 'device-123',
      userAgent: 'Mozilla/5.0',
    };

    it('should accept valid subscribe request', () => {
      const result = subscribeRequestSchema.parse(validRequest);
      expect(result.deviceId).toBe('device-123');
    });

    it('should reject empty deviceId', () => {
      expect(() =>
        subscribeRequestSchema.parse({
          ...validRequest,
          deviceId: '',
        }),
      ).toThrow();
    });

    it('should use default userAgent', () => {
      const result = subscribeRequestSchema.parse({
        subscription: validRequest.subscription,
        deviceId: 'device-123',
      });
      expect(result.userAgent).toBe('');
    });
  });

  describe('unsubscribeRequestSchema', () => {
    it('should accept subscriptionId', () => {
      const result = unsubscribeRequestSchema.parse({
        subscriptionId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.subscriptionId).toBeDefined();
    });

    it('should accept endpoint', () => {
      const result = unsubscribeRequestSchema.parse({
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      });
      expect(result.endpoint).toBeDefined();
    });

    it('should require at least one identifier', () => {
      expect(() => unsubscribeRequestSchema.parse({})).toThrow();
    });

    it('should reject invalid UUID', () => {
      expect(() =>
        unsubscribeRequestSchema.parse({
          subscriptionId: 'not-a-uuid',
        }),
      ).toThrow();
    });
  });

  describe('quietHoursSchema', () => {
    it('should accept valid quiet hours', () => {
      const result = quietHoursSchema.parse({
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: 'America/New_York',
      });
      expect(result.enabled).toBe(true);
    });

    it('should accept partial updates', () => {
      const result = quietHoursSchema.parse({
        enabled: false,
      });
      expect(result.enabled).toBe(false);
    });

    it('should reject invalid hours', () => {
      expect(() => quietHoursSchema.parse({ startHour: 25 })).toThrow();
      expect(() => quietHoursSchema.parse({ endHour: -1 })).toThrow();
    });
  });

  describe('updatePreferencesRequestSchema', () => {
    it('should accept globalEnabled update', () => {
      const result = updatePreferencesRequestSchema.parse({
        globalEnabled: false,
      });
      expect(result.globalEnabled).toBe(false);
    });

    it('should accept quietHours update', () => {
      const result = updatePreferencesRequestSchema.parse({
        quietHours: { enabled: true, startHour: 22 },
      });
      expect(result.quietHours?.enabled).toBe(true);
    });

    it('should accept type preferences update', () => {
      const result = updatePreferencesRequestSchema.parse({
        types: {
          marketing: { enabled: false },
          security: { channels: ['push', 'email'] },
        },
      });
      expect(result.types?.marketing?.enabled).toBe(false);
    });
  });

  describe('notificationPayloadSchema', () => {
    it('should accept minimal payload', () => {
      const result = notificationPayloadSchema.parse({
        title: 'Test',
        body: 'Test body',
      });
      expect(result.title).toBe('Test');
    });

    it('should accept full payload', () => {
      const result = notificationPayloadSchema.parse({
        title: 'Test',
        body: 'Test body',
        icon: 'https://example.com/icon.png',
        badge: 'https://example.com/badge.png',
        image: 'https://example.com/image.png',
        tag: 'test-tag',
        data: { key: 'value' },
        actions: [{ action: 'open', title: 'Open' }],
        requireInteraction: true,
        renotify: false,
        silent: false,
        vibrate: [100, 50, 100],
        timestamp: 1234567890000,
        url: 'https://example.com',
      });
      expect(result.actions).toHaveLength(1);
    });

    it('should reject missing title', () => {
      expect(() => notificationPayloadSchema.parse({ body: 'test' })).toThrow();
    });

    it('should reject missing body', () => {
      expect(() => notificationPayloadSchema.parse({ title: 'test' })).toThrow();
    });

    it('should reject too many actions', () => {
      expect(() =>
        notificationPayloadSchema.parse({
          title: 'Test',
          body: 'Body',
          actions: [
            { action: 'a', title: 'A' },
            { action: 'b', title: 'B' },
            { action: 'c', title: 'C' },
            { action: 'd', title: 'D' },
          ],
        }),
      ).toThrow();
    });
  });

  describe('sendNotificationRequestSchema', () => {
    it('should accept valid request', () => {
      const result = sendNotificationRequestSchema.parse({
        type: 'system',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
      });
      expect(result.type).toBe('system');
      expect(result.priority).toBe('normal'); // default
    });

    it('should accept request with userIds', () => {
      const result = sendNotificationRequestSchema.parse({
        type: 'system',
        priority: 'high',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
        userIds: ['123e4567-e89b-12d3-a456-426614174000'],
        ttl: 86400,
      });
      expect(result.userIds).toHaveLength(1);
    });

    it('should reject invalid TTL', () => {
      expect(() =>
        sendNotificationRequestSchema.parse({
          type: 'system',
          payload: { title: 'Test', body: 'Body' },
          ttl: 3000000, // > 28 days
        }),
      ).toThrow();
    });
  });
});
