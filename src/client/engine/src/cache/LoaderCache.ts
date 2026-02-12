// src/client/engine/src/cache/LoaderCache.ts

import { MS_PER_MINUTE } from '@abe-stack/shared';

/**
 * Default TTL for cached entries (5 minutes).
 */
const DEFAULT_TTL_MS = 5 * MS_PER_MINUTE;

/**
 * Represents the state of a Loader.
 */
export type LoaderState = 'pending' | 'resolved' | 'rejected';

/**
 * Configuration options for a Loader.
 */
export interface LoaderOptions {
  /**
   * Time-to-live in milliseconds for the cached result.
   * After this time, the loader is considered stale.
   * Default: 5 minutes (300000ms)
   */
  ttlMs?: number;
}

/**
 * A deferred promise wrapper that caches the result of an async operation.
 * Provides explicit resolve/reject control and tracks resolution state.
 *
 * @example
 * ```typescript
 * const loader = new Loader<User>();
 *
 * // Start async operation
 * fetchUser(id).then(loader.resolve).catch(loader.reject);
 *
 * // Multiple consumers can await the same promise
 * const user1 = await loader.promise;
 * const user2 = await loader.promise; // Same result, no duplicate fetch
 * ```
 */
export class Loader<T> {
  /**
   * Resolves the loader with a value.
   * Can only be called once; subsequent calls are ignored.
   */
  public resolve!: (value: T) => void;

  /**
   * Rejects the loader with an error.
   * Can only be called once; subsequent calls are ignored.
   */
  public reject!: (error: Error) => void;

  /**
   * The promise that consumers await.
   * Multiple consumers can await this promise safely.
   */
  public readonly promise: Promise<T>;

  private _state: LoaderState = 'pending';
  private _value: T | undefined;
  private _error: Error | undefined;
  private readonly _createdAt: number;
  private readonly _ttlMs: number;

  constructor(options: LoaderOptions = {}) {
    this._createdAt = Date.now();
    this._ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = (value: T): void => {
        if (this._state !== 'pending') return;
        this._state = 'resolved';
        this._value = value;
        resolve(value);
      };

      this.reject = (error: Error): void => {
        if (this._state !== 'pending') return;
        this._state = 'rejected';
        this._error = error;
        reject(error);
      };
    });
  }

  /**
   * The current state of the loader.
   */
  get state(): LoaderState {
    return this._state;
  }

  /**
   * Whether the loader has been resolved successfully.
   */
  get isResolved(): boolean {
    return this._state === 'resolved';
  }

  /**
   * Whether the loader has been rejected with an error.
   */
  get isRejected(): boolean {
    return this._state === 'rejected';
  }

  /**
   * Whether the loader is still pending.
   */
  get isPending(): boolean {
    return this._state === 'pending';
  }

  /**
   * Whether the loader has completed (resolved or rejected).
   */
  get isSettled(): boolean {
    return this._state !== 'pending';
  }

  /**
   * The resolved value. Only defined if state is 'resolved'.
   */
  get value(): T | undefined {
    return this._value;
  }

  /**
   * The rejection error. Only defined if state is 'rejected'.
   */
  get error(): Error | undefined {
    return this._error;
  }

  /**
   * The timestamp when this loader was created.
   */
  get createdAt(): number {
    return this._createdAt;
  }

  /**
   * The time-to-live in milliseconds.
   */
  get ttlMs(): number {
    return this._ttlMs;
  }

  /**
   * Whether this loader has exceeded its TTL.
   */
  get isStale(): boolean {
    return Date.now() - this._createdAt > this._ttlMs;
  }

  /**
   * Time remaining until the loader becomes stale.
   * Returns 0 if already stale.
   */
  get timeRemaining(): number {
    const remaining = this._ttlMs - (Date.now() - this._createdAt);
    return Math.max(0, remaining);
  }
}

/**
 * Configuration options for LoaderCache.
 */
export interface LoaderCacheOptions {
  /**
   * Default TTL in milliseconds for new loaders.
   * Default: 5 minutes (300000ms)
   */
  defaultTtlMs?: number;

  /**
   * Whether to automatically remove stale entries on get operations.
   * Default: true
   */
  autoEvictStale?: boolean;
}

/**
 * A cache for deferred loading promises with TTL support and request deduplication.
 *
 * Use LoaderCache when you need to:
 * - Deduplicate concurrent requests for the same resource
 * - Cache async operation results with automatic expiration
 * - Share loading promises across multiple consumers
 *
 * @example
 * ```typescript
 * const userCache = new LoaderCache<User>({ defaultTtlMs: 60000 });
 *
 * async function getUser(id: string): Promise<User> {
 *   const key = `user:${id}`;
 *
 *   // Return existing loader if available and not stale
 *   const existing = userCache.get(key);
 *   if (existing) {
 *     return existing.promise;
 *   }
 *
 *   // Create new loader and start fetch
 *   const loader = userCache.create(key);
 *   fetchUserFromApi(id)
 *     .then(loader.resolve)
 *     .catch(loader.reject);
 *
 *   return loader.promise;
 * }
 * ```
 */
