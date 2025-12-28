import { ValidationErrorDetail } from "@/server/infrastructure/errors/infrastructure/ValidationError";

import { BaseModel } from "../BaseModel";

export enum ConversationType {
  DIRECT = "direct",
  GROUP = "group",
}

export enum ConversationStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  MUTED = "muted",
  BLOCKED = "blocked",
}

export enum ParticipantRole {
  ADMIN = "admin",
  MEMBER = "member",
}

export interface Participant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface ConversationAttributes extends BaseModel {
  title: string | null;
  type: ConversationType;
  participantIds: string[];
  participantDetails?: Participant[] | null; // Optional detailed participant info
  creatorId: string;
  lastMessageId: string | null;
  lastMessageSentAt: Date | null;
  status: ConversationStatus;
  isEncrypted: boolean;
  metadata: Record<string, unknown> | null;
  isReadOnly?: boolean;
  maxParticipants?: number | null;
}

export class Conversation
  extends BaseModel
  implements Omit<ConversationAttributes, keyof BaseModel>
{
  title: string | null;
  type: ConversationType;
  participantIds: string[];
  participantDetails: Participant[] | null;
  creatorId: string;
  lastMessageId: string | null;
  lastMessageSentAt: Date | null;
  status: ConversationStatus;
  isEncrypted: boolean;
  metadata: Record<string, unknown> | null;
  isReadOnly: boolean;
  maxParticipants: number | null;

  constructor(
    data: Partial<ConversationAttributes> & {
      creatorId: string;
      participantIds: string[];
    }
  ) {
    super();
    this.id = data.id || this.generateId();
    this.title = data.title || null;
    this.type = data.type || ConversationType.DIRECT;
    this.participantIds = [...data.participantIds];
    this.participantDetails = data.participantDetails || null;
    this.creatorId = data.creatorId;
    this.lastMessageId = data.lastMessageId || null;
    this.lastMessageSentAt = data.lastMessageSentAt || null;
    this.status = data.status || ConversationStatus.ACTIVE;
    this.isEncrypted =
      data.isEncrypted !== undefined ? data.isEncrypted : false;
    this.metadata = data.metadata || null;
    this.isReadOnly = data.isReadOnly || false;
    this.maxParticipants = data.maxParticipants || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert object to JSON representation
   */
  toJSON(): Omit<ConversationAttributes, "generateId"> {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      participantIds: this.participantIds,
      participantDetails: this.participantDetails,
      creatorId: this.creatorId,
      lastMessageId: this.lastMessageId,
      lastMessageSentAt: this.lastMessageSentAt,
      status: this.status,
      isEncrypted: this.isEncrypted,
      metadata: this.metadata,
      isReadOnly: this.isReadOnly,
      maxParticipants: this.maxParticipants,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validate conversation data
   * @returns Array of validation errors (empty if valid)
   */
  validate(): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Check required fields
    if (!this.type) {
      errors.push({
        field: "type",
        message: "Conversation type is required",
      });
    } else if (!Object.values(ConversationType).includes(this.type)) {
      errors.push({
        field: "type",
        message: `Invalid conversation type: ${this.type}`,
      });
    }

    if (!this.participantIds || this.participantIds.length === 0) {
      errors.push({
        field: "participantIds",
        message: "Participants are required",
      });
    }

    if (!this.creatorId) {
      errors.push({
        field: "creatorId",
        message: "Creator ID is required",
      });
    }

    // Type-specific validations
    if (
      this.type === ConversationType.DIRECT &&
      this.participantIds.length !== 2
    ) {
      errors.push({
        field: "participantIds",
        message: "Direct conversations must have exactly two participants",
      });
    }

    if (this.type === ConversationType.GROUP && !this.title) {
      errors.push({
        field: "title",
        message: "Group conversations must have a title",
      });
    }

    // Status validation
    if (
      this.status &&
      !Object.values(ConversationStatus).includes(this.status)
    ) {
      errors.push({
        field: "status",
        message: `Invalid conversation status: ${this.status}`,
      });
    }

    // Check maximum participants if specified
    if (
      this.maxParticipants !== null &&
      this.participantIds.length > this.maxParticipants
    ) {
      errors.push({
        field: "participantIds",
        message: `Maximum number of participants (${this.maxParticipants}) exceeded`,
      });
    }

    // Make sure creator is a participant
    if (
      this.creatorId &&
      this.participantIds &&
      !this.participantIds.includes(this.creatorId)
    ) {
      errors.push({
        field: "creatorId",
        message: "Creator must be a participant in the conversation",
      });
    }

    // Validate participant details if present
    if (this.participantDetails) {
      // Ensure all participantIds have a matching detail entry
      const detailUserIds = this.participantDetails.map((p) => p.userId);
      if (this.participantIds.some((id) => !detailUserIds.includes(id))) {
        errors.push({
          field: "participantDetails",
          message:
            "All participants must have corresponding participant details",
        });
      }

      // Validate that at least one admin exists in group conversations
      if (
        this.type === ConversationType.GROUP &&
        !this.participantDetails.some((p) => p.role === ParticipantRole.ADMIN)
      ) {
        errors.push({
          field: "participantDetails",
          message: "Group conversations must have at least one admin",
        });
      }
    }

    return errors;
  }

  /**
   * String representation of the conversation
   */
  toString(): string {
    return `Conversation(id=${this.id}, type=${this.type}, title=${this.title || "None"}, participants=${this.participantIds.length})`;
  }

  /**
   * Determine if the conversation is a direct message
   */
  isDirectMessage(): boolean {
    return this.type === ConversationType.DIRECT;
  }

  /**
   * Determine if the conversation is a group chat
   */
  isGroupChat(): boolean {
    return this.type === ConversationType.GROUP;
  }

  /**
   * Add a participant to the conversation
   * @throws {Error} If adding the participant would exceed the maximum
   */
  addParticipant(
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER
  ): void {
    // Check if participant already exists
    if (this.participantIds.includes(userId)) {
      return;
    }

    // Check maximum participants constraint
    if (
      this.maxParticipants !== null &&
      this.participantIds.length >= this.maxParticipants
    ) {
      throw new Error(
        `Cannot add participant: maximum of ${this.maxParticipants} participants reached`
      );
    }

    // Add to participantIds
    this.participantIds.push(userId);

    // Add to participantDetails if tracking details
    if (this.participantDetails) {
      this.participantDetails.push({
        userId,
        role,
        joinedAt: new Date(),
      });
    }

    this.updatedAt = new Date();
  }

  /**
   * Remove a participant from the conversation
   * @throws {Error} If trying to remove the last administrator
   */
  removeParticipant(userId: string): void {
    const initialLength = this.participantIds.length;

    // Check if we're removing the last admin
    if (this.participantDetails && this.type === ConversationType.GROUP) {
      const isAdmin = this.participantDetails.some(
        (p) => p.userId === userId && p.role === ParticipantRole.ADMIN
      );
      const adminCount = this.participantDetails.filter(
        (p) => p.role === ParticipantRole.ADMIN
      ).length;

      if (isAdmin && adminCount <= 1) {
        throw new Error(
          "Cannot remove the last administrator from a group conversation"
        );
      }
    }

    // Remove from participantIds
    this.participantIds = this.participantIds.filter((id) => id !== userId);

    // Remove from participantDetails if tracking details
    if (this.participantDetails) {
      this.participantDetails = this.participantDetails.filter(
        (p) => p.userId !== userId
      );
    }

    if (this.participantIds.length !== initialLength) {
      this.updatedAt = new Date();
    }
  }

  /**
   * Update participant role
   */
  updateParticipantRole(userId: string, role: ParticipantRole): void {
    if (!this.participantDetails) {
      this.participantDetails = this.participantIds.map((id) => ({
        userId: id,
        role:
          id === this.creatorId
            ? ParticipantRole.ADMIN
            : ParticipantRole.MEMBER,
        joinedAt: this.createdAt,
      }));
    }

    const participantIndex = this.participantDetails.findIndex(
      (p) => p.userId === userId
    );

    if (participantIndex === -1) {
      throw new Error(
        `User ${userId} is not a participant in this conversation`
      );
    }

    // Check if this would remove the last admin
    if (
      this.type === ConversationType.GROUP &&
      this.participantDetails[participantIndex].role ===
        ParticipantRole.ADMIN &&
      role !== ParticipantRole.ADMIN
    ) {
      const adminCount = this.participantDetails.filter(
        (p) => p.role === ParticipantRole.ADMIN
      ).length;

      if (adminCount <= 1) {
        throw new Error(
          "Cannot remove the last administrator from a group conversation"
        );
      }
    }

    this.participantDetails[participantIndex].role = role;
    this.updatedAt = new Date();
  }

  /**
   * Update the last message information
   */
  updateLastMessage(messageId: string, sentAt: Date): void {
    this.lastMessageId = messageId;
    this.lastMessageSentAt = sentAt;
    this.updatedAt = new Date();
  }

  /**
   * Set the conversation status
   */
  setStatus(status: ConversationStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Toggle the read-only status
   */
  setReadOnly(isReadOnly: boolean): void {
    this.isReadOnly = isReadOnly;
    this.updatedAt = new Date();
  }

  /**
   * Set the maximum number of participants
   * @throws {Error} If current participant count exceeds the new maximum
   */
  setMaxParticipants(maxParticipants: number | null): void {
    if (
      maxParticipants !== null &&
      this.participantIds.length > maxParticipants
    ) {
      throw new Error(
        `Cannot set maximum participants to ${maxParticipants}: current count (${this.participantIds.length}) exceeds this limit`
      );
    }

    this.maxParticipants = maxParticipants;
    this.updatedAt = new Date();
  }

  /**
   * Check if a user is a participant in the conversation
   */
  hasParticipant(userId: string): boolean {
    return this.participantIds.includes(userId);
  }

  /**
   * Check if a user is an admin in the conversation
   */
  isAdmin(userId: string): boolean {
    if (!this.participantDetails) {
      // Default: creator is the only admin
      return userId === this.creatorId;
    }

    return this.participantDetails.some(
      (p) => p.userId === userId && p.role === ParticipantRole.ADMIN
    );
  }

  /**
   * Set the conversation title
   */
  setTitle(title: string | null): void {
    this.title = title;
    this.updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this.metadata = {
      ...this.metadata,
      ...metadata,
    };
    this.updatedAt = new Date();
  }

  /**
   * Convert to a display name for a specific user
   * Returns the name of the other participant for direct messages
   */
  getNameForUser(userId: string, userNames: Record<string, string>): string {
    if (this.title) {
      return this.title;
    }

    if (this.isDirectMessage()) {
      const otherParticipantId = this.participantIds.find(
        (id) => id !== userId
      );
      if (otherParticipantId && userNames[otherParticipantId]) {
        return userNames[otherParticipantId];
      }
      return "Direct Message";
    }

    return "Group Conversation";
  }
}
