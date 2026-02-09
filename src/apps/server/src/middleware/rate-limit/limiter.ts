// src/apps/server/src/middleware/rate-limit/limiter.ts
/**
 * Token Bucket Rate Limiter
 *
 * A simple, framework-independent rate limiter using the Token Bucket algorithm.
 * Replaces @fastify/rate-limit with explicit, auditable logic.
 *
 * Benefits over fixed-window:
 * - Smoother rate limiting (no burst at window boundaries)
 * - More predictable behavior for clients
 * - Pluggable storage backend (memory store included)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the rate limiter
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests per window
 * @param cleanupIntervalMs - Interval for cleaning up expired records
 * @param store - Custom storage backend
 * @param roleLimits - Role-specific rate limit overrides
 * @param progressiveDelay - Progressive delay configuration for repeated violations
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  max: number;
  /** Interval for cleaning up expired records */
  cleanupIntervalMs?: number;
  /** Custom storage backend */
  store?: RateLimitStore;
  /** Role-specific rate limit overrides */
  roleLimits?: Record<string, { max: number; windowMs: number }>;
  /** Progressive delay configuration for repeated violations */
  progressiveDelay?: {
    enabled: boolean;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
}

/**
 * Rate limit check result
 *
 * @param allowed - Whether the request is allowed
 * @param remaining - Number of remaining requests
 * @param limit - Maximum requests allowed
 * @param resetMs - Time in ms until limit resets
 * @param delayMs - Suggested delay before retrying (progressive delay)
 * @param violations - Number of consecutive violations
 */
export interface RateLimitInfo {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests */
  remaining: number;
  /** Maximum requests allowed */
  limit: number;
  /** Time in ms until limit resets */
  resetMs: number;
  /** Suggested delay before retrying (progressive delay) */
  delayMs?: number;
  /** Number of consecutive violations */
  violations?: number;
}

/**
 * Internal record for tracking a client's rate limit state
 *
 * @param tokens - Current number of available tokens
 * @param lastRefill - Timestamp of last token refill
 * @param violations - Number of consecutive violations
 * @param lastViolation - Timestamp of last violation
 */
export interface ClientRecord {
  /** Current number of available tokens */
  tokens: number;
  /** Timestamp of last token refill */
  lastRefill: number;
  /** Number of consecutive violations */
  violations: number;
  /** Timestamp of last violation */
  lastViolation: number;
}

/**
 * Interface for rate limit storage backends.
 * Default implementation uses in-memory storage.
 *
 * @param get - Get a client record by key
 * @param set - Set a client record
 * @param delete - Delete a client record
 * @param cleanup - Clean up expired records
 * @param destroy - Destroy the store and release resources
 * @param getStats - Get store statistics
 */
export interface RateLimitStore {
  /** Get a client record by key */
  get(key: string): Promise<ClientRecord | undefined> | ClientRecord | undefined;
  /** Set a client record */
  set(key: string, record: ClientRecord): Promise<void> | void;
  /** Delete a client record */
  delete(key: string): Promise<void> | void;
  /** Clean up expired records */
  cleanup?(expireThreshold: number): Promise<void> | void;
  /** Destroy the store and release resources */
  destroy(): Promise<void> | void;
  /** Get store statistics */
  getStats?(): MemoryStoreStats;
}

/**
 * Statistics for the memory store
 *
 * @param trackedClients - Number of clients being tracked
 * @param limitedClients - Number of clients currently rate-limited
 * @param evictions - Total number of LRU evictions
 */
export interface MemoryStoreStats {
  /** Number of clients being tracked */
  trackedClients: number;
  /** Number of clients currently rate-limited */
  limitedClients: number;
  /** Total number of LRU evictions */
  evictions: number;
}

/**
 * Configuration for the memory store
 *
 * @param cleanupIntervalMs - Interval for periodic cleanup
 * @param maxSize - Maximum number of entries before LRU eviction
 */
