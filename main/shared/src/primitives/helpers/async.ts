// main/shared/src/primitives/helpers/async.ts

/**
 * @file Async Utilities
 * @description Lightweight asynchronous helper functions and classes.
 * @module Primitives/Helpers/Async
 */

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves strictly after the delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A Promise that can be resolved or rejected externally.
 * Useful for bridging callback-based APIs or manual flow control.
 *
 * @template T - The type of value the promise resolves to.
 */
export class DeferredPromise<T> {
  /** Resolves the promise with a value or another promise. */
  public resolve: (value: T | PromiseLike<T>) => void;
  /** Rejects the promise with a reason. */
  public reject: (error: unknown) => void;
  /** The native Promise instance. */
  public readonly promise: Promise<T>;

  constructor() {
    // Initialize with no-ops to satisfy strict property initialization.
    let r: (value: T | PromiseLike<T>) => void = () => {};
    let j: (error: unknown) => void = () => {};

    this.promise = new Promise<T>((resolve, reject) => {
      r = resolve;
      j = reject;
    });

    this.resolve = r;
    this.reject = j;
  }
}
