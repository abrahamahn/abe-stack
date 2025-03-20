import { BaseModel } from "../BaseModel";

/**
 * Enum defining all possible activity types in the system.
 * This represents the different kinds of user actions that can be logged.
 */
export enum ActivityType {
  USER_LOGIN = "USER_LOGIN",
  USER_SIGNUP = "USER_SIGNUP",
  POST_CREATED = "POST_CREATED",
  POST_LIKED = "POST_LIKED",
  POST_COMMENTED = "POST_COMMENTED",
  USER_FOLLOWED = "USER_FOLLOWED",
  MEDIA_UPLOADED = "MEDIA_UPLOADED",
  MEDIA_VIEWED = "MEDIA_VIEWED",
  GROUP_JOINED = "GROUP_JOINED",
  MESSAGE_SENT = "MESSAGE_SENT",
  SEARCH_PERFORMED = "SEARCH_PERFORMED",
  PROFILE_VIEWED = "PROFILE_VIEWED",
  NOTIFICATION_CLICKED = "NOTIFICATION_CLICKED",
}

/**
 * Interface defining the structure of an activity log entry.
 * This represents the data structure that will be stored in the database.
 */
export interface ActivityLogAttributes {
  id: string;
  userId: string;
  type: ActivityType;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * ActivityLog model class that represents user activity in the system.
 * This class is responsible for:
 * 1. Defining the structure of activity log entries
 * 2. Providing methods for manipulating activity data
 * 3. Validating activity data
 * 4. Converting between different data formats
 *
 * It does NOT handle database operations - those are handled by ActivityLogRepository.
 */
export class ActivityLog extends BaseModel implements ActivityLogAttributes {
  id: string;
  userId: string;
  type: ActivityType;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;

  constructor(
    data: Partial<ActivityLogAttributes> & {
      userId: string;
      type: ActivityType;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.type = data.type;
    this.targetId = data.targetId;
    this.targetType = data.targetType;
    this.metadata = data.metadata || {};
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * Converts the activity log to a plain object format.
   * This is useful for serialization and API responses.
   */
  toJSON(): ActivityLogAttributes {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      targetId: this.targetId,
      targetType: this.targetType,
      metadata: this.metadata,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt,
    };
  }

  /**
   * Adds additional metadata to the activity log.
   * This is a business logic method for manipulating the activity data.
   *
   * @param key The metadata key
   * @param value The metadata value
   */
  addMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }
}
