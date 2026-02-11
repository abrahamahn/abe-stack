// src/server/core/src/admin/tenantHandlers.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleGetTenantDetail,
  handleListAllTenants,
  handleSuspendTenant,
  handleUnsuspendTenant,
} from './tenantHandlers';
import * as tenantService from './tenantService';

import type { AdminAppContext, AdminRequest } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
// Test Helpers
// ============================================================================

function createMockContext(): AdminAppContext {
  return {
    config: {} as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      users: {} as AdminAppContext['repos']['users'],
      tenants: {} as AdminAppContext['repos']['tenants'],
      memberships: {} as AdminAppContext['repos']['memberships'],
    } as AdminAppContext['repos'],
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {
      provider: 'stripe' as const,
      createCustomer: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      resumeSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      getSubscription: vi.fn(),
      createSetupIntent: vi.fn(),
      listPaymentMethods: vi.fn(),
      attachPaymentMethod: vi.fn(),
      detachPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      listInvoices: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      archivePrice: vi.fn(),
      verifyWebhookSignature: vi.fn(),
      parseWebhookEvent: vi.fn(),
      createCustomerPortalSession: vi.fn(),
    } as unknown,
    notifications: {
      isConfigured: vi.fn().mockReturnValue(false),
    },
    queue: {},
    write: {},
    search: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as AdminAppContext;
}

function createMockRequest(
  overrides: Partial<AdminRequest> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & FastifyRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
    ...overrides,
  } as unknown as AdminRequest & FastifyRequest;
}

function createUnauthenticatedRequest(
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & FastifyRequest {
  return {
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
  } as unknown as AdminRequest & FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin Tenant Handlers', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('handleListAllTenants', () => {
    test('should return 200 with tenant list', async () => {
      vi.mocked(tenantService.listAllTenants).mockResolvedValue({
        tenants: [
          {
            id: 'tenant-123',
            name: 'Test Workspace',
            slug: 'test-workspace',
            logoUrl: null,
            ownerId: 'owner-123',
            isActive: true,
            memberCount: 3,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });

      const req = createMockRequest({}, {}, { limit: '20', offset: '0' });
      const result = await handleListAllTenants(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'tenants' in result.body).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest();
      const result = await handleListAllTenants(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });

    test('should pass query params to service', async () => {
      vi.mocked(tenantService.listAllTenants).mockResolvedValue({
        tenants: [],
        total: 0,
        limit: 10,
        offset: 5,
      });

      const req = createMockRequest({}, {}, { limit: '10', offset: '5', search: 'acme' });
      await handleListAllTenants(mockCtx, undefined, req, createMockReply());

      expect(tenantService.listAllTenants).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          limit: 10,
          offset: 5,
          search: 'acme',
        }),
      );
    });
  });

  describe('handleGetTenantDetail', () => {
    test('should return 200 with tenant detail', async () => {
      vi.mocked(tenantService.getTenantDetail).mockResolvedValue({
        id: 'tenant-123',
        name: 'Test Workspace',
        slug: 'test-workspace',
        logoUrl: null,
        ownerId: 'owner-123',
        isActive: true,
        memberCount: 3,
        metadata: {},
        allowedEmailDomains: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const req = createMockRequest({}, { id: 'tenant-123' });
      const result = await handleGetTenantDetail(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'id' in result.body).toBe(true);
    });

    test('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.getTenantDetail).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleGetTenantDetail(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ id: 'tenant-123' });
      const result = await handleGetTenantDetail(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleSuspendTenant', () => {
    test('should return 200 with suspend result', async () => {
      vi.mocked(tenantService.suspendTenant).mockResolvedValue({
        message: 'Tenant suspended successfully',
        tenant: {
          id: 'tenant-123',
          name: 'Test Workspace',
          slug: 'test-workspace',
          logoUrl: null,
          ownerId: 'owner-123',
          isActive: false,
          memberCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const req = createMockRequest({}, { id: 'tenant-123' });
      const result = await handleSuspendTenant(
        mockCtx,
        { reason: 'Terms violation' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect('body' in result && 'message' in result.body).toBe(true);
    });

    test('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.suspendTenant).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleSuspendTenant(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ id: 'tenant-123' });
      const result = await handleSuspendTenant(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleUnsuspendTenant', () => {
    test('should return 200 with unsuspend result', async () => {
      vi.mocked(tenantService.unsuspendTenant).mockResolvedValue({
        message: 'Tenant unsuspended successfully',
        tenant: {
          id: 'tenant-123',
          name: 'Test Workspace',
          slug: 'test-workspace',
          logoUrl: null,
          ownerId: 'owner-123',
          isActive: true,
          memberCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const req = createMockRequest({}, { id: 'tenant-123' });
      const result = await handleUnsuspendTenant(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'message' in result.body).toBe(true);
    });

    test('should return 404 when tenant not found', async () => {
      vi.mocked(tenantService.unsuspendTenant).mockRejectedValue(
        new MockTenantNotFoundError('nonexistent'),
      );

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleUnsuspendTenant(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ id: 'tenant-123' });
      const result = await handleUnsuspendTenant(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });
});
