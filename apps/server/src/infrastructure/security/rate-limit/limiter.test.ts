// apps/server/src/infrastructure/security/rate-limit/limiter.test.ts
import { createRateLimiter, MemoryStore, RateLimiter, RateLimitPresets } from '.';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const createRecord = (overrides?: {
  tokens?: number;
  lastRefill?: number;
  violations?: number;
  lastViolation?: number;
}) => ({
  tokens: overrides?.tokens ?? 10,
  lastRefill: overrides?.lastRefill ?? Date.now(),
  violations: overrides?.violations ?? 0,
  lastViolation: overrides?.lastViolation ?? 0,
});

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new MemoryStore(1000); // 1 second cleanup interval
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  test('should store and retrieve records', () => {
    const record = createRecord();
    store.set('client-1', record);

    expect(store.get('client-1')).toEqual(record);
  });

  test('should return undefined for non-existent keys', () => {
    expect(store.get('non-existent')).toBeUndefined();
  });

  test('should delete records', () => {
    store.set('client-1', createRecord());
    store.delete('client-1');

    expect(store.get('client-1')).toBeUndefined();
  });

  test('should cleanup expired records', () => {
    const now = Date.now();
    store.set('fresh', createRecord({ lastRefill: now }));
    store.set('stale', createRecord({ lastRefill: now - 5000 }));

    // Cleanup records older than 2000ms
    store.cleanup(2000);

    expect(store.get('fresh')).toBeDefined();
    expect(store.get('stale')).toBeUndefined();
  });

  test('should clear all records on destroy', () => {
    store.set('client-1', createRecord());
    store.set('client-2', createRecord({ tokens: 5 }));
    store.destroy();

    expect(store.get('client-1')).toBeUndefined();
    expect(store.get('client-2')).toBeUndefined();
  });

  describe('getStats', () => {
    test('should return correct tracked clients count', () => {
      store.set('client-1', createRecord());
      store.set('client-2', createRecord({ tokens: 5 }));

      const stats = store.getStats();

      expect(stats.trackedClients).toBe(2);
    });

    test('should return correct limited clients count', () => {
      store.set('client-1', createRecord());
      store.set('client-2', createRecord({ tokens: 0.5 })); // Limited
      store.set('client-3', createRecord({ tokens: 0 })); // Limited

      const stats = store.getStats();

      expect(stats.trackedClients).toBe(3);
      expect(stats.limitedClients).toBe(2);
    });

    test('should return zero for empty store', () => {
      const stats = store.getStats();

      expect(stats.trackedClients).toBe(0);
      expect(stats.limitedClients).toBe(0);
    });
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await limiter.destroy();
    vi.useRealTimers();
  });

  describe('check', () => {
    test('should allow requests under the limit', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 10 });

      const result = await limiter.check('client-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    test('should deny requests when limit is exceeded', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 2 });

      await limiter.check('client-1');
      await limiter.check('client-1');
      const result = await limiter.check('client-1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('should track different clients separately', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 2 });

      await limiter.check('client-1');
      await limiter.check('client-1');

      const result1 = await limiter.check('client-1');
      const result2 = await limiter.check('client-2');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    test('should refill tokens over time', async () => {
      limiter = new RateLimiter({ windowMs: 1000, max: 10 }); // 10 per second

      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        await limiter.check('client-1');
      }

      let result = await limiter.check('client-1');
      expect(result.allowed).toBe(false);

      // Advance time by 500ms (should refill 5 tokens)
      vi.advanceTimersByTime(500);

      result = await limiter.check('client-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(3); // ~5 refilled - 1 consumed
      expect(result.remaining).toBeLessThanOrEqual(5);
    });

    test('should not exceed max tokens when refilling', async () => {
      limiter = new RateLimiter({ windowMs: 1000, max: 10 });

      // Just wait without using any tokens
      vi.advanceTimersByTime(5000); // 5 seconds

      const result = await limiter.check('client-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // max is 10, used 1
    });
  });

  describe('peek', () => {
    test('should return info without consuming token', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 10 });

      const result = await limiter.peek('client-1');

      expect(result.remaining).toBe(10); // Not 9 because it doesn't consume
    });

    test('should return full capacity for new client', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 10 });

      const result = await limiter.peek('new-client');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.resetMs).toBe(0);
    });

    test('should reflect current token count with time refill', async () => {
      limiter = new RateLimiter({ windowMs: 1000, max: 10 });

      // Use all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.check('client-1');
      }

      // Advance time by 500ms
      vi.advanceTimersByTime(500);

      const result = await limiter.peek('client-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe('reset', () => {
    test('should reset client limit', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 10 });

      // Use up some tokens
      await limiter.check('client-1');
      await limiter.check('client-1');
      await limiter.check('client-1');

      await limiter.reset('client-1');

      const result = await limiter.check('client-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // Fresh start: 10 - 1 = 9
    });
  });

  describe('getStats', () => {
    test('should return config and store stats', async () => {
      limiter = new RateLimiter({ windowMs: 60000, max: 100 });

      await limiter.check('client-1');
      await limiter.check('client-2');

      const stats = limiter.getStats();

      expect(stats.config.windowMs).toBe(60000);
      expect(stats.config.max).toBe(100);
      expect(stats.store).toBeDefined();
      expect(stats.store?.trackedClients).toBe(2);
    });

    test('should not include store stats if store does not support it', () => {
      const customStore = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        destroy: vi.fn(),
      };

      limiter = new RateLimiter({ windowMs: 60000, max: 100, store: customStore });

      const stats = limiter.getStats();

      expect(stats.config).toBeDefined();
      expect(stats.store).toBeUndefined();
    });
  });
});

