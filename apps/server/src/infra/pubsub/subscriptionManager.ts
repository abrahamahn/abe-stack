// apps/server/src/infra/pubsub/subscriptionManager.ts
/**
 * In-memory Subscription Manager
 *
 * Adopted from Chet-stack's WebSocket subscription pattern.
 * Enables optimistic UI by notifying clients when data changes.
 *
 * For horizontal scaling, replace with Redis Pub/Sub adapter.
 * Current implementation is perfect for single-server deployments.
 */

import type { ClientMessage, ServerMessage, SubscriptionKey, WebSocket } from './types';

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
