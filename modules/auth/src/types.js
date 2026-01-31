// modules/auth/src/types.ts
/**
 * Auth Module Types
 *
 * Dependency interface and shared types for the auth module.
 * The server provides these dependencies when registering the auth module.
 *
 * Uses shared context contracts from `@abe-stack/contracts` to eliminate
 * duplicate Logger, RequestInfo, and reply/request interfaces across packages.
 *
 * @module types
 */
// ============================================================================
// Shared Constants
// ============================================================================
/** Minimum length for JWT secrets (256 bits) */
export const MIN_JWT_SECRET_LENGTH = 32;
/** Number of random bytes for refresh tokens (512 bits) */
export const REFRESH_TOKEN_BYTES = 64;
/** Name of the refresh token cookie */
export const REFRESH_COOKIE_NAME = 'refreshToken';
/** Progressive delay window in milliseconds (5 minutes) */
export const PROGRESSIVE_DELAY_WINDOW_MS = 5 * 60 * 1000;
/** Maximum progressive delay in milliseconds (30 seconds) */
export const MAX_PROGRESSIVE_DELAY_MS = 30 * 1000;
// ============================================================================
// Error Messages
// ============================================================================
/**
 * Standardized error messages for auth operations.
 *
 * @complexity O(1) constant access
 */
export const ERROR_MESSAGES = {
    // General
    INTERNAL_ERROR: 'Internal server error',
    NOT_FOUND: 'Resource not found',
    BAD_REQUEST: 'Bad request',
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_REGISTERED: 'Email already registered',
    USER_NOT_FOUND: 'User not found',
    ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts. Please try again later.',
    WEAK_PASSWORD: 'Password is too weak',
    INVALID_TOKEN: 'Invalid or expired token',
    NO_REFRESH_TOKEN: 'No refresh token provided',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden - insufficient permissions',
    MISSING_AUTH_HEADER: 'Missing or invalid authorization header',
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
    // User operations
    FAILED_USER_CREATION: 'Failed to create user',
    FAILED_TOKEN_FAMILY: 'Failed to create refresh token family',
    // OAuth
    OAUTH_STATE_MISMATCH: 'OAuth state mismatch - possible CSRF attack',
    OAUTH_CODE_MISSING: 'OAuth authorization code missing',
    OAUTH_PROVIDER_ERROR: 'OAuth provider returned an error',
    // Magic Link
    MAGIC_LINK_EXPIRED: 'Magic link has expired',
    MAGIC_LINK_INVALID: 'Invalid magic link',
    MAGIC_LINK_ALREADY_USED: 'Magic link has already been used',
    // Email
    EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented',
    EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',
};
// ============================================================================
// Success Messages
// ============================================================================
/**
 * Standardized success messages for auth operations.
 *
 * @complexity O(1) constant access
 */
export const SUCCESS_MESSAGES = {
    LOGGED_OUT: 'Logged out successfully',
    ACCOUNT_UNLOCKED: 'Account unlocked successfully',
    PASSWORD_RESET_SENT: 'Password reset email sent',
    VERIFICATION_EMAIL_SENT: 'Verification email sent. Please check your inbox and click the confirmation link.',
    MAGIC_LINK_SENT: 'Magic link sent to your email',
};
// ============================================================================
// Error Response Adapter
// ============================================================================
/**
 * Adapts an AppContext logger to the ErrorMapperLogger interface
 * used by @abe-stack/core's mapErrorToHttpResponse.
 *
 * @param log - Auth logger instance
 * @returns ErrorMapperLogger-compatible object
 * @complexity O(1)
 */
export function createErrorMapperLogger(log) {
    return {
        warn: (context, message) => {
            log.warn(context, message);
        },
        error: (context, message) => {
            if (message !== undefined && message !== '') {
                log.error(context, message);
            }
            else {
                log.error(context);
            }
        },
    };
}
//# sourceMappingURL=types.js.map