// packages/core/src/async/DeferredPromise.ts

/**
 * A Promise with externally accessible resolve and reject functions.
 * Useful for cleaner async control flow where the promise needs to be
 * resolved or rejected from outside its executor function.
 *
 * @example
 * ```typescript
 * const deferred = new DeferredPromise<string>();
 *
 * // Pass the promise somewhere
 * someAsyncOperation(deferred.promise);
 *
 * // Resolve it later from external code
 * deferred.resolve('result');
 * ```
 */
export class DeferredPromise<T> {
  public resolve!: (value: T | PromiseLike<T>) => void;
  public reject!: (error: unknown) => void;
  public readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
