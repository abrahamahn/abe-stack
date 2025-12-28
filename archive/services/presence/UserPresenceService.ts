import { inject, injectable } from "inversify";

import { ICacheService } from "../../infrastructure/cache/ICacheService";
import TYPES from "../../infrastructure/di/types";
import { ILoggerService } from "../../infrastructure/logging/ILoggerService";
import { IWebSocketService } from "../../infrastructure/pubsub/IWebSocketService";

/**
 * User presence status
 */
export enum UserPresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  BUSY = "busy",
  OFFLINE = "offline",
}

/**
 * User activity type
 */
export enum UserActivityType {
  TYPING = "typing",
  VIEWING = "viewing",
  REACTING = "reacting",
  EDITING = "editing",
  COMMENTING = "commenting",
  UPLOADING = "uploading",
}

/**
 * User activity data
 */
export interface UserActivityData {
  /**
   * Type of activity
   */
  type: UserActivityType;

  /**
   * Target ID (e.g., conversation ID, content ID)
   */
  targetId?: string;

  /**
   * Context for the activity (e.g., channel, page)
   */
  context?: string;

  /**
   * When the activity started
   */
  timestamp: Date;

  /**
   * Additional application-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * User presence data
 */
export interface UserPresenceData {
  /**
   * User ID
   */
  userId: string;

  /**
   * Presence status
   */
  status: UserPresenceStatus;

  /**
   * Last time the user was active
   */
  lastActiveAt: Date;

  /**
   * Current active contexts (e.g., channels, pages)
   */
  activeContexts: string[];

  /**
   * Last activity
   */
  lastActivity?: UserActivityData;

  /**
   * Custom application-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Service for managing user presence and activity
 * This demonstrates proper layer separation - using infrastructure (WebSocketService)
 * for communication while keeping application-specific logic in the service layer
 */
@injectable()
export class UserPresenceService {
  /**
   * In-memory cache of user presence data
   */
  private userPresence: Map<string, UserPresenceData> = new Map();

  /**
   * Map of contexts to user IDs that are active in that context
   */
  private contextPresence: Map<string, Set<string>> = new Map();

  /**
   * Auto-away timeout in milliseconds (5 minutes)
   */
  private readonly autoAwayTimeoutMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Presence expiration timeout in milliseconds (30 minutes)
   */
  private readonly presenceExpirationMs = 30 * 60 * 1000; // 30 minutes

  /**
   * Interval for cleaning up stale presence data
   */
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject(TYPES.WebSocketService) private wsService: IWebSocketService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {
    this.logger.info("User presence service initialized");

    // Start the cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupStalePresence(),
      60 * 1000
    ); // Every minute
  }

