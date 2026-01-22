// apps/server/src/modules/notifications/service.ts
/**
 * Notification Service
 *
 * Business logic for push notification operations including
 * subscription management, sending, and preference handling.
 *
 * Uses database persistence for subscriptions and preferences.
 */

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  ProviderNotConfiguredError,
  SubscriptionExistsError,
  VapidNotConfiguredError,
} from '@abe-stack/core';
import {
  notificationPreferences,
  pushSubscriptions,
  type DbClient,
  type QuietHoursConfig,
  type TypePreferences,
} from '@infrastructure';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type {
  BatchSendResult,
  NotificationPayload,
  NotificationPreferences,
  NotificationType,
  PushSubscription,
  StoredPushSubscription,
  UpdatePreferencesRequest,
} from '@abe-stack/core';
import type { NotificationService, SendOptions } from '@infrastructure/notifications';

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Subscribe a user to push notifications
 *
 * @param db - Database client
 * @param userId - User ID
 * @param subscription - Push subscription from browser
 * @param deviceId - Device identifier
 * @param userAgent - User agent string
 * @returns Subscription ID
 */
export async function subscribe(
  db: DbClient,
  userId: string,
  subscription: PushSubscription,
  deviceId: string,
  userAgent: string,
): Promise<string> {
  // Check if endpoint already exists
  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, subscription.endpoint),
  });

  if (existing) {
    if (existing.userId === userId) {
      // Update existing subscription - reactivate and update lastUsedAt
      await db
        .update(pushSubscriptions)
        .set({
          isActive: true,
          lastUsedAt: new Date(),
          keysP256dh: subscription.keys.p256dh,
          keysAuth: subscription.keys.auth,
          expirationTime: subscription.expirationTime
            ? new Date(subscription.expirationTime)
            : null,
        })
        .where(eq(pushSubscriptions.id, existing.id));
      return existing.id;
    }
    throw new SubscriptionExistsError('Endpoint already registered to another user');
  }

  // Create new subscription
  const [newSub] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
      keysP256dh: subscription.keys.p256dh,
      keysAuth: subscription.keys.auth,
      deviceId,
      userAgent: userAgent || null,
      isActive: true,
    })
    .returning({ id: pushSubscriptions.id });

  if (!newSub) {
    throw new Error('Failed to create subscription');
  }

  return newSub.id;
}

/**
 * Unsubscribe from push notifications
 *
 * @param db - Database client
 * @param subscriptionId - Subscription ID to remove
 * @param endpoint - Alternative: endpoint URL to remove
 * @returns true if subscription was found and removed
 */
export async function unsubscribe(
  db: DbClient,
  subscriptionId?: string,
  endpoint?: string,
): Promise<boolean> {
  let result;

  if (subscriptionId) {
    result = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.id, subscriptionId))
      .returning({ id: pushSubscriptions.id });
  } else if (endpoint) {
    result = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning({ id: pushSubscriptions.id });
  } else {
    return false;
  }

  return result.length > 0;
}

/**
 * Get all subscriptions for a user
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns Array of subscriptions
 */
export async function getUserSubscriptions(
  db: DbClient,
  userId: string,
): Promise<StoredPushSubscription[]> {
  const subs = await db.query.pushSubscriptions.findMany({
    where: and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)),
  });

  return subs.map(dbSubToStoredSub);
}

/**
 * Get subscription by ID
 *
 * @param db - Database client
 * @param subscriptionId - Subscription ID
 * @returns Subscription or undefined
 */
export async function getSubscriptionById(
  db: DbClient,
  subscriptionId: string,
): Promise<StoredPushSubscription | undefined> {
  const sub = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.id, subscriptionId),
  });

  return sub ? dbSubToStoredSub(sub) : undefined;
}

/**
 * Mark subscriptions as inactive (expired)
 *
 * @param db - Database client
 * @param subscriptionIds - IDs to mark as inactive
 */
