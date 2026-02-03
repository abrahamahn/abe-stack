// core/src/modules/notifications/schemas.test.ts
import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  notificationChannelSchema,
  notificationPrioritySchema,
  notificationTypeSchema,
  pushSubscriptionSchema,
  sendNotificationRequestSchema,
  updatePreferencesRequestSchema,
} from './schemas';

describe('Notification Schemas', () => {
  describe('notificationTypeSchema', () => {
    it('should accept valid notification types', () => {
      for (const type of NOTIFICATION_TYPES) {
        expect(notificationTypeSchema.parse(type)).toBe(type);
      }
    });

    it('should reject invalid types', () => {
      expect(() => notificationTypeSchema.parse('INVALID')).toThrow();
    });
  });

  describe('notificationChannelSchema', () => {
    it('should accept valid channels', () => {
      for (const channel of NOTIFICATION_CHANNELS) {
        expect(notificationChannelSchema.parse(channel)).toBe(channel);
      }
    });
  });

  describe('notificationPrioritySchema', () => {
    it('should accept valid priorities', () => {
      for (const priority of NOTIFICATION_PRIORITIES) {
        expect(notificationPrioritySchema.parse(priority)).toBe(priority);
      }
    });
  });

  describe('pushSubscriptionSchema', () => {
    it('should validate valid push subscription', () => {
      const validSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          auth: 'Zm9vYmFyYmF6MTIz', // base64url
          p256dh: 'YmFyYmF6Zm9vNDU2', // base64url
        },
      };
      const result = pushSubscriptionSchema.parse(validSub);
      expect(result.endpoint).toBe(validSub.endpoint);
      expect(result.keys.auth).toBe(validSub.keys.auth);
    });
  });

  describe('sendNotificationRequestSchema', () => {
    it('should validate valid send request', () => {
      const validRequest = {
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      };
      const result = sendNotificationRequestSchema.parse(validRequest);
      expect(result.type).toBe('system');
      expect(result.payload.title).toBe('Test Title');
    });
  });

  describe('updatePreferencesRequestSchema', () => {
    it('should validate valid preferences update', () => {
      const validUpdate = {
        globalEnabled: true,
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 8,
        },
      };
      const result = updatePreferencesRequestSchema.parse(validUpdate);
      expect(result.globalEnabled).toBe(true);
      expect(result.quietHours?.startHour).toBe(22);
    });
  });
});
