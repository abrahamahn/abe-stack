import { injectable } from "inversify";

import {
  TokenBlacklist,
  TokenMetadata,
  TokenStatus,
} from "./TokenBlacklistService";

/**
 * In-memory implementation of the TokenBlacklist interface.
 *
 * This implementation stores blacklisted tokens in memory, making it suitable for
 * development, testing, or small-scale deployments. For production use, consider
 * implementing a persistent storage option.
 */
@injectable()
export class InMemoryTokenBlacklist implements TokenBlacklist {
  private blacklist: Map<string, TokenMetadata> = new Map();

  /**
   * Add a token to the blacklist
   * @param tokenId Token ID to blacklist
   * @param metadata Optional metadata about the token
   * @returns Promise resolving to true if successful
   */
  async add(tokenId: string, metadata: TokenMetadata = {}): Promise<boolean> {
    try {
      this.blacklist.set(tokenId, {
        addedAt: new Date().toISOString(),
        ...metadata,
      });
      return true;
    } catch (error) {
      console.error("Error adding token to blacklist", { tokenId, error });
      return false;
    }
  }

  /**
   * Remove a token from the blacklist
   * @param tokenId Token ID to remove
   * @returns Promise resolving to true if token was found and removed
   */
  async remove(tokenId: string): Promise<boolean> {
    return this.blacklist.delete(tokenId);
  }

  /**
   * Check if a token is blacklisted
   * @param tokenId Token ID to check
   * @returns Promise resolving to a TokenStatus object
   */
  async check(tokenId: string): Promise<TokenStatus> {
    const metadata = this.blacklist.get(tokenId);
    return {
      isBlacklisted: !!metadata,
      metadata,
    };
  }

  /**
   * Get metadata for a blacklisted token
   * @param tokenId Token ID to get metadata for
   * @returns Promise resolving to token metadata or null if not found
   */
  async getMetadata(tokenId: string): Promise<TokenMetadata | null> {
    return this.blacklist.get(tokenId) || null;
  }

  /**
   * List all blacklisted tokens
   * @returns Promise resolving to an array of token IDs
   */
  async listAll(): Promise<string[]> {
    return Array.from(this.blacklist.keys());
  }

  /**
   * Clear expired tokens from the blacklist
   * @returns Promise resolving to the number of tokens cleared
   */
  async clearExpired(): Promise<number> {
    const now = new Date();
    let cleared = 0;

    for (const [tokenId, metadata] of this.blacklist.entries()) {
      if (metadata.expiresAt && new Date(metadata.expiresAt) < now) {
        this.blacklist.delete(tokenId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Remove all tokens for a specific user
   * @param userId User ID whose tokens should be removed
   * @returns Promise resolving to the number of tokens removed
   */
  async removeAllForUser(userId: string): Promise<number> {
    let removed = 0;

    for (const [tokenId, metadata] of this.blacklist.entries()) {
      if (metadata.userId === userId) {
        this.blacklist.delete(tokenId);
        removed++;
      }
    }

    return removed;
  }
}
