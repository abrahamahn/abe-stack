// main/server/core/src/realtime/permission.middleware.ts
/**
 * Permission Middleware
 *
 * Middleware that attaches permission context to WebSocket connections.
 * On connection, loads the user's workspace memberships and caches
 * them for the connection duration. Provides a utility to retrieve
 * cached permissions for any connection.
 *
 * @module Realtime/PermissionMiddleware
 */

import type { Membership, TenantRole } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the permission context for a single WebSocket connection.
 */
export interface ConnectionPermissions {
  /** The authenticated user ID for this connection */
  userId: string;
  /** Map of tenantId -> membership for quick lookups */
  memberships: Map<string, Membership>;
  /** Timestamp when the permissions were loaded */
  loadedAt: number;
}

/**
 * Repository interface for loading user memberships.
 */
export interface MembershipListRepository {
  /**
   * Find all memberships for a user across all tenants.
   */
  findByUserId: (userId: string) => Promise<Membership[]>;
}

/**
 * Options for configuring the permission middleware.
 */
export interface PermissionMiddlewareOptions {
  /** Repository for loading memberships */
  membershipRepo: MembershipListRepository;
  /**
   * Cache TTL in milliseconds. Permissions are refreshed after this duration.
   * @default 300000 (5 minutes)
   */
  cacheTtlMs?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

// ============================================================================
// Permission Middleware
// ============================================================================

/**
 * Manages permission context for WebSocket connections.
 *
 * On connection, call `loadPermissions` to fetch and cache the user's
 * workspace memberships. Use `getConnectionPermissions` to retrieve
 * the cached permissions for a given connection. Call `removeConnection`
 * on disconnect to clean up.
 *
 * @example
 * ```typescript
 * const middleware = createPermissionMiddleware({
 *   membershipRepo: repos.memberships,
 *   cacheTtlMs: 60_000,
 * });
 *
 * wss.on('connection', async (ws, req) => {
 *   const userId = authenticateConnection(req);
 *   const connectionId = generateConnectionId();
 *   await middleware.loadPermissions(connectionId, userId);
 *
 *   ws.on('close', () => {
 *     middleware.removeConnection(connectionId);
 *   });
 * });
 * ```
 */
export interface PermissionMiddleware {
  /**
   * Load and cache permissions for a new connection.
   * Should be called when a WebSocket connection is established.
   */
  loadPermissions: (connectionId: string, userId: string) => Promise<ConnectionPermissions>;

  /**
   * Get cached permissions for an existing connection.
   * Returns null if the connection is not found or permissions have expired.
   */
  getConnectionPermissions: (connectionId: string) => ConnectionPermissions | null;

  /**
   * Check if a connection has a specific role in a tenant.
   * Convenience method for permission checks on incoming messages.
   */
  hasRole: (connectionId: string, tenantId: string, requiredRole: TenantRole) => boolean;

  /**
   * Refresh the permissions for an existing connection.
   * Useful when membership changes are detected.
   */
  refreshPermissions: (connectionId: string) => Promise<ConnectionPermissions | null>;

  /**
   * Remove a connection and clean up its cached permissions.
   * Should be called when a WebSocket connection is closed.
   */
  removeConnection: (connectionId: string) => void;

  /**
   * Get the number of active connections being tracked.
   * Useful for monitoring and health checks.
   */
  getActiveConnectionCount: () => number;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a permission middleware instance.
 *
 * @param options - Configuration options
 * @returns PermissionMiddleware interface
 */
export function createPermissionMiddleware(
  options: PermissionMiddlewareOptions,
): PermissionMiddleware {
  const { membershipRepo, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options;

  /** Cache of connectionId -> permissions */
  const connectionCache = new Map<string, ConnectionPermissions>();

  /** Cache of connectionId -> userId (for refresh lookups) */
  const connectionUsers = new Map<string, string>();

  const ROLE_LEVELS: Record<TenantRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };

  /**
   * Build a permissions map from a list of memberships.
   */
  function buildPermissions(userId: string, memberships: Membership[]): ConnectionPermissions {
    const membershipMap = new Map<string, Membership>();
    for (const membership of memberships) {
      membershipMap.set(membership.tenantId, membership);
    }

    return {
      userId,
      memberships: membershipMap,
      loadedAt: Date.now(),
    };
  }

  /**
   * Check if cached permissions have expired.
   */
  function isExpired(permissions: ConnectionPermissions): boolean {
    return Date.now() - permissions.loadedAt > cacheTtlMs;
  }

  const loadPermissions = async (
    connectionId: string,
    userId: string,
  ): Promise<ConnectionPermissions> => {
    const memberships = await membershipRepo.findByUserId(userId);
    const permissions = buildPermissions(userId, memberships);

    connectionCache.set(connectionId, permissions);
    connectionUsers.set(connectionId, userId);

    return permissions;
  };

  const getConnectionPermissions = (connectionId: string): ConnectionPermissions | null => {
    const permissions = connectionCache.get(connectionId);
    if (permissions === undefined) {
      return null;
    }

    if (isExpired(permissions)) {
      return null;
    }

    return permissions;
  };

  const hasRole = (connectionId: string, tenantId: string, requiredRole: TenantRole): boolean => {
    const permissions = getConnectionPermissions(connectionId);
    if (permissions === null) {
      return false;
    }

    const membership = permissions.memberships.get(tenantId);
    if (membership === undefined) {
      return false;
    }

    const roleLookup: string = membership.role.toLowerCase();
    const requiredLookup: string = requiredRole.toLowerCase();
    const currentLevel: number = (ROLE_LEVELS as Record<string, number>)[roleLookup] ?? 0;
    const requiredLevel: number = (ROLE_LEVELS as Record<string, number>)[requiredLookup] ?? 0;

    return currentLevel >= requiredLevel;
  };

  const refreshPermissions = async (
    connectionId: string,
  ): Promise<ConnectionPermissions | null> => {
    const userId = connectionUsers.get(connectionId);
    if (userId === undefined) {
      return null;
    }

    return loadPermissions(connectionId, userId);
  };

  const removeConnection = (connectionId: string): void => {
    connectionCache.delete(connectionId);
    connectionUsers.delete(connectionId);
  };

  const getActiveConnectionCount = (): number => {
    return connectionCache.size;
  };

  return {
    loadPermissions,
    getConnectionPermissions,
    hasRole,
    refreshPermissions,
    removeConnection,
    getActiveConnectionCount,
  };
}
