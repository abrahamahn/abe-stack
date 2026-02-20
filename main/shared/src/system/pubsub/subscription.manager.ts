// main/shared/src/system/pubsub/subscription.manager.ts
/**
 * Subscription Manager
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * Supports horizontal scaling via PostgresPubSub adapter:
 * - Local subscriptions tracked in-memory
 * - Cross-instance messaging via Postgres NOTIFY/LISTEN
 */

import type { PostgresPubSub } from './postgres.pubsub';
import type { ServerMessage, SubscriptionKey, WebSocket } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionManagerOptions {
  /** PostgresPubSub adapter for horizontal scaling (optional) */
  adapter?: PostgresPubSub;
  /**
   * Maximum number of messages to retain in the delta sync history buffer.
   * Older messages are evicted when this limit is exceeded.
   * Defaults to 1000.
   */
  maxHistorySize?: number;
}

/**
 * A timestamped record of a published message, used for delta sync recovery.
 */
export interface MessageHistoryEntry {
  /** Subscription key the message was published on */
  key: SubscriptionKey;
  /** Version number that was published */
  version: number;
  /** Server timestamp when the message was published (Date.now()) */
  timestamp: number;
}

// ============================================================================
// SubscriptionManager Class
// ============================================================================

/**
 * Default maximum history size for delta sync buffer.
 */
const DEFAULT_MAX_HISTORY_SIZE = 1000;

export class SubscriptionManager {
  private readonly subscriptions = new Map<SubscriptionKey, Set<WebSocket>>();
  private readonly socketSubscriptions = new WeakMap<WebSocket, Set<SubscriptionKey>>();
  private adapter: PostgresPubSub | null = null;

  /**
   * Circular buffer of recent messages for delta sync recovery.
   * Ordered by timestamp ascending. Older entries are evicted when
   * the buffer exceeds maxHistorySize.
   */
  private readonly messageHistory: MessageHistoryEntry[] = [];
  private readonly maxHistorySize: number;

  constructor(options: SubscriptionManagerOptions = {}) {
    this.adapter = options.adapter ?? null;
    this.maxHistorySize = options.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;
  }

  /**
   * Set the adapter (for deferred initialization)
   */
  setAdapter(adapter: PostgresPubSub): void {
    this.adapter = adapter;
  }

  /**
   * Subscribe a socket to a key
   */
  subscribe(key: SubscriptionKey, socket: WebSocket): void {
    // Add to key -> sockets map
    let sockets = this.subscriptions.get(key);
    if (sockets === undefined) {
      sockets = new Set();
      this.subscriptions.set(key, sockets);
    }
    sockets.add(socket);

    // Track reverse mapping for cleanup
    let keys = this.socketSubscriptions.get(socket);
    if (keys === undefined) {
      keys = new Set();
      this.socketSubscriptions.set(socket, keys);
    }
    keys.add(key);
  }

  /**
   * Unsubscribe a socket from a key
   */
  unsubscribe(key: SubscriptionKey, socket: WebSocket): void {
    this.subscriptions.get(key)?.delete(socket);
    this.socketSubscriptions.get(socket)?.delete(key);

    // Clean up empty sets
    if (this.subscriptions.get(key)?.size === 0) {
      this.subscriptions.delete(key);
    }
  }

  /**
   * Publish an update to all subscribers (local only).
   * Used internally and by PostgresPubSub for cross-instance messages.
   *
   * Wraps each send in a try-catch so a single failing socket cannot
   * prevent delivery to the remaining subscribers. Dead sockets
   * (readyState !== OPEN) are pruned during iteration to prevent
   * gradual memory leaks from disconnected clients.
   *
   * Also records the message in the delta sync history buffer so that
   * reconnecting clients can recover missed messages.
   *
   * @param key - The subscription key to publish to
   * @param version - The data version number
   * @complexity O(n) where n = subscribers for this key
   */
  publishLocal(key: SubscriptionKey, version: number): void {
    const timestamp = Date.now();

    // Record in history buffer for delta sync recovery
    this.recordHistory(key, version, timestamp);

    const sockets = this.subscriptions.get(key);
    if (sockets === undefined || sockets.size === 0) return;

    const message: ServerMessage = { type: 'update', key, version, timestamp };
    const payload = JSON.stringify(message);
    const dead: WebSocket[] = [];

    for (const socket of sockets) {
      if (socket.readyState === 1) {
        // WebSocket.OPEN
        try {
          socket.send(payload);
        } catch {
          // Socket closed between readyState check and send — mark for cleanup
          dead.push(socket);
        }
      } else {
        // CONNECTING (0), CLOSING (2), or CLOSED (3) — prune
        dead.push(socket);
      }
    }

    // Clean up dead sockets outside the iteration loop
    for (const socket of dead) {
      sockets.delete(socket);
      this.socketSubscriptions.get(socket)?.delete(key);
    }

    if (sockets.size === 0) {
      this.subscriptions.delete(key);
    }
  }

  /**
   * Publish an update to all subscribers (local + cross-instance)
   * Called after successful database writes
   */
  publish(key: SubscriptionKey, version: number): void {
    // Always publish locally first
    this.publishLocal(key, version);

    // If adapter is configured, also publish to other instances
    if (this.adapter !== null) {
      // Fire and forget - don't block the response
      this.adapter.publish(key, version).catch(() => {
        // Errors are handled by adapter's onError callback
      });
    }
  }

