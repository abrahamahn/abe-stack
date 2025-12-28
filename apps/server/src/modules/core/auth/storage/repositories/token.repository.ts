import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Repository for managing authentication tokens
 */
@injectable()
export class TokenRepository {
  private tokens: any[] = []; // In-memory storage for demo, would be DB in production

  constructor(@inject(TYPES.LoggerService) private logger: ILoggerService) {}

  /**
   * Create a new token
   */
  async create(tokenData: any): Promise<any> {
    try {
      const id = Date.now().toString();
      const token = { id, ...tokenData };
      this.tokens.push(token);
      return token;
    } catch (error) {
      this.logger.error("Failed to create token", { error });
      throw new Error("Failed to create token");
    }
  }

  /**
   * Find a token by id
   */
  async findById(id: string): Promise<any | null> {
    try {
      const token = this.tokens.find((t) => t.id === id);
      return token || null;
    } catch (error) {
      this.logger.error("Failed to find token by id", { error, id });
      return null;
    }
  }

  /**
   * Find a token by token string
   */
  async findByToken(token: string): Promise<any | null> {
    try {
      const tokenRecord = this.tokens.find((t) => t.token === token);
      return tokenRecord || null;
    } catch (error) {
      this.logger.error("Failed to find token", { error });
      return null;
    }
  }

  /**
   * Find tokens by user ID
   */
  async findByUserId(userId: string): Promise<any[]> {
    try {
      return this.tokens.filter((t) => t.userId === userId);
    } catch (error) {
      this.logger.error("Failed to find tokens by userId", { error, userId });
      return [];
    }
  }

  /**
   * Update a token
   */
  async update(id: string, updates: any): Promise<any> {
    try {
      const index = this.tokens.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error("Token not found");
      }
      this.tokens[index] = { ...this.tokens[index], ...updates };
      return this.tokens[index];
    } catch (error) {
      this.logger.error("Failed to update token", { error, id });
      throw new Error("Failed to update token");
    }
  }

  /**
   * Delete a token
   */
  async delete(id: string): Promise<boolean> {
    try {
      const initialLength = this.tokens.length;
      this.tokens = this.tokens.filter((t) => t.id !== id);
      return this.tokens.length < initialLength;
    } catch (error) {
      this.logger.error("Failed to delete token", { error, id });
      throw new Error("Failed to delete token");
    }
  }

  /**
   * Delete all tokens for a user
   */
  async deleteByUserId(userId: string): Promise<boolean> {
    try {
      const initialLength = this.tokens.length;
      this.tokens = this.tokens.filter((t) => t.userId !== userId);
      return this.tokens.length < initialLength;
    } catch (error) {
      this.logger.error("Failed to delete tokens by userId", { error, userId });
      throw new Error("Failed to delete tokens by userId");
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
      this.logger.error("Failed to delete expired tokens", { error });
      throw new Error("Failed to delete expired tokens");
    }
  }
}
