import crypto from "crypto";

import bcrypt from "bcrypt";
import NodeCache from "node-cache";
import zxcvbn from "zxcvbn";

import { BaseService } from "@services/shared";
import { ValidationError } from "@services/shared/errors/ServiceError";

interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonWords: boolean;
  preventPersonalInfo: boolean;
  preventReuse: number; // Number of previous passwords to check
  minAge: number; // Minimum days before password can be changed
  maxAge: number; // Maximum days before password must be changed
  preventPwnedPasswords: boolean;
}

interface PasswordStrengthResult {
  score: number; // 0-4
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  isStrong: boolean;
}

interface PasswordHistoryEntry {
  hash: string;
  timestamp: Date;
}

/**
 * Service for handling password operations with enhanced security
 */
export class PasswordService extends BaseService {
  private readonly saltRounds: number;
  private readonly resetTokenExpiration: number; // in hours
  private readonly policy: PasswordPolicy;
  private readonly breachCache: NodeCache;
  private readonly BREACH_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    super("PasswordService");
    this.saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    this.resetTokenExpiration = parseInt(
      process.env.RESET_TOKEN_EXPIRATION || "24",
      10,
    );
    this.breachCache = new NodeCache({ stdTTL: this.BREACH_CACHE_TTL });

    // Initialize password policy from environment or use secure defaults
    this.policy = {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || "128", 10),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== "false",
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== "false",
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== "false",
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== "false",
      preventCommonWords: process.env.PASSWORD_PREVENT_COMMON !== "false",
      preventPersonalInfo: process.env.PASSWORD_PREVENT_PERSONAL !== "false",
      preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || "5", 10),
      minAge: parseInt(process.env.PASSWORD_MIN_AGE || "1", 10),
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || "90", 10),
      preventPwnedPasswords: process.env.PASSWORD_PREVENT_PWNED !== "false",
    };
  }

  /**
   * Hash a password with additional security measures
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      // Add pepper to password before hashing if configured
      const pepperedPassword = this.addPepper(password);
      return await bcrypt.hash(pepperedPassword, this.saltRounds);
    } catch (error) {
      this.logger.error("Error hashing password:", error);
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Compare a password with a hash
   */
  public async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    try {
      const pepperedPassword = this.addPepper(password);
      return await bcrypt.compare(pepperedPassword, hash);
    } catch (error) {
      this.logger.error("Error comparing password:", error);
      throw new Error("Failed to compare password");
    }
  }

  /**
   * Validate password against all security policies
   */
  public async validatePassword(
    password: string,
    personalInfo?: { email?: string; username?: string; name?: string },
    passwordHistory?: PasswordHistoryEntry[],
    lastChanged?: Date,
  ): Promise<PasswordStrengthResult> {
    try {
      const errors: string[] = [];

      // Check basic requirements
      if (password.length < this.policy.minLength) {
        errors.push(
          `Password must be at least ${this.policy.minLength} characters long`,
        );
      }
      if (password.length > this.policy.maxLength) {
        errors.push(
          `Password must be less than ${this.policy.maxLength} characters long`,
        );
      }
      if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (this.policy.requireNumbers && !/\d/.test(password)) {
        errors.push("Password must contain at least one number");
      }
      if (this.policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
        errors.push("Password must contain at least one special character");
      }

      // Check password age if lastChanged is provided
      if (lastChanged) {
        const daysSinceChange = Math.floor(
          (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceChange < this.policy.minAge) {
          errors.push(
            `Password cannot be changed within ${this.policy.minAge} days of last change`,
          );
        }
      }

      // Check password history
      if (passwordHistory && passwordHistory.length > 0) {
        const isReused = await this.checkPasswordHistory(
          password,
          passwordHistory,
        );
        if (isReused) {
          errors.push(
            `Password cannot be reused from last ${this.policy.preventReuse} passwords`,
          );
        }
      }

      // Check for common passwords and patterns using zxcvbn
      const strengthAnalysis = zxcvbn(
        password,
        personalInfo
          ? ([
              personalInfo.email,
              personalInfo.username,
              personalInfo.name,
            ].filter(Boolean) as string[])
          : undefined,
      );

      if (this.policy.preventCommonWords && strengthAnalysis.score < 3) {
        errors.push("Password is too common or easily guessable");
      }

      // Check if password has been exposed in data breaches
      if (this.policy.preventPwnedPasswords) {
        const isExposed = await this.checkPwnedPassword(password);
        if (isExposed) {
          errors.push("This password has been exposed in data breaches");
        }
      }

      return {
        score: strengthAnalysis.score,
        feedback: {
          warning: strengthAnalysis.feedback.warning,
          suggestions: [...errors, ...strengthAnalysis.feedback.suggestions],
        },
        isStrong: errors.length === 0 && strengthAnalysis.score >= 3,
      };
    } catch (error) {
      this.logger.error("Error validating password:", error);
      throw new ValidationError("Failed to validate password");
    }
  }

  /**
   * Generate a cryptographically secure reset token
   */
  public async generateResetToken(): Promise<string> {
    try {
      const buffer = await crypto.randomBytes(32);
      return buffer.toString("base64url");
    } catch (error) {
      this.logger.error("Error generating reset token:", error);
      throw new Error("Failed to generate reset token");
    }
  }

  /**
   * Get token expiration date
   */
  public getResetTokenExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + this.resetTokenExpiration);
    return expiration;
  }

  /**
   * Generate a strong temporary password
   */
  public generateTemporaryPassword(): string {
    const length = this.policy.minLength;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "@$!%*?&#";

    let password = "";

    // Ensure at least one character from each required set
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];

    // Fill the rest with random characters from all sets
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Get current password policy
   */
  public getPasswordPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * Check if a password exists in password history
   */
  private async checkPasswordHistory(
    password: string,
    history: PasswordHistoryEntry[],
  ): Promise<boolean> {
    const recentHistory = history.slice(-this.policy.preventReuse);

    for (const entry of recentHistory) {
      if (await this.comparePassword(password, entry.hash)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a password has been exposed in known data breaches
   */
  private async checkPwnedPassword(password: string): Promise<boolean> {
    try {
      const hash = crypto
        .createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      // Check cache first
      const cacheKey = `pwned:${prefix}`;
      const cachedResult = this.breachCache.get<string[]>(cacheKey);

      if (cachedResult) {
        return cachedResult.includes(suffix);
      }

      // Make API request to haveibeenpwned.com
      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
      );
      if (!response.ok) {
        throw new Error("Failed to check password breach status");
      }

      const text = await response.text();
      const hashes = text.split("\n").map((line) => line.split(":")[0]);

      // Cache the results
      this.breachCache.set(cacheKey, hashes);

      return hashes.includes(suffix);
    } catch (error) {
      this.logger.error("Error checking pwned password:", error);
      return false; // Fail open if the service is unavailable
    }
  }

  /**
   * Add pepper to password if configured
   */
  private addPepper(password: string): string {
    const pepper = process.env.PASSWORD_PEPPER;
    return pepper ? `${password}${pepper}` : password;
  }
}
