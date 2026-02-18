// main/shared/src/engine/jobs/reactive.map.ts
/**
 * An observable key-value store with subscription support.
 *
 * This utility is part of the public API and available for use when you need
 * a simple reactive data store with key-based subscriptions. Common use cases:
 * - Local caching with change notifications
 * - Real-time data synchronization
 * - State management for specific entities
 * - Pub/sub patterns for specific keys
 */
export class ReactiveMap<K = string, V = unknown> {
  private readonly data = new Map<K, V>();
  private readonly listeners = new Map<K, Set<(value: V | undefined) => void>>();

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
    if (listenerSet === undefined) {
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

    // Then notify all listeners.
    // Wrap each callback in try-catch to ensure one listener's error
    // does not prevent remaining listeners from being notified.
    for (const { key, value } of entries) {
      const listenerSet = this.listeners.get(key);
      if (listenerSet !== undefined) {
        for (const fn of listenerSet) {
          try {
            fn(value);
          } catch {
            // Listener errors must not break atomicity of notifications.
          }
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
