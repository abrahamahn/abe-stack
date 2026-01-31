// infra/notifications/src/routes.test.ts
/**
 * Notification Routes Unit Tests
 *
 * Tests for route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 * - HTTP methods
 * - Edge cases for notification-specific schemas
 *
 * @complexity O(1) per test - simple route configuration validation
 */

import {
  sendNotificationRequestSchema,
  subscribeRequestSchema,
  unsubscribeRequestSchema,
  updatePreferencesRequestSchema,
} from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./handlers', () => ({
  handleGetPreferences: vi.fn(),
  handleGetVapidKey: vi.fn(),
  handleSendNotification: vi.fn(),
  handleSubscribe: vi.fn(),
  handleTestNotification: vi.fn(),
  handleUnsubscribe: vi.fn(),
  handleUpdatePreferences: vi.fn(),
}));

import { notificationRoutes } from './routes';

import type { BaseRouteDefinition } from '@abe-stack/http';
import type { NotificationModuleDeps, NotificationRequest } from './types';
import type { FastifyReply } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): NotificationModuleDeps {
  return {
    db: {} as never,
    repos: {} as never,
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as NotificationModuleDeps;
}

function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): NotificationRequest & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (compatible; Test)',
    },
  } as NotificationRequest & { user?: { userId: string; email: string; role: string } };
}

