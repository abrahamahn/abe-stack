// src/apps/server/src/__tests__/integration/feature-flags-files.integration.test.ts
/**
 * Feature Flags & Files Integration Tests
 *
 * Tests the feature flags and files route modules through fastify.inject(),
 * verifying routing, auth guards, and method enforcement.
 *
 * Covers:
 * - Feature Flags admin routes: /api/admin/feature-flags/*
 * - Feature Flags tenant overrides: /api/admin/tenants/:tenantId/feature-overrides/*
 * - Feature Flags user evaluation: /api/feature-flags/evaluate
 * - Files routes: /api/files/*
 */

import { createAuthGuard, fileRoutes } from '@abe-stack/core';
import { featureFlagRoutes } from '@abe-stack/core/feature-flags';
import { registerRouteMap } from '@abe-stack/server-engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@abe-stack/server-engine';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos() {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue(null),
      existsByEmail: vi.fn().mockResolvedValue(false),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      unlockAccount: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      updateWithVersion: vi.fn().mockResolvedValue(null),
    },
    refreshTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findByToken: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByToken: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteByFamilyId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    refreshTokenFamilies: {
      findById: vi.fn().mockResolvedValue(null),
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'family-1' }),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAllForUser: vi.fn().mockResolvedValue(0),
    },
    loginAttempts: {
      create: vi.fn().mockResolvedValue({ id: 'la-1' }),
      countRecentFailures: vi.fn().mockResolvedValue(0),
      findRecentByEmail: vi.fn().mockResolvedValue([]),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    passwordResetTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    emailVerificationTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    securityEvents: {
      create: vi.fn().mockResolvedValue({ id: 'se-1' }),
      findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByEmail: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByType: vi.fn().mockResolvedValue([]),
      findBySeverity: vi.fn().mockResolvedValue([]),
      countByType: vi.fn().mockResolvedValue(0),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    magicLinkTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ml-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
      countRecentByEmail: vi.fn().mockResolvedValue(0),
    },
    oauthConnections: {
      findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'oc-1' }),
      delete: vi.fn().mockResolvedValue(true),
      countByUserId: vi.fn().mockResolvedValue(0),
    },
    pushSubscriptions: {
      findByEndpoint: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ps-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
    },
    notificationPreferences: {
      findByUserId: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'np-1' }),
    },
    plans: { findById: vi.fn().mockResolvedValue(null), findAll: vi.fn().mockResolvedValue([]) },
    subscriptions: {
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue(null),
    },
    customerMappings: { findByUserId: vi.fn().mockResolvedValue(null) },
    invoices: { findByUserId: vi.fn().mockResolvedValue([]) },
    paymentMethods: { findByUserId: vi.fn().mockResolvedValue([]) },
    billingEvents: { create: vi.fn().mockResolvedValue({ id: 'be-1' }) },
    legalDocuments: {
      findLatestByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1', agreedAt: new Date() }),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mb-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    tenants: {
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'tenant-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    invitations: {
      findById: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findByTenantId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    featureFlags: {
      findAll: vi.fn().mockResolvedValue([]),
      findByKey: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ff-1', key: 'test-flag', enabled: false }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    featureFlagOverrides: {
      findByTenantId: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 'ffo-1' }),
      delete: vi.fn().mockResolvedValue(true),
    },
    files: {
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'file-1', name: 'test.txt' }),
      delete: vi.fn().mockResolvedValue(true),
      findByUserId: vi.fn().mockResolvedValue([]),
    },
  };
}

function createMockLogger() {
  const logger: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  (logger['child'] as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

function createMockDbClient() {
  const mockTx = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };

  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx);
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Feature Flags & Files Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, featureFlagRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as AuthGuardFactory,
    });

    registerRouteMap(testServer.server, ctx as never, fileRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as AuthGuardFactory,
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Feature Flags — Admin Flag CRUD
  // ==========================================================================

  describe('GET /api/admin/feature-flags', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/feature-flags',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/feature-flags',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/feature-flags/create', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/create',
        payload: { key: 'new-flag', enabled: false },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/create',
        payload: { key: 'new-flag', enabled: false },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/feature-flags/:key/update', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/test-flag/update',
        payload: { enabled: true },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/test-flag/update',
        payload: { enabled: true },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/feature-flags/:key/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/test-flag/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/feature-flags/test-flag/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Feature Flags — Admin Tenant Overrides
  // ==========================================================================

  describe('GET /api/admin/tenants/:tenantId/feature-overrides', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/tenants/tenant-1/feature-overrides',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/tenants/tenant-1/feature-overrides',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('PUT /api/admin/tenants/:tenantId/feature-overrides/:key', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'PUT',
        url: '/api/admin/tenants/tenant-1/feature-overrides/test-flag',
        payload: { enabled: true },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'PUT',
        url: '/api/admin/tenants/tenant-1/feature-overrides/test-flag',
        payload: { enabled: true },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/tenants/:tenantId/feature-overrides/:key/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/feature-overrides/test-flag/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/feature-overrides/test-flag/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Feature Flags — User Evaluation
  // ==========================================================================

  describe('GET /api/feature-flags/evaluate', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/feature-flags/evaluate',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/feature-flags/evaluate',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Files — Upload
  // ==========================================================================

  describe('POST /api/files/upload', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Files — Get Metadata
  // ==========================================================================

  describe('GET /api/files/:id', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/files/file-123',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/files/file-123',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Files — Delete
  // ==========================================================================

  describe('POST /api/files/:id/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/file-123/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/files/file-123/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Files — Download URL
  // ==========================================================================

  describe('GET /api/files/:id/download', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/files/file-123/download',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/files/file-123/download',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });
});
