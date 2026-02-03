// packages/db/src/repositories/notifications/notifications.ts
/**
 * Notifications Repository (Functional)
 *
 * Data access layer for the notifications table (in-app alerts).
 * Manages user notification records with read/unread tracking.
 *
 * @module
 */

import { and, eq, select, selectCount, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewNotification,
  type Notification,
  type UpdateNotification,
  NOTIFICATION_COLUMNS,
  NOTIFICATIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Notification Repository Interface
// ============================================================================

/**
 * Functional repository for in-app notification operations
 */
export interface NotificationRepository {
  /**
   * Create a new notification
   * @param data - The notification data to insert
   * @returns The created notification
   * @throws Error if insert fails
   */
  create(data: NewNotification): Promise<Notification>;

  /**
   * Find a notification by its ID
   * @param id - The notification ID
   * @returns The notification or null if not found
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Find notifications for a user with pagination
   * @param userId - The user ID
   * @param limit - Maximum results (default: 50)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of notifications, most recent first
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;

  /**
   * Count unread notifications for a user
   * @param userId - The user ID
   * @returns Number of unread notifications
   */
  countUnread(userId: string): Promise<number>;

  /**
   * Mark a single notification as read
   * @param id - The notification ID
   * @returns The updated notification or null if not found
   */
  markAsRead(id: string): Promise<Notification | null>;

  /**
   * Mark all notifications as read for a user
   * @param userId - The user ID
   * @returns Number of notifications marked as read
   */
  markAllAsRead(userId: string): Promise<number>;

  /**
   * Delete a notification by ID
   * @param id - The notification ID to delete
   * @returns True if the notification was deleted
   */
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// Notification Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Notification type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Notification object
 * @complexity O(n) where n is number of columns
 */
function transformNotification(row: Record<string, unknown>): Notification {
  return toCamelCase<Notification>(row, NOTIFICATION_COLUMNS);
}

/**
 * Create a notification repository bound to a database connection
 * @param db - The raw database client
 * @returns NotificationRepository implementation
 */
export function createNotificationRepository(db: RawDb): NotificationRepository {
  return {
    async create(data: NewNotification): Promise<Notification> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        NOTIFICATION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(NOTIFICATIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create notification');
      }
      return transformNotification(result);
    },

    async findById(id: string): Promise<Notification | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(NOTIFICATIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? transformNotification(result) : null;
    },

    async findByUserId(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
      const results = await db.query<Record<string, unknown>>(
        select(NOTIFICATIONS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset)
          .toSql(),
      );
      return results.map(transformNotification);
    },

    async countUnread(userId: string): Promise<number> {
      const result = await db.queryOne<Record<string, unknown>>(
        selectCount(NOTIFICATIONS_TABLE)
          .where(and(eq('user_id', userId), eq('is_read', false)))
          .toSql(),
      );
      return result !== null ? Number(result['count']) : 0;
    },

    async markAsRead(id: string): Promise<Notification | null> {
      const data: UpdateNotification = { isRead: true, readAt: new Date() };
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        NOTIFICATION_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        update(NOTIFICATIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformNotification(result) : null;
    },

    async markAllAsRead(userId: string): Promise<number> {
      const data: UpdateNotification = { isRead: true, readAt: new Date() };
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        NOTIFICATION_COLUMNS,
      );
      return db.execute(
        update(NOTIFICATIONS_TABLE)
          .set(snakeData)
          .where(and(eq('user_id', userId), eq('is_read', false)))
          .toSql(),
      );
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(NOTIFICATIONS_TABLE).where(eq('id', id)).toSql(),
      );
      return count > 0;
    },
  };
}
