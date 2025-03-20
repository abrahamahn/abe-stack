import { BaseModel } from "../BaseModel";

/**
 * Status of password reset token
 */
export enum PasswordResetTokenStatus {
  ACTIVE = "active",
  USED = "used",
  EXPIRED = "expired",
}

/**
 * Interface for password reset token attributes
 */
export interface PasswordResetTokenAttributes {
  /**
   * Unique identifier for the token
   */
  id: string;

  /**
   * The user ID this token belongs to
   */
  userId: string;

  /**
   * The actual token value (should be stored hashed)
   */
  token: string;

  /**
   * When the token expires
   */
  expiresAt: Date;

  /**
   * Current status of the token
   */
  status: PasswordResetTokenStatus;

  /**
   * When the token was used (if applicable)
   */
  usedAt?: Date;

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
 * PasswordResetToken model class for handling password reset functionality.
 * This class is responsible for:
 * 1. Defining the data structure
 * 2. Implementing business logic related to token status
 * 3. Validating token state
 * 4. NOT handling database operations - that belongs in the repository
 */
export class PasswordResetToken
  extends BaseModel
  implements Omit<PasswordResetTokenAttributes, "id">
{
  userId: string;
  token: string;
  expiresAt: Date;
  status: PasswordResetTokenStatus;
  usedAt?: Date;

  /**
   * Constructor for PasswordResetToken
   */
  constructor(
    attributes: Partial<PasswordResetTokenAttributes> & {
      userId: string;
      token: string;
    },
  ) {
    super();
    this.id = attributes.id || this.generateId();
    this.userId = attributes.userId;
    this.token = attributes.token;
    this.expiresAt =
      attributes.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h expiry
    this.status = attributes.status || PasswordResetTokenStatus.ACTIVE;
    this.usedAt = attributes.usedAt;
    this.createdAt = attributes.createdAt || new Date();
    this.updatedAt = attributes.updatedAt || new Date();
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): PasswordResetTokenAttributes {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
      status: this.status,
      usedAt: this.usedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if token is expired
   * This is business logic that belongs in the model
   */
  isExpired(): boolean {
    return (
      this.status === PasswordResetTokenStatus.EXPIRED ||
      this.expiresAt < new Date()
    );
  }

  /**
   * Check if token has been used
   * This is business logic that belongs in the model
   */
  isUsed(): boolean {
    return (
      this.status === PasswordResetTokenStatus.USED && this.usedAt !== undefined
    );
  }

  /**
   * Check if token is valid (not expired and not used)
   * This is business logic that belongs in the model
   */
  isValid(): boolean {
    return this.status === PasswordResetTokenStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Mark token as used
   * This is business logic that belongs in the model
   */
  markAsUsed(): void {
    this.status = PasswordResetTokenStatus.USED;
    this.usedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark token as expired
   * This is business logic that belongs in the model
   */
  markAsExpired(): void {
    this.status = PasswordResetTokenStatus.EXPIRED;
    this.updatedAt = new Date();
  }
}
