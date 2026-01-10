import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import type { UserRole } from '../../api';

// Access token: short-lived (15 minutes)
const ACCESS_TOKEN_EXPIRY = '15m';
// Refresh token expiry in days (for DB storage)
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short; ensure env is loaded before startup');
  }
  return secret;
}

/**
 * Create a short-lived access token (15 minutes)
 */
export function createAccessToken(userId: string, email: string, role: UserRole): string {
  const payload: TokenPayload = { userId, email, role };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Create a secure random refresh token
 * This is stored in the database and sent as HTTP-only cookie
 */
export function createRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Verify an access token and return the payload
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry;
}

// Backwards compatibility - maps to createAccessToken with default role
export function createToken(userId: string, email: string, role: UserRole = 'user'): string {
  return createAccessToken(userId, email, role);
}
