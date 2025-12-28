/**
 * Token Management Service
 *
 * This service handles token operations with proper error handling and logging.
 * It combines token storage and blacklist functionality.
 */

import { inject, injectable } from "inversify";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import type { IConfigService } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";
import {
  AppError,
  ServiceError,
  TechnicalError,
} from "@/server/infrastructure/errors";
import type { ILoggerService } from "@/server/infrastructure/logging";

import type {
  TokenBlacklist,
  TokenMetadata,
} from "./TokenBlacklistService";
import type { TokenData, TokenStorage } from "./TokenStorageService";

/**
 * Token payload structure
 */
export interface TokenPayload {
  /** Unique user identifier */
  userId: string;
  /** User roles */
  roles?: string[];
  /** Session identifier */
  sessionId?: string;
  /** Token purpose (e.g., 'access', 'refresh', 'passwordReset') */
  purpose?: string;
  /** Additional payload data */
  metadata?: Record<string, any>;
  /** Standard JWT claims */
  iat?: number; // Issued at
  exp?: number; // Expiration time
  sub?: string; // Subject (typically userId)
  iss?: string; // Issuer
  aud?: string; // Audience
  jti?: string; // JWT ID
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Error message if token is invalid */
  error?: string;
  /** Token payload if token is valid */
  payload?: TokenPayload;
  /** Token metadata if available */
  metadata?: TokenMetadata;
}

/**
 * Token generation options
 */
export interface TokenOptions {
  /** Access token expiration time (e.g., '15m', '1h') */
  accessTokenExpiresIn?: string | number;
  /** Refresh token expiration time (e.g., '7d', '30d') */
  refreshTokenExpiresIn?: string | number;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string;
  /** Custom token ID */
  jti?: string;
  /** Other options to pass to the JWT sign function */
  [key: string]: any;
}

/**
 * Default token options
 */
export const DEFAULT_TOKEN_OPTIONS: TokenOptions = {
  accessTokenExpiresIn: "15m", // 15 minutes
  refreshTokenExpiresIn: "7d", // 7 days
  issuer: "api",
  audience: "webapp",
};

/**
 * Token management service
 * Uses dependency injection for proper error handling and logging
 */
@injectable()
export class TokenManager {
  constructor(
    @inject(TYPES.TokenStorage) private tokenStorage: TokenStorage,
    @inject(TYPES.TokenBlacklist) private tokenBlacklist: TokenBlacklist,
    @inject(TYPES.SecurityLogger) private logger: ILoggerService,
    @inject(TYPES.ConfigService) private configService: IConfigService
  ) {}

  /**
   * Get the secret key for signing tokens
   * @returns Buffer containing the signing key
   * @throws {TechnicalError} if signing key is not configured
   */
  private getSigningKey(): Buffer {
    try {
      // Try to get signing key from configuration
      const signingKey = this.configService.get(
        "security.signatureSecret"
      ) as string;

      if (!signingKey) {
        throw new TechnicalError(
          "Token signing key not configured",
          "TOKEN_SIGNING_KEY_MISSING",
          { component: "TokenManager" } as any
        );
      }

      return Buffer.from(signingKey);
    } catch (error) {
      this.logger.error("Failed to get signing key", { error });
      throw new TechnicalError(
        "Failed to get token signing key",
        "TOKEN_SIGNING_KEY_ERROR",
        { component: "TokenManager", cause: error } as any
      );
    }
  }

