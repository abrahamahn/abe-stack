/**
 * JWT Token Utilities
 *
 * Functions for creating and verifying JWT tokens.
 * All functions accept configuration parameters for testability.
 *
 * @module utils/jwt
 */
import { JwtError } from '@abe-stack/core/infrastructure/crypto';
import type { UserRole } from '@abe-stack/core';
/**
 * JWT token payload structure.
 */
export interface TokenPayload {
    /** User ID */
    userId: string;
    /** User email */
    email: string;
    /** User role */
    role: UserRole;
    /** Additional payload fields */
    [key: string]: unknown;
}
export { JwtError };
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
export declare function createAccessToken(userId: string, email: string, role: UserRole, secret: string, expiresIn?: string | number): string;
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
export declare function verifyToken(token: string, secret: string): TokenPayload;
/**
 * Create a secure random refresh token.
 * Uses REFRESH_TOKEN_BYTES (64 bytes = 512 bits) for cryptographic strength.
 *
 * @returns Hex-encoded random refresh token
 * @complexity O(1)
 */
export declare function createRefreshToken(): string;
/**
 * Calculate refresh token expiry date.
 *
 * @param expiryDays - Number of days until expiry
 * @returns Expiry date
 * @complexity O(1)
 */
export declare function getRefreshTokenExpiry(expiryDays: number): Date;
//# sourceMappingURL=jwt.d.ts.map