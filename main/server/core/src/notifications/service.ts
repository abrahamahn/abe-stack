// main/server/core/src/notifications/service.ts
/**
 * Notification Service
 *
 * Business logic for push notification operations including
 * subscription management and preference handling.
 *
 * Uses database persistence for subscriptions and preferences.
 *
 * NOTE: Notification sending has been removed (web-push package removed).
 * Subscription management and preferences remain for future provider implementations.
 */

import {
  DAYS_PER_WEEK,
  DEFAULT_NOTIFICATION_PREFERENCES,
  MS_PER_DAY,
  PushSubscriptionExistsError,
} from '@bslt/shared';

import {
  NOTIFICATIONS_TABLE,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  and,
  deleteFrom,
  eq,
  inArray,
  insert,
  select,
  selectCount,
  toCamelCase,
  update,
  type DbClient,
  type NotificationPreference as DbNotificationPreference,
  type PushSubscription as DbPushSubscription,
  type NewNotification,
  type QuietHoursConfig,
  type TypePreferences,
} from '../../../db/src';

import type {
  NotificationLevel,
  NotificationPreferences,
  NotificationType,
  PushSubscription,
  StoredPushSubscription,
  UpdatePreferencesRequest,
} from '@bslt/shared';

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Subscribe a user to push notifications.
 *
 * If an endpoint already exists for the same user, the subscription is
 * reactivated and updated. If the endpoint belongs to a different user,
 * a PushSubscriptionExistsError is thrown.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param subscription - Push subscription from browser
 * @param deviceId - Device identifier
 * @param userAgent - User agent string
 * @returns Subscription ID
 * @throws {PushSubscriptionExistsError} If the endpoint is registered to another user
 * @throws {Error} If the subscription insert fails
 * @complexity O(1) - single query + conditional update or insert
 */
export async function subscribe(
  db: DbClient,
  userId: string,
  subscription: PushSubscription,
  deviceId: string,
  userAgent: string,
): Promise<string> {
  // Check if endpoint already exists
  const existingRow = await db.queryOne(
    select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', subscription.endpoint)).limit(1).toSql(),
  );

  if (existingRow !== null) {
    const existing = toCamelCase<DbPushSubscription>(existingRow, PUSH_SUBSCRIPTION_COLUMNS);
    if (existing.userId === userId) {
      // Update existing subscription - reactivate and update lastUsedAt
      await db.execute(
        update(PUSH_SUBSCRIPTIONS_TABLE)
          .set({
            is_active: true,
            last_used_at: new Date(),
            keys_p256dh: subscription.keys.p256dh,
            keys_auth: subscription.keys.auth,
            expiration_time:
              subscription.expirationTime !== null && subscription.expirationTime !== 0
                ? new Date(subscription.expirationTime)
                : null,
          })
          .where(eq('id', existing.id))
          .toSql(),
      );
      return existing.id;
    }
    throw new PushSubscriptionExistsError('Endpoint already registered to another user');
  }

  // Create new subscription
  const newSubRows = await db.query(
    insert(PUSH_SUBSCRIPTIONS_TABLE)
      .values({
        user_id: userId,
        endpoint: subscription.endpoint,
        expiration_time:
          subscription.expirationTime !== null && subscription.expirationTime !== 0
            ? new Date(subscription.expirationTime)
            : null,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth,
        device_id: deviceId,
        user_agent: userAgent !== '' ? userAgent : null,
        is_active: true,
      })
      .returning('id')
      .toSql(),
  );

  if (newSubRows[0] === undefined) {
    throw new Error('Failed to create subscription');
  }

  return (newSubRows[0] as { id: string }).id;
}

/**
 * Unsubscribe from push notifications.
 *
 * Removes a subscription by ID or endpoint URL. At least one identifier
 * must be provided.
 *
 * @param db - Database client
 * @param subscriptionId - Subscription ID to remove
 * @param endpoint - Alternative: endpoint URL to remove
 * @returns true if subscription was found and removed
 * @complexity O(1) - single delete query
 */
