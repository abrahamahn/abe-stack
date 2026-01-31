// modules/auth/src/magic-link/service.ts
/**
 * Magic Link Service
 *
 * Business logic for passwordless authentication via magic links.
 * Handles token generation, verification, and rate limiting.
 *
 * @module magic-link/service
 */
import { createHash, randomBytes } from 'node:crypto';
import { EmailSendError, InvalidTokenError, TooManyRequestsError } from '@abe-stack/core';
import { MAGIC_LINK_TOKENS_TABLE, USERS_TABLE, USER_COLUMNS, and, eq, gt, insert, isNull, select, toCamelCase, update, withTransaction, } from '@abe-stack/db';
import { createAccessToken, createAuthResponse, createRefreshTokenFamily } from '../utils';
// ============================================================================
// Constants
// ============================================================================
/** Token length in bytes (32 bytes = 256 bits of entropy) */
const TOKEN_BYTES = 32;
/** Token expiry in minutes (default, can be overridden by config) */
const DEFAULT_TOKEN_EXPIRY_MINUTES = 15;
/** Max requests per email per hour for rate limiting (default) */
const DEFAULT_MAX_REQUESTS_PER_EMAIL = 3;
/** Max requests per IP per hour for rate limiting */
const DEFAULT_MAX_REQUESTS_PER_IP = 10;
/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Generate a cryptographically secure token.
 * Returns the token in base64url encoding for safe URL usage.
 *
 * @returns Base64url-encoded random token
 * @complexity O(1)
 */
function generateToken() {
    return randomBytes(TOKEN_BYTES).toString('base64url');
}
/**
 * Hash a token using SHA-256.
 * We use SHA-256 (not Argon2) because:
 * 1. Tokens are already high-entropy (32 random bytes)
 * 2. Faster lookup is acceptable for single-use tokens
 * 3. Argon2 would be overkill and slow down verification
 *
 * @param token - Token to hash
 * @returns Hex-encoded SHA-256 hash
 * @complexity O(1)
 */
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
/**
 * Check if rate limit is exceeded for an email.
 *
 * @param repos - Repositories
 * @param email - Email to check
 * @param maxRequests - Max requests allowed in the window
 * @returns True if rate limited
 * @complexity O(1)
 */
async function isEmailRateLimited(repos, email, maxRequests = DEFAULT_MAX_REQUESTS_PER_EMAIL) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const requestCount = await repos.magicLinkTokens.countRecentByEmail(email, windowStart);
    return requestCount >= maxRequests;
}
/**
 * Check if rate limit is exceeded for an IP address.
 * Prevents abuse from a single source targeting multiple emails.
 *
 * @param repos - Repositories
 * @param ipAddress - IP address to check
 * @param maxRequests - Max requests allowed in the window
 * @returns True if rate limited
 * @complexity O(1)
 */
