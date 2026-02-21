// main/server/core/src/realtime/permission.propagation.ts
/**
 * Permission Change Propagation
 *
 * Handles propagation of permission changes (membership revocations and role
 * changes) to active WebSocket connections. When a membership is revoked or
 * a role is downgraded, this module identifies affected connections, removes
 * unauthorized subscriptions, and notifies clients to clear cached data.
 *
 * Integration points:
 * - Uses PermissionMiddleware to find affected connections and evaluate roles
 * - Publishes "permission_revoked" events to affected WebSocket connections
 * - Clients receiving this event should clear cached records for the tenant
 *
 * @module Realtime/PermissionPropagation
 */

import type { PermissionMiddleware } from './permission.middleware';
import type { TenantRole } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a WebSocket connection that can receive messages.
 * Abstracted to decouple from a specific WebSocket implementation.
 */
export interface WebSocketConnection {
  /** Send a serialized message to the client */
  send: (data: string) => void;
  /** Close the connection */
  close: () => void;
}

/**
 * Registry for looking up WebSocket connections by connection ID.
 * This is typically maintained by the WebSocket server.
 */
export interface ConnectionRegistry {
  /** Get a WebSocket connection by its ID */
  getConnection: (connectionId: string) => WebSocketConnection | null;
  /** Get all active connection IDs */
  getConnectionIds: () => string[];
}

/**
 * Manages active subscriptions per connection.
 * Used to remove subscriptions when permissions are revoked.
 */
export interface SubscriptionRegistry {
  /**
   * Get all subscription keys for a connection.
   * Keys follow the format "table:id" or "tenant:tenantId:table:id".
   */
  getSubscriptions: (connectionId: string) => string[];
  /**
   * Remove a specific subscription for a connection.
   * Returns true if the subscription was found and removed.
   */
  removeSubscription: (connectionId: string, key: string) => boolean;
  /**
   * Remove all subscriptions for a connection that match a tenant.
   * Returns the number of subscriptions removed.
   */
  removeSubscriptionsForTenant: (connectionId: string, tenantId: string) => number;
}

/**
 * Event sent to clients when their permissions are revoked.
 */
export interface PermissionRevokedEvent {
  type: 'permission_revoked';
  /** The tenant/workspace the user lost access to */
  tenantId: string;
  /** Reason for the revocation */
  reason: string;
  /** Optional: the new role if this was a downgrade (undefined if fully revoked) */
  newRole?: TenantRole;
}

/**
 * Result of processing a permission change.
 * Useful for logging and monitoring.
 */
export interface PropagationResult {
  /** Number of connections affected */
  affectedConnections: number;
  /** Number of subscriptions removed */
  removedSubscriptions: number;
  /** Connection IDs that were notified */
  notifiedConnectionIds: string[];
}

/**
 * Interface for handling permission changes and propagating them
 * to active WebSocket connections.
 */
export interface PermissionChangeHandler {
  /**
   * Handle a membership revocation (user removed from tenant).
   * Removes the user from all active subscriptions for that tenant
   * and notifies affected WebSocket connections.
   *
   * @param userId - The user whose membership was revoked
   * @param tenantId - The tenant/workspace they were removed from
   * @returns Result of the propagation
   */
  onMembershipRevoked: (userId: string, tenantId: string) => Promise<PropagationResult>;

  /**
   * Handle a role change (upgrade or downgrade).
   * Re-evaluates permissions and removes subscriptions that are
   * no longer authorized under the new role.
   *
   * @param userId - The user whose role changed
   * @param tenantId - The tenant/workspace where the role changed
   * @param oldRole - The previous role
   * @param newRole - The new role
   * @returns Result of the propagation
   */
  onRoleChanged: (
    userId: string,
    tenantId: string,
    oldRole: TenantRole,
    newRole: TenantRole,
  ) => Promise<PropagationResult>;
}

/**
 * Options for creating a permission change handler.
 */
export interface PermissionPropagationOptions {
  /** The permission middleware for looking up connection permissions */
  permissionMiddleware: PermissionMiddleware;
  /** Registry for looking up WebSocket connections */
  connectionRegistry: ConnectionRegistry;
  /** Registry for managing subscriptions per connection */
  subscriptionRegistry: SubscriptionRegistry;
}

// ============================================================================
// Constants
// ============================================================================

/** Role hierarchy levels for determining downgrades */
const ROLE_LEVELS: Record<TenantRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a permission change handler.
 *
 * @param options - Configuration options
 * @returns PermissionChangeHandler interface
 *
 * @example
 * ```typescript
 * const handler = createPermissionChangeHandler({
 *   permissionMiddleware: middleware,
 *   connectionRegistry: registry,
 *   subscriptionRegistry: subscriptions,
 * });
 *
 * // When a membership is deleted:
 * await handler.onMembershipRevoked('user-1', 'tenant-1');
 *
 * // When a role is changed:
 * await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');
 * ```
 */