export async function unsubscribe(
  db: DbClient,
  subscriptionId?: string,
  endpoint?: string,
): Promise<boolean> {
  let result: Record<string, unknown>[];

  if (subscriptionId !== undefined && subscriptionId !== '') {
    result = await db.query(
      deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('id', subscriptionId)).returning('id').toSql(),
    );
  } else if (endpoint !== undefined && endpoint !== '') {
    result = await db.query(
      deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).where(eq('endpoint', endpoint)).returning('id').toSql(),
    );
  } else {
    return false;
  }

  return result.length > 0;
}

/**
 * Get all subscriptions for a user.
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns Array of active subscriptions for the user
 * @complexity O(n) where n is the number of active subscriptions
 */
export async function getUserSubscriptions(
  db: DbClient,
  userId: string,
): Promise<StoredPushSubscription[]> {
  const rows = await db.query(
    select(PUSH_SUBSCRIPTIONS_TABLE)
      .where(and(eq('user_id', userId), eq('is_active', true)))
      .toSql(),
  );

  return rows.map((row) => {
    const sub = toCamelCase<DbPushSubscription>(row, PUSH_SUBSCRIPTION_COLUMNS);
    return dbSubToStoredSub(sub);
  });
}

/**
 * Get subscription by ID.
 *
 * @param db - Database client
 * @param subscriptionId - Subscription ID
 * @returns Subscription or undefined if not found
 * @complexity O(1) - single query by primary key
 */
export async function getSubscriptionById(
  db: DbClient,
  subscriptionId: string,
): Promise<StoredPushSubscription | undefined> {
  const row = await db.queryOne(
    select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('id', subscriptionId)).limit(1).toSql(),
  );

  if (row === null) return undefined;
  const sub = toCamelCase<DbPushSubscription>(row, PUSH_SUBSCRIPTION_COLUMNS);
  return dbSubToStoredSub(sub);
}

/**
 * Mark subscriptions as inactive (expired).
 *
 * @param db - Database client
 * @param subscriptionIds - IDs to mark as inactive
 * @complexity O(n) where n is the number of subscription IDs
 */
export async function markSubscriptionsExpired(
  db: DbClient,
  subscriptionIds: string[],
): Promise<void> {
  if (subscriptionIds.length === 0) return;

  await db.execute(
    update(PUSH_SUBSCRIPTIONS_TABLE)
      .set({ is_active: false })
      .where(inArray('id', subscriptionIds))
      .toSql(),
  );
}

/**
 * Get all active subscriptions (for broadcast).
 *
 * @param db - Database client
 * @returns Array of all active subscriptions
 * @complexity O(n) where n is the total number of active subscriptions
 */
