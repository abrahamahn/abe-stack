import { BaseModel } from "@/server/modules/base/baseModel";

/**
 * Interface for a user session
 */
export interface SessionInterface {
  /**
   * Unique session ID
   */
  id: string;

  /**
   * User ID associated with the session
   */
  userId: string;

  /**
   * IP address of the client
   */
  ipAddress: string;

  /**
   * User agent of the client
   */
  userAgent: string;

  /**
   * Date when the session was created
   */
  createdAt: Date;

  /**
   * Date when the session was last accessed
   */
  lastAccessedAt: Date;

  /**
   * Date when the session expires
   */
  expiresAt: Date;

  /**
   * Custom data associated with the session
   */
  data?: Record<string, any>;

  /**
   * Whether the session is active
   */
  isActive: boolean;
}

/**
 * Session model class
 */
export class Session extends BaseModel implements SessionInterface {
  /**
   * Unique session ID
   */
  id: string;

  /**
   * User ID associated with the session
   */
  userId: string;

  /**
   * IP address of the client
   */
  ipAddress: string;

  /**
   * User agent of the client
   */
  userAgent: string;

  /**
   * Date when the session was created
   */
  createdAt: Date;

  /**
   * Date when the session was last accessed
   */
  lastAccessedAt: Date;

  /**
   * Date when the session expires
   */
  expiresAt: Date;

  /**
   * Custom data associated with the session
   */
  data?: Record<string, any>;

  /**
   * Whether the session is active
   */
  isActive: boolean;

  /**
   * Constructor
   */
  constructor(data: Partial<SessionInterface> = {}) {
    super();

    this.id = data.id || "";
    this.userId = data.userId || "";
    this.ipAddress = data.ipAddress || "";
    this.userAgent = data.userAgent || "";
    this.createdAt = data.createdAt || new Date();
    this.lastAccessedAt = data.lastAccessedAt || new Date();
    this.expiresAt =
      data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
    this.data = data.data || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;

    const validationErrors = this.validate();
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors
        .map((err) => `${err.field}: ${err.message}`)
        .join(", ");
      throw new Error(`Session validation failed: ${errorMessages}`);
    }
  }

  /**
   * Validate the session data
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.id) {
      errors.push({ field: "id", message: "Session ID is required" });
    }

    if (!this.userId) {
      errors.push({ field: "userId", message: "User ID is required" });
    }

    if (!this.ipAddress) {
      errors.push({ field: "ipAddress", message: "IP address is required" });
    }

    if (!this.userAgent) {
      errors.push({ field: "userAgent", message: "User agent is required" });
    }

    return errors;
  }

  /**
   * Check if the session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Refresh the session by updating the lastAccessedAt and expiresAt
   * @param ttlSeconds - Time to live in seconds
   */
  refresh(ttlSeconds: number = 24 * 60 * 60): void {
    this.lastAccessedAt = new Date();
    this.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  }

  /**
   * Deactivate the session
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Convert the session to JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt.toISOString(),
      lastAccessedAt: this.lastAccessedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      data: this.data,
      isActive: this.isActive,
    };
  }

  /**
   * Convert model to string representation
   */
  toString(): string {
    return `Session(id=${this.id}, userId=${this.userId}, active=${this.isActive})`;
  }
}