  /**
   * Update a user's presence status
   * @param userId User ID
   * @param status New presence status
   * @param metadata Optional metadata
   */
  async updateUserPresence(
    userId: string,
    status: UserPresenceStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get existing presence or create new
      const existingPresence = this.userPresence.get(userId) || {
        userId,
        status: UserPresenceStatus.OFFLINE,
        lastActiveAt: new Date(),
        activeContexts: [],
      };

      // Update presence
      const updatedPresence: UserPresenceData = {
        ...existingPresence,
        status,
        lastActiveAt: new Date(),
        metadata: {
          ...existingPresence.metadata,
          ...metadata,
        },
      };

      // Save to memory cache
      this.userPresence.set(userId, updatedPresence);

      // Save to distributed cache for persistence across instances
      await this.cacheService.set(
        `presence:${userId}`,
        updatedPresence,
        60 * 30 // 30 minute TTL
      );

      // Map app-specific status to infrastructure status (simplified to online/offline)
      const infrastructureStatus =
        status === UserPresenceStatus.OFFLINE ? "offline" : "online";

      // Use the infrastructure WebSocketService to update basic presence
      await this.wsService.setPresence(userId, infrastructureStatus, {
        lastActiveAt: updatedPresence.lastActiveAt,
        appStatus: status,
        ...metadata,
      });

      // Publish detailed presence update to app-specific channel
      await this.wsService.publish(
        `app:presence:${userId}`,
        "presence_update",
        {
          userId,
          status,
          lastActiveAt: updatedPresence.lastActiveAt,
          activeContexts: updatedPresence.activeContexts,
          metadata: updatedPresence.metadata,
        }
      );

      this.logger.debug("Updated user presence", {
        userId,
        status,
      });
    } catch (error) {
      this.logger.error("Failed to update user presence", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Track user joining a context (e.g. chat channel, document)
   * @param userId User ID
   * @param contextId Context ID
   */
  async joinContext(userId: string, contextId: string): Promise<void> {
    try {
      // Get existing presence
      const presence = await this.getUserPresence(userId);

      if (!presence) {
        throw new Error(`User not found: ${userId}`);
      }

      // Add context if not already present
      if (!presence.activeContexts.includes(contextId)) {
        presence.activeContexts.push(contextId);
      }

      // Update presence
      await this.updateUserPresence(
        presence.userId,
        presence.status,
        presence.metadata
      );

      // Update context-to-users index
      if (!this.contextPresence.has(contextId)) {
        this.contextPresence.set(contextId, new Set());
      }
      this.contextPresence.get(contextId)!.add(userId);

      // Broadcast to the context that the user joined
      await this.wsService.publish(`context:${contextId}`, "user_joined", {
        userId,
        timestamp: new Date(),
        presence: {
          status: presence.status,
          metadata: presence.metadata,
        },
      });

      this.logger.debug("User joined context", {
        userId,
        contextId,
      });
    } catch (error) {
      this.logger.error("Failed to join context", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        contextId,
      });
      throw error;
    }
  }

  /**
   * Track user leaving a context
   * @param userId User ID
   * @param contextId Context ID
   */
  async leaveContext(userId: string, contextId: string): Promise<void> {
    try {
      // Get existing presence
      const presence = await this.getUserPresence(userId);

      if (!presence) {
        return; // User already gone
      }

      // Remove context
      presence.activeContexts = presence.activeContexts.filter(
        (c) => c !== contextId
      );

      // Update presence
      await this.updateUserPresence(
        presence.userId,
        presence.status,
        presence.metadata
      );

      // Update context-to-users index
      this.contextPresence.get(contextId)?.delete(userId);
      if (this.contextPresence.get(contextId)?.size === 0) {
        this.contextPresence.delete(contextId);
      }

      // Broadcast to the context that the user left
      await this.wsService.publish(`context:${contextId}`, "user_left", {
        userId,
        timestamp: new Date(),
      });

      this.logger.debug("User left context", {
        userId,
        contextId,
      });
    } catch (error) {
      this.logger.error("Failed to leave context", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        contextId,
      });
      throw error;
    }
  }

  /**
   * Track user activity and broadcast to relevant contexts
   * @param userId User ID
   * @param activity Activity data
   */
  async trackUserActivity(
    userId: string,
    activity: Omit<UserActivityData, "timestamp">
  ): Promise<void> {
    try {
      // Get existing presence
      const presence = await this.getUserPresence(userId);

      if (!presence) {
        throw new Error(`User not found: ${userId}`);
      }

      // Create activity data
      const activityData: UserActivityData = {
        ...activity,
        timestamp: new Date(),
      };

      // Update last activity
      presence.lastActivity = activityData;
      presence.lastActiveAt = activityData.timestamp;

      // If user is away or offline, set to online
      if (
        presence.status === UserPresenceStatus.AWAY ||
        presence.status === UserPresenceStatus.OFFLINE
      ) {
        presence.status = UserPresenceStatus.ONLINE;
      }

      // Update presence
      await this.updateUserPresence(
        presence.userId,
        presence.status,
        presence.metadata
      );

      // Determine which context to broadcast to
      const broadcastContextId =
        activity.context ||
        (activity.targetId ? `target:${activity.targetId}` : null);

      if (broadcastContextId) {
        // Broadcast activity using infrastructure WebSocketService
        await this.wsService.publish(
          `activity:${broadcastContextId}`,
          "user_activity",
          {
            userId,
            activity: {
              type: activity.type,
              targetId: activity.targetId,
              context: activity.context,
              timestamp: activityData.timestamp,
              metadata: activity.metadata,
            },
          }
        );

        this.logger.debug("Broadcast user activity", {
          userId,
          type: activity.type,
          context: broadcastContextId,
        });
      }
    } catch (error) {
      this.logger.error("Failed to track user activity", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        activity,
      });
      throw error;
    }
  }

