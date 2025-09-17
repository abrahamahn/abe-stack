import { CacheService } from "@/server/infrastructure/cache";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import {
  Notification,
  NotificationType,
} from "@/server/database/models/social";
import { UserRepository } from "@/server/database/repositories/auth";
import { NotificationRepository } from "@/server/database/repositories/social";
import {
  BaseService,
  PaginationOptions,
  EventEmitter,
} from "@/server/services/shared";
import { ResourceNotFoundError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

const CACHE_TTL = 300; // 5 minutes
const BATCH_SIZE = 100;
const MAX_NOTIFICATIONS_PER_USER = 1000;
const NOTIFICATION_GROUPING_WINDOW = 300000; // 5 minutes in milliseconds

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
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface NotificationGroup {
  type: NotificationType;
  notifications: Notification[];
  count: number;
  latestTimestamp: Date;
  actors: string[];
  preview: string;
}

export interface NotificationDigest {
  userId: string;
  groups: NotificationGroup[];
  period: "hourly" | "daily" | "weekly";
  startDate: Date;
  endDate: Date;
}

export interface NotificationMetadata {
  entityId?: string;
  entityType?: EntityType;
  content?: string;
  [key: string]: unknown;
}

export interface NotificationCreateData {
  type: NotificationType;
  userId: string;
  actorId?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationQueryOptions extends PaginationOptions {
  types?: NotificationType[];
  read?: boolean;
  delivered?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service responsible for managing user notifications.
 * Features:
 * 1. Notification creation and delivery
 * 2. Notification preferences management
 * 3. Notification querying and filtering
 * 4. Batch operations
 * 5. Real-time delivery
 * 6. Performance metrics tracking
 * 7. Caching for frequently accessed data
 */
export class NotificationService extends BaseService {
  constructor(
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService,
    protected eventEmitter: EventEmitter
  ) {
    super("NotificationService");
  }

  /**
   * Create a new notification
   * @param data - Notification creation data
   */
  async createNotification(
    data: NotificationCreateData
  ): Promise<Notification> {
    const startTime = Date.now();
    try {
      const [user, preferences] = await Promise.all([
        this.userRepository.findById(data.userId),
        this.getNotificationPreferences(data.userId),
      ]);

      if (!user) {
        throw new ResourceNotFoundError("User", data.userId);
      }

      // Check if notification type is enabled in preferences
      if (!this.isNotificationEnabled(data.type, preferences)) {
        this.metricsService.incrementCounter(
          "notifications_filtered_by_preferences"
        );
        return this.notificationRepository.create(
          new Notification({
            type: data.type,
            userId: data.userId,
            actorId: data.actorId || null,
            entityId: data.metadata?.entityId || null,
            entityType: data.metadata?.entityType || null,
            content: data.metadata?.content || null,
            metadata: data.metadata,
            read: true,
            delivered: true,
            disabled: true,
            createdAt: new Date(),
          })
        );
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.quietHours)) {
        this.metricsService.incrementCounter(
          "notifications_filtered_by_quiet_hours"
        );
        return this.notificationRepository.create(
          new Notification({
            type: data.type,
            userId: data.userId,
            actorId: data.actorId || null,
            entityId: data.metadata?.entityId || null,
            entityType: data.metadata?.entityType || null,
            content: data.metadata?.content || null,
            metadata: data.metadata,
            read: true,
            delivered: true,
            disabled: true,
            createdAt: new Date(),
          })
        );
      }

      // Check notification count limit
      const count = await this.notificationRepository.countByUser(data.userId);
      if (count >= MAX_NOTIFICATIONS_PER_USER) {
        await this.cleanupOldNotifications(data.userId);
      }

      // Try to group with recent similar notifications
      const similarNotification = await this.findSimilarNotification(data);
      if (similarNotification) {
        return this.updateExistingNotification(similarNotification, data);
      }

      const result = await this.withTransaction(async () => {
        const notification = await this.notificationRepository.create(
          new Notification({
            type: data.type,
            userId: data.userId,
            actorId: data.actorId || null,
            entityId: data.metadata?.entityId || null,
            entityType: data.metadata?.entityType || null,
            content: data.metadata?.content || null,
            metadata: data.metadata,
            read: false,
            delivered: false,
            createdAt: new Date(),
          })
        );

        await this.invalidateNotificationCache(data.userId);

        // Emit real-time event if enabled
        if (preferences.digestFrequency === "realtime") {
          this.eventEmitter.emit("notification:created", {
            userId: data.userId,
            notification,
          });
        }

        return notification;
      });

      this.metricsService.recordLatency(
        "create_notification",
        Date.now() - startTime
      );
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("notification_creation_error");
      throw error;
    }
  }

  /**
   * Get user notifications with filtering and pagination
   * @param userId - ID of the user
   * @param options - Query options for filtering and pagination
   */
  async getUserNotifications(
    userId: string,
    options: NotificationQueryOptions
  ): Promise<NotificationGroup[]> {
    const cacheKey = `user_notifications:${userId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        const notifications = await this.notificationRepository.findByUserId(
          userId,
          options
        );
        return this.groupNotifications(notifications);
      },
      CACHE_TTL
    );
  }

  /**
   * Mark notifications as read
   * @param notificationIds - IDs of notifications to mark as read
   * @param userId - ID of the user who owns the notifications
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.withTransaction(async () => {
        await this.notificationRepository.markAsRead(notificationIds, userId);
        await this.invalidateNotificationCache(userId);
      });

      this.metricsService.recordLatency(
        "mark_notifications_read",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter(
        "notifications_marked_read",
        notificationIds.length
      );
    } catch (error) {
      this.metricsService.incrementCounter("mark_notifications_read_error");
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - ID of the user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.withTransaction(async () => {
        await this.notificationRepository.markAllAsRead(userId);
        await this.invalidateNotificationCache(userId);
      });

      this.metricsService.recordLatency(
        "mark_all_notifications_read",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("all_notifications_marked_read");
    } catch (error) {
      this.metricsService.incrementCounter("mark_all_notifications_read_error");
      throw error;
    }
  }

  /**
   * Mark notifications as delivered
   * @param notificationIds - IDs of notifications to mark as delivered
   */
  async markAsDelivered(notificationIds: string[]): Promise<void> {
    const startTime = Date.now();
    try {
      await this.notificationRepository.markAsDelivered(notificationIds);

      this.metricsService.recordLatency(
        "mark_notifications_delivered",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter(
        "notifications_marked_delivered",
        notificationIds.length
      );
    } catch (error) {
      this.metricsService.incrementCounter(
        "mark_notifications_delivered_error"
      );
      throw error;
    }
  }

  /**
   * Delete notifications
   * @param notificationIds - IDs of notifications to delete
   * @param userId - ID of the user who owns the notifications
   */
  async deleteNotifications(
    notificationIds: string[],
    userId: string
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.withTransaction(async () => {
        await this.notificationRepository.deleteMany(notificationIds, userId);
        await this.invalidateNotificationCache(userId);
      });

      this.metricsService.recordLatency(
        "delete_notifications",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter(
        "notifications_deleted",
        notificationIds.length
      );
    } catch (error) {
      this.metricsService.incrementCounter("delete_notifications_error");
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param userId - ID of the user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `unread_notifications_count:${userId}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.notificationRepository.countUnread(userId);
      },
      CACHE_TTL
    );
  }

  /**
   * Batch get unread notification counts
   * @param userIds - Array of user IDs
   */
  async batchGetUnreadCounts(userIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const counts = await this.notificationRepository.batchCountUnread(batch);

      counts.forEach((count: number, userId: string) => {
        result.set(userId, count);
      });
    }

    return result;
  }

  /**
   * Get notification preferences for a user
   * @param userId - ID of the user
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    const cacheKey = `notification_preferences:${userId}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.notificationRepository.getPreferences(userId);
      },
      CACHE_TTL
    );
  }

  /**
   * Update notification preferences for a user
   * @param userId - ID of the user
   * @param preferences - New notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.withTransaction(async () => {
        await this.notificationRepository.updatePreferences(
          userId,
          preferences
        );
        await this.invalidateNotificationCache(userId);
      });

      this.metricsService.recordLatency(
        "update_notification_preferences",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("notification_preferences_updated");
    } catch (error) {
      this.metricsService.incrementCounter(
        "update_notification_preferences_error"
      );
      throw error;
    }
  }

  private async invalidateNotificationCache(userId: string): Promise<void> {
    const keys = [
      `user_notifications:${userId}*`,
      `unread_notifications_count:${userId}`,
      `notification_preferences:${userId}`,
    ];
    await Promise.all(keys.map((key) => this.cacheService.delete(key)));
  }

  private isNotificationEnabled(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    switch (type) {
      case NotificationType.LIKE:
        return preferences.likes;
      case NotificationType.COMMENT:
        return preferences.comments;
      case NotificationType.FOLLOW:
        return preferences.follows;
      case NotificationType.MENTION:
        return preferences.mentions;
      case NotificationType.MESSAGE:
        return preferences.messages;
      default:
        return true;
    }
  }

  private isInQuietHours(
    quietHours: NotificationPreferences["quietHours"]
  ): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const userTime = new Date(
      now.toLocaleString("en-US", { timeZone: quietHours.timezone })
    );
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();

    const [startHour, startMinute] = quietHours.start.split(":").map(Number);
    const [endHour, endMinute] = quietHours.end.split(":").map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private async findSimilarNotification(
    data: NotificationCreateData
  ): Promise<Notification | null> {
    const recentNotifications = await this.notificationRepository.findRecent(
      data.userId,
      data.type,
      new Date(Date.now() - NOTIFICATION_GROUPING_WINDOW)
    );

    return (
      recentNotifications.find(
        (notification) =>
          notification.entityId === data.metadata?.entityId &&
          notification.entityType === data.metadata?.entityType
      ) || null
    );
  }

  private async updateExistingNotification(
    existing: Notification,
    newData: NotificationCreateData
  ): Promise<Notification> {
    const metadata = {
      ...(existing.metadata as Record<string, unknown>),
      groupedActors: [
        ...(((existing.metadata as Record<string, unknown>)
          .groupedActors as string[]) || []),
        newData.actorId,
      ],
      count:
        (((existing.metadata as Record<string, unknown>).count as number) ||
          1) + 1,
    };

    return this.notificationRepository.update(existing.id, { metadata });
  }

  private async cleanupOldNotifications(userId: string): Promise<void> {
    const oldNotifications = await this.notificationRepository.findOldestByUser(
      userId,
      Math.floor(MAX_NOTIFICATIONS_PER_USER * 0.2) // Remove oldest 20%
    );

    await this.deleteNotifications(
      oldNotifications.map((n) => n.id),
      userId
    );
  }

  private getDigestDateRange(
    period: "hourly" | "daily" | "weekly"
  ): [Date, Date] {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (period) {
      case "hourly":
        startDate = new Date(now.getTime() - 3600000);
        break;
      case "daily":
        startDate = new Date(now.getTime() - 86400000);
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 604800000);
        break;
    }

    return [startDate, endDate];
  }

  private groupNotifications(
    notifications: Notification[]
  ): NotificationGroup[] {
    const groups = new Map<NotificationType, Notification[]>();

    notifications.forEach((notification) => {
      const existing = groups.get(notification.type) || [];
      groups.set(notification.type, [...existing, notification]);
    });

    return Array.from(groups.entries()).map(([type, items]) => ({
      type,
      notifications: items,
      count: items.length,
      latestTimestamp: new Date(
        Math.max(...items.map((n) => n.createdAt.getTime()))
      ),
      actors: Array.from(
        new Set(
          items.map((n) => n.actorId).filter((id): id is string => id !== null)
        )
      ),
      preview: this.generateGroupPreview(type, items),
    }));
  }

  private generateGroupPreview(
    type: NotificationType,
    notifications: Notification[]
  ): string {
    const actorCount = new Set(notifications.map((n) => n.actorId)).size;
    const latestActor = notifications[notifications.length - 1].actorId;

    switch (type) {
      case NotificationType.LIKE:
        return `${latestActor} and ${actorCount - 1} others liked your post`;
      case NotificationType.COMMENT:
        return `${latestActor} and ${actorCount - 1} others commented on your post`;
      case NotificationType.FOLLOW:
        return `${latestActor} and ${actorCount - 1} others followed you`;
      default:
        return notifications[0].content || "New notification";
    }
  }

  async generateNotificationDigest(
    userId: string,
    period: "hourly" | "daily" | "weekly"
  ): Promise<NotificationDigest> {
    const preferences = await this.getNotificationPreferences(userId);
    if (preferences.digestFrequency !== period) {
      return {
        userId,
        groups: [],
        period,
        startDate: new Date(),
        endDate: new Date(),
      };
    }

    const [startDate, endDate] = this.getDigestDateRange(period);
    const notifications =
      await this.notificationRepository.findByUserAndDateRange(
        userId,
        startDate,
        endDate
      );

    const groups = this.groupNotifications(notifications);
    return {
      userId,
      groups,
      period,
      startDate,
      endDate,
    };
  }
}