export async function markSubscriptionsExpired(
  db: DbClient,
  subscriptionIds: string[],
): Promise<void> {
  if (subscriptionIds.length === 0) return;

  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(inArray(pushSubscriptions.id, subscriptionIds));
}

/**
 * Get all active subscriptions (for broadcast)
 *
 * @param db - Database client
 * @returns Array of all active subscriptions
 */
export async function getAllActiveSubscriptions(db: DbClient): Promise<StoredPushSubscription[]> {
  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.isActive, true),
  });

  return subs.map(dbSubToStoredSub);
}

/**
 * Convert database subscription to StoredPushSubscription
 */
function dbSubToStoredSub(dbSub: typeof pushSubscriptions.$inferSelect): StoredPushSubscription {
  return {
    id: dbSub.id,
    userId: dbSub.userId,
    endpoint: dbSub.endpoint,
    expirationTime: dbSub.expirationTime ? dbSub.expirationTime.getTime() : null,
    keys: {
      p256dh: dbSub.keysP256dh,
      auth: dbSub.keysAuth,
    },
    deviceId: dbSub.deviceId,
    userAgent: dbSub.userAgent ?? '',
    createdAt: dbSub.createdAt,
    lastUsedAt: dbSub.lastUsedAt,
    isActive: dbSub.isActive,
  };
}

// ============================================================================
// Notification Sending
// ============================================================================

/**
 * Send notification to a user
 *
 * @param db - Database client
 * @param notificationService - Notification service instance
 * @param userId - Target user ID
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Batch send result
 */
export async function sendToUser(
  db: DbClient,
  notificationService: NotificationService,
  userId: string,
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  const subscriptions = await getUserSubscriptions(db, userId);
  if (subscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const subscriptionsWithId = subscriptions.map((s) => ({
    id: s.id,
    subscription: {
      endpoint: s.endpoint,
      expirationTime: s.expirationTime,
      keys: s.keys,
    },
  }));

  const result = await provider.sendBatch(subscriptionsWithId, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    await markSubscriptionsExpired(db, result.expiredSubscriptions);
  }

  // Update lastUsedAt for successful sends
  const successfulIds = result.results.filter((r) => r.success).map((r) => r.subscriptionId);
  if (successfulIds.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ lastUsedAt: new Date() })
      .where(inArray(pushSubscriptions.id, successfulIds));
  }

  return result;
}

/**
 * Send notification to multiple users
 *
 * @param db - Database client
 * @param notificationService - Notification service instance
 * @param userIds - Target user IDs
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Aggregated batch send result
 */
export async function sendToUsers(
  db: DbClient,
  notificationService: NotificationService,
  userIds: string[],
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  // Get all active subscriptions for the given users
  const subs = await db.query.pushSubscriptions.findMany({
    where: and(inArray(pushSubscriptions.userId, userIds), eq(pushSubscriptions.isActive, true)),
  });

  if (subs.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const subscriptionsWithId = subs.map((s) => ({
    id: s.id,
    subscription: {
      endpoint: s.endpoint,
      expirationTime: s.expirationTime ? s.expirationTime.getTime() : null,
      keys: {
        p256dh: s.keysP256dh,
        auth: s.keysAuth,
      },
    },
  }));

  const result = await provider.sendBatch(subscriptionsWithId, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    await markSubscriptionsExpired(db, result.expiredSubscriptions);
  }

  return result;
}

/**
 * Broadcast notification to all subscribed users
 *
 * @param db - Database client
 * @param notificationService - Notification service instance
 * @param payload - Notification payload
 * @param options - Send options
 * @returns Batch send result
 */
export async function broadcast(
  db: DbClient,
  notificationService: NotificationService,
  payload: NotificationPayload,
  options?: SendOptions,
): Promise<BatchSendResult> {
  const provider = notificationService.getWebPushProvider();
  if (!provider) {
    throw new ProviderNotConfiguredError('web-push');
  }

  const subscriptions = await getAllActiveSubscriptions(db);

  if (subscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      expiredSubscriptions: [],
    };
  }

  const subscriptionsWithId = subscriptions.map((s) => ({
    id: s.id,
    subscription: {
      endpoint: s.endpoint,
      expirationTime: s.expirationTime,
      keys: s.keys,
    },
  }));

  const result = await provider.sendBatch(subscriptionsWithId, payload, options);

  // Clean up expired subscriptions
  if (result.expiredSubscriptions.length > 0) {
    await markSubscriptionsExpired(db, result.expiredSubscriptions);
  }

  return result;
}