  /**
   * Get a user's presence information
   * @param userId User ID
   */
  async getUserPresence(userId: string): Promise<UserPresenceData | null> {
    try {
      // Check memory cache first
      if (this.userPresence.has(userId)) {
        return this.userPresence.get(userId)!;
      }

      // Check distributed cache
      const cachedPresence = await this.cacheService.get<UserPresenceData>(
        `presence:${userId}`
      );

      if (cachedPresence) {
        // Update memory cache
        this.userPresence.set(userId, cachedPresence);
        return cachedPresence;
      }

      // If not found in cache, check infrastructure presence
      const infraPresence = await this.wsService.getPresence(userId);
      if (infraPresence) {
        // Create app-specific presence from infrastructure presence
        const basicPresence: UserPresenceData = {
          userId,
          status:
            infraPresence.status === "online"
              ? UserPresenceStatus.ONLINE
              : UserPresenceStatus.OFFLINE,
          lastActiveAt: infraPresence.lastSeen || new Date(),
          activeContexts: [],
          metadata: {},
        };

        // Update caches
        this.userPresence.set(userId, basicPresence);
        await this.cacheService.set(
          `presence:${userId}`,
          basicPresence,
          60 * 30 // 30 minute TTL
        );

        return basicPresence;
      }

      return null;
    } catch (error) {
      this.logger.error("Failed to get user presence", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return null;
    }
  }

  /**
   * Get multiple users' presence information
   * @param userIds List of user IDs
   */
  async getUsersPresence(
    userIds: string[]
  ): Promise<Map<string, UserPresenceData>> {
    try {
      const result = new Map<string, UserPresenceData>();

      // First get from memory cache
      for (const userId of userIds) {
        if (this.userPresence.has(userId)) {
          result.set(userId, this.userPresence.get(userId)!);
        }
      }

      // Get remaining users from distributed cache
      const remainingUserIds = userIds.filter((id) => !result.has(id));

      if (remainingUserIds.length > 0) {
        const cacheKeys = remainingUserIds.map((id) => `presence:${id}`);
        const cachedResults =
          await this.cacheService.getMultiple<UserPresenceData>(cacheKeys);

        for (let i = 0; i < remainingUserIds.length; i++) {
          const userId = remainingUserIds[i];
          const presence = cachedResults[userId];

          if (presence) {
            result.set(userId, presence);
            this.userPresence.set(userId, presence);
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to get users presence", {
        error: error instanceof Error ? error.message : String(error),
        userCount: userIds.length,
      });
      return new Map();
    }
  }

  /**
   * Get all users in a context
   * @param contextId Context ID
   */
  async getUsersInContext(contextId: string): Promise<UserPresenceData[]> {
    try {
      const usersInContext = this.contextPresence.get(contextId) || new Set();

      if (usersInContext.size === 0) {
        return [];
      }

      const presenceMap = await this.getUsersPresence(
        Array.from(usersInContext)
      );

      return Array.from(presenceMap.values());
    } catch (error) {
      this.logger.error("Failed to get users in context", {
        error: error instanceof Error ? error.message : String(error),
        contextId,
      });
      return [];
    }
  }

  /**
   * Clean up stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    try {
      const now = new Date();
      const usersToUpdate: string[] = [];
      const usersToRemove: string[] = [];

      this.userPresence.forEach((presence, userId) => {
        const timeSinceActivity =
          now.getTime() - presence.lastActiveAt.getTime();

        // If user is online/busy but hasn't been active in a while, set to away
        if (
          (presence.status === UserPresenceStatus.ONLINE ||
            presence.status === UserPresenceStatus.BUSY) &&
          timeSinceActivity > this.autoAwayTimeoutMs
        ) {
          presence.status = UserPresenceStatus.AWAY;
          usersToUpdate.push(userId);
        }
        // If user hasn't been active for too long, set to offline
        else if (
          presence.status !== UserPresenceStatus.OFFLINE &&
          timeSinceActivity > this.presenceExpirationMs
        ) {
          presence.status = UserPresenceStatus.OFFLINE;
          usersToUpdate.push(userId);
        }
        // If user is offline for too long, remove from memory cache
        else if (
          presence.status === UserPresenceStatus.OFFLINE &&
          timeSinceActivity > this.presenceExpirationMs * 2
        ) {
          usersToRemove.push(userId);
        }
      });

      // Update users that need to be updated
      for (const userId of usersToUpdate) {
        const presence = this.userPresence.get(userId);
        if (presence) {
          await this.updateUserPresence(
            userId,
            presence.status,
            presence.metadata
          );
        }
      }

      // Remove stale users
      for (const userId of usersToRemove) {
        this.userPresence.delete(userId);

        // For each context, remove this user
        this.contextPresence.forEach((users, contextId) => {
          if (users.has(userId)) {
            users.delete(userId);
            // If context is now empty, remove it
            if (users.size === 0) {
              this.contextPresence.delete(contextId);
            }
          }
        });
      }

      this.logger.debug("Cleaned up stale presence data", {
        updated: usersToUpdate.length,
        removed: usersToRemove.length,
      });
    } catch (error) {
      this.logger.error("Failed to clean up stale presence data", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stop the presence service
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
