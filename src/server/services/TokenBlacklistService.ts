import { Redis } from 'ioredis';
import { Logger } from './LoggerService';
import { env } from '../config/environment';

/**
 * Service for managing blacklisted JWT tokens
 * Uses Redis to store revoked tokens with expiration
 */
export class TokenBlacklistService {
  private static instance: TokenBlacklistService;
  private redis: Redis;
  private logger: Logger;
  private readonly PREFIX = 'blacklist:token:';

  private constructor() {
    this.redis = new Redis({
      host: env.REDIS_HOST || 'localhost',
      port: env.REDIS_PORT || 6379,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB_BLACKLIST || 1,
    });
    
    this.logger = new Logger('TokenBlacklistService');
    
    // Handle Redis connection events
    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', { error: err.message });
    });
    
    this.redis.on('connect', () => {
      this.logger.info('Connected to Redis');
    });
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
      await this.redis.set(key, '1', 'EX', expirySeconds);
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
      const result = await this.redis.exists(key);
      return result === 1;
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
      await this.redis.del(key);
      this.logger.debug('Token removed from blacklist');
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist', { error });
      throw new Error('Failed to remove token from blacklist');
    }
  }

  /**
   * Get the Redis key for a token
   * @param token The JWT token
   * @returns The Redis key
   */
  private getKey(token: string): string {
    // Use a hash of the token as the key to avoid storing the actual token
    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    return `${this.PREFIX}${hash}`;
  }

  /**
   * Close the Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
} 