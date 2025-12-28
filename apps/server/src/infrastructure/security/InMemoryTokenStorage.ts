import { injectable } from "inversify";

import { TokenStorage, TokenData, TokenInfo } from "./TokenStorageService";

/**
 * In-memory implementation of the TokenStorage interface.
 *
 * This implementation stores tokens in memory, making it suitable for
 * development, testing, or small-scale deployments. For production use, consider
 * implementing a persistent storage option.
 */
@injectable()
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: Map<string, TokenData> = new Map();

  /**
   * Store a token with associated data
   * @param tokenId Token ID to store
   * @param data Token data
   */
  async storeToken(tokenId: string, data: TokenData): Promise<void> {
    this.tokens.set(tokenId, { ...data });
  }

  /**
   * Get token data by ID
   * @param tokenId Token ID to retrieve
   * @returns Token data or null if not found
   */
  async getTokenData(tokenId: string): Promise<TokenData | null> {
    return this.tokens.get(tokenId) || null;
  }

  /**
   * Remove a token by ID
   * @param tokenId Token ID to remove
   */
  async removeToken(tokenId: string): Promise<void> {
    this.tokens.delete(tokenId);
  }

  /**
   * Check if a token exists
   * @param tokenId Token ID to check
   * @returns Whether the token exists
   */
  async hasToken(tokenId: string): Promise<boolean> {
    return this.tokens.has(tokenId);
  }

  /**
   * Get all tokens for a specific user
   * @param userId User ID to retrieve tokens for
   * @returns Array of token information
   */
  async getAllUserTokens(userId: string): Promise<TokenInfo[]> {
    return Array.from(this.tokens.entries())
      .filter(([_, data]) => data.userId === userId)
      .map(([tokenId, data]) => ({
        tokenId,
        ...data,
      }));
  }

  /**
   * Remove all tokens for a specific user
   * @param userId User ID whose tokens should be removed
   */
  async removeAllUserTokens(userId: string): Promise<void> {
    for (const [tokenId, data] of this.tokens.entries()) {
      if (data.userId === userId) {
        this.tokens.delete(tokenId);
      }
    }
  }

  /**
   * Clear expired tokens
   */
  async clearExpiredTokens(): Promise<void> {
    const now = Date.now();
    for (const [tokenId, data] of this.tokens.entries()) {
      const expiryTime = data.createdAt.getTime() + data.expiresIn * 1000;
      if (expiryTime < now) {
        this.tokens.delete(tokenId);
      }
    }
  }
}
