import { BaseModel } from "../BaseModel";

/**
 * Enumeration defining the different types of tokens in the system
 */
export enum TokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  PASSWORD_RESET = "password_reset",
  EMAIL_VERIFICATION = "email_verification",
}

/**
 * Interface defining the structure of a Token
 */
export interface TokenAttributes extends BaseModel {
  userId: string;
  token: string;
  type: TokenType;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revoked: boolean;
}

/**
 * Token model representing an authentication or verification token.
 * This class handles:
 * 1. Token data structure
 * 2. Token validation and state checking
 * 3. Token-related business logic
 * 4. NOT database operations - those belong in TokenRepository
 */
export class Token
  extends BaseModel
  implements Omit<TokenAttributes, keyof BaseModel>
{
  userId: string;
  token: string;
  type: TokenType;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revoked: boolean;

  constructor(data: Partial<TokenAttributes>) {
    super();
    this.userId = data.userId || "";
    this.token = data.token || "";
    this.type = data.type || TokenType.ACCESS;
    this.deviceInfo = data.deviceInfo || null;
    this.ipAddress = data.ipAddress || null;
    this.expiresAt = data.expiresAt || new Date();
    this.lastUsedAt = data.lastUsedAt || null;
    this.revoked = data.revoked || false;
  }

  /**
   * Converts the token to a plain object
   */
  toJSON(): Omit<TokenAttributes, "generateId"> {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      type: this.type,
      deviceInfo: this.deviceInfo,
      ipAddress: this.ipAddress,
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
      revoked: this.revoked,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Checks if the token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.revoked && this.expiresAt > new Date();
  }

  /**
   * Checks if the token is expired
   */
  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  /**
   * Checks if the token has been revoked
   */
  isRevoked(): boolean {
    return this.revoked;
  }

  /**
   * Marks the token as used by updating the lastUsedAt field
   * Note: This only updates the model, not the database
   */
  markAsUsed(): void {
    this.lastUsedAt = new Date();
  }

  /**
   * Revokes the token
   * Note: This only updates the model, not the database
   */
  revokeToken(): void {
    this.revoked = true;
  }

  /**
   * Validates the token data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }

    if (!this.token) {
      throw new Error("Token string is required");
    }

    if (!Object.values(TokenType).includes(this.type)) {
      throw new Error(`Invalid token type: ${this.type}`);
    }

    if (!this.expiresAt) {
      throw new Error("Expiration date is required");
    }
  }
}