async function isIpRateLimited(repos, ipAddress, maxRequests = DEFAULT_MAX_REQUESTS_PER_IP) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const requestCount = await repos.magicLinkTokens.countRecentByIp(ipAddress, windowStart);
    return requestCount >= maxRequests;
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
export async function requestMagicLink(_db, repos, emailService, emailTemplates, email, baseUrl, ipAddress, userAgent, options) {
    const { tokenExpiryMinutes = DEFAULT_TOKEN_EXPIRY_MINUTES, maxAttemptsPerEmail = DEFAULT_MAX_REQUESTS_PER_EMAIL, maxAttemptsPerIp = DEFAULT_MAX_REQUESTS_PER_IP, } = options ?? {};
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    // Check email-based rate limit (using repository)
    const emailRateLimited = await isEmailRateLimited(repos, normalizedEmail, maxAttemptsPerEmail);
    if (emailRateLimited) {
        throw new TooManyRequestsError('Too many magic link requests. Please try again later.', RATE_LIMIT_WINDOW_MS / 1000);
    }
    // Check IP-based rate limit (if IP is provided)
    if (ipAddress !== undefined && ipAddress !== '') {
        const ipRateLimited = await isIpRateLimited(repos, ipAddress, maxAttemptsPerIp);
        if (ipRateLimited) {
            throw new TooManyRequestsError('Too many requests from this location. Please try again later.', RATE_LIMIT_WINDOW_MS / 1000);
        }
    }
    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);
    // Store hashed token (using repository)
    await repos.magicLinkTokens.create({
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
    });
    // Build magic link URL
    const magicLinkUrl = `${baseUrl}/auth/magic-link?token=${token}`;
    // Send email
    const emailTemplate = emailTemplates.magicLink(magicLinkUrl, tokenExpiryMinutes);
    try {
        await emailService.send({
            ...emailTemplate,
            to: normalizedEmail,
        });
    }
    catch (error) {
        // Token was created but email failed
        throw new EmailSendError('Failed to send magic link email', error instanceof Error ? error : new Error(String(error)));
    }
    // Always return success to prevent email enumeration
    return {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
    };
}
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
export async function verifyMagicLink(db, _repos, config, token) {
    // Hash the token to look it up
    const tokenHash = hashToken(token);
    // Find or create user and generate tokens atomically
    const result = await withTransaction(db, async (tx) => {
        // Atomically mark token as used while validating it
        // This prevents race conditions - only the first request succeeds
        const now = new Date();
        const tokenRecords = await tx.query(update(MAGIC_LINK_TOKENS_TABLE)
            .set({ used_at: now })
            .where(and(eq('token_hash', tokenHash), gt('expires_at', now), isNull('used_at')))
            .returningAll()
            .toSql());
        const tokenRecord = tokenRecords[0];
        // If no rows were updated, token is invalid, expired, or already used
        if (tokenRecord == null) {
            throw new InvalidTokenError('Invalid or expired magic link');
        }
        // Find existing user
        const userRow = await tx.queryOne(select(USERS_TABLE).where(eq('email', tokenRecord.email)).limit(1).toSql());
        let user = userRow != null ? toCamelCase(userRow, USER_COLUMNS) : null;
        // If user doesn't exist, create them
        if (user == null) {
            const newUserRows = await tx.query(insert(USERS_TABLE)
                .values({
                email: tokenRecord.email,
                name: null,
                // Magic link users don't have a password - generate a random unusable hash
                password_hash: `magiclink:${randomBytes(32).toString('hex')}`,
                role: 'user',
                email_verified: true, // Email is verified by using magic link
                email_verified_at: new Date(),
            })
                .returningAll()
                .toSql());
            if (newUserRows[0] == null) {
                throw new Error('Failed to create user');
            }
            user = toCamelCase(newUserRows[0], USER_COLUMNS);
        }
        else if (!user.emailVerified) {
            // If user exists but email not verified, verify it now
            const updatedRows = await tx.query(update(USERS_TABLE)
                .set({ email_verified: true, email_verified_at: new Date() })
                .where(eq('id', user.id))
                .returningAll()
                .toSql());
            if (updatedRows[0] != null) {
                user = toCamelCase(updatedRows[0], USER_COLUMNS);
            }
        }
        // Create refresh token
        const { token: refreshToken } = await createRefreshTokenFamily(tx, user.id, config.refreshToken.expiryDays);
        return { user, refreshToken };
    });
    // Create access token
    const accessToken = createAccessToken(result.user.id, result.user.email, result.user.role, config.jwt.secret, config.jwt.accessTokenExpiry);
    return createAuthResponse(accessToken, result.refreshToken, result.user);
}
/**
 * Clean up expired magic link tokens.
 * Should be called periodically by a scheduled job.
 *
 * @param _db - Database client (kept for interface consistency)
 * @param repos - Repositories for database operations
 * @returns Number of tokens deleted
 * @complexity O(n) where n is the number of expired tokens
 */
export async function cleanupExpiredMagicLinkTokens(_db, repos) {
    return repos.magicLinkTokens.deleteExpired();
}
//# sourceMappingURL=service.js.map