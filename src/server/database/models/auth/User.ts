// src/server/models/User.ts
import bcrypt from "bcrypt";

import { BaseModel } from "../BaseModel";

export enum UserType {
  PREMIUM = "premium",
  VERIFIED = "verified",
  STANDARD = "standard",
  RESTRICTED = "restricted",
}

/**
 * Interface defining the structure of a User
 */
export interface UserAttributes extends BaseModel {
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  emailConfirmed: boolean;
  emailToken: string | null;
  emailTokenExpire: Date | null;
  lastEmailSent: Date | null;
  type: UserType;
}

/**
 * Interface for serialized User object (without sensitive fields)
 */
export interface UserJSON
  extends Omit<
    User,
    | "password"
    | "update"
    | "delete"
    | "comparePassword"
    | "updatePassword"
    | "toJSON"
    | "emailToken"
    | "emailTokenExpire"
    | "validate"
  > {
  posts?: UserAttributes[];
  isFollowing?: boolean;
}

/**
 * User model representing a user account.
 * This class handles:
 * 1. User data structure
 * 2. User validation and state checking
 * 3. User-related business logic (password hashing, comparison)
 * 4. NOT database operations - those belong in UserRepository
 */
export class User
  extends BaseModel
  implements Omit<UserAttributes, keyof BaseModel>
{
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  emailConfirmed: boolean;
  emailToken: string | null;
  emailTokenExpire: Date | null;
  lastEmailSent: Date | null;
  type: UserType;

  constructor(data: Partial<UserAttributes>) {
    super();
    this.username = data.username || "";
    this.email = data.email || "";
    this.password = data.password || "";
    this.displayName = data.displayName || null;
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.bio = data.bio || null;
    this.profileImage = data.profileImage || null;
    this.bannerImage = data.bannerImage || null;
    this.role = data.role || "user";
    this.isVerified = data.isVerified || false;
    this.emailConfirmed = data.emailConfirmed || false;
    this.emailToken = data.emailToken || null;
    this.emailTokenExpire = data.emailTokenExpire || null;
    this.lastEmailSent = data.lastEmailSent || null;
    this.type = data.type || UserType.STANDARD;
  }

  /**
   * Converts the user to a JSON object, omitting sensitive fields
   */
  toJSON(): Omit<
    UserAttributes,
    "password" | "emailToken" | "emailTokenExpire" | "generateId"
  > {
    const {
      password: _,
      emailToken: __,
      emailTokenExpire: ___,
      ...userJson
    } = this;
    return userJson;
  }

  /**
   * Compares a plain text password with the hashed password
   * @param candidatePassword The plain text password to compare
   * @returns True if the passwords match, false otherwise
   */
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Updates the user's password with a new hashed password
   * @param newPassword The new plain text password
   */
  async updatePassword(newPassword: string): Promise<void> {
    this.password = await bcrypt.hash(newPassword, 10);
    this.updatedAt = new Date();
  }

  /**
   * Validates user data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.username) {
      throw new Error("Username is required");
    }

    if (!this.email) {
      throw new Error("Email is required");
    }

    if (!this.isValidEmail(this.email)) {
      throw new Error("Invalid email format");
    }

    if (!this.password) {
      throw new Error("Password is required");
    }
  }

  /**
   * Verifies the user's email
   */
  verifyEmail(): void {
    this.emailConfirmed = true;
    this.emailToken = null;
    this.emailTokenExpire = null;
    this.updatedAt = new Date();
  }

  /**
   * Sets a new email verification token
   * @param token The verification token
   * @param expiresIn Time in milliseconds until the token expires
   */
  setEmailVerificationToken(
    token: string,
    expiresIn: number = 24 * 60 * 60 * 1000,
  ): void {
    this.emailToken = token;
    this.emailTokenExpire = new Date(Date.now() + expiresIn);
    this.lastEmailSent = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Checks if the user's email is confirmed
   */
  isEmailConfirmed(): boolean {
    return this.emailConfirmed;
  }

  /**
   * Checks if the user is an admin
   */
  isAdmin(): boolean {
    return this.role === "admin";
  }

  /**
   * Gets the full name of the user (if available)
   */
  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }

    if (this.firstName) {
      return this.firstName;
    }

    if (this.displayName) {
      return this.displayName;
    }

    return this.username;
  }

  /**
   * Validates email format
   * @param email The email to validate
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
