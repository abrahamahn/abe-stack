// backend/server/src/infra/security/jwt.ts
/**
 * JWT token management
 * Handles access token creation and verification
 */

import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { MIN_JWT_SECRET_LENGTH, REFRESH_TOKEN_BYTES } from '../../common/constants';

import type { AuthConfig } from '../config/auth';
import type { UserRole } from '@abe-stack/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Get JWT secret from environment
 * Validates minimum length for security
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is missing or too short (minimum ${String(MIN_JWT_SECRET_LENGTH)} characters); ensure env is loaded before startup`,
    );
  }
  return secret;
}

/**
 * Create a short-lived access token
 * Duration configured via authConfig.accessTokenExpiry
 */
export function createAccessToken(
  authConfig: AuthConfig,
  userId: string,
  email: string,
  role: UserRole,
): string {
  const payload: TokenPayload = { userId, email, role };
  const options: SignOptions = {
    expiresIn: authConfig.accessTokenExpiry as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getJwtSecret(), options);
}

/**
 * Create a secure random refresh token
 * This is stored in the database and sent as HTTP-only cookie
 * Uses REFRESH_TOKEN_BYTES (64 bytes = 512 bits) for cryptographic strength
 */
export function createRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Verify an access token and return the payload
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

/**
 * Calculate refresh token expiry date
 * Uses authConfig.refreshTokenExpiryDays
 */
export function getRefreshTokenExpiry(authConfig: AuthConfig): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + authConfig.refreshTokenExpiryDays);
  return expiry;
}

/**
 * Backwards compatibility - creates access token with provided config
 * @deprecated Use createAccessToken with config instead
 */
export function createToken(
  authConfig: AuthConfig,
  userId: string,
  email: string,
  role: UserRole = 'user',
): string {
  return createAccessToken(authConfig, userId, email, role);
}
