// primitives/helpers/async.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delay, DeferredPromise } from './async';

// =============================================================================
// delay()
// =============================================================================
describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the specified milliseconds', async () => {
    const settled = vi.fn();
    const p = delay(100).then(settled);

    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(99);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('resolves immediately for 0ms', async () => {
    const settled = vi.fn();
    const p = delay(0).then(settled);

    await vi.advanceTimersByTimeAsync(0);
    await p;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('resolves with undefined (not a value)', async () => {
    const p = delay(10);
    await vi.advanceTimersByTimeAsync(10);
    const result = await p;
    expect(result).toBeUndefined();
  });

  it('does not resolve before time elapses', async () => {
    let resolved = false;
    delay(500).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
  });

  it('resolves for a negative ms value (treated as 0 by setTimeout)', async () => {
    const settled = vi.fn();
    const p = delay(-1).then(settled);

    // setTimeout with negative delay fires immediately (clamped to 0 by the runtime)
    await vi.advanceTimersByTimeAsync(0);
    await p;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('resolves for a very large ms value only after that time', async () => {
    const settled = vi.fn();
    const p = delay(999_999).then(settled);

    await vi.advanceTimersByTimeAsync(999_998);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('multiple concurrent delay calls resolve independently', async () => {
    const order: number[] = [];
    const p1 = delay(200).then(() => order.push(1));
    const p2 = delay(100).then(() => order.push(2));

    await vi.advanceTimersByTimeAsync(100);
    await p2;
    expect(order).toEqual([2]);

    await vi.advanceTimersByTimeAsync(100);
    await p1;
    expect(order).toEqual([2, 1]);
  });
});

// =============================================================================
// DeferredPromise
// =============================================================================
describe('DeferredPromise', () => {
  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------
  describe('construction', () => {
    it('exposes a promise, resolve, and reject', () => {
      const d = new DeferredPromise<number>();
      expect(d.promise).toBeInstanceOf(Promise);
      expect(typeof d.resolve).toBe('function');
      expect(typeof d.reject).toBe('function');
    });

    it('promise is pending on construction — does not auto-settle', async () => {
      const d = new DeferredPromise<number>();
      let settled = false;
      d.promise.then(() => {
        settled = true;
      });
      // Flush microtask queue without resolving
      await Promise.resolve();
      expect(settled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Happy-path resolution
  // ---------------------------------------------------------------------------
  describe('resolve', () => {
    it('resolves the promise with the given value', async () => {
      const d = new DeferredPromise<number>();
      d.resolve(42);
      await expect(d.promise).resolves.toBe(42);
    });

    it('resolve before await — consumer still receives the value', async () => {
      const d = new DeferredPromise<string>();
      d.resolve('pre-resolved');
      // Simulate a consumer that awaits *after* resolve was already called
      const value = await d.promise;
      expect(value).toBe('pre-resolved');
    });

    it('resolves with undefined', async () => {
      const d = new DeferredPromise<undefined>();
      d.resolve(undefined);
      await expect(d.promise).resolves.toBeUndefined();
    });

    it('resolves with null', async () => {
      const d = new DeferredPromise<null>();
      d.resolve(null);
      await expect(d.promise).resolves.toBeNull();
    });

    it('resolves with a nested promise (PromiseLike chaining)', async () => {
      const d = new DeferredPromise<number>();
      d.resolve(Promise.resolve(99));
      await expect(d.promise).resolves.toBe(99);
    });

    it('double resolve — second call is silently ignored, first value wins', async () => {
      const d = new DeferredPromise<number>();
      d.resolve(1);
      d.resolve(2); // native Promise ignores subsequent settle calls
      await expect(d.promise).resolves.toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Happy-path rejection
  // ---------------------------------------------------------------------------
  describe('reject', () => {
    it('rejects the promise with an Error', async () => {
      const d = new DeferredPromise<number>();
      const error = new Error('boom');
      d.reject(error);
      await expect(d.promise).rejects.toThrow('boom');
    });

    it('reject before await — consumer still receives the rejection', async () => {
      const d = new DeferredPromise<number>();
      const error = new Error('early rejection');
      d.reject(error);
      await expect(d.promise).rejects.toThrow('early rejection');
    });

    it('rejects with a non-Error value (string)', async () => {
      const d = new DeferredPromise<number>();
      d.reject('string reason');
      await expect(d.promise).rejects.toBe('string reason');
    });

    it('rejects with a non-Error value (plain object)', async () => {
      const d = new DeferredPromise<number>();
      const reason = { code: 404, message: 'not found' };
      d.reject(reason);
      await expect(d.promise).rejects.toEqual(reason);
    });

    it('rejects with undefined', async () => {
      const d = new DeferredPromise<number>();
      d.reject(undefined);
      await expect(d.promise).rejects.toBeUndefined();
    });

    it('double reject — second call is silently ignored, first reason wins', async () => {
      const d = new DeferredPromise<number>();
      const first = new Error('first');
      const second = new Error('second');
      d.reject(first);
      d.reject(second);
      await expect(d.promise).rejects.toThrow('first');
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-settle: resolve then reject / reject then resolve
  // ---------------------------------------------------------------------------
  describe('cross-settle ordering', () => {
    it('resolve then reject — promise stays resolved, reject is no-op', async () => {
      const d = new DeferredPromise<number>();
      d.resolve(7);
      d.reject(new Error('too late'));
      await expect(d.promise).resolves.toBe(7);
    });

    it('reject then resolve — promise stays rejected, resolve is no-op', async () => {
      const d = new DeferredPromise<number>();
      d.reject(new Error('first mover'));
      d.resolve(99);
      await expect(d.promise).rejects.toThrow('first mover');
    });
  });

  // ---------------------------------------------------------------------------
  // Await before settle
  // ---------------------------------------------------------------------------
  describe('await before settle', () => {
    it('consumer awaits then resolve delivers value', async () => {
      const d = new DeferredPromise<string>();
      let result: string | undefined;

      const consumer = async () => {
        result = await d.promise;
      };

      const consumerTask = consumer();
      expect(result).toBeUndefined();

      d.resolve('delivered');
      await consumerTask;
      expect(result).toBe('delivered');
    });

    it('consumer awaits then reject delivers error', async () => {
      const d = new DeferredPromise<string>();
      let caught: unknown;

      const consumer = async () => {
        try {
          await d.promise;
        } catch (e) {
          caught = e;
        }
      };

      const consumerTask = consumer();
      expect(caught).toBeUndefined();

      d.reject(new Error('async rejection'));
      await consumerTask;
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe('async rejection');
    });
  });

  // ---------------------------------------------------------------------------
  // Concurrent awaits on the same promise
  // ---------------------------------------------------------------------------
  describe('concurrent awaits', () => {
    it('all concurrent awaiters receive the resolved value', async () => {
      const d = new DeferredPromise<number>();

      const results = await Promise.all([
        d.promise,
        d.promise,
        d.promise.then((v) => v * 2),
      ].map((p, i) => {
        if (i === 0) {
          // Resolve after all awaiters are registered
          Promise.resolve().then(() => d.resolve(5));
        }
        return p;
      }));

      expect(results).toEqual([5, 5, 10]);
    });

    it('all concurrent awaiters receive the rejection', async () => {
      const d = new DeferredPromise<number>();
      const err = new Error('shared failure');

      const settled = await Promise.allSettled([
        d.promise,
        d.promise,
        d.promise,
      ].map((p, i) => {
        if (i === 0) {
          Promise.resolve().then(() => d.reject(err));
        }
        return p;
      }));

      for (const outcome of settled) {
        expect(outcome.status).toBe('rejected');
        if (outcome.status === 'rejected') {
          expect(outcome.reason).toBe(err);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Promise state transitions (observable via Promise.race)
  // ---------------------------------------------------------------------------
  describe('promise state transitions', () => {
    it('is pending before settlement — race with an already-settled promise shows the settled one wins', async () => {
      const d = new DeferredPromise<string>();
      const sentinel = Promise.resolve('sentinel');

      // d.promise is still pending; sentinel should win the race
      const winner = await Promise.race([d.promise, sentinel]);
      expect(winner).toBe('sentinel');
    });

    it('transitions to fulfilled after resolve — subsequent race is won by the deferred', async () => {
      const d = new DeferredPromise<string>();
      d.resolve('winner');

      // Both are now settled; the one that was resolved first wins
      const result = await Promise.race([d.promise, new Promise<string>(() => {})]);
      expect(result).toBe('winner');
    });

    it('then() callbacks are only called once regardless of multiple resolves', async () => {
      const d = new DeferredPromise<number>();
      const handler = vi.fn();
      d.promise.then(handler);

      d.resolve(1);
      d.resolve(2);
      d.resolve(3);

      await Promise.resolve(); // flush microtasks
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(1);
    });

    it('catch() is only called once regardless of multiple rejects', async () => {
      const d = new DeferredPromise<number>();
      const handler = vi.fn();
      d.promise.catch(handler);

      d.reject(new Error('e1'));
      d.reject(new Error('e2'));

      await Promise.resolve();
      expect(handler).toHaveBeenCalledOnce();
      expect((handler.mock.calls[0][0] as Error).message).toBe('e1');
    });
  });

  // ---------------------------------------------------------------------------
  // each DeferredPromise instance is independent
  // ---------------------------------------------------------------------------
  describe('instance isolation', () => {
    it('resolving one instance does not affect another', async () => {
      const a = new DeferredPromise<number>();
      const b = new DeferredPromise<number>();

      a.resolve(1);

      let bSettled = false;
      b.promise.then(() => {
        bSettled = true;
      });

      await a.promise;
      await Promise.resolve();
      expect(bSettled).toBe(false);
    });

    it('rejecting one instance does not affect another', async () => {
      const a = new DeferredPromise<number>();
      const b = new DeferredPromise<number>();

      a.reject(new Error('only a'));
      a.promise.catch(() => {}); // suppress unhandled rejection

      let bSettled = false;
      b.promise.then(() => {
        bSettled = true;
      });

      await Promise.resolve();
      expect(bSettled).toBe(false);
    });
  });
});
