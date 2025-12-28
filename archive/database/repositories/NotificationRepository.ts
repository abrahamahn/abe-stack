import { Notification } from "@/server/services/shared/communication/RealTimeService";

/**
 * Repository for managing notifications
 */
export interface NotificationRepository {
  /**
   * Create a new notification
   * @param data Notification data without ID
   * @returns Created notification
   */
  create(data: Omit<Notification, "id">): Promise<Notification>;

  /**
   * Find a notification by ID
   * @param id Notification ID
   * @returns Notification if found, null otherwise
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Find notifications for a user
   * @param userId User ID
   * @param limit Maximum number of notifications to return
   * @param offset Offset for pagination
   * @param unreadOnly Only return unread notifications
   * @returns Notifications and total count
   */
  findByUserId(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly?: boolean
  ): Promise<{ notifications: Notification[]; total: number }>;

  /**
   * Mark notifications as read
   * @param userId User ID
   * @param notificationIds IDs of notifications to mark as read
   */
  markAsRead(userId: string, notificationIds: string[]): Promise<void>;

  /**
   * Delete notifications
   * @param userId User ID
   * @param notificationIds IDs of notifications to delete
   * @returns Number of deleted notifications
   */
  delete(userId: string, notificationIds: string[]): Promise<number>;
}
