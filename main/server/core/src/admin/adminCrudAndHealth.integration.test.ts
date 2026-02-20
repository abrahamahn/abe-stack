// main/server/core/src/admin/adminCrudAndHealth.integration.test.ts
/**
 * Sprint 3.13 - Integration Tests for Admin CRUD and Health Endpoint
 *
 * Tests the admin handler layer end-to-end (handler -> service -> mock repos).
 * Verifies HTTP-like request/response flow for:
 * - Health endpoint responses (all statuses)
 * - Tenant CRUD operations through handlers (list, detail, suspend, unsuspend)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetAdminHealth } from './healthHandler';
import {
  handleGetTenantDetail,
  handleListAllTenants,
  handleSuspendTenant,
  handleUnsuspendTenant,
} from './tenantHandlers';
import * as tenantService from './tenantService';

import type { AdminAppContext, AdminRequest } from './types';
import type { HttpReply, HttpRequest } from '../../../system/src';

// ============================================================================
// Mocks
// ============================================================================

const { MockTenantNotFoundError } = vi.hoisted(() => {
  class MockTenantNotFoundError extends Error {
    constructor(tenantId: string = 'unknown') {
      super(`Tenant not found: ${tenantId}`);
      this.name = 'TenantNotFoundError';
    }
  }
  return { MockTenantNotFoundError };
});

vi.mock('./tenantService', () => ({
  listAllTenants: vi.fn(),
  getTenantDetail: vi.fn(),
  suspendTenant: vi.fn(),
  unsuspendTenant: vi.fn(),
  TenantNotFoundError: MockTenantNotFoundError,
}));

// ============================================================================
// Context & Request Factory
// ============================================================================

function createCtx(overrides?: Partial<AdminAppContext>): AdminAppContext {
  const log: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  (log['child'] as ReturnType<typeof vi.fn>).mockReturnValue(log);

  return {
    db: { healthCheck: vi.fn().mockResolvedValue(true) },
    cache: { healthCheck: vi.fn().mockResolvedValue(true) },
    queue: { healthCheck: vi.fn().mockResolvedValue(true) },
    storage: { healthCheck: vi.fn().mockResolvedValue(true) },
    email: { send: vi.fn(), healthCheck: vi.fn().mockResolvedValue(true) },
    billing: {},
    notifications: {},
    pubsub: {},
    write: {},
    search: {},
    repos: {
      users: {} as never,
      plans: {} as never,
      subscriptions: {} as never,
      auditEvents: {} as never,
      tenants: {} as never,
      memberships: {} as never,
    },
    config: {
      billing: { enabled: false, provider: 'stripe' } as never,
    },
    log: log as never,
    ...overrides,
  } as unknown as AdminAppContext;
}

function createMockRequest(
  overrides: Partial<AdminRequest> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & HttpRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-1', email: 'admin@test.dev', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    params,
    query,
    ...overrides,
  } as unknown as AdminRequest & HttpRequest;
}

function createUnauthRequest(
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & HttpRequest {
  return {
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    params,
    query,
  } as unknown as AdminRequest & HttpRequest;
}

function createMockReply(): HttpReply {
  return {} as HttpReply;
}

// ============================================================================
// Health Endpoint Integration Tests
// ============================================================================

describe('Health Endpoint Integration', () => {
  let ctx: AdminAppContext;

  beforeEach(() => {
    ctx = createCtx();
    vi.clearAllMocks();
  });

  it('should return 401 when no user is present', async () => {
    const result = await handleGetAdminHealth(ctx, undefined, createUnauthRequest());

    expect(result.status).toBe(401);
  });

  it('should return healthy when all services are up', async () => {
    const result = await handleGetAdminHealth(ctx, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('healthy');
      expect(result.body.services.database).toBe('up');
      expect(result.body.services.cache).toBe('up');
      expect(result.body.services.queue).toBe('up');
      expect(result.body.services.storage).toBe('up');
      expect(result.body.services.email).toBe('up');
    }
  });

  it('should return degraded when storage has no healthCheck', async () => {
    const ctxDegraded = createCtx({ storage: {} as never });

    const result = await handleGetAdminHealth(ctxDegraded, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('degraded');
      expect(result.body.services.storage).toBe('unknown');
      // Other services should still be up
      expect(result.body.services.database).toBe('up');
      expect(result.body.services.cache).toBe('up');
    }
  });

  it('should return down when database fails', async () => {
    const ctxDown = createCtx({
      db: { healthCheck: vi.fn().mockResolvedValue(false) } as never,
    });

    const result = await handleGetAdminHealth(ctxDown, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('down');
      expect(result.body.services.database).toBe('down');
    }
  });

  it('should handle healthCheck throwing an error gracefully', async () => {
    const ctxError = createCtx({
      db: { healthCheck: vi.fn().mockRejectedValue(new Error('Connection refused')) } as never,
    });

    const result = await handleGetAdminHealth(ctxError, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.services.database).toBe('down');
    }
  });

  it('should report all five service statuses in response', async () => {
    const result = await handleGetAdminHealth(ctx, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      const services = result.body.services;
      expect(Object.keys(services)).toEqual(
        expect.arrayContaining(['database', 'cache', 'queue', 'storage', 'email']),
      );
    }
  });

  it('should return down when multiple services fail', async () => {
    const ctxMultiFail = createCtx({
      db: { healthCheck: vi.fn().mockResolvedValue(false) } as never,
      cache: { healthCheck: vi.fn().mockResolvedValue(false) } as never,
    });

    const result = await handleGetAdminHealth(ctxMultiFail, undefined, createMockRequest());

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('down');
      expect(result.body.services.database).toBe('down');
      expect(result.body.services.cache).toBe('down');
    }
  });
});

// ============================================================================
// Tenant CRUD Integration Tests (through handlers)
// ============================================================================

describe('Tenant CRUD Integration via Handlers', () => {
  let ctx: AdminAppContext;

  beforeEach(() => {
    ctx = createCtx();
    vi.clearAllMocks();
  });

  describe('List Tenants', () => {
    it('should return 200 with empty tenant list', async () => {
      vi.mocked(tenantService.listAllTenants).mockResolvedValue({
        tenants: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      const result = await handleListAllTenants(
        ctx,
        undefined,
        createMockRequest(),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      const body = result.body as { tenants: unknown[]; total: number };
      expect(body.tenants).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return 200 with tenant data', async () => {
      vi.mocked(tenantService.listAllTenants).mockResolvedValue({
        tenants: [
          {
            id: 'tenant-1',
            name: 'Acme Corp',
            slug: 'acme-corp',
            logoUrl: null,
            ownerId: 'owner-1',
            isActive: true,
            memberCount: 5,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });

      const result = await handleListAllTenants(
        ctx,
        undefined,
        createMockRequest(),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      const body = result.body as { tenants: Array<{ name: string }>; total: number };
      expect(body.tenants).toHaveLength(1);
      expect(body.tenants[0]?.name).toBe('Acme Corp');
    });

    it('should return 401 when unauthenticated', async () => {
      const result = await handleListAllTenants(
        ctx,
        undefined,
        createUnauthRequest(),
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });

    it('should pass search param to service', async () => {
      vi.mocked(tenantService.listAllTenants).mockResolvedValue({
        tenants: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await handleListAllTenants(
        ctx,
        undefined,
        createMockRequest({}, {}, { search: 'acme', limit: '10', offset: '0' }),
        createMockReply(),
      );

      expect(tenantService.listAllTenants).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ search: 'acme', limit: 10, offset: 0 }),
      );
    });
  });

  describe('Get Tenant Detail', () => {
    it('should return 200 with tenant detail', async () => {
      vi.mocked(tenantService.getTenantDetail).mockResolvedValue({
        id: 'tenant-123',
        name: 'Test Corp',
        slug: 'test-corp',
        logoUrl: null,
        ownerId: 'owner-1',
        isActive: true,
        memberCount: 3,
        metadata: {},
        allowedEmailDomains: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const result = await handleGetTenantDetail(
        ctx,
        undefined,
        createMockRequest({}, { id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.body).toHaveProperty('name', 'Test Corp');
        expect(result.body).toHaveProperty('memberCount', 3);
      }
    });

    it('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.getTenantDetail).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const result = await handleGetTenantDetail(
        ctx,
        undefined,
        createMockRequest({}, { id: 'nonexistent' }),
        createMockReply(),
      );

      expect(result.status).toBe(404);
    });

    it('should return 401 when unauthenticated', async () => {
      const result = await handleGetTenantDetail(
        ctx,
        undefined,
        createUnauthRequest({ id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });
  });

  describe('Suspend Tenant', () => {
    it('should return 200 when suspending active tenant', async () => {
      vi.mocked(tenantService.suspendTenant).mockResolvedValue({
        message: 'Tenant suspended successfully',
        tenant: {
          id: 'tenant-123',
          name: 'Test Corp',
          slug: 'test-corp',
          logoUrl: null,
          ownerId: 'owner-1',
          isActive: false,
          memberCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const result = await handleSuspendTenant(
        ctx,
        { reason: 'Terms violation' },
        createMockRequest({}, { id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      const body = result.body as { message: string; tenant: { isActive: boolean } };
      expect(body.message).toBe('Tenant suspended successfully');
      expect(body.tenant.isActive).toBe(false);
    });

    it('should return 200 with already-suspended message', async () => {
      vi.mocked(tenantService.suspendTenant).mockResolvedValue({
        message: 'Tenant is already suspended',
        tenant: {
          id: 'tenant-123',
          name: 'Test Corp',
          slug: 'test-corp',
          logoUrl: null,
          ownerId: 'owner-1',
          isActive: false,
          memberCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const result = await handleSuspendTenant(
        ctx,
        { reason: 'Double suspension' },
        createMockRequest({}, { id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.body.message).toBe('Tenant is already suspended');
      }
    });

    it('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.suspendTenant).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const result = await handleSuspendTenant(
        ctx,
        { reason: 'Test' },
        createMockRequest({}, { id: 'nonexistent' }),
        createMockReply(),
      );

      expect(result.status).toBe(404);
    });
  });

  describe('Unsuspend Tenant', () => {
    it('should return 200 when unsuspending suspended tenant', async () => {
      vi.mocked(tenantService.unsuspendTenant).mockResolvedValue({
        message: 'Tenant unsuspended successfully',
        tenant: {
          id: 'tenant-123',
          name: 'Test Corp',
          slug: 'test-corp',
          logoUrl: null,
          ownerId: 'owner-1',
          isActive: true,
          memberCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const result = await handleUnsuspendTenant(
        ctx,
        undefined,
        createMockRequest({}, { id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(200);
      const body = result.body as { message: string; tenant: { isActive: boolean } };
      expect(body.message).toBe('Tenant unsuspended successfully');
      expect(body.tenant.isActive).toBe(true);
    });

    it('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.unsuspendTenant).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const result = await handleUnsuspendTenant(
        ctx,
        undefined,
        createMockRequest({}, { id: 'nonexistent' }),
        createMockReply(),
      );

      expect(result.status).toBe(404);
    });

    it('should return 401 when unauthenticated', async () => {
      const result = await handleUnsuspendTenant(
        ctx,
        undefined,
        createUnauthRequest({ id: 'tenant-123' }),
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });
  });
});
