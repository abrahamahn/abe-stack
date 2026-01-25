// packages/core/src/modules/notifications/errors.test.ts
/**
 * Notification Error Tests
 *
 * Tests for notification-specific error classes.
 */

import { describe, expect, it } from 'vitest';

import { HTTP_STATUS } from '../../shared/constants/http';
import {
    InvalidPreferencesError,
    InvalidSubscriptionError,
    NotificationRateLimitError,
    NotificationSendError,
    NotificationsDisabledError,
    PayloadTooLargeError,
    PreferencesNotFoundError,
    ProviderError,
    ProviderNotConfiguredError,
    QuietHoursActiveError,
    SubscriptionExistsError,
    SubscriptionExpiredError,
    SubscriptionNotFoundError,
    VapidNotConfiguredError,
} from './errors';

describe('Notification Errors', () => {
  describe('SubscriptionNotFoundError', () => {
    it('should create error with default message', () => {
      const error = new SubscriptionNotFoundError();
      expect(error.message).toBe('Push subscription not found');
      expect(error.code).toBe('SUBSCRIPTION_NOT_FOUND');
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });

    it('should create error with identifier', () => {
      const error = new SubscriptionNotFoundError('sub-123');
      expect(error.message).toContain('sub-123');
    });
  });

  describe('SubscriptionExistsError', () => {
    it('should create error with default message', () => {
      const error = new SubscriptionExistsError();
      expect(error.message).toBe('Push subscription already exists');
      expect(error.code).toBe('SUBSCRIPTION_EXISTS');
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
    });

    it('should create error with custom message', () => {
      const error = new SubscriptionExistsError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('InvalidSubscriptionError', () => {
    it('should create error with default message', () => {
      const error = new InvalidSubscriptionError();
      expect(error.message).toBe('Invalid push subscription data');
      expect(error.code).toBe('INVALID_SUBSCRIPTION');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should include details', () => {
      const error = new InvalidSubscriptionError('Missing keys', { field: 'keys' });
      expect(error.details).toEqual({ field: 'keys' });
    });
  });

  describe('SubscriptionExpiredError', () => {
    it('should create error with default message', () => {
      const error = new SubscriptionExpiredError();
      expect(error.message).toBe('Push subscription has expired');
      expect(error.code).toBe('SUBSCRIPTION_EXPIRED');
      expect(error.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    });

    it('should create error with subscription ID', () => {
      const error = new SubscriptionExpiredError('sub-123');
      expect(error.message).toContain('sub-123');
    });
  });

  describe('NotificationSendError', () => {
    it('should create error with default message', () => {
      const error = new NotificationSendError();
      expect(error.message).toBe('Failed to send push notification');
      expect(error.code).toBe('NOTIFICATION_SEND_FAILED');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should include subscription ID and status code', () => {
      const error = new NotificationSendError('Send failed', 'sub-123', 410);
      expect(error.subscriptionId).toBe('sub-123');
      expect(error.httpStatusCode).toBe(410);
      expect(error.details).toEqual({ subscriptionId: 'sub-123', httpStatusCode: 410 });
    });
  });

  describe('PayloadTooLargeError', () => {
    it('should create error with size info', () => {
      const error = new PayloadTooLargeError(5000, 4096);
      expect(error.message).toContain('5000');
      expect(error.message).toContain('4096');
      expect(error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(error.actualSize).toBe(5000);
      expect(error.maxSize).toBe(4096);
    });

    it('should use default max size', () => {
      const error = new PayloadTooLargeError(5000);
      expect(error.maxSize).toBe(4096);
    });
  });

  describe('NotificationRateLimitError', () => {
    it('should create error with default message', () => {
      const error = new NotificationRateLimitError();
      expect(error.message).toBe('Notification rate limit exceeded');
      expect(error.code).toBe('NOTIFICATION_RATE_LIMITED');
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    });

    it('should include retry after', () => {
      const error = new NotificationRateLimitError('Rate limited', 60);
      expect(error.retryAfter).toBe(60);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('ProviderNotConfiguredError', () => {
    it('should create error with provider name', () => {
      const error = new ProviderNotConfiguredError('web-push');
      expect(error.message).toContain('web-push');
      expect(error.code).toBe('PROVIDER_NOT_CONFIGURED');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('ProviderError', () => {
    it('should create error with provider name', () => {
      const error = new ProviderError('Connection failed', 'fcm');
      expect(error.message).toBe('Connection failed');
      expect(error.providerName).toBe('fcm');
      expect(error.code).toBe('PROVIDER_ERROR');
    });

    it('should include original error', () => {
      const original = new Error('Network error');
      const error = new ProviderError('Connection failed', 'fcm', original);
      expect(error.originalError).toBe(original);
      expect(error.details?.originalMessage).toBe('Network error');
    });
  });

  describe('VapidNotConfiguredError', () => {
    it('should create error with correct message', () => {
      const error = new VapidNotConfiguredError();
      expect(error.message).toContain('VAPID');
      expect(error.code).toBe('VAPID_NOT_CONFIGURED');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('PreferencesNotFoundError', () => {
    it('should create error with user ID', () => {
      const error = new PreferencesNotFoundError('user-123');
      expect(error.message).toContain('user-123');
      expect(error.code).toBe('PREFERENCES_NOT_FOUND');
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('InvalidPreferencesError', () => {
    it('should create error with default message', () => {
      const error = new InvalidPreferencesError();
      expect(error.message).toBe('Invalid notification preferences');
      expect(error.code).toBe('INVALID_PREFERENCES');
    });

    it('should include details', () => {
      const error = new InvalidPreferencesError('Invalid timezone', { field: 'timezone' });
      expect(error.details).toEqual({ field: 'timezone' });
    });
  });

  describe('NotificationsDisabledError', () => {
    it('should create error with user ID', () => {
      const error = new NotificationsDisabledError('user-123');
      expect(error.message).toBe('User has disabled notifications');
      expect(error.userId).toBe('user-123');
      expect(error.code).toBe('NOTIFICATIONS_DISABLED');
    });

    it('should include notification type', () => {
      const error = new NotificationsDisabledError('user-123', 'marketing');
      expect(error.message).toContain('marketing');
      expect(error.notificationType).toBe('marketing');
    });
  });

  describe('QuietHoursActiveError', () => {
    it('should create error with user ID', () => {
      const error = new QuietHoursActiveError('user-123');
      expect(error.message).toContain('quiet hours');
      expect(error.userId).toBe('user-123');
      expect(error.code).toBe('QUIET_HOURS_ACTIVE');
    });

    it('should include end time', () => {
      const endTime = new Date('2024-01-01T08:00:00Z');
      const error = new QuietHoursActiveError('user-123', endTime);
      expect(error.endTime).toBe(endTime);
      expect(error.details?.endTime).toBe(endTime.toISOString());
    });
  });
});