  /**
   * Clean up all subscriptions for a disconnected socket
   */
  cleanup(socket: WebSocket): void {
    const keys = this.socketSubscriptions.get(socket);
    if (keys === undefined) return;

    for (const key of keys) {
      this.subscriptions.get(key)?.delete(socket);
      if (this.subscriptions.get(key)?.size === 0) {
        this.subscriptions.delete(key);
      }
    }
    this.socketSubscriptions.delete(socket);
  }

  /**
   * Handle incoming client message
   */
  handleMessage(
    socket: WebSocket,
    data: string,
    onSubscribe?: (key: SubscriptionKey) => void,
  ): void {
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      const msg = parsed as Record<string, unknown>;
      if (typeof msg['type'] !== 'string') return;

      switch (msg['type']) {
        case 'subscribe': {
          if (typeof msg['key'] !== 'string') return;
          const key = msg['key'] as SubscriptionKey;
          this.subscribe(key, socket);
          onSubscribe?.(key);
          break;
        }
        case 'unsubscribe': {
          if (typeof msg['key'] !== 'string') return;
          const key = msg['key'] as SubscriptionKey;
          this.unsubscribe(key, socket);
          break;
        }
        case 'sync_request': {
          this.handleSyncRequest(socket, msg);
          break;
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  /**
   * Get subscriber count for a key (useful for debugging)
   */
  getSubscriberCount(key: SubscriptionKey): number {
    return this.subscriptions.get(key)?.size ?? 0;
  }

  /**
   * Get total subscription count across all keys (useful for health checks)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // ==========================================================================
  // Delta Sync Support
  // ==========================================================================

  /**
   * Get all messages published after the given timestamp, optionally
   * filtered to a set of subscription keys.
   *
   * Uses binary search for efficient lookup in the ordered history buffer.
   *
   * @param sinceTimestamp - Return messages with timestamp > sinceTimestamp
   * @param keys - Optional set of keys to filter by. If empty/undefined, returns all.
   * @returns Array of matching history entries ordered by timestamp ascending
   * @complexity O(log n + m) where n = history size, m = matching entries
   */
  getMessagesSince(
    sinceTimestamp: number,
    keys?: ReadonlySet<SubscriptionKey>,
  ): MessageHistoryEntry[] {
    // Binary search for the first entry with timestamp > sinceTimestamp
    let lo = 0;
    let hi = this.messageHistory.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.messageHistory[mid]?.timestamp ?? 0) <= sinceTimestamp) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Collect matching entries from lo onward
    const result: MessageHistoryEntry[] = [];
    for (let i = lo; i < this.messageHistory.length; i++) {
      const entry = this.messageHistory[i];
      if (entry === undefined) continue;
      if (keys === undefined || keys.size === 0 || keys.has(entry.key)) {
        result.push(entry);
      }
    }

    return result;
  }

  /**
   * Get the current size of the message history buffer.
   */
  getHistorySize(): number {
    return this.messageHistory.length;
  }

  /**
   * Record a published message in the history buffer for delta sync recovery.
   * Evicts oldest entries when the buffer exceeds maxHistorySize.
   *
   * @param key - Subscription key
   * @param version - Version number
   * @param timestamp - Server timestamp (Date.now())
   * @complexity O(1) amortized
   */
  private recordHistory(key: SubscriptionKey, version: number, timestamp: number): void {
    this.messageHistory.push({ key, version, timestamp });

    // Evict oldest entries if over capacity (batch evict 10% for efficiency)
    if (this.messageHistory.length > this.maxHistorySize) {
      const evictCount = Math.max(1, Math.floor(this.maxHistorySize * 0.1));
      this.messageHistory.splice(0, evictCount);
    }
  }

  /**
   * Handle a sync_request message from a reconnecting client.
   * Sends a sync_response with all missed messages since the given timestamp,
   * filtered to the keys the client is interested in.
   *
   * @param socket - The WebSocket client requesting sync
   * @param msg - Parsed message payload
   * @complexity O(log n + m) where n = history size, m = missed messages
   */
  private handleSyncRequest(socket: WebSocket, msg: Record<string, unknown>): void {
    const lastTimestamp = msg['lastTimestamp'];
    if (typeof lastTimestamp !== 'number' || !Number.isFinite(lastTimestamp)) return;

    const rawKeys = msg['keys'];
    let keyFilter: ReadonlySet<SubscriptionKey> | undefined;
    if (Array.isArray(rawKeys) && rawKeys.length > 0) {
      const validKeys = rawKeys.filter((k): k is SubscriptionKey => typeof k === 'string');
      keyFilter = new Set(validKeys);
    }

    const missed = this.getMessagesSince(lastTimestamp, keyFilter);

    // De-duplicate: keep only the latest version per key
    const latestByKey = new Map<SubscriptionKey, MessageHistoryEntry>();
    for (const entry of missed) {
      const existing = latestByKey.get(entry.key);
      if (existing === undefined || entry.timestamp > existing.timestamp) {
        latestByKey.set(entry.key, entry);
      }
    }

    const response: ServerMessage = {
      type: 'sync_response',
      messages: Array.from(latestByKey.values()),
    };

    if (socket.readyState === 1) {
      try {
        socket.send(JSON.stringify(response));
      } catch {
        // Socket may have closed between check and send
      }
    }
  }
}
