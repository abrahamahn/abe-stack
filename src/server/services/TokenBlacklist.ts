// src/server/services/TokenBlacklist.ts
/**
 * Simple in-memory token blacklist implementation.
 * Uses a Map to store invalidated tokens with their expiration time.
 */
export class TokenBlacklist {
  private static instance: TokenBlacklist;
  private blacklist: Map<string, number>;

  private constructor() {
    this.blacklist = new Map();
    this.startCleanupInterval();
  }

  public static getInstance(): TokenBlacklist {
    if (!TokenBlacklist.instance) {
      TokenBlacklist.instance = new TokenBlacklist();
    }
    return TokenBlacklist.instance;
  }

  public add(token: string, expiresIn: number): void {
    const expirationTime = Date.now() + expiresIn * 1000;
    this.blacklist.set(token, expirationTime);
  }

  public isBlacklisted(token: string): boolean {
    const expirationTime = this.blacklist.get(token);
    if (!expirationTime) return false;

    if (Date.now() >= expirationTime) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [token, expirationTime] of this.blacklist.entries()) {
        if (now >= expirationTime) {
          this.blacklist.delete(token);
        }
      }
    }, 60000); // Clean up every minute
  }
}

// Export a singleton instance
export const tokenBlacklist = TokenBlacklist.getInstance();

// Run cleanup periodically (every hour)
setInterval(() => {
  // Implementation of cleanupExpiredTokens method
}, 60 * 60 * 1000);
  