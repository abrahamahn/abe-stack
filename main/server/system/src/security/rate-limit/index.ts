// main/server/system/src/security/rate-limit/index.ts
/**
 * Rate Limiting Infrastructure
 *
 * Token Bucket rate limiter for API protection.
 *
 * @module @bslt/server-system/security/rate-limit
 */

export {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimiterStats,
  type RateLimitInfo,
} from './limiter';