export interface MemoryStoreConfig {
  /** Interval for periodic cleanup */
  cleanupIntervalMs?: number;
  /** Maximum number of entries before LRU eviction */
  maxSize?: number;
}

/**
 * Rate limiter statistics for health checks
 *
 * @param config - Current rate limit configuration
 * @param store - Store statistics (if available)
 */
export interface RateLimiterStats {
  /** Current rate limit configuration */
  config: { windowMs: number; max: number };
  /** Store statistics (if available) */
  store?: MemoryStoreStats;
}

// ============================================================================
// Memory Store (Default)
// ============================================================================

/**
 * Default maximum entries before LRU eviction kicks in.
 * Set conservatively to prevent memory exhaustion under DDoS.
 */
const DEFAULT_MAX_SIZE = 100_000;

/**
 * In-memory rate limit store with LRU eviction.
 * Uses Map insertion order for LRU tracking.
 *
 * @complexity O(1) for get/set/delete operations
 */
export class MemoryStore implements RateLimitStore {
  private readonly hits = new Map<string, ClientRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxSize: number;
  private evictionCount = 0;

  /**
   * Create a new MemoryStore
   *
   * @param config - MemoryStoreConfig or cleanup interval in ms (legacy signature)
   */
  constructor(config: MemoryStoreConfig | number = {}) {
    const normalizedConfig: MemoryStoreConfig =
      typeof config === 'number' ? { cleanupIntervalMs: config } : config;

    const cleanupIntervalMs = normalizedConfig.cleanupIntervalMs ?? 60_000;
    this.maxSize = normalizedConfig.maxSize ?? DEFAULT_MAX_SIZE;

    this.cleanupTimer = setInterval(() => {
      this.cleanup(cleanupIntervalMs * 2);
    }, cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  /**
   * Get a client record, updating LRU order
   *
   * @param key - Client identifier
   * @returns The client record or undefined
   * @complexity O(1)
   */
  get(key: string): ClientRecord | undefined {
    const record = this.hits.get(key);
    if (record != null) {
      // Move to end for LRU ordering (Map preserves insertion order)
      this.hits.delete(key);
      this.hits.set(key, record);
    }
    return record;
  }

  /**
   * Set a client record, triggering LRU eviction if at capacity
   *
   * @param key - Client identifier
   * @param record - The client record to store
   * @complexity O(1) amortized
   */
  set(key: string, record: ClientRecord): void {
    // If key exists, delete first to update insertion order
    if (this.hits.has(key)) {
      this.hits.delete(key);
    } else if (this.hits.size >= this.maxSize) {
      // Evict oldest entries (first entries in Map iteration order)
      this.evictOldest(Math.max(1, Math.floor(this.maxSize * 0.1))); // Evict 10% at once
    }
    this.hits.set(key, record);
  }

  /**
   * Delete a client record
   *
   * @param key - Client identifier
   * @complexity O(1)
   */
  delete(key: string): void {
    this.hits.delete(key);
  }

  /**
   * Clean up records older than the expire threshold
   *
   * @param expireThreshold - Maximum age in ms for records to keep
   * @complexity O(n) where n is the number of tracked clients
   */
  cleanup(expireThreshold: number): void {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now - record.lastRefill > expireThreshold) {
        this.hits.delete(key);
      }
    }
  }

  /**
   * Destroy the store, clearing all records and stopping cleanup
   */
  destroy(): void {
    if (this.cleanupTimer != null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.hits.clear();
  }

  /**
   * Get store statistics
   *
   * @returns MemoryStoreStats with tracked/limited client counts and evictions
   * @complexity O(n) where n is the number of tracked clients
   */
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
      evictions: this.evictionCount,
    };
  }

  /**
   * Evict the oldest N entries (LRU eviction).
   * Map iteration order is insertion order, so first entries are oldest.
   *
   * @param count - Number of entries to evict
   * @complexity O(count)
   */
  private evictOldest(count: number): void {
    let evicted = 0;
    for (const key of this.hits.keys()) {
      if (evicted >= count) break;
      this.hits.delete(key);
      evicted++;
    }
    this.evictionCount += evicted;
  }
}

