/**
 * Rate Limit Configuration
 *
 * Configures the "Global" API rate limit as well as progressive delay settings.
 *
 * **Progressive Delay**:
 * Instead of hard-blocking users immediately, we can slow down responses
 * (backoff) to discourage brute-force or scraping without impacting legitimate users.
 *
 * @module config/rate-limit
 */
import type { RateLimitConfig } from '@abe-stack/core/config';
/**
 * Load Rate Limit Configuration.
 *
 * Configures the "Global" API rate limit as well as progressive delay settings.
 *
 * @param env - Environment variable record
 * @returns Rate limit configuration
 * @complexity O(1)
 */
export declare function loadRateLimitConfig(env: Record<string, string | undefined>): RateLimitConfig;
/**
 * Default rate limit configuration for non-production environments.
 */
export declare const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig;
//# sourceMappingURL=rate-limit.d.ts.map