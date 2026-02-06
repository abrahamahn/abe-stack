// packages/shared/src/utils/pubsub/subscription-manager.ts
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

import type { PostgresPubSub } from './postgres-pubsub';
import type { ClientMessage, ServerMessage, SubscriptionKey, WebSocket } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionManagerOptions {
  /** PostgresPubSub adapter for horizontal scaling (optional) */
  adapter?: PostgresPubSub;
}

// ============================================================================
// SubscriptionManager Class
// ============================================================================

export class SubscriptionManager {
  private readonly subscriptions = new Map<SubscriptionKey, Set<WebSocket>>();
  private readonly socketSubscriptions = new WeakMap<WebSocket, Set<SubscriptionKey>>();
  private adapter: PostgresPubSub | null = null;

  constructor(options: SubscriptionManagerOptions = {}) {
    this.adapter = options.adapter ?? null;
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
   * @param key - The subscription key to publish to
   * @param version - The data version number
   * @complexity O(n) where n = subscribers for this key
   */
  publishLocal(key: SubscriptionKey, version: number): void {
    const sockets = this.subscriptions.get(key);
    if (sockets === undefined || sockets.size === 0) return;

    const message: ServerMessage = { type: 'update', key, version };
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
      const message = JSON.parse(data) as ClientMessage;

      switch (message.type) {
        case 'subscribe':
          this.subscribe(message.key, socket);
          onSubscribe?.(message.key);
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

  /**
   * Get total subscription count across all keys (useful for health checks)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
