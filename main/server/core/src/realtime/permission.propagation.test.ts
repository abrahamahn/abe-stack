// main/server/core/src/realtime/permission.propagation.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPermissionChangeHandler } from './permission.propagation';

import type { ConnectionPermissions, PermissionMiddleware } from './permission.middleware';
import type {
  ConnectionRegistry,
  PermissionChangeHandler,
  PermissionRevokedEvent,
  SubscriptionRegistry,
  WebSocketConnection,
} from './permission.propagation';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockPermissionMiddleware(): PermissionMiddleware {
  return {
    loadPermissions: vi.fn(),
    getConnectionPermissions: vi.fn(),
    hasRole: vi.fn(),
    refreshPermissions: vi.fn(),
    removeConnection: vi.fn(),
    getActiveConnectionCount: vi.fn(),
  };
}

function createMockConnectionRegistry(): ConnectionRegistry {
  return {
    getConnection: vi.fn(),
    getConnectionIds: vi.fn().mockReturnValue([]),
  };
}

function createMockSubscriptionRegistry(): SubscriptionRegistry {
  return {
    getSubscriptions: vi.fn().mockReturnValue([]),
    removeSubscription: vi.fn(),
    removeSubscriptionsForTenant: vi.fn().mockReturnValue(0),
  };
}

function createMockWebSocketConnection(): WebSocketConnection {
  return {
    send: vi.fn(),
    close: vi.fn(),
  };
}

