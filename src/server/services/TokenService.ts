import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';
import { Logger } from './LoggerService';
import { UnauthorizedError } from '../../shared/errors/ApiError';
import { TokenBlacklistService } from './TokenBlacklistService';
import { env } from '../config/environment';

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

export class TokenService {
  private static instance: TokenService;
  private logger: Logger;
  private blacklistService: TokenBlacklistService;
  
  // Token configuration
  private readonly ACCESS_TOKEN_SECRET = env.ACCESS_TOKEN_SECRET || 'access-token-secret';
  private readonly REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET || 'refresh-token-secret';
  private readonly ACCESS_TOKEN_EXPIRY = parseInt(env.ACCESS_TOKEN_EXPIRY || '15') * 60; // 15 minutes in seconds
  private readonly REFRESH_TOKEN_EXPIRY = parseInt(env.REFRESH_TOKEN_EXPIRY || '7') * 24 * 60 * 60; // 7 days in seconds

  private constructor() {
    this.logger = new Logger('TokenService');
    this.blacklistService = TokenBlacklistService.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Generate tokens for a user
   * @param user User to generate tokens for
   * @returns Access token, refresh token, and expiry
   */
  public async generateTokens(user: User): Promise<TokenResponse> {
    try {
      // Generate access token
      const accessToken = this.generateAccessToken(user);
      
      // Generate refresh token
      const refreshToken = this.generateRefreshToken(user);
      
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
   * @param user User to generate token for
   * @returns JWT access token
   */
  private generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      id: uuidv4(),
      userId: user.id,
      type: TokenType.ACCESS,
      role: user.role
    };
    
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });
  }

  /**
   * Generate a refresh token
   * @param user User to generate token for
   * @returns JWT refresh token
   */
  private generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      id: uuidv4(),
      userId: user.id,
      type: TokenType.REFRESH
    };
    
    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });
  }

  /**
   * Verify an access token
   * @param token JWT access token
   * @returns Decoded token payload
   */
  public async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.blacklistService.isBlacklisted(token);
      if (isBlacklisted) {
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
  public async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.blacklistService.isBlacklisted(token);
      if (isBlacklisted) {
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
   * Refresh tokens using a refresh token
   * @param refreshToken JWT refresh token
   * @returns New access token, refresh token, and expiry
   */
  public async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify the refresh token
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // Get the user
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      // Blacklist the old refresh token
      await this.blacklistService.blacklistToken(refreshToken, this.REFRESH_TOKEN_EXPIRY);
      
      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      
      this.logger.error('Failed to refresh tokens', { error });
      throw new UnauthorizedError('Failed to refresh authentication');
    }
  }

  /**
   * Revoke a token (blacklist it)
   * @param token JWT token to revoke
   * @param type Token type
   */
  public async revokeToken(token: string, type: TokenType): Promise<void> {
    try {
      // Determine expiry based on token type
      const expiry = type === TokenType.ACCESS 
        ? this.ACCESS_TOKEN_EXPIRY 
        : this.REFRESH_TOKEN_EXPIRY;
      
      // Add to blacklist
      await this.blacklistService.blacklistToken(token, expiry);
    } catch (error) {
      this.logger.error('Failed to revoke token', { error });
      throw new Error('Failed to revoke token');
    }
  }
} 