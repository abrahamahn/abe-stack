// apps/server/src/infra/rate-limit/limiter.ts
/**
 * Token Bucket Rate Limiter
 *
 * A simple, framework-independent rate limiter using the Token Bucket algorithm.
 * Replaces @fastify/rate-limit with explicit, auditable logic.
 *
 * Benefits over fixed-window:
 * - Smoother rate limiting (no burst at window boundaries)
 * - More predictable behavior for clients
 * - Easy to swap storage (Memory → Redis) later
 */

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Cleanup interval in milliseconds (default: 60000) */
  cleanupIntervalMs?: number;
}

export interface RateLimitInfo {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining tokens */
  remaining: number;
  /** Total tokens (max) */
  limit: number;
  /** Time until tokens reset (ms) */
  resetMs: number;
}

interface ClientRecord {
  tokens: number;
  lastRefill: number;
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private hits = new Map<string, ClientRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly refillRate: number;

  constructor(private config: RateLimitConfig) {
    // Calculate tokens per millisecond
    this.refillRate = config.max / config.windowMs;

    // Start cleanup interval to prevent memory leaks
    const cleanupInterval = config.cleanupIntervalMs ?? 60000;
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);

    // Ensure cleanup timer doesn't prevent process exit
    this.cleanupTimer.unref();
  }

  /**
   * Check if a request from the given key (usually IP) is allowed.
   * Consumes one token if allowed.
   */
  check(key: string): RateLimitInfo {
    const now = Date.now();
    const record = this.getOrCreateRecord(key, now);

    // Refill tokens based on time passed
    this.refillTokens(record, now);

    // Check if request is allowed
    const allowed = record.tokens >= 1;

    if (allowed) {
      record.tokens -= 1;
    }

    this.hits.set(key, record);

    return {
      allowed,
      remaining: Math.floor(record.tokens),
      limit: this.config.max,
      resetMs: this.calculateResetMs(record),
    };
  }

  /**
   * Get rate limit info without consuming a token.
   */
  peek(key: string): RateLimitInfo {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record) {
      return {
        allowed: true,
        remaining: this.config.max,
        limit: this.config.max,
        resetMs: 0,
      };
    }

    // Calculate current tokens without modifying
    const timePassed = now - record.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    const currentTokens = Math.min(this.config.max, record.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.floor(currentTokens),
      limit: this.config.max,
      resetMs: this.calculateResetMs(record),
    };
  }

  /**
   * Reset rate limit for a specific key.
   */
  reset(key: string): void {
    this.hits.delete(key);
  }

  /**
   * Stop the cleanup timer (for graceful shutdown).
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.hits.clear();
  }

  private getOrCreateRecord(key: string, now: number): ClientRecord {
    const existing = this.hits.get(key);
    if (existing) {
      return existing;
    }
    return { tokens: this.config.max, lastRefill: now };
  }

  private refillTokens(record: ClientRecord, now: number): void {
    const timePassed = now - record.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;

    if (tokensToAdd > 0) {
      record.tokens = Math.min(this.config.max, record.tokens + tokensToAdd);
      record.lastRefill = now;
    }
  }

  private calculateResetMs(record: ClientRecord): number {
    // Time until fully refilled
    const tokensNeeded = this.config.max - record.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  private cleanup(): void {
    const now = Date.now();
    const expireThreshold = this.config.windowMs * 2; // Keep records for 2x window

    for (const [key, record] of this.hits.entries()) {
      if (now - record.lastRefill > expireThreshold) {
        this.hits.delete(key);
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a rate limiter with common presets.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Default rate limit configurations.
 */
export const RateLimitPresets = {
  /** Standard API rate limit: 100 requests per minute */
  standard: { windowMs: 60_000, max: 100 },
  /** Strict rate limit: 10 requests per minute (for sensitive endpoints) */
  strict: { windowMs: 60_000, max: 10 },
  /** Relaxed rate limit: 1000 requests per minute */
  relaxed: { windowMs: 60_000, max: 1000 },
} as const;
