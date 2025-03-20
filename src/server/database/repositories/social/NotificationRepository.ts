import { DatabaseConnectionManager } from "@database/config";
import { BaseModelInterface } from "@database/models/BaseModel";
import { EntityType } from "@database/models/shared/EntityTypes";
import {
  NotificationPreferences,
  NotificationQueryOptions,
} from "@services/app/social/notification/NotificationService";
import { Logger } from "@services/dev/logger/LoggerService";

import {
  Notification,
  NotificationType,
} from "../../models/social/Notification";
import { BaseRepository } from "../BaseRepository";

export interface NotificationWithIndex
  extends Notification,
    BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Error class for notification-related errors
 */
export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

/**
 * Repository class for managing notifications
 */
export class NotificationRepository extends BaseRepository<NotificationWithIndex> {
  private static instance: NotificationRepository;
  protected logger: Logger;
  protected tableName = "notifications";
  protected columns = [
    "id",
    "type",
    "user_id",
    "actor_id",
    "entity_id",
    "entity_type",
    "content",
    "read",
    "delivered",
    "created_at",
    "updated_at",
  ];

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.logger = new Logger("NotificationRepository");
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): NotificationRepository {
    if (!NotificationRepository.instance) {
      NotificationRepository.instance = new NotificationRepository();
    }
    return NotificationRepository.instance;
  }

  /**
   * Create a new notification
   */
  async create(notification: Notification): Promise<Notification> {
    try {
      notification.validate();

      const query = `
        INSERT INTO notifications (
          id, type, user_id, actor_id, entity_id, entity_type, content, read, delivered, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        notification.id,
        notification.type,
        notification.userId,
        notification.actorId,
        notification.entityId,
        notification.entityType,
        notification.content,
        notification.read,
        notification.delivered,
        notification.createdAt,
        notification.updatedAt,
      ];

      const result = await DatabaseConnectionManager.getPool().query(
        query,
        values,
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error creating notification", error);
      throw new NotificationError(
        `Failed to create notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find a notification by its primary key
   */
  async findByPk(id: string): Promise<Notification | null> {
    try {
      const query = `
        SELECT * FROM notifications WHERE id = $1
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error(`Error finding notification with id ${id}`, error);
      throw new NotificationError(
        `Failed to find notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find notifications by user ID
   */
  async findByUserId(
    userId: string,
    _options?: NotificationQueryOptions,
  ): Promise<Notification[]> {
    // Implementation would filter by options
    return this.findAll({ where: { userId } });
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) FROM notifications 
        WHERE user_id = $1 AND read = false
      `;

      const result = await DatabaseConnectionManager.getPool().query<{
        count: string;
      }>(query, [userId]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error(`Error getting unread count for user ${userId}`, error);
      throw new NotificationError(
        `Failed to get unread count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      const query = `
        UPDATE notifications 
        SET read = true, updated_at = NOW() 
        WHERE id = ANY($1) AND user_id = $2
      `;

      await DatabaseConnectionManager.getPool().query(query, [
        notificationIds,
        userId,
      ]);
    } catch (error) {
      this.logger.error(`Error marking notifications as read`, error);
      throw new NotificationError(
        `Failed to mark notifications as read: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE notifications 
        SET read = true, updated_at = NOW() 
        WHERE user_id = $1 AND read = false 
        RETURNING *
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        userId,
      ]);
      return result.rows.length;
    } catch (error) {
      this.logger.error(
        `Error marking all notifications as read for user ${userId}`,
        error,
      );
      throw new NotificationError(
        `Failed to mark all notifications as read: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Mark notifications as delivered
   */
  async markAsDelivered(ids: string[]): Promise<void> {
    try {
      const query = `
        UPDATE notifications 
        SET delivered = true, updated_at = NOW() 
        WHERE id = ANY($1)
      `;

      await DatabaseConnectionManager.getPool().query(query, [ids]);
    } catch (error) {
      this.logger.error(`Error marking notifications as delivered`, error);
      throw new NotificationError(
        `Failed to mark notifications as delivered: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a notification
   */
  async delete(id: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE id = $1 
        RETURNING id
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        id,
      ]);

      if (result.rowCount === 0) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error deleting notification ${id}`, error);
      throw new NotificationError(
        `Failed to delete notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllForUser(userId: string): Promise<number> {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE user_id = $1 
        RETURNING id
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        userId,
      ]);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error(
        `Error deleting all notifications for user ${userId}`,
        error,
      );
      throw new NotificationError(
        `Failed to delete all notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteMany(
    notificationIds: string[],
    userId: string,
  ): Promise<boolean> {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE id = ANY($1) AND user_id = $2
        RETURNING id
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        notificationIds,
        userId,
      ]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      this.logger.error(`Error deleting notifications`, error);
      throw new NotificationError(
        `Failed to delete notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map database result to Notification model
   */
  mapResultToModel(row: Record<string, unknown>): Notification {
    return new Notification({
      id: String(row.id || ""),
      type: String(row.type || "") as NotificationType,
      userId: String(row.user_id || ""),
      actorId: row.actor_id ? String(row.actor_id) : null,
      entityId: row.entity_id ? String(row.entity_id) : null,
      entityType: row.entity_type
        ? (String(row.entity_type) as EntityType)
        : null,
      content: row.content ? String(row.content) : null,
      read: Boolean(row.read),
      delivered: Boolean(row.delivered),
      createdAt: new Date(String(row.created_at || "")),
      updatedAt: new Date(String(row.updated_at || "")),
    });
  }

  async countByUser(userId: string): Promise<number> {
    const result = await this.findByUserId(userId);
    return result ? 1 : 0;
  }

  /**
   * Count unread notifications for a user
   */
  async countUnread(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = $1 AND read = false
      `;

      const result = await DatabaseConnectionManager.getPool().query<{
        count: string;
      }>(query, [userId]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error(`Error counting unread notifications`, error);
      throw new NotificationError(
        `Failed to count unread notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch count unread notifications for multiple users
   */
  async batchCountUnread(userIds: string[]): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT user_id, COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ANY($1) AND read = false 
        GROUP BY user_id
      `;

      const result = await DatabaseConnectionManager.getPool().query<{
        user_id: string;
        count: string;
      }>(query, [userIds]);
      const counts = new Map<string, number>();
      result.rows.forEach((row) =>
        counts.set(row.user_id, parseInt(row.count, 10)),
      );
      return counts;
    } catch (error) {
      this.logger.error(`Error batch counting unread notifications`, error);
      throw new NotificationError(
        `Failed to batch count unread notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const query = `
        SELECT preferences FROM user_notification_preferences 
        WHERE user_id = $1
      `;

      const result = await DatabaseConnectionManager.getPool().query<{
        preferences: NotificationPreferences;
      }>(query, [userId]);
      return (
        result.rows[0]?.preferences || {
          likes: true,
          comments: true,
          follows: true,
          mentions: true,
          messages: true,
          email: true,
          push: true,
          digestFrequency: "realtime",
          quietHours: {
            enabled: false,
            start: "22:00",
            end: "08:00",
            timezone: "UTC",
          },
          channels: {
            inApp: true,
            email: true,
            push: true,
            sms: false,
          },
        }
      );
    } catch (error) {
      this.logger.error(`Error getting notification preferences`, error);
      throw new NotificationError(
        `Failed to get notification preferences: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_notification_preferences (user_id, preferences)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET preferences = user_notification_preferences.preferences || $2
      `;

      await DatabaseConnectionManager.getPool().query(query, [
        userId,
        preferences,
      ]);
    } catch (error) {
      this.logger.error(`Error updating notification preferences`, error);
      throw new NotificationError(
        `Failed to update notification preferences: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find recent notifications for grouping
   */
  async findRecent(
    userId: string,
    type: NotificationType,
    since: Date,
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        AND type = $2 
        AND created_at >= $3 
        ORDER BY created_at DESC
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        userId,
        type,
        since,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(`Error finding recent notifications`, error);
      throw new NotificationError(
        `Failed to find recent notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update a notification
   */
  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    try {
      const query = `
        UPDATE notifications 
        SET metadata = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        id,
        data.metadata,
      ]);
      if (!result.rows[0]) {
        throw new NotificationError(`Notification ${id} not found`);
      }
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error(`Error updating notification`, error);
      throw new NotificationError(
        `Failed to update notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find oldest notifications for a user
   */
  async findOldestByUser(
    userId: string,
    limit: number,
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at ASC 
        LIMIT $2
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        userId,
        limit,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(`Error finding oldest notifications`, error);
      throw new NotificationError(
        `Failed to find oldest notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find notifications for a user within a date range
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        AND created_at BETWEEN $2 AND $3 
        ORDER BY created_at DESC
      `;

      const result = await DatabaseConnectionManager.getPool().query(query, [
        userId,
        startDate,
        endDate,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error(`Error finding notifications by date range`, error);
      throw new NotificationError(
        `Failed to find notifications by date range: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete notifications by entity ID and type
   */
  async deleteByEntityId(
    entityId: string,
    entityType: EntityType,
  ): Promise<void> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE entity_id = $1 AND entity_type = $2
      `;
      await this.executeQuery(query, [entityId, entityType]);
    } catch (error) {
      this.logger.error("Error deleting notifications by entity", error);
      throw new NotificationError(
        `Failed to delete notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Export singleton instance
export const notificationRepository = NotificationRepository.getInstance();