describe('createRateLimiter', () => {
  test('should create a RateLimiter instance', async () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 100 });

    expect(limiter).toBeInstanceOf(RateLimiter);

    await limiter.destroy();
  });
});

describe('RateLimitPresets', () => {
  test('standard preset should be 100 per minute', () => {
    expect(RateLimitPresets.standard).toMatchObject({ windowMs: 60_000, max: 100 });
  });

  test('strict preset should be 10 per minute', () => {
    expect(RateLimitPresets.strict).toMatchObject({ windowMs: 60_000, max: 10 });
  });

  test('relaxed preset should be 1000 per minute', () => {
    expect(RateLimitPresets.relaxed).toMatchObject({ windowMs: 60_000, max: 1000 });
  });
});

describe('RateLimiter with role-based limits', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await limiter.destroy();
    vi.useRealTimers();
  });

  test('should apply role-specific limits for admin role', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 10,
      roleLimits: {
        admin: { max: 1000, windowMs: 60000 },
      },
    });

    const result = await limiter.check('client-1', 'admin');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(1000);
    expect(result.remaining).toBe(999);
  });

  test('should apply default limits for unknown roles', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 10,
      roleLimits: {
        admin: { max: 1000, windowMs: 60000 },
      },
    });

    // 'hacker' is not in the VALID_ROLES whitelist
    const result = await limiter.check('client-1', 'hacker');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10); // Default limit, not role-specific
  });

  test('should apply default limits for undefined role', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 10,
      roleLimits: {
        admin: { max: 1000, windowMs: 60000 },
      },
    });

    const result = await limiter.check('client-1', undefined);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
  });

  test('should use peek with role-based limits', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 10,
      roleLimits: {
        premium: { max: 500, windowMs: 60000 },
      },
    });

    const result = await limiter.peek('client-1', 'premium');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(500);
    expect(result.remaining).toBe(500);
  });

  test('should use default for peek with invalid role', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 10,
      roleLimits: {
        admin: { max: 1000, windowMs: 60000 },
      },
    });

    const result = await limiter.peek('client-1', 'invalid-role');

    expect(result.limit).toBe(10);
  });
});

