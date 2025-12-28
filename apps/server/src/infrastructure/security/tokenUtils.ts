/**
 * Token Utilities
 *
 * This file is maintained for compatibility with existing imports.
 * Most functionality has been moved to token.types.ts and other security modules.
 */

import crypto from "crypto";

import { TokenType } from "./tokenTypes";

// Re-export TokenType enum for backward compatibility
export { TokenType };

// Essential token constants
export const DEFAULT_TOKEN_EXPIRATION = {
  [TokenType.ACCESS]: 3600, // 1 hour
  [TokenType.REFRESH]: 2592000, // 30 days
  [TokenType.PASSWORD_RESET]: 3600, // 1 hour
  [TokenType.EMAIL_VERIFICATION]: 86400, // 24 hours
  [TokenType.TEMP]: 600, // 10 minutes
  [TokenType.API_KEY]: 31536000, // 1 year
  [TokenType.SSO]: 43200, // 12 hours
  [TokenType.PASSWORDLESS]: 900, // 15 minutes
};

// Minimal interface definitions to maintain compatibility
export interface TokenPayload {
  [key: string]: any;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

export interface TokenOptions {
  expiresIn?: number | string;
  includeFingerprint?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create a token ID (truncated hash) from a token string
 * @param token Full token string
 * @param length Length of the ID to return (default: 16)
 * @returns Truncated token ID
 */
export function createTokenId(token: string, length: number = 16): string {
  if (!token || typeof token !== "string") {
    throw new Error("Token must be a non-empty string");
  }

  if (token.length <= length) {
    return token;
  }

  return token.substring(0, length);
}

/**
 * Revoke a token by adding it to a blacklist or database
 * @param token Token to revoke
 * @param reason Optional reason for revocation
 * @returns Promise resolving to true if successful
 */
export async function revokeToken(
  token: string,
  _reason?: string
): Promise<boolean> {
  if (!token || typeof token !== "string") {
    throw new Error("Token must be a non-empty string");
  }

  // This is just a placeholder. In a real implementation, you would:
  // 1. Add the token to a blacklist database
  // 2. Record the revocation reason and timestamp
  // 3. Return the result of the operation

  return Promise.resolve(true);
}

/**
 * Generate a random secure token
 * @param length Length of the token in bytes (default: 32)
 * @returns Hex string token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Get expiration time for a token type
 * @param type Token type
 * @param customExpiresIn Custom expiration in seconds
 * @returns Expiration time in seconds
 */
export function getTokenExpiration(
  type: TokenType,
  customExpiresIn?: number
): number {
  if (typeof customExpiresIn === "number" && customExpiresIn > 0) {
    return customExpiresIn;
  }

  return (
    DEFAULT_TOKEN_EXPIRATION[type] || DEFAULT_TOKEN_EXPIRATION[TokenType.TEMP]
  );
}

/**
 * Extract a token from an authorization header
 * @param authHeader Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  // Check for Bearer token format
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Check if a token is expired based on its payload
 * @param payload Token payload with expiry claim
 * @param bufferSeconds Extra buffer time in seconds
 * @returns True if the token is expired
 */
export function isTokenExpired(
  payload: TokenPayload,
  bufferSeconds: number = 0
): boolean {
  if (!payload || typeof payload !== "object") {
    return true;
  }

  const exp = payload.exp || payload.expiresAt;
  if (!exp || typeof exp !== "number") {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return exp <= now + bufferSeconds;
}

/**
 * Create a hash of a token for storage comparison
 * @param token Original token
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Placeholder for any other imports
export const placeholder = true;
