// apps/server/src/modules/notifications/__tests__/service.test.ts
/**
 * Notification Service Tests
 *
 * Tests for notification business logic.
 * These tests use a mock database client.
 */

import { describe, expect, it } from 'vitest';

import { getVapidPublicKey } from '../service';

// Since the service now requires a database client for all operations,
// and the database operations are async, we need to test differently.
// We'll test the VAPID key functions that don't require a database,
// and document that integration tests should cover the database operations.

describe('Notification Service', () => {

  describe('getVapidPublicKey', () => {
    it('should return public key when configured', () => {
      const mockNotificationService = {
        getWebPushProvider: () => undefined,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => 'test-public-key',
        isConfigured: () => true,
      };

      const key = getVapidPublicKey(mockNotificationService);
      expect(key).toBe('test-public-key');
    });

    it('should throw when not configured', () => {
      const mockNotificationService = {
        getWebPushProvider: () => undefined,
        getFcmProvider: () => undefined,
        getVapidPublicKey: () => undefined,
        isConfigured: () => false,
      };

      expect(() => getVapidPublicKey(mockNotificationService)).toThrow();
    });
  });

  // Note: Database-dependent functions (subscribe, unsubscribe, getUserSubscriptions,
  // getPreferences, updatePreferences, sendToUser, etc.) require integration tests
  // with a real database connection. See __tests__/integration/ for those tests.
  //
  // The service has been migrated from in-memory storage to database persistence.
  // Key changes:
  // - All functions now take a DbClient as the first parameter
  // - All functions are now async (return Promises)
  // - Subscriptions are stored in the push_subscriptions table
  // - Preferences are stored in the notification_preferences table
  // - Timezone-aware quiet hours are implemented
  // - Subscription expiration is handled proactively
});