// ============================================================================
// Role Validation
// ============================================================================

/**
 * Whitelist of valid role names for rate limiting.
 * Only roles in this set will receive role-specific rate limits.
 * Unknown roles fall back to default limits.
 */
const VALID_ROLES = new Set(['admin', 'premium', 'basic', 'user', 'guest']);

/**
 * Type guard to validate that a role is in the allowed whitelist.
 * Returns false for undefined, null, or non-whitelisted roles.
 *
 * @param role - The role to validate
 * @returns True if the role is a valid whitelisted string
 */
function isValidRole(role: unknown): role is string {
  return typeof role === 'string' && VALID_ROLES.has(role);
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Token Bucket Rate Limiter
 *
 * Provides smooth rate limiting using the token bucket algorithm.
 * Supports role-based limits and progressive delay on violations.
 */
export class RateLimiter {
  private readonly store: RateLimitStore;

  /**
   * Create a new RateLimiter
   *
   * @param config - Rate limit configuration
   */
  constructor(private readonly config: RateLimitConfig) {
    this.store = config.store ?? new MemoryStore(config.cleanupIntervalMs);
  }

  /**
   * Check if a request from the given key (usually IP) is allowed.
   * Consumes one token if allowed.
   *
   * @param key - Client identifier (usually IP address)
   * @param role - Optional user role (must be in VALID_ROLES whitelist)
   * @returns Rate limit info including allowed status and remaining tokens
   * @complexity O(1) with MemoryStore
   */
  async check(key: string, role?: string): Promise<RateLimitInfo> {
    const now = Date.now();

    // Validate role against whitelist - unknown roles use default limits
    const validatedRole = isValidRole(role) ? role : undefined;

    // Determine effective limits based on validated role
    const effectiveConfig = this.getEffectiveConfig(validatedRole);
    const refillRate = effectiveConfig.max / effectiveConfig.windowMs;

    const record = (await this.store.get(key)) ?? {
      tokens: effectiveConfig.max,
      lastRefill: now,
      violations: 0,
      lastViolation: 0,
    };

    // Refill tokens based on time passed
    this.refillTokens(record, now, refillRate, effectiveConfig.max);

    // Check if request is allowed
    const allowed = record.tokens >= 1;
    let delayMs: number | undefined;

    if (allowed) {
      record.tokens -= 1;
      // Reset violation count on successful request
      record.violations = 0;
    } else {
      // Track violations for progressive delay
      record.violations = record.violations + 1;
      record.lastViolation = now;

      // Calculate progressive delay if enabled
      if (this.config.progressiveDelay?.enabled === true && record.violations > 1) {
        delayMs = this.calculateProgressiveDelay(record.violations);
      }
    }

    await this.store.set(key, record);

    const result: RateLimitInfo = {
      allowed,
      remaining: Math.floor(record.tokens),
      limit: effectiveConfig.max,
      resetMs: this.calculateResetMs(record, refillRate),
      violations: record.violations,
    };
    if (delayMs !== undefined) {
      result.delayMs = delayMs;
    }
    return result;
  }

  /**
   * Get rate limit info without consuming a token.
   *
   * @param key - Client identifier (usually IP address)
   * @param role - Optional user role (must be in VALID_ROLES whitelist)
   * @returns Rate limit info without consuming a token
   * @complexity O(1) with MemoryStore
   */
  async peek(key: string, role?: string): Promise<RateLimitInfo> {
    const now = Date.now();
    // Validate role against whitelist - unknown roles use default limits
    const validatedRole = isValidRole(role) ? role : undefined;
    const effectiveConfig = this.getEffectiveConfig(validatedRole);
    const refillRate = effectiveConfig.max / effectiveConfig.windowMs;

    const record = await this.store.get(key);

    if (record == null) {
      return {
        allowed: true,
        remaining: effectiveConfig.max,
        limit: effectiveConfig.max,
        resetMs: 0,
        violations: 0,
      };
    }

    // Calculate current tokens without modifying
    const timePassed = now - record.lastRefill;
    const tokensToAdd = timePassed * refillRate;
    const currentTokens = Math.min(effectiveConfig.max, record.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.floor(currentTokens),
      limit: effectiveConfig.max,
      resetMs: this.calculateResetMs(record, refillRate),
      violations: record.violations,
    };
  }

  /**
   * Reset rate limit for a specific key.
   *
   * @param key - Client identifier to reset
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

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(
    record: ClientRecord,
    now: number,
    refillRate: number,
    maxTokens: number,
  ): void {
    const timePassed = now - record.lastRefill;
    const tokensToAdd = timePassed * refillRate;

    if (tokensToAdd > 0) {
      record.tokens = Math.min(maxTokens, record.tokens + tokensToAdd);
      record.lastRefill = now;
    }
  }

  /**
   * Get effective rate limit config for a role
   */
  private getEffectiveConfig(role?: string): { max: number; windowMs: number } {
    if (role != null && role !== '' && this.config.roleLimits?.[role] != null) {
      return this.config.roleLimits[role];
    }
    return { max: this.config.max, windowMs: this.config.windowMs };
  }

  /**
   * Calculate progressive delay based on violation count
   */
  private calculateProgressiveDelay(violations: number): number {
    if (this.config.progressiveDelay == null) return 0;

    const { baseDelay, maxDelay, backoffFactor } = this.config.progressiveDelay;
    const delay = baseDelay * Math.pow(backoffFactor, violations - 2); // Start from second violation

    return Math.min(delay, maxDelay);
  }

  /**
   * Calculate time until rate limit fully resets
   */
  private calculateResetMs(record: ClientRecord, refillRate: number): number {
    // Time until fully refilled
    const tokensNeeded = this.config.max - record.tokens;
    return Math.ceil(tokensNeeded / refillRate);
  }

  /**
   * Get rate limiter statistics for health checks.
   *
   * @returns Statistics including config and optional store stats
   */
  getStats(): RateLimiterStats {
    const stats: RateLimiterStats = {
      config: {
        windowMs: this.config.windowMs,
        max: this.config.max,
      },
    };

    // Include store stats if available
    if (this.store.getStats != null) {
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
 *
 * @param config - Rate limit configuration
 * @returns A new RateLimiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Default rate limit configurations with role-based limits.
 */
export const RateLimitPresets = {
  /** Standard API rate limit: 100 requests per minute */
  standard: {
    windowMs: 60_000,
    max: 100,
    roleLimits: {
      admin: { max: 1000, windowMs: 60_000 }, // Higher limits for admins
      premium: { max: 500, windowMs: 60_000 }, // Higher limits for premium users
      basic: { max: 50, windowMs: 60_000 }, // Lower limits for basic users
    },
    progressiveDelay: {
      enabled: true,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 30000, // 30 seconds max delay
      backoffFactor: 2, // Exponential backoff
    },
  },
  /** Strict rate limit: 10 requests per minute (for sensitive endpoints) */
  strict: {
    windowMs: 60_000,
    max: 10,
    progressiveDelay: {
      enabled: true,
      baseDelay: 5000, // 5 second base delay
      maxDelay: 300000, // 5 minutes max delay
      backoffFactor: 2,
    },
  },
  /** Relaxed rate limit: 1000 requests per minute */
  relaxed: {
    windowMs: 60_000,
    max: 1000,
    progressiveDelay: {
      enabled: false, // No progressive delay for relaxed limits
    },
  },
} as const;
