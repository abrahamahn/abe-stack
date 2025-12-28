export enum PromiseState {
  PENDING = "pending",
  FULFILLED = "fulfilled",
  REJECTED = "rejected",
}

/**
 * A promise that can be resolved or rejected from outside its executor function
 */
export class DeferredPromise<T> {
  public promise: Promise<T>;
  public resolve!: (value: T | PromiseLike<T>) => void;
  public reject!: (reason?: Error | unknown) => void;
  private _state: PromiseState = PromiseState.PENDING;
  private _timeoutId?: NodeJS.Timeout;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = (value: T | PromiseLike<T>) => {
        if (this._state === PromiseState.PENDING) {
          this._state = PromiseState.FULFILLED;
          this.clearTimeout();
          resolve(value);
        }
      };

      this.reject = (reason?: Error | unknown) => {
        if (this._state === PromiseState.PENDING) {
          this._state = PromiseState.REJECTED;
          this.clearTimeout();
          reject(reason);
        }
      };
    });
  }

  /**
   * Get the current state of the promise
   */
  get state(): PromiseState {
    return this._state;
  }

  /**
   * Check if the promise is still pending
   */
  get isPending(): boolean {
    return this._state === PromiseState.PENDING;
  }

  /**
   * Check if the promise is fulfilled
   */
  get isFulfilled(): boolean {
    return this._state === PromiseState.FULFILLED;
  }

  /**
   * Check if the promise is rejected
   */
  get isRejected(): boolean {
    return this._state === PromiseState.REJECTED;
  }

  /**
   * Check if the promise is settled (fulfilled or rejected)
   */
  get isSettled(): boolean {
    return !this.isPending;
  }

  /**
   * Set a timeout that will reject the promise if it's not resolved or rejected within the specified time
   * @param ms Timeout in milliseconds
   * @param message Optional message for the timeout error
   * @returns The current DeferredPromise instance for chaining
   */
  setTimeout(ms: number, message?: string): DeferredPromise<T> {
    if (this._state === PromiseState.PENDING) {
      this.clearTimeout();
      this._timeoutId = setTimeout(() => {
        this.reject(new Error(message || `Promise timed out after ${ms}ms`));
      }, ms);
    }
    return this;
  }

  /**
   * Clear the timeout if it exists
   */
  private clearTimeout(): void {
    if (this._timeoutId !== undefined) {
      clearTimeout(this._timeoutId);
      this._timeoutId = undefined;
    }
  }

  /**
   * Create and return a new DeferredPromise that resolves with the result of the provided function
   * after a specified delay.
   *
   * @param ms The delay in milliseconds
   * @param value A value or function that produces a value to resolve with
   * @returns A new DeferredPromise that will resolve after the specified delay
   */
  static delay<T>(
    ms: number,
    value?: T | (() => T | Promise<T>),
  ): DeferredPromise<T> {
    const deferred = new DeferredPromise<T>();

    setTimeout(() => {
      try {
        if (typeof value === "function") {
          // Cast to any to handle both sync and async functions
          const result = (value as () => T | Promise<T>)();
          deferred.resolve(result);
        } else {
          deferred.resolve(value as T);
        }
      } catch (err) {
        deferred.reject(err);
      }
    }, ms);

    return deferred;
  }

  /**
   * Creates a promise that will reject after the specified timeout
   *
   * @param ms Timeout in milliseconds
   * @param message Optional error message
   * @returns A promise that will reject after the timeout
   */
  static timeout<T = never>(ms: number, message?: string): Promise<T> {
    const deferred = new DeferredPromise<T>();
    deferred.setTimeout(ms, message);
    return deferred.promise;
  }

  /**
   * Creates a promise that resolves when all promises have settled (either resolved or rejected)
   * and provides the results of each promise.
   *
   * @param promises Array of promises to wait for
   * @returns Promise that resolves with an array of settled promise results
   */
  static allSettled<T>(
    promises: Array<Promise<T>>,
  ): Promise<
    Array<{ status: "fulfilled" | "rejected"; value?: T; reason?: unknown }>
  > {
    // Use native Promise.allSettled if available (Node.js 12.9.0+)
    if (typeof Promise.allSettled === "function") {
      return Promise.allSettled(promises);
    }

    // Otherwise provide a simple implementation
    return Promise.all(
      promises.map((p) =>
        p
          .then((value) => ({ status: "fulfilled" as const, value }))
          .catch((reason) => ({ status: "rejected" as const, reason })),
      ),
    );
  }

  /**
   * Take an existing promise and return a DeferredPromise that will resolve or reject when the original promise settles.
   * This is useful when you need to attach resolve/reject handlers to an existing promise.
   *
   * @param promise The promise to wrap
   * @returns A DeferredPromise that follows the original promise
   */
  static fromPromise<T>(promise: Promise<T>): DeferredPromise<T> {
    const deferred = new DeferredPromise<T>();

    promise.then(
      (value) => deferred.resolve(value),
      (error) => deferred.reject(error),
    );

    return deferred;
  }
}
