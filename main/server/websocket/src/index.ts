// main/server/websocket/src/index.ts
/**
 * WebSocket Module
 *
 * WebSocket lifecycle management, statistics, and connection handling.
 */

// Lifecycle
export {
  registerWebSocket,
  type TokenVerifier,
  type WebSocketRegistrationOptions,
} from './lifecycle';

// Stats
export {
  decrementConnections,
  getWebSocketStats,
  incrementConnections,
  markPluginRegistered,
  resetStats,
} from './stats';

// Types (re-exported from shared — canonical definitions live in @abe-stack/shared)
export type {
  SubscriptionKey,
  WebSocket as PubSubWebSocket,
  WebSocketStats,
} from '@abe-stack/shared';
