/**
 * Token model
 * Represents authentication tokens in the system
 */

/**
 * Token types
 */
export enum TokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  RESET_PASSWORD = "reset_password",
  VERIFY_EMAIL = "verify_email",
  INVITE = "invite",
  TEMP = "temp",
}

/**
 * Token interface
 */
export interface TokenInterface {
  id?: string;
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  revoked?: boolean;
  revokedAt?: Date;
  createdByIp?: string;
  revokedByIp?: string;
  replacedByToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Token model
 */
export class Token implements TokenInterface {
  id: string;
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  createdByIp?: string;
  revokedByIp?: string;
  replacedByToken?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor
   */
  constructor(data: TokenInterface) {
    this.id = data.id || crypto.randomUUID();
    this.userId = data.userId;
    this.token = data.token;
    this.type = data.type;
    this.expiresAt = data.expiresAt;
    this.revoked = data.revoked || false;
    this.revokedAt = data.revokedAt;
    this.createdByIp = data.createdByIp;
    this.revokedByIp = data.revokedByIp;
    this.replacedByToken = data.replacedByToken;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Check if the token is active
   */
  isActive(): boolean {
    return !this.revoked && this.expiresAt > new Date();
  }

  /**
   * Check if the token has expired
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Check if the token is revoked
   */
  isRevoked(): boolean {
    return this.revoked;
  }

  /**
   * Revoke the token
   */
  revoke(ipAddress?: string): void {
    this.revoked = true;
    this.revokedAt = new Date();
    this.revokedByIp = ipAddress;
    this.updatedAt = new Date();
  }

  /**
   * Replace the token with a new one
   */
  replace(newToken: string): void {
    this.replacedByToken = newToken;
    this.updatedAt = new Date();
  }

  /**
   * Check if token can be refreshed
   */
  canRefresh(): boolean {
    return (
      this.type === TokenType.REFRESH &&
      !this.revoked &&
      this.expiresAt > new Date()
    );
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      type: this.type,
      expiresAt: this.expiresAt.toISOString(),
      revoked: this.revoked,
      revokedAt: this.revokedAt?.toISOString(),
      createdByIp: this.createdByIp,
      revokedByIp: this.revokedByIp,
      replacedByToken: this.replacedByToken,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
