// apps/server/src/modules/notifications/service.test.ts
/**
 * Notification Service Tests
 *
 * Tests for notification business logic.
 *
 * NOTE: The notification service now only handles subscription management
 * and preferences. Notification sending was removed (web-push package removed).
 *
 * Database-dependent functions (subscribe, unsubscribe, getUserSubscriptions,
 * getPreferences, updatePreferences, shouldSendNotification, etc.) require
 * integration tests with a real database connection.
 *
 * Key changes from previous version:
 * - sendToUser, sendToUsers, broadcast functions removed (web-push removed)
 * - getVapidPublicKey function removed (VAPID/web-push removed)
 * - All remaining functions require a DbClient as the first parameter
 * - All functions are async (return Promises)
 * - Subscriptions are stored in the push_subscriptions table
 * - Preferences are stored in the notification_preferences table
 */

import { describe, expect, it } from 'vitest';

describe('Notification Service', { timeout: 30000 }, () => {
  // This module currently has no unit-testable functions without database access.
  // All service functions require a database client.
  //
  // Integration tests should cover:
  // - subscribe(db, userId, subscription, deviceId, userAgent)
  // - unsubscribe(db, subscriptionId, endpoint)
  // - getUserSubscriptions(db, userId)
  // - getSubscriptionById(db, subscriptionId)
  // - markSubscriptionsExpired(db, subscriptionIds)
  // - getAllActiveSubscriptions(db)
  // - getPreferences(db, userId)
  // - updatePreferences(db, userId, updates)
  // - shouldSendNotification(db, userId, type)
  // - cleanupExpiredSubscriptions(db, inactiveDays)
  // - getSubscriptionStats(db)
  // - clearAllData(db)
  // - getSubscriptionCount(db)
  // - getActiveSubscriptionCount(db)

  it('should export subscription management functions', async () => {
    const { subscribe, unsubscribe, getUserSubscriptions, getSubscriptionById } =
      await import('@abe-stack/notifications/service');
    expect(typeof subscribe).toBe('function');
    expect(typeof unsubscribe).toBe('function');
    expect(typeof getUserSubscriptions).toBe('function');
    expect(typeof getSubscriptionById).toBe('function');
  });

  it('should export preference management functions', async () => {
    const { getPreferences, updatePreferences, shouldSendNotification } =
      await import('@abe-stack/notifications/service');
    expect(typeof getPreferences).toBe('function');
    expect(typeof updatePreferences).toBe('function');
    expect(typeof shouldSendNotification).toBe('function');
  });

  it('should export cleanup and stats functions', async () => {
    const { cleanupExpiredSubscriptions, getSubscriptionStats, clearAllData } =
      await import('@abe-stack/notifications/service');
    expect(typeof cleanupExpiredSubscriptions).toBe('function');
    expect(typeof getSubscriptionStats).toBe('function');
    expect(typeof clearAllData).toBe('function');
  });
});
