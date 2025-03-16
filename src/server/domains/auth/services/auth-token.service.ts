import crypto, { createHash } from 'crypto';

import jwt from 'jsonwebtoken';

import { env } from '../../../config/environment';
import { Logger } from '../../../services/LoggerService';
import { UnauthorizedError } from '../errors/unauthorized.error';

// Token types
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh'
}

// Token payload interface
export interface TokenPayload {
  id: string;
  userId: string;
  type: TokenType;
  role?: string;
  iat?: number;
  exp?: number;
}

// Token response interface
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// User attributes interface
export interface UserAttributes {
  id: string;
  email: string;
  role?: string;
}

/**
 * Consolidated service for handling JWT token generation, verification, and blacklisting
 */
export class AuthTokenService {
  private static instance: AuthTokenService;
  private logger: Logger;
  private blacklistedTokens: Map<string, number>; // token hash -> expiry timestamp
  private readonly PREFIX = 'blacklist:token:';
  private cleanupInterval: NodeJS.Timeout;
  
  // Token configuration
  private readonly ACCESS_TOKEN_SECRET: string;
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY: number;
  private readonly REFRESH_TOKEN_EXPIRY: number;

  private constructor() {
    this.logger = new Logger('AuthTokenService');
    this.blacklistedTokens = new Map();
    
    // Initialize token configuration
    this.ACCESS_TOKEN_SECRET = env.ACCESS_TOKEN_SECRET || env.JWT_SECRET || 'access-token-secret';
    this.REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET || env.JWT_REFRESH_SECRET || 'refresh-token-secret';
    this.ACCESS_TOKEN_EXPIRY = parseInt(env.ACCESS_TOKEN_EXPIRY || '15') * 60; // 15 minutes in seconds
    this.REFRESH_TOKEN_EXPIRY = parseInt(env.REFRESH_TOKEN_EXPIRY || '7') * 24 * 60 * 60; // 7 days in seconds
    
    // Start cleanup interval for blacklisted tokens
    this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), 60000); // Clean up every minute
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AuthTokenService {
    if (!AuthTokenService.instance) {
      AuthTokenService.instance = new AuthTokenService();
    }
    return AuthTokenService.instance;
  }

  /**
   * Generate tokens for a user
   * @param user User to generate tokens for
   * @returns Access token, refresh token, and expiry
   */
  public generateTokens(user: UserAttributes): TokenResponse {
    try {
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);
      
      return {
        accessToken,
        refreshToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRY
      };
    } catch (error) {
      this.logger.error('Failed to generate tokens', { error });
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Generate an access token
   * @param userId User ID to include in the token
   * @returns JWT access token
   */
  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { 
        userId, 
        type: TokenType.ACCESS,
        id: crypto.randomUUID()
      }, 
      this.ACCESS_TOKEN_SECRET, 
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate a refresh token
   * @param userId User ID to include in the token
   * @returns JWT refresh token
   */
  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { 
        userId, 
        type: TokenType.REFRESH,
        id: crypto.randomUUID()
      }, 
      this.REFRESH_TOKEN_SECRET, 
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );
  }

  /**
   * Verify an access token
   * @param token JWT access token
   * @returns Decoded token payload
   */
  public verifyAccessToken(token: string): TokenPayload {
    try {
      // Check if token is blacklisted
      if (this.isBlacklisted(token)) {
        throw new UnauthorizedError('Token has been revoked');
      }
      
      // Verify token
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
      
      // Ensure it's an access token
      if (decoded.type !== TokenType.ACCESS) {
        throw new UnauthorizedError('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      
      this.logger.error('Failed to verify access token', { error });
      throw new UnauthorizedError('Authentication failed');
    }
  }

  /**
   * Verify a refresh token
   * @param token JWT refresh token
   * @returns Decoded token payload
   */
  public verifyRefreshToken(token: string): TokenPayload {
    try {
      // Check if token is blacklisted
      if (this.isBlacklisted(token)) {
        throw new UnauthorizedError('Token has been revoked');
      }
      
      // Verify token
      const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET) as TokenPayload;
      
      // Ensure it's a refresh token
      if (decoded.type !== TokenType.REFRESH) {
        throw new UnauthorizedError('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      
      this.logger.error('Failed to verify refresh token', { error });
      throw new UnauthorizedError('Authentication failed');
    }
  }

  /**
   * Decode a token without verification
   * @param token JWT token
   * @returns Decoded token payload or null if invalid
   */
  public decodeToken(token: string): TokenPayload | null {
    return jwt.decode(token) as TokenPayload | null;
  }

  /**
   * Revoke a token by adding it to the blacklist
   * @param token The JWT token to blacklist
   * @param type The type of token (access or refresh)
   */
  public blacklistToken(token: string, type: TokenType): void {
    try {
      const expirySeconds = type === TokenType.ACCESS ? this.ACCESS_TOKEN_EXPIRY : this.REFRESH_TOKEN_EXPIRY;
      const key = this.getBlacklistKey(token);
      const expiryTime = Date.now() + (expirySeconds * 1000);
      
      this.blacklistedTokens.set(key, expiryTime);
      this.logger.debug('Token blacklisted', { type, expirySeconds });
    } catch (error) {
      this.logger.error('Failed to blacklist token', { error });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token The JWT token to check
   * @returns True if the token is blacklisted, false otherwise
   */
  private isBlacklisted(token: string): boolean {
    try {
      const key = this.getBlacklistKey(token);
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
  public removeFromBlacklist(token: string): void {
    try {
      const key = this.getBlacklistKey(token);
      this.blacklistedTokens.delete(key);
      this.logger.debug('Token removed from blacklist');
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist', { error });
      throw new Error('Failed to remove token from blacklist');
    }
  }

  /**
   * Get the blacklist key for a token
   * @param token The JWT token
   * @returns The key
   */
  private getBlacklistKey(token: string): string {
    // Use a hash of the token as the key to avoid storing the actual token
    const hash = createHash('sha256').update(token).digest('hex');
    return `${this.PREFIX}${hash}`;
  }

  /**
   * Clean up expired tokens from the blacklist
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
   * Close the service (cleanup)
   */
  public close(): void {
    clearInterval(this.cleanupInterval);
    this.blacklistedTokens.clear();
  }
} 