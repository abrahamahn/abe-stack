import { BaseModel, BaseModelInterface } from "@/server/modules/base";

/**
 * User model interface
 */
export interface UserInterface extends BaseModelInterface {
  email: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  profileImage?: string;
  bannerImage?: string;

  // Role system - supporting both single role and roles array
  role: string;
  roles: string[];

  // Authentication status
  active: boolean;
  isVerified?: boolean;
  emailConfirmed?: boolean;

  // Email verification
  emailToken?: string;
  emailTokenExpire?: Date;
  lastEmailSent?: Date;

  // Security tracking
  lastLogin?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  lastIpAddress?: string;
  loginHistory?: any[];

  // API keys
  apiKeys?: string[];

  // MFA support
  mfaEnabled?: boolean;
  mfaSecret?: string;
  backupCodes?: string[];

  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Cookie-based authentication
  rememberToken?: string;
  rememberTokenExpires?: Date;

  // Legacy fields for compatibility
  type?: string;
  lastLoginAt?: Date;
  accountStatus?: string;
  passwordLastChanged?: Date;
}

/**
 * Safe user object without sensitive fields
 */
export type SafeUser = Omit<
  UserInterface,
  | "password"
  | "emailToken"
  | "mfaSecret"
  | "passwordResetToken"
  | "rememberToken"
  | "backupCodes"
>;

/**
 * User model class
 */
export class User extends BaseModel implements UserInterface {
  email: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  profileImage?: string;
  bannerImage?: string;

  // Role system
  role: string;
  roles: string[];

  // Authentication status
  active: boolean;
  isVerified?: boolean;
  emailConfirmed?: boolean;

  // Email verification
  emailToken?: string;
  emailTokenExpire?: Date;
  lastEmailSent?: Date;

  // Security tracking
  lastLogin?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  lastIpAddress?: string;
  loginHistory?: any[];

  // API keys
  apiKeys?: string[];

  // MFA support
  mfaEnabled?: boolean;
  mfaSecret?: string;
  backupCodes?: string[];

  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Cookie-based authentication
  rememberToken?: string;
  rememberTokenExpires?: Date;

  // Legacy fields
  type?: string;
  lastLoginAt?: Date;
  accountStatus?: string;
  passwordLastChanged?: Date;

