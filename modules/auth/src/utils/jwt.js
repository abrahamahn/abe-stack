// modules/auth/src/utils/jwt.ts
/**
 * JWT Token Utilities
 *
 * Functions for creating and verifying JWT tokens.
 * All functions accept configuration parameters for testability.
 *
 * @module utils/jwt
 */
import crypto from 'node:crypto';
import { JwtError, sign as jwtSign, verify as jwtVerify, } from '@abe-stack/core/infrastructure/crypto';
import { MIN_JWT_SECRET_LENGTH, REFRESH_TOKEN_BYTES } from '../types';
// Re-export JwtError for consumers
export { JwtError };
// ============================================================================
// Access Token Functions
// ============================================================================
/**
 * Create a short-lived access token.
 *
 * @param userId - User ID to encode in the token
 * @param email - User email to encode in the token
 * @param role - User role to encode in the token
 * @param secret - JWT signing secret (must be >= 32 chars)
 * @param expiresIn - Token expiry (default: '15m')
 * @returns Signed JWT access token
 * @throws {Error} If secret is too short
 * @complexity O(1)
 */
export function createAccessToken(userId, email, role, secret, expiresIn = '15m') {
    if (secret === '' || secret.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(`JWT secret must be at least ${String(MIN_JWT_SECRET_LENGTH)} characters`);
    }
    const payload = { userId, email, role };
    return jwtSign(payload, secret, { expiresIn });
}
/**
 * Verify an access token and return the payload.
 *
 * @param token - JWT token to verify
 * @param secret - JWT signing secret (must be >= 32 chars)
 * @returns Decoded token payload
 * @throws {Error} If secret is too short
 * @throws {JwtError} If token is invalid or expired
 * @complexity O(1)
 */
export function verifyToken(token, secret) {
    if (secret === '' || secret.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(`JWT secret must be at least ${String(MIN_JWT_SECRET_LENGTH)} characters`);
    }
    const payload = jwtVerify(token, secret);
    if (!isTokenPayload(payload)) {
        throw new JwtError('Invalid token payload', 'INVALID_TOKEN');
    }
    return payload;
}
// ============================================================================
// Refresh Token Functions
// ============================================================================
/**
 * Create a secure random refresh token.
 * Uses REFRESH_TOKEN_BYTES (64 bytes = 512 bits) for cryptographic strength.
 *
 * @returns Hex-encoded random refresh token
 * @complexity O(1)
 */
export function createRefreshToken() {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}
/**
 * Calculate refresh token expiry date.
 *
 * @param expiryDays - Number of days until expiry
 * @returns Expiry date
 * @complexity O(1)
 */
export function getRefreshTokenExpiry(expiryDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);
    return expiry;
}
/**
 * Type guard for TokenPayload.
 *
 * @param value - Value to check
 * @returns True if value is a valid TokenPayload
 * @complexity O(1)
 */
function isTokenPayload(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const record = value;
    return (typeof record['userId'] === 'string' &&
        typeof record['email'] === 'string' &&
        typeof record['role'] === 'string');
}
//# sourceMappingURL=jwt.js.map