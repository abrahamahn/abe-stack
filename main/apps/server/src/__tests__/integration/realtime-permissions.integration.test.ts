// main/apps/server/src/__tests__/integration/realtime-permissions.integration.test.ts
/**
 * Realtime Permissions Integration Tests (Sprint 6.8 + 7.1)
 *
 * Verifies the full permission enforcement lifecycle for real-time sync:
 *
 * 1. User A writes record → User B (no permission) does NOT receive the update.
 *    Tested via the PermissionFilter service that runs before broadcasting.
 *
 * 2. Permission revoked → User B stops receiving updates immediately.
 *    Tested via PermissionChangeHandler.onMembershipRevoked().
 *
 * Uses mock implementations of all collaborators (no DB, no WebSocket server).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filterRecordsForUser as filterRecords } from '../../../../../server/core/src/realtime/permission.filter';
import { createPermissionChangeHandler } from '../../../../../server/core/src/realtime/permission.propagation';

import type { PermissionMiddleware } from '../../../../../server/core/src/realtime/permission.middleware';
import type {
  ConnectionRegistry,
  PermissionRevokedEvent,
  SubscriptionRegistry,
  WebSocketConnection,
} from '../../../../../server/core/src/realtime/permission.propagation';
import type { MembershipRepository, PermissionRecord } from '../../../../../server/core/src/realtime/permissions';

// ============================================================================
// Test record type
// ============================================================================

interface TaskRecord extends PermissionRecord {
  id: string;
  version: number;
  title: string;
  ownerId: string;
  tenantId: string;
}

// ============================================================================
// Mock factories
// ============================================================================

function createMockPermissionMiddleware(userId: string): PermissionMiddleware {
  return {
    loadPermissions: vi.fn(),
    getConnectionPermissions: vi.fn().mockReturnValue({ userId, tenantIds: ['tenant-A'] }),
    hasRole: vi.fn().mockReturnValue(true),
    refreshPermissions: vi.fn().mockResolvedValue(undefined),
    removeConnection: vi.fn(),
    getActiveConnectionCount: vi.fn().mockReturnValue(1),
  };
}

function createMockConnectionRegistry(connections: Map<string, WebSocketConnection>): ConnectionRegistry {
  return {
    getConnection: vi.fn((id: string) => connections.get(id) ?? null),
    getConnectionIds: vi.fn(() => Array.from(connections.keys())),
  };
}

function createMockSubscriptionRegistry(): SubscriptionRegistry & {
  store: Map<string, Set<string>>;
} {
  const store = new Map<string, Set<string>>();

  return {
    store,
    getSubscriptions: vi.fn((connectionId: string) =>
      Array.from(store.get(connectionId) ?? []),
    ),
    removeSubscription: vi.fn((connectionId: string, key: string) => {
      const subs = store.get(connectionId);
      if (subs !== undefined) {
        return subs.delete(key);
      }
      return false;
    }),
    removeSubscriptionsForTenant: vi.fn((connectionId: string, tenantId: string) => {
      const subs = store.get(connectionId);
      if (subs === undefined) return 0;
      let count = 0;
      for (const key of subs) {
        if (key.includes(tenantId)) {
          subs.delete(key);
          count++;
        }
      }
      return count;
    }),
  };
}

function createMockWebSocketConnection(): WebSocketConnection & { messages: string[] } {
  const messages: string[] = [];
  return {
    messages,
    send: vi.fn((data: string) => { messages.push(data); }),
    close: vi.fn(),
  };
}

// ============================================================================
// Sprint 6.8 — User A writes record → User B does not receive update
// ============================================================================

describe('Sprint 6.8 — permission-aware record filtering', () => {
  let membershipRepo: MembershipRepository;

  beforeEach(() => {
    membershipRepo = {
      findByUserAndTenant: vi.fn(),
      findByUserId: vi.fn(),
      findByTenantId: vi.fn(),
    } as unknown as MembershipRepository;
  });

  it('user B (no membership) receives zero records after filtering', async () => {
    const userBId = 'user-B';
    const tenantId = 'tenant-A';

    // User A's task record — only user A (owner) and tenant members can see it
    const records: TaskRecord[] = [
      {
        id: 'task-1',
        version: 1,
        title: 'Secret task',
        ownerId: 'user-A',
        tenantId,
      },
    ];

    // User B has no membership in tenant-A
    vi.mocked(membershipRepo.findByUserAndTenant).mockResolvedValue(null);

    const result = await filterRecords(userBId, tenantId, records, membershipRepo);

    // User B sees nothing
    expect(result.allowed).toHaveLength(0);
    expect(result.deniedCount).toBe(1);
  });

  it('user with membership receives records from their tenant', async () => {
    const userId = 'user-B';
    const tenantId = 'tenant-A';

    const records: TaskRecord[] = [
      { id: 'task-1', version: 1, title: 'Team task', ownerId: 'user-A', tenantId },
      { id: 'task-2', version: 1, title: 'Another task', ownerId: 'user-A', tenantId },
    ];

    // User B IS a member of tenant-A
    vi.mocked(membershipRepo.findByUserAndTenant).mockResolvedValue({
      id: 'membership-1',
      userId,
      tenantId,
      role: 'member',
    } as never);

    const result = await filterRecords(userId, tenantId, records, membershipRepo);

    // User B sees all records
    expect(result.allowed).toHaveLength(2);
    expect(result.deniedCount).toBe(0);
  });

  it('records from a different tenant are filtered out', async () => {
    const userId = 'user-B';
    const tenantId = 'tenant-A';

    const records: TaskRecord[] = [
      {
        id: 'task-cross',
        version: 1,
        title: 'Cross-tenant task',
        ownerId: 'user-A',
        tenantId: 'tenant-X', // Different tenant!
      },
    ];

    // User B is a member of tenant-A but not tenant-X
    vi.mocked(membershipRepo.findByUserAndTenant)
      .mockImplementation(async (_tId: string, _uId: string) => {
        return null;
      });

    const result = await filterRecords(userId, tenantId, records, membershipRepo);

    expect(result.allowed).toHaveLength(0);
    expect(result.deniedCount).toBe(1);
  });
});

// ============================================================================
// Sprint 7.1 — Permission revoked → user stops receiving updates immediately
// ============================================================================

describe('Sprint 7.1 — permission revocation propagation', () => {
  it('onMembershipRevoked removes subscriptions and notifies client', async () => {
    const userId = 'user-B';
    const tenantId = 'tenant-A';
    const connectionId = 'conn-user-B';

    const wsConnection = createMockWebSocketConnection();
    const connections = new Map<string, WebSocketConnection>([[connectionId, wsConnection]]);
    const subRegistry = createMockSubscriptionRegistry();

    // User B has active subscriptions for tenant-A
    subRegistry.store.set(connectionId, new Set([
      `tenant:${tenantId}:tasks:task-1`,
      `tenant:${tenantId}:tasks:task-2`,
      'tenant:other-tenant:tasks:task-3', // different tenant — should NOT be removed
    ]));

    const permissionMiddleware = createMockPermissionMiddleware(userId);
    vi.mocked(permissionMiddleware.getConnectionPermissions).mockReturnValue({
      userId,
      tenantIds: [tenantId],
    } as never);

    const connectionRegistry = createMockConnectionRegistry(connections);

    const handler = createPermissionChangeHandler({
      permissionMiddleware,
      connectionRegistry,
      subscriptionRegistry: subRegistry,
    });

    const result = await handler.onMembershipRevoked(userId, tenantId);

    // Verify propagation result
    expect(result.affectedConnections).toBe(1);
    expect(result.removedSubscriptions).toBe(2); // task-1 and task-2
    expect(result.notifiedConnectionIds).toContain(connectionId);

    // Verify the client received a permission_revoked message
    expect(wsConnection.messages).toHaveLength(1);
    const event = JSON.parse(wsConnection.messages[0]!) as PermissionRevokedEvent;
    expect(event.type).toBe('permission_revoked');
    expect(event.tenantId).toBe(tenantId);

    // Verify permissions were refreshed
    expect(permissionMiddleware.refreshPermissions).toHaveBeenCalledWith(connectionId);
  });

  it('multiple connections for same user are all notified on revocation', async () => {
    const userId = 'user-B';
    const tenantId = 'tenant-A';
    const conn1 = 'conn-device-1';
    const conn2 = 'conn-device-2';

    const wsConn1 = createMockWebSocketConnection();
    const wsConn2 = createMockWebSocketConnection();
    const connections = new Map<string, WebSocketConnection>([
      [conn1, wsConn1],
      [conn2, wsConn2],
    ]);

    const subRegistry = createMockSubscriptionRegistry();
    subRegistry.store.set(conn1, new Set([`tenant:${tenantId}:tasks:task-1`]));
    subRegistry.store.set(conn2, new Set([`tenant:${tenantId}:tasks:task-1`]));

    const permMiddleware: PermissionMiddleware = {
      loadPermissions: vi.fn(),
      getConnectionPermissions: vi.fn((id: string) => ({
        userId: id === conn1 || id === conn2 ? userId : 'other-user',
        tenantIds: [tenantId],
      })),
      hasRole: vi.fn().mockReturnValue(true),
      refreshPermissions: vi.fn().mockResolvedValue(undefined),
      removeConnection: vi.fn(),
      getActiveConnectionCount: vi.fn().mockReturnValue(2),
    } as unknown as PermissionMiddleware;

    const connectionRegistry = createMockConnectionRegistry(connections);

    const handler = createPermissionChangeHandler({
      permissionMiddleware: permMiddleware,
      connectionRegistry,
      subscriptionRegistry: subRegistry,
    });

    const result = await handler.onMembershipRevoked(userId, tenantId);

    expect(result.affectedConnections).toBe(2);
    expect(result.notifiedConnectionIds).toContain(conn1);
    expect(result.notifiedConnectionIds).toContain(conn2);

    // Both devices received the permission_revoked event
    expect(wsConn1.messages).toHaveLength(1);
    expect(wsConn2.messages).toHaveLength(1);
  });

  it('role upgrade does not revoke subscriptions', async () => {
    const userId = 'user-C';
    const tenantId = 'tenant-A';
    const connectionId = 'conn-user-C';

    const wsConnection = createMockWebSocketConnection();
    const connections = new Map<string, WebSocketConnection>([[connectionId, wsConnection]]);

    const subRegistry = createMockSubscriptionRegistry();
    subRegistry.store.set(connectionId, new Set([`tenant:${tenantId}:tasks:task-1`]));

    const permMiddleware = createMockPermissionMiddleware(userId);
    const connectionRegistry = createMockConnectionRegistry(connections);

    const handler = createPermissionChangeHandler({
      permissionMiddleware: permMiddleware,
      connectionRegistry,
      subscriptionRegistry: subRegistry,
    });

    // Upgrade from member to admin — should not revoke subscriptions
    const result = await handler.onRoleChanged(userId, tenantId, 'member', 'admin');

    expect(result.removedSubscriptions).toBe(0);
    expect(wsConnection.messages).toHaveLength(0); // No notification sent
    expect(permMiddleware.refreshPermissions).toHaveBeenCalledWith(connectionId);
  });

  it('role downgrade to lower role removes subscriptions', async () => {
    const userId = 'user-D';
    const tenantId = 'tenant-A';
    const connectionId = 'conn-user-D';

    const wsConnection = createMockWebSocketConnection();
    const connections = new Map<string, WebSocketConnection>([[connectionId, wsConnection]]);

    const subRegistry = createMockSubscriptionRegistry();
    subRegistry.store.set(connectionId, new Set([
      `tenant:${tenantId}:admin-logs:log-1`,
      `tenant:${tenantId}:tasks:task-1`,
    ]));

    const permMiddleware = createMockPermissionMiddleware(userId);
    const connectionRegistry = createMockConnectionRegistry(connections);

    const handler = createPermissionChangeHandler({
      permissionMiddleware: permMiddleware,
      connectionRegistry,
      subscriptionRegistry: subRegistry,
    });

    // Downgrade from admin to viewer — should revoke subscriptions
    const result = await handler.onRoleChanged(userId, tenantId, 'admin', 'viewer');

    expect(result.affectedConnections).toBe(1);
    expect(result.removedSubscriptions).toBeGreaterThan(0);
    expect(wsConnection.messages).toHaveLength(1);
    const event = JSON.parse(wsConnection.messages[0]!) as PermissionRevokedEvent;
    expect(event.type).toBe('permission_revoked');
    expect(event.newRole).toBe('viewer');
  });
});
