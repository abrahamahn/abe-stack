import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Repository for managing password reset tokens
 */
@injectable()
export class PasswordResetTokenRepository {
  private tokens: any[] = []; // In-memory storage for demo, would be DB in production

  constructor(@inject(TYPES.LoggerService) private logger: ILoggerService) {}

  /**
   * Create a new reset token
   */
  async create(tokenData: any): Promise<any> {
    try {
      const id = Date.now().toString();
      const token = { id, ...tokenData };
      this.tokens.push(token);
      return token;
    } catch (error) {
      this.logger.error("Failed to create password reset token", { error });
      throw new Error("Failed to create password reset token");
    }
  }

  /**
   * Find a reset token by id
   */
  async findById(id: string): Promise<any | null> {
    try {
      const token = this.tokens.find((t) => t.id === id);
      return token || null;
    } catch (error) {
      this.logger.error("Failed to find password reset token by id", {
        error,
        id,
      });
      return null;
    }
  }

  /**
   * Find a reset token by token string
   */
  async findByToken(token: string): Promise<any | null> {
    try {
      const tokenRecord = this.tokens.find((t) => t.token === token);
      return tokenRecord || null;
    } catch (error) {
      this.logger.error("Failed to find password reset token", { error });
      return null;
    }
  }

  /**
   * Find the most recent valid reset token for a user
   */
  async findByUserId(userId: string): Promise<any | null> {
    try {
      const now = new Date();
      const userTokens = this.tokens
        .filter((t) => t.userId === userId && !t.isUsed && t.expiresAt > now)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      return userTokens.length > 0 ? userTokens[0] : null;
    } catch (error) {
      this.logger.error("Failed to find password reset token by userId", {
        error,
        userId,
      });
      return null;
    }
  }

  /**
   * Update a reset token
   */
  async update(id: string, updates: any): Promise<any> {
    try {
      const index = this.tokens.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error("Password reset token not found");
      }
      this.tokens[index] = { ...this.tokens[index], ...updates };
      return this.tokens[index];
    } catch (error) {
      this.logger.error("Failed to update password reset token", { error, id });
      throw new Error("Failed to update password reset token");
    }
  }

  /**
   * Invalidate all reset tokens for a user
   */
  async invalidateForUser(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      let updated = false;

      this.tokens = this.tokens.map((token) => {
        if (token.userId === userId && !token.isUsed && token.expiresAt > now) {
          updated = true;
          return { ...token, isUsed: true, usedAt: now };
        }
        return token;
      });

      return updated;
    } catch (error) {
      this.logger.error("Failed to invalidate password reset tokens", {
        error,
        userId,
      });
      throw new Error("Failed to invalidate password reset tokens");
    }
  }

  /**
   * Delete expired tokens
   */
  async deleteExpired(): Promise<number> {
    try {
      const now = new Date();
      const initialLength = this.tokens.length;
      this.tokens = this.tokens.filter(
        (t) => !t.expiresAt || t.expiresAt > now
      );
      return initialLength - this.tokens.length;
    } catch (error) {
      this.logger.error("Failed to delete expired password reset tokens", {
        error,
      });
      throw new Error("Failed to delete expired password reset tokens");
    }
  }
}
