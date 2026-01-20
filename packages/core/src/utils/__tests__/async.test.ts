// packages/core/src/utils/__tests__/async.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { delay } from '../async';

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return a promise', () => {
      const result = delay(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after specified milliseconds', async () => {
      const callback = vi.fn();
      const promise = delay(100).then(callback);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(99);
      await Promise.resolve(); // flush microtasks
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await promise;
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should resolve with undefined', async () => {
      const promise = delay(50);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should resolve immediately with 0ms', async () => {
      const callback = vi.fn();
      const promise = delay(0).then(callback);

      vi.advanceTimersByTime(0);
      await promise;
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should handle small delay values', async () => {
      const callback = vi.fn();
      const promise = delay(1).then(callback);

      vi.advanceTimersByTime(1);
      await promise;
      expect(callback).toHaveBeenCalledOnce();
    });

    it('should handle large delay values', async () => {
      const callback = vi.fn();
      const promise = delay(60000).then(callback);

      vi.advanceTimersByTime(59999);
      await Promise.resolve();
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await promise;
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('multiple delays', () => {
    it('should handle multiple concurrent delays', async () => {
      const results: number[] = [];

      const promise1 = delay(100).then(() => results.push(1));
      const promise2 = delay(50).then(() => results.push(2));
      const promise3 = delay(150).then(() => results.push(3));

      vi.advanceTimersByTime(50);
      await Promise.resolve();
      expect(results).toEqual([2]);

      vi.advanceTimersByTime(50);
      await Promise.resolve();
      expect(results).toEqual([2, 1]);

      vi.advanceTimersByTime(50);
      await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual([2, 1, 3]);
    });
  });
});

describe('delay with real timers', () => {
  it('should actually wait the specified time', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    // Allow some variance for timer precision
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(100);
  });

  it('should resolve very quickly with 0ms', async () => {
    const start = Date.now();
    await delay(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(20);
  });
});
