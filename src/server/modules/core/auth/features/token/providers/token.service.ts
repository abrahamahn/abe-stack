import { Response } from "express";
import { injectable, inject } from "inversify";
import * as jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Token payload interface
 */
export interface TokenPayload {
  sub: string; // Subject (user ID)
  email?: string;
  roles?: string[];
  sessionId?: string;
  type: "access" | "refresh" | "temp";
  iat?: number; // Issued at
  exp?: number; // Expiration time
  jti?: string; // JWT ID
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Unified Token Service
 * Handles all token operations including access, refresh, and temporary tokens
 */
@injectable()
export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly tempTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly tempTokenExpiry: string;

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.TokenRepository) private tokenRepository: any,
    @inject(TYPES.ConfigService) private configService: any
  ) {
    // Get token secrets and expiry times from config
    this.accessTokenSecret = this.configService.get(
      "JWT_ACCESS_SECRET",
      "access_secret_key_change_me_in_production"
    );
    this.refreshTokenSecret = this.configService.get(
      "JWT_REFRESH_SECRET",
      "refresh_secret_key_change_me_in_production"
    );
    this.tempTokenSecret = this.configService.get(
      "JWT_TEMP_SECRET",
      "temp_secret_key_change_me_in_production"
    );
    this.accessTokenExpiry = this.configService.get("JWT_ACCESS_EXPIRY", "15m");
    this.refreshTokenExpiry = this.configService.get(
      "JWT_REFRESH_EXPIRY",
      "7d"
    );
    this.tempTokenExpiry = this.configService.get("JWT_TEMP_EXPIRY", "10m");
  }

  /**
   * Create an access token for a user
   */
  async createAccessToken(user: any): Promise<string> {
    try {
      const payload: TokenPayload = {
        sub: user.id,
        email: user.email,
        roles: user.roles || [],
        type: "access",
        jti: uuidv4(),
      };

      const options: SignOptions = {
        expiresIn: this.accessTokenExpiry,
        issuer: "abe-stack-api",
        audience: "abe-stack-client",
      };

      const token = jwt.sign(payload, this.accessTokenSecret, options);

      this.logger.debug("Access token created", {
        userId: user.id,
        expiresIn: this.accessTokenExpiry,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to create access token", {
        error,
        userId: user.id,
      });
      throw new Error("Failed to create access token");
    }
  }

  /**
   * Create a refresh token for a user
   */
  async createRefreshToken(user: any): Promise<string> {
    try {
      const payload: TokenPayload = {
        sub: user.id,
        email: user.email,
        type: "refresh",
        jti: uuidv4(),
      };

      const options: SignOptions = {
        expiresIn: this.refreshTokenExpiry,
        issuer: "abe-stack-api",
        audience: "abe-stack-client",
      };

      const token = jwt.sign(payload, this.refreshTokenSecret, options);

      // Store refresh token in database for revocation tracking
      try {
        await this.tokenRepository.create({
          userId: user.id,
          token,
          type: "refresh",
          expiresAt: new Date(
            Date.now() + this.getMilliseconds(this.refreshTokenExpiry)
          ),
          isRevoked: false,
          createdAt: new Date(),
        });
      } catch (dbError) {
        this.logger.warn("Failed to store refresh token in database", {
          dbError,
        });
        // Continue anyway - token is still valid even if not stored
      }

      this.logger.debug("Refresh token created", {
        userId: user.id,
        expiresIn: this.refreshTokenExpiry,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to create refresh token", {
        error,
        userId: user.id,
      });
      throw new Error("Failed to create refresh token");
    }
  }

  /**
   * Generate a temporary token for MFA, email verification, etc.
   */
  async generateTempToken(
    userId: string,
    purpose: string = "verification"
  ): Promise<string> {
    try {
      const payload: TokenPayload = {
        sub: userId,
        type: "temp",
        jti: uuidv4(),
      };

      const options: SignOptions = {
        expiresIn: this.tempTokenExpiry,
        issuer: "abe-stack-api",
        audience: "abe-stack-client",
      };

      const token = jwt.sign(payload, this.tempTokenSecret, options);

      // Store temp token in database for validation and revocation
      try {
        await this.tokenRepository.create({
          userId,
          token,
          type: purpose,
          expiresAt: new Date(
            Date.now() + this.getMilliseconds(this.tempTokenExpiry)
          ),
          isRevoked: false,
          createdAt: new Date(),
        });
      } catch (dbError) {
        this.logger.warn("Failed to store temp token in database", { dbError });
        // Continue anyway - token is still valid even if not stored
      }

      this.logger.debug("Temporary token created", {
        userId,
        purpose,
        expiresIn: this.tempTokenExpiry,
      });

      return token;
    } catch (error) {
      this.logger.error("Failed to generate temporary token", {
        error,
        userId,
        purpose,
      });
      throw new Error("Failed to generate temporary token");
    }
  }

  /**
   * Verify any token (access, refresh, or temp)
   */
  async verifyToken(
    token: string,
    type?: "access" | "refresh" | "temp"
  ): Promise<TokenValidationResult> {
    try {
      let secret: string;
      let decoded: any;

      // Try to decode without verification first to get the type
      if (!type) {
        try {
          const unverified = jwt.decode(token) as TokenPayload;
          const tokenType = unverified?.type;
          if (
            tokenType === "access" ||
            tokenType === "refresh" ||
            tokenType === "temp"
          ) {
            type = tokenType;
          } else {
            type = "access"; // Default fallback
          }
        } catch {
          type = "access"; // Default fallback
        }
      }

      // Select appropriate secret based on token type
      switch (type) {
        case "access":
          secret = this.accessTokenSecret;
          break;
        case "refresh":
          secret = this.refreshTokenSecret;
          break;
        case "temp":
          secret = this.tempTokenSecret;
          break;
        default:
          return { valid: false, error: "Unknown token type" };
      }

      // Verify token
      decoded = jwt.verify(token, secret) as TokenPayload;

      // Additional validation for refresh and temp tokens
      if (type === "refresh" || type === "temp") {
        try {
          const tokenRecord = await this.tokenRepository.findByToken(token);
          if (
            !tokenRecord ||
            tokenRecord.isRevoked ||
            tokenRecord.expiresAt < new Date()
          ) {
            return { valid: false, error: "Token has been revoked or expired" };
          }
        } catch (dbError) {
          this.logger.warn("Failed to check token in database", { dbError });
          // Continue with JWT validation only
        }
      }

      return { valid: true, payload: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: "Token has expired" };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: "Invalid token" };
      } else {
        this.logger.error("Token verification error", { error });
        return { valid: false, error: "Token verification failed" };
      }
    }
  }

  /**
   * Verify specifically a refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    const result = await this.verifyToken(token, "refresh");
    return result.valid ? result.payload || null : null;
  }

  /**
   * Verify specifically a temporary token
   */
  async verifyTempToken(
    token: string,
    purpose: string = "verification"
  ): Promise<{ valid: boolean; userId?: string }> {
    const result = await this.verifyToken(token, "temp");

    if (!result.valid || !result.payload) {
      return { valid: false };
    }

    return { valid: true, userId: result.payload.sub };
  }

  /**
   * Revoke a token (mark as revoked in database)
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const tokenRecord = await this.tokenRepository.findByToken(token);
      if (!tokenRecord) {
        return false;
      }

      await this.tokenRepository.update(tokenRecord.id, {
        isRevoked: true,
      });

      this.logger.debug("Token revoked", { tokenId: tokenRecord.id });
      return true;
    } catch (error) {
      this.logger.error("Failed to revoke token", { error });
      return false;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const result = await this.tokenRepository.revokeAllUserTokens(userId);
      this.logger.debug("All user tokens revoked", { userId, count: result });
      return result;
    } catch (error) {
      this.logger.error("Failed to revoke all user tokens", { error, userId });
      return 0;
    }
  }

  /**
   * Refresh tokens - generate new access and refresh tokens
   */
  async refreshTokens(
    refreshToken: string
  ): Promise<TokenRefreshResult | null> {
    try {
      const tokenData = await this.verifyRefreshToken(refreshToken);

      if (!tokenData) {
        return null;
      }

      // Revoke the old refresh token
      await this.revokeToken(refreshToken);

      // Create new tokens
      const user = { id: tokenData.sub, email: tokenData.email };
      const newAccessToken = await this.createAccessToken(user);
      const newRefreshToken = await this.createRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
      };
    } catch (error) {
      this.logger.error("Failed to refresh tokens", { error });
      return null;
    }
  }

  /**
   * Set authentication cookies on response object
   */
  setCookies(
    res: Response,
    userId: string,
    sessionId: string,
    remember: boolean = false
  ): void {
    try {
      // Create signed session identifier
      const sessionToken = jwt.sign(
        { userId, sessionId },
        this.configService.get(
          "COOKIE_SECRET",
          "default-cookie-secret-change-me"
        ),
        { expiresIn: remember ? "30d" : "24h" }
      );

      // Set secure, HttpOnly session cookie
      res.cookie("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        path: "/",
      });

      // Set CSRF protection token
      const csrfToken = this.generateCsrfToken();
      res.cookie("csrf", csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        path: "/",
      });

      this.logger.debug("Authentication cookies set", { userId, remember });
    } catch (error) {
      this.logger.error("Failed to set auth cookies", { error });
      throw new Error("Failed to set authentication cookies");
    }
  }

  /**
   * Clear authentication cookies
   */
  clearCookies(res: Response): void {
    res.clearCookie("session", { path: "/" });
    res.clearCookie("csrf", { path: "/" });
    this.logger.debug("Authentication cookies cleared");
  }

  /**
   * Generate a CSRF token
   */
  private generateCsrfToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Convert expiry string to milliseconds
   */
  private getMilliseconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000; // Default 15 minutes
    }
  }

  /**
   * Convert expiry string to seconds
   */
  private getExpirySeconds(expiry: string): number {
    return Math.floor(this.getMilliseconds(expiry) / 1000);
  }
}
