// main/server/db/src/schema/push.ts
/**
 * Push Subscriptions Schema Types
 *
 * Explicit TypeScript interfaces for push notifications.
 */

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationChannel,
  type NotificationType,
  type NotificationTypePreference,
} from '@bslt/shared';

export { DEFAULT_NOTIFICATION_PREFERENCES };
export type { NotificationChannel, NotificationType, NotificationTypePreference };

// ============================================================================
// Table Names
// ============================================================================

export const PUSH_SUBSCRIPTIONS_TABLE = 'push_subscriptions';
export const NOTIFICATION_PREFERENCES_TABLE = 'notification_preferences';

// ============================================================================
// Push Subscription Types
// ============================================================================

/**
 * Push subscription record (SELECT result)
 * Stores Web Push subscriptions for notification delivery.
 */
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime: Date | null;
  keysP256dh: string;
  keysAuth: string;
  deviceId: string;
  userAgent: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Data for creating a new push subscription (INSERT)
 */
export interface NewPushSubscription {
  id?: string;
  userId: string;
  endpoint: string;
  expirationTime?: Date | null;
  keysP256dh: string;
  keysAuth: string;
  deviceId: string;
  userAgent?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Column mappings for push_subscriptions table
 */
export const PUSH_SUBSCRIPTION_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  endpoint: 'endpoint',
  expirationTime: 'expiration_time',
  keysP256dh: 'keys_p256dh',
  keysAuth: 'keys_auth',
  deviceId: 'device_id',
  userAgent: 'user_agent',
  isActive: 'is_active',
  createdAt: 'created_at',
  lastUsedAt: 'last_used_at',
} as const;

// ============================================================================
// Notification Preference Types
// ============================================================================

/**
 * Type preference structure stored as JSONB.
 * Uses shared NotificationTypePreference for each notification type.
 */
export interface TypePreferences {
  system: NotificationTypePreference;
  security: NotificationTypePreference;
  marketing: NotificationTypePreference;
  social: NotificationTypePreference;
  transactional: NotificationTypePreference;
}

/**
 * Quiet hours configuration stored as JSONB
 */
export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string; // IANA timezone
}

/** Default quiet hours (derived from shared DEFAULT_NOTIFICATION_PREFERENCES) */
export const DEFAULT_QUIET_HOURS: QuietHoursConfig = DEFAULT_NOTIFICATION_PREFERENCES.quietHours;

/** Default type preferences (derived from shared DEFAULT_NOTIFICATION_PREFERENCES) */
export const DEFAULT_TYPE_PREFERENCES: TypePreferences = DEFAULT_NOTIFICATION_PREFERENCES.types;

/**
 * Notification preference record (SELECT result)
 */
export interface NotificationPreference {
  id: string;
  userId: string;
  globalEnabled: boolean;
  quietHours: QuietHoursConfig;
  types: TypePreferences;
  updatedAt: Date;
}

/**
 * Data for creating a new notification preference (INSERT)
 */
export interface NewNotificationPreference {
  id?: string;
  userId: string;
  globalEnabled?: boolean;
  quietHours?: QuietHoursConfig;
  types?: TypePreferences;
  updatedAt?: Date;
}

/**
 * Column mappings for notification_preferences table
 */
export const NOTIFICATION_PREFERENCE_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  globalEnabled: 'global_enabled',
  quietHours: 'quiet_hours',
  types: 'types',
  updatedAt: 'updated_at',
} as const;
