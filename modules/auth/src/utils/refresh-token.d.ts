/**
 * Refresh Token Management
 *
 * Implements refresh token rotation with family tracking
 * to detect and prevent token reuse attacks.
 *
 * @module utils/refresh-token
 */
import { type DbClient } from '@abe-stack/db';
import type { UserRole } from '@abe-stack/core';
/**
 * Create a new refresh token family.
 * Families are used to detect token reuse attacks.
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token insertion fails, the family creation is rolled back.
 *
 * @param db - Database client
 * @param userId - User ID to create family for
 * @param expiryDays - Number of days until token expires (default: 7)
 * @returns Object containing the family ID and token
 * @throws When database operations fail
 * @complexity O(1) - two database inserts
 */
export declare function createRefreshTokenFamily(db: DbClient, userId: string, expiryDays?: number): Promise<{
    familyId: string;
    token: string;
}>;
/**
 * Rotate a refresh token (create new one, invalidate old one).
 * Returns new token or null if rotation fails.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Combined token + user lookup using parallel queries where safe
 * 2. Uses composite index (token, expires_at) for efficient token validation
 * 3. Single query for family status check with user info when possible
 * 4. Minimized round trips by batching independent queries
 *
 * @param db - Database client
 * @param oldToken - The current refresh token to rotate
 * @param ipAddress - Client IP address (for security logging)
 * @param userAgent - Client user agent (for security logging)
 * @param expiryDays - Days until new token expires (default: 7)
 * @param gracePeriodSeconds - Grace period for network retries (default: 30)
 * @returns New token with user info, or null if token is invalid
 * @throws {TokenReuseError} If token reuse attack is detected
 * @complexity O(1) - fixed number of database queries
 */
export declare function rotateRefreshToken(db: DbClient, oldToken: string, ipAddress?: string, userAgent?: string, expiryDays?: number, gracePeriodSeconds?: number): Promise<{
    token: string;
    userId: string;
    email: string;
    role: UserRole;
} | null>;
/**
 * Revoke an entire token family (all tokens created from the same initial login).
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token deletion fails, the family update is rolled back.
 *
 * @param db - Database client
 * @param familyId - Token family ID to revoke
 * @param reason - Reason for revocation (for audit trail)
 * @returns Promise that resolves when revocation is complete
 * @complexity O(1) - two database operations
 */
export declare function revokeTokenFamily(db: DbClient, familyId: string, reason: string): Promise<void>;
/**
 * Revoke all refresh tokens for a user (used on logout all devices).
 *
 * This operation is wrapped in a transaction for atomicity.
 * If any operation fails, all changes are rolled back.
 *
 * @param db - Database client
 * @param userId - User ID to revoke all tokens for
 * @returns Promise that resolves when all tokens are revoked
 * @complexity O(1) - two database operations
 */
export declare function revokeAllUserTokens(db: DbClient, userId: string): Promise<void>;
/**
 * Clean up expired tokens (run periodically).
 *
 * @param db - Database client
 * @returns Number of tokens deleted
 * @complexity O(n) where n is the number of expired tokens
 */
export declare function cleanupExpiredTokens(db: DbClient): Promise<number>;
//# sourceMappingURL=refresh-token.d.ts.map