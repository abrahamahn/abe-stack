// modules/auth/src/security/rateLimitPresets.ts
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

import {
  RateLimiter,
  type RateLimitConfig,
  type RateLimitInfo,
} from '@abe-stack/db';

// ============================================================================
// Types
// ============================================================================

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
export type AuthEndpoint =
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'resetPassword'
  | 'verifyEmail'
  | 'resendVerification'
  | 'refresh'
  | 'oauthInitiate'
  | 'oauthCallback'
  | 'oauthLink'
  | 'oauthUnlink';

// ============================================================================
// Auth Rate Limit Configurations
// ============================================================================

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
export const AUTH_RATE_LIMITS: Record<AuthEndpoint, AuthRateLimitConfig> = {
  /**
   * Login: 5 attempts per minute
   * Protects against credential stuffing and brute force.
   * Combined with account lockout after repeated failures.
   */
  login: { max: 5, windowMs: 60_000 },

  /**
   * Register: 3 attempts per hour
   * Very strict to prevent spam account creation.
   * Legitimate users only need to register once.
   */
  register: { max: 3, windowMs: 3_600_000 },

  /**
   * Forgot Password: 3 attempts per hour
   * Prevents email enumeration and email bombing.
   * Users shouldn't need to request this frequently.
   */
  forgotPassword: { max: 3, windowMs: 3_600_000 },

  /**
   * Reset Password: 5 attempts per hour
   * Allows a few attempts in case of typos.
   * Protected by one-time token expiration.
   */
  resetPassword: { max: 5, windowMs: 3_600_000 },

  /**
   * Verify Email: 5 attempts per hour
   * Allows retries for token input errors.
   * Protected by one-time token.
   */
  verifyEmail: { max: 5, windowMs: 3_600_000 },

  /**
   * Resend Verification: 3 attempts per hour
   * Prevents email bombing.
   */
  resendVerification: { max: 3, windowMs: 3_600_000 },

  /**
   * Token Refresh: 30 attempts per minute
   * More lenient since it's called automatically by clients.
   * Still stricter than global limit to prevent abuse.
   */
  refresh: { max: 30, windowMs: 60_000 },

  /**
   * OAuth Initiate: 10 attempts per minute
   * Prevents state exhaustion attacks while allowing
   * legitimate retries if user navigates back.
   */
  oauthInitiate: { max: 10, windowMs: 60_000 },

  /**
   * OAuth Callback: 20 attempts per minute
   * More lenient since it's a redirect from provider.
   * Protects against callback flooding.
   */
  oauthCallback: { max: 20, windowMs: 60_000 },

  /**
   * OAuth Link: 5 attempts per hour
   * Strict since linking is infrequent.
   * Prevents abuse of account linking feature.
   */
  oauthLink: { max: 5, windowMs: 3_600_000 },

  /**
   * OAuth Unlink: 5 attempts per hour
   * Strict since unlinking is infrequent.
   * Prevents repeated unlink/link cycles.
   */
  oauthUnlink: { max: 5, windowMs: 3_600_000 },
};

// ============================================================================
// Auth Rate Limiter Registry
// ============================================================================

/**
 * Registry of rate limiters for auth endpoints.
 * Each endpoint gets its own rate limiter instance with appropriate limits.
 *
 * @complexity O(1) per check operation
 */
class AuthRateLimiterRegistry {
  private limiters = new Map<AuthEndpoint, RateLimiter>();

  /**
   * Get or create a rate limiter for the specified auth endpoint.
   *
   * @param endpoint - The auth endpoint
   * @returns Rate limiter instance for the endpoint
   * @complexity O(1)
   */
  getLimiter(endpoint: AuthEndpoint): RateLimiter {
    let limiter = this.limiters.get(endpoint);

    if (limiter == null) {
      const config = AUTH_RATE_LIMITS[endpoint];
      limiter = new RateLimiter({
        windowMs: config.windowMs,
        max: config.max,
        progressiveDelay: {
          enabled: true,
          baseDelay: 1000, // 1 second base delay
          maxDelay: 30000, // 30 seconds max delay
          backoffFactor: 2,
        },
      } satisfies RateLimitConfig);
      this.limiters.set(endpoint, limiter);
    }

    return limiter;
  }

  /**
   * Check rate limit for an auth endpoint.
   *
   * @param endpoint - The auth endpoint being accessed
   * @param key - Client identifier (usually IP address)
   * @returns Rate limit info including whether request is allowed
   * @complexity O(1)
   */
  async check(endpoint: AuthEndpoint, key: string): Promise<RateLimitInfo> {
    const limiter = this.getLimiter(endpoint);
    return limiter.check(key);
  }

  /**
   * Destroy all rate limiters (for graceful shutdown).
   *
   * @returns Promise that resolves when all limiters are destroyed
   * @complexity O(n) where n is the number of endpoints
   */
  async destroy(): Promise<void> {
    for (const limiter of this.limiters.values()) {
      await limiter.destroy();
    }
    this.limiters.clear();
  }
}

/**
 * Singleton registry for auth rate limiters.
 */
export const authRateLimiters = new AuthRateLimiterRegistry();

// ============================================================================
// Middleware Helper
// ============================================================================

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
export function createAuthRateLimitHook(endpoint: AuthEndpoint) {
  return async (
    req: { ip: string },
    reply: {
      status: (code: number) => { send: (body: unknown) => void };
      header: (name: string, value: string) => void;
    },
  ): Promise<void> => {
    const rateLimitInfo = await authRateLimiters.check(endpoint, req.ip);

    // Always set rate limit headers
    reply.header('X-RateLimit-Limit', String(rateLimitInfo.limit));
    reply.header('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
    reply.header('X-RateLimit-Reset', String(Math.ceil(rateLimitInfo.resetMs / 1000)));

    if (!rateLimitInfo.allowed) {
      const retryAfter = Math.ceil(rateLimitInfo.resetMs / 1000);
      reply.header('Retry-After', String(retryAfter));
      reply.status(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${endpoint}. Please try again later.`,
        retryAfter,
      });
      return;
    }
  };
}
