// client/src/realtime/SubscriptionCache.ts

const DEFAULT_CLEANUP_DELAY_MS = 10_000;

/**
 * Configuration options for SubscriptionCache.
 */
export interface SubscriptionCacheOptions {
  /**
   * Called when the first subscriber subscribes to a key.
   * Use this to establish the actual subscription (e.g., WebSocket, SSE).
   */
  onSubscribe: (key: string) => void;

  /**
   * Called when the last subscriber unsubscribes from a key (after delay).
   * Use this to clean up the actual subscription.
   */
  onUnsubscribe: (key: string) => void;

  /**
   * Delay in milliseconds before actually unsubscribing.
   * Prevents thrashing on component re-mount.
   * Default: 10000 (10 seconds)
   */
  cleanupDelayMs?: number;
}

/**
 * Reference counting for subscriptions with delayed cleanup.
 * Prevents subscription thrashing when React components re-mount.
 *
 * @example
 * ```typescript
 * const subscriptionCache = new SubscriptionCache({
 *   onSubscribe: (key) => pubsub.subscribe(key),
 *   onUnsubscribe: (key) => {
 *     pubsub.unsubscribe(key);
 *     recordCache.purge(key);
 *   },
 * });
 *
 * // In useRecord hook
 * useEffect(() => {
 *   const unsubscribe = subscriptionCache.subscribe(`record:${table}:${id}`);
 *   return unsubscribe; // Cleanup delayed by 10s to prevent thrashing
 * }, [table, id]);
 * ```
 */
export class SubscriptionCache {
  private counts = new Map<string, number>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly cleanupDelayMs: number;

  constructor(private options: SubscriptionCacheOptions) {
    this.cleanupDelayMs = options.cleanupDelayMs ?? DEFAULT_CLEANUP_DELAY_MS;
  }

  /**
   * Subscribe to a key. Returns an unsubscribe function.
   * The first subscriber triggers onSubscribe.
   * Unsubscribing is delayed to prevent thrashing.
   */
  subscribe(key: string): () => void {
    // Clear any pending cleanup timer
    const existingTimer = this.cleanupTimers.get(key);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
      this.cleanupTimers.delete(key);
    }

    const currentCount = this.counts.get(key) ?? 0;

    // First subscriber - trigger onSubscribe
    if (currentCount === 0) {
      this.options.onSubscribe(key);
    }

    this.counts.set(key, currentCount + 1);

    // Return unsubscribe function
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.scheduleUnsubscribe(key);
    };
  }

  private scheduleUnsubscribe(key: string): void {
    // Delay cleanup to prevent thrashing on re-mount
    const timer = setTimeout(() => {
      const count = (this.counts.get(key) ?? 1) - 1;

      if (count <= 0) {
        this.counts.delete(key);
        this.options.onUnsubscribe(key);
      } else {
        this.counts.set(key, count);
      }

      this.cleanupTimers.delete(key);
    }, this.cleanupDelayMs);

    this.cleanupTimers.set(key, timer);
  }

  /**
   * Get all currently subscribed keys.
   */
  keys(): string[] {
    return Array.from(this.counts.keys());
  }

  /**
   * Get the subscriber count for a key.
   */
  getCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  /**
   * Check if a key has any subscribers.
   */
  has(key: string): boolean {
    return this.counts.has(key);
  }

  /**
   * Force immediate unsubscribe for a key, bypassing delay.
   * Useful for cleanup on unmount or when you know the subscription
   * won't be needed again.
   */
  forceUnsubscribe(key: string): void {
    // Clear any pending timer
    const timer = this.cleanupTimers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.cleanupTimers.delete(key);
    }

    // If key exists, trigger unsubscribe
    if (this.counts.has(key)) {
      this.counts.delete(key);
      this.options.onUnsubscribe(key);
    }
  }

  /**
   * Clear all subscriptions immediately.
   * Useful for cleanup when the cache is being destroyed.
   */
  clear(): void {
    // Clear all pending timers
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();

    // Trigger unsubscribe for all keys
    for (const key of this.counts.keys()) {
      this.options.onUnsubscribe(key);
    }
    this.counts.clear();
  }

  /**
   * Get the number of keys with pending cleanup timers.
   */
  get pendingCleanupCount(): number {
    return this.cleanupTimers.size;
  }
}