  constructor(data: Partial<UserInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.email = data.email || "";
    this.username = data.username;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.displayName = data.displayName || this.generateDisplayName();
    this.bio = data.bio;
    this.profileImage = data.profileImage;
    this.bannerImage = data.bannerImage;

    // Role system
    this.role = data.role || "user";
    this.roles = data.roles || ["user"];

    // Authentication status
    this.active = data.active ?? true;
    this.isVerified = data.isVerified ?? false;
    this.emailConfirmed = data.emailConfirmed ?? false;

    // Email verification
    this.emailToken = data.emailToken;
    this.emailTokenExpire = data.emailTokenExpire;
    this.lastEmailSent = data.lastEmailSent;

    // Security tracking
    this.lastLogin = data.lastLogin;
    this.failedLoginAttempts = data.failedLoginAttempts ?? 0;
    this.lockedUntil = data.lockedUntil;
    this.lastIpAddress = data.lastIpAddress;
    this.loginHistory = data.loginHistory || [];

    // API keys
    this.apiKeys = data.apiKeys || [];

    // MFA support
    this.mfaEnabled = data.mfaEnabled ?? false;
    this.mfaSecret = data.mfaSecret;
    this.backupCodes = data.backupCodes;

    // Password reset
    this.passwordResetToken = data.passwordResetToken;
    this.passwordResetExpires = data.passwordResetExpires;

    // Cookie-based authentication
    this.rememberToken = data.rememberToken;
    this.rememberTokenExpires = data.rememberTokenExpires;

    // Legacy fields
    this.type = data.type || "standard";
    this.lastLoginAt = data.lastLoginAt;
    this.accountStatus = data.accountStatus || "pending";
    this.passwordLastChanged = data.passwordLastChanged;

    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Generate a display name from first and last name, or username
   */
  generateDisplayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`.trim();
    }
    if (this.firstName) {
      return this.firstName;
    }
    if (this.lastName) {
      return this.lastName;
    }
    if (this.username) {
      return this.username;
    }
    return this.email.split("@")[0];
  }

  /**
   * Validate the user model
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.email) {
      errors.push({
        field: "email",
        message: "Email is required",
        code: "REQUIRED",
      });
    } else if (!this.isValidEmail(this.email)) {
      errors.push({
        field: "email",
        message: "Email is not valid",
        code: "INVALID_FORMAT",
      });
    }

    if (this.password && this.password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters",
        code: "TOO_SHORT",
      });
    }

    if (!this.roles || this.roles.length === 0) {
      errors.push({
        field: "roles",
        message: "At least one role is required",
        code: "REQUIRED",
      });
    }

    if (this.failedLoginAttempts && this.failedLoginAttempts < 0) {
      errors.push({
        field: "failedLoginAttempts",
        message: "Failed login attempts cannot be negative",
        code: "INVALID_VALUE",
      });
    }

    return errors;
  }

  /**
   * Check if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `User(${this.id}): ${this.email} (${this.roles.join(", ")})`;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /**
   * Add a role to the user
   */
  addRole(role: string): void {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      // Keep single role field in sync with primary role
      if (this.roles.length === 1 || role === "admin") {
        this.role = role;
      }
    }
  }

  /**
   * Remove a role from the user
   */
  removeRole(role: string): void {
    this.roles = this.roles.filter((r) => r !== role);
    // Ensure user always has at least one role
    if (this.roles.length === 0) {
      this.roles = ["user"];
      this.role = "user";
    } else {
      // Update primary role if we removed it
      if (this.role === role) {
        this.role = this.roles[0];
      }
    }
  }

  /**
   * Check if user has a specific permission through roles
   * This is a placeholder - actual permission checking would be done by a service
   */
  hasPermission(permission: string): boolean {
    // In a real app, this would query a permission service
    // For now, we'll just assume admin has all permissions
    return this.hasRole("admin");
  }

  /**
   * Check if user account is locked
   */
  isLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  /**
   * Check if user account is active and not locked
   */
  isActiveAndUnlocked(): boolean {
    return this.active && !this.isLocked();
  }

  /**
   * Increment failed login attempts
   */
  incrementFailedLoginAttempts(): void {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  /**
   * Reset failed login attempts (called on successful login)
   */
  resetFailedLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
  }

  /**
   * Update login tracking
   */
  updateLoginTracking(ipAddress?: string): void {
    const now = new Date();
    this.lastLogin = now;
    this.lastLoginAt = now; // Legacy field

    if (ipAddress) {
      this.lastIpAddress = ipAddress;

      // Add to login history (keep last 10 entries)
      this.loginHistory = this.loginHistory || [];
      this.loginHistory.unshift({
        timestamp: now,
        ipAddress,
      });

      if (this.loginHistory.length > 10) {
        this.loginHistory = this.loginHistory.slice(0, 10);
      }
    }

    this.resetFailedLoginAttempts();
  }

  /**
   * Create a safe version of the user without sensitive data
   */
  toSafeObject(): SafeUser {
    const safeUser: SafeUser = {
      id: this.id,
      email: this.email,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      bio: this.bio,
      profileImage: this.profileImage,
      bannerImage: this.bannerImage,
      role: this.role,
      roles: [...this.roles],
      active: this.active,
      isVerified: this.isVerified,
      emailConfirmed: this.emailConfirmed,
      lastEmailSent: this.lastEmailSent,
      lastLogin: this.lastLogin,
      failedLoginAttempts: this.failedLoginAttempts,
      lockedUntil: this.lockedUntil,
      lastIpAddress: this.lastIpAddress,
      loginHistory: this.loginHistory ? [...this.loginHistory] : [],
      apiKeys: this.apiKeys ? [...this.apiKeys] : [],
      mfaEnabled: this.mfaEnabled,
      type: this.type,
      lastLoginAt: this.lastLoginAt,
      accountStatus: this.accountStatus,
      passwordLastChanged: this.passwordLastChanged,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      emailTokenExpire: this.emailTokenExpire,
      passwordResetExpires: this.passwordResetExpires,
      rememberTokenExpires: this.rememberTokenExpires,
    };
    return safeUser;
  }
}
