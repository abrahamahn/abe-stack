import * as crypto from "crypto";

import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";

import { UserRepository } from "../../users/repositories/user.repository";
import {
  VerificationToken,
  VerificationResult,
} from "../features/token/models/verification-token.model";
import { VerificationTokenRepository } from "../storage/repositories/verification-token.repository";

/**
 * Service for handling email verification operations
 */
@injectable()
export class VerificationService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.VerificationTokenRepository)
    private verificationRepository: VerificationTokenRepository,
    @inject(TYPES.UserRepository) private userRepository: UserRepository
  ) {}

  /**
   * Create a new verification token for a user
   */
  async createVerificationToken(userId: string): Promise<VerificationToken> {
    try {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");

      // Create token with expiration (24 hours)
      const verificationToken = await this.verificationRepository.create({
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        used: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return verificationToken;
    } catch (error) {
      this.logger.error("Error creating verification token", { error });
      throw new Error("Failed to create verification token");
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<VerificationResult> {
    try {
      // Find token
      const verificationToken =
        await this.verificationRepository.findByToken(token);

      if (!verificationToken) {
        return { success: false, message: "Invalid verification token" };
      }

      // Check token expiration
      if (verificationToken.expiresAt < new Date()) {
        return { success: false, message: "Verification token has expired" };
      }

      // Mark user as verified
      const updateResult = await this.userRepository.update(
        verificationToken.userId,
        {
          is_verified: true,
          email_confirmed: true,
        }
      );

      if (!updateResult) {
        return { success: false, message: "Failed to verify user email" };
      }

      // Mark token as used
      await this.verificationRepository.markAsUsed(verificationToken.id);

      return {
        success: true,
        message: "Email verified successfully",
        userId: verificationToken.userId,
      };
    } catch (error) {
      this.logger.error("Error verifying email", { error });
      return { success: false, message: "Email verification failed" };
    }
  }

  /**
   * Resend verification email token
   */
  async regenerateVerificationToken(
    userId: string
  ): Promise<VerificationToken> {
    // Clear any existing unused tokens
    await this.verificationRepository.db.executeQuery(
      `UPDATE verification_tokens SET used = true, used_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND used = false`,
      [userId]
    );

    // Generate a new token
    return this.createVerificationToken(userId);
  }
}
