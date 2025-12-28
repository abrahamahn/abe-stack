/**
 * Password Reset Token Model
 * Represents tokens used for password reset functionality
 */

/**
 * Password reset token interface
 */
export interface PasswordResetTokenInterface {
  id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used?: boolean;
  usedAt?: Date;
  createdByIp?: string;
  usedByIp?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Password reset token model
 */
export class PasswordResetToken implements PasswordResetTokenInterface {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  createdByIp?: string;
  usedByIp?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor
   */
  constructor(data: PasswordResetTokenInterface) {
    this.id = data.id || crypto.randomUUID();
    this.userId = data.userId;
    this.token = data.token;
    this.expiresAt = data.expiresAt;
    this.used = data.used || false;
    this.usedAt = data.usedAt;
    this.createdByIp = data.createdByIp;
    this.usedByIp = data.usedByIp;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Check if token is valid
   */
  isValid(): boolean {
    return !this.used && this.expiresAt > new Date();
  }

  /**
   * Check if token has expired
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Mark token as used
   */
  markAsUsed(ipAddress?: string): void {
    this.used = true;
    this.usedAt = new Date();
    this.usedByIp = ipAddress;
    this.updatedAt = new Date();
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt.toISOString(),
      used: this.used,
      usedAt: this.usedAt?.toISOString(),
      createdByIp: this.createdByIp,
      usedByIp: this.usedByIp,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
