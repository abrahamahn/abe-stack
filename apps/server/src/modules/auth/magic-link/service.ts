// apps/server/src/modules/auth/magic-link/service.ts
/**
 * Magic Link Service
 *
 * Business logic for passwordless authentication via magic links.
 * Handles token generation, verification, and rate limiting.
 */

import { createHash, randomBytes } from 'node:crypto';

import {
    MAGIC_LINK_TOKENS_TABLE,
    USERS_TABLE,
    USER_COLUMNS,
    and,
    eq,
    gt,
    insert,
    isNull,
    select,
    toCamelCase,
    update,
    type User,
} from '@abe-stack/db';
import {
    emailTemplates,
    withTransaction,
    type DbClient,
    type EmailService,
    type Repositories,
} from '@infrastructure';
import { EmailSendError, InvalidTokenError, TooManyRequestsError } from '@abe-stack/core';

import { createAccessToken, createAuthResponse, createRefreshTokenFamily } from '../utils';

import type { AuthConfig } from '@/config';

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
// Types
// ============================================================================

export interface MagicLinkResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: 'user' | 'admin' | 'moderator';
    createdAt: string;
  };
}

export interface RequestMagicLinkResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a cryptographically secure token
 * Returns the token in base64url encoding for safe URL usage
 */
function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Hash a token using SHA-256
 * We use SHA-256 (not Argon2) because:
 * 1. Tokens are already high-entropy (32 random bytes)
 * 2. Faster lookup is acceptable for single-use tokens
 * 3. Argon2 would be overkill and slow down verification
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Check if rate limit is exceeded for an email
 */
async function isEmailRateLimited(
  repos: Repositories,
  email: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_EMAIL,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const requestCount = await repos.magicLinkTokens.countRecentByEmail(email, windowStart);
  return requestCount >= maxRequests;
}

/**
 * Check if rate limit is exceeded for an IP address
 * Prevents abuse from a single source targeting multiple emails
 */
