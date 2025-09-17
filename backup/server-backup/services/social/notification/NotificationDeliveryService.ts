import { CacheService } from "@/server/infrastructure/cache";
import {
  Notification,
  NotificationType,
} from "@/server/database/models/social";
import { UserRepository } from "@/server/database/repositories/auth";
import { NotificationRepository } from "@/server/database/repositories/social";
import { EmailService } from "@/server/services/email";
import { BaseService, EventEmitter } from "@/server/services/shared";
import { ResourceNotFoundError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Constants for delivery configuration
const MAX_BATCH_SIZE = 50;
const THROTTLE_WINDOW_MS = 60000; // 1 minute
const DELIVERY_RETRY_ATTEMPTS = 3;
const DELIVERY_RETRY_DELAY_MS = 5000; // 5 seconds

// Define delivery channel types
export enum DeliveryChannel {
  PUSH = "push",
  EMAIL = "email",
  IN_APP = "in_app",
  SMS = "sms",
}

// Interface for delivery request
export interface DeliveryRequest {
  notificationId: string;
  userId: string;
  channels: DeliveryChannel[];
  payload: Record<string, unknown>;
  priority: "high" | "normal" | "low";
  attempts?: number;
}

// Interface for delivery tracking
export interface DeliveryStatus {
  notificationId: string;
  channel: DeliveryChannel;
  status: "pending" | "delivered" | "failed";
  deliveredAt?: Date;
  errorMessage?: string;
}

// Interface for push notification options
export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
}

// Interface for email notification options
export interface EmailNotificationOptions {
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// Add interface for digest payload
interface DigestPayload extends Record<string, unknown> {
  userId: string;
  period: string;
  timestamp: Date;
  groups: Array<{
    type: string;
    count: number;
    notifications: Array<{ content?: string }>;
    hasMore: boolean;
  }>;
}

// Add interface for notification payload
interface NotificationPayload extends Record<string, unknown> {
  title: string;
  body: string;
}

/**
 * Service responsible for delivering notifications through various channels (push, email, in-app).
 * Features:
 * 1. Multi-channel notification delivery (push, email, in-app)
 * 2. Batching of notifications for efficient delivery
 * 3. Throttling to prevent overwhelming users
 * 4. Delivery status tracking and retry mechanism
 * 5. Template-based notification rendering
 * 6. Performance metrics for delivery success/failure
 */
export class NotificationDeliveryService extends BaseService {
  private deliveryQueue: Map<DeliveryChannel, DeliveryRequest[]> = new Map();
  private userThrottleMap: Map<string, Map<DeliveryChannel, number>> =
    new Map();
  private processingBatch: boolean = false;
  protected eventEmitter: EventEmitter;

  constructor(
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository,
    private emailService: EmailService,
    private metricsService: MetricsService,
    private cacheService: CacheService,
    eventEmitter: EventEmitter
  ) {
    super("NotificationDeliveryService");
    this.eventEmitter = eventEmitter;

    // Initialize delivery queues for each channel
    this.deliveryQueue.set(DeliveryChannel.PUSH, []);
    this.deliveryQueue.set(DeliveryChannel.EMAIL, []);
    this.deliveryQueue.set(DeliveryChannel.IN_APP, []);
    this.deliveryQueue.set(DeliveryChannel.SMS, []);

    // Start the queue processing
    this.startQueueProcessing();

    // Listen for notification events
    this.setupEventListeners();
  }

  /**
   * Queue a notification for delivery
   * @param notification - The notification to deliver
   * @param channels - Delivery channels to use
   */
  async queueNotificationDelivery(
    notification: Notification,
    channels: DeliveryChannel[] = [DeliveryChannel.IN_APP]
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get user preferences
      const user = await this.userRepository.findById(notification.userId);
      if (!user) {
        throw new ResourceNotFoundError("User", notification.userId);
      }

      // Prepare delivery request
      const deliveryRequest: DeliveryRequest = {
        notificationId: notification.id,
        userId: notification.userId,
        channels: channels,
        payload: this.prepareNotificationPayload(notification),
        priority: this.getPriorityForNotificationType(notification.type),
        attempts: 0,
      };

      // Add to appropriate queues
      for (const channel of channels) {
        const queue = this.deliveryQueue.get(channel);
        if (queue) {
          // Check for throttling
          if (!this.isUserThrottled(notification.userId, channel)) {
            queue.push(deliveryRequest);
            this.updateThrottleStatus(notification.userId, channel);
          } else {
            this.logger.info(
              `Throttling ${channel} notification for user ${notification.userId}`
            );
            this.metricsService.incrementCounter("notifications_throttled");
          }
        }
      }

      this.metricsService.recordLatency(
        "queue_notification_delivery",
        Date.now() - startTime
      );
    } catch (error) {
      this.logger.error("Error queueing notification delivery:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("notification_delivery_queue_error");
      throw error;
    }
  }