export class LoaderCache<T> {
  private readonly cache = new Map<string, Loader<T>>();
  private readonly defaultTtlMs: number;
  private readonly autoEvictStale: boolean;

  constructor(options: LoaderCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
    this.autoEvictStale = options.autoEvictStale ?? true;
  }

  /**
   * Get a loader by key.
   * Returns undefined if no loader exists or if the loader is stale (when autoEvictStale is true).
   */
  get(key: string): Loader<T> | undefined {
    const loader = this.cache.get(key);

    if (loader === undefined) {
      return undefined;
    }

    // Auto-evict stale entries
    if (this.autoEvictStale && loader.isStale) {
      this.cache.delete(key);
      return undefined;
    }

    return loader;
  }

  /**
   * Check if a key exists in the cache.
   * Returns false for stale entries (when autoEvictStale is true).
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Create a new loader for a key.
   * If a loader already exists for this key, it will be replaced.
   *
   * @param key - The cache key
   * @param options - Optional loader options (overrides cache defaults)
   * @returns The newly created loader
   */
  create(key: string, options?: LoaderOptions): Loader<T> {
    const loader = new Loader<T>({
      ttlMs: options?.ttlMs ?? this.defaultTtlMs,
    });
    this.cache.set(key, loader);
    return loader;
  }

  /**
   * Get an existing loader or create a new one.
   * This is the primary method for deduplicating requests.
   *
   * @param key - The cache key
   * @param options - Optional loader options (used only if creating new loader)
   * @returns Object with the loader and whether it was newly created
   */
  getOrCreate(key: string, options?: LoaderOptions): { loader: Loader<T>; created: boolean } {
    const existing = this.get(key);
    if (existing !== undefined) {
      return { loader: existing, created: false };
    }

    const loader = this.create(key, options);
    return { loader, created: true };
  }

  /**
   * Delete a loader from the cache.
   *
   * @param key - The cache key to delete
   * @returns true if the key existed and was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate (delete) a specific key.
   * Alias for delete() for semantic clarity.
   */
  invalidate(key: string): boolean {
    return this.delete(key);
  }

  /**
   * Invalidate all keys matching a predicate function.
   *
   * @param predicate - Function that receives key and returns true if it should be invalidated
   * @returns Number of entries invalidated
   */
  invalidateWhere(predicate: (key: string) => boolean): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all keys that start with a given prefix.
   *
   * @param prefix - The key prefix to match
   * @returns Number of entries invalidated
   */
  invalidateByPrefix(prefix: string): number {
    return this.invalidateWhere((key) => key.startsWith(prefix));
  }

  /**
   * Remove all stale entries from the cache.
   *
   * @returns Number of stale entries removed
   */
  evictStale(): number {
    let count = 0;
    for (const [key, loader] of this.cache.entries()) {
      if (loader.isStale) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get all keys in the cache.
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all loaders in the cache.
   */
  values(): Loader<T>[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get all entries in the cache.
   */
  entries(): Array<[string, Loader<T>]> {
    return Array.from(this.cache.entries());
  }

  /**
   * The number of entries in the cache (including stale entries).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Execute a callback for each entry in the cache.
   */
  forEach(callback: (loader: Loader<T>, key: string) => void): void {
    this.cache.forEach((loader, key) => {
      callback(loader, key);
    });
  }
}

/**
 * Helper function to load data with automatic caching and deduplication.
 * This is a convenience wrapper around LoaderCache for simple use cases.
 *
 * @example
 * ```typescript
 * const userCache = new LoaderCache<User>();
 *
 * const user = await loadWithCache(userCache, 'user:123', () =>
 *   fetch(`/api/users/123`).then(r => r.json())
 * );
 * ```
 */
export async function loadWithCache<T>(
  cache: LoaderCache<T>,
  key: string,
  loader: () => Promise<T>,
  options?: LoaderOptions,
): Promise<T> {
  const { loader: cached, created } = cache.getOrCreate(key, options);

  if (created) {
    try {
      const value = await loader();
      cached.resolve(value);
    } catch (err) {
      const message =
        err !== null &&
        err !== undefined &&
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message === 'string'
          ? err.message
          : JSON.stringify(err);
      cached.reject(err instanceof Error ? err : new Error(message));
    }
  }

  return cached.promise;
}
