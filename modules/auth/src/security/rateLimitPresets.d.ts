/**
 * Auth Rate Limit Presets
 *
 * Stricter rate limits for authentication endpoints to prevent brute force attacks.
 * These presets provide endpoint-specific limits that are more restrictive than
 * the global rate limiter (100 req/min).
 *
 * Security rationale:
 * - Login: Strict limits prevent credential stuffing and brute force attacks
 * - Register: Very strict limits prevent mass account creation (spam)
 * - Forgot/Reset Password: Strict limits prevent email enumeration and abuse
 *
 * @module security/rateLimitPresets
 */
import { RateLimiter, type RateLimitInfo } from '@abe-stack/security/rate-limit';
/**
 * Rate limit configuration for an auth endpoint.
 */
export interface AuthRateLimitConfig {
    /** Maximum requests allowed in the window */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
}
/**
 * Auth endpoint identifiers for rate limiting.
 */
export type AuthEndpoint = 'login' | 'register' | 'forgotPassword' | 'resetPassword' | 'verifyEmail' | 'resendVerification' | 'refresh' | 'oauthInitiate' | 'oauthCallback' | 'oauthLink' | 'oauthUnlink';
/**
 * Rate limit configurations for authentication endpoints.
 *
 * These limits are intentionally strict to protect against:
 * - Credential stuffing attacks (login)
 * - Brute force password attacks (login)
 * - Mass account creation (register)
 * - Email enumeration (forgot-password)
 * - Password reset abuse (reset-password)
 *
 * Note: Legitimate users should rarely hit these limits. If users
 * consistently hit rate limits, consider:
 * 1. Adding CAPTCHA as an alternative
 * 2. Implementing progressive delays
 * 3. Using account lockout for repeated failures
 *
 * @complexity O(1) constant access
 */
export declare const AUTH_RATE_LIMITS: Record<AuthEndpoint, AuthRateLimitConfig>;
/**
 * Registry of rate limiters for auth endpoints.
 * Each endpoint gets its own rate limiter instance with appropriate limits.
 *
 * @complexity O(1) per check operation
 */
declare class AuthRateLimiterRegistry {
    private limiters;
    /**
     * Get or create a rate limiter for the specified auth endpoint.
     *
     * @param endpoint - The auth endpoint
     * @returns Rate limiter instance for the endpoint
     * @complexity O(1)
     */
    getLimiter(endpoint: AuthEndpoint): RateLimiter;
    /**
     * Check rate limit for an auth endpoint.
     *
     * @param endpoint - The auth endpoint being accessed
     * @param key - Client identifier (usually IP address)
     * @returns Rate limit info including whether request is allowed
     * @complexity O(1)
     */
    check(endpoint: AuthEndpoint, key: string): Promise<RateLimitInfo>;
    /**
     * Destroy all rate limiters (for graceful shutdown).
     *
     * @returns Promise that resolves when all limiters are destroyed
     * @complexity O(n) where n is the number of endpoints
     */
    destroy(): Promise<void>;
}
/**
 * Singleton registry for auth rate limiters.
 */
export declare const authRateLimiters: AuthRateLimiterRegistry;
/**
 * Create a Fastify preHandler hook for rate limiting an auth endpoint.
 *
 * @param endpoint - The auth endpoint to rate limit
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * app.post('/api/auth/login', {
 *   preHandler: createAuthRateLimitHook('login'),
 * }, loginHandler);
 * ```
 */
export declare function createAuthRateLimitHook(endpoint: AuthEndpoint): (req: {
    ip: string;
}, reply: {
    status: (code: number) => {
        send: (body: unknown) => void;
    };
    header: (name: string, value: string) => void;
}) => Promise<void>;
export {};
//# sourceMappingURL=rateLimitPresets.d.ts.map