async function isIpRateLimited(
  repos: Repositories,
  ipAddress: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_IP,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const requestCount = await repos.magicLinkTokens.countRecentByIp(ipAddress, windowStart);
  return requestCount >= maxRequests;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Magic link request options
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
 * Request a magic link for passwordless authentication
 *
 * @param db - Database client (for transactions, kept for A/B testing)
 * @param repos - Repositories for database operations
 * @param emailService - Email service for sending magic links
 * @param email - User's email address
 * @param baseUrl - Frontend base URL for the magic link
 * @param ipAddress - Client IP address (for security logging and rate limiting)
 * @param userAgent - Client user agent (for security logging)
 * @param options - Optional configuration overrides
 * @returns Result indicating success (always returns success to prevent email enumeration)
 * @throws TooManyRequestsError if rate limit is exceeded
 */
export async function requestMagicLink(
  _db: DbClient,
  repos: Repositories,
  emailService: EmailService,
  email: string,
  baseUrl: string,
  ipAddress?: string,
  userAgent?: string,
  options?: MagicLinkRequestOptions,
): Promise<RequestMagicLinkResult> {
  const {
    tokenExpiryMinutes = DEFAULT_TOKEN_EXPIRY_MINUTES,
    maxAttemptsPerEmail = DEFAULT_MAX_REQUESTS_PER_EMAIL,
    maxAttemptsPerIp = DEFAULT_MAX_REQUESTS_PER_IP,
  } = options ?? {};

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  // Check email-based rate limit (using repository)
  const emailRateLimited = await isEmailRateLimited(repos, normalizedEmail, maxAttemptsPerEmail);
  if (emailRateLimited) {
    throw new TooManyRequestsError(
      'Too many magic link requests. Please try again later.',
      RATE_LIMIT_WINDOW_MS / 1000, // Convert to seconds for retry-after
    );
  }

  // Check IP-based rate limit (if IP is provided)
  if (ipAddress !== undefined && ipAddress !== '') {
    const ipRateLimited = await isIpRateLimited(repos, ipAddress, maxAttemptsPerIp);
    if (ipRateLimited) {
      throw new TooManyRequestsError(
        'Too many requests from this location. Please try again later.',
        RATE_LIMIT_WINDOW_MS / 1000,
      );
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
  } catch (error) {
    // Token was created but email failed
    throw new EmailSendError(
      'Failed to send magic link email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with this email, a magic link has been sent.',
  };
}

/**
 * Verify a magic link token and authenticate the user
 *
 * Uses atomic update to prevent race conditions - the token is marked as used
 * in the same operation that validates it, ensuring only one request can succeed.
 *
 * @param db - Database client
 * @param repos - Repositories (kept for A/B testing, transaction uses drizzle)
 * @param config - Auth configuration
 * @param token - The magic link token from the URL
 * @returns Authentication result with tokens and user info
 * @throws InvalidTokenError if token is invalid, expired, or already used
 */
export async function verifyMagicLink(
  db: DbClient,
  _repos: Repositories,
  config: AuthConfig,
  token: string,
): Promise<MagicLinkResult> {
  // Hash the token to look it up
  const tokenHash = hashToken(token);

  // Find or create user and generate tokens atomically
  const result = await withTransaction(db, async (tx) => {
    // Atomically mark token as used while validating it
    // This prevents race conditions - only the first request succeeds
    const now = new Date();
    type TokenRecord = Record<string, unknown> & {
      id: string;
      email: string;
      token_hash: string;
      expires_at: Date;
      used_at: Date | null;
    };
    const tokenRecords = await tx.query<TokenRecord>(
      update(MAGIC_LINK_TOKENS_TABLE)
        .set({ used_at: now })
        .where(and(eq('token_hash', tokenHash), gt('expires_at', now), isNull('used_at')))
        .returningAll()
        .toSql(),
    );
    const tokenRecord = tokenRecords[0];

    // If no rows were updated, token is invalid, expired, or already used
     if (tokenRecord == null) {
       throw new InvalidTokenError('Invalid or expired magic link');
     }

    // Find existing user
     const userRow = await tx.queryOne<Record<string, unknown>>(
       select(USERS_TABLE).where(eq('email', tokenRecord.email)).limit(1).toSql(),
     );
     let user: User | null = userRow != null ? toCamelCase<User>(userRow, USER_COLUMNS) : null;

     // If user doesn't exist, create them
     if (user == null) {
      const newUserRows = await tx.query<Record<string, unknown>>(
        insert(USERS_TABLE)
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
          .toSql(),
       );

       if (newUserRows[0] == null) {
        throw new Error('Failed to create user');
      }
      user = toCamelCase<User>(newUserRows[0], USER_COLUMNS);
    } else if (!user.emailVerified) {
      // If user exists but email not verified, verify it now
      const updatedRows = await tx.query<Record<string, unknown>>(
        update(USERS_TABLE)
          .set({ email_verified: true, email_verified_at: new Date() })
          .where(eq('id', user.id))
          .returningAll()
          .toSql(),
       );

       if (updatedRows[0] != null) {
        user = toCamelCase<User>(updatedRows[0], USER_COLUMNS);
      }
    }

     // Create refresh token
     const { token: refreshToken } = await createRefreshTokenFamily(
       tx,
       user.id,
       config.refreshToken.expiryDays,
     );

     return { user, refreshToken };
   });

  // Create access token
  const accessToken = createAccessToken(
    result.user.id,
    result.user.email,
    result.user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return createAuthResponse(accessToken, result.refreshToken, result.user);
}

/**
 * Clean up expired magic link tokens
 * Should be called periodically by a scheduled job
 *
 * @param db - Database client (kept for A/B testing)
 * @param repos - Repositories for database operations
 * @returns Number of tokens deleted
 */
export async function cleanupExpiredMagicLinkTokens(
  _db: DbClient,
  repos: Repositories,
): Promise<number> {
  return repos.magicLinkTokens.deleteExpired();
}