  /**
   * Deliver a notification immediately, bypassing the queue
   * @param notification - The notification to deliver
   * @param channel - The channel to use for delivery
   */
  async deliverNotificationImmediately(
    notification: Notification,
    channel: DeliveryChannel
  ): Promise<DeliveryStatus> {
    const startTime = Date.now();

    try {
      // Get user
      const user = await this.userRepository.findById(notification.userId);
      if (!user) {
        throw new ResourceNotFoundError("User", notification.userId);
      }

      // Check if channel is appropriate for this notification type
      if (
        !this.isChannelSuitableForNotificationType(notification.type, channel)
      ) {
        return {
          notificationId: notification.id,
          channel,
          status: "failed",
          errorMessage: `Channel ${channel} not suitable for notification type ${notification.type}`,
        };
      }

      // Prepare payload
      const payload = this.prepareNotificationPayload(notification);

      // Perform delivery based on channel
      let success = false;
      const errorMessage = "Unknown delivery error";

      switch (channel) {
        case DeliveryChannel.PUSH:
          success = await this.deliverPushNotification(
            notification.userId,
            payload
          );
          break;
        case DeliveryChannel.EMAIL:
          success = await this.deliverEmailNotification(
            notification.userId,
            payload
          );
          break;
        case DeliveryChannel.IN_APP:
          success = await this.deliverInAppNotification(
            notification.userId,
            notification.id
          );
          break;
        case DeliveryChannel.SMS:
          success = await this.deliverSmsNotification(
            notification.userId,
            payload
          );
          break;
      }

      // Update delivery status
      if (success) {
        await this.notificationRepository.markAsDelivered([notification.id]);

        this.metricsService.recordLatency(
          "immediate_notification_delivery",
          Date.now() - startTime
        );
        this.metricsService.incrementCounter(
          `${channel}_notifications_delivered`
        );

        return {
          notificationId: notification.id,
          channel,
          status: "delivered",
          deliveredAt: new Date(),
        };
      } else {
        this.metricsService.incrementCounter(
          `${channel}_notification_delivery_failed`
        );

        return {
          notificationId: notification.id,
          channel,
          status: "failed",
          errorMessage: errorMessage,
        };
      }
    } catch (error) {
      this.logger.error(`Error delivering ${channel} notification:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("notification_delivery_error");

      return {
        notificationId: notification.id,
        channel,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get delivery status for multiple notifications
   * @param notificationIds - Array of notification IDs to check
   * @param channel - Specific channel to check
   */
  async getDeliveryStatus(
    notificationIds: string[],
    channel?: DeliveryChannel
  ): Promise<DeliveryStatus[]> {
    // In a real implementation, this would query a delivery status tracking table
    // For this example, we're simplifying by checking if the notifications are marked as delivered
    try {
      // Check cache first
      const cacheKey = `delivery_status:${notificationIds.join(",")}:${channel || "all"}`;
      const cachedStatus =
        await this.cacheService.get<DeliveryStatus[]>(cacheKey);

      if (cachedStatus) {
        return cachedStatus;
      }

      // Use individual findById calls since findByIds doesn't exist
      const notifications = await Promise.all(
        notificationIds.map((id) => this.notificationRepository.findById(id))
      );

      // Filter out any null results
      const validNotifications = notifications.filter(
        (n) => n !== null
      ) as Notification[];

      const result = validNotifications.map((notification: Notification) => ({
        notificationId: notification.id,
        channel: channel || DeliveryChannel.IN_APP,
        status: notification.delivered
          ? ("delivered" as const)
          : ("pending" as const),
        deliveredAt: notification.delivered
          ? notification.updatedAt
          : undefined,
      }));

      // Cache results for 5 minutes
      await this.cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error("Error getting delivery status:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("get_delivery_status_error");
      throw error;
    }
  }

  /**
   * Generate and deliver notification digests for users
   * @param userIds - Array of user IDs to generate digests for
   * @param period - Digest period (hourly, daily, weekly)
   */
  async deliverNotificationDigests(
    userIds: string[],
    period: "hourly" | "daily" | "weekly"
  ): Promise<void> {
    const startTime = Date.now();

    try {
      let processed = 0;
      let succeeded = 0;

      for (const userId of userIds) {
        try {
          processed++;

          // Get user's undelivered notifications
          const options = {
            limit: 100,
            offset: 0,
            delivered: false,
            // Time window depends on period
            startDate: this.getDigestStartDate(period),
          };

          // Use findByUserId instead of findByUser and handle the result properly
          const result = await this.notificationRepository.findByUserId(
            userId,
            options
          );

          // Handle result correctly based on its actual structure
          const notifications = Array.isArray(result)
            ? result
            : (result as { items?: Notification[] }).items || [];

          if (notifications.length > 0) {
            // Group notifications by type
            const groupedNotifications =
              this.groupNotificationsForDigest(notifications);

            // Generate digest payload
            const digestPayload = this.createDigestPayload(
              userId,
              groupedNotifications,
              period
            );

            // Deliver via email
            await this.deliverEmailNotification(userId, digestPayload, true);

            // Mark notifications as delivered
            const notificationIds = notifications.map(
              (n: Notification) => n.id
            );
            await this.notificationRepository.markAsDelivered(notificationIds);

            succeeded++;
            this.metricsService.incrementCounter(
              "digest_notifications_delivered",
              notificationIds.length
            );
          }
        } catch (error) {
          this.logger.error(`Error delivering digest for user ${userId}:`, {
            error: error instanceof Error ? error.message : String(error),
          });
          this.metricsService.incrementCounter("digest_delivery_error");
        }
      }

      this.metricsService.recordLatency(
        "deliver_notification_digests",
        Date.now() - startTime
      );
      this.logger.info(
        `Processed ${processed} user digests, ${succeeded} successful`
      );
    } catch (error) {
      this.logger.error("Error delivering notification digests:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("digest_delivery_batch_error");
      throw error;
    }
  }

  // PRIVATE METHODS

  /**
   * Set up event listeners for notification-related events
   */
  private setupEventListeners(): void {
    this.eventEmitter.on("notification:created", (data: unknown) => {
      const eventData = data as { userId: string; notification: Notification };
      if (eventData && eventData.userId && eventData.notification) {
        this.queueNotificationDelivery(eventData.notification, [
          DeliveryChannel.IN_APP,
        ]);
      }
    });
  }

  /**
   * Start the queue processing loop
   */
  private startQueueProcessing(): void {
    setInterval(() => {
      if (!this.processingBatch) {
        this.processBatch();
      }
    }, 5000); // Process queue every 5 seconds
  }

  /**
   * Process a batch of notifications from the queue
   */
  private async processBatch(): Promise<void> {
    this.processingBatch = true;

    try {
      // Process each channel
      for (const [channel, queue] of this.deliveryQueue.entries()) {
        if (queue.length === 0) continue;

        // Sort by priority and take a batch
        queue.sort((a, b) => this.comparePriority(a.priority, b.priority));
        const batch = queue.splice(0, MAX_BATCH_SIZE);

        // Group by user to respect rate limits
        const userBatches = this.groupByUser(batch);

        // Process each user's batch
        for (const [userId, requests] of userBatches.entries()) {
          await this.processUserBatch(userId, channel, requests);
        }
      }
    } catch (error) {
      this.logger.error("Error processing notification batch:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter(
        "notification_batch_processing_error"
      );
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Process a batch of notifications for a single user
   */
  private async processUserBatch(
    userId: string,
    channel: DeliveryChannel,
    requests: DeliveryRequest[]
  ): Promise<void> {
    try {
      let succeeded = 0;
      let failed = 0;

      for (const request of requests) {
        try {
          let success = false;

          switch (channel) {
            case DeliveryChannel.PUSH:
              success = await this.deliverPushNotification(
                userId,
                request.payload
              );
              break;
            case DeliveryChannel.EMAIL:
              success = await this.deliverEmailNotification(
                userId,
                request.payload
              );
              break;
            case DeliveryChannel.IN_APP:
              success = await this.deliverInAppNotification(
                userId,
                request.notificationId
              );
              break;
            case DeliveryChannel.SMS:
              success = await this.deliverSmsNotification(
                userId,
                request.payload
              );
              break;
          }

          if (success) {
            succeeded++;
          } else {
            failed++;
            // Retry logic
            if ((request.attempts || 0) < DELIVERY_RETRY_ATTEMPTS) {
              this.scheduleRetry(request, channel);
            }
          }
        } catch (error) {
          this.logger.error(`Error delivering ${channel} notification:`, {
            error: error instanceof Error ? error.message : String(error),
          });
          failed++;

          // Retry logic
          if ((request.attempts || 0) < DELIVERY_RETRY_ATTEMPTS) {
            this.scheduleRetry(request, channel);
          }
        }
      }

      // Update metrics
      this.metricsService.incrementCounter(
        `${channel}_notifications_delivered`,
        succeeded
      );
      this.metricsService.incrementCounter(
        `${channel}_notifications_failed`,
        failed
      );

      this.logger.debug(
        `Processed ${succeeded + failed} ${channel} notifications for user ${userId}: ${succeeded} succeeded, ${failed} failed`
      );
    } catch (error) {
      this.logger.error(
        `Error processing ${channel} batch for user ${userId}:`,
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.metricsService.incrementCounter("user_batch_processing_error");
    }
  }

  /**
   * Schedule a retry for a failed delivery
   */
  private scheduleRetry(
    request: DeliveryRequest,
    channel: DeliveryChannel
  ): void {
    setTimeout(() => {
      request.attempts = (request.attempts || 0) + 1;
      const queue = this.deliveryQueue.get(channel);
      if (queue) {
        queue.push(request);
      }
    }, DELIVERY_RETRY_DELAY_MS);
  }

  /**
   * Deliver a push notification
   */
  private async deliverPushNotification(
    userId: string,
    _payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with a push notification service
      // like Firebase Cloud Messaging, OneSignal, etc.
      this.logger.info(`Sending push notification to user ${userId}`);

      // Simulate success
      return true;
    } catch (error) {
      this.logger.error("Error delivering push notification:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Deliver an email notification
   */
  private async deliverEmailNotification(
    userId: string,
    payload: Record<string, unknown>,
    isDigest: boolean = false
  ): Promise<boolean> {
    try {
      // Get user email
      const user = await this.userRepository.findById(userId);
      if (!user || !user.email) {
        return false;
      }

      // Prepare email data
      const subject = isDigest
        ? `Your ${payload.period} notification digest`
        : this.getSubjectForNotification(payload);

      const emailData = {
        to: user.email,
        subject,
        text: this.getPlainTextContent(payload, isDigest),
        html: this.getHtmlContent(payload, isDigest),
      };

      // Send email
      await this.emailService.sendEmail(emailData);
      return true;
    } catch (error) {
      this.logger.error("Error delivering email notification:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Deliver an in-app notification
   */
  private async deliverInAppNotification(
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    try {
      // Mark as delivered in the database
      await this.notificationRepository.markAsDelivered([notificationId]);

      // Emit real-time event to connected clients
      this.eventEmitter.emit("notification:delivered", {
        userId,
        notificationId,
      });

      return true;
    } catch (error) {
      this.logger.error("Error delivering in-app notification:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Deliver an SMS notification
   */
  private async deliverSmsNotification(
    userId: string,
    _payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with an SMS service
      // like Twilio, Nexmo, etc.
      this.logger.info(`Sending SMS notification to user ${userId}`);

      // Simulate success
      return true;
    } catch (error) {
      this.logger.error("Error delivering SMS notification:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if user is throttled for a specific channel
   */
  private isUserThrottled(userId: string, channel: DeliveryChannel): boolean {
    const userThrottles = this.userThrottleMap.get(userId);
    if (!userThrottles) return false;

    const lastDelivery = userThrottles.get(channel);
    if (!lastDelivery) return false;

    return Date.now() - lastDelivery < THROTTLE_WINDOW_MS;
  }

  /**
   * Update throttle status for a user and channel
   */
  private updateThrottleStatus(userId: string, channel: DeliveryChannel): void {
    if (!this.userThrottleMap.has(userId)) {
      this.userThrottleMap.set(userId, new Map());
    }

    const userThrottles = this.userThrottleMap.get(userId);
    if (userThrottles) {
      userThrottles.set(channel, Date.now());
    }
  }

  /**
   * Prepare notification payload based on type
   */
  private prepareNotificationPayload(
    notification: Notification
  ): Record<string, unknown> {
    // Create appropriate payload structure based on notification type
    const basePayload = {
      id: notification.id,
      type: notification.type,
      createdAt: notification.createdAt,
      userId: notification.userId,
      actorId: notification.actorId,
      entityId: notification.entityId,
      entityType: notification.entityType,
      content: notification.content,
      metadata: notification.metadata,
    };

    // Add type-specific formatting
    switch (notification.type) {
      case NotificationType.LIKE:
        return {
          ...basePayload,
          title: "New Like",
          body: `Someone liked your ${notification.entityType?.toLowerCase()}`,
        };
      case NotificationType.COMMENT:
        return {
          ...basePayload,
          title: "New Comment",
          body: `Someone commented on your ${notification.entityType?.toLowerCase()}`,
        };
      case NotificationType.FOLLOW:
        return {
          ...basePayload,
          title: "New Follower",
          body: "Someone started following you",
        };
      case NotificationType.MENTION:
        return {
          ...basePayload,
          title: "New Mention",
          body: `You were mentioned in a ${notification.entityType?.toLowerCase()}`,
        };
      case NotificationType.MESSAGE:
        return {
          ...basePayload,
          title: "New Message",
          body: "You received a new message",
        };
      default:
        return {
          ...basePayload,
          title: "New Notification",
          body: "You have a new notification",
        };
    }
  }

  /**
   * Get priority for notification type
   */
  private getPriorityForNotificationType(
    type: NotificationType
  ): "high" | "normal" | "low" {
    switch (type) {
      case NotificationType.MESSAGE:
        return "high";
      // High priority notifications
      case NotificationType.SYSTEM:
        return "high";
      // Normal priority notifications
      case NotificationType.MENTION:
        return "normal";
      case NotificationType.COMMENT:
        return "normal";
      // Low priority notifications
      case NotificationType.LIKE:
        return "low";
      case NotificationType.FOLLOW:
        return "low";
      default:
        return "low";
    }
  }

  /**
   * Compare priority values
   */
  private comparePriority(
    a: "high" | "normal" | "low",
    b: "high" | "normal" | "low"
  ): number {
    const priorityValue = {
      high: 0,
      normal: 1,
      low: 2,
    };

    return priorityValue[a] - priorityValue[b];
  }

  /**
   * Group delivery requests by user
   */
  private groupByUser(
    requests: DeliveryRequest[]
  ): Map<string, DeliveryRequest[]> {
    const map = new Map<string, DeliveryRequest[]>();

    for (const request of requests) {
      if (!map.has(request.userId)) {
        map.set(request.userId, []);
      }

      map.get(request.userId)?.push(request);
    }

    return map;
  }

  /**
   * Check if a channel is suitable for a notification type
   */
  private isChannelSuitableForNotificationType(
    type: NotificationType,
    channel: DeliveryChannel
  ): boolean {
    // Different notification types may be more appropriate for different channels
    const channelMap: Record<NotificationType, DeliveryChannel[]> = {
      [NotificationType.LIKE]: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
      [NotificationType.COMMENT]: [
        DeliveryChannel.IN_APP,
        DeliveryChannel.PUSH,
        DeliveryChannel.EMAIL,
      ],
      [NotificationType.FOLLOW]: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
      [NotificationType.MENTION]: [
        DeliveryChannel.IN_APP,
        DeliveryChannel.PUSH,
        DeliveryChannel.EMAIL,
      ],
      [NotificationType.MESSAGE]: [
        DeliveryChannel.IN_APP,
        DeliveryChannel.PUSH,
        DeliveryChannel.EMAIL,
        DeliveryChannel.SMS,
      ],
      [NotificationType.SYSTEM]: [DeliveryChannel.IN_APP],
      // Remove SECURITY which doesn't exist
    };

    return channelMap[type]?.includes(channel) ?? false;
  }

  /**
   * Get digest start date based on period
   */
  private getDigestStartDate(period: "hourly" | "daily" | "weekly"): Date {
    const now = new Date();
    switch (period) {
      case "hourly":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "daily":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "weekly":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Group notifications for a digest
   */
  private groupNotificationsForDigest(
    notifications: Notification[]
  ): Record<NotificationType, Notification[]> {
    const grouped: Record<NotificationType, Notification[]> = {} as Record<
      NotificationType,
      Notification[]
    >;

    for (const notification of notifications) {
      if (!grouped[notification.type]) {
        grouped[notification.type] = [];
      }

      grouped[notification.type].push(notification);
    }

    return grouped;
  }

  /**
   * Create digest payload
   */
  private createDigestPayload(
    userId: string,
    groupedNotifications: Record<NotificationType, Notification[]>,
    period: "hourly" | "daily" | "weekly"
  ): DigestPayload {
    return {
      userId,
      period,
      timestamp: new Date(),
      groups: Object.entries(groupedNotifications).map(
        ([type, notifications]) => ({
          type,
          count: notifications.length,
          notifications: notifications.slice(0, 5).map((notification) => ({
            content: notification.content || undefined,
          })),
          hasMore: notifications.length > 5,
        })
      ),
    };
  }

  /**
   * Get subject for notification email
   */
  private getSubjectForNotification(payload: Record<string, unknown>): string {
    switch (payload.type) {
      case NotificationType.LIKE:
        return "Someone liked your content";
      case NotificationType.COMMENT:
        return "New comment on your content";
      case NotificationType.FOLLOW:
        return "You have a new follower";
      case NotificationType.MENTION:
        return "You were mentioned";
      case NotificationType.MESSAGE:
        return "You received a new message";
      // Remove SECURITY which doesn't exist
      case NotificationType.SYSTEM:
        return "System notification";
      default:
        return "New notification";
    }
  }

  /**
   * Generate plain text content for email
   */
  private getPlainTextContent(
    payload: Record<string, unknown>,
    isDigest: boolean
  ): string {
    if (isDigest) {
      const digestPayload = payload as DigestPayload;
      let content = `Your ${digestPayload.period} notification digest\n\n`;

      for (const group of digestPayload.groups) {
        content += `${group.count} ${group.type} notifications\n`;

        for (const notification of group.notifications) {
          content += `- ${notification.content || "New notification"}\n`;
        }

        if (group.hasMore) {
          content += `...and ${group.count - group.notifications.length} more\n`;
        }

        content += "\n";
      }

      return content;
    } else {
      const notificationPayload = payload as NotificationPayload;
      return notificationPayload.body || "You have a new notification";
    }
  }

  /**
   * Generate HTML content for email
   */
  private getHtmlContent(
    payload: Record<string, unknown>,
    isDigest: boolean
  ): string {
    if (isDigest) {
      const digestPayload = payload as DigestPayload;
      let content = `<h1>Your ${digestPayload.period} notification digest</h1>`;

      for (const group of digestPayload.groups) {
        content += `<h2>${group.count} ${group.type} notifications</h2><ul>`;

        for (const notification of group.notifications) {
          content += `<li>${notification.content || "New notification"}</li>`;
        }

        if (group.hasMore) {
          content += `<li>...and ${group.count - group.notifications.length} more</li>`;
        }

        content += "</ul>";
      }

      return content;
    } else {
      const notificationPayload = payload as NotificationPayload;
      return `<h1>${notificationPayload.title}</h1><p>${notificationPayload.body || "You have a new notification"}</p>`;
    }
  }
}