  /**
   * Issue a new access token
   * @param payload Token payload
   * @param options Token options
   * @returns Generated JWT token
   */
  public async issueAccessToken(
    payload: TokenPayload,
    options: TokenOptions = {}
  ): Promise<string> {
    try {
      // Merge options with defaults
      const tokenOptions = { ...DEFAULT_TOKEN_OPTIONS, ...options };

      // Generate token ID
      const tokenId = options.jti || uuidv4();

      // Prepare the final payload
      const finalPayload: TokenPayload = {
        ...payload,
        purpose: "access",
        jti: tokenId,
        iss: tokenOptions.issuer,
        aud: tokenOptions.audience,
        sub: payload.userId,
      };

      // Sign the token with appropriate options
      const token = jwt.sign(finalPayload, this.getSigningKey(), {
        expiresIn:
          tokenOptions.accessTokenExpiresIn as jwt.SignOptions["expiresIn"],
      });

      // Store token data
      const expiresIn =
        typeof tokenOptions.accessTokenExpiresIn === "string"
          ? this.parseExpiresIn(tokenOptions.accessTokenExpiresIn)
          : Number(tokenOptions.accessTokenExpiresIn) || 900; // Default 15 minutes in seconds

      const tokenData: TokenData = {
        userId: payload.userId,
        createdAt: new Date(),
        expiresIn,
        metadata: {
          type: "access",
          purpose: payload.purpose,
          roles: payload.roles,
          ...payload.metadata,
        },
      };

      await this.tokenStorage.storeToken(tokenId, tokenData);

      this.logger.debug("Access token issued", {
        userId: payload.userId,
        tokenId,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to issue access token", {
        userId: payload.userId,
        error,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to issue access token",
        "TOKEN_GENERATION_ERROR",
        500,
        { cause: error }
      );
    }
  }

  /**
   * Issue a new refresh token
   * @param payload Token payload
   * @param options Token options
   * @returns Generated JWT token
   */
  public async issueRefreshToken(
    payload: TokenPayload,
    options: TokenOptions = {}
  ): Promise<string> {
    try {
      // Merge options with defaults
      const tokenOptions = { ...DEFAULT_TOKEN_OPTIONS, ...options };

      // Generate token ID
      const tokenId = options.jti || uuidv4();

      // Prepare the final payload
      const finalPayload: TokenPayload = {
        ...payload,
        purpose: "refresh",
        jti: tokenId,
        iss: tokenOptions.issuer,
        aud: tokenOptions.audience,
        sub: payload.userId,
      };

      // Sign the token with appropriate options
      const token = jwt.sign(finalPayload, this.getSigningKey(), {
        expiresIn:
          tokenOptions.refreshTokenExpiresIn as jwt.SignOptions["expiresIn"],
      });

      // Store token data
      const expiresIn =
        typeof tokenOptions.refreshTokenExpiresIn === "string"
          ? this.parseExpiresIn(tokenOptions.refreshTokenExpiresIn)
          : Number(tokenOptions.refreshTokenExpiresIn) || 604800; // Default 7 days in seconds

      const tokenData: TokenData = {
        userId: payload.userId,
        createdAt: new Date(),
        expiresIn,
        metadata: {
          type: "refresh",
          purpose: payload.purpose,
          roles: payload.roles,
          ...payload.metadata,
        },
      };

      await this.tokenStorage.storeToken(tokenId, tokenData);

      this.logger.debug("Refresh token issued", {
        userId: payload.userId,
        tokenId,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to issue refresh token", {
        userId: payload.userId,
        error,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to issue refresh token",
        "TOKEN_GENERATION_ERROR",
        500,
        { cause: error }
      );
    }
  }

  /**
   * Verify an access token
   * @param token JWT token to verify
   * @returns Token verification result
   */
  public async verifyAccessToken(
    token: string
  ): Promise<TokenVerificationResult> {
    try {
      // Verify the token signature and expiration
      const decoded = jwt.verify(token, this.getSigningKey()) as TokenPayload;

      // Check if the token has a valid ID
      if (!decoded.jti) {
        return {
          valid: false,
          error: "Invalid token: missing token ID",
        };
      }

      // Check if token is in the blacklist
      const blacklistCheck = await this.tokenBlacklist.check(decoded.jti);
      if (blacklistCheck.isBlacklisted) {
        this.logger.warn("Token is blacklisted", {
          tokenId: decoded.jti,
          userId: decoded.userId,
          reason: blacklistCheck.metadata?.reason,
        });

        return {
          valid: false,
          error: "Token is revoked",
          metadata: blacklistCheck.metadata,
        };
      }

      // Check if the token exists in storage
      const exists = await this.tokenStorage.hasToken(decoded.jti);
      if (!exists) {
        this.logger.warn("Token not found in storage", {
          tokenId: decoded.jti,
          userId: decoded.userId,
        });

        return {
          valid: false,
          error: "Token not found",
        };
      }

      // Get token data for additional validation
      const tokenData = await this.tokenStorage.getTokenData(decoded.jti);

      // Check if token data matches payload
      if (tokenData && tokenData.userId !== decoded.userId) {
        this.logger.warn("Token user ID mismatch", {
          tokenId: decoded.jti,
          payloadUserId: decoded.userId,
          storedUserId: tokenData.userId,
        });

        return {
          valid: false,
          error: "Token user ID mismatch",
        };
      }

      return {
        valid: true,
        payload: decoded,
        metadata: tokenData?.metadata as TokenMetadata,
      };
    } catch (error) {
      // Handle JWT verification errors based on error name instead of instanceof
      if (error instanceof Error) {
        if (error.name === "JsonWebTokenError") {
          return {
            valid: false,
            error: `Invalid token: ${error.message}`,
          };
        }

        if (error.name === "TokenExpiredError") {
          return {
            valid: false,
            error: "Token has expired",
          };
        }
      }

      // Log unexpected errors
      this.logger.error("Token verification error", { error });

      return {
        valid: false,
        error: "Token verification failed",
      };
    }
  }

  /**
   * Verify a refresh token
   * @param token JWT token to verify
   * @returns Token verification result
   */
  public async verifyRefreshToken(
    token: string
  ): Promise<TokenVerificationResult> {
    try {
      // Verify the token signature and expiration
      const decoded = jwt.verify(token, this.getSigningKey()) as TokenPayload;

      // Check if the token has a valid ID
      if (!decoded.jti) {
        return {
          valid: false,
          error: "Invalid token: missing token ID",
        };
      }

      // Check if token is in the blacklist
      const blacklistCheck = await this.tokenBlacklist.check(decoded.jti);
      if (blacklistCheck.isBlacklisted) {
        this.logger.warn("Refresh token is blacklisted", {
          tokenId: decoded.jti,
          userId: decoded.userId,
          reason: blacklistCheck.metadata?.reason,
        });

        return {
          valid: false,
          error: "Token is revoked",
          metadata: blacklistCheck.metadata,
        };
      }

      // Check if the token exists in storage and is a refresh token
      const tokenData = await this.tokenStorage.getTokenData(decoded.jti);
      if (!tokenData) {
        this.logger.warn("Refresh token not found in storage", {
          tokenId: decoded.jti,
          userId: decoded.userId,
        });

        return {
          valid: false,
          error: "Token not found",
        };
      }

      // Check if token type is correct
      if (tokenData.metadata?.type !== "refresh") {
        this.logger.warn("Token is not a refresh token", {
          tokenId: decoded.jti,
          userId: decoded.userId,
          type: tokenData.metadata?.type,
        });

        return {
          valid: false,
          error: "Invalid token type",
        };
      }

      // Check if token data matches payload
      if (tokenData.userId !== decoded.userId) {
        this.logger.warn("Refresh token user ID mismatch", {
          tokenId: decoded.jti,
          payloadUserId: decoded.userId,
          storedUserId: tokenData.userId,
        });

        return {
          valid: false,
          error: "Token user ID mismatch",
        };
      }

      return {
        valid: true,
        payload: decoded,
        metadata: tokenData.metadata as TokenMetadata,
      };
    } catch (error) {
      // Handle JWT verification errors
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: `Invalid token: ${error.message}`,
        };
      }

      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: "Token has expired",
        };
      }

