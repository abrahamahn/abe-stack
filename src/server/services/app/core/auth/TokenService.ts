import crypto from "crypto";

import jwt from "jsonwebtoken";
import NodeCache from "node-cache";

import { TokenRepository } from "@repositories/auth";
import { BaseService, UnauthorizedError } from "@services/shared";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  tokenId?: string;
  deviceInfo?: {
    ip: string;
    userAgent: string;
  };
}

interface TokenMetadata {
  issuedAt: number;
  expiresAt: number;
  deviceInfo?: {
    ip: string;
    userAgent: string;
  };
}

/**
 * Service for handling JWT token operations with enhanced security
 */
export class TokenService extends BaseService {
  private readonly tokenBlacklist: NodeCache;
  private readonly TOKEN_SECRET: string;
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_EXPIRY = "7d";
  private readonly TEMP_TOKEN_EXPIRY = "5m";
  private readonly ROTATION_WINDOW = 60 * 5; // 5 minutes in seconds

  constructor(
    private readonly tokenRepository: TokenRepository,
    tokenSecret?: string,
    refreshTokenSecret?: string,
  ) {
    super("TokenService");
    this.TOKEN_SECRET =
      tokenSecret || process.env.JWT_SECRET || this.generateSecret();
    this.REFRESH_TOKEN_SECRET =
      refreshTokenSecret ||
      process.env.JWT_REFRESH_SECRET ||
      this.generateSecret();
    this.tokenBlacklist = new NodeCache({ stdTTL: 24 * 60 * 60 }); // 24 hours TTL
  }

  /**
   * Generate a new access token
   */
  public generateToken(payload: Omit<TokenPayload, "tokenId">): string {
    const tokenId = crypto.randomUUID();
    const token = jwt.sign({ ...payload, tokenId }, this.TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      algorithm: "HS512",
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER,
      jwtid: tokenId,
    });

    // Store token metadata
    this.storeTokenMetadata(tokenId, {
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.parseExpiry(this.ACCESS_TOKEN_EXPIRY),
      deviceInfo: payload.deviceInfo,
    });

    return token;
  }

  /**
   * Generate a new refresh token
   */
  public generateRefreshToken(payload: Omit<TokenPayload, "tokenId">): string {
    const tokenId = crypto.randomUUID();
    const token = jwt.sign({ ...payload, tokenId }, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      algorithm: "HS512",
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER,
      jwtid: tokenId,
    });

    // Store refresh token in database
    this.tokenRepository.create({
      id: tokenId,
      userId: payload.userId,
      type: "refresh",
      expiresAt: new Date(
        Date.now() + this.parseExpiry(this.REFRESH_TOKEN_EXPIRY),
      ),
      sessionId: payload.sessionId,
    });

    return token;
  }

  /**
   * Generate a temporary token for MFA verification
   */
  public generateTempToken(userId: string): string {
    const tokenId = crypto.randomUUID();
    return jwt.sign({ userId, tokenId, type: "temp" }, this.TOKEN_SECRET, {
      expiresIn: this.TEMP_TOKEN_EXPIRY,
      algorithm: "HS512",
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER,
      jwtid: tokenId,
    });
  }

  /**
   * Verify and decode an access token
   */
  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.TOKEN_SECRET, {
        algorithms: ["HS512"],
        audience: process.env.JWT_AUDIENCE,
        issuer: process.env.JWT_ISSUER,
      }) as TokenPayload;

      // Check if token is blacklisted
      if (this.isTokenBlacklisted(decoded.tokenId!)) {
        throw new UnauthorizedError("Token has been revoked");
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token has expired");
      }
      throw new UnauthorizedError("Invalid token");
    }
  }

  /**
   * Verify and decode a refresh token
   */
  public async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        algorithms: ["HS512"],
        audience: process.env.JWT_AUDIENCE,
        issuer: process.env.JWT_ISSUER,
      }) as TokenPayload;

      // Check if refresh token exists and is valid
      const storedToken = await this.tokenRepository.findById(decoded.tokenId!);
      if (
        !storedToken ||
        storedToken.isRevoked() ||
        storedToken.expiresAt < new Date()
      ) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Refresh token has expired");
      }
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  /**
   * Verify a temporary token
   */
  public verifyTempToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.TOKEN_SECRET, {
        algorithms: ["HS512"],
        audience: process.env.JWT_AUDIENCE,
        issuer: process.env.JWT_ISSUER,
      }) as { userId: string; type: string };

      if (decoded.type !== "temp") {
        throw new UnauthorizedError("Invalid token type");
      }

      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Temporary token has expired");
      }
      throw new UnauthorizedError("Invalid temporary token");
    }
  }

  /**
   * Rotate refresh token
   */
  public async rotateRefreshToken(
    oldToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(oldToken);

    // Check if token is within rotation window
    const storedToken = await this.tokenRepository.findById(decoded.tokenId!);
    const now = Date.now();
    const tokenAge = now - storedToken!.createdAt.getTime();

    if (tokenAge < this.ROTATION_WINDOW * 1000) {
      throw new UnauthorizedError("Token rotation not allowed yet");
    }

    // Revoke old refresh token
    await this.revokeRefreshToken(decoded.tokenId!);

    // Generate new tokens
    const newToken = this.generateToken(decoded);
    const newRefreshToken = this.generateRefreshToken(decoded);

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a refresh token
   */
  public async revokeRefreshToken(tokenId: string): Promise<boolean> {
    const token = await this.tokenRepository.findById(tokenId);
    if (!token) {
      return false;
    }

    await this.tokenRepository.update(tokenId, { isRevoked: true });
    return true;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  public async revokeAllUserTokens(userId: string): Promise<boolean> {
    await this.tokenRepository.revokeAllUserTokens(userId);
    return true;
  }

  /**
   * Blacklist an access token
   */
  public blacklistToken(tokenId: string): void {
    this.tokenBlacklist.set(tokenId, true);
  }

  /**
   * Check if a token is blacklisted
   */
  private isTokenBlacklisted(tokenId: string): boolean {
    return this.tokenBlacklist.has(tokenId);
  }

  /**
   * Store token metadata
   */
  private storeTokenMetadata(tokenId: string, metadata: TokenMetadata): void {
    this.tokenBlacklist.set(`metadata:${tokenId}`, metadata);
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
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
        return value;
    }
  }

  /**
   * Generate a secure random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(64).toString("hex");
  }
}
