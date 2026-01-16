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
  /** Storage backend (defaults to MemoryStore) */
  store?: RateLimitStore;
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

export interface ClientRecord {
  tokens: number;
  lastRefill: number;
}

/**
 * Interface for rate limit storage backends.
 * Allows swapping in-memory map for Redis/Postgres in production.
 */
export interface RateLimitStore {
  /** Get record for a client */
  get(key: string): Promise<ClientRecord | undefined> | ClientRecord | undefined;
  /** Set record for a client */
  set(key: string, record: ClientRecord): Promise<void> | void;
  /** Delete record for a client */
  delete(key: string): Promise<void> | void;
  /** Clean up expired records (optional) */
  cleanup?(expireThreshold: number): Promise<void> | void;
  /** Destroy the store connection/timers */
  destroy(): Promise<void> | void;
  /** Get store statistics (optional) */
  getStats?(): MemoryStoreStats;
}

export interface MemoryStoreStats {
  /** Number of clients being tracked */
  trackedClients: number;
  /** Number of clients currently rate limited (tokens < 1) */
  limitedClients: number;
}

export interface RateLimiterStats {
  /** Rate limiter configuration */
  config: { windowMs: number; max: number };
  /** Store statistics if available */
  store?: MemoryStoreStats;
}

// ============================================================================
// Memory Store (Default)
// ============================================================================

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, ClientRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs = 60000) {
    this.cleanupTimer = setInterval(() => {
      this.cleanup(cleanupIntervalMs * 2);
    }, cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  get(key: string): ClientRecord | undefined {
    return this.hits.get(key);
  }

  set(key: string, record: ClientRecord): void {
    this.hits.set(key, record);
  }

  delete(key: string): void {
    this.hits.delete(key);
  }

  cleanup(expireThreshold: number): void {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now - record.lastRefill > expireThreshold) {
        this.hits.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.hits.clear();
  }

  getStats(): MemoryStoreStats {
    let limitedClients = 0;
    for (const record of this.hits.values()) {
      if (record.tokens < 1) {
        limitedClients++;
      }
    }
    return {
      trackedClients: this.hits.size,
      limitedClients,
    };
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private readonly store: RateLimitStore;
  private readonly refillRate: number;

  constructor(private config: RateLimitConfig) {
    // Calculate tokens per millisecond
    this.refillRate = config.max / config.windowMs;
    this.store = config.store ?? new MemoryStore(config.cleanupIntervalMs);
  }

  /**
   * Check if a request from the given key (usually IP) is allowed.
   * Consumes one token if allowed.
   */
  async check(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const record = (await this.store.get(key)) ?? { tokens: this.config.max, lastRefill: now };

    // Refill tokens based on time passed
    this.refillTokens(record, now);

    // Check if request is allowed
    const allowed = record.tokens >= 1;

    if (allowed) {
      record.tokens -= 1;
    }

    await this.store.set(key, record);

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
  async peek(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const record = await this.store.get(key);

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
  async reset(key: string): Promise<void> {
    await this.store.delete(key);
  }

  /**
   * Stop the cleanup timer (for graceful shutdown).
   */
  async destroy(): Promise<void> {
    await this.store.destroy();
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

  /**
   * Get rate limiter statistics for health checks.
   */
  getStats(): RateLimiterStats {
    const stats: RateLimiterStats = {
      config: {
        windowMs: this.config.windowMs,
        max: this.config.max,
      },
    };

    // Include store stats if available
    if (this.store.getStats) {
      stats.store = this.store.getStats();
    }

    return stats;
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