      // Log unexpected errors
      this.logger.error("Refresh token verification error", { error });

      return {
        valid: false,
        error: "Token verification failed",
      };
    }
  }

  /**
   * Revoke a token by adding it to the blacklist
   * @param tokenId Token ID to revoke
   * @param metadata Optional metadata about revocation
   * @returns Whether the revocation was successful
   */
  public async revokeToken(
    tokenId: string,
    metadata?: TokenMetadata
  ): Promise<boolean> {
    try {
      // Get token data from storage
      const tokenData = await this.tokenStorage.getTokenData(tokenId);

      if (!tokenData) {
        this.logger.warn("Attempted to revoke non-existent token", { tokenId });
        return false;
      }

      // Add token to blacklist with metadata
      const blacklistMetadata: TokenMetadata = {
        userId: tokenData.userId,
        reason: metadata?.reason || "Manually revoked",
        addedAt: new Date().toISOString(),
        ...metadata,
      };

      const result = await this.tokenBlacklist.add(tokenId, blacklistMetadata);

      if (result) {
        this.logger.info("Token revoked", {
          tokenId,
          userId: tokenData.userId,
          reason: blacklistMetadata.reason,
        });
      } else {
        this.logger.warn("Failed to revoke token", { tokenId });
      }

      return result;
    } catch (error) {
      this.logger.error("Error revoking token", { tokenId, error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to revoke token",
        "TOKEN_REVOCATION_ERROR",
        500,
        { cause: error }
      );
    }
  }

  /**
   * Revoke all tokens for a user
   * @param userId User ID whose tokens should be revoked
   * @param reason Reason for revocation
   * @returns Number of tokens revoked
   */
  public async revokeAllUserTokens(
    userId: string,
    reason: string = "User session terminated"
  ): Promise<number> {
    try {
      // Get all tokens for the user
      const userTokens = await this.tokenStorage.getAllUserTokens(userId);

      if (userTokens.length === 0) {
        this.logger.debug("No tokens found for user", { userId });
        return 0;
      }

      // Add each token to the blacklist
      let revokedCount = 0;

      for (const token of userTokens) {
        const blacklistMetadata: TokenMetadata = {
          userId,
          reason,
          addedAt: new Date().toISOString(),
        };

        const result = await this.tokenBlacklist.add(
          token.tokenId,
          blacklistMetadata
        );

        if (result) {
          revokedCount++;
        }
      }

      this.logger.info("Revoked all user tokens", {
        userId,
        count: revokedCount,
        reason,
      });

      return revokedCount;
    } catch (error) {
      this.logger.error("Error revoking user tokens", { userId, error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to revoke user tokens",
        "USER_TOKENS_REVOCATION_ERROR",
        500,
        { cause: error }
      );
    }
  }

  /**
   * Refresh an access token using a valid refresh token
   * @param refreshToken Refresh token
   * @param newPayload Optional additional payload for the new access token
   * @param options Optional token generation options
   * @returns New access token or null if refresh failed
   */
  public async refreshAccessToken(
    refreshToken: string,
    newPayload: Partial<TokenPayload> = {},
    options: TokenOptions = {}
  ): Promise<string | null> {
    try {
      // Verify the refresh token
      const verification = await this.verifyRefreshToken(refreshToken);

      if (!verification.valid || !verification.payload) {
        this.logger.warn("Invalid refresh token", {
          error: verification.error,
        });
        return null;
      }

      // Create new payload based on refresh token payload
      const payload: TokenPayload = {
        ...verification.payload,
        ...newPayload,
      };

      // Issue new access token
      const accessToken = await this.issueAccessToken(payload, options);

      this.logger.debug("Access token refreshed", {
        userId: payload.userId,
        refreshTokenId: verification.payload.jti,
      });

      return accessToken;
    } catch (error) {
      this.logger.error("Error refreshing access token", { error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to refresh access token",
        "TOKEN_REFRESH_ERROR",
        500,
        { cause: error }
      );
    }
  }

  /**
   * Check if a token is revoked
   * @param tokenId Token ID to check
   * @returns Whether the token is revoked
   */
  public async isTokenRevoked(tokenId: string): Promise<boolean> {
    try {
      const status = await this.tokenBlacklist.check(tokenId);
      return !!status.isBlacklisted;
    } catch (error) {
      this.logger.error("Error checking token revocation status", {
        tokenId,
        error,
      });

      // Default to considering tokens revoked if blacklist check fails
      // (safer security-wise)
      return true;
    }
  }

  /**
   * Parse a time string like "1h" or "7d" into seconds
   * @param timeString Time string to parse
   * @returns Time in seconds
   */
  private parseExpiresIn(timeString: string): number {
    const value = parseInt(timeString);
    const unit = timeString.slice(String(value).length);

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 24 * 60 * 60;
      default:
        return value;
    }
  }
}
