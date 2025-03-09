// src/server/services/TokenBlacklist.ts
/**
 * Service for managing blacklisted tokens
 * In a production environment, this should use Redis or another persistent store
 */
export class TokenBlacklist {
  private blacklistedTokens: Set<string>;
  
  constructor() {
    this.blacklistedTokens = new Set();
  }
  
  /**
   * Add a token to the blacklist
   * @param token The token to blacklist
   */
  addToken(token: string): void {
    this.blacklistedTokens.add(token);
  }
  
  /**
   * Check if a token is blacklisted
   * @param token The token to check
   * @returns True if the token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }
  
  /**
   * Remove a token from the blacklist
   * @param token The token to remove from the blacklist
   */
  removeToken(token: string): void {
    this.blacklistedTokens.delete(token);
  }
  
  /**
   * Clear the entire blacklist
   */
  clearBlacklist(): void {
    this.blacklistedTokens.clear();
  }
}

// Export a singleton instance
export const tokenBlacklist = new TokenBlacklist();

// Run cleanup periodically (every hour)
setInterval(() => {
  // Implementation of cleanupExpiredTokens method
}, 60 * 60 * 1000);
  