describe('RateLimiter with progressive delay', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await limiter.destroy();
    vi.useRealTimers();
  });

  test('should not apply delay on first violation', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 1,
      progressiveDelay: {
        enabled: true,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
    });

    // Exhaust tokens
    await limiter.check('client-1');

    // First violation
    const result = await limiter.check('client-1');

    expect(result.allowed).toBe(false);
    expect(result.violations).toBe(1);
    expect(result.delayMs).toBeUndefined();
  });

  test('should apply progressive delay on subsequent violations', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 1,
      progressiveDelay: {
        enabled: true,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
    });

    // Exhaust tokens
    await limiter.check('client-1');

    // First violation - no delay
    await limiter.check('client-1');

    // Second violation - should have delay
    const result = await limiter.check('client-1');

    expect(result.allowed).toBe(false);
    expect(result.violations).toBe(2);
    expect(result.delayMs).toBe(1000); // baseDelay * 2^(violations-2) = 1000 * 2^0 = 1000
  });

  test('should cap delay at maxDelay', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 1,
      progressiveDelay: {
        enabled: true,
        baseDelay: 10000,
        maxDelay: 15000,
        backoffFactor: 2,
      },
    });

    // Exhaust tokens
    await limiter.check('client-1');

    // Multiple violations
    await limiter.check('client-1'); // violation 1
    await limiter.check('client-1'); // violation 2, delay=10000
    await limiter.check('client-1'); // violation 3, delay=20000 but capped

    const result = await limiter.check('client-1'); // violation 4

    expect(result.delayMs).toBe(15000); // Capped at maxDelay
  });

  test('should reset violations on successful request', async () => {
    limiter = new RateLimiter({
      windowMs: 1000,
      max: 10,
      progressiveDelay: {
        enabled: true,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
    });

    // Exhaust tokens
    for (let i = 0; i < 10; i++) {
      await limiter.check('client-1');
    }

    // Get some violations
    await limiter.check('client-1');
    await limiter.check('client-1');

    // Advance time to refill tokens
    vi.advanceTimersByTime(1000);

    // Successful request should reset violations
    const result = await limiter.check('client-1');

    expect(result.allowed).toBe(true);
    expect(result.violations).toBe(0);
  });

  test('should not apply delay when progressive delay is disabled', async () => {
    limiter = new RateLimiter({
      windowMs: 60000,
      max: 1,
      progressiveDelay: {
        enabled: false,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
    });

    // Exhaust tokens
    await limiter.check('client-1');

    // Multiple violations
    await limiter.check('client-1');
    const result = await limiter.check('client-1');

    expect(result.allowed).toBe(false);
    expect(result.delayMs).toBeUndefined();
  });
});

describe('MemoryStore with LRU eviction', () => {
  test('should evict oldest entries when maxSize is reached', () => {
    vi.useFakeTimers();
    const store = new MemoryStore({ cleanupIntervalMs: 60000, maxSize: 3 });

    // Add entries up to max size
    store.set('client-1', createRecord());
    store.set('client-2', createRecord());
    store.set('client-3', createRecord());

    // All entries should exist
    expect(store.get('client-1')).toBeDefined();
    expect(store.get('client-2')).toBeDefined();
    expect(store.get('client-3')).toBeDefined();

    // Add another entry - should trigger eviction of oldest (client-1)
    store.set('client-4', createRecord());

    // client-1 was evicted (first in, first out for LRU)
    // Note: Because we accessed client-1 above with get(), it moved to end
    // So client-2 is now oldest
    expect(store.get('client-4')).toBeDefined();
    expect(store.getStats().trackedClients).toBeLessThanOrEqual(3);

    store.destroy();
    vi.useRealTimers();
  });

  test('should update LRU order on get', () => {
    vi.useFakeTimers();
    const store = new MemoryStore({ cleanupIntervalMs: 60000, maxSize: 3 });

    store.set('client-1', createRecord());
    store.set('client-2', createRecord());
    store.set('client-3', createRecord());

    // Access client-1 to move it to end of LRU
    store.get('client-1');

    // Now client-2 is oldest, adding new entry should evict it
    store.set('client-4', createRecord());

    // client-1 should still exist (was recently accessed)
    expect(store.get('client-1')).toBeDefined();
    expect(store.get('client-4')).toBeDefined();

    store.destroy();
    vi.useRealTimers();
  });

  test('should update existing key without eviction', () => {
    vi.useFakeTimers();
    const store = new MemoryStore({ cleanupIntervalMs: 60000, maxSize: 3 });

    store.set('client-1', createRecord({ tokens: 10 }));
    store.set('client-2', createRecord({ tokens: 10 }));
    store.set('client-3', createRecord({ tokens: 10 }));

    // Update existing key - should not trigger eviction
    store.set('client-1', createRecord({ tokens: 5 }));

    expect(store.getStats().trackedClients).toBe(3);
    expect(store.get('client-1')?.tokens).toBe(5);

    store.destroy();
    vi.useRealTimers();
  });

  test('should track eviction count in stats', () => {
    vi.useFakeTimers();
    const store = new MemoryStore({ cleanupIntervalMs: 60000, maxSize: 2 });

    store.set('client-1', createRecord());
    store.set('client-2', createRecord());

    let stats = store.getStats();
    expect(stats.evictions).toBe(0);

    // Trigger eviction
    store.set('client-3', createRecord());

    stats = store.getStats();
    expect(stats.evictions).toBeGreaterThan(0);

    store.destroy();
    vi.useRealTimers();
  });

  test('should support legacy constructor signature', () => {
    vi.useFakeTimers();
    // Pass just the cleanup interval as a number (legacy signature)
    const store = new MemoryStore(5000);

    store.set('client-1', createRecord());
    expect(store.get('client-1')).toBeDefined();

    store.destroy();
    vi.useRealTimers();
  });
});
