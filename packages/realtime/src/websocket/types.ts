// packages/realtime/src/websocket/types.ts
/**
 * WebSocket Types
 *
 * Type definitions for WebSocket lifecycle management and statistics.
 *
 * @module websocket/types
 */

// ============================================================================
// WebSocket Statistics
// ============================================================================

/**
 * WebSocket connection statistics for health checks and monitoring.
 *
 * @param activeConnections - Number of currently connected WebSocket clients
 * @param pluginRegistered - Whether the WebSocket upgrade handler has been registered
 */
export interface WebSocketStats {
  /** Number of active WebSocket connections */
  activeConnections: number;
  /** Whether the WebSocket plugin has been registered */
  pluginRegistered: boolean;
}

// ============================================================================
// Subscription Key Types
// ============================================================================

/**
 * Subscription key format: "table:id".
 * Used to identify specific records for real-time updates.
 */
export type SubscriptionKey = `${string}:${string}`;

// ============================================================================
// Minimal PubSub WebSocket Interface
// ============================================================================

/**
 * Minimal WebSocket interface for pub/sub operations.
 * Matches the interface expected by SubscriptionManager.
 *
 * @param readyState - Current connection state
 * @param send - Method to send data to the client
 */
export interface PubSubWebSocket {
  /** Current connection state */
  readyState: number;
  /**
   * Send data to the client
   *
   * @param data - String data to send
   */
  send(data: string): void;
}