// ============================================================================
// Preference Management
// ============================================================================

/**
 * Get user notification preferences
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns Notification preferences (creates defaults if not found)
 */
export async function getPreferences(
  db: DbClient,
  userId: string,
): Promise<NotificationPreferences> {
  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });

  if (existing) {
    return dbPrefsToNotificationPrefs(existing);
  }

  // Create default preferences
  const [newPrefs] = await db
    .insert(notificationPreferences)
    .values({
      userId,
      globalEnabled: DEFAULT_NOTIFICATION_PREFERENCES.globalEnabled,
      quietHours: DEFAULT_NOTIFICATION_PREFERENCES.quietHours as QuietHoursConfig,
      types: DEFAULT_NOTIFICATION_PREFERENCES.types as TypePreferences,
    })
    .returning();

  if (!newPrefs) {
    throw new Error('Failed to create notification preferences');
  }

  return dbPrefsToNotificationPrefs(newPrefs);
}

/**
 * Update user notification preferences
 *
 * @param db - Database client
 * @param userId - User ID
 * @param updates - Partial preference updates
 * @returns Updated preferences
 */
export async function updatePreferences(
  db: DbClient,
  userId: string,
  updates: UpdatePreferencesRequest,
): Promise<NotificationPreferences> {
  // Get current preferences (creates if not exists)
  const current = await getPreferences(db, userId);

  // Build update object
  const updateData: Partial<typeof notificationPreferences.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (updates.globalEnabled !== undefined) {
    updateData.globalEnabled = updates.globalEnabled;
  }

  if (updates.quietHours) {
    const newQuietHours = { ...current.quietHours };
    if (updates.quietHours.enabled !== undefined) {
      newQuietHours.enabled = updates.quietHours.enabled;
    }
    if (updates.quietHours.startHour !== undefined) {
      newQuietHours.startHour = updates.quietHours.startHour;
    }
    if (updates.quietHours.endHour !== undefined) {
      newQuietHours.endHour = updates.quietHours.endHour;
    }
    if (updates.quietHours.timezone !== undefined) {
      newQuietHours.timezone = updates.quietHours.timezone;
    }
    updateData.quietHours = newQuietHours as QuietHoursConfig;
  }

  if (updates.types) {
    const newTypes = { ...current.types };
    for (const type of Object.keys(updates.types) as NotificationType[]) {
      const typeUpdate = updates.types[type];
      if (!typeUpdate) {
        continue;
      }
      if (typeUpdate.enabled !== undefined) {
        newTypes[type].enabled = typeUpdate.enabled;
      }
      if (typeUpdate.channels !== undefined) {
        newTypes[type].channels = typeUpdate.channels;
      }
    }
    updateData.types = newTypes as TypePreferences;
  }

  const [updated] = await db
    .update(notificationPreferences)
    .set(updateData)
    .where(eq(notificationPreferences.userId, userId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update notification preferences');
  }

  return dbPrefsToNotificationPrefs(updated);
}

/**
 * Check if user should receive notification of given type
 * Now with proper timezone support for quiet hours
 *
 * @param db - Database client
 * @param userId - User ID
 * @param type - Notification type
 * @returns true if notification should be sent
 */
export async function shouldSendNotification(
  db: DbClient,
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const prefs = await getPreferences(db, userId);

  // Check global enabled
  if (!prefs.globalEnabled) {
    return false;
  }

  // Check type-specific enabled
  const typePrefs = prefs.types[type];
  if (!typePrefs.enabled) {
    return false;
  }

  // Check if push channel is enabled for this type
  if (!typePrefs.channels.includes('push')) {
    return false;
  }

  // Check quiet hours with timezone support
  if (prefs.quietHours.enabled) {
    const userHour = getCurrentHourInTimezone(prefs.quietHours.timezone);
    const { startHour, endHour } = prefs.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startHour > endHour) {
      if (userHour >= startHour || userHour < endHour) {
        return false;
      }
    } else {
      if (userHour >= startHour && userHour < endHour) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get current hour in a specific timezone
 * Falls back to UTC if timezone is invalid
 */
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : new Date().getUTCHours();
  } catch {
    // Invalid timezone, fall back to UTC
    return new Date().getUTCHours();
  }
}

/**
 * Convert database preferences to NotificationPreferences
 */
function dbPrefsToNotificationPrefs(
  dbPrefs: typeof notificationPreferences.$inferSelect,
): NotificationPreferences {
  return {
    userId: dbPrefs.userId,
    globalEnabled: dbPrefs.globalEnabled,
    quietHours: dbPrefs.quietHours as NotificationPreferences['quietHours'],
    types: dbPrefs.types as NotificationPreferences['types'],
    updatedAt: dbPrefs.updatedAt,
  };
}

// ============================================================================
// VAPID Key Access
// ============================================================================

/**
 * Get VAPID public key for client subscription
 *
 * @param notificationService - Notification service instance
 * @returns VAPID public key
 */
export function getVapidPublicKey(notificationService: NotificationService): string {
  const publicKey = notificationService.getVapidPublicKey();
  if (!publicKey) {
    throw new VapidNotConfiguredError();
  }
  return publicKey;
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up expired and inactive push subscriptions
 *
 * @param db - Database client
 * @param inactiveDays - Delete subscriptions not used for this many days
 * @returns Number of subscriptions deleted
 */
export async function cleanupExpiredSubscriptions(
  db: DbClient,
  inactiveDays: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  // Delete subscriptions that are:
  // 1. Marked as inactive, OR
  // 2. Not used for `inactiveDays` days, OR
  // 3. Past their expiration time
  const result = await db
    .delete(pushSubscriptions)
    .where(
      sql`${pushSubscriptions.isActive} = false
        OR ${pushSubscriptions.lastUsedAt} < ${cutoffDate}
        OR (${pushSubscriptions.expirationTime} IS NOT NULL
            AND ${pushSubscriptions.expirationTime} < NOW())`,
    )
    .returning({ id: pushSubscriptions.id });

  return result.length;
}

/**
 * Get subscription statistics
 *
 * @param db - Database client
 * @returns Stats about subscriptions
 */
export async function getSubscriptionStats(db: DbClient): Promise<{
  total: number;
  active: number;
  inactive: number;
  expiringSoon: number;
}> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pushSubscriptions);

  const [activeResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));

  const [expiringSoonResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pushSubscriptions)
    .where(
      sql`${pushSubscriptions.expirationTime} IS NOT NULL
        AND ${pushSubscriptions.expirationTime} <= ${weekFromNow}
        AND ${pushSubscriptions.expirationTime} > ${now}`,
    );

  const total = totalResult?.count ?? 0;
  const active = activeResult?.count ?? 0;
  const expiringSoon = expiringSoonResult?.count ?? 0;

  return {
    total,
    active,
    inactive: total - active,
    expiringSoon,
  };
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Clear all stored data (for testing)
 *
 * @param db - Database client
 */
export async function clearAllData(db: DbClient): Promise<void> {
  await db.delete(pushSubscriptions);
  await db.delete(notificationPreferences);
}

/**
 * Get subscription count (for testing/monitoring)
 *
 * @param db - Database client
 */
export async function getSubscriptionCount(db: DbClient): Promise<number> {
  const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(pushSubscriptions);
  return result?.count ?? 0;
}

/**
 * Get active subscription count (for testing/monitoring)
 *
 * @param db - Database client
 */
export async function getActiveSubscriptionCount(db: DbClient): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));
  return result?.count ?? 0;
}
