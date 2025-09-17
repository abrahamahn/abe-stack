// Define interfaces locally
export interface NotificationQueryOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  messages: boolean;
  email: boolean;
  push: boolean;
  digestFrequency: "realtime" | "daily" | "weekly";
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

import { BaseModelInterface } from "@/server/database/models/BaseModel";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import {
  Notification,
  NotificationType,
} from "@/server/database/models/social/Notification";
import {
  NotificationErrors,
  NotificationNotFoundError,
  NotificationOperationError,
  NotificationUserMismatchError,
  NotificationAlreadyReadError,
} from "@/server/infrastructure/errors/domain/social/NotificationError";

import { BaseRepository } from "../BaseRepository";

export interface NotificationWithIndex
  extends Notification,
    BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Repository class for managing notifications
 */
export class NotificationRepository extends BaseRepository<Notification> {
  protected tableName = "notifications";
  protected columns = [
    "id",
    "user_id as userId",
    "actor_id as actorId",
    "type",
    "entity_id as entityId",
    "entity_type as entityType",
    "content",
    "metadata",
    "read",
    "delivered",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Notification");
  }

  /**
   * Create a new notification
   */
  async create(notification: Notification): Promise<Notification> {
    try {
      const validationErrors = notification.validate();
      if (validationErrors && validationErrors.length > 0) {
        throw new NotificationErrors.Validation(validationErrors);
      }

      const query = `
        INSERT INTO ${this.tableName} (
          id, type, user_id, actor_id, entity_id, entity_type, content, read, delivered, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING ${this.columns.join(", ")}
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

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        values
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      // Re-throw domain errors
      if (error instanceof NotificationErrors.Validation) {
        throw error;
      }
      throw new NotificationOperationError("create", error);
    }
  }

  /**
   * Find a notification by its ID
   */
  async findById(id: string): Promise<Notification | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new NotificationOperationError("findById", error);
    }
  }

  /**
   * Find a notification by ID or throw an error if not found
   */
  async findByIdOrThrow(id: string): Promise<Notification> {
    const notification = await this.findById(id);
    if (!notification) {
      throw new NotificationNotFoundError(id);
    }
    return notification;
  }

  /**
   * Find notifications by user ID
   */
  async findByUserId(
    userId: string,
    options?: NotificationQueryOptions
  ): Promise<Notification[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: any[] = [userId];

      // Add filtering for unread notifications
      if (options?.unreadOnly) {
        query += ` AND read = false`;
      }

      // Add ordering
      query += ` ORDER BY created_at DESC`;

      // Add pagination
      if (options?.limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);

        if (options?.offset !== undefined) {
          query += ` OFFSET $${params.length + 1}`;
          params.push(options.offset);
        }
      }

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new NotificationOperationError("findByUserId", error);
    }
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1 AND read = false
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new NotificationOperationError("getUnreadCount", error);
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      // Check if notifications exist and belong to user
      for (const id of notificationIds) {
        const notification = await this.findById(id);
        if (!notification) {
          throw new NotificationNotFoundError(id);
        }
        if (notification.userId !== userId) {
          throw new NotificationUserMismatchError(id, userId);
        }
        if (notification.read) {
          throw new NotificationAlreadyReadError(id);
        }
      }

      const query = `
        UPDATE ${this.tableName}
        SET read = true, updated_at = NOW()
        WHERE id = ANY($1) AND user_id = $2
      `;

      await this.executeQuery(query, [notificationIds, userId]);
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof NotificationNotFoundError ||
        error instanceof NotificationUserMismatchError ||
        error instanceof NotificationAlreadyReadError
      ) {
        throw error;
      }
      throw new NotificationOperationError("markAsRead", error);
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET read = true, updated_at = NOW()
        WHERE user_id = $1 AND read = false
        RETURNING id
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
      ]);
      return result.rowCount || 0;
    } catch (error) {
      throw new NotificationOperationError("markAllAsRead", error);
    }
  }

  /**
   * Mark notifications as delivered
   */
  async markAsDelivered(ids: string[]): Promise<void> {
    try {
      if (ids.length === 0) return;

      const query = `
        UPDATE ${this.tableName}
        SET delivered = true, updated_at = NOW()
        WHERE id = ANY($1)
      `;

      await this.executeQuery(query, [ids]);
    } catch (error) {
      throw new NotificationOperationError("markAsDelivered", error);
    }
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      // Check if notification exists
      const notification = await this.findById(id);
      if (!notification) {
        throw new NotificationNotFoundError(id);
      }

      // If userId is provided, check ownership
      if (userId && notification.userId !== userId) {
        throw new NotificationUserMismatchError(id, userId);
      }

      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
        RETURNING id
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof NotificationNotFoundError ||
        error instanceof NotificationUserMismatchError
      ) {
        throw error;
      }
      throw new NotificationOperationError("delete", error);
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllForUser(userId: string): Promise<number> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE user_id = $1
        RETURNING id
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
      ]);
      return result.rowCount || 0;
    } catch (error) {
      throw new NotificationOperationError("deleteAllForUser", error);
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteMany(
    notificationIds: string[],
    userId: string
  ): Promise<boolean> {
    try {
      if (notificationIds.length === 0) return true;

      // Check if notifications exist and belong to user
      for (const id of notificationIds) {
        const notification = await this.findById(id);
        if (!notification) {
          throw new NotificationNotFoundError(id);
        }
        if (notification.userId !== userId) {
          throw new NotificationUserMismatchError(id, userId);
        }
      }

      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = ANY($1) AND user_id = $2
        RETURNING id
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        notificationIds,
        userId,
      ]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof NotificationNotFoundError ||
        error instanceof NotificationUserMismatchError
      ) {
        throw error;
      }
      throw new NotificationOperationError("deleteMany", error);
    }
  }

  /**
   * Map database row to Notification model
   */
  mapResultToModel(row: Record<string, unknown>): Notification {
    return new Notification({
      id: String(row.id),
      userId: String(row.userId),
      actorId: row.actorId ? String(row.actorId) : null,
      type: String(row.type) as NotificationType,
      entityId: row.entityId ? String(row.entityId) : null,
      entityType: row.entityType
        ? (String(row.entityType) as EntityType)
        : null,
      content: row.content ? String(row.content) : null,
      metadata: (row.metadata as Record<string, any>) || {},
      read: Boolean(row.read),
      delivered: Boolean(row.delivered),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(String(row.createdAt)),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt
          : new Date(String(row.updatedAt)),
    });
  }

  /**
   * Count total notifications by user
   */
  async countByUser(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new NotificationOperationError("countByUser", error);
    }
  }

  /**
   * Count unread notifications by user
   */
  async countUnread(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1 AND read = false
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new NotificationOperationError("countUnread", error);
    }
  }

  /**
   * Batch count unread notifications for multiple users
   */
  async batchCountUnread(userIds: string[]): Promise<Map<string, number>> {
    try {
      if (userIds.length === 0) return new Map();

      const query = `
        SELECT user_id as userId, COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ANY($1) AND read = false
        GROUP BY user_id
      `;

      const result = await this.executeQuery<{ userId: string; count: string }>(
        query,
        [userIds]
      );

      const countMap = new Map<string, number>();
      userIds.forEach((id) => countMap.set(id, 0)); // Initialize all users with 0

      result.rows.forEach((row) => {
        countMap.set(row.userId, parseInt(row.count, 10));
      });

      return countMap;
    } catch (error) {
      throw new NotificationOperationError("batchCountUnread", error);
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const query = `
        SELECT preferences
        FROM user_notification_preferences
        WHERE user_id = $1
      `;

      const result = await this.executeQuery<{ preferences: string }>(query, [
        userId,
      ]);

      // Return default preferences if not found
      if (result.rows.length === 0) {
        return this.getDefaultPreferences();
      }

      return JSON.parse(result.rows[0].preferences);
    } catch (error) {
      throw new NotificationOperationError("getPreferences", error);
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      likes: true,
      comments: true,
      follows: true,
      mentions: true,
      messages: true,
      email: true,
      push: true,
      digestFrequency: "daily",
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
        timezone: "UTC",
      },
      channels: {
        inApp: true,
        email: true,
        push: true,
        sms: false,
      },
    };
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      // First get current preferences
      const currentPrefs = await this.getPreferences(userId);

      // Merge with updates
      const updatedPrefs = { ...currentPrefs, ...preferences };

      const query = `
        INSERT INTO user_notification_preferences (user_id, preferences)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET preferences = $2, updated_at = NOW()
      `;

      await this.executeQuery(query, [userId, JSON.stringify(updatedPrefs)]);
    } catch (error) {
      throw new NotificationOperationError("updatePreferences", error);
    }
  }

  /**
   * Find recent notifications of a specific type
   */
  async findRecent(
    userId: string,
    type: NotificationType,
    since: Date
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
          AND type = $2
          AND created_at >= $3
        ORDER BY created_at DESC
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        type,
        since,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new NotificationOperationError("findRecent", error);
    }
  }

  /**
   * Update a notification
   */
  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    try {
      // Check if notification exists
      const notification = await this.findById(id);
      if (!notification) {
        throw new NotificationNotFoundError(id);
      }

      // Prepare update fields
      const updateData: Record<string, unknown> = {};
      const allowedFields = ["read", "delivered", "content", "metadata"];

      for (const field of allowedFields) {
        const key = field as keyof Partial<Notification>;
        if (data[key] !== undefined) {
          // Convert camelCase to snake_case for DB column names
          const dbField = field.replace(
            /[A-Z]/g,
            (letter) => `_${letter.toLowerCase()}`
          );
          updateData[dbField] = data[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return notification; // Nothing to update
      }

      // Add updated_at
      updateData.updated_at = new Date();

      // Build the query
      const setClause = Object.keys(updateData)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(", ");

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const values = [id, ...Object.values(updateData)];
      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        values
      );

      if (result.rows.length === 0) {
        throw new NotificationNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      // Re-throw domain errors
      if (error instanceof NotificationNotFoundError) {
        throw error;
      }
      throw new NotificationOperationError("update", error);
    }
  }

  /**
   * Find oldest notifications for a user
   */
  async findOldestByUser(
    userId: string,
    limit: number
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT $2
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        limit,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new NotificationOperationError("findOldestByUser", error);
    }
  }

  /**
   * Find notifications by user within a date range
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Notification[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at <= $3
        ORDER BY created_at DESC
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        startDate,
        endDate,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new NotificationOperationError("findByUserAndDateRange", error);
    }
  }

  /**
   * Delete notifications by entity ID and type
   */
  async deleteByEntityId(
    entityId: string,
    entityType: EntityType
  ): Promise<void> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE entity_id = $1 AND entity_type = $2
      `;

      await this.executeQuery(query, [entityId, entityType]);
    } catch (error) {
      throw new NotificationOperationError("deleteByEntityId", error);
    }
  }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository();
