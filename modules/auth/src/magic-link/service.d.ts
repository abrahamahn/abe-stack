/**
 * Magic Link Service
 *
 * Business logic for passwordless authentication via magic links.
 * Handles token generation, verification, and rate limiting.
 *
 * @module magic-link/service
 */
import { type DbClient, type Repositories } from '@abe-stack/db';
import type { AuthEmailService, AuthEmailTemplates } from '../types';
import type { AuthConfig } from '@abe-stack/core';
/**
 * Magic link authentication result.
 */
export interface MagicLinkResult {
    /** JWT access token */
    accessToken: string;
    /** Opaque refresh token */
    refreshToken: string;
    /** Authenticated user data */
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: 'user' | 'admin' | 'moderator';
        createdAt: string;
    };
}
/**
 * Magic link request result.
 */
export interface RequestMagicLinkResult {
    /** Whether the request was processed */
    success: boolean;
    /** Human-readable message */
    message: string;
}
/**
 * Magic link request options.
 */
export interface MagicLinkRequestOptions {
    /** Token expiry in minutes (default: 15) */
    tokenExpiryMinutes?: number;
    /** Max requests per email per hour (default: 3) */
    maxAttemptsPerEmail?: number;
    /** Max requests per IP per hour (default: 10) */
    maxAttemptsPerIp?: number;
}
/**
 * Request a magic link for passwordless authentication.
 *
 * @param _db - Database client (kept for interface consistency)
 * @param repos - Repositories for database operations
 * @param emailService - Email service for sending magic links
 * @param emailTemplates - Email templates for rendering the magic link email
 * @param email - User's email address
 * @param baseUrl - Frontend base URL for the magic link
 * @param ipAddress - Client IP address (for security logging and rate limiting)
 * @param userAgent - Client user agent (for security logging)
 * @param options - Optional configuration overrides
 * @returns Result indicating success (always returns success to prevent email enumeration)
 * @throws {TooManyRequestsError} If rate limit is exceeded
 * @complexity O(1)
 */
export declare function requestMagicLink(_db: DbClient, repos: Repositories, emailService: AuthEmailService, emailTemplates: AuthEmailTemplates, email: string, baseUrl: string, ipAddress?: string, userAgent?: string, options?: MagicLinkRequestOptions): Promise<RequestMagicLinkResult>;
/**
 * Verify a magic link token and authenticate the user.
 *
 * Uses atomic update to prevent race conditions - the token is marked as used
 * in the same operation that validates it, ensuring only one request can succeed.
 *
 * @param db - Database client
 * @param _repos - Repositories (kept for interface consistency)
 * @param config - Auth configuration
 * @param token - The magic link token from the URL
 * @returns Authentication result with tokens and user info
 * @throws {InvalidTokenError} If token is invalid, expired, or already used
 * @complexity O(1) - constant database operations
 */
export declare function verifyMagicLink(db: DbClient, _repos: Repositories, config: AuthConfig, token: string): Promise<MagicLinkResult>;
/**
 * Clean up expired magic link tokens.
 * Should be called periodically by a scheduled job.
 *
 * @param _db - Database client (kept for interface consistency)
 * @param repos - Repositories for database operations
 * @returns Number of tokens deleted
 * @complexity O(n) where n is the number of expired tokens
 */
export declare function cleanupExpiredMagicLinkTokens(_db: DbClient, repos: Repositories): Promise<number>;
//# sourceMappingURL=service.d.ts.map