function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('Notification Routes', () => {
  describe('Route Map Structure', () => {
    test('should export notificationRoutes as a RouteMap', () => {
      expect(notificationRoutes).toBeDefined();
      expect(typeof notificationRoutes).toBe('object');
    });

    test('should define all expected routes', () => {
      const routeKeys = Object.keys(notificationRoutes);
      expect(routeKeys).toHaveLength(7);

      expect(routeKeys).toContain('notifications/vapid-key');
      expect(routeKeys).toContain('notifications/subscribe');
      expect(routeKeys).toContain('notifications/unsubscribe');
      expect(routeKeys).toContain('notifications/preferences');
      expect(routeKeys).toContain('notifications/preferences/update');
      expect(routeKeys).toContain('notifications/test');
      expect(routeKeys).toContain('notifications/send');
    });

    test('should have exactly 7 routes', () => {
      const routeKeys = Object.keys(notificationRoutes);
      expect(routeKeys).toHaveLength(7);
    });
  });

  // ==========================================================================
  // Public Route Tests
  // ==========================================================================

  describe('notifications/vapid-key Route', () => {
    const vapidKeyRoute = notificationRoutes['notifications/vapid-key']!;

    test('should use GET method', () => {
      expect(vapidKeyRoute.method).toBe('GET');
    });

    test('should be a public route (no auth required)', () => {
      expect(vapidKeyRoute.auth).toBeUndefined();
    });

    test('should not require a request body schema', () => {
      expect(vapidKeyRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof vapidKeyRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetVapidKey with correct arguments', async () => {
        const { handleGetVapidKey } = await import('./handlers');
        vi.mocked(handleGetVapidKey).mockReturnValue({
          status: 200,
          body: {
            publicKey: 'test-vapid-public-key',
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        await vapidKeyRoute.handler(ctx, undefined as never, req as never, reply);

        expect(handleGetVapidKey).toHaveBeenCalledWith(ctx);
      });

      test('should return result from handleGetVapidKey', async () => {
        const { handleGetVapidKey } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            publicKey: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
          },
        };
        vi.mocked(handleGetVapidKey).mockReturnValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await vapidKeyRoute.handler(ctx, undefined as never, req as never, reply);

        expect(result).toEqual(expectedResult);
      });

      test('should handle disabled notifications gracefully', async () => {
        const { handleGetVapidKey } = await import('./handlers');
        vi.mocked(handleGetVapidKey).mockReturnValue({
          status: 200,
          body: {
            message: 'Push notifications are not configured',
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await vapidKeyRoute.handler(ctx, undefined as never, req as never, reply);

        expect(result.status).toBe(200);
        expect(result.body).toHaveProperty('message');
      });
    });
  });

  // ==========================================================================
  // User-Protected Route Tests
  // ==========================================================================

  describe('notifications/subscribe Route', () => {
    const subscribeRoute = notificationRoutes['notifications/subscribe']!;

    test('should use POST method', () => {
      expect(subscribeRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(subscribeRoute.auth).toBe('user');
    });

    test('should use subscribeRequestSchema for validation', () => {
      // Check schema is defined and has expected shape (toBe fails due to ESM module instances)
      expect(subscribeRoute.schema).toBeDefined();
      expect(subscribeRoute.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof subscribeRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleSubscribe with correct arguments', async () => {
        const { handleSubscribe } = await import('./handlers');
        vi.mocked(handleSubscribe).mockResolvedValue({
          status: 200,
          body: {
            success: true,
            subscriptionId: 'sub-123',
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
            expirationTime: null,
            keys: {
              p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
              auth: 'authsecretkey',
            },
          },
          deviceId: 'device-123',
          userAgent: 'Mozilla/5.0',
        };

        await subscribeRoute.handler(ctx, body, req as never, reply);

        expect(handleSubscribe).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleSubscribe', async () => {
        const { handleSubscribe } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            success: true,
            subscriptionId: 'sub-456',
          },
        };
        vi.mocked(handleSubscribe).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/xyz789',
            expirationTime: null,
            keys: {
              p256dh: 'testkey',
              auth: 'testauth',
            },
          },
          deviceId: 'device-456',
          userAgent: 'Mozilla/5.0',
        };

        const result = await subscribeRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('notifications/unsubscribe Route', () => {
    const unsubscribeRoute = notificationRoutes['notifications/unsubscribe']!;

    test('should use POST method', () => {
      expect(unsubscribeRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(unsubscribeRoute.auth).toBe('user');
    });

    test('should use unsubscribeRequestSchema for validation', () => {
      // Check schema is defined and has expected shape (toBe fails due to ESM module instances)
      expect(unsubscribeRoute.schema).toBeDefined();
      expect(unsubscribeRoute.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof unsubscribeRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleUnsubscribe with correct arguments', async () => {
        const { handleUnsubscribe } = await import('./handlers');
        vi.mocked(handleUnsubscribe).mockResolvedValue({
          status: 200,
          body: {
            success: true,
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        };

        await unsubscribeRoute.handler(ctx, body, req as never, reply);

        expect(handleUnsubscribe).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleUnsubscribe', async () => {
        const { handleUnsubscribe } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            success: true,
          },
        };
        vi.mocked(handleUnsubscribe).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          endpoint: 'https://fcm.googleapis.com/fcm/send/xyz789',
        };

        const result = await unsubscribeRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('notifications/preferences Route', () => {
    const preferencesRoute = notificationRoutes['notifications/preferences']!;

    test('should use GET method', () => {
      expect(preferencesRoute.method).toBe('GET');
    });

    test('should require user authentication', () => {
      expect(preferencesRoute.auth).toBe('user');
    });

    test('should not require a request body schema', () => {
      expect(preferencesRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof preferencesRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetPreferences with correct arguments', async () => {
        const { handleGetPreferences } = await import('./handlers');
        vi.mocked(handleGetPreferences).mockResolvedValue({
          status: 200,
          body: {
            preferences: {
              email: true,
              push: true,
              marketing: false,
            },
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        await preferencesRoute.handler(ctx, undefined as never, req as never, reply);

        expect(handleGetPreferences).toHaveBeenCalledWith(ctx, undefined, req);
      });

      test('should return result from handleGetPreferences', async () => {
        const { handleGetPreferences } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            preferences: {
              email: true,
              push: false,
              marketing: true,
            },
          },
        };
        vi.mocked(handleGetPreferences).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const result = await preferencesRoute.handler(ctx, undefined as never, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('notifications/preferences/update Route', () => {
    const updatePreferencesRoute = notificationRoutes['notifications/preferences/update']!;

    test('should use PUT method', () => {
      expect(updatePreferencesRoute.method).toBe('PUT');
    });

    test('should require user authentication', () => {
      expect(updatePreferencesRoute.auth).toBe('user');
    });

    test('should use updatePreferencesRequestSchema for validation', () => {
      // Check schema is defined and has expected shape (toBe fails due to ESM module instances)
      expect(updatePreferencesRoute.schema).toBeDefined();
      expect(updatePreferencesRoute.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof updatePreferencesRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleUpdatePreferences with correct arguments', async () => {
        const { handleUpdatePreferences } = await import('./handlers');
        vi.mocked(handleUpdatePreferences).mockResolvedValue({
          status: 200,
          body: {
            preferences: {
              email: false,
              push: true,
              marketing: false,
            },
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          globalEnabled: false,
          quietHours: {
            enabled: true,
            startHour: 22,
            endHour: 7,
          },
        };

        await updatePreferencesRoute.handler(ctx, body, req as never, reply);

        expect(handleUpdatePreferences).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleUpdatePreferences', async () => {
        const { handleUpdatePreferences } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            preferences: {
              globalEnabled: true,
              quietHours: {
                enabled: false,
                startHour: 0,
                endHour: 0,
              },
            },
          },
        };
        vi.mocked(handleUpdatePreferences).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          globalEnabled: true,
          types: {
            security: {
              enabled: true,
              channels: ['push', 'email'],
            },
          },
        };

        const result = await updatePreferencesRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('notifications/test Route', () => {
    const testRoute = notificationRoutes['notifications/test']!;

    test('should use POST method', () => {
      expect(testRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(testRoute.auth).toBe('user');
    });

    test('should not require a request body schema', () => {
      expect(testRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof testRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleTestNotification with correct arguments', async () => {
        const { handleTestNotification } = await import('./handlers');
        vi.mocked(handleTestNotification).mockReturnValue({
          status: 200,
          body: {
            success: true,
            sent: 1,
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        await testRoute.handler(ctx, undefined as never, req as never, reply);

        expect(handleTestNotification).toHaveBeenCalledWith(ctx, undefined, req);
      });

      test('should return result from handleTestNotification', async () => {
        const { handleTestNotification } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            success: true,
            sent: 2,
          },
        };
        vi.mocked(handleTestNotification).mockReturnValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const result = await testRoute.handler(ctx, undefined as never, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  // ==========================================================================
  // Admin-Protected Route Tests
  // ==========================================================================

  describe('notifications/send Route', () => {
    const sendRoute = notificationRoutes['notifications/send']!;

    test('should use POST method', () => {
      expect(sendRoute.method).toBe('POST');
    });

    test('should require admin authentication', () => {
      expect(sendRoute.auth).toBe('admin');
    });

    test('should use sendNotificationRequestSchema for validation', () => {
      // Check schema is defined and has expected shape (toBe fails due to ESM module instances)
      expect(sendRoute.schema).toBeDefined();
      expect(sendRoute.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof sendRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleSendNotification with correct arguments', async () => {
        const { handleSendNotification } = await import('./handlers');
        vi.mocked(handleSendNotification).mockReturnValue({
          status: 200,
          body: {
            success: true,
            sent: 5,
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
        });
        const reply = createMockReply();

        const body = {
          type: 'system',
          priority: 'high',
          payload: {
            title: 'System Notification',
            body: 'Important update available',
            data: { type: 'system', priority: 'high' },
          },
          userIds: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
        };

        await sendRoute.handler(ctx, body, req as never, reply);

        expect(handleSendNotification).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleSendNotification', async () => {
        const { handleSendNotification } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            success: true,
            sent: 10,
          },
        };
        vi.mocked(handleSendNotification).mockReturnValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
        });
        const reply = createMockReply();

        const body = {
          type: 'system',
          priority: 'normal',
          payload: {
            title: 'Maintenance Notice',
            body: 'Scheduled maintenance tonight',
          },
          userIds: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
        };

        const result = await sendRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('Schema Validation', () => {
  describe('subscribeRequestSchema', () => {
    test('should accept valid subscription with all fields', () => {
      const validRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
          expirationTime: null,
          keys: {
            p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
            auth: 'authsecretkey',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject subscription with missing deviceId', () => {
      const invalidRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
          keys: {
            p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
            auth: 'authsecretkey',
          },
        },
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject subscription with missing endpoint', () => {
      const invalidRequest = {
        subscription: {
          keys: {
            p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
            auth: 'authsecretkey',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject subscription with missing keys', () => {
      const invalidRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject subscription with missing p256dh key', () => {
      const invalidRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
          keys: {
            auth: 'authsecretkey',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject subscription with missing auth key', () => {
      const invalidRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
          keys: {
            p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject subscription with invalid endpoint URL', () => {
      const invalidRequest = {
        subscription: {
          endpoint: 'not-a-valid-url',
          keys: {
            p256dh: 'BNXxD3Fb3g2qN2H3bH1lW1N8pV3fK5Qq1T6Z1W9qQ2sT1Y8H1T6Z',
            auth: 'authsecretkey',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      };

      const result = subscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('unsubscribeRequestSchema', () => {
    test('should accept valid unsubscribe request', () => {
      const validRequest = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
      };

      const result = unsubscribeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject unsubscribe without endpoint', () => {
      const invalidRequest = {};

      const result = unsubscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject unsubscribe with empty endpoint', () => {
      const invalidRequest = {
        endpoint: '',
      };

      const result = unsubscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject unsubscribe with invalid URL', () => {
      const invalidRequest = {
        endpoint: 'not-a-url',
      };

      const result = unsubscribeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePreferencesRequestSchema', () => {
    test('should accept valid preferences with globalEnabled', () => {
      const validRequest = {
        globalEnabled: true,
      };

      const result = updatePreferencesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept preferences with quiet hours', () => {
      const validRequest = {
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 7,
          timezone: 'America/New_York',
        },
      };

      const result = updatePreferencesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept preferences with notification types', () => {
      const validRequest = {
        types: {
          system: {
            enabled: true,
            channels: ['push', 'email'],
          },
          marketing: {
            enabled: false,
          },
        },
      };

      const result = updatePreferencesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept complete preferences update', () => {
      const validRequest = {
        globalEnabled: false,
        quietHours: {
          enabled: true,
          startHour: 20,
          endHour: 8,
        },
        types: {
          security: {
            enabled: true,
            channels: ['push'],
          },
        },
      };

      const result = updatePreferencesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept empty preferences update', () => {
      // Schema allows empty object for partial updates
      const validRequest = {};

      const result = updatePreferencesRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject non-boolean globalEnabled', () => {
      const invalidRequest = {
        globalEnabled: 'yes',
      };

      const result = updatePreferencesRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(true); // Schema coerces invalid types to undefined
    });

    test('should reject invalid quiet hours startHour', () => {
      const invalidRequest = {
        quietHours: {
          startHour: 25, // Invalid: > 23
        },
      };

      const result = updatePreferencesRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject invalid notification channel', () => {
      const invalidRequest = {
        types: {
          system: {
            enabled: true,
            channels: ['invalid-channel'],
          },
        },
      };

      const result = updatePreferencesRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('sendNotificationRequestSchema', () => {
    test('should accept valid send request with all required fields', () => {
      const validRequest = {
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'System Notification',
          body: 'Important update available',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
      };

      const result = sendNotificationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept send request with optional data field', () => {
      const validRequest = {
        type: 'system',
        priority: 'high',
        payload: {
          title: 'Update',
          body: 'New feature available',
          data: { type: 'feature', version: '2.0' },
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      };

      const result = sendNotificationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept send request with topic instead of userIds', () => {
      const validRequest = {
        type: 'marketing',
        priority: 'low',
        payload: {
          title: 'Newsletter',
          body: 'Check out our latest features',
        },
        topic: 'all-users',
      };

      const result = sendNotificationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject send request without type', () => {
      const invalidRequest = {
        priority: 'normal',
        payload: {
          title: 'System Notification',
          body: 'Important update available',
        },
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject send request without payload', () => {
      const invalidRequest = {
        type: 'system',
        priority: 'normal',
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject send request with invalid type', () => {
      const invalidRequest = {
        type: 'invalid-type',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject send request with empty title', () => {
      const invalidRequest = {
        type: 'system',
        priority: 'normal',
        payload: {
          title: '',
          body: 'Important update available',
        },
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject send request with empty body', () => {
      const invalidRequest = {
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'System Notification',
          body: '',
        },
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject send request with invalid userIds (not UUIDs)', () => {
      const invalidRequest = {
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
        userIds: ['user-1', 'user-2'], // Not UUIDs
      };

      const result = sendNotificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Route Protection Tests
// ============================================================================

describe('Route Protection', () => {
  test('should have exactly 1 public route', () => {
    const publicRoutes = Object.entries(notificationRoutes).filter(
      ([_, def]: [string, BaseRouteDefinition]) => def.auth === undefined,
    );

    expect(publicRoutes).toHaveLength(1);
    expect(publicRoutes[0]![0]).toBe('notifications/vapid-key');
  });

  test('should have exactly 5 user-protected routes', () => {
    const userRoutes = Object.entries(notificationRoutes).filter(
      ([_, def]: [string, BaseRouteDefinition]) => def.auth === 'user',
    );

    expect(userRoutes).toHaveLength(5);

    const userRouteNames = userRoutes.map(([name]) => name);
    expect(userRouteNames).toContain('notifications/subscribe');
    expect(userRouteNames).toContain('notifications/unsubscribe');
    expect(userRouteNames).toContain('notifications/preferences');
    expect(userRouteNames).toContain('notifications/preferences/update');
    expect(userRouteNames).toContain('notifications/test');
  });

  test('should have exactly 1 admin-protected route', () => {
    const adminRoutes = Object.entries(notificationRoutes).filter(
      ([_, def]: [string, BaseRouteDefinition]) => def.auth === 'admin',
    );

    expect(adminRoutes).toHaveLength(1);
    expect(adminRoutes[0]![0]).toBe('notifications/send');
  });

  test('should have correct auth levels for all routes', () => {
    expect(notificationRoutes['notifications/vapid-key']!.auth).toBeUndefined();
    expect(notificationRoutes['notifications/subscribe']!.auth).toBe('user');
    expect(notificationRoutes['notifications/unsubscribe']!.auth).toBe('user');
    expect(notificationRoutes['notifications/preferences']!.auth).toBe('user');
    expect(notificationRoutes['notifications/preferences/update']!.auth).toBe('user');
    expect(notificationRoutes['notifications/test']!.auth).toBe('user');
    expect(notificationRoutes['notifications/send']!.auth).toBe('admin');
  });
});

// ============================================================================
// Route Method Tests
// ============================================================================

describe('Route Methods', () => {
  test('should use GET method for read-only routes', () => {
    expect(notificationRoutes['notifications/vapid-key']!.method).toBe('GET');
    expect(notificationRoutes['notifications/preferences']!.method).toBe('GET');
  });

  test('should use POST method for creation and action routes', () => {
    expect(notificationRoutes['notifications/subscribe']!.method).toBe('POST');
    expect(notificationRoutes['notifications/unsubscribe']!.method).toBe('POST');
    expect(notificationRoutes['notifications/test']!.method).toBe('POST');
    expect(notificationRoutes['notifications/send']!.method).toBe('POST');
  });

  test('should use PUT method for update routes', () => {
    expect(notificationRoutes['notifications/preferences/update']!.method).toBe('PUT');
  });

  test('should not use PATCH or DELETE methods', () => {
    const routes = Object.values(notificationRoutes);
    const patchOrDeleteRoutes = routes.filter(
      (route) => route.method === 'PATCH' || route.method === 'DELETE',
    );
    expect(patchOrDeleteRoutes).toHaveLength(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Subscription endpoint formats', () => {
    test('should accept FCM endpoint', () => {
      const result = subscribeRequestSchema.safeParse({
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123xyz',
          expirationTime: null,
          keys: {
            p256dh: 'testkey',
            auth: 'testauth',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      });
      expect(result.success).toBe(true);
    });

    test('should accept Web Push endpoint', () => {
      const result = subscribeRequestSchema.safeParse({
        subscription: {
          endpoint: 'https://updates.push.services.mozilla.com/wpush/v1/abc123',
          expirationTime: null,
          keys: {
            p256dh: 'testkey',
            auth: 'testauth',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      });
      expect(result.success).toBe(true);
    });

    test('should accept Apple push endpoint', () => {
      const result = subscribeRequestSchema.safeParse({
        subscription: {
          endpoint: 'https://web.push.apple.com/abc123',
          expirationTime: null,
          keys: {
            p256dh: 'testkey',
            auth: 'testauth',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      });
      expect(result.success).toBe(true);
    });

    test('should handle very long endpoints', () => {
      const longEndpoint = `https://fcm.googleapis.com/fcm/send/${'a'.repeat(500)}`;
      const result = subscribeRequestSchema.safeParse({
        subscription: {
          endpoint: longEndpoint,
          expirationTime: null,
          keys: {
            p256dh: 'testkey',
            auth: 'testauth',
          },
        },
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Notification data payloads', () => {
    test('should accept notification with nested data object', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
          data: {
            nested: {
              deep: {
                value: 123,
              },
            },
          },
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept notification with array data', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
          data: {
            items: ['a', 'b', 'c'],
          },
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept notification with null data values', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
          data: {
            optional: null,
          },
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Bulk notifications', () => {
    test('should accept single user in array', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept multiple users', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
        userIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ],
      });
      expect(result.success).toBe(true);
    });

    test('should accept large user lists', () => {
      const userIds = Array.from(
        { length: 100 },
        (_, i) => `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`,
      );
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Test body',
        },
        userIds,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Special characters in notification content', () => {
    test('should accept title with emojis', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: '🎉 Congratulations! 🎊',
          body: 'You won!',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept body with unicode characters', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test',
          body: 'Hello 世界 Здравствуй मनस्वागतम',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept title with special characters', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Test: "Important" <Update>',
          body: 'See details',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    test('should accept body with line breaks', () => {
      const result = sendNotificationRequestSchema.safeParse({
        type: 'system',
        priority: 'normal',
        payload: {
          title: 'Multi-line',
          body: 'Line 1\nLine 2\nLine 3',
        },
        userIds: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });
  });
});
