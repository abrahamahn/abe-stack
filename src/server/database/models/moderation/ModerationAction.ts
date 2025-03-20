import { BaseModel } from "../BaseModel";
import { EntityType } from "../shared/EntityTypes";

export enum ActionType {
  WARNING = "WARNING",
  CONTENT_REMOVAL = "CONTENT_REMOVAL",
  TEMPORARY_BAN = "TEMPORARY_BAN",
  PERMANENT_BAN = "PERMANENT_BAN",
}

export enum ActionStatus {
  PENDING = "PENDING",
  APPLIED = "APPLIED",
  REVERSED = "REVERSED",
  EXPIRED = "EXPIRED",
}

export interface ModerationActionAttributes {
  id: string;
  moderatorId: string;
  targetUserId: string;
  contentId?: string;
  contentType?: EntityType;
  reportId?: string; // Reference to related report if any
  type: ActionType;
  reason: string;
  status: ActionStatus;
  expiresAt?: Date; // For temporary actions
  createdAt: Date;
  updatedAt: Date;
}

export class ModerationAction
  extends BaseModel
  implements ModerationActionAttributes
{
  id: string;
  moderatorId: string;
  targetUserId: string;
  contentId?: string;
  contentType?: EntityType;
  reportId?: string;
  type: ActionType;
  reason: string;
  status: ActionStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    data: Partial<ModerationActionAttributes> & {
      moderatorId: string;
      targetUserId: string;
      type: ActionType;
      reason: string;
    },
  ) {
    super();
    this.id = data.id || this.generateId();
    this.moderatorId = data.moderatorId;
    this.targetUserId = data.targetUserId;
    this.contentId = data.contentId;
    this.contentType = data.contentType;
    this.reportId = data.reportId;
    this.type = data.type;
    this.reason = data.reason;
    this.status = data.status || ActionStatus.PENDING;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Omit<ModerationActionAttributes, "generateId"> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      moderatorId: this.moderatorId,
      targetUserId: this.targetUserId,
      contentId: this.contentId,
      contentType: this.contentType,
      reportId: this.reportId,
      type: this.type,
      reason: this.reason,
      status: this.status,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Apply the moderation action
   */
  apply(): void {
    this.status = ActionStatus.APPLIED;
    this.updatedAt = new Date();
  }

  /**
   * Reverse the moderation action
   */
  reverse(): void {
    this.status = ActionStatus.REVERSED;
    this.updatedAt = new Date();
  }

  /**
   * Mark the action as expired
   */
  expire(): void {
    if (this.isTemporary() && this.status === ActionStatus.APPLIED) {
      this.status = ActionStatus.EXPIRED;
      this.updatedAt = new Date();
    }
  }

  /**
   * Check if the action is still active (applied and not expired/reversed)
   */
  isActive(): boolean {
    if (this.status !== ActionStatus.APPLIED) {
      return false;
    }

    if (this.isTemporary() && this.expiresAt) {
      const now = new Date();
      return now < this.expiresAt;
    }

    return true;
  }

  /**
   * Check if this is a temporary action
   */
  isTemporary(): boolean {
    return this.type === ActionType.TEMPORARY_BAN;
  }

  /**
   * Validate the action data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.moderatorId) {
      throw new Error("Moderator ID is required");
    }

    if (!this.targetUserId) {
      throw new Error("Target user ID is required");
    }

    if (!this.type) {
      throw new Error("Action type is required");
    }

    if (!Object.values(ActionType).includes(this.type)) {
      throw new Error(`Invalid action type: ${this.type}`);
    }

    if (!Object.values(ActionStatus).includes(this.status)) {
      throw new Error(`Invalid action status: ${this.status}`);
    }

    if (!this.reason || this.reason.trim().length === 0) {
      throw new Error("Reason is required");
    }

    if (this.contentId && !this.contentType) {
      throw new Error("Content type is required when content ID is provided");
    }

    if (this.expiresAt && !(this.expiresAt instanceof Date)) {
      throw new Error("Expiration date must be a valid Date object");
    }

    if (this.type === ActionType.TEMPORARY_BAN && !this.expiresAt) {
      throw new Error("Expiration date is required for temporary bans");
    }
  }
}
