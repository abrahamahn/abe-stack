// shared/src/utils/deferred-promise.ts

/**
 * A Promise with externally accessible resolve and reject functions.
 *
 * This utility is part of the public API and available for use when you need
 * to resolve or reject a promise from outside its executor function. Common use cases:
 * - Bridging callback-based APIs to promise-based code
 * - Creating promises that will be resolved by external events
 * - Implementing request/response patterns where the response comes asynchronously
 *
 * @remarks
 * This class is used internally by {@link BatchedQueue} to manage pending task results.
 *
 * @example Basic usage - resolve from external code
 * ```typescript
 * const deferred = new DeferredPromise<string>();
 *
 * // Pass the promise to a consumer
 * someAsyncOperation(deferred.promise);
 *
 * // Resolve it later when the result is available
 * deferred.resolve('result');
 * ```
 *
 * @example Bridging a callback API
 * ```typescript
 * function fetchWithCallback<T>(url: string): Promise<T> {
 *   const deferred = new DeferredPromise<T>();
 *
 *   legacyFetch(url, (error, data) => {
 *     if (error) deferred.reject(error);
 *     else deferred.resolve(data);
 *   });
 *
 *   return deferred.promise;
 * }
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
