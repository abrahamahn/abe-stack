// packages/core/src/async/ReactiveMap.ts

/**
 * An observable key-value store with subscription support.
 * Allows subscribing to changes on specific keys.
 *
 * @example
 * ```typescript
 * const cache = new ReactiveMap<string, User>();
 *
 * // Subscribe to changes
 * const unsubscribe = cache.subscribe('user-1', (user) => {
 *   console.log('User updated:', user);
 * });
 *
 * // Update value - triggers subscriber
 * cache.write([{ key: 'user-1', value: { id: '1', name: 'John' } }]);
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class ReactiveMap<K = string, V = unknown> {
  private data = new Map<K, V>();
  private listeners = new Map<K, Set<(value: V | undefined) => void>>();

  /**
   * Get a value by key.
   */
  get(key: K): V | undefined {
    return this.data.get(key);
  }

  /**
   * Check if a key exists.
   */
  has(key: K): boolean {
    return this.data.has(key);
  }

  /**
   * Get all keys.
   */
  keys(): K[] {
    return Array.from(this.data.keys());
  }

  /**
   * Get all values.
   */
  values(): V[] {
    return Array.from(this.data.values());
  }

  /**
   * Get all entries.
   */
  entries(): Array<[K, V]> {
    return Array.from(this.data.entries());
  }

  /**
   * Get the number of entries.
   */
  get size(): number {
    return this.data.size;
  }

  /**
   * Subscribe to changes on a specific key.
   * Returns an unsubscribe function.
   */
  subscribe(key: K, fn: (value: V | undefined) => void): () => void {
    let listenerSet = this.listeners.get(key);
    if (!listenerSet) {
      listenerSet = new Set();
      this.listeners.set(key, listenerSet);
    }
    listenerSet.add(fn);

    return () => {
      listenerSet.delete(fn);
      if (listenerSet.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Write multiple entries atomically.
   * All writes are applied before any listeners are notified.
   * Pass `undefined` as value to delete a key.
   */
  write(entries: Array<{ key: K; value: V | undefined }>): void {
    // Apply all writes first
    for (const { key, value } of entries) {
      if (value === undefined) {
        this.data.delete(key);
      } else {
        this.data.set(key, value);
      }
    }

    // Then notify all listeners
    for (const { key, value } of entries) {
      const listenerSet = this.listeners.get(key);
      if (listenerSet) {
        for (const fn of listenerSet) {
          fn(value);
        }
      }
    }
  }

  /**
   * Set a single value.
   * Convenience method equivalent to `write([{ key, value }])`.
   */
  set(key: K, value: V): void {
    this.write([{ key, value }]);
  }

  /**
   * Delete a single key.
   * Convenience method equivalent to `write([{ key, value: undefined }])`.
   */
  delete(key: K): void {
    this.write([{ key, value: undefined }]);
  }

  /**
   * Clear all entries and notify listeners.
   */
  clear(): void {
    const entries = Array.from(this.data.keys()).map((key) => ({
      key,
      value: undefined as V | undefined,
    }));
    this.write(entries);
  }

  /**
   * Get the number of listeners for a key.
   */
  listenerCount(key: K): number {
    return this.listeners.get(key)?.size ?? 0;
  }

  /**
   * Get total number of listeners across all keys.
   */
  get totalListenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}
