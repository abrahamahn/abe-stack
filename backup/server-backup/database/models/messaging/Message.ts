import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  FILE = "FILE",
  SYSTEM = "SYSTEM",
}

export enum MessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
  DELETED = "DELETED",
}

export interface MessageAttachment {
  id: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  name?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface MessageAttributes extends BaseModel {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  replyToId?: string;
  metadata?: Record<string, unknown> | null;
  readBy?: string[];
  isEdited?: boolean;
  editedAt?: Date | null;
  attachments: MessageAttachment[];
  deletedForUserIds: string[];
  sentAt: Date;
}

export class Message implements Omit<MessageAttributes, keyof BaseModel> {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  replyToId?: string;
  metadata?: Record<string, unknown> | null;
  readBy: string[];
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: MessageAttachment[];
  deletedForUserIds: string[];
  sentAt: Date;

  constructor(
    data: Partial<MessageAttributes> & {
      conversationId: string;
      senderId: string;
      content: string;
    }
  ) {
    this.id = data.id || "";
    this.conversationId = data.conversationId;
    this.senderId = data.senderId;
    this.content = data.content;
    this.type = data.type || MessageType.TEXT;
    this.status = data.status || MessageStatus.SENT;
    this.replyToId = data.replyToId;
    this.metadata = data.metadata || null;
    this.readBy = data.readBy || [];
    this.isEdited = data.isEdited || false;
    this.editedAt = data.editedAt || null;
    this.attachments = data.attachments || [];
    this.deletedForUserIds = data.deletedForUserIds || [];
    this.sentAt = data.sentAt || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate message data
   * @returns Array of validation error details, empty if valid
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Required fields
    if (!this.conversationId) {
      errors.push({
        field: "conversationId",
        message: "Conversation ID is required",
      });
    }

    if (!this.senderId) {
      errors.push({
        field: "senderId",
        message: "Sender ID is required",
      });
    }

    if (this.content === undefined || this.content === null) {
      errors.push({
        field: "content",
        message: "Content is required",
      });
    }

    // Type validation
    if (!Object.values(MessageType).includes(this.type)) {
      errors.push({
        field: "type",
        message: `Invalid message type: ${this.type}`,
      });
    }

    // Status validation
    if (!Object.values(MessageStatus).includes(this.status)) {
      errors.push({
        field: "status",
        message: `Invalid message status: ${this.status}`,
      });
    }

    // Content validation based on type
    if (this.type === MessageType.TEXT && this.content?.trim().length === 0) {
      errors.push({
        field: "content",
        message: "Text message cannot be empty",
      });
    }

    // For other types, a valid URL or data URI should be in the content
    // or appropriate information in the metadata
    if (this.type !== MessageType.TEXT && this.type !== MessageType.SYSTEM) {
      if (
        !this.content &&
        (!this.metadata || !Object.keys(this.metadata).length)
      ) {
        errors.push({
          field: "content",
          message: `${this.type} message requires content or metadata`,
        });
      }
    }

    return errors;
  }

  /**
   * Mark message as read by a user
   */
  markAsReadBy(userId: string): boolean {
    if (this.readBy.includes(userId)) {
      return false;
    }
    this.readBy.push(userId);
    return true;
  }

  /**
   * Mark message as delivered
   */
  markAsDelivered(): boolean {
    if (this.status === MessageStatus.SENT) {
      this.status = MessageStatus.DELIVERED;
      return true;
    }
    return false;
  }

  /**
   * Mark message as read
   */
  markAsRead(): boolean {
    if (
      this.status === MessageStatus.SENT ||
      this.status === MessageStatus.DELIVERED
    ) {
      this.status = MessageStatus.READ;
      return true;
    }
    return false;
  }

  /**
   * Edit message content
   */
  editContent(newContent: string): void {
    if (this.status === MessageStatus.DELETED) {
      throw new Error("Cannot edit a deleted message");
    }

    if (this.type !== MessageType.TEXT) {
      throw new Error(`Cannot edit a ${this.type} message`);
    }

    if (newContent.trim().length === 0) {
      throw new Error("Text message cannot be empty");
    }

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Soft delete message
   */
  softDelete(): void {
    this.status = MessageStatus.DELETED;
    this.content = ""; // Clear content for privacy
    this.metadata = null; // Clear metadata
  }

  /**
   * Check if message is from a specific sender
   */
  isFromSender(userId: string): boolean {
    return this.senderId === userId;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Omit<MessageAttributes, "generateId"> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      conversationId: this.conversationId,
      senderId: this.senderId,
      content: this.content,
      type: this.type,
      status: this.status,
      replyToId: this.replyToId,
      metadata: this.metadata,
      readBy: this.readBy,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      attachments: this.attachments,
      deletedForUserIds: this.deletedForUserIds,
      sentAt: this.sentAt,
    };
  }

  /**
   * Check if the message has been read by a specific user
   */
  isReadBy(userId: string): boolean {
    return this.readBy.includes(userId);
  }

  /**
   * Check if the message is deleted for a specific user
   */
  isDeletedFor(userId: string): boolean {
    return this.deletedForUserIds.includes(userId);
  }

  /**
   * Mark the message as deleted for a specific user
   */
  markAsDeletedFor(userId: string): void {
    if (!this.deletedForUserIds.includes(userId)) {
      this.deletedForUserIds.push(userId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Update the message status
   */
  updateStatus(status: MessageStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Add an attachment to the message
   */
  addAttachment(attachment: MessageAttachment): void {
    this.attachments.push(attachment);
    this.updatedAt = new Date();
  }

  /**
   * Remove an attachment from the message
   */
  removeAttachment(attachmentId: string): void {
    const initialCount = this.attachments.length;
    this.attachments = this.attachments.filter(
      (attachment) => attachment.id !== attachmentId
    );

    if (this.attachments.length !== initialCount) {
      this.updatedAt = new Date();
    }
  }

  /**
   * Check if the message has attachments
   */
  hasAttachments(): boolean {
    return this.attachments.length > 0;
  }

  /**
   * Check if the message is a reply
   */
  isReply(): boolean {
    return this.replyToId !== null;
  }

  /**
   * Check if the message is a system message
   */
  isSystemMessage(): boolean {
    return this.type === MessageType.SYSTEM;
  }

  /**
   * Check if the message has text content
   */
  hasContent(): boolean {
    return this.content !== null && this.content.trim().length > 0;
  }

  /**
   * String representation of the message
   */
  toString(): string {
    return `Message(${this.id}, type: ${this.type}, status: ${this.status})`;
  }
}
