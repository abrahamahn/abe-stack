// main/shared/src/engine/security/rate-limit.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from './rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Basic Behavior
  // ==========================================================================
  describe('basic rate limiting', () => {
    it('allows requests within the limit', () => {
      const limiter = createRateLimiter(60000, 3);
      expect(limiter('user-1').allowed).toBe(true);
      expect(limiter('user-1').allowed).toBe(true);
      expect(limiter('user-1').allowed).toBe(true);
    });

    it('blocks requests exceeding the limit', () => {
      const limiter = createRateLimiter(60000, 3);
      limiter('user-1');
      limiter('user-1');
      limiter('user-1');
      const result = limiter('user-1');
      expect(result.allowed).toBe(false);
    });

    it('returns resetTime', () => {
      const limiter = createRateLimiter(60000, 3);
      const result = limiter('user-1');
      expect(result.resetTime).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Per-Identifier Isolation
  // ==========================================================================
  describe('per-identifier isolation', () => {
    it('tracks different identifiers separately', () => {
      const limiter = createRateLimiter(60000, 2);
      limiter('user-1');
      limiter('user-1');
      expect(limiter('user-1').allowed).toBe(false);
      expect(limiter('user-2').allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Time Window
  // ==========================================================================
  describe('time window', () => {
    it('resets after time window expires', () => {
      const limiter = createRateLimiter(1000, 2);
      limiter('user-1');
      limiter('user-1');
      expect(limiter('user-1').allowed).toBe(false);

      // Advance past the window
      vi.advanceTimersByTime(1001);

      expect(limiter('user-1').allowed).toBe(true);
    });

    it('slides the window correctly', () => {
      const limiter = createRateLimiter(1000, 2);

      // First request at t=0
      limiter('user-1');

      // Second request at t=500
      vi.advanceTimersByTime(500);
      limiter('user-1');

      // Third request at t=500 should be blocked
      expect(limiter('user-1').allowed).toBe(false);

      // At t=1001, first request falls out of window
      vi.advanceTimersByTime(501);
      expect(limiter('user-1').allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================
  describe('cleanup', () => {
    it('cleans up expired entries after cleanup interval', () => {
      const limiter = createRateLimiter(1000, 5);

      // Make requests from many identifiers
      for (let i = 0; i < 10; i++) {
        limiter(`user-${i}`);
      }

      // Advance past window + cleanup interval (60 seconds)
      vi.advanceTimersByTime(61000);

      // Next call triggers cleanup, should still work
      expect(limiter('user-0').allowed).toBe(true);
    });
  });
});
