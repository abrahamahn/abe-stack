// src/server/websocket/src/index.ts
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

// Types
export type { PubSubWebSocket, SubscriptionKey, WebSocketStats } from './types';