export async function getAllActiveSubscriptions(db: DbClient): Promise<StoredPushSubscription[]> {
  const rows = await db.query(
    select(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', true)).toSql(),
  );

  return rows.map((row) => {
    const sub = toCamelCase<DbPushSubscription>(row, PUSH_SUBSCRIPTION_COLUMNS);
    return dbSubToStoredSub(sub);
  });
}

/**
 * Convert database subscription to StoredPushSubscription.
 *
 * @param dbSub - Database subscription record
 * @returns Normalized StoredPushSubscription
 * @complexity O(1)
 */
function dbSubToStoredSub(dbSub: DbPushSubscription): StoredPushSubscription {
  return {
    id: dbSub.id,
    userId: dbSub.userId,
    endpoint: dbSub.endpoint,
    expirationTime: dbSub.expirationTime !== null ? dbSub.expirationTime.getTime() : null,
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
// Preference Management
// ============================================================================

/**
 * Get user notification preferences.
 *
 * If preferences don't exist for the user, default preferences are created
 * and returned.
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns Notification preferences (creates defaults if not found)
 * @throws {Error} If the preference insert fails
 * @complexity O(1) - single query + conditional insert
 */
export async function getPreferences(
  db: DbClient,
  userId: string,
): Promise<NotificationPreferences> {
  const existingRow = await db.queryOne(
    select(NOTIFICATION_PREFERENCES_TABLE).where(eq('user_id', userId)).limit(1).toSql(),
  );

  if (existingRow !== null) {
    const prefs = toCamelCase<DbNotificationPreference>(
      existingRow,
      NOTIFICATION_PREFERENCE_COLUMNS,
    );
    return dbPrefsToNotificationPrefs(prefs);
  }

  // Create default preferences
  const newPrefsRows = await db.query(
    insert(NOTIFICATION_PREFERENCES_TABLE)
      .values({
        user_id: userId,
        global_enabled: DEFAULT_NOTIFICATION_PREFERENCES.globalEnabled,
        quiet_hours: DEFAULT_NOTIFICATION_PREFERENCES.quietHours as QuietHoursConfig,
        types: DEFAULT_NOTIFICATION_PREFERENCES.types as TypePreferences,
      })
      .returningAll()
      .toSql(),
  );

  if (newPrefsRows[0] === undefined) {
    throw new Error('Failed to create notification preferences');
  }

  const newPrefs = toCamelCase<DbNotificationPreference>(
    newPrefsRows[0],
    NOTIFICATION_PREFERENCE_COLUMNS,
  );
  return dbPrefsToNotificationPrefs(newPrefs);
}

/**
 * Update user notification preferences.
 *
 * Merges updates with current preferences, supporting partial updates
 * for globalEnabled, quietHours, and individual notification types.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param updates - Partial preference updates
 * @returns Updated preferences
 * @throws {Error} If the preference update fails
 * @complexity O(1) - get current + update
 */
export async function updatePreferences(
  db: DbClient,
  userId: string,
  updates: UpdatePreferencesRequest,
): Promise<NotificationPreferences> {
  // Get current preferences (creates if not exists)
  const current = await getPreferences(db, userId);

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (updates.globalEnabled !== undefined) {
    updateData['global_enabled'] = updates.globalEnabled;
  }

  const quietHoursUpdate = updates.quietHours;
  if (quietHoursUpdate !== undefined) {
    // Type assertion needed for JSONB field from database
    const newQuietHours: QuietHoursConfig = {
      ...(current.quietHours as QuietHoursConfig),
    };
    if (quietHoursUpdate.enabled !== undefined) {
      newQuietHours.enabled = quietHoursUpdate.enabled;
    }
    if (quietHoursUpdate.startHour !== undefined) {
      newQuietHours.startHour = quietHoursUpdate.startHour;
    }
    if (quietHoursUpdate.endHour !== undefined) {
      newQuietHours.endHour = quietHoursUpdate.endHour;
    }
    if (quietHoursUpdate.timezone !== undefined) {
      newQuietHours.timezone = quietHoursUpdate.timezone;
    }
    updateData['quiet_hours'] = newQuietHours;
  }

  const typesUpdate = updates.types;
  if (typesUpdate !== undefined) {
    // Type assertion needed for JSONB field from database
    const newTypes: TypePreferences = {
      ...(current.types as TypePreferences),
    };
    for (const type of Object.keys(typesUpdate) as NotificationType[]) {
      const typeUpdate = typesUpdate[type];
      if (typeUpdate === undefined) {
        continue;
      }
      const existingType = newTypes[type as keyof typeof newTypes];
      // No longer checking for undefined - TypePreferences ensures all types exist
      if (typeUpdate.enabled !== undefined) {
        existingType.enabled = typeUpdate.enabled;
      }
      if (typeUpdate.channels !== undefined) {
        existingType.channels = typeUpdate.channels;
      }
    }
    updateData['types'] = newTypes;
  }

  const updatedRows = await db.query(
    update(NOTIFICATION_PREFERENCES_TABLE)
      .set(updateData)
      .where(eq('user_id', userId))
      .returningAll()
      .toSql(),
  );

  if (updatedRows[0] === undefined) {
    throw new Error('Failed to update notification preferences');
  }

  const updated = toCamelCase<DbNotificationPreference>(
    updatedRows[0],
    NOTIFICATION_PREFERENCE_COLUMNS,
  );
  return dbPrefsToNotificationPrefs(updated);
}

/**
 * Check if user should receive notification of given type.
 *
 * Evaluates preferences in order:
 * 1. Global enabled flag
 * 2. Type-specific enabled flag
 * 3. Push channel presence for the type
 * 4. Quiet hours with timezone support
 *
 * @param db - Database client
 * @param userId - User ID
 * @param type - Notification type
 * @returns true if notification should be sent
 * @complexity O(1) - single preference lookup + evaluation
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
  // Type assertion needed for JSONB field from database
  const prefsTypes = prefs.types as TypePreferences;
  const typePrefs = prefsTypes[type as keyof TypePreferences];
  if (!typePrefs.enabled) {
    return false;
  }

  // Check if push channel is enabled for this type
  const channels: string[] = typePrefs.channels;
  if (channels.length === 0 || !channels.includes('push')) {
    return false;
  }

  // Check quiet hours with timezone support
  // Type assertion needed for JSONB field from database
  const prefsQuietHours = prefs.quietHours as QuietHoursConfig;
  if (prefsQuietHours.enabled) {
    const timezone: string = prefsQuietHours.timezone;
    const userHour = getCurrentHourInTimezone(timezone);
    const startHour: number = prefsQuietHours.startHour;
    const endHour: number = prefsQuietHours.endHour;

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
 * Get current hour in a specific timezone.
 * Falls back to UTC if timezone is invalid.
 *
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Current hour (0-23) in the specified timezone
 * @complexity O(1)
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
    return hourPart !== undefined ? parseInt(hourPart.value, 10) : new Date().getUTCHours();
  } catch {
    // Invalid timezone, fall back to UTC
    return new Date().getUTCHours();
  }
}

/**
 * Convert database preferences to NotificationPreferences.
 *
 * @param dbPrefs - Database preference record
 * @returns Normalized NotificationPreferences
 * @complexity O(1)
 */
function dbPrefsToNotificationPrefs(dbPrefs: DbNotificationPreference): NotificationPreferences {
  // Database JSONB fields are properly typed in the schema
  const quietHours: QuietHoursConfig = dbPrefs.quietHours;
  const types: TypePreferences = dbPrefs.types;
  return {
    userId: dbPrefs.userId,
    globalEnabled: dbPrefs.globalEnabled,
    quietHours,
    types,
    updatedAt: dbPrefs.updatedAt,
  };
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up expired and inactive push subscriptions.
 *
 * Deletes subscriptions that are:
 * 1. Marked as inactive, OR
 * 2. Not used for `inactiveDays` days, OR
 * 3. Past their expiration time
 *
 * @param db - Database client
 * @param inactiveDays - Delete subscriptions not used for this many days (default: 90)
 * @returns Number of subscriptions deleted
 * @complexity O(n) where n is the number of matching subscriptions
 */
export async function cleanupExpiredSubscriptions(
  db: DbClient,
  inactiveDays: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  const result = await db.raw<{ id: string }>(
    `DELETE FROM ${PUSH_SUBSCRIPTIONS_TABLE}
     WHERE is_active = false
        OR last_used_at < $1
        OR (expiration_time IS NOT NULL AND expiration_time < NOW())
     RETURNING id`,
    [cutoffDate],
  );

  return result.length;
}

/**
 * Get subscription statistics.
 *
 * @param db - Database client
 * @returns Stats about subscriptions (total, active, inactive, expiring soon)
 * @complexity O(1) - aggregate queries
 */
export async function getSubscriptionStats(db: DbClient): Promise<{
  total: number;
  active: number;
  inactive: number;
  expiringSoon: number;
}> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + DAYS_PER_WEEK * MS_PER_DAY);

  const totalResult = await db.queryOne<{ count: number }>(
    selectCount(PUSH_SUBSCRIPTIONS_TABLE).toSql(),
  );

  const activeResult = await db.queryOne<{ count: number }>(
    selectCount(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', true)).toSql(),
  );

  type ExpiringSoonRow = Record<string, unknown> & { count: string | number };
  const expiringSoonResult = await db.queryOne<ExpiringSoonRow>({
    text: `SELECT COUNT(*)::int as count FROM ${PUSH_SUBSCRIPTIONS_TABLE}
             WHERE expiration_time IS NOT NULL
               AND expiration_time <= $1
               AND expiration_time > $2`,
    values: [weekFromNow, now],
  });

  const total = totalResult?.count ?? 0;
  const active = activeResult?.count ?? 0;
  const expiringSoon =
    typeof expiringSoonResult?.count === 'number'
      ? expiringSoonResult.count
      : parseInt(String(expiringSoonResult?.count ?? 0), 10);

  return {
    total,
    active,
    inactive: total - active,
    expiringSoon,
  };
}

// ============================================================================
// Event-Driven Notifications
// ============================================================================

/**
 * Event types that can trigger in-app notifications.
 */
export type NotificationEventType =
  | 'invite_received'
  | 'payment_success'
  | 'payment_failed'
  | 'security_alert'
  | 'plan_changed';

/**
 * Map event types to notification categories for preference checks.
 */
const EVENT_TYPE_TO_NOTIFICATION_TYPE: Record<NotificationEventType, NotificationType> = {
  invite_received: 'social',
  payment_success: 'transactional',
  payment_failed: 'transactional',
  security_alert: 'security',
  plan_changed: 'transactional',
};

/**
 * Map event types to in-app notification severity levels.
 */
const EVENT_TYPE_TO_LEVEL: Record<NotificationEventType, NotificationLevel> = {
  invite_received: 'info',
  payment_success: 'success',
  payment_failed: 'error',
  security_alert: 'warning',
  plan_changed: 'info',
};

/**
 * Create an in-app notification for a system event.
 * Called by other modules when key events occur.
 *
 * Checks user preferences before creating the notification.
 * If the user has disabled the relevant notification type, no record is created.
 *
 * @param db - Database client
 * @param userId - Target user ID
 * @param event - Event details including type, title, message, and optional metadata
 * @complexity O(1) - preference check + conditional insert
 */
export async function createNotificationForEvent(
  db: DbClient,
  userId: string,
  event: {
    type: NotificationEventType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  // Check if user wants notifications for this event type
  const notificationType = EVENT_TYPE_TO_NOTIFICATION_TYPE[event.type];
  const allowed = await shouldSendNotification(db, userId, notificationType);
  if (!allowed) {
    return;
  }

  const level = EVENT_TYPE_TO_LEVEL[event.type];
  const notification: NewNotification = {
    userId,
    type: level,
    title: event.title,
    message: event.message,
    data: event.metadata ?? null,
  };

  await db.execute(
    insert(NOTIFICATIONS_TABLE)
      .values({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      })
      .toSql(),
  );
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Clear all stored notification data (for testing).
 *
 * Deletes all push subscriptions and notification preferences.
 *
 * @param db - Database client
 */
export async function clearAllData(db: DbClient): Promise<void> {
  await db.execute(deleteFrom(PUSH_SUBSCRIPTIONS_TABLE).toSql());
  await db.execute(deleteFrom(NOTIFICATION_PREFERENCES_TABLE).toSql());
}

/**
 * Get subscription count (for testing/monitoring).
 *
 * @param db - Database client
 * @returns Total number of subscriptions
 * @complexity O(1) - aggregate count query
 */
export async function getSubscriptionCount(db: DbClient): Promise<number> {
  const result = await db.queryOne<{ count: number }>(
    selectCount(PUSH_SUBSCRIPTIONS_TABLE).toSql(),
  );
  return result?.count ?? 0;
}

/**
 * Get active subscription count (for testing/monitoring).
 *
 * @param db - Database client
 * @returns Number of active subscriptions
 * @complexity O(1) - aggregate count query with filter
 */
export async function getActiveSubscriptionCount(db: DbClient): Promise<number> {
  const result = await db.queryOne<{ count: number }>(
    selectCount(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', true)).toSql(),
  );
  return result?.count ?? 0;
}
