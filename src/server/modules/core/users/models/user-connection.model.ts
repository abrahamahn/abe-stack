import { BaseModel } from "../../base/baseModel";

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  BLOCKED = "blocked",
}

/**
 * Interface for UserConnection model
 */
export interface UserConnectionInterface {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * User who initiated the connection
   */
  requesterId: string;

  /**
   * User who received the connection request
   */
  addresseeId: string;

  /**
   * Status of the connection
   */
  status: ConnectionStatus;

  /**
   * Date when the connection was established
   */
  connectedAt?: Date;

  /**
   * Date when the connection was rejected
   */
  rejectedAt?: Date;

  /**
   * Date when the connection was blocked
   */
  blockedAt?: Date;

  /**
   * Notes about the connection
   */
  notes?: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * UserConnection model representing a connection between two users
 */
export class UserConnection extends BaseModel {
  /**
   * User who initiated the connection
   */
  requesterId: string;

  /**
   * User who received the connection request
   */
  addresseeId: string;

  /**
   * Status of the connection
   */
  status: ConnectionStatus;

  /**
   * Date when the connection was established
   */
  connectedAt?: Date;

  /**
   * Date when the connection was rejected
   */
  rejectedAt?: Date;

  /**
   * Date when the connection was blocked
   */
  blockedAt?: Date;

  /**
   * Notes about the connection
   */
  notes?: string;

  /**
   * Constructor
   */
  constructor(data: Partial<UserConnectionInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.requesterId = data.requesterId || "";
    this.addresseeId = data.addresseeId || "";
    this.status = data.status || ConnectionStatus.PENDING;
    this.connectedAt = data.connectedAt;
    this.rejectedAt = data.rejectedAt;
    this.blockedAt = data.blockedAt;
    this.notes = data.notes;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Accept the connection
   */
  accept(): void {
    this.status = ConnectionStatus.ACCEPTED;
    this.connectedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Reject the connection
   */
  reject(): void {
    this.status = ConnectionStatus.REJECTED;
    this.rejectedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Block the connection
   */
  block(): void {
    this.status = ConnectionStatus.BLOCKED;
    this.blockedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Validate the model
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.requesterId) {
      errors.push({
        field: "requesterId",
        message: "Requester ID is required",
        code: "REQUIRED",
      });
    }

    if (!this.addresseeId) {
      errors.push({
        field: "addresseeId",
        message: "Addressee ID is required",
        code: "REQUIRED",
      });
    }

    if (this.requesterId === this.addresseeId) {
      errors.push({
        field: "addresseeId",
        message: "Cannot connect with yourself",
        code: "INVALID_VALUE",
      });
    }

    if (!this.status) {
      errors.push({
        field: "status",
        message: "Status is required",
        code: "REQUIRED",
      });
    }

    return errors;
  }

  /**
   * Convert model to string representation
   */
  toString(): string {
    return `UserConnection(${this.id}): ${this.requesterId} -> ${this.addresseeId} (${this.status})`;
  }
}
