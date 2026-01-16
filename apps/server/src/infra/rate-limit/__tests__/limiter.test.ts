// apps/server/src/infra/rate-limit/__tests__/limiter.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
} from '@rate-limit/limiter';

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
    const record = { tokens: 10, lastRefill: Date.now() };
    store.set('client-1', record);

    expect(store.get('client-1')).toEqual(record);
  });

  test('should return undefined for non-existent keys', () => {
    expect(store.get('non-existent')).toBeUndefined();
  });

  test('should delete records', () => {
    store.set('client-1', { tokens: 10, lastRefill: Date.now() });
    store.delete('client-1');

    expect(store.get('client-1')).toBeUndefined();
  });

  test('should cleanup expired records', () => {
    const now = Date.now();
    store.set('fresh', { tokens: 10, lastRefill: now });
    store.set('stale', { tokens: 10, lastRefill: now - 5000 });

    // Cleanup records older than 2000ms
    store.cleanup(2000);

    expect(store.get('fresh')).toBeDefined();
    expect(store.get('stale')).toBeUndefined();
  });

  test('should clear all records on destroy', () => {
    store.set('client-1', { tokens: 10, lastRefill: Date.now() });
    store.set('client-2', { tokens: 5, lastRefill: Date.now() });
    store.destroy();

    expect(store.get('client-1')).toBeUndefined();
    expect(store.get('client-2')).toBeUndefined();
  });

  describe('getStats', () => {
    test('should return correct tracked clients count', () => {
      store.set('client-1', { tokens: 10, lastRefill: Date.now() });
      store.set('client-2', { tokens: 5, lastRefill: Date.now() });

      const stats = store.getStats();

      expect(stats.trackedClients).toBe(2);
    });

    test('should return correct limited clients count', () => {
      store.set('client-1', { tokens: 10, lastRefill: Date.now() });
      store.set('client-2', { tokens: 0.5, lastRefill: Date.now() }); // Limited
      store.set('client-3', { tokens: 0, lastRefill: Date.now() }); // Limited

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
    await limiter?.destroy();
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

      await limiter.peek('client-1');
      await limiter.peek('client-1');
      await limiter.peek('client-1');

      const result = await limiter.check('client-1');

      expect(result.remaining).toBe(9); // Only one token consumed from check()
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
      expect(stats.store?.trackedClients).toBe(2);
    });

    test('should not include store stats if store does not support it', async () => {
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
    expect(RateLimitPresets.standard).toEqual({ windowMs: 60_000, max: 100 });
  });

  test('strict preset should be 10 per minute', () => {
    expect(RateLimitPresets.strict).toEqual({ windowMs: 60_000, max: 10 });
  });

  test('relaxed preset should be 1000 per minute', () => {
    expect(RateLimitPresets.relaxed).toEqual({ windowMs: 60_000, max: 1000 });
  });
});
