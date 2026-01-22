// apps/server/src/infrastructure/data/database/schema/push-subscriptions.ts
/**
 * Push Subscriptions Schema
 *
 * Stores Web Push subscriptions for push notification delivery.
 * Subscriptions include browser endpoint, encryption keys, and metadata.
 */

import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

// ============================================================================
// Push Subscriptions Table
// ============================================================================

/**
 * Push subscriptions for Web Push notifications
 *
 * Security considerations:
 * - Keys are stored encrypted at rest (database-level encryption recommended)
 * - Endpoints are unique per subscription
 * - Inactive subscriptions should be cleaned up regularly
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    // Expiration time from browser (milliseconds since epoch, null if no expiration)
    expirationTime: timestamp('expiration_time'),
    // Push encryption keys (p256dh and auth, base64url encoded)
    keysP256dh: text('keys_p256dh').notNull(),
    keysAuth: text('keys_auth').notNull(),
    // Device metadata
    deviceId: text('device_id').notNull(),
    userAgent: text('user_agent'),
    // Status tracking
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  },
  (table) => [
    // Index for finding subscriptions by user
    index('push_subscriptions_user_id_idx').on(table.userId),
    // Index for finding active subscriptions
    index('push_subscriptions_user_id_is_active_idx').on(table.userId, table.isActive),
    // Index for cleanup queries (expired or inactive)
    index('push_subscriptions_is_active_last_used_at_idx').on(table.isActive, table.lastUsedAt),
    // Index for expiration cleanup
    index('push_subscriptions_expiration_time_idx').on(table.expirationTime),
  ],
);

// Inferred types
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

// ============================================================================
// Notification Preferences Table
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
 * User notification preferences
 *
 * Stores per-user notification settings including:
 * - Global enabled flag
 * - Per-type preferences (system, security, marketing, social, transactional)
 * - Quiet hours with timezone support
 */
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  globalEnabled: boolean('global_enabled').default(true).notNull(),
  quietHours: jsonb('quiet_hours').$type<QuietHoursConfig>().default({
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: 'UTC',
  }),
  types: jsonb('types')
    .$type<TypePreferences>()
    .default({
      system: { enabled: true, channels: ['push', 'email', 'in_app'] },
      security: { enabled: true, channels: ['push', 'email', 'in_app'] },
      marketing: { enabled: false, channels: ['email'] },
      social: { enabled: true, channels: ['push', 'in_app'] },
      transactional: { enabled: true, channels: ['push', 'email', 'in_app'] },
    }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inferred types
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
