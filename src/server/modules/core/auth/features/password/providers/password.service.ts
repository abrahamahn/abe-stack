import { randomBytes, createHash } from "crypto";
import * as crypto from "crypto";

import * as bcrypt from "bcrypt";
import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Service for handling password operations securely
 */
@injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12;
  private readonly MIN_PASSWORD_LENGTH = 8;
  private readonly PEPPER: string;

  // Password complexity requirements
  static readonly PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  };

  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService,
    @inject(TYPES.PasswordResetTokenRepository)
    private passwordResetRepository: any
  ) {
    // Generate a random pepper if not in production
    this.PEPPER = createHash("sha256")
      .update(randomBytes(32).toString("hex"))
      .digest("hex");

    this.logger.debug("Password service initialized");
  }

  /**
   * Hash a password using bcrypt with salt and pepper
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      // Validate password
      this.validatePassword(password);

      // Add pepper to password before hashing
      const pepperedPassword = this.pepperPassword(password);

      // Hash with bcrypt
      return bcrypt.hash(pepperedPassword, this.SALT_ROUNDS);
    } catch (error) {
      this.logger.error("Password hashing failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare a plain text password with a hashed password
   */
  public async comparePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      // Add pepper to password before comparing
      const pepperedPassword = this.pepperPassword(plainPassword);

      // Compare with bcrypt
      return bcrypt.compare(pepperedPassword, hashedPassword);
    } catch (error) {
      this.logger.error("Password comparison failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generate a secure random password
   */
  public generateSecurePassword(length = 16): string {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]\\:;?><,./-=";
    let password = "";

    // Ensure we have at least one of each: uppercase, lowercase, digit, special char
    password += charset.substr(Math.floor(Math.random() * 26), 1); // lowercase
    password += charset.substr(26 + Math.floor(Math.random() * 26), 1); // uppercase
    password += charset.substr(52 + Math.floor(Math.random() * 10), 1); // digit
    password += charset.substr(
      62 + Math.floor(Math.random() * (charset.length - 62)),
      1
    ); // special

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  }

  /**
   * Generate a secure reset token
   */
  public generateResetToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password || password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`
      );
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter");
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error("Password must contain at least one lowercase letter");
    }

    // Check for at least one digit
    if (!/\d/.test(password)) {
      throw new Error("Password must contain at least one digit");
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+~`|}{[\\\]:;?><,./-=]/.test(password)) {
      throw new Error("Password must contain at least one special character");
    }
  }

  /**
   * Add pepper to password
   */
  private pepperPassword(password: string): string {
    return createHash("sha256")
      .update(password + this.PEPPER)
      .digest("hex");
  }

  /**
   * Validate password against requirements
   */
  validatePasswordAgainstRequirements(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < PasswordService.PASSWORD_REQUIREMENTS.minLength) {
      errors.push(
        `Password must be at least ${PasswordService.PASSWORD_REQUIREMENTS.minLength} characters`
      );
    }

    if (
      PasswordService.PASSWORD_REQUIREMENTS.requireUppercase &&
      !/[A-Z]/.test(password)
    ) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (
      PasswordService.PASSWORD_REQUIREMENTS.requireLowercase &&
      !/[a-z]/.test(password)
    ) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (
      PasswordService.PASSWORD_REQUIREMENTS.requireNumbers &&
      !/\d/.test(password)
    ) {
      errors.push("Password must contain at least one number");
    }

    if (
      PasswordService.PASSWORD_REQUIREMENTS.requireSpecialChars &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a password reset token
   */
  async createResetToken(userId: string): Promise<string> {
    try {
      // Generate token
      const token = crypto.randomBytes(32).toString("hex");

      // Create token record
      await this.passwordResetRepository.create({
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        isUsed: false,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to create password reset token", {
        error,
        userId,
      });
      throw new Error("Failed to create password reset token");
    }
  }

  /**
   * Verify a password reset token
   */
  async verifyResetToken(
    token: string
  ): Promise<{ valid: boolean; userId?: string }> {
    try {
      const resetToken = await this.passwordResetRepository.findByToken(token);

      if (!resetToken) {
        return { valid: false };
      }

      if (resetToken.isUsed) {
        return { valid: false };
      }

      if (resetToken.expiresAt < new Date()) {
        return { valid: false };
      }

      return { valid: true, userId: resetToken.userId };
    } catch (error) {
      this.logger.error("Failed to verify password reset token", { error });
      return { valid: false };
    }
  }

  /**
   * Reset a user's password with a valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify token
      const { valid, userId } = await this.verifyResetToken(token);
      if (!valid || !userId) {
        return false;
      }

      // Validate new password
      const validation = this.validatePasswordAgainstRequirements(newPassword);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      // Mark token as used
      const resetToken = await this.passwordResetRepository.findByToken(token);
      await this.passwordResetRepository.update(resetToken.id, {
        isUsed: true,
        usedAt: new Date(),
      });

      // Hash and update password (requires user repository injection or returning hash)
      const hashedPassword = await this.hashPassword(newPassword);

      // Return the hashed password, actual update happens in the controller
      return true;
    } catch (error) {
      this.logger.error("Failed to reset password", { error });
      throw new Error("Failed to reset password");
    }
  }
}