function createMockConnectionPermissions(
  overrides: Partial<ConnectionPermissions> = {},
): ConnectionPermissions {
  return {
    userId: 'user-1',
    memberships: new Map(),
    loadedAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('createPermissionChangeHandler', () => {
  let middleware: PermissionMiddleware;
  let connectionRegistry: ConnectionRegistry;
  let subscriptionRegistry: SubscriptionRegistry;
  let handler: PermissionChangeHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = createMockPermissionMiddleware();
    connectionRegistry = createMockConnectionRegistry();
    subscriptionRegistry = createMockSubscriptionRegistry();
    handler = createPermissionChangeHandler({
      permissionMiddleware: middleware,
      connectionRegistry,
      subscriptionRegistry,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // onMembershipRevoked
  // ==========================================================================

  describe('onMembershipRevoked', () => {
    it('should find and notify connections for the affected user', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockReturnValue(3);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(1);
      expect(result.notifiedConnectionIds).toEqual(['conn-1']);
      expect(result.removedSubscriptions).toBe(3);
    });

    it('should send a permission_revoked event to the client', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(ws.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(
        vi.mocked(ws.send).mock.calls[0]![0] as string,
      ) as PermissionRevokedEvent;
      expect(sentMessage.type).toBe('permission_revoked');
      expect(sentMessage.tenantId).toBe('tenant-1');
      expect(sentMessage.reason).toContain('removed from this workspace');
      expect(sentMessage.newRole).toBeUndefined();
    });

    it('should remove subscriptions for the revoked tenant', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(subscriptionRegistry.removeSubscriptionsForTenant).toHaveBeenCalledWith(
        'conn-1',
        'tenant-1',
      );
    });

    it('should refresh permissions after revocation', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(middleware.refreshPermissions).toHaveBeenCalledWith('conn-1');
    });

    it('should handle multiple connections for the same user', async () => {
      const ws1 = createMockWebSocketConnection();
      const ws2 = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1', 'conn-2']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValueOnce(ws1).mockReturnValueOnce(ws2);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant)
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(1);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(2);
      expect(result.notifiedConnectionIds).toEqual(['conn-1', 'conn-2']);
      expect(result.removedSubscriptions).toBe(3);
    });

    it('should skip connections belonging to other users', async () => {
      const user1Perms = createMockConnectionPermissions({ userId: 'user-1' });
      const user2Perms = createMockConnectionPermissions({ userId: 'user-2' });
      const ws = createMockWebSocketConnection();

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1', 'conn-2']);
      vi.mocked(middleware.getConnectionPermissions)
        .mockReturnValueOnce(user1Perms)
        .mockReturnValueOnce(user2Perms);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(1);
      expect(result.notifiedConnectionIds).toEqual(['conn-1']);
    });

    it('should return zero results when user has no active connections', async () => {
      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(
        createMockConnectionPermissions({ userId: 'other-user' }),
      );

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(0);
      expect(result.removedSubscriptions).toBe(0);
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should handle connection not found in registry gracefully', async () => {
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(null);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(1);
      // Connection was null, so it could not be notified
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should handle send failure gracefully', async () => {
      const ws = createMockWebSocketConnection();
      vi.mocked(ws.send).mockImplementation(() => {
        throw new Error('Connection closed');
      });
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      // Should not throw; connection just won't be in notified list
      expect(result.affectedConnections).toBe(1);
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should handle expired permissions (null from middleware)', async () => {
      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(0);
    });
  });

  // ==========================================================================
  // onRoleChanged
  // ==========================================================================

  describe('onRoleChanged', () => {
    it('should notify connections when role is downgraded', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockReturnValue(2);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');

      expect(result.affectedConnections).toBe(1);
      expect(result.notifiedConnectionIds).toEqual(['conn-1']);
      expect(result.removedSubscriptions).toBe(2);
    });

    it('should include newRole in the event when downgraded', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');

      const sentMessage = JSON.parse(
        vi.mocked(ws.send).mock.calls[0]![0] as string,
      ) as PermissionRevokedEvent;
      expect(sentMessage.type).toBe('permission_revoked');
      expect(sentMessage.tenantId).toBe('tenant-1');
      expect(sentMessage.newRole).toBe('viewer');
      expect(sentMessage.reason).toContain('admin');
      expect(sentMessage.reason).toContain('viewer');
    });

    it('should not remove subscriptions when role is upgraded', async () => {
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'viewer', 'admin');

      expect(result.affectedConnections).toBe(1);
      expect(result.removedSubscriptions).toBe(0);
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should not remove subscriptions when role stays the same', async () => {
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'member', 'member');

      expect(result.removedSubscriptions).toBe(0);
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should refresh permissions even on upgrade', async () => {
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      await handler.onRoleChanged('user-1', 'tenant-1', 'viewer', 'admin');

      expect(middleware.refreshPermissions).toHaveBeenCalledWith('conn-1');
    });

    it('should refresh permissions before evaluating on downgrade', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });
      const callOrder: string[] = [];

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockImplementation(async () => {
        callOrder.push('refreshPermissions');
        return null;
      });
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockImplementation(() => {
        callOrder.push('removeSubscriptionsForTenant');
        return 0;
      });

      await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');

      expect(callOrder).toEqual(['refreshPermissions', 'removeSubscriptionsForTenant']);
    });

    it('should handle downgrade from owner to member', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockReturnValue(1);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'owner', 'member');

      expect(result.affectedConnections).toBe(1);
      expect(result.notifiedConnectionIds).toEqual(['conn-1']);

      const sentMessage = JSON.parse(
        vi.mocked(ws.send).mock.calls[0]![0] as string,
      ) as PermissionRevokedEvent;
      expect(sentMessage.newRole).toBe('member');
    });

    it('should handle multiple connections for role change', async () => {
      const ws1 = createMockWebSocketConnection();
      const ws2 = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1', 'conn-2']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValueOnce(ws1).mockReturnValueOnce(ws2);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockReturnValue(1);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');

      expect(result.affectedConnections).toBe(2);
      expect(result.notifiedConnectionIds).toEqual(['conn-1', 'conn-2']);
      expect(result.removedSubscriptions).toBe(2);
    });

    it('should return zero results when user has no connections', async () => {
      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue([]);

      const result = await handler.onRoleChanged('user-1', 'tenant-1', 'admin', 'viewer');

      expect(result.affectedConnections).toBe(0);
      expect(result.removedSubscriptions).toBe(0);
      expect(result.notifiedConnectionIds).toEqual([]);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle no active connections at all', async () => {
      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue([]);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      expect(result.affectedConnections).toBe(0);
      expect(result.removedSubscriptions).toBe(0);
      expect(result.notifiedConnectionIds).toEqual([]);
    });

    it('should handle connections with expired permissions', async () => {
      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1', 'conn-2']);
      vi.mocked(middleware.getConnectionPermissions)
        .mockReturnValueOnce(null) // expired
        .mockReturnValueOnce(createMockConnectionPermissions({ userId: 'user-1' }));

      const ws = createMockWebSocketConnection();
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const result = await handler.onMembershipRevoked('user-1', 'tenant-1');

      // Only the second connection matched
      expect(result.affectedConnections).toBe(1);
    });

    it('should handle concurrent revocations for different tenants', async () => {
      const ws = createMockWebSocketConnection();
      const permissions = createMockConnectionPermissions({ userId: 'user-1' });

      vi.mocked(connectionRegistry.getConnectionIds).mockReturnValue(['conn-1']);
      vi.mocked(middleware.getConnectionPermissions).mockReturnValue(permissions);
      vi.mocked(connectionRegistry.getConnection).mockReturnValue(ws);
      vi.mocked(subscriptionRegistry.removeSubscriptionsForTenant).mockReturnValue(1);
      vi.mocked(middleware.refreshPermissions).mockResolvedValue(null);

      const [result1, result2] = await Promise.all([
        handler.onMembershipRevoked('user-1', 'tenant-1'),
        handler.onMembershipRevoked('user-1', 'tenant-2'),
      ]);

      expect(result1.affectedConnections).toBe(1);
      expect(result2.affectedConnections).toBe(1);

      // Both tenants should have had subscriptions removed
      expect(subscriptionRegistry.removeSubscriptionsForTenant).toHaveBeenCalledWith(
        'conn-1',
        'tenant-1',
      );
      expect(subscriptionRegistry.removeSubscriptionsForTenant).toHaveBeenCalledWith(
        'conn-1',
        'tenant-2',
      );
    });
  });
});
