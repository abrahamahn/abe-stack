// main/server/db/src/schema/notifications.ts
/**
 * Notifications Schema Types
 *
 * TypeScript interfaces for the notifications table (in-app alerts).
 * Maps to migration 0004_notifications.sql.
 *
 * Note: push_subscriptions and notification_preferences are in ./push.ts
 * since they were part of the original schema. This file covers only the
 * notifications table itself.
 */

import { NOTIFICATION_LEVELS, type NotificationLevel } from '@bslt/shared';

// Re-export shared constants for consumers that import from schema
export { NOTIFICATION_LEVELS };
export type { NotificationLevel };

// ============================================================================
// Table Names
// ============================================================================

export const NOTIFICATIONS_TABLE = 'notifications';

// ============================================================================
// Notification Types
// ============================================================================

/**
 * In-app notification record (SELECT result).
 *
 * @see 0004_notifications.sql
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationLevel;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new notification.
 */
export interface NewNotification {
  id?: string;
  userId: string;
  type?: NotificationLevel;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead?: boolean;
  readAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing notification.
 * Only read state changes after creation.
 */
export interface UpdateNotification {
  isRead?: boolean;
  readAt?: Date | null;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const NOTIFICATION_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  type: 'type',
  title: 'title',
  message: 'message',
  data: 'data',
  isRead: 'is_read',
  readAt: 'read_at',
  createdAt: 'created_at',
} as const;
