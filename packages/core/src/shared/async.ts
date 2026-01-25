// packages/core/src/shared/async.ts
/**
 * Simple Async Utilities
 *
 * Lightweight async helpers for common use cases.
 * For advanced async primitives (DeferredPromise, BatchedQueue, ReactiveMap),
 * see infrastructure/async.
 */

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
