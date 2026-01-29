// packages/sdk/src/realtime/SubscriptionCache.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { SubscriptionCache } from './SubscriptionCache';

describe('SubscriptionCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscribe', () => {
    it('should call onSubscribe for first subscriber', () => {
      const onSubscribe = vi.fn();
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({ onSubscribe, onUnsubscribe });

      cache.subscribe('key-1');

      expect(onSubscribe).toHaveBeenCalledTimes(1);
      expect(onSubscribe).toHaveBeenCalledWith('key-1');
    });

    it('should not call onSubscribe for subsequent subscribers', () => {
      const onSubscribe = vi.fn();
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({ onSubscribe, onUnsubscribe });

      cache.subscribe('key-1');
      cache.subscribe('key-1');
      cache.subscribe('key-1');

      expect(onSubscribe).toHaveBeenCalledTimes(1);
    });

    it('should track subscriber count', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
      });

      expect(cache.getCount('key-1')).toBe(0);

      cache.subscribe('key-1');
      expect(cache.getCount('key-1')).toBe(1);

      cache.subscribe('key-1');
      expect(cache.getCount('key-1')).toBe(2);

      cache.subscribe('key-1');
      expect(cache.getCount('key-1')).toBe(3);
    });

    it('should return unsubscribe function', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
      });

      const unsubscribe = cache.subscribe('key-1');

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('unsubscribe', () => {
    it('should delay unsubscribe by default cleanup delay', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
      });

      const unsubscribe = cache.subscribe('key-1');
      unsubscribe();

      // Should not be called immediately
      expect(onUnsubscribe).not.toHaveBeenCalled();

      // Advance time by less than cleanup delay
      vi.advanceTimersByTime(5000);
      expect(onUnsubscribe).not.toHaveBeenCalled();

      // Advance past cleanup delay (default 10s)
      vi.advanceTimersByTime(5000);
      expect(onUnsubscribe).toHaveBeenCalledTimes(1);
      expect(onUnsubscribe).toHaveBeenCalledWith('key-1');
    });

    it('should use custom cleanup delay', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 1000,
      });

      const unsubscribe = cache.subscribe('key-1');
      unsubscribe();

      vi.advanceTimersByTime(500);
      expect(onUnsubscribe).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(onUnsubscribe).toHaveBeenCalled();
    });

    it('should only unsubscribe when all subscribers are gone', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 100,
      });

      const unsub1 = cache.subscribe('key-1');
      const unsub2 = cache.subscribe('key-1');
      const unsub3 = cache.subscribe('key-1');

      unsub1();
      vi.advanceTimersByTime(100);
      expect(onUnsubscribe).not.toHaveBeenCalled();
      expect(cache.getCount('key-1')).toBe(2);

      unsub2();
      vi.advanceTimersByTime(100);
      expect(onUnsubscribe).not.toHaveBeenCalled();
      expect(cache.getCount('key-1')).toBe(1);

      unsub3();
      vi.advanceTimersByTime(100);
      expect(onUnsubscribe).toHaveBeenCalledTimes(1);
      expect(cache.getCount('key-1')).toBe(0);
    });

    it('should cancel cleanup if re-subscribed during delay', () => {
      const onSubscribe = vi.fn();
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe,
        onUnsubscribe,
        cleanupDelayMs: 1000,
      });

      const unsub1 = cache.subscribe('key-1');
      expect(onSubscribe).toHaveBeenCalledTimes(1);

      unsub1();
      vi.advanceTimersByTime(500);

      // Re-subscribe during delay window
      cache.subscribe('key-1');

      // Original timeout would have fired
      vi.advanceTimersByTime(500);

      // But unsubscribe should not have been called
      expect(onUnsubscribe).not.toHaveBeenCalled();
      // And onSubscribe should not be called again (still subscribed)
      expect(onSubscribe).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent - calling unsubscribe multiple times has no effect', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 100,
      });

      const unsubscribe = cache.subscribe('key-1');

      // Call unsubscribe multiple times
      unsubscribe();
      unsubscribe();
      unsubscribe();

      vi.advanceTimersByTime(100);

      // Should only unsubscribe once
      expect(onUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('keys', () => {
    it('should return all subscribed keys', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
      });

      cache.subscribe('key-1');
      cache.subscribe('key-2');
      cache.subscribe('key-3');

      expect(cache.keys()).toEqual(['key-1', 'key-2', 'key-3']);
    });

    it('should not include keys that have been unsubscribed', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
        cleanupDelayMs: 100,
      });

      cache.subscribe('key-1');
      const unsub2 = cache.subscribe('key-2');
      cache.subscribe('key-3');

      unsub2();
      vi.advanceTimersByTime(100);

      expect(cache.keys()).toEqual(['key-1', 'key-3']);
    });
  });

  describe('has', () => {
    it('should return true for subscribed keys', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
      });

      cache.subscribe('key-1');

      expect(cache.has('key-1')).toBe(true);
      expect(cache.has('key-2')).toBe(false);
    });
  });

  describe('forceUnsubscribe', () => {
    it('should immediately unsubscribe without delay', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 10000,
      });

      cache.subscribe('key-1');
      cache.forceUnsubscribe('key-1');

      expect(onUnsubscribe).toHaveBeenCalledTimes(1);
      expect(cache.has('key-1')).toBe(false);
    });

    it('should cancel pending cleanup timer', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 1000,
      });

      const unsub = cache.subscribe('key-1');
      unsub(); // Start cleanup timer

      expect(cache.pendingCleanupCount).toBe(1);

      cache.forceUnsubscribe('key-1');

      expect(cache.pendingCleanupCount).toBe(0);
      expect(onUnsubscribe).toHaveBeenCalledTimes(1);

      // Advance past original timer
      vi.advanceTimersByTime(1000);

      // Should not call again
      expect(onUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for non-existent keys', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
      });

      cache.forceUnsubscribe('non-existent');

      expect(onUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should unsubscribe all keys immediately', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
      });

      cache.subscribe('key-1');
      cache.subscribe('key-2');
      cache.subscribe('key-3');

      cache.clear();

      expect(onUnsubscribe).toHaveBeenCalledTimes(3);
      expect(cache.keys()).toEqual([]);
    });

    it('should cancel all pending cleanup timers', () => {
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
        cleanupDelayMs: 1000,
      });

      const unsub1 = cache.subscribe('key-1');
      const unsub2 = cache.subscribe('key-2');

      unsub1();
      unsub2();

      expect(cache.pendingCleanupCount).toBe(2);

      cache.clear();

      expect(cache.pendingCleanupCount).toBe(0);

      // Advance timers - should not trigger additional unsubscribes
      vi.advanceTimersByTime(1000);

      // clear() called onUnsubscribe for both keys
      expect(onUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('pendingCleanupCount', () => {
    it('should track pending cleanup timers', () => {
      const cache = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe: vi.fn(),
        cleanupDelayMs: 1000,
      });

      expect(cache.pendingCleanupCount).toBe(0);

      const unsub1 = cache.subscribe('key-1');
      const unsub2 = cache.subscribe('key-2');

      expect(cache.pendingCleanupCount).toBe(0);

      unsub1();
      expect(cache.pendingCleanupCount).toBe(1);

      unsub2();
      expect(cache.pendingCleanupCount).toBe(2);

      vi.advanceTimersByTime(1000);
      expect(cache.pendingCleanupCount).toBe(0);
    });
  });

  describe('React-like usage patterns', () => {
    it('should handle rapid mount/unmount cycles without thrashing', () => {
      const onSubscribe = vi.fn();
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe,
        onUnsubscribe,
        cleanupDelayMs: 100,
      });

      // Simulate rapid mount/unmount cycles
      for (let i = 0; i < 10; i++) {
        const unsub = cache.subscribe('key-1');
        unsub();
        // Re-subscribe before cleanup delay
        vi.advanceTimersByTime(50);
      }

      // Only one subscription should have been created
      expect(onSubscribe).toHaveBeenCalledTimes(1);
      expect(onUnsubscribe).not.toHaveBeenCalled();
    });

    it('should handle multiple components subscribing to same key', () => {
      const onSubscribe = vi.fn();
      const onUnsubscribe = vi.fn();
      const cache = new SubscriptionCache({
        onSubscribe,
        onUnsubscribe,
        cleanupDelayMs: 100,
      });

      // Component A mounts
      const unsubA = cache.subscribe('shared-key');
      expect(onSubscribe).toHaveBeenCalledTimes(1);

      // Component B mounts
      const unsubB = cache.subscribe('shared-key');
      expect(onSubscribe).toHaveBeenCalledTimes(1); // Still just 1

      // Component A unmounts
      unsubA();
      vi.advanceTimersByTime(100);
      expect(onUnsubscribe).not.toHaveBeenCalled(); // B is still subscribed

      // Component B unmounts
      unsubB();
      vi.advanceTimersByTime(100);
      expect(onUnsubscribe).toHaveBeenCalledTimes(1); // Now unsubscribe
    });
  });
});
