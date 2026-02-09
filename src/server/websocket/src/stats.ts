// src/server/websocket/src/stats.ts
/**
 * WebSocket Statistics
 *
 * Tracks active WebSocket connections and plugin registration state.
 * Used by health check endpoints for monitoring.
 *
 * @module websocket/stats
 */

import type { WebSocketStats } from './types';

// ============================================================================
// Module State
// ============================================================================

/** Current number of active WebSocket connections */
let activeConnections = 0;

/** Whether the WebSocket plugin has been registered */
let pluginRegistered = false;

// ============================================================================
// Statistics API
// ============================================================================

/**
 * Get WebSocket statistics for health checks.
 *
 * @returns Current WebSocket stats including active connections and registration state
 * @complexity O(1)
 */
export function getWebSocketStats(): WebSocketStats {
  return {
    activeConnections,
    pluginRegistered,
  };
}

/**
 * Increment the active connection count.
 * Called when a new WebSocket connection is established.
 *
 * @returns The new active connection count
 * @complexity O(1)
 */
export function incrementConnections(): number {
  activeConnections++;
  return activeConnections;
}

/**
 * Decrement the active connection count.
 * Called when a WebSocket connection is closed or errors.
 *
 * @returns The new active connection count
 * @complexity O(1)
 */
export function decrementConnections(): number {
  activeConnections--;
  return activeConnections;
}

/**
 * Mark the WebSocket plugin as registered.
 * Called during server initialization.
 *
 * @complexity O(1)
 */
export function markPluginRegistered(): void {
  pluginRegistered = true;
}

/**
 * Reset all statistics to initial state.
 * Used for testing.
 *
 * @complexity O(1)
 */
export function resetStats(): void {
  activeConnections = 0;
  pluginRegistered = false;
}
