// packages/db/src/schema/push.ts
/**
 * Push Subscriptions Schema Types
 *
 * Explicit TypeScript interfaces for push notifications.
 */

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
 * Notification channel type
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

/**
 * Notification type categories
 */
export type NotificationType = 'system' | 'security' | 'marketing' | 'social' | 'transactional';

/**
 * Type preference structure stored as JSONB
 */
export interface TypePreferences {
  system: { enabled: boolean; channels: NotificationChannel[] };
  security: { enabled: boolean; channels: NotificationChannel[] };
  marketing: { enabled: boolean; channels: NotificationChannel[] };
  social: { enabled: boolean; channels: NotificationChannel[] };
  transactional: { enabled: boolean; channels: NotificationChannel[] };
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

/**
 * Default quiet hours configuration
 */
export const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  enabled: false,
  startHour: 22,
  endHour: 8,
  timezone: 'UTC',
};

/**
 * Default type preferences
 */
export const DEFAULT_TYPE_PREFERENCES: TypePreferences = {
  system: { enabled: true, channels: ['push', 'email', 'in_app'] },
  security: { enabled: true, channels: ['push', 'email', 'in_app'] },
  marketing: { enabled: false, channels: ['email'] },
  social: { enabled: true, channels: ['push', 'in_app'] },
  transactional: { enabled: true, channels: ['push', 'email', 'in_app'] },
};

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
