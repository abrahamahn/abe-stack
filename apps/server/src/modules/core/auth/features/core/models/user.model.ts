/**
 * User model
 * Core user entity for authentication
 */

/**
 * User roles
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

/**
 * User interface
 */
export interface UserInterface {
  id?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User model
 */
export class User implements UserInterface {
  id: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Constructor
   */
  constructor(data: UserInterface) {
    this.id = data.id || crypto.randomUUID();
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.roles = data.roles || [UserRole.USER];
    this.isActive = data.isActive ?? true;
    this.isEmailVerified = data.isEmailVerified ?? false;
    this.lastLoginAt = data.lastLoginAt;
    this.lastLoginIp = data.lastLoginIp;
    this.mfaEnabled = data.mfaEnabled ?? false;
    this.mfaSecret = data.mfaSecret;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Get full name
   */
  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) {
      return this.firstName;
    }
    if (this.lastName) {
      return this.lastName;
    }
    return this.email.split("@")[0];
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return this.roles.some((role) => roles.includes(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    return roles.every((role) => this.roles.includes(role));
  }

  /**
   * Check if user is an admin
   */
  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  /**
   * Update last login information
   */
  updateLastLogin(ipAddress?: string): void {
    this.lastLoginAt = new Date();
    if (ipAddress) {
      this.lastLoginIp = ipAddress;
    }
    this.updatedAt = new Date();
  }

  /**
   * Convert to JSON for serialization, excluding sensitive data
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      roles: this.roles,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      lastLoginAt: this.lastLoginAt?.toISOString(),
      mfaEnabled: this.mfaEnabled,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