export function createPermissionChangeHandler(
  options: PermissionPropagationOptions,
): PermissionChangeHandler {
  const { permissionMiddleware, connectionRegistry, subscriptionRegistry } = options;

  /**
   * Find all connection IDs that belong to a specific user.
   */
  function findConnectionsForUser(userId: string): string[] {
    const allConnectionIds = connectionRegistry.getConnectionIds();
    const userConnections: string[] = [];

    for (const connectionId of allConnectionIds) {
      const permissions = permissionMiddleware.getConnectionPermissions(connectionId);
      if (permissions !== null && permissions.userId === userId) {
        userConnections.push(connectionId);
      }
    }

    return userConnections;
  }

  /**
   * Send a permission_revoked event to a WebSocket connection.
   */
  function notifyConnection(connectionId: string, event: PermissionRevokedEvent): boolean {
    const connection = connectionRegistry.getConnection(connectionId);
    if (connection === null) {
      return false;
    }

    try {
      connection.send(JSON.stringify(event));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove subscriptions and notify a connection about a full revocation.
   */
  function revokeConnectionAccess(
    connectionId: string,
    tenantId: string,
    reason: string,
    newRole?: TenantRole,
  ): { removed: number; notified: boolean } {
    // Remove all subscriptions for this tenant
    const removed = subscriptionRegistry.removeSubscriptionsForTenant(connectionId, tenantId);

    // Notify the client
    const event: PermissionRevokedEvent = {
      type: 'permission_revoked',
      tenantId,
      reason,
      ...(newRole === undefined ? {} : { newRole }),
    };

    const notified = notifyConnection(connectionId, event);

    return { removed, notified };
  }

  const onMembershipRevoked = async (
    userId: string,
    tenantId: string,
  ): Promise<PropagationResult> => {
    const userConnections = findConnectionsForUser(userId);

    let removedSubscriptions = 0;
    const notifiedConnectionIds: string[] = [];

    for (const connectionId of userConnections) {
      const { removed, notified } = revokeConnectionAccess(
        connectionId,
        tenantId,
        'Membership revoked: you have been removed from this workspace',
      );

      removedSubscriptions += removed;
      if (notified) {
        notifiedConnectionIds.push(connectionId);
      }

      // Refresh the middleware's cached permissions for this connection
      // so subsequent permission checks reflect the revocation
      await permissionMiddleware.refreshPermissions(connectionId);
    }

    return {
      affectedConnections: userConnections.length,
      removedSubscriptions,
      notifiedConnectionIds,
    };
  };

  const onRoleChanged = async (
    userId: string,
    tenantId: string,
    oldRole: TenantRole,
    newRole: TenantRole,
  ): Promise<PropagationResult> => {
    const oldLevel = ROLE_LEVELS[oldRole];
    const newLevel = ROLE_LEVELS[newRole];

    // If the role was upgraded or stayed the same, no subscriptions need removal
    if (newLevel >= oldLevel) {
      // Still refresh cached permissions so the new role is reflected
      const userConnections = findConnectionsForUser(userId);
      for (const connectionId of userConnections) {
        await permissionMiddleware.refreshPermissions(connectionId);
      }

      return {
        affectedConnections: userConnections.length,
        removedSubscriptions: 0,
        notifiedConnectionIds: [],
      };
    }

    // Role was downgraded — need to re-evaluate and potentially remove subscriptions
    const userConnections = findConnectionsForUser(userId);

    let removedSubscriptions = 0;
    const notifiedConnectionIds: string[] = [];

    for (const connectionId of userConnections) {
      // Refresh permissions first so hasRole checks use the new role
      await permissionMiddleware.refreshPermissions(connectionId);

      // For a downgrade to viewer, write-only subscriptions might need removal.
      // For a full downgrade, remove all tenant subscriptions.
      // The simplest correct approach: notify the client about the downgrade
      // and let it re-evaluate what it needs. Also remove tenant subscriptions
      // if the new role is insufficient.
      const { removed, notified } = revokeConnectionAccess(
        connectionId,
        tenantId,
        `Role changed from ${oldRole} to ${newRole}`,
        newRole,
      );

      removedSubscriptions += removed;
      if (notified) {
        notifiedConnectionIds.push(connectionId);
      }
    }

    return {
      affectedConnections: userConnections.length,
      removedSubscriptions,
      notifiedConnectionIds,
    };
  };

  return {
    onMembershipRevoked,
    onRoleChanged,
  };
}
