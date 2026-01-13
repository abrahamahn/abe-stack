// apps/server/src/infra/pubsub/index.ts
/**
 * Real-time Pub/Sub System
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * Subscription Key Format:
 * - `record:{table}:{id}` - Single record updates
 * - `list:{userId}:{listType}` - List/collection updates
 */

// Minimal WebSocket interface for our pub/sub needs
// This avoids requiring @types/ws when not using websockets
interface WebSocket {
  readyState: number;
  send(data: string): void;
}

// Subscription key types for type safety
export type RecordKey = `record:${string}:${string}`;
export type ListKey = `list:${string}:${string}`;
export type SubscriptionKey = RecordKey | ListKey;

// Message types
export type ClientMessage =
  | { type: 'subscribe'; key: SubscriptionKey }
  | { type: 'unsubscribe'; key: SubscriptionKey };

export type ServerMessage = { type: 'update'; key: SubscriptionKey; version: number };

// Helper to create subscription keys
export const SubKeys = {
  record: (table: string, id: string): RecordKey => `record:${table}:${id}`,
  list: (userId: string, listType: string): ListKey => `list:${userId}:${listType}`,
} as const;

/**
 * In-memory subscription manager
 *
 * For horizontal scaling, replace with Redis Pub/Sub adapter.
 * Current implementation is perfect for single-server deployments.
 */
export class SubscriptionManager {
  private subscriptions = new Map<SubscriptionKey, Set<WebSocket>>();
  private socketSubscriptions = new WeakMap<WebSocket, Set<SubscriptionKey>>();

  /**
   * Subscribe a socket to a key
   */
  subscribe(key: SubscriptionKey, socket: WebSocket): void {
    // Add to key -> sockets map
    let sockets = this.subscriptions.get(key);
    if (!sockets) {
      sockets = new Set();
      this.subscriptions.set(key, sockets);
    }
    sockets.add(socket);

    // Track reverse mapping for cleanup
    let keys = this.socketSubscriptions.get(socket);
    if (!keys) {
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
   * Publish an update to all subscribers
   * Called after successful database writes
   */
  publish(key: SubscriptionKey, version: number): void {
    const sockets = this.subscriptions.get(key);
    if (!sockets || sockets.size === 0) return;

    const message: ServerMessage = { type: 'update', key, version };
    const payload = JSON.stringify(message);

    for (const socket of sockets) {
      if (socket.readyState === 1) {
        // WebSocket.OPEN
        socket.send(payload);
      }
    }
  }

  /**
   * Clean up all subscriptions for a disconnected socket
   */
  cleanup(socket: WebSocket): void {
    const keys = this.socketSubscriptions.get(socket);
    if (!keys) return;

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
  handleMessage(socket: WebSocket, data: string): void {
    try {
      const message = JSON.parse(data) as ClientMessage;

      switch (message.type) {
        case 'subscribe':
          this.subscribe(message.key, socket);
          break;
        case 'unsubscribe':
          this.unsubscribe(message.key, socket);
          break;
      }
    } catch {
      // Invalid message, ignore
    }
  }

  /**
   * Get subscriber count for a key (useful for debugging)
   */
  getSubscriberCount(key: SubscriptionKey): number {
    return this.subscriptions.get(key)?.size ?? 0;
  }
}

// Singleton for simple usage (can be replaced with DI)
export const pubsub = new SubscriptionManager();

/**
 * Helper to publish after a database write
 * Use with setImmediate to not block the response
 *
 * @example
 * const user = await db.update(users).set(data).returning();
 * publishAfterWrite('users', user.id, user.version);
 */
export function publishAfterWrite(table: string, id: string, version: number): void {
  setImmediate(() => {
    pubsub.publish(SubKeys.record(table, id), version);
  });
}
