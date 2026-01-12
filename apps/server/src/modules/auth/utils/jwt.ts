// apps/server/src/modules/auth/utils/jwt.ts
import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { authConfig } from '../../../config/auth';
import { MIN_JWT_SECRET_LENGTH, REFRESH_TOKEN_BYTES } from '../../../lib/constants';

import type { UserRole } from '@abe-stack/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

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
export function createAccessToken(userId: string, email: string, role: UserRole): string {
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
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + authConfig.refreshTokenExpiryDays);
  return expiry;
}

// Backwards compatibility - maps to createAccessToken with default role
export function createToken(userId: string, email: string, role: UserRole = 'user'): string {
  return createAccessToken(userId, email, role);
}
