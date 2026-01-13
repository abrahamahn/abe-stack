// apps/server/src/modules/auth/utils/jwt.ts
/**
 * JWT Token Utilities
 *
 * Functions for creating and verifying JWT tokens.
 * All functions accept configuration parameters for testability.
 */

import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { MIN_JWT_SECRET_LENGTH, REFRESH_TOKEN_BYTES } from '../../../shared/constants';

import type { UserRole } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ============================================================================
// Access Token Functions
// ============================================================================

/**
 * Create a short-lived access token
 */
export function createAccessToken(
  userId: string,
  email: string,
  role: UserRole,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT secret must be at least ${String(MIN_JWT_SECRET_LENGTH)} characters`);
  }

  const payload: TokenPayload = { userId, email, role };
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Verify an access token and return the payload
 */
export function verifyToken(token: string, secret: string): TokenPayload {
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT secret must be at least ${String(MIN_JWT_SECRET_LENGTH)} characters`);
  }

  return jwt.verify(token, secret) as TokenPayload;
}

// ============================================================================
// Refresh Token Functions
// ============================================================================

/**
 * Create a secure random refresh token
 * Uses REFRESH_TOKEN_BYTES (64 bytes = 512 bits) for cryptographic strength
 */
export function createRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiry(expiryDays: number): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);
  return expiry;
}
