// apps/server/src/infrastructure/security/rate-limit/limiter.ts
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

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  cleanupIntervalMs?: number;
  store?: RateLimitStore;
  roleLimits?: Record<string, { max: number; windowMs: number }>;
  progressiveDelay?: {
    enabled: boolean;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
  delayMs?: number;
  violations?: number;
}

export interface ClientRecord {
  tokens: number;
  lastRefill: number;
  violations: number;
  lastViolation: number;
}

/**
 * Interface for rate limit storage backends.
 * Default implementation uses in-memory storage.
 */
export interface RateLimitStore {
  get(key: string): Promise<ClientRecord | undefined> | ClientRecord | undefined;
  set(key: string, record: ClientRecord): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  cleanup?(expireThreshold: number): Promise<void> | void;
  destroy(): Promise<void> | void;
  getStats?(): MemoryStoreStats;
}

export interface MemoryStoreStats {
  trackedClients: number;
  limitedClients: number;
  evictions: number;
}

export interface MemoryStoreConfig {
  cleanupIntervalMs?: number;
  maxSize?: number;
}

export interface RateLimiterStats {
  config: { windowMs: number; max: number };
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

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, ClientRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxSize: number;
  private evictionCount = 0;

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

  get(key: string): ClientRecord | undefined {
    const record = this.hits.get(key);
    if (record) {
      // Move to end for LRU ordering (Map preserves insertion order)
      this.hits.delete(key);
      this.hits.set(key, record);
    }
    return record;
  }

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
      evictions: this.evictionCount,
    };
  }

  /**
   * Evict the oldest N entries (LRU eviction).
   * Map iteration order is insertion order, so first entries are oldest.
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
 */
function isValidRole(role: unknown): role is string {
  return typeof role === 'string' && VALID_ROLES.has(role);
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private readonly store: RateLimitStore;

  constructor(private config: RateLimitConfig) {
    this.store = config.store ?? new MemoryStore(config.cleanupIntervalMs);
  }

  /**
   * Check if a request from the given key (usually IP) is allowed.
   * Consumes one token if allowed.
   * @param key - Client identifier (usually IP address)
   * @param role - Optional user role (must be in VALID_ROLES whitelist)
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
      record.violations = (record.violations || 0) + 1;
      record.lastViolation = now;

      // Calculate progressive delay if enabled
      if (this.config.progressiveDelay?.enabled && record.violations > 1) {
        delayMs = this.calculateProgressiveDelay(record.violations);
      }
    }

    await this.store.set(key, record);

    return {
      allowed,
      remaining: Math.floor(record.tokens),
      limit: effectiveConfig.max,
      resetMs: this.calculateResetMs(record, refillRate),
      delayMs,
      violations: record.violations,
    };
  }

  /**
   * Get rate limit info without consuming a token.
   * @param key - Client identifier (usually IP address)
   * @param role - Optional user role (must be in VALID_ROLES whitelist)
   */
  async peek(key: string, role?: string): Promise<RateLimitInfo> {
    const now = Date.now();
    // Validate role against whitelist - unknown roles use default limits
    const validatedRole = isValidRole(role) ? role : undefined;
    const effectiveConfig = this.getEffectiveConfig(validatedRole);
    const refillRate = effectiveConfig.max / effectiveConfig.windowMs;

    const record = await this.store.get(key);

    if (!record) {
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
      violations: record.violations || 0,
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

  private getEffectiveConfig(role?: string): { max: number; windowMs: number } {
    if (role && this.config.roleLimits?.[role]) {
      return this.config.roleLimits[role];
    }
    return { max: this.config.max, windowMs: this.config.windowMs };
  }

  private calculateProgressiveDelay(violations: number): number {
    if (!this.config.progressiveDelay) return 0;

    const { baseDelay, maxDelay, backoffFactor } = this.config.progressiveDelay;
    const delay = baseDelay * Math.pow(backoffFactor, violations - 2); // Start from second violation

    return Math.min(delay, maxDelay);
  }

  private calculateResetMs(record: ClientRecord, refillRate: number): number {
    // Time until fully refilled
    const tokensNeeded = this.config.max - record.tokens;
    return Math.ceil(tokensNeeded / refillRate);
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
