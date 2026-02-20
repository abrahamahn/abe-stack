// main/server/core/src/notifications/handlers.test.ts
/**
 * Notification Handlers Unit Tests
 *
 * Comprehensive tests for push notification HTTP handlers including:
 * - VAPID key endpoint (stubbed - returns 501)
 * - Subscribe endpoint (authentication, validation, error handling)
 * - Unsubscribe endpoint (authentication, not found cases)
 * - Get preferences endpoint (authentication, default creation)
 * - Update preferences endpoint (authentication, validation, partial updates)
 * - Test notification endpoint (stubbed - returns 500)
 * - Send notification endpoint (admin, stubbed - returns 500)
 *
 * Tests verify proper authentication checks, service layer integration,
 * error handling, and response formatting.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./service', () => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

// Note: We don't mock @bslt/shared because Vitest's optimizeDeps pre-bundles it,
// making mocking unreliable. Tests for AppError handling use real AppError instances.

import {
  handleGetPreferences,
  handleGetVapidKey,
  handleSendNotification,
  handleSubscribe,
  handleTestNotification,
  handleUnsubscribe,
  handleUpdatePreferences,
} from './handlers';
import * as service from './service';

import type { NotificationModuleDeps, NotificationRequest } from './types';
import type {
  NotificationPreferences,
  PreferencesResponse,
  SubscribeRequest,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
} from '@bslt/shared';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock NotificationModuleDeps for testing
 */
function createMockContext(
  overrides: Partial<NotificationModuleDeps> = {},
): NotificationModuleDeps {
  return {
    db: {} as never,
    repos: {} as never,
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        trace: vi.fn(),
      })),
    },
    ...overrides,
  } as NotificationModuleDeps;
}

/**
 * Create a mock authenticated request
 */
function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): NotificationRequest {
  return {
    user,
    cookies: {},
    headers: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    },
  } as NotificationRequest;
}

/**
 * Create a valid PushSubscription object
 */
function createValidPushSubscription() {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    expirationTime: null,
    keys: {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };
}

/**
 * Create default notification preferences
 */
function createDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    globalEnabled: true,
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 8,
      timezone: 'UTC',
    },
    types: {
      system: { enabled: true, channels: ['push', 'email', 'in_app'] },
      security: { enabled: true, channels: ['push', 'email', 'in_app'] },
      marketing: { enabled: false, channels: ['email'] },
      social: { enabled: true, channels: ['push', 'in_app'] },
      transactional: { enabled: true, channels: ['push', 'email', 'in_app'] },
    },
    updatedAt: new Date('2025-01-01'),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Notification Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Public Handlers (No auth required)
  // ==========================================================================

  describe('handleGetVapidKey', () => {
    test('should return 501 Not Implemented', () => {
      const ctx = createMockContext();

      const result = handleGetVapidKey(ctx);

      expect(result.status).toBe(501);
      expect(result.body).toEqual({
        message: 'Web Push notifications are not available. VAPID keys not configured.',
        code: 'VAPID_NOT_CONFIGURED',
      });
    });

    test('should match VapidKeyResponse type shape for error', () => {
      const ctx = createMockContext();

      const result = handleGetVapidKey(ctx);

      // Type guard: result.body should have message and code
      if (result.status === 501) {
        expect(result.body).toHaveProperty('message');
        expect(result.body).toHaveProperty('code');
      }
    });
  });

  // ==========================================================================
  // Protected Handlers (User auth required)
  // ==========================================================================

  describe('handleSubscribe', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body: SubscribeRequest = {
          subscription: createValidPushSubscription(),
          deviceId: 'device-123',
          userAgent: 'Mozilla/5.0',
        };

        const result = await handleSubscribe(ctx, body, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
        expect(vi.mocked(service.subscribe)).not.toHaveBeenCalled();
      });
    });

    describe('Success Path', () => {
      test('should subscribe user successfully', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: SubscribeRequest = {
          subscription: createValidPushSubscription(),
          deviceId: 'device-123',
          userAgent: 'Mozilla/5.0',
        };

        vi.mocked(service.subscribe).mockResolvedValue('subscription-456');

        const result = await handleSubscribe(ctx, body, req);

        expect(result.status).toBe(201);
        expect((result.body as SubscribeResponse).subscriptionId).toBe('subscription-456');
        expect((result.body as SubscribeResponse).message).toBe(
          'Successfully subscribed to push notifications',
        );
        expect(vi.mocked(service.subscribe)).toHaveBeenCalledWith(
          ctx.db,
          'user-123',
          body.subscription,
          'device-123',
          'Mozilla/5.0',
        );
      });

      test('should handle resubscription (existing endpoint)', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: SubscribeRequest = {
          subscription: createValidPushSubscription(),
          deviceId: 'device-123',
          userAgent: 'Mozilla/5.0',
        };

        // Service returns existing subscription ID
        vi.mocked(service.subscribe).mockResolvedValue('existing-subscription-789');

        const result = await handleSubscribe(ctx, body, req);

        expect(result.status).toBe(201);
        expect((result.body as SubscribeResponse).subscriptionId).toBe('existing-subscription-789');
      });
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: SubscribeRequest = {
          subscription: createValidPushSubscription(),
          deviceId: 'device-123',
          userAgent: 'Mozilla/5.0',
        };

        const dbError = new Error('Database connection failed');
        vi.mocked(service.subscribe).mockRejectedValue(dbError);

        const result = await handleSubscribe(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Failed to subscribe' });
        expect(ctx.log.error).toHaveBeenCalledWith(
          {
            err: dbError,
            handler: 'handleSubscribe',
            userId: 'user-123',
          },
          'Failed to subscribe',
        );
      });
    });
  });

  describe('handleUnsubscribe', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body: UnsubscribeRequest = {
          subscriptionId: 'sub-123',
        };

        const result = await handleUnsubscribe(ctx, body, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
        expect(vi.mocked(service.unsubscribe)).not.toHaveBeenCalled();
      });
    });

    describe('Success Path', () => {
      test('should unsubscribe successfully by subscriptionId', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UnsubscribeRequest = {
          subscriptionId: 'sub-456',
        };

        vi.mocked(service.unsubscribe).mockResolvedValue(true);

        const result = await handleUnsubscribe(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as UnsubscribeResponse).success).toBe(true);
        expect((result.body as UnsubscribeResponse).message).toBe(
          'Successfully unsubscribed from push notifications',
        );
        expect(vi.mocked(service.unsubscribe)).toHaveBeenCalledWith(ctx.db, 'sub-456', undefined);
      });

      test('should unsubscribe successfully by endpoint', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UnsubscribeRequest = {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        };

        vi.mocked(service.unsubscribe).mockResolvedValue(true);

        const result = await handleUnsubscribe(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as UnsubscribeResponse).success).toBe(true);
        expect(vi.mocked(service.unsubscribe)).toHaveBeenCalledWith(
          ctx.db,
          undefined,
          'https://fcm.googleapis.com/fcm/send/abc123',
        );
      });
    });

    describe('Not Found Cases', () => {
      test('should return 404 when subscription not found', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UnsubscribeRequest = {
          subscriptionId: 'nonexistent-sub',
        };

        vi.mocked(service.unsubscribe).mockResolvedValue(false);

        const result = await handleUnsubscribe(ctx, body, req);

        expect(result.status).toBe(404);
        expect(result.body).toEqual({
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UnsubscribeRequest = {
          subscriptionId: 'sub-123',
        };

        const dbError = new Error('Database error');
        vi.mocked(service.unsubscribe).mockRejectedValue(dbError);

        const result = await handleUnsubscribe(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Failed to unsubscribe' });
        expect(ctx.log.error).toHaveBeenCalledWith(
          {
            err: dbError,
            handler: 'handleUnsubscribe',
            userId: 'user-123',
          },
          'Failed to unsubscribe',
        );
      });
    });
  });

  describe('handleGetPreferences', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user

        const result = await handleGetPreferences(ctx, undefined, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
        expect(vi.mocked(service.getPreferences)).not.toHaveBeenCalled();
      });
    });

    describe('Success Path', () => {
      test('should return existing preferences', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });

        const preferences = createDefaultPreferences('user-123');
        vi.mocked(service.getPreferences).mockResolvedValue(preferences);

        const result = await handleGetPreferences(ctx, undefined, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences).toEqual(preferences);
        expect(vi.mocked(service.getPreferences)).toHaveBeenCalledWith(ctx.db, 'user-123');
      });

      test('should return default preferences for new user', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'new-user-456',
          email: 'new@example.com',
          role: 'user',
        });

        const defaultPrefs = createDefaultPreferences('new-user-456');
        vi.mocked(service.getPreferences).mockResolvedValue(defaultPrefs);

        const result = await handleGetPreferences(ctx, undefined, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences).toEqual(defaultPrefs);
      });
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });

        const dbError = new Error('Database error');
        vi.mocked(service.getPreferences).mockRejectedValue(dbError);

        const result = await handleGetPreferences(ctx, undefined, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Failed to get preferences' });
        expect(ctx.log.error).toHaveBeenCalledWith(
          {
            err: dbError,
            handler: 'handleGetPreferences',
            userId: 'user-123',
          },
          'Failed to get preferences',
        );
      });
    });
  });

  describe('handleUpdatePreferences', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', async () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body: UpdatePreferencesRequest = {
          globalEnabled: false,
        };

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
        expect(vi.mocked(service.updatePreferences)).not.toHaveBeenCalled();
      });
    });

    describe('Success Path', () => {
      test('should update global enabled flag', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          globalEnabled: false,
        };

        const updatedPrefs = {
          ...createDefaultPreferences('user-123'),
          globalEnabled: false,
        };
        vi.mocked(service.updatePreferences).mockResolvedValue(updatedPrefs);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences).toEqual(updatedPrefs);
        expect(vi.mocked(service.updatePreferences)).toHaveBeenCalledWith(ctx.db, 'user-123', body);
      });

      test('should update quiet hours settings', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          quietHours: {
            enabled: true,
            startHour: 23,
            endHour: 7,
            timezone: 'America/New_York',
          },
        };

        const updatedPrefs = {
          ...createDefaultPreferences('user-123'),
          quietHours: {
            enabled: true,
            startHour: 23,
            endHour: 7,
            timezone: 'America/New_York',
          },
        };
        vi.mocked(service.updatePreferences).mockResolvedValue(updatedPrefs);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences.quietHours).toEqual({
          enabled: true,
          startHour: 23,
          endHour: 7,
          timezone: 'America/New_York',
        });
      });

      test('should update type-specific preferences', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          types: {
            marketing: {
              enabled: true,
              channels: ['email', 'push'],
            },
          },
        };

        const updatedPrefs = createDefaultPreferences('user-123');
        updatedPrefs.types.marketing = {
          enabled: true,
          channels: ['email', 'push'],
        };
        vi.mocked(service.updatePreferences).mockResolvedValue(updatedPrefs);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences.types.marketing).toEqual({
          enabled: true,
          channels: ['email', 'push'],
        });
      });

      test('should handle partial type updates', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          types: {
            security: {
              channels: ['email'], // Only update channels, not enabled
            },
          },
        };

        const updatedPrefs = createDefaultPreferences('user-123');
        updatedPrefs.types.security = {
          enabled: true, // Kept original
          channels: ['email'], // Updated
        };
        vi.mocked(service.updatePreferences).mockResolvedValue(updatedPrefs);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences.types.security).toEqual({
          enabled: true,
          channels: ['email'],
        });
      });

      test('should handle multiple updates at once', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          globalEnabled: false,
          quietHours: {
            enabled: true,
            startHour: 22,
          },
          types: {
            marketing: { enabled: true },
          },
        };

        const updatedPrefs = {
          ...createDefaultPreferences('user-123'),
          globalEnabled: false,
          quietHours: {
            enabled: true,
            startHour: 22,
            endHour: 8,
            timezone: 'UTC',
          },
          types: {
            ...createDefaultPreferences('user-123').types,
            marketing: { enabled: true, channels: ['email' as const] },
          },
        };
        vi.mocked(service.updatePreferences).mockResolvedValue(updatedPrefs);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(200);
        expect((result.body as PreferencesResponse).preferences.globalEnabled).toBe(false);
        expect((result.body as PreferencesResponse).preferences.quietHours.enabled).toBe(true);
      });
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors', async () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const body: UpdatePreferencesRequest = {
          globalEnabled: false,
        };

        const dbError = new Error('Database error');
        vi.mocked(service.updatePreferences).mockRejectedValue(dbError);

        const result = await handleUpdatePreferences(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Failed to update preferences' });
        expect(ctx.log.error).toHaveBeenCalledWith(
          {
            err: dbError,
            handler: 'handleUpdatePreferences',
            userId: 'user-123',
          },
          'Failed to update preferences',
        );
      });
    });
  });

  describe('handleTestNotification', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user

        const result = handleTestNotification(ctx, undefined, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
      });
    });

    describe('Not Implemented', () => {
      test('should return 500 with provider not configured error', () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });

        const result = handleTestNotification(ctx, undefined, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
          message: 'Push notification sending is not available. Provider not configured.',
          code: 'PROVIDER_NOT_CONFIGURED',
        });
      });
    });
  });

  // ==========================================================================
  // Admin Handlers (Admin auth required)
  // ==========================================================================

  describe('handleSendNotification', () => {
    describe('Authentication', () => {
      test('should reject unauthenticated requests', () => {
        const ctx = createMockContext();
        const req = createMockRequest(); // No user
        const body = {
          type: 'system' as const,
          payload: {
            title: 'Test',
            body: 'Test notification',
          },
        };

        const result = handleSendNotification(ctx, body, req);

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: 'Unauthorized' });
      });
    });

    describe('Not Implemented', () => {
      test('should return 500 with provider not configured error', () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
        });
        const body = {
          type: 'system' as const,
          payload: {
            title: 'System Announcement',
            body: 'Maintenance scheduled',
          },
        };

        const result = handleSendNotification(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
          message: 'Push notification sending is not available. Provider not configured.',
          code: 'PROVIDER_NOT_CONFIGURED',
        });
      });

      test('should return error even with valid broadcast request', () => {
        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
        });
        const body = {
          type: 'system' as const,
          priority: 'high' as const,
          payload: {
            title: 'Urgent System Update',
            body: 'Please restart the application',
            requireInteraction: true,
          },
          userIds: [], // Broadcast to all
        };

        const result = handleSendNotification(ctx, body, req);

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
          message: 'Push notification sending is not available. Provider not configured.',
          code: 'PROVIDER_NOT_CONFIGURED',
        });
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    test('handleSubscribe should handle empty userAgent', async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const body: SubscribeRequest = {
        subscription: createValidPushSubscription(),
        deviceId: 'device-123',
        userAgent: '', // Empty string
      };

      vi.mocked(service.subscribe).mockResolvedValue('sub-789');

      const result = await handleSubscribe(ctx, body, req);

      expect(result.status).toBe(201);
      expect(vi.mocked(service.subscribe)).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        body.subscription,
        'device-123',
        '',
      );
    });

    test('handleUnsubscribe should handle missing both subscriptionId and endpoint', async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const body: UnsubscribeRequest = {
        // Neither subscriptionId nor endpoint provided
      };

      vi.mocked(service.unsubscribe).mockResolvedValue(false);

      const result = await handleUnsubscribe(ctx, body, req);

      expect(result.status).toBe(404);
      expect(vi.mocked(service.unsubscribe)).toHaveBeenCalledWith(ctx.db, undefined, undefined);
    });

    test('handleUpdatePreferences should handle empty updates object', async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const body: UpdatePreferencesRequest = {}; // No updates

      const originalPrefs = createDefaultPreferences('user-123');
      vi.mocked(service.updatePreferences).mockResolvedValue(originalPrefs);

      const result = await handleUpdatePreferences(ctx, body, req);

      expect(result.status).toBe(200);
      expect(vi.mocked(service.updatePreferences)).toHaveBeenCalledWith(ctx.db, 'user-123', {});
    });
  });
});
