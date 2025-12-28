import { BaseModel } from "../BaseModel";
import { EntityType } from "../shared/EntityTypes";

/**
 * Enum defining different types of notifications
 */
export enum NotificationType {
  LIKE = "LIKE",
  COMMENT = "COMMENT",
  FOLLOW = "FOLLOW",
  MENTION = "MENTION",
  MESSAGE = "MESSAGE",
  SYSTEM = "system",
}

/**
 * Interface for notification attributes
 */
export interface NotificationAttributes {
  id: string;
  type: NotificationType;
  userId: string;
  actorId: string | null;
  entityId: string | null;
  entityType: EntityType | null;
  content: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  delivered: boolean;
  disabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification model representing a user notification
 */
export class Notification
  extends BaseModel
  implements Omit<NotificationAttributes, keyof BaseModel>
{
  type: NotificationType;
  userId: string;
  actorId: string | null;
  entityId: string | null;
  entityType: EntityType | null;
  content: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  delivered: boolean;
  disabled?: boolean;

  /**
   * Constructor for Notification
   */
  constructor(
    data: Partial<NotificationAttributes> & {
      userId: string;
      type: NotificationType;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.type = data.type;
    this.userId = data.userId;
    this.actorId = data.actorId || null;
    this.entityId = data.entityId || null;
    this.entityType = data.entityType || null;
    this.content = data.content || null;
    this.metadata = data.metadata || {};
    this.read = data.read || false;
    this.delivered = data.delivered || false;
    this.disabled = data.disabled;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  /**
   * Validates the notification data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (!this.type) {
      throw new Error("Notification type is required");
    }

    if (!Object.values(NotificationType).includes(this.type)) {
      throw new Error(`Invalid notification type: ${this.type}`);
    }

    if (this.entityId && !this.entityType) {
      throw new Error("Entity type is required when entity ID is provided");
    }

    if (this.entityType && !this.entityId) {
      throw new Error("Entity ID is required when entity type is provided");
    }

    if (
      this.entityType &&
      !Object.values(EntityType).includes(this.entityType)
    ) {
      throw new Error(`Invalid entity type: ${this.entityType}`);
    }
  }

  /**
   * Mark the notification as read
   */
  markAsRead(): void {
    this.read = true;
    this.updatedAt = new Date();
  }

  /**
   * Mark the notification as delivered
   */
  markAsDelivered(): void {
    this.delivered = true;
    this.updatedAt = new Date();
  }

  /**
   * Check if the notification is for a specific user
   */
  isForUser(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * Check if the notification is from a specific actor
   */
  isFromActor(actorId: string): boolean {
    return this.actorId === actorId;
  }

  /**
   * Check if the notification is about a specific entity
   */
  isAboutEntity(entityId: string, entityType: EntityType): boolean {
    return this.entityId === entityId && this.entityType === entityType;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<NotificationAttributes, "generateId"> {
    return {
      id: this.id,
      type: this.type,
      userId: this.userId,
      actorId: this.actorId,
      entityId: this.entityId,
      entityType: this.entityType,
      content: this.content,
      metadata: this.metadata,
      read: this.read,
      delivered: this.delivered,
      disabled: this.disabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
