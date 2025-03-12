import { Logger } from './LoggerService';

/**
 * Service for managing blacklisted JWT tokens
 * Uses in-memory storage to store revoked tokens with expiration
 */
export class TokenBlacklistService {
  private static instance: TokenBlacklistService;
  private blacklistedTokens: Map<string, number>; // token hash -> expiry timestamp
  private logger: Logger;
  private readonly PREFIX = 'blacklist:token:';

  private constructor() {
    this.blacklistedTokens = new Map();
    this.logger = new Logger('TokenBlacklistService');
    
    // Start a cleanup interval to remove expired tokens
    setInterval(() => this.cleanupExpiredTokens(), 60000); // Clean up every minute
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenBlacklistService {
    if (!TokenBlacklistService.instance) {
      TokenBlacklistService.instance = new TokenBlacklistService();
    }
    return TokenBlacklistService.instance;
  }

  /**
   * Add a token to the blacklist
   * @param token The JWT token to blacklist
   * @param expirySeconds Time in seconds until the token expires
   */
  public async blacklistToken(token: string, expirySeconds: number): Promise<void> {
    try {
      const key = this.getKey(token);
      const expiryTime = Date.now() + (expirySeconds * 1000);
      this.blacklistedTokens.set(key, expiryTime);
      this.logger.debug('Token blacklisted', { expirySeconds });
    } catch (error) {
      this.logger.error('Failed to blacklist token', { error });
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token The JWT token to check
   * @returns True if the token is blacklisted, false otherwise
   */
  public async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = this.getKey(token);
      const expiryTime = this.blacklistedTokens.get(key);
      
      // If token is not in the map or has expired, it's not blacklisted
      if (!expiryTime || expiryTime < Date.now()) {
        if (expiryTime) {
          // Token has expired, remove it from the map
          this.blacklistedTokens.delete(key);
        }
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to check token blacklist status', { error });
      // Default to treating the token as blacklisted in case of errors
      return true;
    }
  }

  /**
   * Remove a token from the blacklist (rarely needed)
   * @param token The JWT token to remove from the blacklist
   */
  public async removeFromBlacklist(token: string): Promise<void> {
    try {
      const key = this.getKey(token);
      this.blacklistedTokens.delete(key);
      this.logger.debug('Token removed from blacklist');
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist', { error });
      throw new Error('Failed to remove token from blacklist');
    }
  }

  /**
   * Get the key for a token
   * @param token The JWT token
   * @returns The key
   */
  private getKey(token: string): string {
    // Use a hash of the token as the key to avoid storing the actual token
    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    return `${this.PREFIX}${hash}`;
  }

  /**
   * Clean up expired tokens from the map
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, expiryTime] of this.blacklistedTokens.entries()) {
      if (expiryTime < now) {
        this.blacklistedTokens.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired tokens`);
    }
  }

  /**
   * Close the service (no-op for in-memory implementation)
   */
  public async close(): Promise<void> {
    // Nothing to close in the in-memory implementation
  }
} 